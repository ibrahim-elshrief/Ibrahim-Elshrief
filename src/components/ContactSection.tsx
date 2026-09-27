import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { db, cleanFirestorePayload } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { SiteSettings, ContactMessage, HomeSectionItem } from '../types';
import { sendContactMessageTelegramNotification } from '../utils/telegramService';

interface ContactSectionProps {
  settings: SiteSettings;
  prefilledSubject?: string;
  onMessageSent?: (message: ContactMessage) => void;
  sectionConfig?: HomeSectionItem;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ 
  settings, 
  prefilledSubject = '',
  onMessageSent,
  sectionConfig
}) => {
  const { language, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(prefilledSubject);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const location = language === 'ar' ? settings.locationAr : settings.locationEn;

  const sectionBadge = (language === 'ar' 
    ? (sectionConfig?.badgeAr || settings?.contactBadgeAr)
    : (sectionConfig?.badgeEn || settings?.contactBadgeEn)) 
    || (language === 'ar' ? 'قنوات الاتصال والتواصل' : 'Get in Touch');

  const sectionTitle = (language === 'ar'
    ? (sectionConfig?.titleAr || settings?.contactTitleAr)
    : (sectionConfig?.titleEn || settings?.contactTitleEn))
    || (language === 'ar' ? 'تواصل معنا' : 'Contact');

  const sectionSubtitle = (language === 'ar'
    ? (sectionConfig?.subtitleAr || settings?.contactSubAr)
    : (sectionConfig?.subtitleEn || settings?.contactSubEn))
    || (language === 'ar' 
      ? 'نسعد باستقبال رسائلكم واستفساراتكم في أي وقت.' 
      : 'Feel free to reach out with any inquiries or messages.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(language === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const nowIso = new Date().toISOString();
    const cleanSubject = subject.trim() || (language === 'ar' ? 'استفسار وتواصل مع المؤلف' : 'Direct Inquiry with the Author');

    const msgPayload: Omit<ContactMessage, 'id'> = {
      name: name.trim(),
      email: email.trim(),
      subject: cleanSubject,
      message: message.trim(),
      status: 'unread',
      tag: 'general',
      createdAt: nowIso
    };

    try {
      // 1. Generate new document reference and save with clean payload & merge: true
      const newMsgDocRef = doc(collection(db, 'messages'));
      const savedMessageId = newMsgDocRef.id;
      await setDoc(newMsgDocRef, cleanFirestorePayload(msgPayload), { merge: true });

      const fullMessage: ContactMessage = {
        id: savedMessageId,
        ...msgPayload
      };

      // 2. Create in-app operational notification in Firestore for admin bells & panels
      const notifData = {
        type: 'message' as const,
        titleAr: `رسالة تواصل واستفسار من ${name.trim()}`,
        titleEn: `Direct inquiry from ${name.trim()}`,
        descriptionAr: `الموضوع: ${cleanSubject} — "${message.trim().slice(0, 80)}"`,
        descriptionEn: `Subject: ${cleanSubject} — "${message.trim().slice(0, 80)}"`,
        timestamp: nowIso,
        read: false,
        linkTab: 'messages' as const,
        data: {
          messageId: savedMessageId,
          senderName: name.trim(),
          senderEmail: email.trim(),
          subject: cleanSubject,
          messageText: message.trim()
        }
      };

      try {
        const notifDocRef = doc(collection(db, 'notifications'));
        await setDoc(notifDocRef, cleanFirestorePayload(notifData), { merge: true });
      } catch (notifErr) {
        console.warn('Could not dispatch firestore notification document:', notifErr);
      }

      // Cache notification locally as fallback
      try {
        const storedNotifs = localStorage.getItem('app_notifications_sync');
        const parsedNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
        const fullNotif = { id: `notif_${Date.now()}`, ...notifData };
        localStorage.setItem('app_notifications_sync', JSON.stringify([fullNotif, ...parsedNotifs].slice(0, 50)));
      } catch (nErr) {
        console.warn('Local notification cache error:', nErr);
      }

      // 3. Dispatch real-time Telegram notification to author/owner if enabled
      try {
        if (settings?.telegramBotToken && settings?.telegramChatId) {
          sendContactMessageTelegramNotification(fullMessage, settings).catch((err) => {
            console.warn('Telegram contact notification dispatch error:', err);
          });
        }
      } catch (tgErr) {
        console.warn('Telegram trigger failed:', tgErr);
      }

      // 4. Update parent application state instantaneously and trigger global custom event
      if (onMessageSent) {
        onMessageSent(fullMessage);
      }

      try {
        window.dispatchEvent(new CustomEvent('app_new_message', { detail: fullMessage }));
      } catch (evErr) {
        // Ignore in non-window contexts
      }

      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to transmit message to Firestore:', err);
      setError(
        err?.message || 
        (language === 'ar' 
          ? 'تعذر إرسال الرسالة إلى قاعدة البيانات حالياً، يرجى المحاولة مرة أخرى.' 
          : 'Unable to send message at this time. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 sm:py-28 bg-white dark:bg-[#0e0f13] border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left / Coordinates Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {sectionBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {sectionTitle}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
                {sectionSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-[#13141a] border border-slate-200 dark:border-neutral-800 shadow-xs hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">Email</p>
                  <a href={`mailto:${settings.contactEmail}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                    {settings.contactEmail}
                  </a>
                </div>
              </div>

              {settings.phone && (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-[#13141a] border border-slate-200 dark:border-neutral-800 shadow-xs hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">Telephone / WhatsApp</p>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {settings.phone}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-[#13141a] border border-slate-200 dark:border-neutral-800 shadow-xs hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono font-medium">Headquarters</p>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {location}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Interactive Form Column */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 shadow-xs">
              
              {submitted ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'تم استلام رسالتك بنجاح!' : 'Inquiry Received!'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
                    {t('contact.success')}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'إرسال رسالة أخرى' : 'Send Another Note'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                        {t('contact.name')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={language === 'ar' ? 'الاسم بالكامل' : 'Full name'}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                        {t('contact.email')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                      {t('contact.subject')}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={language === 'ar' ? 'موضوع الرسالة أو الاستفسار' : 'Subject of message'}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                      {t('contact.message')} *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتب نص رسالتك هنا...' : 'Write your message here...'}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? t('contact.sending') : t('contact.send')}</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
