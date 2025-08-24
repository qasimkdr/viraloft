// backend/utils/mailer.js
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE || '0') === '1';
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || 'Viraloft <no-reply@viraloft.com>';
const replyTo = process.env.MAIL_REPLY_TO || 'Viraloft Support <kdrqasim@gmail.com>';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!user || !pass) {
    console.warn('[mail] SMTP_USER/SMTP_PASS missing; emails will be skipped');
    return null;
  }
  transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return transporter;
}

async function sendVerificationCode({ to, name, code }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] Skipping send (no SMTP configured). Code:', code, 'to:', to);
    return;
  }
  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Verify your email</h2>
      <p>Hi ${name || ''}, your Viraloft verification code is:</p>
      <div style="font-size:24px;font-weight:bold">${code}</div>
      <p>This code expires in 15 minutes.</p>
    </div>
  `;
  await t.sendMail({
    from,
    to,
    replyTo,
    subject: 'Your Viraloft verification code',
    html,
  });
}

module.exports = { sendVerificationCode };
