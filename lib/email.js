/**
 * Transactional email.
 *
 * Degrades to console logging when RESEND_API_KEY is absent so the whole auth
 * flow — including password reset — is testable locally before you own a
 * verified sending domain. Never silently swallows a real send failure.
 */

const FROM = process.env.EMAIL_FROM || "Ryzn <noreply@ryzn.one>";

export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn(
      `[email:dev] No RESEND_API_KEY set — not sending.\n  to: ${to}\n  subject: ${subject}\n  text: ${text}`
    );
    return { delivered: false, reason: "no_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend failed (${res.status}): ${detail}`);
  }

  return { delivered: true };
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
