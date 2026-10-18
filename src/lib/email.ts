import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

export async function sendOtpEmail(to: string, code: string, name?: string) {
  await transporter.sendMail({
    from: `"Cendekia.ai" <${process.env.SMTP_USER}>`,
    to,
    subject: `Your Cendekia.ai login code: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:12px;">
        <h1 style="color:#10b981;margin:0 0 8px">Cendekia.ai</h1>
        <p style="color:#94a3b8;margin:0 0 24px">Your AI Learning Workspace</p>
        ${name ? `<p>Hi ${name},</p>` : ''}
        <p>Your one-time login code:</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#10b981;text-align:center;padding:24px;background:#1e293b;border-radius:8px;margin:16px 0;">${code}</div>
        <p style="color:#64748b;font-size:13px;">Expires in 10 minutes. Do not share this code.</p>
      </div>
    `,
  });
}
