import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  RotateCcw, 
  ShieldCheck, 
  KeyRound, 
  Loader2, 
  Copy, 
  Check, 
  Inbox,
  Lock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth, PRIMARY_OWNER_EMAIL } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from 'firebase/auth';

export const EmailAuthenticator: React.FC = () => {
  const { language } = useLanguage();
  const { 
    ownerChannels, 
    sendOwnerEmailLoginOtp, 
    verifyOwnerEmailLoginOtp 
  } = useAuth();

  const [selectedEmail, setSelectedEmail] = useState<string>(
    ownerChannels.registeredEmails?.[0] || PRIMARY_OWNER_EMAIL
  );
  const [customEmail, setCustomEmail] = useState<string>('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [manualOtp, setManualOtp] = useState('');
  const [sentOtpInfo, setSentOtpInfo] = useState<{ email: string; previewCode?: string; linkSent: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Check if current URL is a Firebase Email Sign-in link
  const [hasEmailLinkInUrl, setHasEmailLinkInUrl] = useState(false);

  useEffect(() => {
    try {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setHasEmailLinkInUrl(true);
      }
    } catch (e) {
      console.warn('URL check for email sign-in link:', e);
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const targetEmailToUse = (useCustomEmail ? customEmail : selectedEmail).trim().toLowerCase();

  // Handle sending Firebase magic link + backup OTP
  const handleSendEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSentOtpInfo(null);

    if (!targetEmailToUse || !targetEmailToUse.includes('@')) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى إدخال عنوان بريد إلكتروني صالح.' : 'Please enter a valid email address.'
      });
      return;
    }

    setIsLoading(true);
    let firebaseLinkSucceeded = false;

    // 1. Attempt to send real Firebase Auth passwordless sign-in link to Gmail
    try {
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname + '?emailAuth=true',
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, targetEmailToUse, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', targetEmailToUse);
      firebaseLinkSucceeded = true;
      console.log('Firebase Auth sendSignInLinkToEmail successful to:', targetEmailToUse);
    } catch (firebaseErr: any) {
      console.warn('Firebase sendSignInLinkToEmail encountered notice:', firebaseErr);
    }

    // 2. Also dispatch the 6-digit platform OTP & Telegram backup alert
    try {
      const res = await sendOwnerEmailLoginOtp(targetEmailToUse);
      if (res.success) {
        setSentOtpInfo({
          email: targetEmailToUse,
          previewCode: res.previewOtp,
          linkSent: firebaseLinkSucceeded
        });
        setCooldown(60);

        setFeedback({
          type: 'success',
          message: firebaseLinkSucceeded
            ? (language === 'ar' 
                ? `تم إرسال رابط الدخول المباشر إلى Gmail (${targetEmailToUse}) بنجاح! كما تم إرسال كود احتياطي لتيليجرام.`
                : `Magic sign-in link dispatched to Gmail (${targetEmailToUse}) successfully!`)
            : (language === 'ar'
                ? `تم تجهيز كود التحقق وإرساله إلى تيليجرام وبريدك (${targetEmailToUse}). استخدم الكود أدناه للمتابعة.`
                : `Verification code generated and dispatched for (${targetEmailToUse}).`)
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'حدث خطأ أثناء إرسال البريد.' : 'Error sending email.')
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle completing login via URL Email link
  const handleCompleteEmailLinkAuth = async () => {
    setIsVerifying(true);
    setFeedback(null);
    try {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = prompt(language === 'ar' ? 'يرجى تأكيد بريدك الإلكتروني لإكمال الدخول:' : 'Please confirm your email:');
      }
      if (!email) {
        setIsVerifying(false);
        return;
      }

      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      setFeedback({
        type: 'success',
        message: language === 'ar' ? 'تمت المصادقة بنجاح عبر رابط البريد الإلكتروني!' : 'Authenticated successfully via email link!'
      });
      setHasEmailLinkInUrl(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل التحقق من رابط البريد الإلكتروني.' : 'Failed to verify email link.')
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle verifying 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOtp.trim() || manualOtp.trim().length !== 6) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى إدخال الكود المكون من 6 أرقام بدقة.' : 'Please enter 6-digit code.'
      });
      return;
    }

    setIsVerifying(true);
    setFeedback(null);
    try {
      const email = sentOtpInfo?.email || targetEmailToUse;
      const res = await verifyOwnerEmailLoginOtp(email, manualOtp.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل التحقق من الكود.' : 'Code verification failed.')
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'مصادقة البريد الإلكتروني الذكية (Passwordless Email Auth)' : 'Passwordless Email Authenticator'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Firebase Auth
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'تسجيل الدخول والتحقق من هوية المالك فورياً عبر روابط Firebase السحرية المباشرة (Magic Sign-In Link) مع كود OTP احتياطي مرسل لتيليجرام.'
                  : 'Instant owner verification using Firebase Auth passwordless magic links directly to Gmail with Telegram OTP fallback.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
            >
              <Inbox className="w-3.5 h-3.5 text-rose-500" />
              <span>{language === 'ar' ? 'فتح بريد Gmail' : 'Open Gmail'}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Incoming Link Detected Notification */}
        {hasEmailLinkInUrl && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 animate-spin" />
              <div>
                <p className="font-bold">
                  {language === 'ar' ? 'تم اكتشاف رابط مصادقة بريد في الرابط الحالي!' : 'Email Sign-in Link detected in current URL!'}
                </p>
                <p className="text-[11px] opacity-80">
                  {language === 'ar' ? 'اضغط لتأكيد هويتك وتسجيل الدخول المباشر بدون كلمة مرور.' : 'Click to complete passwordless authentication now.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCompleteEmailLinkAuth}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{language === 'ar' ? 'إكمال تسجيل الدخول الآن' : 'Complete Verification'}</span>
            </button>
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Email Selection & Dispatch Form */}
        <form onSubmit={handleSendEmailAuth} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              {language === 'ar' ? 'اختر البريد الإلكتروني للمالك المراد إرسال الرابط إليه:' : 'Select Target Owner Email:'}
            </label>

            {!useCustomEmail ? (
              <div className="space-y-2">
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ownerChannels.registeredEmails.map((email) => (
                    <option key={email} value={email}>
                      {email} {email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase() ? (language === 'ar' ? '(الأساسي)' : '(Primary)') : ''}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setUseCustomEmail(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {language === 'ar' ? '+ إدخال بريد آخر مسجل' : '+ Use custom registered email'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setUseCustomEmail(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || cooldown > 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isLoading 
                  ? (language === 'ar' ? 'جارٍ الإرسال عبر Google...' : 'Sending via Google...')
                  : cooldown > 0 
                  ? `${language === 'ar' ? 'إعادة الإرسال بعد' : 'Resend in'} (${cooldown}s)`
                  : (language === 'ar' ? 'إرسال رابط الدخول السحري وكود التحقق' : 'Send Magic Link & OTP Code')}
              </span>
            </button>
          </div>
        </form>

        {/* Live Fallback Code & Manual Verification Section */}
        {sentOtpInfo && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'ar' ? 'كود التحقق الفوري البديل (OTP Fallback):' : 'Backup 6-Digit Verification Code:'}</span>
                </span>
                {sentOtpInfo.previewCode && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sentOtpInfo.previewCode!)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ الكود' : 'Copy Code')}</span>
                  </button>
                )}
              </div>

              {sentOtpInfo.previewCode && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-400">
                    {sentOtpInfo.previewCode}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? '(صالح لمدة 10 دقائق)' : '(Valid for 10 min)'}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? '💡 في حال تأخر وصول الرسالة إلى صندوق البريد (Gmail) أو وجودها في مجلد الرسائل الترويجية/غير المرغوب فيها (Spam)، يمكنك إدخال الكود أعلاه مباشرة لإتمام المصادقة.'
                  : '💡 If Gmail delivery is slightly delayed or filtered into the Spam folder, you can enter the 6-digit backup code above immediately.'}
              </p>
            </div>

            {/* Manual OTP Form */}
            <form onSubmit={handleVerifyOtp} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                maxLength={6}
                value={manualOtp}
                onChange={(e) => setManualOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full sm:w-48 text-center tracking-widest font-mono text-base font-bold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isVerifying || manualOtp.trim().length !== 6}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{language === 'ar' ? 'تأكيد الكود وتسجيل الدخول' : 'Verify & Authorize'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
