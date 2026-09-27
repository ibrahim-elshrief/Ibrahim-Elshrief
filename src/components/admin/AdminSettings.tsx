import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  CheckCircle2, 
  Globe, 
  Share2, 
  Search, 
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Coins,
  Image as ImageIcon,
  UserCheck,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Send,
  Bot,
  SlidersHorizontal,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Palette,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SiteSettings } from '../../types';
import { db, cleanFirestorePayload, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ARAB_AND_USD_CURRENCIES, formatPrice } from '../../utils/currencies';
import { ImageUploadField } from './ImageUploadField';
import { AdminTabAndFaviconSettings } from './AdminTabAndFaviconSettings';
import { sendTelegramMessage } from '../../utils/telegramService';

interface AdminSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (s: SiteSettings) => void;
  onNavigateTab?: (tab: any) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab
}) => {
  const { language } = useLanguage();
  const { adminCredentials, updateAdminCredentials } = useAuth();
  
  const [formData, setFormData] = useState<SiteSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = cleanFirestorePayload(formData);
      await setDoc(doc(db, 'siteSettings', 'global'), payload, { merge: true });
      onUpdateSettings(formData);
      setFeedback({
        type: 'success',
        message: language === 'ar' ? 'تم حفظ كافة إعدادات المنصة والعملة بنجاح!' : 'Platform, currency & identity settings saved successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'siteSettings/global');
        } catch {
          // Logged error
        }
      }
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  const handleTestTelegram = async () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) {
      setFeedback({
        type: 'error',
        message: language === 'ar' 
          ? 'يرجى إدخال رمز البوت (Bot Token) ومعرّف المحادثة (Chat ID) أولاً.' 
          : 'Please enter Bot Token and Chat ID first.'
      });
      return;
    }

    setIsTestingTelegram(true);
    try {
      const text = `🔔 <b>اختبار ربط منصة المؤلف والباحث مع تيليجرام</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ تم الاتصال بنجاح بين لوحة التحكم وحسابك على تيليجرام!\n` +
        `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n` +
        `🕒 الوقت: ${new Date().toLocaleTimeString('ar-EG')}\n` +
        `✨ ستصلك الآن الإشعارات والتقارير اليومية إلى هذه المحادثة.`;

      const res = await sendTelegramMessage(formData.telegramBotToken, formData.telegramChatId, text);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: language === 'ar' 
            ? 'تم إرسال رسالة الاختبار بنجاح إلى حسابك على تيليجرام!' 
            : 'Test message sent successfully to your Telegram chat!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'فشل الاتصال بتيليجرام'
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إعدادات المنصة والهوية والسيو والعملة' : 'Platform Identity, SEO, Currency & Settings'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'ar' 
              ? 'تعديل اسم الهوية، الصورة الشخصية، المسمى في الهيدر، اختيار العملة، وبيانات السيو والتواصل.' 
              : 'Configure brand identity, profile portrait, header subtitle, currency, SEO, and contact data.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          {feedback?.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : feedback?.type === 'success' ? (language === 'ar' ? 'تم الحفظ!' : 'Saved!') : (language === 'ar' ? 'حفظ كافة الإعدادات' : 'Save All Settings')}</span>
        </button>
      </div>

      {/* Dedicated Security Hub Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'قسم الأمان وتسجيل الدخول وقنوات المالك المستقلة' : 'Security, Redundant Channels & Owner Login Hub'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                {language === 'ar' ? 'مستقل وجديد' : 'Dedicated'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {language === 'ar' 
                ? 'تم تخصيص قسم متكامل لإدارة قنوات المالك (الهواتف وربط تيليجرام)، وبوت الدخول، وبيانات المشرف، ومسار استعادة الحساب.' 
                : 'Manage owner emergency phones linked to Telegram, 2FA bot, master credentials, and recovery flow.'}
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('security')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <span>{language === 'ar' ? 'الانتقال إلى قسم الأمان والحسابات' : 'Go to Security & Auth Hub'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* Payment Gateways Hub Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'طرق وبوابات الدفع (كاش، Airtm، بايبال، وطرق مخصصة)' : 'Payment Gateways & Transfer Settings (Cash, Airtm, PayPal)'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                {language === 'ar' ? 'معتمد' : 'Verified'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {language === 'ar' 
                ? 'إدارة وضبط أرقام كاش، حساب Airtm، بريد بايبال، وسعر الصرف دون أي تخزين في ملفات الموقع.' 
                : 'Configure cash wallet numbers, Airtm accounts, PayPal, and custom payment methods.'}
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <span>{language === 'ar' ? 'إدارة طرق الدفع' : 'Manage Payment Gateways'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* Floating Quick Connect Hub Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'أزرار التواصل المباشر العائمة (بوت/زر عائم في زوايا الموقع)' : 'Floating Direct Quick Connect (Speed Dial / Bot)'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                {language === 'ar' ? 'مباشر وفوري' : 'Live'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {language === 'ar' 
                ? 'تسجيل شات وجروب تيليجرام، رقم واتساب، فيسبوك، مع اختيار زاوية الظهور (تحت يمين/شمال أو فوق يمين/شمال) وتحديد الوسيلة الرئيسية الظاهرة أولاً.' 
                : 'Configure WhatsApp, Telegram chat/group, Facebook, with corner positioning & primary upfront channel.'}
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('quickConnect')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <span>{language === 'ar' ? 'ضبط أزرار التواصل العائمة' : 'Configure Floating Connect'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* Content & Visual CMS Callout Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-600 text-white shadow-sm shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'إدارة الهوية البصرية، الصورة الشخصية، قنوات التواصل، والفوتر (CMS)' : 'Visual CMS: Identity, Portrait, Channels & Footer'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                {language === 'ar' ? 'المركز الشامل' : 'Comprehensive'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {language === 'ar' 
                ? 'تم توحيد الصورة الشخصية، بطاقات الواجهة، قنوات التواصل والمتابعة الموسعة، وتخصيص الفوتر بالكامل في قسم (المحتوى والهوية CMS).' 
                : 'All portrait upload, hero badges, custom social channels, and footer controls are consolidated in CMS.'}
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('cms')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <span>{language === 'ar' ? 'الانتقال إلى المحتوى والهوية (CMS)' : 'Go to Content CMS'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* 2. Currency Selection (اختيار العملة بكل عملات الدول العربية للمالك) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'اختيار عملة المنصة والمتجر (جميع الدول العربية)' : 'Platform & Store Currency (All Arab Currencies)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'اختر العملة الرسمية للموقع والمتجر من بين كافة عملات الدول العربية أو الدولار الأمريكي. تنعكس العملة فورياً على جميع المنتجات والطلبات والسلة.' 
                  : 'Select your preferred official store currency across all 22 Arab countries or USD. Instantly updates store prices, cart, checkout, and invoices.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            <div className="md:col-span-8 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'العملة النشطة للمنصة' : 'Active Store Currency'}
              </label>
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                {ARAB_AND_USD_CURRENCIES.map((c) => {
                  const label = language === 'ar' 
                    ? `${c.nameAr} (${c.code} - ${c.symbolAr}) • ${c.countryAr}` 
                    : `${c.nameEn} (${c.code} - ${c.symbolEn}) • ${c.countryEn}`;
                  return (
                    <option key={c.code} value={c.code}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Price Preview Pill */}
            <div className="md:col-span-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {language === 'ar' ? 'معاينة ظهور السعر' : 'Live Price Preview'}
              </span>
              <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatPrice(250, formData.currency || 'USD', language)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formData.currency || 'USD'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Hero & Profile Avatar Image (صورة الصفحة الرئيسية والشخصية المباشرة من جهازك) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'صورة الصفحة الرئيسية والشخصية (رفع مباشر من جهازك)' : 'Hero & Profile Portrait Image (Direct Upload)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'ارفع صورتك الشخصية مباشرة من جهاز الكمبيوتر أو الهاتف مع ضغط تلقائي وحفظ آمن.' 
                  : 'Upload your photo directly from your device with automatic high-quality optimization.'}
              </p>
            </div>
          </div>

          <ImageUploadField
            value={formData.avatarUrl || ''}
            onChange={(val) => setFormData({ ...formData, avatarUrl: val })}
            labelAr="الصورة الشخصية وصورة واجهة المنصة"
            labelEn="Portrait & Hero Section Visual"
            hintAr="اسحب الصورة هنا أو اضغط للاختيار من ملفات جهازك مباشرة. يتم ضغط الصورة لتناسب قواعد البيانات."
            hintEn="Drag & drop your photo or click to browse files from your machine."
          />
        </div>

        {/* 4. Brand, Header Subtitle & Job Title (المسمى الوظيفي تحت اسمي في الهيدر والاسم) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'الهوية الشخصية والمسمى الوظيفي في الهيدر' : 'Brand Identity & Header Subtitle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'تعديل اسمك أو علامتك التجارية والمسمى الوظيفي الذي يظهر تحته مباشرة في شريط التنقل العلوي (Header).' 
                  : 'Manage your name or brand title and the subtitle displayed under your name in the sticky navigation header.'}
              </p>
            </div>
          </div>

          {/* Name in Arabic and English */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'اسم المنصة / الاسم الشخصي (بالعربية)' : 'Brand / Full Name (Arabic)'}
              </label>
              <input
                type="text"
                required
                dir="rtl"
                value={formData.brandNameAr || ''}
                onChange={(e) => setFormData({ ...formData, brandNameAr: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'اسم المنصة / الاسم الشخصي (بالإنجليزية)' : 'Brand / Full Name (English)'}
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={formData.brandNameEn || ''}
                onChange={(e) => setFormData({ ...formData, brandNameEn: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          {/* Header Subtitle (المسمى الوظيفي تحت اسمي في الهيدر مع خيار إخفائه وتوسيط الاسم) */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/80">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {language === 'ar' ? 'إظهار المسمى الوظيفي تحت اسم المالك في الهيدر' : 'Show Job Title Under Name in Header'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ar' 
                    ? 'عند إيقاف هذا الخيار، يتم إخفاء المسمى الوظيفي وتوسيط اسم المالك عمودياً تلقائياً داخل الهيدر' 
                    : 'When disabled, the job title is hidden and the owner brand name is automatically centered vertically'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.showJobTitleInHeader !== false && formData.sectionVisibility?.showJobTitleInHeader !== false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setFormData({
                      ...formData,
                      showJobTitleInHeader: val,
                      sectionVisibility: {
                        ...(formData.sectionVisibility || {}),
                        showJobTitleInHeader: val,
                      }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {language === 'ar' ? 'المسمى الوظيفي تحت اسمي في الهيدر (بالعربية)' : 'Job Title Under Name in Header (Arabic)'}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder={language === 'ar' ? 'مثال: كاتب وباحث ومفكر' : 'e.g. Author, Scholar & Researcher'}
                  value={formData.headerSubtitleAr || ''}
                  onChange={(e) => setFormData({ ...formData, headerSubtitleAr: e.target.value })}
                  disabled={formData.showJobTitleInHeader === false || formData.sectionVisibility?.showJobTitleInHeader === false}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {language === 'ar' ? 'المسمى الوظيفي تحت اسمي في الهيدر (بالإنجليزية)' : 'Job Title Under Name in Header (English)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Author, Scholar & Documentary Creator"
                  value={formData.headerSubtitleEn || ''}
                  onChange={(e) => setFormData({ ...formData, headerSubtitleEn: e.target.value })}
                  disabled={formData.showJobTitleInHeader === false || formData.sectionVisibility?.showJobTitleInHeader === false}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Main Professional Headline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'المسمى المهني الرئيسي في واجهة الصفحة (بالعربية)' : 'Hero Main Headline (Arabic)'}
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.titleAr || ''}
                onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'المسمى المهني الرئيسي في واجهة الصفحة (بالإنجليزية)' : 'Hero Main Headline (English)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={formData.titleEn || ''}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 4.5. Browser Tab Title & Website Favicon (اسم التاب في المتصفح وأيقونة الموقع) */}
        <AdminTabAndFaviconSettings 
          formData={formData} 
          setFormData={setFormData} 
        />

        {/* 4.8. Newsletter & Subscribers Section Customization (تخصيص نصوص النشرة الفكرية والبريدية) */}
        <div id="newsletter-settings-card" className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{language === 'ar' ? 'تخصيص نصوص النشرة الفكرية وقسم المشتركين' : 'Newsletter & Subscribers Section Texts'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                    {language === 'ar' ? 'تحكم كامل' : 'Full Control'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' 
                    ? 'التحكم في النص الأخضر (الوسام / الشارة)، العنوان الرئيسي، الوصف، نص الحقل والزر، وعبارة الخصوصية.' 
                    : 'Customize green pill badge, main headline, description, input placeholder, subscribe button, and privacy note.'}
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('subscribers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                <span>{language === 'ar' ? 'إدارة المشتركين وحملات البريد' : 'Manage Subscribers'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>

          {/* 1. Green Badge Text (النص الأخضر) */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'النص الأخضر (الوسام / الشارة العلوية)' : 'Green Pill Badge Text'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'النص الأخضر بالعربية' : 'Green Badge (Arabic)'}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: إصدارات ومحتوى دوري"
                  value={formData.newsletterBadgeAr ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterBadgeAr: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'النص الأخضر بالإنجليزية' : 'Green Badge (English)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Curated Publications"
                  value={formData.newsletterBadgeEn ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterBadgeEn: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Headline & Subtitle */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'العنوان الرئيسي للنشرة (بالعربية)' : 'Newsletter Headline (Arabic)'}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: المشتركون والنشرة الفكرية"
                  value={formData.newsletterTitleAr ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterTitleAr: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'العنوان الرئيسي للنشرة (بالإنجليزية)' : 'Newsletter Headline (English)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Subscribers & Curated Newsletter"
                  value={formData.newsletterTitleEn ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterTitleEn: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'الوصف التوضيحي للنشرة (بالعربية)' : 'Newsletter Subtitle (Arabic)'}
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  placeholder="مثال: أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك."
                  value={formData.newsletterSubAr ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterSubAr: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'الوصف التوضيحي للنشرة (بالإنجليزية)' : 'Newsletter Subtitle (English)'}
                </label>
                <textarea
                  rows={2}
                  dir="ltr"
                  placeholder="e.g. Latest publications, research studies, audio-visual works, and curated releases."
                  value={formData.newsletterSubEn ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterSubEn: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'نص زر الاشتراك' : 'Subscribe Button Text'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: اشتراك"
                  value={formData.newsletterButtonAr ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterButtonAr: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'عبارة الخصوصية والضمان' : 'Privacy & Guarantee Note'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: خصوصية تامة، بدون رسائل مزعجة، وإمكانية إلغاء الاشتراك في أي وقت."
                  value={formData.newsletterPrivacyAr ?? ''}
                  onChange={(e) => setFormData({ ...formData, newsletterPrivacyAr: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'ar' ? 'معاينة حية لشكل قسم النشرة في الصفحة الرئيسية' : 'Live Preview as Seen on Home Page'}
            </span>
            <div className="p-4 rounded-xl bg-[#111216] border border-neutral-800 space-y-2.5 text-start">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-50 dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {language === 'ar' 
                    ? (formData.newsletterBadgeAr || 'إصدارات ومحتوى دوري')
                    : (formData.newsletterBadgeEn || 'Curated Publications')}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white">
                {language === 'ar'
                  ? (formData.newsletterTitleAr || 'المشتركون والنشرة الفكرية')
                  : (formData.newsletterTitleEn || 'Subscribers & Curated Newsletter')}
              </h4>
              <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                {language === 'ar'
                  ? (formData.newsletterSubAr || 'أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك.')
                  : (formData.newsletterSubEn || 'Latest publications, research studies, audio-visual works, and curated releases.')}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Contact Coordinates & Location */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'معلومات التواصل والمقر الجغرافي' : 'Contact Coordinates & Location'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'بيانات التواصل الرسمي المعروضة للعملاء ونطاق تقديم الخدمات.' 
                  : 'Official contact details and geographic operational scope.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'البريد الإلكتروني الرسمي' : 'Contact Email'}
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail || ''}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'رقم الهاتف / الواتساب' : 'Telephone / WhatsApp'}
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+20 100 000 0000"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'الموقع الجغرافي (بالعربية)' : 'Location (Arabic)'}
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.locationAr || ''}
                onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: القاهرة / العمل عن بعد' : 'Cairo / Remote'}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 6. Consolidated Notice: Advanced Social Channels & Profiles */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-blue-500/10 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-600 text-white shadow-sm shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'شبكات وقنوات التواصل والمتابعة الثقافية (الموسعة)' : 'Social & Cultural Publishing Channels'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                  {language === 'ar' ? 'قسم متكامل في CMS' : 'Centralized in CMS'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {language === 'ar' 
                  ? 'تم توحيد إدارة كافة قنوات التواصل (يوتيوب، إكس، جودريدز للكتب، البودكاست، تيليجرام، وغيرها) مع إمكانية إضافة عدد غير محدود من المنصات داخل قسم (المحتوى والهوية CMS).' 
                  : 'Manage all custom social links (YouTube, X, Goodreads, Podcasts, Telegram) with unlimited platforms in CMS.'}
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('cms')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <span>{language === 'ar' ? 'فتح قنوات التواصل في CMS' : 'Open Channels in CMS'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>

        {/* 7. SEO Meta Tags */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'إعدادات محركات البحث والكلمات المفتاحية (SEO)' : 'Search Engine Optimization (SEO)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'العنوان والوصف الذي يظهر في نتائج بحث Google ومواقع التواصل عند مشاركة الرابط.' 
                  : 'Metadata displayed in Google search index and social sharing previews.'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'عنوان الصفحة الرئيسي في محركات البحث (SEO Title)' : 'SEO Meta Title'}
              </label>
              <input
                type="text"
                value={formData.seoTitle || ''}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'الوصف التعريفي لمحركات البحث (SEO Description)' : 'SEO Meta Description'}
              </label>
              <textarea
                rows={2}
                value={formData.seoDescription || ''}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 8. Footer Elements Visibility & Controls (تخصيص ظهور عناصر الفوتر وأزرار التواصل) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'تخصيص عناصر الفوتر وأزرار التواصل' : 'Footer Elements & Direct Contact Controls'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  {language === 'ar' ? 'التحكم بالفوتر' : 'Footer Settings'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'تحكم كامل في إظهار أو إخفاء أي عنصر في فوتر الموقع (أيقونات التواصل السريعة، زر التواصل المباشر، النشرة البريدية، روابط الفوتر، وشريط الحقوق).' 
                  : 'Toggle visibility of individual footer components including social icons, direct contact buttons, newsletter box, and navigation.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-700 dark:text-slate-200">
              {language === 'ar' 
                ? 'تم توحيد التحكم في ظهور عناصر الفوتر (الأيقونات، النشرة البريدية، شريط الحقوق، وزر الصعود) وتعديل نصوص وحقوق الفوتر بالكامل في قسم (المحتوى والهوية CMS -> تذييل الصفحة).' 
                : 'Footer toggles and texts are fully consolidated in CMS -> Footer Tab.'}
            </p>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('cms')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
              >
                <span>{language === 'ar' ? 'فتح إعدادات الفوتر في CMS' : 'Open Footer in CMS'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>

        {/* 9. Telegram Bot Integration & Daily Digest (ربط تيليجرام والملخص اليومي للمالك) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{language === 'ar' ? 'ربط تيليجرام والملخص اليومي التلقائي' : 'Telegram Bot & Automated Daily Digest'}</span>
                  {formData.telegramBotToken && formData.telegramChatId ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {language === 'ar' ? 'متصل' : 'Connected'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {language === 'ar' ? 'غير مهيأ' : 'Not configured'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' 
                    ? 'اربط حساب التيليجرام الخاص بك لاستلام تقرير مسائي تلقائي منسق بالأيقونات، وإرسال ملخص فوري عند الضغط على الزر في لوحة التحكم.' 
                    : 'Connect your Telegram Bot to receive automated daily summaries with emojis and instant trigger reports.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'رمز البوت (Telegram Bot Token)' : 'Telegram Bot Token'}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="123456789:ABCdefGHIjklMNOpqr..."
                value={formData.telegramBotToken || ''}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'احصل عليه من @BotFather على تيليجرام مجاناً' : 'Get for free from @BotFather on Telegram'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'معرّف المحادثة الخاص بك (Chat ID)' : 'Telegram Chat ID'}
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="e.g. 123456789 or -100..."
                value={formData.telegramChatId || ''}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'احصل على المعرف الخاص بك من @userinfobot على تيليجرام' : 'Get your chat ID from @userinfobot on Telegram'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.telegramDailyDigestEnabled ?? true}
                onChange={(e) => setFormData({ ...formData, telegramDailyDigestEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {language === 'ar' ? 'تفعيل إرسال التقرير اليومي المسائي تلقائياً' : 'Enable Automated Evening Daily Digest'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {language === 'ar' ? 'يقوم النظام بجدولة وتنسيق تقرير ليلى شامل بكافة العمليات اليومية' : 'System sends a comprehensive night digest with sales and inquiries'}
                </span>
              </div>
            </label>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !formData.telegramBotToken || !formData.telegramChatId}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTestingTelegram ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال رسالة تجريبية الآن' : 'Test Send Now')}</span>
            </button>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (language === 'ar' ? 'جارٍ حفظ الإعدادات...' : 'Saving Configurations...') : (language === 'ar' ? 'حفظ ونشر جميع الإعدادات' : 'Save All Settings')}</span>
          </button>
        </div>

      </form>

    </div>
  );
};

