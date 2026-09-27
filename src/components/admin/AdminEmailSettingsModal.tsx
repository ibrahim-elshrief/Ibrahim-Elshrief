import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Check, 
  AlertCircle, 
  Send, 
  HelpCircle, 
  ShieldCheck, 
  Key, 
  Server, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { EmailSettings, EmailProviderType } from '../../types';
import { getStoredEmailSettings, saveStoredEmailSettings, sendEmail } from '../../utils/emailService';

interface AdminEmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export const AdminEmailSettingsModal: React.FC<AdminEmailSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [settings, setSettings] = useState<EmailSettings>({
    provider: 'gmail',
    senderName: 'المنصة الرسمية',
    senderEmail: '',
    replyToEmail: '',
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
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGoogleGuide, setShowGoogleGuide] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setTestResult(null);
      getStoredEmailSettings().then((s) => {
        setSettings(s);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await saveStoredEmailSettings(settings);
    setSaving(false);
    if (ok) {
      onSaved(isAr ? 'تم حفظ إعدادات مزود البريد بنجاح' : 'Email settings saved successfully');
      onClose();
    } else {
      setTestResult({
        success: false,
        message: isAr ? 'فشل حفظ الإعدادات، يرجى المحاولة مرة أخرى.' : 'Failed to save settings.'
      });
    }
  };

  const handleTestEmail = async () => {
    const cleanTarget = testEmailAddress.trim().toLowerCase();
    if (!cleanTarget || !cleanTarget.includes('@')) {
      setTestResult({
        success: false,
        message: isAr ? 'يرجى إدخال بريد إلكتروني صالح لاختبار الإرسال.' : 'Valid recipient email required.'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const subject = isAr 
        ? `[رسالة اختبار ناجحة] تحقق من ربط مزود البريد — ${settings.senderName}` 
        : `[Test Verification] Email Provider Connected — ${settings.senderName}`;

      const html = `
        <div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family: sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #059669; margin-top: 0;">✓ ${isAr ? 'تهانينا! تم ربط مزود البريد بنجاح' : 'Congratulations! Email Provider Connected'}</h2>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">
            ${isAr 
              ? 'هذه رسالة اختبار رسمية للتأكد من وصول رسائل المنصة إلى صندوق الوارد الخاص بك بنجاح (Gmail / Yahoo / Outlook).' 
              : 'This is a test email confirming platform emails reach your inbox successfully.'}
          </p>
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 16px 0; font-size: 13px;">
            <strong>${isAr ? 'المزود النشط:' : 'Active Provider:'}</strong> ${settings.provider.toUpperCase()}<br/>
            <strong>${isAr ? 'اسم المرسل:' : 'Sender Name:'}</strong> ${settings.senderName}<br/>
            <strong>${isAr ? 'بريد المرسل:' : 'Sender Email:'}</strong> ${settings.senderEmail}<br/>
            <strong>${isAr ? 'وقت الإرسال:' : 'Timestamp:'}</strong> ${new Date().toLocaleString()}
          </div>
          <p style="font-size: 12px; color: #64748b;">${isAr ? 'المنصة الرسمية المعتمدة' : 'Official Platform'}</p>
        </div>
      `;

      const res = await sendEmail({
        to: cleanTarget,
        subject,
        html,
        text: subject,
        settings,
        campaignInfo: {
          type: 'test',
          title: subject
        }
      });

      setTestResult({
        success: res.success,
        message: res.message || (isAr ? 'تم إرسال بريد التحقق بنجاح!' : 'Test email dispatched!')
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || (isAr ? 'حدث خطأ أثناء إرسال بريد الاختبار.' : 'Test send failed.')
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'إعدادات مزود إرسال البريد الإلكتروني' : 'Email Provider & SMTP Configuration'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr 
                  ? 'تهيئة خوادم الإرسال الحقيقي لضمان وصول الرسائل والنشرات لصناديق المشتركين (Gmail, Yahoo, Outlook).'
                  : 'Configure real delivery engines to dispatch emails directly to subscriber inboxes.'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>{isAr ? 'جاري تحميل الإعدادات...' : 'Loading settings...'}</span>
            </div>
          ) : (
            <>
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'طريقة وخادم إرسال البريد الإلكتروني (Provider):' : 'Email Delivery Method:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'gmail', label: 'Gmail (App Pass)', badge: 'شائع ومجاني' },
                    { id: 'brevo', label: 'Brevo API', badge: '300 مجاناً/يوم' },
                    { id: 'resend', label: 'Resend API', badge: 'سريع وحديث' },
                    { id: 'smtp', label: 'Custom SMTP', badge: 'خادم مخصص' }
                  ].map((p) => {
                    const active = settings.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const updated: Partial<EmailSettings> = { provider: p.id as EmailProviderType };
                          if (p.id === 'gmail') {
                            updated.smtpHost = 'smtp.gmail.com';
                            updated.smtpPort = 465;
                            updated.smtpSecure = true;
                          }
                          setSettings(prev => ({ ...prev, ...updated }));
                        }}
                        className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                          active 
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{p.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider-Specific Credentials */}
              {(settings.provider === 'gmail' || settings.provider === 'smtp') && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-emerald-500" />
                      <span>{settings.provider === 'gmail' ? (isAr ? 'بيانات حساب Gmail' : 'Gmail Credentials') : (isAr ? 'بيانات خادم SMTP' : 'SMTP Server Settings')}</span>
                    </span>

                    {settings.provider === 'gmail' && (
                      <button
                        type="button"
                        onClick={() => setShowGoogleGuide(!showGoogleGuide)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{isAr ? 'كيف أحصل على كلمة مرور التطبيقات؟' : 'How to get App Password?'}</span>
                      </button>
                    )}
                  </div>

                  {/* Google App Password Guide Dropdown */}
                  {showGoogleGuide && settings.provider === 'gmail' && (
                    <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">
                          {isAr ? 'خطوات إنشاء كلمة مرور التطبيقات (Google App Password) في 30 ثانية:' : 'Generate Google App Password in 30 seconds:'}
                        </p>
                        <a 
                          href="https://myaccount.google.com/apppasswords" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-colors"
                        >
                          <span>{isAr ? 'فتح صفحة كلمات المرور ↗' : 'Open App Passwords ↗'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <li>{isAr ? 'تأكد من تفعيل "التحقق بخطوتين" في حسابك على Google.' : 'Ensure "2-Step Verification" is ON in Google Security.'}</li>
                        <li>{isAr ? 'في صفحة كلمات مرور التطبيقات، اكتب اسماً للتطبيق (مثل: المنصة) ثم اضغط "إنشاء".' : 'Enter app name (e.g. Platform) and click "Create".'}</li>
                        <li>{isAr ? 'انسخ الرمز المكون من 16 حرفاً وضعه في خانة كلمة المرور أدناه (تُحذف المسافات تلقائياً).' : 'Copy the 16-character code and paste below (spaces trimmed automatically).'}</li>
                      </ol>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        {isAr ? 'عنوان البريد الإلكتروني (User Email)' : 'SMTP Username / Email'}
                      </label>
                      <input
                        type="email"
                        value={settings.smtpUser || ''}
                        onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                        placeholder="yourname@gmail.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        {isAr ? 'كلمة مرور التطبيقات (App Password)' : 'App Password'}
                      </label>
                      <input
                        type="password"
                        value={settings.smtpPass || ''}
                        onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value.replace(/\s+/g, '') })}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    {settings.provider === 'smtp' && (
                      <>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                            {isAr ? 'خادم المضيف (SMTP Host)' : 'SMTP Host'}
                          </label>
                          <input
                            type="text"
                            value={settings.smtpHost || ''}
                            onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                            placeholder="mail.example.com"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                            {isAr ? 'المنفذ (Port)' : 'SMTP Port'}
                          </label>
                          <input
                            type="number"
                            value={settings.smtpPort || 465}
                            onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {settings.provider === 'brevo' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-500" />
                      <span>{isAr ? 'مفتاح API الخاص بـ Brevo' : 'Brevo API Key'}</span>
                    </span>
                    <a
                      href="https://app.brevo.com/settings/keys/api"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{isAr ? 'الحصول على المفتاح مجاناً' : 'Get free API key'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={settings.brevoApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, brevoApiKey: e.target.value.trim() })}
                    placeholder="xkeysib-..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isAr ? 'شرط أساسي لنجاح Brevo:' : 'Crucial requirement for Brevo:'}</span>
                    </span>
                    <p className="leading-relaxed">
                      {isAr 
                        ? 'يجب كتابة نفس البريد الإلكتروني الذي سجلت به في حساب Brevo في خانة "بريد المرسل (From Email)" بالأسفل، لأن Brevo يرفض الإرسال إلا من عناوين مرسلين مؤكدة لديه.'
                        : 'The "From Email" field below must match your registered Brevo account email.'}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAr 
                      ? 'يوفر Brevo 300 رسالة يومياً مجاناً تماماً، ولا يتطلب تحققاً معقداً من النطاق.' 
                      : 'Brevo provides 300 free emails per day with zero setup.'}
                  </p>
                </div>
              )}

              {settings.provider === 'resend' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-emerald-500" />
                      <span>{isAr ? 'مفتاح API الخاص بـ Resend' : 'Resend API Key'}</span>
                    </span>
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{isAr ? 'إنشاء مفتاح في Resend' : 'Get Resend key'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={settings.resendApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value.trim() })}
                    placeholder="re_..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isAr ? 'ملاحظة مهمة لـ Resend:' : 'Important note for Resend:'}</span>
                    </span>
                    <p className="leading-relaxed">
                      {isAr 
                        ? 'في مرحلة التجربة دون توثيق نطاق خاص، يستخدم Resend تلقائياً عنوان onboarding@resend.dev للإرسال فقط لبريدك الشخصي المسجل لديهم. لتجاوز ذلك والإرسال للجميع بسهولة، يمكنك استخدام خيار Gmail (App Password).'
                        : 'For testing without a verified custom domain, Resend uses onboarding@resend.dev to send only to your registered account email.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Sender Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'اسم المرسل الرسمي (Sender Name):' : 'Official Sender Name:'}
                  </label>
                  <input
                    type="text"
                    value={settings.senderName}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    placeholder={isAr ? 'د. إبراهيم الشريف - المنصة الرسمية' : 'Official Platform'}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'بريد المرسل (From Email):' : 'From Email Address:'}
                  </label>
                  <input
                    type="email"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    placeholder="info@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Automation Switches */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'الأتمتة والإرسال التلقائي للمشتركين:' : 'Automated Dispatches:'}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoWelcomeEnabled ?? true}
                      onChange={(e) => setSettings({ ...settings, autoWelcomeEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span>{isAr ? 'إرسال بريد ترحيبي وتأكيد اشتراك تلقائياً بمجرد تسجيل أي زائر بريده في المنصة (يحتوي أحدث المنشورات والعروض).' : 'Send automatic welcome email with latest publications & deals upon subscription.'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoNewArticleNotify ?? true}
                      onChange={(e) => setSettings({ ...settings, autoNewArticleNotify: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span>{isAr ? 'إتاحة إشعار المشتركين فوراً بالبريد عند نشر أي مقال أو بحث جديد.' : 'Allow instant email alerts when new articles are published.'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoNewProductNotify ?? true}
                      onChange={(e) => setSettings({ ...settings, autoNewProductNotify: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span>{isAr ? 'إتاحة إشعار المشتركين فوراً بالبريد عند طرح أي منتج أو عرض وتخفيض جديد بالمتجر.' : 'Allow instant email alerts for new store products & deals.'}</span>
                  </label>
                </div>
              </div>

              {/* Instant Test Box */}
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اختبار الإرسال الفوري للبريد (Test Delivery)' : 'Test Email Dispatch'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    {isAr ? 'تأكد من وصول الرسالة إلى صندوق الوارد' : 'Verify inbox delivery'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="example@domain.com"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestEmail}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {testing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>{isAr ? 'إرسال بريد تجريبي الآن' : 'Send Test Email'}</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200'
                  }`}>
                    {testResult.success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ إعدادات البريد' : 'Save Settings'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
