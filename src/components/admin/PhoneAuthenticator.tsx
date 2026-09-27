import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  Info,
  KeyRound
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export const PhoneAuthenticator: React.FC = () => {
  const { language } = useLanguage();
  const { 
    ownerChannels, 
    sendOwnerPhoneLoginOtp, 
    verifyOwnerPhoneLoginOtp
  } = useAuth();

  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [isDispatched, setIsDispatched] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Mask phone number to only reveal the last 2 digits preceded by unknown fixed asterisks
  const maskPhoneNumber = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    const last2 = digits.length >= 2 ? digits.slice(-2) : (phoneStr.slice(-2) || '••');
    return `************${last2}`;
  };

  // Initialize selected phone
  useEffect(() => {
    if (ownerChannels.registeredPhones?.length > 0 && !selectedPhoneId) {
      setSelectedPhoneId(ownerChannels.registeredPhones[0].id);
    }
  }, [ownerChannels.registeredPhones, selectedPhoneId]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const hasMasterBot = Boolean(ownerChannels.telegramBotToken && ownerChannels.telegramChatId);
  const activePhoneObj = ownerChannels.registeredPhones?.find(p => p.id === selectedPhoneId);
  const isPhoneDirectlyLinked = Boolean(activePhoneObj?.isLinkedToTelegram && activePhoneObj?.telegramChatId);

  // Send verification code via Telegram
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsDispatched(false);

    if (!selectedPhoneId) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى تحديد رقم هاتف مسجل.' : 'Please select a registered phone number.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOwnerPhoneLoginOtp(selectedPhoneId);
      if (res.success) {
        setIsDispatched(true);
        setCooldown(60);
        setFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم إرسال كود التحقق بنجاح إلى حساب التيليجرام المرتبط بهذا الرقم!'
            : 'Verification code sent to your linked Telegram account!'
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
        message: err?.message || (language === 'ar' ? 'فشل إرسال كود الهاتف.' : 'Failed to send phone code.')
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify verification code
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى إدخال كود التحقق المكون من 6 أرقام.' : 'Please enter 6-digit verification code.'
      });
      return;
    }

    setIsVerifying(true);
    setFeedback(null);
    try {
      const res = await verifyOwnerPhoneLoginOtp(selectedPhoneId, cleanCode);
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
        message: err?.message || (language === 'ar' ? 'فشل التحقق من الكود.' : 'Verification error.')
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'مصادقة الهاتف عبر تيليجرام (Phone & Telegram Fallback)' : 'Phone Authentication & Telegram Fallback'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  {language === 'ar' ? 'بديل فوري للطوارئ' : 'Emergency Conduit'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'بنية تحتية بديلة مشفرة تتيح للمالك تسجيل الدخول بهاتفه وتلقي كود التحقق السري فورياً عبر تيليجرام عند تعذر الوصول للبريد الإلكتروني.'
                  : 'Robust phone-based authentication paired with Telegram bot routing, ensuring uninterrupted access when email is inaccessible.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              hasMasterBot || isPhoneDirectlyLinked 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}>
              <Bot className="w-3.5 h-3.5" />
              <span>
                {hasMasterBot || isPhoneDirectlyLinked
                  ? (language === 'ar' ? 'البديل نشط وجاهز' : 'Telegram Active')
                  : (language === 'ar' ? 'البوت غير مربوط' : 'Bot Unlinked')}
              </span>
            </span>
          </div>
        </div>

        {/* Informative Explanation Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            {language === 'ar'
              ? 'تعتمد هذه المنظومة على إرسال كود التحقق لهاتفك عبر بوت تيليجرام الموثق للمالك لتفادي مشاكل رسائل SMS التقليدية وتأخر شركات الاتصالات أو فلاتر الحجب، مما يمنحك وصوﻻً مضموناً بنسبة 100% في أي وقت.'
              : 'This module utilizes your connected Telegram Bot to route phone OTP codes instantly, avoiding cell carrier delays and SMS gateway filters for 100% guaranteed delivery.'}
          </p>
        </div>

        {/* Feedback Alert */}
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

        {/* Form: Select Registered Phone & Dispatch */}
        <form onSubmit={handleSendPhoneOtp} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              {language === 'ar' ? 'حدد رقم هاتف المالك المصرح به:' : 'Select Authorized Owner Phone:'}
            </label>

            {ownerChannels.registeredPhones?.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedPhoneId}
                  onChange={(e) => setSelectedPhoneId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ownerChannels.registeredPhones.map((phoneItem, idx) => (
                    <option key={phoneItem.id} value={phoneItem.id}>
                      {language === 'ar' ? `رقم هاتف ${idx + 1}: ` : `Phone ${idx + 1}: `} {maskPhoneNumber(phoneItem.phone)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                {language === 'ar' ? 'لا توجد أرقام هواتف مسجلة حالياً.' : 'No registered phones available.'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || cooldown > 0 || !ownerChannels.registeredPhones?.length}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
              <span>
                {isLoading 
                  ? (language === 'ar' ? 'جارٍ الإرسال إلى تيليجرام...' : 'Sending to Telegram...')
                  : cooldown > 0 
                  ? `${language === 'ar' ? 'إعادة الإرسال بعد' : 'Resend in'} (${cooldown}s)`
                  : (language === 'ar' ? 'إرسال كود التحقق عبر تيليجرام' : 'Dispatch Phone Code via Telegram')}
              </span>
            </button>
          </div>
        </form>

        {/* Fallback Display & Code Verification */}
        {isDispatched && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'تم إرسال كود التحقق بنجاح إلى تيليجرام' : 'Verification Code Sent to Telegram'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'تم توجيه كود التحقق السري المكون من 6 أرقام إلى حساب تيليجرام المرتبط بهذا الهاتف. يرجى مراجعة محادثتك وكتابة الكود أدناه.'
                  : 'A secret 6-digit verification code was sent to the Telegram account linked to this phone. Please check your Telegram and enter it below.'}
              </p>
            </div>

            {/* Verification Code Input Form */}
            <form onSubmit={handleVerifyPhoneOtp} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full sm:w-48 text-center tracking-widest font-mono text-base font-bold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isVerifying || verificationCode.trim().length !== 6}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{language === 'ar' ? 'تأكيد الرمز وتفويض الدخول' : 'Confirm & Authorize'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
