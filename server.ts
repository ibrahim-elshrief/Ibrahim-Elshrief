import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmailSendRequestBody {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  settings?: {
    provider?: string;
    senderName?: string;
    senderEmail?: string;
    replyToEmail?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    brevoApiKey?: string;
    resendApiKey?: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString(), mode: isProd ? 'production' : 'development' });
  });

  // Universal Send Email API
  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, html, text, settings } = req.body as EmailSendRequestBody;

      if (!to || !subject || !html) {
        return res.status(400).json({ 
          success: false, 
          message: 'الحقول المطلوبة مفقودة: المستلم (to)، الموضوع (subject)، والمحتوى (html).' 
        });
      }

      const recipients = Array.isArray(to) ? to : [to];
      const validRecipients = recipients
        .map((e) => (typeof e === 'string' ? e.trim() : ''))
        .filter((e) => e.length > 3 && e.includes('@'));

      if (validRecipients.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'قائمة البريد الإلكتروني غير صالحة.' 
        });
      }

      const senderName = settings?.senderName?.trim() || 'المنصة الرسمية';
      const senderEmail = settings?.senderEmail?.trim() || settings?.smtpUser?.trim() || 'noreply@platform.local';
      const formattedFrom = `"${senderName}" <${senderEmail}>`;

      // 1. Check Brevo API
      const rawBrevoKey = settings?.brevoApiKey?.trim() || process.env.BREVO_API_KEY?.trim();
      const brevoKey = rawBrevoKey ? rawBrevoKey.replace(/\s+/g, '') : '';
      if (brevoKey) {
        // Validate sender email for Brevo
        const isDummyOrMissing = !senderEmail || senderEmail.includes('example.com') || senderEmail.includes('platform.local') || !senderEmail.includes('@');
        if (isDummyOrMissing) {
          return res.json({
            success: false,
            message: 'يتطلب مزود Brevo أن يكون بريد المرسل (From Email) هو نفس البريد المؤكد في حساب Brevo الخاص بك. يرجى إدخال بريدك الحقيقي المسجل في Brevo في خانة "بريد المرسل".',
            provider: 'brevo'
          });
        }

        try {
          const brevoPayload: any = {
            sender: {
              name: senderName,
              email: senderEmail
            },
            to: validRecipients.map((email) => ({ email })),
            subject,
            htmlContent: html
          };

          if (text && text.trim().length > 0) {
            brevoPayload.textContent = text.trim();
          }

          if (settings?.replyToEmail?.trim() && settings.replyToEmail.includes('@')) {
            brevoPayload.replyTo = { email: settings.replyToEmail.trim() };
          }

          const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': brevoKey,
              'accept': 'application/json'
            },
            body: JSON.stringify(brevoPayload)
          });

          const brevoData = await brevoRes.json().catch(() => ({}));
          if (brevoRes.ok) {
            return res.json({
              success: true,
              message: `تم إرسال البريد بنجاح عبر Brevo إلى (${validRecipients.length}) مشترك.`,
              provider: 'brevo',
              details: brevoData,
              sentCount: validRecipients.length
            });
          } else {
            const rawMsg = String(brevoData?.message || JSON.stringify(brevoData));
            let friendlyMsg = `خطأ من مزود Brevo: ${rawMsg}`;

            if (brevoData?.code === 'unauthorized' || rawMsg.toLowerCase().includes('key not found') || brevoRes.status === 401) {
              friendlyMsg = 'مفتاح Brevo API غير صحيح أو ملغي. يرجى نسخ مفتاح API جديد من app.brevo.com/settings/keys/api ولصقه في الإعدادات.';
            } else if (brevoData?.code === 'invalid_parameter' || rawMsg.toLowerCase().includes('sender') || rawMsg.toLowerCase().includes('confirmed')) {
              friendlyMsg = `بريد المرسل (${senderEmail}) غير مؤكد في حساب Brevo: يرجى كتابة نفس البريد المسجل في حساب Brevo في خانة "بريد المرسل"، أو تأكيده في قائمة Senders داخل موقع Brevo.`;
            } else if (rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('suspended')) {
              friendlyMsg = 'تم استهلاك رصيد الإرسال في حساب Brevo. يمكنك استخدام حساب Gmail عبر كلمة مرور التطبيقات في إعدادات البريد.';
            }

            console.warn('[Brevo API Notice]', friendlyMsg);
            return res.json({
              success: false,
              message: friendlyMsg,
              provider: 'brevo'
            });
          }
        } catch (brevoErr: any) {
          console.warn('[Brevo Dispatch Notice]', brevoErr?.message || String(brevoErr));
          return res.json({
            success: false,
            message: `فشل الاتصال بـ Brevo: ${brevoErr?.message || String(brevoErr)}`,
            provider: 'brevo'
          });
        }
      }

      // 2. Check Resend API
      const rawResendKey = settings?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim();
      const resendKey = rawResendKey ? rawResendKey.replace(/\s+/g, '') : '';
      if (resendKey) {
        try {
          // If senderEmail is dummy, empty, or public domain (Gmail/Yahoo/Outlook), Resend requires onboarding@resend.dev
          let resendFrom = formattedFrom;
          const isCustomDomain = senderEmail && 
            !senderEmail.includes('example.com') && 
            !senderEmail.includes('platform.local') && 
            !senderEmail.includes('@gmail.com') && 
            !senderEmail.includes('@yahoo.com') && 
            !senderEmail.includes('@outlook.com');

          if (!isCustomDomain) {
            resendFrom = `"${senderName}" <onboarding@resend.dev>`;
          }

          const resendPayload: any = {
            from: resendFrom,
            to: validRecipients,
            subject,
            html
          };

          if (text && text.trim().length > 0) {
            resendPayload.text = text.trim();
          }

          if (settings?.replyToEmail?.trim() && settings.replyToEmail.includes('@')) {
            resendPayload.reply_to = settings.replyToEmail.trim();
          }

          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify(resendPayload)
          });

          const resendData = await resendRes.json().catch(() => ({}));
          if (resendRes.ok) {
            return res.json({
              success: true,
              message: `تم إرسال البريد بنجاح عبر Resend إلى (${validRecipients.length}) مشترك.`,
              provider: 'resend',
              details: resendData,
              sentCount: validRecipients.length
            });
          } else {
            const rawMsg = String(resendData?.message || '');
            let friendlyMsg = `خطأ من مزود Resend: ${rawMsg || 'تعذر التحقق من الحساب'}`;

            if (resendData?.name === 'validation_error' || rawMsg.toLowerCase().includes('domain') || rawMsg.toLowerCase().includes('from') || rawMsg.toLowerCase().includes('validation')) {
              friendlyMsg = 'خطأ تحقق في Resend: يتطلب Resend توثيق نطاق موقعك في resend.com/domains، أو استخدام onboarding@resend.dev للإرسال لبريدك المسجل. يمكنك بدلاً منه استخدام حساب Gmail (App Password) المجاني الذي يرسل للجميع مباشرة.';
            } else if (rawMsg.toLowerCase().includes('only send testing emails')) {
              friendlyMsg = 'حساب Resend التجريبي يسمح فقط بالإرسال إلى بريدك المسجل في Resend. لتوصيل الرسائل لكافة المشتركين، يرجى تفعيل نطاقك في Resend أو استخدام حساب Gmail المجاني عبر كلمة مرور التطبيقات.';
            } else if (resendRes.status === 401 || rawMsg.toLowerCase().includes('api key') || rawMsg.toLowerCase().includes('unauthorized')) {
              friendlyMsg = 'مفتاح Resend API غير صحيح أو ملغي. يرجى التأكد من نسخه بشكل صحيح من resend.com/api-keys.';
            }

            console.warn('[Resend Notice]:', friendlyMsg);
            return res.json({
              success: false,
              message: friendlyMsg,
              provider: 'resend'
            });
          }
        } catch (resendErr: any) {
          console.warn('[Resend Dispatch Notice]:', resendErr?.message || String(resendErr));
          return res.json({
            success: false,
            message: `فشل الاتصال بـ Resend: ${resendErr?.message || String(resendErr)}`,
            provider: 'resend'
          });
        }
      }

      // 3. SMTP Transport (Gmail App Password, Yahoo, Outlook, Custom SMTP)
      const smtpUser = settings?.smtpUser?.trim() || process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
      const rawSmtpPass = settings?.smtpPass?.trim() || process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim() || '';
      const smtpPass = rawSmtpPass.replace(/\s+/g, '');

      if (smtpUser && smtpPass) {
        try {
          const host = settings?.smtpHost?.trim() || (settings?.provider === 'gmail' || smtpUser.includes('gmail') ? 'smtp.gmail.com' : 'smtp.gmail.com');
          const port = Number(settings?.smtpPort) || (host.includes('gmail') ? 465 : 587);
          const secure = settings?.smtpSecure !== undefined ? Boolean(settings.smtpSecure) : port === 465;

          const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          const mailOptions: nodemailer.SendMailOptions = {
            from: formattedFrom,
            to: validRecipients.join(', '),
            subject,
            html,
            text: text || subject,
            replyTo: settings?.replyToEmail?.trim() || smtpUser
          };

          const info = await transporter.sendMail(mailOptions);

          return res.json({
            success: true,
            message: `تم إرسال البريد بنجاح عبر خادم SMTP (${host}) إلى (${validRecipients.length}) مشترك.`,
            provider: 'smtp',
            messageId: info.messageId,
            response: info.response,
            sentCount: validRecipients.length
          });
        } catch (smtpErr: any) {
          const rawErr = smtpErr?.message || String(smtpErr);
          let friendly = `تعذر الإرسال عبر خادم البريد: ${rawErr}`;
          if (rawErr.includes('Invalid login') || rawErr.includes('Username and Password not accepted') || rawErr.includes('535-5.7.8')) {
            friendly = 'بيانات الاعتماد غير صحيحة: إذا كنت تستخدم حساب Gmail، تأكد من استخدام "كلمة مرور التطبيقات" (App Password المكونة من 16 حرفاً) من إعدادات حساب Google وليس كلمة المرور العادية.';
          }
          console.warn('[SMTP Transport Notice]', friendly);
          return res.json({
            success: false,
            message: friendly,
            provider: 'smtp',
            errorDetails: rawErr
          });
        }
      }

      // 4. Default / Simulated fallback if no SMTP or API key is set
      return res.json({
        success: true,
        simulated: true,
        message: `تم تجهيز وتنسيق البريد بنجاح لـ (${validRecipients.length}) مشترك. لتوصيل الرسالة مباشرة إلى صناديق Gmail و Yahoo و Outlook، يرجى تفعيل مزود البريد (Gmail App Password أو Brevo مجاني) من لوحة التحكم -> إعدادات المشتركين.`,
        sentCount: validRecipients.length,
        recipients: validRecipients
      });
    } catch (err: any) {
      console.warn('[Send Email Notice]:', err?.message || String(err));
      return res.json({
        success: false,
        message: `حدث خطأ أثناء معالجة البريد: ${err?.message || String(err)}`
      });
    }
  });

  // Mount Vite or Static Files
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Platform Server] Express + Vite running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Platform Server] Failed to start:', err);
  process.exit(1);
});
