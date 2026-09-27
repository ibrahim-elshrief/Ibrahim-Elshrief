import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  Send, 
  Key, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  ExternalLink, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  Loader2, 
  Link as LinkIcon, 
  Shield, 
  Layers,
  Smartphone,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { OwnerRegisteredPhone } from '../../types';
import { PhoneAuthenticator } from './PhoneAuthenticator';
import { RecoveryFlow } from './RecoveryFlow';

export type SecurityTabType = 
  | 'identity' 
  | 'phone_auth' 
  | 'recovery' 
  | 'credentials';

export interface AdminSecurityProps {
  initialTab?: SecurityTabType | 'owner_channels' | 'telegram_bot';
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
  initialTab = 'identity'
}) => {
  const { language } = useLanguage();
  const { 
    adminCredentials, 
    updateAdminCredentials, 
    ownerChannels, 
    addOwnerPhone, 
    removeOwnerPhone, 
    linkPhoneToTelegram, 
    configureTelegramBot,
    sendOwnerPhoneLoginOtp,
    updateOwnerSecurityChannels
  } = useAuth();

  // Normalize initialTab
  const normalizedInitialTab: SecurityTabType = 
    initialTab === 'owner_channels' || initialTab === 'telegram_bot' 
      ? 'identity' 
      : (initialTab === 'phone_auth' || initialTab === 'recovery' || initialTab === 'credentials'
          ? initialTab
          : 'identity');

  const [activeTab, setActiveTab] = useState<SecurityTabType>(normalizedInitialTab);

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'owner_channels' || initialTab === 'telegram_bot') {
        setActiveTab('identity');
      } else if (['identity', 'phone_auth', 'recovery', 'credentials'].includes(initialTab)) {
        setActiveTab(initialTab as SecurityTabType);
      }
    }
  }, [initialTab]);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Phone state
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState(language === 'ar' ? 'هاتف شخصي للطوارئ' : 'Personal Emergency Phone');
  const [isAddingPhone, setIsAddingPhone] = useState(false);

  // Telegram Phone Linking Wizard State
  const [phoneToLink, setPhoneToLink] = useState<OwnerRegisteredPhone | null>(null);
  const [wizardChatId, setWizardChatId] = useState('');
  const [isLinkingPhone, setIsLinkingPhone] = useState(false);

  // Test OTP states
  const [isSendingTestOtp, setIsSendingTestOtp] = useState(false);

  // Telegram Bot Config State
  const [botToken, setBotToken] = useState(ownerChannels.telegramBotToken || '');
  const [botChatId, setBotChatId] = useState(ownerChannels.telegramChatId || '');
  const [requireTelegram2FA, setRequireTelegram2FA] = useState(!!ownerChannels.requireTelegram2FA);
  const [isSavingBot, setIsSavingBot] = useState(false);

  // Master Credentials State
  const [masterUsername, setMasterUsername] = useState(adminCredentials.username || '');
  const [masterPassword, setMasterPassword] = useState(adminCredentials.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  useEffect(() => {
    setBotToken(ownerChannels.telegramBotToken || '');
    setBotChatId(ownerChannels.telegramChatId || '');
    setRequireTelegram2FA(!!ownerChannels.requireTelegram2FA);
  }, [ownerChannels]);

  useEffect(() => {
    setMasterUsername(adminCredentials.username || '');
    setMasterPassword(adminCredentials.password || '');
  }, [adminCredentials]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Mask phone number: arbitrary fixed asterisks showing only the last 2 digits
  const maskPhoneNumber = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    const last2 = digits.length >= 2 ? digits.slice(-2) : (phoneStr.slice(-2) || '••');
    return `************${last2}`;
  };

  // --- Handlers: Phones & Telegram Linking ---
  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneInput.trim()) return;
    setIsAddingPhone(true);
    const res = await addOwnerPhone(newPhoneInput, newPhoneLabel);
    setIsAddingPhone(false);
    if (res.success) {
      setNewPhoneInput('');
      setNewPhoneLabel(language === 'ar' ? 'هاتف شخصي للطوارئ' : 'Personal Emergency Phone');
      showToast('success', res.message);
      if (res.phoneItem) {
        setPhoneToLink(res.phoneItem);
        setWizardChatId(ownerChannels.telegramChatId || '');
      }
    } else {
      showToast('error', res.message);
    }
  };

  const handleRemovePhone = async (phoneId: string) => {
    const res = await removeOwnerPhone(phoneId);
    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleConfirmLinkPhoneToTelegram = async () => {
    if (!phoneToLink || !wizardChatId.trim()) return;
    setIsLinkingPhone(true);
    const res = await linkPhoneToTelegram(phoneToLink.id, wizardChatId);
    setIsLinkingPhone(false);
    if (res.success) {
      const masked = maskPhoneNumber(phoneToLink.phone);
      showToast('success', language === 'ar' ? `تم ربط الرقم ${masked} بتيليجرام بنجاح!` : `Phone ${masked} linked to Telegram!`);
      setPhoneToLink(null);
      setWizardChatId('');
    } else {
      showToast('error', res.message);
    }
  };

  const handleTestPhoneOtp = async (phoneItem: OwnerRegisteredPhone) => {
    setIsSendingTestOtp(true);
    const res = await sendOwnerPhoneLoginOtp(phoneItem.id);
    setIsSendingTestOtp(false);
    if (res.success) {
      showToast('success', language === 'ar' ? 'تم إرسال كود التحقق بنجاح إلى حساب تيليجرام المربوط بهذا الرقم' : 'Verification code sent to your linked Telegram account');
    } else {
      showToast('error', res.message);
    }
  };

  // --- Handlers: Telegram Bot Settings ---
  const handleSaveTelegramBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBot(true);
    const res = await configureTelegramBot(botToken, botChatId);
    if (res.success) {
      await updateOwnerSecurityChannels({
        telegramBotToken: botToken.trim(),
        telegramChatId: botChatId.trim(),
        requireTelegram2FA
      });
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
    setIsSavingBot(false);
  };

  // --- Handlers: Master Credentials ---
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterUsername.trim() || !masterPassword.trim()) {
      showToast('error', language === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور.' : 'Please enter username and password.');
      return;
    }
    setIsSavingCreds(true);
    const res = await updateAdminCredentials(masterUsername.trim(), masterPassword.trim());
    setIsSavingCreds(false);
    if (res.success) {
      showToast('success', language === 'ar' ? 'تم تحديث بيانات اعتماد لوحة التحكم بنجاح!' : 'Admin credentials updated successfully!');
    } else {
      showToast('error', res.message || 'Error updating credentials');
    }
  };

  const totalPhones = ownerChannels.registeredPhones?.length || 0;
  const linkedPhones = ownerChannels.registeredPhones?.filter(p => p.isLinkedToTelegram).length || 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 pb-12 w-full">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-bold transition-all shadow-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setFeedback(null)} 
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss feedback"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 shrink-0" />
              <span>{language === 'ar' ? 'مركز الأمان والمصادقة المتقدمة' : 'Security & Identity Center'}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {language === 'ar' ? 'مؤمن ومشفر' : 'Secured'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {language === 'ar'
              ? 'لوحة تحكم مركزية لإدارة قنوات المالك المشفرة، أرقام الطوارئ المربوطة بتيليجرام، وبوت التفويض الفوري ومسار الاستعادة.'
              : 'Centralized security hub managing owner emergency phones, linked Telegram bot channels, and secure recovery conduit.'}
          </p>
        </div>
      </div>

      {/* Overview Stat Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Registered Phones */}
        <div 
          onClick={() => setActiveTab('identity')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 cursor-pointer hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'أرقام الطوارئ وتيليجرام' : 'Phones & Telegram Links'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalPhones}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {linkedPhones} {language === 'ar' ? 'مرتبط بتيليجرام مباشرة' : 'linked to Telegram'}
          </p>
        </div>

        {/* Card 2: Telegram Bot 2FA */}
        <div 
          onClick={() => setActiveTab('identity')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 cursor-pointer hover:border-cyan-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'بوت تسجيل الدخول 2FA' : 'Telegram Bot 2FA'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {ownerChannels.telegramBotToken ? (
              <span className="text-emerald-600 dark:text-emerald-400 text-base sm:text-lg font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>{language === 'ar' ? 'مضبوط وجاهز' : 'Configured'}</span>
              </span>
            ) : (
              <span className="text-amber-500 text-base sm:text-lg font-bold flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5" />
                <span>{language === 'ar' ? 'غير مربوط' : 'Not Connected'}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'ar' ? 'أكواد تفويض الدخول المباشرة' : 'Direct OTP dispatch'}
          </p>
        </div>

        {/* Card 3: Master Admin Credentials */}
        <div 
          onClick={() => setActiveTab('credentials')}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 cursor-pointer hover:border-amber-500 transition-all group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'بيانات المشرف المباشرة' : 'Master Credentials'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white truncate">
            {masterUsername || 'admin'}
          </p>
          <p className="text-[11px] text-slate-400">
            {language === 'ar' ? 'اسم المستخدم وكلمة المرور المشفرة' : 'Encrypted direct access credentials'}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs - Mobile Horizontal Scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap">
        {/* TAB 1: Centralized Identity Hub */}
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'identity'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{language === 'ar' ? 'إدارة الهواتف وبوت تيليجرام' : 'Phones & Telegram Bot'}</span>
        </button>

        {/* TAB 2: Phone & Telegram Fallback */}
        <button
          type="button"
          onClick={() => setActiveTab('phone_auth')}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'phone_auth'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>{language === 'ar' ? 'اختبار مصادقة الهاتف' : 'Test Phone Auth'}</span>
        </button>

        {/* TAB 3: Recovery Flow */}
        <button
          type="button"
          onClick={() => setActiveTab('recovery')}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'recovery'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{language === 'ar' ? 'مسار استعادة الحساب' : 'Recovery Flow'}</span>
        </button>

        {/* TAB 4: Master Credentials */}
        <button
          type="button"
          onClick={() => setActiveTab('credentials')}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'credentials'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>{language === 'ar' ? 'بيانات المشرف المباشرة' : 'Master Credentials'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PHONES & TELEGRAM BOT CONDUIT (NO EMAILS)                           */}
      {/* ========================================================================= */}
      {activeTab === 'identity' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          
          {/* Identity Health Banner */}
          <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/40 border border-indigo-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-1 sm:mt-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                    <span>{language === 'ar' ? 'منظومة حماية قنوات المالك والطوارئ' : 'Owner Emergency Channels & Bot Conduit'}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {language === 'ar' ? 'حماية مشفرة' : 'Encrypted 2FA'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {language === 'ar'
                      ? 'تجمع هذه اللوحة بين أرقام هواتف الطوارئ المعتمدة وبوت تيليجرام المباشر لتسليم أكواد التحقق الفورية وضمان عدم انقطاع وصول المالك مطلقاً.'
                      : 'Manages registered emergency phone numbers linked to your Telegram bot for guaranteed fast 2FA code delivery.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('recovery')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'مسار استعادة الحساب' : 'Recovery Flow'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">

            {/* SECTION: REGISTERED PHONES & TELEGRAM BINDINGS */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      {language === 'ar' ? 'أرقام هواتف الطوارئ المعتمدة' : 'Registered Emergency Phones'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {language === 'ar' ? 'الأرقام المشفرة المربوطة بتيليجرام لاستلام كود الدخول' : 'Masked phones linked to Telegram for login codes'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                  {totalPhones}
                </span>
              </div>

              {/* Phone List - Fully Responsive for Mobile */}
              <div className="space-y-3">
                {ownerChannels.registeredPhones && ownerChannels.registeredPhones.length > 0 ? (
                  ownerChannels.registeredPhones.map((p) => {
                    const maskedPhone = maskPhoneNumber(p.phone);
                    return (
                      <div 
                        key={p.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Phone info & Masked number */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                            {/* Masked phone display */}
                            <span className="font-mono font-bold tracking-wider text-slate-900 dark:text-white text-xs sm:text-sm break-all">
                              {maskedPhone}
                            </span>
                            {p.label && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">
                                {p.label}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                            {p.isLinkedToTelegram ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{language === 'ar' ? `تيليجرام مرتبط: ${p.telegramChatId || 'جاهز'}` : `Telegram linked: ${p.telegramChatId || 'Ready'}`}</span>
                              </span>
                            ) : (
                              <span className="text-amber-500 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{language === 'ar' ? 'غير مربوط بتيليجرام بعد' : 'Unlinked to Telegram'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons with comfortable mobile touch targets (min 44px) */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t border-slate-200/60 dark:border-slate-700/60 sm:border-t-0 shrink-0">
                          {!p.isLinkedToTelegram && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneToLink(p);
                                setWizardChatId(ownerChannels.telegramChatId || '');
                              }}
                              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs min-h-[44px] transition-all"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'ربط بتيليجرام' : 'Link'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTestPhoneOtp(p)}
                            disabled={isSendingTestOtp}
                            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'اختبار كود' : 'Test Code'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemovePhone(p.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={language === 'ar' ? 'حذف رقم الهاتف' : 'Delete phone'}
                            aria-label={language === 'ar' ? 'حذف رقم الهاتف' : 'Delete phone'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'لا توجد أرقام هواتف مسجلة حالياً للمالك.' : 'No registered phones yet.'}
                    </p>
                    <p className="text-[11px]">
                      {language === 'ar' ? 'سجل رقم هاتفك أدناه لتمكين الدخول السريع واستلام الأكواد عبر تيليجرام.' : 'Register an emergency phone number below to enable direct Telegram OTP access.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Add Phone Form - Responsive Form */}
              <form onSubmit={handleAddPhone} className="pt-2 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? '+ تسجيل رقم هاتف طوارئ جديد للمالك:' : '+ Register New Emergency Phone:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="tel"
                    required
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    placeholder="+9665xxxxxxxx / +201xxxxxxxx"
                    className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={newPhoneLabel}
                    onChange={(e) => setNewPhoneLabel(e.target.value)}
                    placeholder={language === 'ar' ? 'وصف الرقم (مثال: هاتف شخصي، هاتف الطوارئ)' : 'Label (e.g. Personal Phone, Emergency)'}
                    className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingPhone || !newPhoneInput.trim()}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    {isAddingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'حفظ الرقم وتوثيقه' : 'Save & Link Phone'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION: MASTER TELEGRAM BOT & 2FA BINDING */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5 sm:mt-0">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                      <span>{language === 'ar' ? 'إعدادات بوت تيليجرام المخصص للمالك' : 'Master Telegram Login Bot'}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                        2FA Engine
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'ar'
                        ? 'البوت المباشر المسؤول عن تفويض تسجيل الدخول وإرسال الأكواد الفورية لحساب تيليجرام الخاص بك.'
                        : 'Direct bot delivering one-time passcodes and 2FA authentication alerts.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all min-h-[44px]"
                  >
                    <Bot className="w-4 h-4 text-cyan-500" />
                    <span>@BotFather</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              <form onSubmit={handleSaveTelegramBot} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <span>{language === 'ar' ? 'رمز البوت السري (Bot Token):' : 'Telegram Bot Token:'}</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <span>{language === 'ar' ? 'معرف المحادثة المعتمد للمالك (Chat ID):' : 'Owner Chat ID:'}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={botChatId}
                      onChange={(e) => setBotChatId(e.target.value)}
                      placeholder="e.g. 123456789"
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* 2FA Toggle Checkbox */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    id="requireTelegram2FA"
                    checked={requireTelegram2FA}
                    onChange={(e) => setRequireTelegram2FA(e.target.checked)}
                    className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-600 cursor-pointer mt-0.5 shrink-0"
                  />
                  <label htmlFor="requireTelegram2FA" className="text-xs text-slate-800 dark:text-slate-200 cursor-pointer space-y-0.5">
                    <strong className="block font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'إلزام المصادقة الثنائية (2FA) عبر تيليجرام عند الدخول بالاسم وكلمة المرور' : 'Enforce Telegram 2FA on Password Login'}
                    </strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {language === 'ar'
                        ? 'عند تفعيل هذا الخيار، لن يكتمل الدخول بكلمة المرور وحدها دون تأكيد كود تيليجرام السري.'
                        : 'Requires a secondary Telegram OTP verification even when logging in with username and password.'}
                    </span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingBot}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] active:scale-95"
                  >
                    {isSavingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'حفظ إعدادات البوت والتحقق' : 'Save & Verify Bot Settings'}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Modal: Link Phone to Telegram Wizard */}
          {phoneToLink && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <LinkIcon className="w-4 h-4 text-cyan-500" />
                    <span>{language === 'ar' ? 'ربط الهاتف بتيليجرام للطوارئ' : 'Link Phone to Telegram'}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPhoneToLink(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <p className="font-mono font-bold text-slate-900 dark:text-white">
                    {maskPhoneNumber(phoneToLink.phone)}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    {language === 'ar'
                      ? 'أدخل Chat ID الخاص بحسابك في تيليجرام لتوجيه أكواد الدخول السريعة إليه عند طلب الدخول برقم الهاتف.'
                      : 'Enter your Telegram Chat ID to route verification codes when requesting phone login.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {language === 'ar' ? 'معرف المحادثة (Chat ID):' : 'Telegram Chat ID:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={wizardChatId}
                    onChange={(e) => setWizardChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPhoneToLink(null)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer min-h-[44px]"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmLinkPhoneToTelegram}
                    disabled={isLinkingPhone || !wizardChatId.trim()}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    {isLinkingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{language === 'ar' ? 'تأكيد الربط' : 'Confirm Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHONE & TELEGRAM FALLBACK AUTHENTICATOR                             */}
      {/* ========================================================================= */}
      {activeTab === 'phone_auth' && (
        <div className="animate-in fade-in duration-200">
          <PhoneAuthenticator />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECOVERY FLOW COMPONENT                                             */}
      {/* ========================================================================= */}
      {activeTab === 'recovery' && (
        <div className="animate-in fade-in duration-200">
          <RecoveryFlow />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MASTER ADMIN CREDENTIALS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'credentials' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 max-w-2xl animate-in fade-in duration-200">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{language === 'ar' ? 'بيانات المشرف المباشرة (Master Admin Credentials)' : 'Master Admin Credentials'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {language === 'ar'
                ? 'تعديل اسم المستخدم وكلمة المرور المباشرة لحساب المشرف الأساسي للوحة التحكم.'
                : 'Directly update the primary admin username and password.'}
            </p>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {language === 'ar' ? 'اسم المستخدم (Username):' : 'Username:'}
              </label>
              <input
                type="text"
                required
                value={masterUsername}
                onChange={(e) => setMasterUsername(e.target.value)}
                className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {language === 'ar' ? 'كلمة المرور (Password):' : 'Password:'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full ps-3.5 pe-12 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-1 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingCreds}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
              >
                {isSavingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                <span>{language === 'ar' ? 'حفظ بيانات الاعتماد' : 'Save Credentials'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
