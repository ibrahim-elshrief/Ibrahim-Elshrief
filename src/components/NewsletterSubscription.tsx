import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Sparkles, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { db, cleanFirestorePayload } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { SiteSettings, HomeSectionItem } from '../types';
import { sendWelcomeSubscriberEmail } from '../utils/emailService';

interface NewsletterSubscriptionProps {
  className?: string;
  variant?: 'card' | 'inline' | 'minimal';
  settings?: SiteSettings;
  sectionConfig?: HomeSectionItem;
}

export const NewsletterSubscription: React.FC<NewsletterSubscriptionProps> = ({ 
  className = '',
  variant = 'card',
  settings,
  sectionConfig
}) => {
  const { language, direction, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  const sectionBadge = (language === 'ar' 
    ? (settings?.newsletterBadgeAr || sectionConfig?.badgeAr)
    : (settings?.newsletterBadgeEn || sectionConfig?.badgeEn)) 
    || t('newsletter.badge');

  const sectionTitle = (language === 'ar'
    ? (settings?.newsletterTitleAr || sectionConfig?.titleAr)
    : (settings?.newsletterTitleEn || sectionConfig?.titleEn))
    || t('newsletter.title');

  const sectionSubtitle = (language === 'ar'
    ? (settings?.newsletterSubAr || sectionConfig?.subtitleAr)
    : (settings?.newsletterSubEn || sectionConfig?.subtitleEn))
    || t('newsletter.subtitle');

  const privacyText = (language === 'ar'
    ? settings?.newsletterPrivacyAr
    : settings?.newsletterPrivacyEn)
    || (language === 'ar' ? 'خصوصية تامة، بدون رسائل مزعجة، وإمكانية إلغاء الاشتراك في أي وقت.' : 'Strict privacy, zero spam, and unsubscribe anytime.');

  const placeholderText = (language === 'ar'
    ? settings?.newsletterPlaceholderAr
    : settings?.newsletterPlaceholderEn)
    || t('newsletter.placeholder');

  const buttonText = (language === 'ar'
    ? settings?.newsletterButtonAr
    : settings?.newsletterButtonEn)
    || t('newsletter.button');

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const verifySubscription = async () => {
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem('newsletter_subscriber');
        if (existing) {
          try {
            const docId = existing.trim().toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '_');
            const snap = await getDoc(doc(db, 'subscribers', docId));
            if (snap.exists() && snap.data()?.status === 'active') {
              setSavedEmail(existing);
              setStatus('already');
            } else {
              // Subscriber was deleted from Firestore admin, so clear local memory!
              localStorage.removeItem('newsletter_subscriber');
              setSavedEmail(null);
              setStatus('idle');
            }
          } catch {
            setSavedEmail(existing);
            setStatus('already');
          }
        }
      }
    };
    verifySubscription();
  }, []);

  const validateEmail = (val: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please provide an email address.');
      setStatus('error');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMessage(language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email format.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Safe alphanumeric docId to ensure robust Firestore compatibility
      const docId = cleanEmail.replace(/[^a-zA-Z0-9._-]/g, '_');
      const subscriberRef = doc(db, 'subscribers', docId);

      // Check if already subscribed in DB
      try {
        const snap = await getDoc(subscriberRef);
        if (snap.exists() && snap.data()?.status === 'active') {
          localStorage.setItem('newsletter_subscriber', cleanEmail);
          setSavedEmail(cleanEmail);
          setStatus('already');
          return;
        }
      } catch (checkErr) {
        console.warn('Subscription existence check skipped:', checkErr);
      }

      const payload = cleanFirestorePayload({
        id: docId,
        email: cleanEmail,
        language,
        subscribedAt: new Date().toISOString(),
        status: 'active',
        source: 'footer_newsletter'
      });

      await setDoc(subscriberRef, payload, { merge: true });

      // Automatically dispatch official welcome & confirmation email with latest publications and store offers!
      try {
        sendWelcomeSubscriberEmail(cleanEmail, language as 'ar' | 'en', settings).catch((mailErr) => {
          console.warn('Welcome email background dispatch notice:', mailErr);
        });
      } catch (e) {
        console.warn('Welcome email trigger error:', e);
      }

      localStorage.setItem('newsletter_subscriber', cleanEmail);
      setSavedEmail(cleanEmail);
      setStatus('success');
      setEmail('');
    } catch (err: any) {
      console.error('Newsletter subscription storage error:', err);
      setErrorMessage(
        language === 'ar' 
          ? 'تعذر حفظ الاشتراك في قاعدة البيانات، يرجى المحاولة لاحقاً.' 
          : 'Failed to record subscription. Please try again.'
      );
      setStatus('error');
    }
  };

  return (
    <div 
      className={`rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] p-6 sm:p-8 relative overflow-hidden transition-all shadow-xs text-start ${className}`}
    >
      <div className="relative z-10 space-y-4">
        {/* Badge & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-semibold tracking-wider uppercase bg-emerald-50 dark:bg-neutral-900 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{sectionBadge}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {sectionTitle}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-xl leading-relaxed">
            {sectionSubtitle}
          </p>
        </div>

        {/* Subscription Form or State */}
        {status === 'success' ? (
          <div className="space-y-3 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">{t('newsletter.success')}</p>
                <p className="text-emerald-800 dark:text-emerald-300 text-xs">
                  {language === 'ar' ? 'تم تسجيل بريدك الإلكتروني بنجاح في قاعدة بيانات المشتركين وإرسال رسالة ترحيبية رسمية:' : 'Your email has been recorded successfully and a welcome confirmation was dispatched:'}
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <p className="text-emerald-700 dark:text-emerald-300 font-mono text-xs bg-white dark:bg-neutral-900 px-2.5 py-1 rounded-lg inline-block border border-emerald-200 dark:border-neutral-800">
                    {savedEmail}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                    <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'تفقّد صندوق الوارد (أو Spam)' : 'Check Inbox or Spam'}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/70 font-mono">
                {language === 'ar' ? 'تم إرسال بريد ترحيبي رسمي يحتوي على أحدث المقالات وعروض المتجر المتاحة.' : 'An official email was sent with latest publications and store offers.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setEmail('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                {language === 'ar' ? '+ تسجيل بريد إلكتروني آخر' : '+ Subscribe another email'}
              </button>
            </div>
          </div>
        ) : status === 'already' ? (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {t('newsletter.alreadySubscribed')} <strong className="font-mono text-emerald-700 dark:text-cyan-300">({savedEmail})</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setEmail('');
                  }}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-cyan-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'تسجيل بريد آخر' : 'Register another email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('newsletter_subscriber');
                    setSavedEmail(null);
                    setStatus('idle');
                    setEmail('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:text-white text-slate-600 dark:text-neutral-400 text-xs transition-colors cursor-pointer"
                  title={language === 'ar' ? 'مسح الحفظ على هذا المتصفح' : 'Clear subscription on this browser'}
                >
                  {language === 'ar' ? 'إلغاء الحفظ' : 'Clear'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={placeholderText}
                  className="w-full ps-10 pe-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all"
                  aria-label={placeholderText}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all disabled:opacity-50 dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 cursor-pointer"
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>{t('newsletter.subscribing')}</span>
                  </>
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-white/45">
              {privacyText}
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
