import nodemailer from "nodemailer";

/**
 * Thin nodemailer wrapper for app-level transactional email.
 * NextAuth's Email provider handles magic-link login via its own internal
 * transport; this module is for everything else (e.g. email-change
 * verification and old-address notifications).
 *
 * Uses EMAIL_SERVER + EMAIL_FROM env vars (already configured for NextAuth).
 */

function getTransport() {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    throw new Error("EMAIL_SERVER is not configured");
  }
  return nodemailer.createTransport(server);
}

function getFrom() {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }
  return from;
}

export async function sendEmailChangeConfirmation(
  newEmail: string,
  confirmLink: string
): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    to: newEmail,
    from: getFrom(),
    subject: "Confirm your new email address",
    text: `A request was made to change your Really Personal Finance email to this address.

Click the link below to confirm. The link expires in 1 hour.

${confirmLink}

If you didn't request this, ignore this email.`,
    html: `<p>A request was made to change your Really Personal Finance email to this address.</p>
<p><a href="${confirmLink}">Confirm new email address</a></p>
<p>The link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });
}

export async function sendEmailChangeNotification(
  oldEmail: string,
  newEmail: string,
  revokeLink: string
): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    to: oldEmail,
    from: getFrom(),
    subject: "Email change requested on your account",
    text: `Someone requested to change the email on your Really Personal Finance account from ${oldEmail} to ${newEmail}.

If this was you, you can ignore this message — the change won't take effect until the new address is confirmed.

If this WAS NOT you, click the link below immediately to cancel:

${revokeLink}`,
    html: `<p>Someone requested to change the email on your Really Personal Finance account from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
<p>If this was you, you can ignore this message — the change won't take effect until the new address is confirmed.</p>
<p>If this <strong>was not</strong> you, <a href="${revokeLink}">click here to cancel</a> immediately.</p>`,
  });
}
