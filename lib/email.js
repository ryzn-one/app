/**
 * Transactional email via Postmark.
 *
 * Degrades to console logging when POSTMARK_SERVER_TOKEN is absent so the whole
 * auth flow — including password reset — is testable locally before the sending
 * domain is verified. Never silently swallows a real send failure.
 *
 * RESEND_API_KEY is still accepted as a temporary fallback while Postmark is
 * being wired up; remove it once the Postmark server token is in production.
 *
 * Brand assets are hosted on the public site (same kit as the app). Email
 * clients need absolute HTTPS PNG URLs — never SVG, never relative paths.
 */

const FROM = process.env.EMAIL_FROM || "Ryzn <hello@ryzn.one>";
const STREAM = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

/** Same origin rules as invite-url.js — never bake a disposable Vercel preview host into mail. */
function publicOrigin() {
  return (
    process.env.PUBLIC_ORIGIN ||
    process.env.BETTER_AUTH_URL ||
    "https://ryzn.one"
  ).replace(/\/+$/, "");
}

function brandUrl(path) {
  // Encode @ in retina filenames — some clients treat bare @ as URL userinfo.
  const clean = String(path).replace(/^\//, "").replace(/@/g, "%40");
  return `${publicOrigin()}/branding/ryzn-brand-kit/${clean}`;
}

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

/**
 * Shared branded chrome for every transactional mail.
 *
 * Table layout + inline styles keep Gmail / Outlook / Apple Mail honest.
 * Logo: horizontal purple lockup @2x, displayed at 200×48.
 */
const shell = (heading, body) => {
  const origin = publicOrigin();
  const logo = brandUrl("logo/png/ryzn-lockup-horizontal-purple@2x.png");
  const mark = brandUrl("icon/png/ryzn-app-icon-192.png");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Ryzn</title>
</head>
<body style="margin:0;padding:0;background:#F4F3EF;-webkit-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F3EF;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="width:100%;max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E1DC;">
          <tr>
            <td style="padding:28px 28px 8px;border-bottom:1px solid #E2E1DC;">
              <a href="${origin}" style="text-decoration:none;">
                <img src="${logo}" width="200" height="48" alt="Ryzn" style="display:block;width:200px;height:48px;border:0;outline:none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1A1A;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-0.4px;line-height:1.25;color:#1A1A1A;">${heading}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E2E1DC;">
                <tr>
                  <td style="padding-top:20px;vertical-align:middle;" width="40">
                    <img src="${mark}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;border-radius:8px;" />
                  </td>
                  <td style="padding-top:20px;padding-left:12px;vertical-align:middle;">
                    <div style="font-size:13px;font-weight:700;color:#1A1A1A;letter-spacing:-0.2px;">Ryzn · Rise now.</div>
                    <div style="font-size:12px;color:#5F5E5A;line-height:1.45;margin-top:2px;">
                      If you weren't expecting this email, you can ignore it.<br />
                      <a href="${origin}" style="color:#5B4FCF;text-decoration:none;">ryzn.one</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const otpBlock = (otp) =>
  `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#5B4FCF;background:#F1EFFC;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">${otp}</div>`;

export function resetCodeEmail(otp) {
  return {
    subject: "Your Ryzn reset code",
    text: `Your Ryzn password reset code is ${otp}. It expires in 10 minutes.`,
    html: shell(
      "Reset your password",
      `<p style="margin:0;font-size:15px;color:#5F5E5A;line-height:1.55;">Enter this code in the app. It expires in 10 minutes.</p>
       ${otpBlock(otp)}
       <p style="margin:0;font-size:13px;color:#5F5E5A;line-height:1.5;">Didn't request this? Your password is unchanged and your account is safe.</p>`
    ),
  };
}

/**
 * Founding-mentor invitation.
 *
 * The real invite experience is mentor-invite.html (hero, roster pitch, code
 * gate). This mail is only a thin pointer to that page — no code block, no
 * duplicate pitch. The link already carries code/name/founder in the query
 * string so the page opens pre-filled. Plain-text URL stays as a fallback when
 * clients strip the button.
 */
export function inviteEmail({ name, url, founder }) {
  const who = (name || "").trim();
  const from = (founder || "Bilal").trim();
  const greeting = who ? `${who},` : "Hello,";

  return {
    subject: `${from} invited you to mentor at Ryzn`,
    text: [
      greeting,
      "",
      `${from} invited you to join the founding mentor roster at Ryzn.`,
      "",
      "Open your invitation:",
      url,
      "",
      "Ryzn · Rise now.",
    ].join("\n"),
    html: shell(
      who ? `${who}, you were invited.` : "You were invited.",
      `<p style="margin:0;font-size:15px;color:#5F5E5A;line-height:1.55;">${from} invited you to the founding mentor roster. Open your invitation to see the seat and claim it.</p>
       <a href="${url}" style="display:block;background:#5B4FCF;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;text-align:center;border-radius:12px;padding:15px 20px;margin:24px 0 12px;">Open your invitation &rarr;</a>
       <p style="margin:0;font-size:12px;color:#5F5E5A;line-height:1.5;">Or paste this into your browser:<br /><span style="color:#5B4FCF;word-break:break-all;">${url}</span></p>`
    ),
  };
}

export function verifyEmail(otp) {
  return {
    subject: "Verify your Ryzn email",
    text: `Your Ryzn verification code is ${otp}. It expires in 10 minutes.`,
    html: shell(
      "Verify your email",
      `<p style="margin:0;font-size:15px;color:#5F5E5A;line-height:1.55;">One code and you're in.</p>
       ${otpBlock(otp)}`
    ),
  };
}
