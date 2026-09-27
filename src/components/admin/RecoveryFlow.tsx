import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Send, 
  Bot, 
  ArrowRight,
  ArrowLeft,
  Lock,
  User,
  Check,
  KeyRound
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { sendTelegramMessage } from '../../utils/telegramService';

export const RecoveryFlow: React.FC = () => {
  const { language, direction } = useLanguage();
  const { 
    adminCredentials, 
    updateAdminCredentials, 
    ownerChannels, 
    sendOwnerPhoneLoginOtp, 
    verifyOwnerPhoneLoginOtp 
  } = useAuth();

  // Multi-step state:
  // Step 1: 'choose_channel' (Select Phone conduit)
  // Step 2: 'enter_code' (Enter 6-digit verification code from Telegram)
  // Step 3: 'update_credentials' (Set new username & password)
  // Step 4: 'success' (Credentials updated)
  const [step, setStep] = useState<'choose_channel' | 'enter_code' | 'update_credentials' | 'success'>('choose_channel');

  const [targetPhoneId, setTargetPhoneId] = useState<string>(ownerChannels.registeredPhones?.[0]?.id || '');

  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // New Credentials state
  const [newUsername, setNewUsername] = useState(adminCredentials.username || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Mask phone number to only reveal the last 2 digits preceded by unknown fixed asterisks
  const maskPhoneNumber = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    const last2 = digits.length >= 2 ? digits.slice(-2) : (phoneStr.slice(-2) || '••');
    return `************${last2}`;
  };

  useEffect(() => {
    if (ownerChannels.registeredPhones?.length > 0 && !targetPhoneId) {
      setTargetPhoneId(ownerChannels.registeredPhones[0].id);
    }
  }, [ownerChannels.registeredPhones, targetPhoneId]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Step 1: Send Verification Code
  const handleSendVerification = async () => {
    setFeedback(null);

    if (!targetPhoneId) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى تحديد رقم هاتف مسجل.' : 'Please select a registered phone.'
      });
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await sendOwnerPhoneLoginOtp(targetPhoneId);
      if (res.success) {
        setCooldown(60);
        setStep('enter_code');
        setFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم إرسال كود التحقق الأمني بنجاح إلى حساب تيليجرام المرتبط بهذا الرقم.'
            : 'Verification code sent to your linked Telegram account.'
        });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل إرسال كود التحقق.' : 'Failed to send code.')
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى إدخال الكود المكون من 6 أرقام.' : 'Please enter 6-digit code.'
      });
      return;
    }

    setIsVerifyingCode(true);
    setFeedback(null);
    try {
      const res = await verifyOwnerPhoneLoginOtp(targetPhoneId, cleanCode);
      if (res.success) {
        setStep('update_credentials');
        setFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم تأكيد هويتك بنجاح! يمكنك الآن تعيين اسم مستخدم وكلمة مرور جديدة للمشرف.'
            : 'Identity verified successfully! You can now update your master credentials.'
        });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل التحقق من الكود.' : 'Verification error.')
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 3: Update Credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanUser = newUsername.trim();
    if (!cleanUser || cleanUser.length < 3) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'اسم المستخدم يجب ألا يقل عن 3 أحرف.' : 'Username must be at least 3 characters.'
      });
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'كلمة المرور يجب أن تكون 4 أحرف أو رموز على الأقل.' : 'Password must be at least 4 characters.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'
      });
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await updateAdminCredentials(cleanUser, newPassword);
      if (res.success) {
        // Send alert to Telegram bot for audit logging
        if (ownerChannels.telegramBotToken && ownerChannels.telegramChatId) {
          sendTelegramMessage(
            ownerChannels.telegramBotToken,
            ownerChannels.telegramChatId,
            `🛡 <b>تنبيه أمني: تم تحديث بيانات اعتماد المشرف الرئيسي</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ تم التحقق عبر: الهاتف وقناة تيليجرام المشفرة\n` +
            `👤 اسم المستخدم الجديد: <code>${cleanUser}</code>\n` +
            `🕒 التوقيت: ${new Date().toLocaleString('ar-EG')}`
          ).catch(() => {});
        }

        setStep('success');
        setFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم تحديث اسم المستخدم وكلمة المرور بنجاح وحفظها في قاعدة البيانات السحابية!'
            : 'Master credentials updated successfully!'
        });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'حدث خطأ أثناء تحديث البيانات.' : 'Error updating credentials.')
      });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const resetFlow = () => {
    setStep('choose_channel');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFeedback(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'مسار استعادة وتحديث الحساب (Owner Recovery Flow)' : 'Owner Identity Recovery Flow'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  {language === 'ar' ? 'التحقق أولاً' : 'Verify First'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar'
                  ? 'يتيح للمالك المعتمد التحقق المسبق عبر كود تيليجرام الآمن، ومن ثم تعيين اسم مستخدم وكلمة مرور جديدة للمشرف بشكل فوري.'
                  : 'Enables verified owners to validate identity via Telegram OTP, then securely update master admin username and password.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'المستخدم الحالي:' : 'Current User:'}{' '}
              <strong className="text-amber-600 dark:text-amber-400">{adminCredentials.username || 'admin'}</strong>
            </span>
          </div>
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

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto py-2">
          <div className={`flex items-center gap-2 text-xs font-bold ${
            step === 'choose_channel' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
          }`}>
            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border">1</span>
            <span>{language === 'ar' ? 'اختيار الهاتف' : 'Select Phone'}</span>
          </div>
          <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${
            step === 'enter_code' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
          }`}>
            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border">2</span>
            <span>{language === 'ar' ? 'التحقق' : 'Verify'}</span>
          </div>
          <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${
            step === 'update_credentials' || step === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
          }`}>
            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border">3</span>
            <span>{language === 'ar' ? 'البيانات الجديدة' : 'Credentials'}</span>
          </div>
        </div>

        {/* STEP 1: CHOOSE PHONE */}
        {step === 'choose_channel' && (
          <div className="space-y-6 max-w-lg mx-auto animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl border-2 border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    {language === 'ar' ? 'التحقق بالهاتف عبر تيليجرام' : 'Phone Verification via Telegram'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar'
                      ? 'سيتم إرسال كود التحقق الأمني السري إلى حساب تيليجرام المرتبط برقمك المسجل.'
                      : 'A secret verification code will be sent to your linked Telegram account.'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {language === 'ar' ? 'حدد رقم الهاتف المعتمد:' : 'Select Authorized Phone:'}
                </label>
                {ownerChannels.registeredPhones?.length > 0 ? (
                  <select
                    value={targetPhoneId}
                    onChange={(e) => setTargetPhoneId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {ownerChannels.registeredPhones.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {language === 'ar' ? `رقم هاتف ${idx + 1}: ` : `Phone ${idx + 1}: `} {maskPhoneNumber(p.phone)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                    {language === 'ar' ? 'لا توجد أرقام هواتف مسجلة حالياً.' : 'No registered phones available.'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={isSendingCode || !ownerChannels.registeredPhones?.length}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{language === 'ar' ? 'إرسال كود التحقق والمتابعة' : 'Send Verification Code'}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENTER CODE */}
        {step === 'enter_code' && (
          <div className="space-y-6 max-w-md mx-auto animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'ar' ? 'أدخل كود التحقق الأمني' : 'Enter Verification Code'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'تم إرسال كود التحقق السري المكون من 6 أرقام إلى حسابك في تيليجرام. يرجى تفقّد المحادثة وإدخال الرمز هنا:'
                  : 'A secret 6-digit code was sent to your Telegram account. Please check your messages and enter it below:'}
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center text-2xl font-mono font-black tracking-widest px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('choose_channel')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  {language === 'ar' ? 'رجوع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingCode || verificationCode.trim().length !== 6}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{language === 'ar' ? 'تأكيد الكود' : 'Verify Code'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: UPDATE CREDENTIALS */}
        {step === 'update_credentials' && (
          <form onSubmit={handleUpdateCredentials} className="space-y-5 max-w-lg mx-auto animate-in fade-in duration-200">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{language === 'ar' ? 'تمت المصادقة بنجاح! يرجى إدخال بيانات الدخول الجديدة أدناه:' : 'Identity confirmed! Enter new credentials:'}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ar' ? 'اسم المستخدم الجديد (Master Username)' : 'New Master Username'}</span>
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ar' ? 'كلمة المرور الجديدة (New Password)' : 'New Password'}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-3.5 pe-10 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingCreds}
              className="w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isUpdatingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{language === 'ar' ? 'حفظ وتحديث بيانات الحساب نهائياً' : 'Save & Update Credentials'}</span>
            </button>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 max-w-md mx-auto animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'تم تحديث بيانات الاعتماد بنجاح!' : 'Credentials Updated Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'ar'
                  ? `اسم المستخدم الجديد: (${newUsername}). يمكنك استخدامه مع كلمة المرور الجديدة لتسجيل الدخول في أي وقت.`
                  : `New username: (${newUsername}). You can now use these credentials anytime.`}
              </p>
            </div>
            <button
              type="button"
              onClick={resetFlow}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              {language === 'ar' ? 'إجراء استعادة جديد' : 'New Recovery'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
