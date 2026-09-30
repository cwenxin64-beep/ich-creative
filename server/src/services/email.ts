const RESEND_API_URL = 'https://api.resend.com/emails';

function getRequiredEmailConfig() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();
  if (!apiKey || !from) {
    throw new Error('邮件服务未配置，请设置 RESEND_API_KEY 和 EMAIL_FROM');
  }
  return { apiKey, from };
}

export async function sendPasswordResetCode(email: string, code: string) {
  const { apiKey, from } = getRequiredEmailConfig();
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: '智能非遗密码重置验证码',
      html: [
        '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#4f4a46">',
        '<h2>重置密码</h2>',
        `<p>你的验证码是：<strong style="font-size:24px;letter-spacing:4px">${code}</strong></p>`,
        '<p>验证码 10 分钟内有效。若不是你本人操作，请忽略此邮件。</p>',
        '</div>',
      ].join(''),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`验证码邮件发送失败：${response.status} ${message}`.trim());
  }
}
