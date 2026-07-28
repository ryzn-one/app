/**
 * Transactional email via Postmark.
 *
 * Degrades to console logging when POSTMARK_SERVER_TOKEN is absent so the whole
 * auth flow — including password reset — is testable locally before the sending
 * domain is verified. Never silently swallows a real send failure.
 *
 * RESEND_API_KEY is still accepted as a temporary fallback while Postmark is
 * being wired up; remove it once the Postmark server token is in production.
 */

const FROM = process.env.EMAIL_FROM || "Ryzn <noreply@ryzn.one>";
const STREAM = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

export async function sendEmail({ to, subject, html, text }) {
  const postmark = process.env.POSTMARK_SERVER_TOKEN;
  if (postmark) {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmark,
      },
      body: JSON.stringify({
        From: FROM,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        MessageStream: STREAM,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Postmark failed (${res.status}): ${detail}`);
    }

    return { delivered: true, provider: "postmark" };
  }

  const resend = process.env.RESEND_API_KEY;
  if (resend) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html, text }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Resend failed (${res.status}): ${detail}`);
    }

    return { delivered: true, provider: "resend" };
  }

  console.warn(
    `[email:dev] No POSTMARK_SERVER_TOKEN (or RESEND_API_KEY) set — not sending.\n  to: ${to}\n  subject: ${subject}\n  text: ${text}`
  );
  return { delivered: false, reason: "no_api_key" };
}

const shell = (heading, body) => `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1A1A1A">
    <div style="font-size:28px;font-weight:700;color:#5B4FCF;letter-spacing:-1px">RYZN</div>
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-.4px;margin:24px 0 8px">${heading}</h1>
    ${body}
    <p style="font-size:12px;color:#5F5E5A;margin-top:32px;border-top:1px solid #E2E1DC;padding-top:16px">
      Ryzn · Rise now. If you weren't expecting this email, you can ignore it.
    </p>
  </div>`;

export function resetCodeEmail(otp) {
  return {
    subject: "Your Ryzn reset code",
    text: `Your Ryzn password reset code is ${otp}. It expires in 10 minutes.`,
    html: shell(
      "Reset your password",
      `<p style="font-size:15px;color:#5F5E5A;line-height:1.55">Enter this code in the app. It expires in 10 minutes.</p>
       <div style="font-family:ui-monospace,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#5B4FCF;background:#F1EFFC;border-radius:12px;padding:18px;text-align:center;margin:20px 0">${otp}</div>
       <p style="font-size:13px;color:#5F5E5A">Didn't request this? Your password is unchanged and your account is safe.</p>`
    ),
  };
}

export function verifyEmail(otp) {
  return {
    subject: "Verify your Ryzn email",
    text: `Your Ryzn verification code is ${otp}. It expires in 10 minutes.`,
    html: shell(
      "Verify your email",
      `<p style="font-size:15px;color:#5F5E5A;line-height:1.55">One code and you're in.</p>
       <div style="font-family:ui-monospace,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#5B4FCF;background:#F1EFFC;border-radius:12px;padding:18px;text-align:center;margin:20px 0">${otp}</div>`
    ),
  };
}
