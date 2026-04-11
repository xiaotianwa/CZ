import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

/** 发送验证码邮件 */
export async function sendVerifyCode(to: string, code: string, type: 'register' | 'reset' = 'register'): Promise<void> {
  if (!transporter) {
    console.error('[Mail] SMTP 未配置: SMTP_USER 或 SMTP_PASS 为空');
    throw new Error('邮件服务未配置，请联系管理员');
  }
  const purposeText = type === 'reset' ? '重置密码' : '注册';
  const subjectPrefix = type === 'reset' ? '密码重置' : '验证码';
  try {
    await transporter.sendMail({
      from: `"1103社区" <${SMTP_USER}>`,
      to,
      subject: `【1103社区】${subjectPrefix}：${code}`,
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;border-radius:16px;border:1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 32px 28px;text-align:center;">
            <div style="font-family:'Trebuchet MS','Arial Black',Impact,sans-serif;font-size:42px;font-weight:900;color:#fff;letter-spacing:4px;line-height:1;">1103</div>
            <div style="font-family:'Trebuchet MS','Arial Black',Impact,sans-serif;font-size:16px;color:#1890ff;letter-spacing:6px;margin-top:4px;">ChenZe</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:8px;">陈泽的专属粉丝社区</div>
          </div>
          <!-- Body -->
          <div style="padding:28px 32px 32px;background:#fff;">
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">您好，您正在${purposeText} <strong>1103社区</strong>，验证码为：</p>
            <div style="padding:20px;background:linear-gradient(135deg,#f0f7ff 0%,#f8fafc 100%);border-radius:12px;text-align:center;border:1px solid #dbeafe;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1890ff;">${code}</span>
            </div>
            <p style="color:#9CA3AF;font-size:12px;line-height:1.8;margin:20px 0 0;">验证码 5 分钟内有效，请勿泄露给他人。<br/>如非本人操作，请忽略此邮件。</p>
          </div>
          <!-- Footer -->
          <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #f1f5f9;">
            <span style="font-size:11px;color:#cbd5e1;">© 1103社区 · 老铁们的精神家园</span>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error(`[Mail] 发送失败 to=${to} user=${SMTP_USER}`, err);
    throw new Error('验证码发送失败，请稍后再试');
  }
}
