import nodemailer from 'nodemailer';

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
}

function getSmtpSettings(): SmtpSettings {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !user || !password?.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP configuration is incomplete');
  }
  return { host, port, user, password };
}

export function isSmtpConfigured(): boolean {
  try {
    getSmtpSettings();
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

export async function sendOtpEmail(to: string, code: string, name?: string): Promise<void> {
  const settings = getSmtpSettings();
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const recipientName = name?.trim()
    ? '<p style="margin:0 0 20px;color:#334155">Hi ' + escapeHtml(name.trim()) + ',</p>'
    : '';
  const from = process.env.SMTP_FROM?.trim() || '"Cendekia.ai" <' + settings.user + '>';

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Your Cendekia.ai verification code',
      text: (name?.trim() ? 'Hi ' + name.trim() + ',\n\n' : '') +
        'Your Cendekia.ai verification code is ' + code + '. It expires in 10 minutes. Do not share this code with anyone.',
      html: `
        <div style="margin:0;background:#f1f7ff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
          <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #dbeafe;border-radius:24px;overflow:hidden">
            <div style="padding:28px 32px;background:linear-gradient(135deg,#dbeafe,#e0f2fe)">
              <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#0369a1;text-transform:uppercase">Cendekia.ai</div>
              <h1 style="margin:10px 0 0;font-size:25px;line-height:1.25;color:#0f172a">Your next learning session starts here.</h1>
            </div>
            <div style="padding:28px 32px">
              ${recipientName}
              <p style="margin:0 0 8px;color:#475569">Use this one-time code to securely sign in:</p>
              <div style="margin:18px 0 20px;padding:20px 12px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center">
                <span style="font-size:36px;line-height:1.2;letter-spacing:10px;font-weight:800;color:#1d4ed8">${code}</span>
              </div>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">This code expires in 10 minutes. For your security, never share it with anyone.</p>
            </div>
          </div>
          <p style="max-width:480px;margin:18px auto 0;color:#94a3b8;font-size:12px;text-align:center">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (!info.accepted?.length || info.rejected?.length) {
      throw new Error('SMTP server did not accept the recipient');
    }
  } finally {
    transporter.close();
  }
}
