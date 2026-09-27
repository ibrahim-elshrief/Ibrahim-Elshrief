import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAdminLoginSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess
}) => {
  const { language } = useLanguage();
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    loginAsAdmin,
    adminCredentials,
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail
  } = useAuth();

  const isModalVisible = isOpen !== undefined ? isOpen : isAuthModalOpen;

  const [activeTab, setActiveTab] = useState<'admin' | 'customer'>('admin');
  
  // Admin credentials state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Customer state
  const [customerMode, setCustomerMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setError('');
    onClose?.();
    setIsAuthModalOpen(false);
  };

  React.useEffect(() => {
    if (!isModalVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalVisible]);

  if (!isModalVisible) return null;

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginAsAdmin(adminUsername, adminPassword);
      if (res.success) {
        handleClose();
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess();
        } else {
          window.location.hash = '/admin';
        }
      } else {
        setError(
          res.message || 
          (language === 'ar' 
            ? 'بيانات الاعتماد غير صحيحة. يرجى التحقق من صحة المدخلات أو استخدام نظام المصادقة المخصص.' 
            : 'Invalid credentials. Please verify your details or use secure authentication.')
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Admin authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (customerMode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setError(
          language === 'ar'
            ? 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.'
            : 'Pop-up blocked by browser. Please allow pop-ups and try again.'
        );
        return;
      }
      setError(err.message || 'Google authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#0c0d10]/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-neutral-900 text-emerald-600 dark:text-cyan-400 border border-emerald-200 dark:border-neutral-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {language === 'ar' ? 'بوابة تسجيل الدخول' : 'Access Gateway'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                {language === 'ar' ? 'اختر نوع الحساب للمتابعة' : 'Select account type to proceed'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            aria-label="Close"
            title={language === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Type Selector Tabs Sticky */}
        <div className="shrink-0 z-10 p-2 sm:p-2.5 bg-slate-100/80 dark:bg-[#0c0d10]/80 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 flex gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white dark:bg-neutral-800 text-emerald-800 dark:text-white border border-slate-200 dark:border-neutral-700 shadow-2xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
            <span>{language === 'ar' ? 'دخول المشرف (Admin)' : 'Admin Login'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('customer'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white dark:bg-neutral-800 text-emerald-800 dark:text-white border border-slate-200 dark:border-neutral-700 shadow-2xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
            <span>{language === 'ar' ? 'المستخدمين والعملاء' : 'Customer Account'}</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-900/60 text-rose-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: ADMIN LOGIN */}
          {activeTab === 'admin' ? (
            <div className="space-y-4">
              <form onSubmit={handleAdminSubmit} className="space-y-4" autoComplete="off">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300">
                    {language === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني' : 'Admin Username or Email'}
                  </label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                      className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300">
                    {language === 'ar' ? 'كلمة المرور' : 'Admin Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full ps-9 pe-11 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {loading 
                      ? (language === 'ar' ? 'جارٍ التحقق...' : 'Verifying...') 
                      : (language === 'ar' ? 'تسجيل الدخول كمسؤول وفتح لوحة التحكم' : 'Sign In as Admin')}
                  </span>
                </button>
              </form>

              {/* Dedicated Telegram Login Action */}
              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800">
                <a
                  href="#/admin"
                  onClick={handleClose}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-50/60 dark:bg-neutral-900 hover:bg-emerald-100/60 dark:hover:bg-neutral-800 border border-emerald-200 dark:border-neutral-800 text-emerald-800 dark:text-cyan-400 font-mono text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {language === 'ar' 
                      ? 'أو المصادقة الآمنة برمز بوت تيلجرام (Telegram OTP)' 
                      : 'Or Authenticate via Telegram Bot OTP'}
                  </span>
                </a>
              </div>
            </div>
          ) : (
            /* TAB 2: CUSTOMER AUTH */
            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-white text-sm font-semibold flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{language === 'ar' ? 'المتابعة بحساب Google' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-neutral-800" />
                <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-neutral-500 uppercase">
                  {language === 'ar' ? 'أو بالبريد' : 'or email'}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-neutral-800" />
              </div>

              {/* Form */}
              <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
                {customerMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      {language === 'ar' ? 'الاسم' : 'Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Zaid"
                        className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600 font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0c0d10] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading 
                    ? '...' 
                    : (customerMode === 'login' 
                        ? (language === 'ar' ? 'دخول العميل' : 'Customer Sign In') 
                        : (language === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'))}
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="text-center text-xs text-slate-500 dark:text-neutral-400">
                {customerMode === 'login' ? (
                  <p>
                    {language === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                    <button onClick={() => setCustomerMode('signup')} className="font-bold text-emerald-600 dark:text-cyan-400 hover:underline">
                      {language === 'ar' ? 'سجل الآن' : 'Sign up'}
                    </button>
                  </p>
                ) : (
                  <p>
                    {language === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                    <button onClick={() => setCustomerMode('login')} className="font-bold text-emerald-600 dark:text-cyan-400 hover:underline">
                      {language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
