import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Globe, 
  DollarSign, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  ExternalLink, 
  Building, 
  Lock, 
  HelpCircle,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SiteSettings, PaymentGatewaySettings, CustomPaymentMethod } from '../../types';
import { db, cleanFirestorePayload, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useLiveExchangeRates } from '../../utils/currencies';

interface AdminPaymentsProps {
  settings: SiteSettings;
  onUpdateSettings: (s: SiteSettings) => void;
}

export const AdminPayments: React.FC<AdminPaymentsProps> = ({
  settings,
  onUpdateSettings
}) => {
  const { language } = useLanguage();
  const { egpRate, isLive: isRatesLive, loading: isRatesLoading, refreshRates } = useLiveExchangeRates();

  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewaySettings>(() => {
    return settings?.paymentGateways || {
      cashEnabled: true,
      cashWalletNumber: '01012345678',
      cashWalletHolder: '',
      cashInstructionsAr: 'يتم التحويل على الرقم وتصوير شاشة الإيصال لإرفاقها في الخطوة التالية.',
      cashExchangeRateUsdToEgp: 50,
      airtmEnabled: true,
      airtmUsername: 'username',
      airtmInstructionsAr: 'يتم التحويل على حساب AIRTM الموضح والتقاط لقطة شاشة للإيصال.',
      airtmDirectLink: 'https://app.airtm.com/',
      paypalEnabled: true,
      paypalEmailOrLink: '',
      paypalInstructionsAr: 'يتم الدفع عبر حساب PayPal وإرفاق بيانات ومعرف المعاملة.',
      customMethods: []
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Method Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingCustomMethod, setEditingCustomMethod] = useState<CustomPaymentMethod | null>(null);

  // Form for custom payment method
  const [customForm, setCustomForm] = useState<Partial<CustomPaymentMethod>>({
    nameAr: '',
    nameEn: '',
    type: 'bank_transfer',
    accountNumber: '',
    accountName: '',
    instructionsAr: '',
    instructionsEn: '',
    region: 'all',
    enabled: true
  });

  useEffect(() => {
    if (settings?.paymentGateways) {
      setPaymentGateways(settings.paymentGateways);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        paymentGateways
      };

      const payload = cleanFirestorePayload(updatedSettings);
      await setDoc(doc(db, 'siteSettings', 'global'), payload, { merge: true });
      onUpdateSettings(updatedSettings);

      setFeedback({
        type: 'success',
        message: language === 'ar' ? 'تم حفظ وضبط بوابات وطرق الدفع بنجاح!' : 'Payment gateways saved successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to save payments:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'siteSettings/global');
      } catch {}
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save payments')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddCustom = () => {
    setEditingCustomMethod(null);
    setCustomForm({
      id: `custom_${Date.now()}`,
      nameAr: '',
      nameEn: '',
      type: 'bank_transfer',
      accountNumber: '',
      accountName: '',
      instructionsAr: '',
      instructionsEn: '',
      region: 'all',
      enabled: true
    });
    setIsCustomModalOpen(true);
  };

  const handleOpenEditCustom = (method: CustomPaymentMethod) => {
    setEditingCustomMethod(method);
    setCustomForm({ ...method });
    setIsCustomModalOpen(true);
  };

  const handleSaveCustomMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.nameAr?.trim() || !customForm.nameEn?.trim()) return;

    const currentMethods = paymentGateways.customMethods || [];
    let updatedList: CustomPaymentMethod[] = [];

    if (editingCustomMethod) {
      updatedList = currentMethods.map(m => m.id === editingCustomMethod.id ? (customForm as CustomPaymentMethod) : m);
    } else {
      updatedList = [...currentMethods, customForm as CustomPaymentMethod];
    }

    setPaymentGateways(prev => ({
      ...prev,
      customMethods: updatedList
    }));

    setIsCustomModalOpen(false);
  };

  const handleDeleteCustomMethod = (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف طريقة الدفع هذه؟' : 'Delete this payment method?')) return;
    setPaymentGateways(prev => ({
      ...prev,
      customMethods: (prev.customMethods || []).filter(m => m.id !== id)
    }));
  };

  const handleToggleCustomMethod = (id: string) => {
    setPaymentGateways(prev => ({
      ...prev,
      customMethods: (prev.customMethods || []).map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة طرق وبوابات الدفع والتحويل' : 'Payment Gateways & Transfer Settings'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'تكوين حسابات الدفع الرسمية (المحافظ الإلكترونية، حساب Airtm، بايبال) وإضافة بوابات مخصصة بضمان الأمان الكامل.'
              : 'Configure official payment channels (E-Wallets, Airtm, PayPal) and add custom accounts securely.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ إعدادات الدفع' : 'Save Payment Settings')}</span>
        </button>
      </div>

      {/* Security Assurance Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'نظام دفع وحسابات آمن 100%' : '100% Secure Official Integration'}
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {language === 'ar'
              ? 'يتم تخزين بيانات الحسابات وأرقام التحويل في قاعدة البيانات السحابية الآمنة، ولا يتم حفظ أي مفاتيح أو بيانات سرية في ملفات الموقع، مما يضمن أمان حساباتك وأموالك بالكامل.'
              : 'Payment details and transfer accounts are securely managed via verified Cloud Firestore. No secrets or credentials are hardcoded.'}
          </p>
        </div>
      </div>

      {/* Grid of Main Channels */}
      <div className="space-y-6">

        {/* 1. Egyptian E-Wallets (كاش وانستاباي) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? '🇪🇬 المحافظ الإلكترونية المصرية (فودافون كاش، اتصالات، أورنج، وي باي، InstaPay)' : '🇪🇬 Egyptian E-Wallets & InstaPay'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'تفعيل استقبال التحويلات بالجنيه المصري للمشترين داخل مصر' : 'Accept local Egyptian Pound wallet payments'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaymentGateways(p => ({ ...p, cashEnabled: !p.cashEnabled }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                paymentGateways.cashEnabled 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {paymentGateways.cashEnabled ? (language === 'ar' ? 'مفعل' : 'Enabled') : (language === 'ar' ? 'معطل' : 'Disabled')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Wallet Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'رقم المحفظة المعتمد للتحويل (كاش)' : 'Official Cash Wallet Phone Number'}
              </label>
              <input
                type="text"
                value={paymentGateways.cashWalletNumber || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, cashWalletNumber: e.target.value }))}
                placeholder="01012345678"
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            {/* Wallet Holder Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'اسم صاحب المحفظة (اختياري، يظهر للمشتري للتحقق)' : 'Wallet Holder Name (Optional)'}
              </label>
              <input
                type="text"
                value={paymentGateways.cashWalletHolder || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, cashWalletHolder: e.target.value }))}
                placeholder={language === 'ar' ? 'اسمك أو اسم المؤسسة المعتمد' : 'Your name or organization'}
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Exchange Rate USD to EGP */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 md:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {language === 'ar' ? 'سعر صرف الدولار مقابل الجنيه المصري (EGP)' : 'Exchange Rate (USD to EGP)'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {language === 'ar' ? 'تحديث تلقائي لحظي' : 'Live Auto-Sync'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar' 
                      ? `سعر السوق اللحظي الحالي: 1 دولار = ${egpRate.toFixed(2)} ج.م (يحدث تلقائياً مع ارتفاع أو انخفاض الدولار عالمياً ومصرفياً)`
                      : `Current market rate: 1 USD = ${egpRate.toFixed(2)} EGP (auto-updates with real-time currency shifts)`}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => refreshRates()}
                    disabled={isRatesLoading}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    title={language === 'ar' ? 'تحديث سعر الصرف الآن' : 'Refresh rate now'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRatesLoading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                    <span className="text-[11px]">{language === 'ar' ? 'تحديث السعر' : 'Refresh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentGateways(p => ({ ...p, cashAutoExchangeRate: p.cashAutoExchangeRate === false ? true : false }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer shadow-2xs"
                  >
                    {paymentGateways.cashAutoExchangeRate !== false ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-[11px] text-slate-700 dark:text-slate-200">
                      {paymentGateways.cashAutoExchangeRate !== false 
                        ? (language === 'ar' ? 'تلقائي (موصى به)' : 'Auto (Live)') 
                        : (language === 'ar' ? 'تحديد يدوي' : 'Manual')}
                    </span>
                  </button>
                </div>
              </div>

              {paymentGateways.cashAutoExchangeRate === false && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'ar' ? 'تحديد سعر صرف ثابت مخصص (جنيه لكل دولار):' : 'Custom Fixed Rate (EGP per 1 USD):'}
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.01"
                      value={paymentGateways.cashExchangeRateUsdToEgp || egpRate}
                      onChange={(e) => setPaymentGateways(p => ({ ...p, cashExchangeRateUsdToEgp: parseFloat(e.target.value) || egpRate }))}
                      className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                    <span className="absolute end-3 top-2 text-xs text-slate-500 font-mono">
                      EGP / 1 USD
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'تعليمات وإرشادات التحويل للمشتري' : 'Transfer Instructions for Customer'}
              </label>
              <textarea
                rows={2}
                value={paymentGateways.cashInstructionsAr || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, cashInstructionsAr: e.target.value }))}
                placeholder="يتم التحويل على الرقم وتصوير شاشة الإيصال لإرفاقها في الخطوة التالية."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 2. AIRTM Integration */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? '🌍 حساب AIRTM الرسمي' : '🌍 AIRTM Verified Account'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'استقبال التحويلات الدولية والمحلية عبر منصة AIRTM مباشرة' : 'Accept global payments via direct AIRTM username'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaymentGateways(p => ({ ...p, airtmEnabled: !p.airtmEnabled }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                paymentGateways.airtmEnabled 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {paymentGateways.airtmEnabled ? (language === 'ar' ? 'مفعل' : 'Enabled') : (language === 'ar' ? 'معطل' : 'Disabled')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Airtm Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'اسم الحساب في AIRTM للتحويل' : 'AIRTM Account Username'}
              </label>
              <input
                type="text"
                value={paymentGateways.airtmUsername || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, airtmUsername: e.target.value }))}
                placeholder="username"
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            {/* Direct Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'رابط منصة أو تحويل AIRTM' : 'AIRTM URL'}
              </label>
              <input
                type="text"
                value={paymentGateways.airtmDirectLink || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, airtmDirectLink: e.target.value }))}
                placeholder="https://app.airtm.com/"
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'تعليمات التحويل عبر AIRTM' : 'AIRTM Transfer Instructions'}
              </label>
              <textarea
                rows={2}
                value={paymentGateways.airtmInstructionsAr || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, airtmInstructionsAr: e.target.value }))}
                placeholder="يتم التحويل على حساب AIRTM الموضح والتقاط لقطة شاشة للإيصال."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 3. PayPal Integration */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'حساب PayPal المعتمد' : 'Verified PayPal Account'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'استقبال مدفوعات PayPal عبر البريد الإلكتروني أو رابط paypal.me' : 'Accept PayPal payments via email or paypal.me link'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPaymentGateways(p => ({ ...p, paypalEnabled: !p.paypalEnabled }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                paymentGateways.paypalEnabled 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {paymentGateways.paypalEnabled ? (language === 'ar' ? 'مفعل' : 'Enabled') : (language === 'ar' ? 'معطل' : 'Disabled')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* PayPal Email or Link */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'البريد الإلكتروني لحساب PayPal أو رابط paypal.me' : 'PayPal Email or paypal.me Link'}
              </label>
              <input
                type="text"
                value={paymentGateways.paypalEmailOrLink || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, paypalEmailOrLink: e.target.value }))}
                placeholder="your-account@domain.com or https://paypal.me/yourname"
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'تعليمات الدفع عبر PayPal' : 'PayPal Instructions'}
              </label>
              <textarea
                rows={2}
                value={paymentGateways.paypalInstructionsAr || ''}
                onChange={(e) => setPaymentGateways(p => ({ ...p, paypalInstructionsAr: e.target.value }))}
                placeholder="يتم الدفع عبر حساب PayPal وإرفاق بيانات ومعرف المعاملة."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 4. Custom Payment Methods (بوابات وحسابات مخصصة) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'طرق وحسابات الدفع المخصصة (حسابات بنكية، آيبان، USDT، وغيرها)' : 'Custom Payment Methods (Bank, IBAN, USDT)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'أضف أي طريقة دفع إضافية لتظهر لعملائك أثناء الشراء فوراً' : 'Add custom bank or payment accounts'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCustom}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة طريقة دفع' : 'Add Method'}</span>
            </button>
          </div>

          {/* List of Custom Methods */}
          <div className="space-y-3 pt-2">
            {(!paymentGateways.customMethods || paymentGateways.customMethods.length === 0) ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'لم تقم بإضافة أي طرق دفع مخصصة بعد. انقر على "إضافة طريقة دفع" لإنشاء طريقة جديدة.' : 'No custom payment methods configured.'}
              </div>
            ) : (
              paymentGateways.customMethods.map((method) => (
                <div 
                  key={method.id} 
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {language === 'ar' ? method.nameAr : method.nameEn}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {method.accountNumber || method.accountName || ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCustomMethod(method.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        method.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {method.enabled ? (language === 'ar' ? 'نشطة' : 'Active') : (language === 'ar' ? 'معطلة' : 'Disabled')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCustom(method)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomMethod(method.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Save Button at Bottom */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ كافة التغييرات' : 'Save All Changes')}</span>
        </button>
      </div>

      {/* Modal for Adding/Editing Custom Method */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#11131a] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingCustomMethod 
                ? (language === 'ar' ? 'تعديل طريقة الدفع' : 'Edit Payment Method') 
                : (language === 'ar' ? 'إضافة طريقة دفع جديدة' : 'Add New Payment Method')}
            </h3>

            {/* Quick Presets */}
            {!editingCustomMethod && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {language === 'ar' ? 'قوالب سريعة جاهزة للاختيار:' : 'Quick Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { 
                      labelAr: '🏦 تحويل بنكي / آيبان', 
                      nameAr: 'تحويل بنكي (IBAN)', 
                      nameEn: 'Bank Transfer (IBAN)', 
                      instructAr: 'يرجى التحويل إلى رقم الحساب والآيبان الموضح ورفع إشعار التحويل البنكي.', 
                      placeholder: 'EG... / SA...' 
                    },
                    { 
                      labelAr: '📱 محفظة إلكترونية إضافية', 
                      nameAr: 'محفظة إلكترونية إضافية (كاش / InstaPay)', 
                      nameEn: 'Additional E-Wallet', 
                      instructAr: 'يرجى التحويل على رقم المحفظة وإرفاق لقطة شاشة التحويل.', 
                      placeholder: '01xxxxxxxxx' 
                    },
                    { 
                      labelAr: '🪙 محفظة كريبتو (USDT)', 
                      nameAr: 'محفظة كريبتو USDT (TRC20)', 
                      nameEn: 'Crypto USDT (TRC20)', 
                      instructAr: 'يرجى التحويل عبر شبكة TRC-20 وإرفاق رمز المعاملة هاش TxID مع لقطة الشاشة.', 
                      placeholder: 'T...' 
                    },
                    { 
                      labelAr: '🌐 حساب Airtm بديل', 
                      nameAr: 'حساب AIRTM بديل', 
                      nameEn: 'Alternative AIRTM', 
                      instructAr: 'يرجى التحويل على اسم مستخدم Airtm الموضح وإرفاق صورة الإيصال.', 
                      placeholder: '@username' 
                    },
                    { 
                      labelAr: '💳 حساب PayPal بديل', 
                      nameAr: 'حساب PayPal بديل', 
                      nameEn: 'Alternative PayPal', 
                      instructAr: 'يرجى الدفع على حساب PayPal الموضح وإرفاق بيانات العملية.', 
                      placeholder: 'paypal@domain.com' 
                    },
                    { 
                      labelAr: '💵 ويسترن يونيون', 
                      nameAr: 'تحويل ويسترن يونيون (Western Union)', 
                      nameEn: 'Western Union Transfer', 
                      instructAr: 'يرجى التحويل بالاسم وبيانات الهوية الموضحة وتصوير إيصال MTCN.', 
                      placeholder: 'اسم المستفيد الكامل والمدينة' 
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomForm({
                        ...customForm,
                        nameAr: preset.nameAr,
                        nameEn: preset.nameEn,
                        instructionsAr: preset.instructAr,
                        region: 'all'
                      })}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 font-semibold transition-colors cursor-pointer"
                    >
                      {preset.labelAr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCustomMethod} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الاسم بالعربية *' : 'Name in Arabic *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.nameAr || ''}
                    onChange={(e) => setCustomForm({ ...customForm, nameAr: e.target.value })}
                    placeholder="مثال: تحويل بنكي (IBAN)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الاسم بالإنجليزية *' : 'Name in English *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.nameEn || ''}
                    onChange={(e) => setCustomForm({ ...customForm, nameEn: e.target.value })}
                    placeholder="e.g. Bank Transfer (IBAN)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'رقم الحساب / الآيبان / العنوان' : 'Account Number / IBAN'}
                  </label>
                  <input
                    type="text"
                    value={customForm.accountNumber || ''}
                    onChange={(e) => setCustomForm({ ...customForm, accountNumber: e.target.value })}
                    placeholder="EG12000000000000..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'اسم المستفيد' : 'Beneficiary Name'}
                  </label>
                  <input
                    type="text"
                    value={customForm.accountName || ''}
                    onChange={(e) => setCustomForm({ ...customForm, accountName: e.target.value })}
                    placeholder="Name on account"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'النطاق الجغرافي للظهور' : 'Target Region'}
                </label>
                <select
                  value={customForm.region || 'all'}
                  onChange={(e) => setCustomForm({ ...customForm, region: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                >
                  <option value="all">{language === 'ar' ? 'متاح لجميع العملاء (عالمي)' : 'All Customers (Global)'}</option>
                  <option value="egypt">{language === 'ar' ? 'مصر فقط' : 'Egypt Only'}</option>
                  <option value="nonegypt">{language === 'ar' ? 'خارج مصر فقط' : 'Outside Egypt Only'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'تعليمات وإرشادات التحويل' : 'Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={customForm.instructionsAr || ''}
                  onChange={(e) => setCustomForm({ ...customForm, instructionsAr: e.target.value })}
                  placeholder="تعليمات الدفع والتحويل تظهر للمشتري..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  {language === 'ar' ? 'تأكيد وحفظ' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
