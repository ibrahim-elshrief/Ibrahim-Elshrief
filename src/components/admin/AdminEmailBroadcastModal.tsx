import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Send, 
  Eye, 
  FileText, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Users, 
  Mail, 
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { NewsletterSubscriber, ArticleItem, ProductItem, SiteSettings, EmailSettings } from '../../types';
import { 
  sendEmail, 
  generateOfficialEmailHtml, 
  getStoredEmailSettings,
  hasRealEmailProviderConfigured 
} from '../../utils/emailService';

interface AdminEmailBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: NewsletterSubscriber[];
  onSuccess: (msg: string) => void;
  siteSettings?: SiteSettings;
  initialType?: 'article' | 'product' | 'custom' | 'welcome';
  initialArticle?: ArticleItem;
  initialProduct?: ProductItem;
  onOpenSettings?: () => void;
}

export const AdminEmailBroadcastModal: React.FC<AdminEmailBroadcastModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  onSuccess,
  siteSettings,
  initialType = 'article',
  initialArticle,
  initialProduct,
  onOpenSettings
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [campaignType, setCampaignType] = useState<'article' | 'product' | 'custom' | 'welcome'>(initialType);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Audience
  const [recipientTarget, setRecipientTarget] = useState<'all' | 'test'>('all');
  const [testEmail, setTestEmail] = useState('');
  const [loadedSettings, setLoadedSettings] = useState<EmailSettings | null>(null);

  // Firestore options
  const [availableArticles, setAvailableArticles] = useState<ArticleItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Form Fields
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [paragraphsText, setParagraphsText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');

  // Product specific
  const [productPrice, setProductPrice] = useState('');
  const [productOriginalPrice, setProductOriginalPrice] = useState('');

  // Dispatch state
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeSubscribers = useMemo(() => {
    return subscribers.filter((s) => s.status === 'active');
  }, [subscribers]);

  const brandName = siteSettings?.brandNameAr || siteSettings?.brandNameEn || (isAr ? 'المنصة الرسمية' : 'Official Platform');
  const siteUrl = siteSettings?.socialLinks?.website || (typeof window !== 'undefined' ? window.location.origin : 'https://platform.local');

  // Load published articles and products for 1-click template selection
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const artSnap = await getDocs(query(collection(db, 'articles'), where('status', '==', 'published'), limit(20)));
        const arts: ArticleItem[] = [];
        artSnap.forEach((d) => arts.push({ id: d.id, ...d.data() } as ArticleItem));
        setAvailableArticles(arts);

        const prodSnap = await getDocs(query(collection(db, 'products'), where('status', '==', 'published'), limit(20)));
        const prods: ProductItem[] = [];
        prodSnap.forEach((d) => prods.push({ id: d.id, ...d.data() } as ProductItem));
        setAvailableProducts(prods);

        const stg = await getStoredEmailSettings(siteSettings);
        setLoadedSettings(stg);
      } catch (err) {
        console.warn('Failed to load published articles or products for broadcast:', err);
      }
    };
    loadData();
  }, [isOpen]);

  // Set default fields based on campaign type
  useEffect(() => {
    if (!isOpen) return;

    if (campaignType === 'article') {
      const art = initialArticle || availableArticles[0];
      if (art) {
        setSelectedArticleId(art.id);
        const title = art.titleAr || art.titleEn;
        setSubject(`[منشور جديد] ${title} — ${brandName}`);
        setHeadline(`تم نشر مقال وبحث جديد: "${title}"`);
        setSubheadline(`تصنيف: ${art.category || 'أبحاث ودراسات'} • وقت القراءة: ${art.readTimeMinutes || 5} دقائق`);
        setBadgeText('مقال وبحث جديد منشور');
        setParagraphsText(
          `يسعدنا إعلامك بنشر دراسة ومقال جديد على المنصة الرسمية بعنوان: "${title}".\n\n` +
          (art.excerptAr || art.excerptEn || 'طرح فكري متكامل متاح الآن للمشتركين.')
        );
        setButtonText('قراءة المقال كاملاً على المنصة ←');
        setButtonUrl(`${siteUrl}#articles`);
      } else {
        setSubject(`[منشور جديد] مقال وبحث جديد — ${brandName}`);
        setHeadline('تم نشر مقال وبحث فكري جديد على المنصة');
        setSubheadline('أحدث الأبحاث والدراسات المتاحة للمشتركين');
        setBadgeText('منشور رسمي جديد');
        setParagraphsText('يسرنا إبلاغك بنشر مادة فكرية وبحثية جديدة على المنصة.');
        setButtonText('قراءة المقال على المنصة ←');
        setButtonUrl(`${siteUrl}#articles`);
      }
    } else if (campaignType === 'product') {
      const prod = initialProduct || availableProducts[0];
      if (prod) {
        setSelectedProductId(prod.id);
        const name = prod.nameAr || prod.nameEn;
        setSubject(`[عرض حصري ومتجر] ${name} — ${brandName}`);
        setHeadline(`طرح جديد وعرض متاح في المتجر: "${name}"`);
        setSubheadline(`متاح الآن للاقتناء المباشر للمشتركين`);
        setBadgeText('عرض خاص ومنتج جديد');
        setProductPrice(`${prod.price} ${prod.currency || 'EGP'}`);
        setProductOriginalPrice(prod.compareAtPrice ? `${prod.compareAtPrice} ${prod.currency || 'EGP'}` : '');
        setParagraphsText(
          `يسرنا إبلاغك بتوفر منتج وعرض جديد في متجر المنصة الرسمي: "${name}".\n\n` +
          (prod.descriptionAr || prod.descriptionEn || 'عرض خاص ومميز لقراء ومتابعي المنصة.')
        );
        setButtonText('تفاصيل المنتج والشراء من المتجر ←');
        setButtonUrl(`${siteUrl}#store`);
      } else {
        setSubject(`[عروض المتجر] منتج وعرض حصري جديد — ${brandName}`);
        setHeadline('طرح منتج وعرض جديد متاح الآن في المتجر');
        setSubheadline('خصومات ومزايا خاصة للمشتركين');
        setBadgeText('عرض خاص بالمتجر');
        setParagraphsText('يسعدنا تقديم أحدث المنتجات والعروض الحصرية المتاحة لك كقارئ ومشترك مسجل.');
        setButtonText('استكشاف المتجر والشراء ←');
        setButtonUrl(`${siteUrl}#store`);
      }
    } else if (campaignType === 'welcome') {
      setSubject(`مرحباً بك في ${brandName} — تم تأكيد اشتراكك وأحدث ما تم نشره`);
      setHeadline('أهلاً بك في نشرتنا الرسمية! تم تأكيد تسجيل بريدك بنجاح');
      setSubheadline('ستصلك أحدث المقالات والأبحاث، وأحدث عروض المتجر فور نشرها.');
      setBadgeText('تأكيد الاشتراك الرسمي');
      setParagraphsText(
        `يسعدنا انضمامك إلى مجتمع قراء ومتابعي ${brandName}.\n\n` +
        `بصفتك مشتركاً مسجلاً، ستكون أول من يطّلع على كل ما يتم نشره من مقالات وبحوث جديدة، بالإضافة إلى إشعارات فورية بكافة العروض والخصومات الخاصة بالمنتجات والخدمات المتاحة عبر المتجر.`
      );
      setButtonText('زيارة المنصة واستكشاف المتجر ←');
      setButtonUrl(siteUrl);
    } else {
      setSubject(`[بيان رسمي] تحديث ونشرة من ${brandName}`);
      setHeadline('نشرة وإشعار رسمي لكافة المشتركين');
      setSubheadline('أحدث الأخبار والتحديثات من المنصة الرسمية');
      setBadgeText('إعلان رسمي للمشتركين');
      setParagraphsText('عزيزي المشترك، نود إطلاعك على آخر المستجدات والتحديثات الهامة الخاصة بالمنصة.');
      setButtonText('زيارة المنصة الرسمية ←');
      setButtonUrl(siteUrl);
    }
  }, [campaignType, availableArticles, availableProducts, isOpen]);

  // Handle selecting an article from dropdown
  const handleSelectArticle = (artId: string) => {
    setSelectedArticleId(artId);
    const art = availableArticles.find(a => a.id === artId);
    if (art) {
      const title = art.titleAr || art.titleEn;
      setSubject(`[منشور جديد] ${title} — ${brandName}`);
      setHeadline(`تم نشر مقال وبحث جديد: "${title}"`);
      setSubheadline(`تصنيف: ${art.category || 'أبحاث ودراسات'} • وقت القراءة: ${art.readTimeMinutes || 5} دقائق`);
      setParagraphsText(
        `يسعدنا إعلامك بنشر دراسة ومقال جديد على المنصة الرسمية بعنوان: "${title}".\n\n` +
        (art.excerptAr || art.excerptEn || '')
      );
    }
  };

  // Handle selecting a product from dropdown
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = availableProducts.find(p => p.id === prodId);
    if (prod) {
      const name = prod.nameAr || prod.nameEn;
      setSubject(`[عرض حصري ومتجر] ${name} — ${brandName}`);
      setHeadline(`طرح جديد وعرض متاح في المتجر: "${name}"`);
      setProductPrice(`${prod.price} ${prod.currency || 'EGP'}`);
      setProductOriginalPrice(prod.compareAtPrice ? `${prod.compareAtPrice} ${prod.currency || 'EGP'}` : '');
      setParagraphsText(
        `يسرنا إبلاغك بتوفر منتج وعرض جديد في متجر المنصة الرسمي: "${name}".\n\n` +
        (prod.descriptionAr || prod.descriptionEn || '')
      );
    }
  };

  // Generate preview HTML
  const renderedHtml = useMemo(() => {
    const paras = paragraphsText
      .split('\n\n')
      .map(p => p.trim())
      .filter(Boolean);

    let featuredCard = undefined;
    if (campaignType === 'article') {
      featuredCard = {
        badge: 'قراءة فورية على المنصة',
        title: headline,
        description: paras[1] || paras[0] || '',
        ctaText: buttonText || 'قراءة المقال كاملاً ←',
        ctaUrl: buttonUrl || `${siteUrl}#articles`
      };
    } else if (campaignType === 'product') {
      featuredCard = {
        badge: 'عرض خاص للمشتركين',
        title: headline,
        description: paras[1] || paras[0] || '',
        priceText: productPrice || undefined,
        originalPriceText: productOriginalPrice || undefined,
        ctaText: buttonText || 'الشراء وتفاصيل العرض ←',
        ctaUrl: buttonUrl || `${siteUrl}#store`
      };
    }

    const mappedType: 'welcome' | 'article_published' | 'product_offer' | 'custom_broadcast' = 
      campaignType === 'article' ? 'article_published' 
      : campaignType === 'product' ? 'product_offer' 
      : campaignType === 'welcome' ? 'welcome' 
      : 'custom_broadcast';

    return generateOfficialEmailHtml({
      brandName,
      brandTitle: siteSettings?.titleAr || siteSettings?.titleEn,
      type: mappedType,
      badgeText: badgeText || 'إشعار رسمي من المنصة',
      headline,
      subheadline,
      greeting: isAr ? 'عزيزي القارئ والمشترك الكريم،' : 'Dear Subscriber,',
      mainParagraphs: paras.length > 0 ? paras : ['يسعدنا إعلامك بآخر التحديثات.'],
      featuredCard,
      actionButton: buttonText && buttonUrl ? { text: buttonText, url: buttonUrl } : undefined,
      socialLinks: {
        website: siteUrl,
        telegram: siteSettings?.socialLinks?.telegram,
        twitter: siteSettings?.socialLinks?.twitter
      },
      lang: isAr ? 'ar' : 'en'
    });
  }, [campaignType, brandName, headline, subheadline, badgeText, paragraphsText, buttonText, buttonUrl, productPrice, productOriginalPrice, siteUrl, siteSettings, isAr]);

  const handleSendBroadcast = async () => {
    setErrorMsg('');

    let targetEmails: string[] = [];
    if (recipientTarget === 'test') {
      const clean = testEmail.trim().toLowerCase();
      if (!clean || !clean.includes('@')) {
        setErrorMsg(isAr ? 'يرجى إدخال عنوان بريد إلكتروني صالح للاختبار.' : 'Valid test email address required.');
        return;
      }
      targetEmails = [clean];
    } else {
      targetEmails = activeSubscribers
        .map(s => s.email.trim().toLowerCase())
        .filter(e => e.includes('@'));

      if (targetEmails.length === 0) {
        setErrorMsg(isAr ? 'لا يوجد أي مشتركون نشطون مسجلون في قاعدة البيانات.' : 'No active subscribers found.');
        return;
      }
    }

    setSending(true);

    try {
      const emailSettings = await getStoredEmailSettings(siteSettings);
      const mappedType: 'welcome' | 'article_published' | 'product_offer' | 'custom_broadcast' = 
        campaignType === 'article' ? 'article_published' 
        : campaignType === 'product' ? 'product_offer' 
        : campaignType === 'welcome' ? 'welcome' 
        : 'custom_broadcast';

      const res = await sendEmail({
        to: targetEmails,
        subject: subject.trim(),
        html: renderedHtml,
        text: subject.trim(),
        settings: emailSettings,
        campaignInfo: {
          type: mappedType,
          title: subject.trim(),
          articleId: selectedArticleId || undefined,
          productId: selectedProductId || undefined
        }
      });

      setSending(false);

      if (res.success) {
        if (res.simulated) {
          onSuccess(
            isAr
              ? `تم تسجيل وتنسيق النشرة لـ (${targetEmails.length}) مشترك. لتوصيلها فعلياً إلى صناديق Gmail و Yahoo و Outlook، يرجى إدخال كلمة مرور تطبيقات Gmail في إعدادات مزود البريد.`
              : `Broadcast queued for (${targetEmails.length}) subscribers. Connect Gmail App Password in Settings to deliver to live inboxes.`
          );
        } else {
          onSuccess(
            recipientTarget === 'test'
              ? (isAr ? `تم إرسال بريد الاختبار الفعلي بنجاح إلى ${testEmail}` : `Live test email sent to ${testEmail}`)
              : (isAr ? `تم إرسال الحملة بنجاح إلى (${targetEmails.length}) مشترك عبر خادم البريد!` : `Campaign sent to (${targetEmails.length}) subscribers via live mail server!`)
          );
        }
        onClose();
      } else {
        setErrorMsg(res.message || (isAr ? 'تعذر إرسال الحملة.' : 'Failed to send campaign.'));
      }
    } catch (err: any) {
      setSending(false);
      setErrorMsg(err?.message || (isAr ? 'حدث خطأ أثناء محاولة الإرسال.' : 'Error sending campaign.'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'مركز إرسال النشرات والإشعارات البريدية' : 'Email Broadcast & Campaign Center'}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {activeSubscribers.length} {isAr ? 'مشترك نشط' : 'Subscribers'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr 
                  ? 'إرسال بريد رسمي منسق لصناديق المشتركين (Gmail, Yahoo, Outlook) لإعلامهم بما تم نشره من مقالات وعروض.'
                  : 'Dispatch formatted emails to subscriber inboxes notifying them of publications and store offers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isAr ? 'تحرير المحتوى' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isAr ? 'معاينة حية للبريد' : 'Live Preview'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'edit' ? (
            <div className="space-y-6">
              {/* Delivery Server Status Banner */}
              {!hasRealEmailProviderConfigured(loadedSettings) && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-amber-950 dark:text-amber-200">
                      <span className="font-bold block">
                        {isAr ? 'تنبيه: خادم الإرسال الحقيقي غير مهيأ بعد!' : 'Notice: Real email delivery server not yet connected!'}
                      </span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        {isAr 
                          ? 'لتصل رسائل ونشرات المنصة مباشرة إلى صناديق بريد المشتركين الحقيقية (Gmail و Yahoo و Outlook)، يرجى ربط حساب Gmail (عبر كلمة مرور التطبيقات المجانية) أو مفتاح Brevo المجاني في الإعدادات.'
                          : 'To deliver broadcast emails to real subscriber inboxes, connect a Gmail App Password or free Brevo API key in Email Settings.'}
                      </p>
                    </div>
                  </div>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{isAr ? 'ضبط الخادم الآن' : 'Settings'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Campaign Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'نوع المنشور أو الإشعار البريدي:' : 'Notification Type:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'article', label: isAr ? 'إشعار مقال / بحث منشور' : 'New Article', icon: FileText, desc: isAr ? 'إعلام المشتركين ببحث جديد' : 'New publication alert' },
                    { id: 'product', label: isAr ? 'إشعار عرض أو منتج جديد' : 'Store Deal / Offer', icon: ShoppingBag, desc: isAr ? 'تخفيضات ومنتجات المتجر' : 'Store deals & products' },
                    { id: 'welcome', label: isAr ? 'رسالة ترحيب وعرض شامل' : 'Welcome & Perks', icon: Sparkles, desc: isAr ? 'تأكيد اشتراك وعروض' : 'Welcome confirmation' },
                    { id: 'custom', label: isAr ? 'بيان ونشرة مخصصة' : 'Custom Broadcast', icon: Layers, desc: isAr ? 'رسالة حرة ببيان رسمي' : 'Custom announcement' }
                  ].map((t) => {
                    const active = campaignType === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCampaignType(t.id as any)}
                        className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                          active
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Preset Picker for Articles or Products */}
              {campaignType === 'article' && availableArticles.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{isAr ? 'اختر مقالاً منشوراً لتعبئة البيانات تلقائياً:' : 'Select published article to auto-fill:'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{availableArticles.length} {isAr ? 'مقال متوفر' : 'articles'}</span>
                  </label>
                  <select
                    value={selectedArticleId}
                    onChange={(e) => handleSelectArticle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="">{isAr ? '-- اختر مقالاً منشوراً من القائمة --' : '-- Choose article --'}</option>
                    {availableArticles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titleAr || a.titleEn} ({a.category || 'عام'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {campaignType === 'product' && availableProducts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{isAr ? 'اختر منتجاً أو عرضاً من المتجر لتعبئة البيانات تلقائياً:' : 'Select store product/deal to auto-fill:'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{availableProducts.length} {isAr ? 'منتج متوفر' : 'products'}</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="">{isAr ? '-- اختر منتجاً أو عرضاً من المتجر --' : '-- Choose product/offer --'}</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameAr || p.nameEn} — {p.price} {p.currency || 'EGP'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject & Headline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'موضوع الرسالة (Email Subject):' : 'Email Subject:'}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder={isAr ? 'عنوان البريد كما يظهر في صندوق الوارد...' : 'Subject in inbox...'}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'شارة المنشور (Badge):' : 'Post Badge:'}
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder={isAr ? 'مثال: مقال وبحث جديد منشور' : 'e.g. New Research Published'}
                  />
                </div>
              </div>

              {/* Headline & Subheadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'العنوان البارز في البريد (Headline):' : 'Email Main Headline:'}
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'العنوان الفرعي (Subheadline):' : 'Subheadline:'}
                  </label>
                  <input
                    type="text"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Pricing (for products) */}
              {campaignType === 'product' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                  <div>
                    <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                      {isAr ? 'سعر العرض للمشتركين:' : 'Special Offer Price:'}
                    </label>
                    <input
                      type="text"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="500 EGP"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {isAr ? 'السعر الأصلي (قبل الخصم):' : 'Original Price (Crossed Out):'}
                    </label>
                    <input
                      type="text"
                      value={productOriginalPrice}
                      onChange={(e) => setProductOriginalPrice(e.target.value)}
                      placeholder="750 EGP"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Main Paragraphs */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? 'نص ومحتوى الرسالة (Main Content):' : 'Email Content Body:'}
                  <span className="text-[10px] text-slate-400 font-normal ms-2">
                    {isAr ? '(افصل بين الفقرات بأسطر فارغة)' : '(Separate paragraphs with blank lines)'}
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={paragraphsText}
                  onChange={(e) => setParagraphsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Call to Action Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'نص زر الإجراء (CTA Button Text):' : 'Button Text:'}
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'رابط الزر (Target URL):' : 'Button URL:'}
                  </label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Recipient Audience Target */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isAr ? 'الجمهور المستهدف للإرسال:' : 'Recipient Target:'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    recipientTarget === 'all'
                      ? 'border-emerald-500 bg-white dark:bg-slate-850 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="recipientTarget"
                      checked={recipientTarget === 'all'}
                      onChange={() => setRecipientTarget('all')}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isAr ? 'جميع المشتركين النشطين' : 'All Active Subscribers'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr ? `إرسال إلى كافة الـ (${activeSubscribers.length}) مشتركين المسجلين` : `Dispatch to all ${activeSubscribers.length} subscribers`}
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    recipientTarget === 'test'
                      ? 'border-emerald-500 bg-white dark:bg-slate-850 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="recipientTarget"
                      checked={recipientTarget === 'test'}
                      onChange={() => setRecipientTarget('test')}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isAr ? 'بريد تجريبي محدد (Test Email)' : 'Specific Test Email'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isAr ? 'إرسال لبريدك الشخصي فقط للتأكد والمعاينة' : 'Send only to your email to verify'}
                      </div>
                    </div>
                  </label>
                </div>

                {recipientTarget === 'test' && (
                  <div className="pt-2 animate-in fade-in space-y-1.5">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                      required
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAr 
                        ? 'أدخل أي عنوان بريد إلكتروني تجريبي (مثال: example@domain.com) لإرسال ومعاينة الرسالة.' 
                        : 'Enter any test email address (e.g. example@domain.com) to preview the message.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Preview Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{isAr ? 'المعاينة الحية لبريدك الإلكتروني كما سيصل إلى صناديق Gmail و Yahoo و Outlook:' : 'Live email preview as rendered in subscriber inboxes:'}</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {subject}
                </span>
              </div>

              {/* Rendered HTML inside interactive container */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 sm:p-4">
                <iframe
                  title="Email Live Preview"
                  srcDoc={renderedHtml}
                  className="w-full h-[500px] border-0 rounded-xl bg-white shadow-md"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {recipientTarget === 'all' ? (
              <span>
                {isAr ? `سيتم إرسال هذا البريد إلى ` : `Will be dispatched to `}
                <strong className="text-emerald-600 dark:text-emerald-400">{activeSubscribers.length}</strong>
                {isAr ? ` مشتركاً مسجلاً في النشرة.` : ` active subscribers.`}
              </span>
            ) : (
              <span>
                {isAr ? `سيتم إرسال بريد تجريبي إلى: ` : `Will be dispatched to test email: `}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{testEmail}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={handleSendBroadcast}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جاري الإرسال للمشتركين...' : 'Sending broadcast...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {recipientTarget === 'test'
                      ? (isAr ? 'إرسال بريد الاختبار الآن' : 'Send Test Email Now')
                      : (isAr ? `إرسال الحملة لـ (${activeSubscribers.length}) مشترك الآن` : `Dispatch to (${activeSubscribers.length}) Now`)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
