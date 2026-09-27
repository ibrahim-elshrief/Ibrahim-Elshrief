import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  Eye, 
  EyeOff, 
  Send, 
  Bot, 
  Phone,
  Smartphone,
  Sparkles,
  Check,
  RotateCcw,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminSecureLoginProps {
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export const AdminSecureLogin: React.FC<AdminSecureLoginProps> = ({
  onLoginSuccess,
  onBackToHome
}) => {
  const { language, direction } = useLanguage();
  const { 
    currentUser, 
    isAdmin, 
    loginAsAdmin, 
    logout, 
    loading: authLoading,
    sendTelegramLoginCode,
    verifyTelegramLoginCode,
    ownerChannels,
    sendOwnerPhoneLoginOtp,
    verifyOwnerPhoneLoginOtp,
    updateAdminCredentials,
    adminCredentials
  } = useAuth();

  // Authentication Mode:
  // 'credentials' (Master username & password) - default for direct access
  // 'telegram' (Primary Telegram Bot)
  // 'phone'    (Emergency fast OTP to owner registered phone via Telegram)
  const [authMethod, setAuthMethod] = useState<'telegram' | 'phone' | 'credentials'>('credentials');

  // Telegram state (Direct code entry only, bot configuration is strictly restricted to authenticated admin panel)
  const [telegramCode, setTelegramCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Phone state (Strictly limited to pre-registered phones, masked length, no custom input, no code preview)
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [phoneStep, setPhoneStep] = useState<'request_code' | 'enter_code'>('request_code');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);

  // Helper function to mask phone number: only show last 2 digits, preceded by an unknown fixed number of asterisks
  // No labels, no telegram indicator, no way to deduce the phone length
  const maskPhoneNumber = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    const last2 = digits.length >= 2 ? digits.slice(-2) : (phoneStr.slice(-2) || '••');
    return `************${last2}`;
  };

  // Traditional credentials state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingCreds, setSubmittingCreds] = useState(false);

  // Post-OTP Password & Username Reset prompt
  const [showQuickResetModal, setShowQuickResetModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingNewCreds, setIsSavingNewCreds] = useState(false);

  // Global feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  // Initialize phone selection
  useEffect(() => {
    if (ownerChannels.registeredPhones && ownerChannels.registeredPhones.length > 0 && !selectedPhoneId) {
      setSelectedPhoneId(ownerChannels.registeredPhones[0].id);
    }
  }, [ownerChannels.registeredPhones, selectedPhoneId]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // If already authenticated and has admin rights, proceed immediately
  useEffect(() => {
    if (!authLoading && currentUser && isAdmin) {
      onLoginSuccess();
    }
  }, [authLoading, currentUser, isAdmin, onLoginSuccess]);

  // -------------------------------------------------------------
  // HANDLERS: TELEGRAM AUTH
  // -------------------------------------------------------------
  const handleSendTelegramCode = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSendingCode(true);

    try {
      const res = await sendTelegramLoginCode();

      if (res.success) {
        setSuccessMsg(res.message);
        setResendCooldown(60);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إرسال كود التحقق إلى تيليجرام.' : 'Failed to dispatch Telegram code.'));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = telegramCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError(language === 'ar' ? 'يرجى إدخال كود التحقق المكون من 6 أرقام.' : 'Please enter the 6-digit code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const res = await verifyTelegramLoginCode(cleanCode);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess();
        }, 800);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'خطأ أثناء التحقق من الكود.' : 'Verification error.'));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: PHONE & TELEGRAM LINKED OTP
  // -------------------------------------------------------------
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedPhoneId) {
      setError(language === 'ar' ? 'يرجى اختيار رقم الهاتف المسجل.' : 'Please select a registered phone.');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res = await sendOwnerPhoneLoginOtp(selectedPhoneId);
      if (res.success) {
        setSuccessMsg(
          language === 'ar'
            ? 'تم إرسال كود التحقق بنجاح إلى حساب التيليجرام الخاص بك. يرجى مراجعة محادثة التيليجرام وإدخال الرمز.'
            : 'Verification code sent to your Telegram account. Please check your Telegram.'
        );
        setPhoneStep('enter_code');
        setResendCooldown(60);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إرسال كود الهاتف.' : 'Failed to send phone OTP.'));
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = phoneOtpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError(language === 'ar' ? 'يرجى كتابة كود التحقق المكون من 6 أرقام.' : 'Please enter 6-digit code.');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    try {
      const res = await verifyOwnerPhoneLoginOtp(selectedPhoneId, cleanCode);
      if (res.success) {
        setSuccessMsg(res.message);
        // Show quick credentials update prompt
        setNewUsername(adminCredentials.username || 'admin');
        setNewPassword(adminCredentials.password || '');
        setShowQuickResetModal(true);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل التحقق من الكود.' : 'Verification error.'));
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: TRADITIONAL CREDENTIALS
  // -------------------------------------------------------------
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmittingCreds(true);

    try {
      const res = await loginAsAdmin(identifier.trim(), password);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess();
        }, 700);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل التحقق من بيانات الدخول.' : 'Login failed.'));
    } finally {
      setSubmittingCreds(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLER: SAVE QUICK CREDENTIALS RESET & PROCEED TO DASHBOARD
  // -------------------------------------------------------------
  const handleSaveQuickCredentialsAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور الجديدين.' : 'Please enter new username and password.');
      return;
    }

    setIsSavingNewCreds(true);
    try {
      const res = await updateAdminCredentials(newUsername.trim(), newPassword.trim());
      if (res.success) {
        setShowQuickResetModal(false);
        onLoginSuccess();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving credentials');
    } finally {
      setIsSavingNewCreds(false);
    }
  };

  const handleSkipCredentialsAndProceed = () => {
    setShowQuickResetModal(false);
    onLoginSuccess();
  };

  // Unauthorized signed-in state
  const isUnauthorizedUser = currentUser && !isAdmin;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Return to Showcase Button */}
      <div className="absolute top-6 start-6 z-20">
        <button
          id="admin-login-back-home-btn"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-white bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-emerald-600/40 dark:hover:border-neutral-700 transition-all cursor-pointer shadow-xs"
        >
          <BackArrow className="w-4 h-4" />
          <span>{language === 'ar' ? 'العودة إلى الموقع' : 'Back to Showcase'}</span>
        </button>
      </div>

      <div className="w-full max-w-lg">
        {/* Solid High-Contrast Gateway Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] p-7 sm:p-9 shadow-xl relative overflow-hidden">
          {/* Subtle Top Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-cyan-500" />

          {/* Portal Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <span>{language === 'ar' ? 'بوابة دخول المالك الموحدة' : 'Owner Multi-Channel Gateway'}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                {language === 'ar'
                  ? 'تسجيل دخول متعدد القنوات للمالك: عبر بوت تيليجرام، أو البريد الإلكتروني، أو الهاتف وربط تيليجرام للطوارئ.'
                  : 'Multi-redundant owner access via Telegram Bot, Email (Gmail), or linked emergency phone numbers.'}
              </p>
            </div>
          </div>

          {/* Authentication Channel Tabs */}
          {/* Method Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 mb-6 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('telegram');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                authMethod === 'telegram'
                  ? 'bg-white dark:bg-neutral-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تيليجرام' : 'Telegram'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                authMethod === 'phone'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الهاتف' : 'Phone'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMethod('credentials');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                authMethod === 'credentials'
                  ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'كلمة المرور' : 'Password'}</span>
            </button>
          </div>

          {/* Unauthorized Alert */}
          {isUnauthorizedUser && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{language === 'ar' ? 'وصول مرفوض: غير مصرح' : 'Access Denied: Unauthorized'}</span>
              </div>
              <p>
                {language === 'ar'
                  ? `الحساب (${currentUser.email}) لا يمتلك صلاحيات إدارة النظام.`
                  : `Account (${currentUser.email}) does not have administrative role permissions.`}
              </p>
              <button
                onClick={() => logout()}
                className="mt-2 w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'تسجيل الخروج والمحاولة بحساب آخر' : 'Sign Out & Retry'}
              </button>
            </div>
          )}

          {/* Alerts */}
          {error && !isUnauthorizedUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !isUnauthorizedUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 1: TELEGRAM BOT LOGIN                                    */}
          {/* ============================================================== */}
          {authMethod === 'telegram' && !isUnauthorizedUser && (
            <form onSubmit={handleVerifyTelegramCode} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                  {language === 'ar' ? 'أدخل كود التحقق السري (6 أرقام)' : 'Enter 6-digit Telegram Code'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={telegramCode}
                  onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.6em] text-2xl font-mono py-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingCode || telegramCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>{language === 'ar' ? 'تأكيد الكود وتسجيل الدخول' : 'Verify & Enter Dashboard'}</span>
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  disabled={isSendingCode || resendCooldown > 0}
                  onClick={handleSendTelegramCode}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'ar' ? 'جارٍ إرسال الكود...' : 'Sending code...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {resendCooldown > 0
                          ? `${language === 'ar' ? 'إعادة الإرسال بعد' : 'Resend code in'} (${resendCooldown}s)`
                          : (language === 'ar' ? 'إرسال كود الدخول إلى تيليجرام' : 'Send Code to Telegram')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* MODE 2: PHONE OTP VIA TELEGRAM                                 */}
          {/* ============================================================== */}
          {authMethod === 'phone' && !isUnauthorizedUser && (
            <div className="space-y-5">
              {phoneStep === 'request_code' && (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  {/* Registered Phone Selection (Masked to last 2 digits, fixed asterisks, no label, no telegram indicator) */}
                  {ownerChannels.registeredPhones && ownerChannels.registeredPhones.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        {language === 'ar' ? 'اختر رقم الهاتف المعتمد:' : 'Select Registered Phone:'}
                      </label>
                      <select
                        value={selectedPhoneId}
                        onChange={(e) => setSelectedPhoneId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {ownerChannels.registeredPhones.map((p, idx) => (
                          <option key={p.id} value={p.id}>
                            {language === 'ar' ? `رقم هاتف ${idx + 1}: ` : `Phone ${idx + 1}: `} {maskPhoneNumber(p.phone)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                      {language === 'ar'
                        ? 'لا توجد أرقام هواتف مسجلة حالياً. يرجى الدخول ببيانات المشرف الرئيسية.'
                        : 'No registered phones configured. Please log in using master credentials.'}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingPhoneOtp || !ownerChannels.registeredPhones?.length}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingPhoneOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'إرسال كود التحقق عبر تيليجرام' : 'Dispatch Phone OTP Code via Telegram'}</span>
                  </button>
                </form>
              )}

              {phoneStep === 'enter_code' && (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                      {language === 'ar' ? 'أدخل كود التحقق السري (6 أرقام)' : 'Enter 6-digit Code'}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={phoneOtpCode}
                      onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.6em] text-2xl font-mono py-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingPhoneOtp || phoneOtpCode.length !== 6}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifyingPhoneOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'تأكيد الكود والدخول المباشر' : 'Verify & Enter Dashboard'}</span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isSendingPhoneOtp}
                      onClick={handleSendPhoneOtp}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                    >
                      {resendCooldown > 0 ? `${language === 'ar' ? 'إعادة الإرسال بعد' : 'Resend in'} ${resendCooldown}s` : (language === 'ar' ? 'إعادة إرسال الكود' : 'Resend Code')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhoneStep('request_code')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {language === 'ar' ? 'تغيير الرقم' : 'Change Phone'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 4: TRADITIONAL MASTER CREDENTIALS                         */}
          {/* ============================================================== */}
          {authMethod === 'credentials' && !isUnauthorizedUser && (
            <form onSubmit={handleCredentialSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  {language === 'ar' ? 'اسم المستخدم للمشرف' : 'Admin Username'}
                </label>
                <input
                  id="admin-login-username-input"
                  type="text"
                  required
                  autoComplete="off"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    id="admin-login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full ps-3.5 pe-10 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="admin-login-submit-btn"
                type="submit"
                disabled={submittingCreds || authLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
              >
                {submittingCreds ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{language === 'ar' ? 'دخول بحساب الإدارة' : 'Sign In'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-500">
            <span className="text-[11px] text-slate-400">
              {language === 'ar' ? 'منظومة حماية متقدمة ومستقلة' : 'Decentralized Redundant Security'}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-neutral-500">
              <Lock className="w-3 h-3" />
              <span>{language === 'ar' ? 'مشفر 256-bit' : 'Encrypted'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QUICK RESET CREDENTIALS MODAL UPON FAST OTP LOGIN               */}
      {/* User prompt requirement:                                       */}
      {/* "يكتب الكود فيروح مدخله مباشر وظاهرله قائمة انه يغير اسم       */}
      {/*  المستخدم وكلمة المرور"                                         */}
      {/* ============================================================== */}
      {showQuickResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111216] border-2 border-indigo-500/50 rounded-2xl p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {language === 'ar' ? 'تم التحقق بنجاح! تحديث بيانات الدخول' : 'Owner Verified! Update Credentials'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar' 
                    ? 'يمكنك الآن تحديث اسم المستخدم وكلمة المرور الخاصة بك أو المتابعة للوحة التحكم مباشرة:' 
                    : 'Optionally update master credentials now or proceed to dashboard:'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveQuickCredentialsAndProceed} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-300">
                  {language === 'ar' ? 'اسم المستخدم الجديد للمشرف:' : 'New Admin Username:'}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-300">
                  {language === 'ar' ? 'كلمة المرور الجديدة:' : 'New Password:'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full ps-3.5 pe-10 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSkipCredentialsAndProceed}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'تخطي والمتابعة' : 'Skip & Enter'}
                </button>

                <button
                  type="submit"
                  disabled={isSavingNewCreds}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSavingNewCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{language === 'ar' ? 'حفظ ودخول للوحة التحكم' : 'Save & Enter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
