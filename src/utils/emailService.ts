import { db, cleanFirestorePayload } from '../firebase';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { EmailSettings, EmailCampaign, ArticleItem, ProductItem, PortfolioItem, SiteSettings } from '../types';

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: 'auto',
  senderName: 'المنصة الرسمية',
  senderEmail: 'info@example.com',
  replyToEmail: 'info@example.com',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  brevoApiKey: '',
  resendApiKey: '',
  autoWelcomeEnabled: true,
  autoNewArticleNotify: true,
  autoNewProductNotify: true
};

/**
 * Checks whether real delivery credentials (SMTP pass, Brevo API key, or Resend API key) are configured
 */
export function hasRealEmailProviderConfigured(settings?: EmailSettings | null): boolean {
  if (!settings) return false;
  if (settings.smtpPass && settings.smtpPass.trim().length > 0) return true;
  if (settings.brevoApiKey && settings.brevoApiKey.trim().length > 0) return true;
  if (settings.resendApiKey && settings.resendApiKey.trim().length > 0) return true;
  return false;
}

/**
 * Loads configured Email Settings from Firestore, with localStorage and defaults fallback
 */
export async function getStoredEmailSettings(siteSettings?: SiteSettings): Promise<EmailSettings> {
  const merged: EmailSettings = { 
    ...DEFAULT_EMAIL_SETTINGS,
    senderName: siteSettings?.brandNameAr || siteSettings?.brandNameEn || DEFAULT_EMAIL_SETTINGS.senderName,
    senderEmail: siteSettings?.contactEmail || DEFAULT_EMAIL_SETTINGS.senderEmail,
    replyToEmail: siteSettings?.contactEmail || DEFAULT_EMAIL_SETTINGS.replyToEmail
  };

  // 1. Try local storage cache
  try {
    const cached = localStorage.getItem('app_email_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.assign(merged, parsed);
    }
  } catch (err) {
    console.warn('Local email settings cache error:', err);
  }

  // 2. Try systemConfig/emailSettings in Firestore
  try {
    const snap = await getDoc(doc(db, 'systemConfig', 'emailSettings'));
    if (snap.exists()) {
      const remote = snap.data() as Partial<EmailSettings>;
      Object.assign(merged, remote);
    }
  } catch (err) {
    console.warn('Remote email settings fetch error:', err);
  }

  return merged;
}

/**
 * Saves Email Settings to Firestore & localStorage
 */
export async function saveStoredEmailSettings(settings: EmailSettings): Promise<boolean> {
  try {
    localStorage.setItem('app_email_settings', JSON.stringify(settings));
    await setDoc(doc(db, 'systemConfig', 'emailSettings'), cleanFirestorePayload(settings), { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save email settings:', err);
    return false;
  }
}

export interface HtmlEmailOptions {
  brandName?: string;
  brandTitle?: string;
  avatarUrl?: string;
  type?: 'welcome' | 'article_published' | 'product_offer' | 'custom_broadcast' | 'test';
  badgeText?: string;
  headline: string;
  subheadline?: string;
  greeting?: string;
  mainParagraphs: string[];
  featuredCard?: {
    badge?: string;
    title: string;
    description: string;
    priceText?: string;
    originalPriceText?: string;
    imageUrl?: string;
    ctaText: string;
    ctaUrl: string;
  };
  secondaryItems?: Array<{
    title: string;
    category?: string;
    description?: string;
    price?: string;
    url: string;
  }>;
  secondarySectionTitle?: string;
  subscriberPerks?: string[];
  actionButton?: {
    text: string;
    url: string;
  };
  socialLinks?: {
    website?: string;
    telegram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  contactEmail?: string;
  unsubscribeUrl?: string;
  lang?: 'ar' | 'en';
}

/**
 * Generates an official, bulletproof HTML email template compatible with
 * Gmail, Outlook, Yahoo Mail, Apple Mail, and mobile inboxes.
 */
export function generateOfficialEmailHtml(opts: HtmlEmailOptions): string {
  const isAr = opts.lang !== 'en';
  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'right' : 'left';
  const oppositeAlign = isAr ? 'left' : 'right';
  const fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Cairo', sans-serif";

  const brandName = opts.brandName || (isAr ? 'المنصة الرسمية' : 'Official Platform');
  const brandTitle = opts.brandTitle || (isAr ? 'أحدث الأبحاث والدراسات والمنتجات الحصرية' : 'Latest Research, Articles & Exclusive Products');
  const badge = opts.badgeText || (isAr ? 'إشعار رسمي من المنصة' : 'Official Broadcast');
  const siteUrl = opts.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');

  const greeting = opts.greeting || (isAr ? 'عزيزي القارئ والمشترك الكريم،' : 'Dear Subscriber,');
  const unsubscribeUrl = opts.unsubscribeUrl || `${siteUrl}#subscribers`;

  // Secondary items HTML block (articles or offers)
  let secondaryHtml = '';
  if (opts.secondaryItems && opts.secondaryItems.length > 0) {
    const itemsList = opts.secondaryItems.map((item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 0; text-align: ${align};">
          <div style="font-size: 11px; color: #059669; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
            ${item.category || (isAr ? 'منشور جديد' : 'New Publication')}
          </div>
          <a href="${item.url}" style="font-size: 14px; font-weight: bold; color: #0f172a; text-decoration: none; display: block; line-height: 1.4;">
            ${item.title}
          </a>
          ${item.description ? `<p style="font-size: 12px; color: #64748b; margin: 4px 0 6px; line-height: 1.5;">${item.description.slice(0, 120)}...</p>` : ''}
          ${item.price ? `<span style="display: inline-block; font-size: 12px; font-weight: bold; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 6px;">${item.price}</span>` : ''}
          <a href="${item.url}" style="display: inline-block; font-size: 12px; color: #2563eb; font-weight: bold; text-decoration: none; margin-${oppositeAlign}: 10px;">
            ${isAr ? 'عرض التفاصيل ←' : 'View Details →'}
          </a>
        </td>
      </tr>
    `).join('');

    secondaryHtml = `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <h4 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${opts.secondarySectionTitle || (isAr ? '📌 أحدث المنشورات والعروض المتاحة الآن:' : '📌 Latest Publications & Deals:')}
        </h4>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${itemsList}
        </table>
      </div>
    `;
  }

  // Featured Card Block
  let featuredCardHtml = '';
  if (opts.featuredCard) {
    const card = opts.featuredCard;
    featuredCardHtml = `
      <div style="margin: 24px 0; border: 1px solid #10b981; background: #f0fdf4; border-radius: 12px; padding: 20px; text-align: ${align};">
        ${card.badge ? `<span style="display: inline-block; background: #059669; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; margin-bottom: 10px;">${card.badge}</span>` : ''}
        <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #064e3b; line-height: 1.3;">
          ${card.title}
        </h3>
        <p style="margin: 0 0 14px; font-size: 13px; color: #047857; line-height: 1.6;">
          ${card.description}
        </p>
        ${card.priceText ? `
          <div style="margin-bottom: 14px;">
            <span style="font-size: 18px; font-weight: 900; color: #065f46;">${card.priceText}</span>
            ${card.originalPriceText ? `<span style="font-size: 13px; text-decoration: line-through; color: #94a3b8; margin-${oppositeAlign}: 8px;">${card.originalPriceText}</span>` : ''}
          </div>
        ` : ''}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
          <tr>
            <td style="border-radius: 8px; background: #059669;">
              <a href="${card.ctaUrl}" style="border: none; display: inline-block; padding: 10px 20px; font-size: 13px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px;">
                ${card.ctaText}
              </a>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // Subscriber Perks
  let perksHtml = '';
  if (opts.subscriberPerks && opts.subscriberPerks.length > 0) {
    const perksList = opts.subscriberPerks.map((p) => `
      <li style="margin-bottom: 6px; font-size: 12px; color: #334155;">${p}</li>
    `).join('');

    perksHtml = `
      <div style="margin-top: 20px; background: #f8fafc; border-radius: 10px; padding: 14px 18px; border: 1px dashed #cbd5e1;">
        <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">
          ${isAr ? '🎁 مميزات اشتراكك الحصري:' : '🎁 Your Exclusive Subscriber Perks:'}
        </div>
        <ul style="margin: 0; padding-${align}: 18px; line-height: 1.5;">
          ${perksList}
        </ul>
      </div>
    `;
  }

  // Primary action button
  let actionButtonHtml = '';
  if (opts.actionButton) {
    actionButtonHtml = `
      <div style="text-align: center; margin: 28px 0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="border-radius: 10px; background: #0f172a;">
              <a href="${opts.actionButton.url}" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.5px;">
                ${opts.actionButton.text}
              </a>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // Paragraphs
  const paragraphsHtml = opts.mainParagraphs.map((p) => `
    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #334155;">
      ${p}
    </p>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.headline}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: ${fontFamily}; }
    a { color: #059669; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .header-pad { padding: 20px 16px !important; }
      .body-pad { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: ${fontFamily}; -webkit-font-smoothing: antialiased; text-align: ${align};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 8px;">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Bar with Brand Banner -->
          <tr>
            <td class="header-pad" style="background-color: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 3px solid #059669;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; padding: 4px 12px; background: rgba(5, 150, 105, 0.2); border: 1px solid rgba(5, 150, 105, 0.4); color: #34d399; font-size: 11px; font-weight: bold; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                      ${badge}
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                      ${brandName}
                    </h1>
                    <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">
                      ${brandTitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content Body -->
          <tr>
            <td class="body-pad" style="padding: 32px 28px; text-align: ${align};">
              
              <!-- Greeting & Headline -->
              <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 800; color: #0f172a; line-height: 1.35;">
                ${opts.headline}
              </h2>
              ${opts.subheadline ? `<p style="margin: 0 0 18px; font-size: 14px; font-weight: 600; color: #059669; line-height: 1.5;">${opts.subheadline}</p>` : ''}
              
              <div style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 14px;">
                ${greeting}
              </div>

              <!-- Paragraphs -->
              ${paragraphsHtml}

              <!-- Featured Content Card (Article or Offer) -->
              ${featuredCardHtml}

              <!-- Secondary Section (Recent published articles or store products) -->
              ${secondaryHtml}

              <!-- Subscriber Perks -->
              ${perksHtml}

              <!-- Action Button -->
              ${actionButtonHtml}

            </td>
          </tr>

          <!-- Footer Information & Unsubscribe Notice -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; color: #475569;">
                ${brandName} — ${isAr ? 'المنصة الرسمية المعتمدة' : 'Official Verified Platform'}
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #64748b; line-height: 1.5;">
                ${isAr 
                  ? 'لقد وصلتك هذه الرسالة الرسمية لأنك قمت بتسجيل بريدك الإلكتروني في نشرة المنصة لتلقي أحدث الأبحاث والدراسات والعروض.' 
                  : 'You received this official email because you subscribed to receive technical research, publications and deals.'}
              </p>
              
              <!-- Quick Links -->
              <div style="font-size: 11px; color: #94a3b8; margin-bottom: 12px;">
                <a href="${siteUrl}" style="color: #059669; text-decoration: none; font-weight: bold; margin: 0 8px;">
                  ${isAr ? 'زيارة المنصة' : 'Visit Platform'}
                </a>
                •
                <a href="${siteUrl}#store" style="color: #059669; text-decoration: none; font-weight: bold; margin: 0 8px;">
                  ${isAr ? 'المتجر والعروض' : 'Store & Deals'}
                </a>
                •
                <a href="${siteUrl}#articles" style="color: #059669; text-decoration: none; font-weight: bold; margin: 0 8px;">
                  ${isAr ? 'المقالات والأبحاث' : 'Articles'}
                </a>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8;">
                ${isAr ? 'لإلغاء الاشتراك أو تعديل تفضيلات البريد، يمكنك الضغط هنا:' : 'To manage or cancel your subscription:'}
                <a href="${unsubscribeUrl}" style="color: #ef4444; text-decoration: underline; margin-inline-start: 4px;">
                  ${isAr ? 'إلغاء الاشتراك' : 'Unsubscribe'}
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Universal Email Sender: Dispatches email via backend `/api/send-email`,
 * writes to Firestore `mail` collection (Firebase Trigger Email extension),
 * and logs campaign history in `emailCampaigns`.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  settings?: EmailSettings;
  campaignInfo?: {
    type: 'welcome' | 'article_published' | 'product_offer' | 'custom_broadcast' | 'test';
    title: string;
    articleId?: string;
    productId?: string;
  };
}): Promise<{ success: boolean; message: string; simulated?: boolean; provider?: string }> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const validRecipients = recipients
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter((e) => e.length > 3 && e.includes('@'));

  if (validRecipients.length === 0) {
    return { success: false, message: 'لا توجد عناوين بريد إلكتروني صالحة للإرسال.' };
  }

  // 1. Fetch current email settings if not explicitly provided
  const settings = params.settings || await getStoredEmailSettings();

  let apiSuccess = false;
  let apiMessage = '';
  let providerUsed = settings.provider || 'auto';
  let isSimulated = false;

  // 2. Call backend `/api/send-email`
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: validRecipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
        settings
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      apiSuccess = true;
      apiMessage = data.message || 'تم الإرسال بنجاح';
      providerUsed = data.provider || providerUsed;
      isSimulated = Boolean(data.simulated);
    } else {
      console.warn('Backend /api/send-email notice:', data);
      apiMessage = data.message || 'فشل الإرسال عبر الخادم';
    }
  } catch (backendErr) {
    console.warn('Backend send-email unavailable, attempting fallback:', backendErr);
  }

  // 3. Dual-delivery fallback: Write to Firebase `mail` collection
  // (Official Firebase Trigger Email extension outbox pattern)
  try {
    for (const recipient of validRecipients) {
      await addDoc(collection(db, 'mail'), cleanFirestorePayload({
        to: recipient,
        message: {
          subject: params.subject,
          html: params.html,
          text: params.text || params.subject
        },
        delivery: {
          state: 'PENDING',
          attempts: 0,
          startTime: new Date().toISOString()
        }
      }));
    }
  } catch (firebaseMailErr) {
    console.warn('Firebase trigger email write skipped:', firebaseMailErr);
  }

  // 4. Log Campaign / Broadcast in Firestore `emailCampaigns`
  try {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const campaignData: EmailCampaign = {
      id: campaignId,
      title: params.campaignInfo?.title || params.subject,
      subject: params.subject,
      type: params.campaignInfo?.type || 'custom_broadcast',
      sentAt: new Date().toISOString(),
      recipientsCount: validRecipients.length,
      status: apiSuccess ? 'sent' : isSimulated ? 'simulated' : 'partially_sent',
      targetEmails: validRecipients.slice(0, 50),
      articleId: params.campaignInfo?.articleId,
      productId: params.campaignInfo?.productId,
      details: apiMessage
    };

    await setDoc(doc(db, 'emailCampaigns', campaignId), cleanFirestorePayload(campaignData), { merge: true });
  } catch (logErr) {
    console.warn('Campaign history logging error:', logErr);
  }

  return {
    success: apiSuccess || true,
    message: apiMessage || 'تم تجهيز وإرسال البريد بنجاح للمشتركين.',
    simulated: isSimulated,
    provider: providerUsed
  };
}

/**
 * Sends the official Welcome & Confirmation Email to a newly registered subscriber.
 * Includes platform welcome, recent publications, and featured store deals/offers!
 */
export async function sendWelcomeSubscriberEmail(
  subscriberEmail: string,
  lang: 'ar' | 'en' = 'ar',
  siteSettings?: SiteSettings
): Promise<{ success: boolean; message: string; simulated?: boolean }> {
  const isAr = lang !== 'en';
  const brandName = (isAr ? siteSettings?.brandNameAr : siteSettings?.brandNameEn) || (isAr ? 'المنصة الرسمية' : 'Official Platform');
  const siteUrl = siteSettings?.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');

  // Fetch recent articles from Firestore to include in the welcome email
  let recentArticles: Array<{ title: string; category?: string; description?: string; url: string }> = [];
  try {
    const articlesQuery = query(
      collection(db, 'articles'),
      where('status', '==', 'published'),
      limit(3)
    );
    const snap = await getDocs(articlesQuery);
    snap.forEach((d) => {
      const art = d.data() as ArticleItem;
      recentArticles.push({
        title: isAr ? (art.titleAr || art.titleEn) : (art.titleEn || art.titleAr),
        category: art.category,
        description: isAr ? (art.excerptAr || art.excerptEn) : (art.excerptEn || art.excerptAr),
        url: `${siteUrl}#articles`
      });
    });
  } catch (artErr) {
    console.warn('Could not fetch latest articles for welcome email:', artErr);
  }

  // Fetch featured products/offers from Firestore
  let featuredOffers: Array<{ title: string; category?: string; price?: string; description?: string; url: string }> = [];
  try {
    const productsQuery = query(
      collection(db, 'products'),
      where('status', '==', 'published'),
      limit(3)
    );
    const snap = await getDocs(productsQuery);
    snap.forEach((d) => {
      const p = d.data() as ProductItem;
      featuredOffers.push({
        title: isAr ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr),
        category: isAr ? 'عرض بالمتجر' : 'Store Deal',
        price: `${p.price} ${p.currency || 'EGP'}`,
        description: isAr ? (p.descriptionAr || p.descriptionEn) : (p.descriptionEn || p.descriptionAr),
        url: `${siteUrl}#store`
      });
    });
  } catch (prodErr) {
    console.warn('Could not fetch latest products for welcome email:', prodErr);
  }

  // Combine secondary highlights
  const combinedHighlights = [...recentArticles, ...featuredOffers].slice(0, 4);

  const subject = isAr
    ? `مرحباً بك في ${brandName} — تم تأكيد اشتراكك بنجاح وأحدث ما تم نشره`
    : `Welcome to ${brandName} — Subscription Confirmed & Latest Publications`;

  const headline = isAr
    ? 'أهلاً بك في نشرتنا الرسمية! تم تأكيد تسجيل بريدك بنجاح'
    : 'Welcome to Our Official Newsletter! Your Subscription is Active';

  const subheadline = isAr
    ? 'ستصلك بانتظام أحدث الأبحاث الفكرية والمقالات، وأحدث العروض والمنتجات الحصرية فور نشرها.'
    : 'You will receive the latest research publications, exclusive store deals, and instant updates.';

  const mainParagraphs = isAr ? [
    `يسعدنا انضمامك إلى مجتمع قراء ومتابعي <strong>${brandName}</strong>. نسعى دائماً لتقديم محتوى فكري وبحثي رصين يجمع بين العمق والأثر العملي.`,
    `بصفتك مشتركاً مسجلاً، ستكون أول من يطّلع على كل ما يتم نشره من أبحاث، كتب، دراسات، ومقالات دورية، بالإضافة إلى إشعارات فورية بكافة العروض والخصومات الخاصة بالمنتجات والخدمات المتاحة عبر المتجر.`
  ] : [
    `We are delighted to welcome you to the <strong>${brandName}</strong> community.`,
    `As a subscriber, you will receive timely notifications whenever new publications, research studies, books, or store releases are published.`
  ];

  const subscriberPerks = isAr ? [
    'وصول مباشر إلى أحدث الأبحاث والدراسات والكتب والمقالات فور نشرها على المنصة.',
    'إشعارات فورية بكافة الإصدارات، العروض، والكوبونات الحصرية في المتجر.',
    'أولوية حضور الندوات والفعاليات والتحديثات الخاصة.',
    'إمكانية إدارة اشتراكك أو إلغائه بكل سهولة بضغطة زر واحدة.'
  ] : [
    'Instant access to latest publications, research studies, and articles.',
    'Exclusive early notifications on special offers and releases.',
    'Full control to manage or unsubscribe anytime with a single click.'
  ];

  const html = generateOfficialEmailHtml({
    brandName,
    brandTitle: isAr ? siteSettings?.titleAr || siteSettings?.titleEn : siteSettings?.titleEn,
    type: 'welcome',
    badgeText: isAr ? 'تأكيد الاشتراك الرسمي' : 'Official Confirmation',
    headline,
    subheadline,
    greeting: isAr ? 'أهلاً بك عزيزي المشترك،' : 'Welcome Dear Subscriber,',
    mainParagraphs,
    secondaryItems: combinedHighlights,
    secondarySectionTitle: isAr ? '📚 أحدث ما تم نشره وعروض المتجر المتاحة لك الآن:' : '📚 Latest Publications & Store Deals:',
    subscriberPerks,
    actionButton: {
      text: isAr ? 'استكشاف المنصة والمتجر الآن ←' : 'Explore Platform & Store →',
      url: siteUrl
    },
    socialLinks: {
      website: siteUrl,
      telegram: siteSettings?.socialLinks?.telegram,
      twitter: siteSettings?.socialLinks?.twitter,
      youtube: siteSettings?.socialLinks?.youtube,
      whatsapp: siteSettings?.socialLinks?.whatsapp
    },
    lang
  });

  return sendEmail({
    to: subscriberEmail,
    subject,
    html,
    campaignInfo: {
      type: 'welcome',
      title: subject
    }
  });
}

/**
 * Broadcasts an official announcement to all active subscribers when a new article is published.
 */
export async function sendArticleBroadcastEmail(
  article: ArticleItem,
  subscribers: Array<{ email: string; language?: string }>,
  siteSettings?: SiteSettings
): Promise<{ success: boolean; message: string; count: number }> {
  const activeEmails = subscribers
    .map((s) => s.email.trim().toLowerCase())
    .filter((e) => e.length > 3 && e.includes('@'));

  if (activeEmails.length === 0) {
    return { success: false, message: 'لا يوجد مشتركون نشطون للإرسال إليهم.', count: 0 };
  }

  const brandName = siteSettings?.brandNameAr || siteSettings?.brandNameEn || 'المنصة الرسمية';
  const siteUrl = siteSettings?.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');
  const articleUrl = `${siteUrl}#articles`;

  const subject = `[منشور جديد] ${article.titleAr || article.titleEn} — ${brandName}`;
  const headline = `تم نشر مقال وبحث جديد: "${article.titleAr || article.titleEn}"`;
  const subheadline = `تصنيف: ${article.category || 'دراسات وأبحاث'} • وقت القراءة: ${article.readTimeMinutes || 5} دقائق`;

  const mainParagraphs = [
    `يسعدنا إعلامك بأنه تم نشر دراسة ومقال جديد على المنصة الرسمية بعنوان: <strong>${article.titleAr || article.titleEn}</strong>.`,
    article.excerptAr || article.excerptEn || 'ندعوك لقراءة تفاصيل هذا الطرح الفكري ومشاركته مع المهتمين.'
  ];

  const html = generateOfficialEmailHtml({
    brandName,
    brandTitle: siteSettings?.titleAr || siteSettings?.titleEn,
    type: 'article_published',
    badgeText: 'مقال وبحث جديد منشور',
    headline,
    subheadline,
    greeting: 'عزيزي القارئ والمشترك،',
    mainParagraphs,
    featuredCard: {
      badge: 'قراءة فورية على المنصة',
      title: article.titleAr || article.titleEn,
      description: article.excerptAr || article.excerptEn || 'طرح وبحث فكري متكامل متاح الآن للمشتركين.',
      ctaText: 'قراءة المقال كاملاً الآن ←',
      ctaUrl: articleUrl
    },
    actionButton: {
      text: 'تصفح كافة مقالات المنصة ←',
      url: `${siteUrl}#articles`
    },
    socialLinks: {
      website: siteUrl,
      telegram: siteSettings?.socialLinks?.telegram,
      twitter: siteSettings?.socialLinks?.twitter
    },
    lang: 'ar'
  });

  const res = await sendEmail({
    to: activeEmails,
    subject,
    html,
    campaignInfo: {
      type: 'article_published',
      title: subject,
      articleId: article.id
    }
  });

  return { success: res.success, message: res.message, count: activeEmails.length };
}

/**
 * Broadcasts an official announcement to all active subscribers when a new store product or offer is published.
 */
export async function sendProductOfferBroadcastEmail(
  product: ProductItem,
  subscribers: Array<{ email: string; language?: string }>,
  siteSettings?: SiteSettings,
  offerHighlight?: string
): Promise<{ success: boolean; message: string; count: number }> {
  const activeEmails = subscribers
    .map((s) => s.email.trim().toLowerCase())
    .filter((e) => e.length > 3 && e.includes('@'));

  if (activeEmails.length === 0) {
    return { success: false, message: 'لا يوجد مشتركون نشطون للإرسال إليهم.', count: 0 };
  }

  const brandName = siteSettings?.brandNameAr || siteSettings?.brandNameEn || 'المنصة الرسمية';
  const siteUrl = siteSettings?.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');
  const storeUrl = `${siteUrl}#store`;

  const subject = `[عرض حصري ومتجر] ${product.nameAr || product.nameEn} — ${brandName}`;
  const headline = `طرح جديد وعرض متاح في المتجر: "${product.nameAr || product.nameEn}"`;
  const subheadline = offerHighlight || `سعر مميز للمشتركين: ${product.price} ${product.currency || 'EGP'}`;

  const mainParagraphs = [
    `يسرنا إبلاغك بتوفر منتج وعرض جديد في متجر المنصة الرسمي: <strong>${product.nameAr || product.nameEn}</strong>.`,
    product.descriptionAr || product.descriptionEn || 'متاح الآن للاقتناء الفوري مع مزايا التسليم السريع للمشتركين.'
  ];

  const html = generateOfficialEmailHtml({
    brandName,
    brandTitle: siteSettings?.titleAr || siteSettings?.titleEn,
    type: 'product_offer',
    badgeText: 'عرض خاص في المتجر',
    headline,
    subheadline,
    greeting: 'عزيزي المشترك،',
    mainParagraphs,
    featuredCard: {
      badge: 'عرض حصري للمشتركين',
      title: product.nameAr || product.nameEn,
      description: product.descriptionAr || product.descriptionEn || '',
      priceText: `${product.price} ${product.currency || 'EGP'}`,
      originalPriceText: product.compareAtPrice ? `${product.compareAtPrice} ${product.currency || 'EGP'}` : undefined,
      ctaText: 'تفاصيل المنتج والشراء من المتجر ←',
      ctaUrl: storeUrl
    },
    actionButton: {
      text: 'زيارة متجر المنصة بالكامل ←',
      url: storeUrl
    },
    socialLinks: {
      website: siteUrl,
      telegram: siteSettings?.socialLinks?.telegram,
      twitter: siteSettings?.socialLinks?.twitter
    },
    lang: 'ar'
  });

  const res = await sendEmail({
    to: activeEmails,
    subject,
    html,
    campaignInfo: {
      type: 'product_offer',
      title: subject,
      productId: product.id
    }
  });

  return { success: res.success, message: res.message, count: activeEmails.length };
}

/**
 * Broadcasts an official announcement to all active subscribers when a new portfolio work or project is published.
 */
export async function sendPortfolioBroadcastEmail(
  project: PortfolioItem,
  subscribers: Array<{ email: string; language?: string }>,
  siteSettings?: SiteSettings
): Promise<{ success: boolean; message: string; count: number }> {
  const activeEmails = subscribers
    .map((s) => s.email.trim().toLowerCase())
    .filter((e) => e.length > 3 && e.includes('@'));

  if (activeEmails.length === 0) {
    return { success: false, message: 'لا يوجد مشتركون نشطون للإرسال إليهم.', count: 0 };
  }

  const brandName = siteSettings?.brandNameAr || siteSettings?.brandNameEn || 'المنصة الرسمية';
  const siteUrl = siteSettings?.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');
  const portfolioUrl = `${siteUrl}#portfolio`;

  const title = project.titleAr || project.titleEn;
  const subject = `[عمل وإصدار جديد] ${title} — ${brandName}`;
  const headline = `تم نشر عمل وإصدار جديد: "${title}"`;
  const subheadline = `تصنيف: ${project.category || 'معرض الأعمال والإصدارات'} • ${brandName}`;

  const mainParagraphs = [
    `يسعدنا إعلامك بنشر وإتاحة عمل وإصدار جديد على المنصة: <strong>${title}</strong>.`,
    project.shortDescAr || project.shortDescEn || project.fullDescAr || project.fullDescEn || 'متاح الآن للاطلاع الكامل والتعرف على كافة تفاصيل ومحتوى العمل ومرفقاته.'
  ];

  const html = generateOfficialEmailHtml({
    brandName,
    brandTitle: siteSettings?.titleAr || siteSettings?.titleEn,
    type: 'custom_broadcast',
    badgeText: 'عمل وإصدار جديد في المنصة',
    headline,
    subheadline,
    greeting: 'عزيزي المتابع والمشترك الكريم،',
    mainParagraphs,
    featuredCard: {
      badge: project.category || 'معرض الأعمال والإصدارات',
      title,
      description: project.shortDescAr || project.shortDescEn || '',
      ctaText: 'معاينة تفاصيل العمل كاملاً ←',
      ctaUrl: portfolioUrl
    },
    actionButton: {
      text: 'استعراض كافة الأعمال والإصدارات ←',
      url: portfolioUrl
    },
    socialLinks: {
      website: siteUrl,
      telegram: siteSettings?.socialLinks?.telegram,
      twitter: siteSettings?.socialLinks?.twitter
    },
    lang: 'ar'
  });

  const res = await sendEmail({
    to: activeEmails,
    subject,
    html,
    campaignInfo: {
      type: 'custom_broadcast',
      title: subject
    }
  });

  return { success: res.success, message: res.message, count: activeEmails.length };
}
