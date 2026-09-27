import React, { useState } from 'react';
import { 
  Globe, 
  Trash2, 
  Info, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Lock, 
  X, 
  Layers, 
  Eye, 
  UploadCloud,
  FileImage,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SiteSettings } from '../../types';
import { ImageUploadField } from './ImageUploadField';

interface AdminTabAndFaviconSettingsProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export const AdminTabAndFaviconSettings: React.FC<AdminTabAndFaviconSettingsProps> = ({
  formData,
  setFormData
}) => {
  const { language } = useLanguage();
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>(language === 'ar' ? 'ar' : 'en');
  const [removedAlert, setRemovedAlert] = useState(false);

  // Compute the live tab title preview based on settings
  const computeTitle = (targetLang: 'ar' | 'en') => {
    const brandAr = formData.brandNameAr || 'إبراهيم الشريف';
    const brandEn = formData.brandNameEn || 'Ibrahim Elshrief';
    const mode = formData.tabTitleMode || 'both';

    if (mode === 'ar') {
      return brandAr;
    }
    if (mode === 'en') {
      return brandEn;
    }
    if (mode === 'custom') {
      const custom = targetLang === 'ar'
        ? (formData.customTabTitleAr || formData.customTabTitleEn)
        : (formData.customTabTitleEn || formData.customTabTitleAr);
      return custom?.trim() || (targetLang === 'ar' ? `${brandAr} | ${brandEn}` : `${brandEn} | ${brandAr}`);
    }
    // 'both' (default)
    return targetLang === 'ar' ? `${brandAr} | ${brandEn}` : `${brandEn} | ${brandAr}`;
  };

  const handleClearFavicon = () => {
    setFormData(prev => ({
      ...prev,
      faviconUrl: ''
    }));
    setRemovedAlert(true);
    setTimeout(() => setRemovedAlert(false), 4000);
  };

  const activeTitle = computeTitle(previewLang);
  const defaultFaviconSvg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%2310b981'/><text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' fill='white' font-size='56' font-family='sans-serif' font-weight='800'>⚡</text></svg>";
  const currentFavicon = formData.faviconUrl?.trim() ? formData.faviconUrl : defaultFaviconSvg;
  const isCustomFavicon = Boolean(formData.faviconUrl?.trim());

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'اسم التاب في المتصفح وأيقونة الموقع (Favicon & Tab Title)' : 'Browser Tab Title & Website Favicon'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {language === 'ar' ? 'تحكم كامل' : 'Full Control'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar' 
                ? 'تحكم في العنوان الذي يظهر في شريط لسان المتصفح، وضبط أيقونة الموقع (Favicon) مع إرشادات المقاسات وإمكانية حذفها أو استبدالها.' 
                : 'Configure the browser tab text, upload/manage the favicon icon, view recommended dimensions, or reset to default.'}
            </p>
          </div>
        </div>

        {/* Live Browser Tab Preview Trigger */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">
            {language === 'ar' ? 'معاينة لسان المتصفح:' : 'Tab Preview:'}
          </span>
          <button
            type="button"
            onClick={() => setPreviewLang('ar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              previewLang === 'ar'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            عربي
          </button>
          <button
            type="button"
            onClick={() => setPreviewLang('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              previewLang === 'en'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Realistic Browser Window & Tab Mockup */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ar' ? 'معاينة حية ومطابقة للمتصفح (Chrome / Safari / Firefox):' : 'Live Browser Tab Representation:'}</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {language === 'ar' ? `المعروض حالياً بلغة: ${previewLang === 'ar' ? 'العربية' : 'الإنجليزية'}` : `Currently previewing: ${previewLang.toUpperCase()}`}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-sm">
          {/* Browser Top Chrome */}
          <div className="px-4 pt-3 pb-0 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 flex items-center gap-3">
            {/* Window controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
            </div>

            {/* Browser Active Tab */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-t-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-t border-x border-slate-300 dark:border-slate-700/80 shadow-xs max-w-sm sm:max-w-md">
              <div className="w-4 h-4 shrink-0 rounded overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <img 
                  src={currentFavicon} 
                  alt="Favicon" 
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    // Fallback to default SVG if custom URL breaks
                    (e.target as HTMLImageElement).src = defaultFaviconSvg;
                  }}
                />
              </div>
              <span className="text-xs font-semibold truncate select-none">
                {activeTitle}
              </span>
              <button 
                type="button" 
                aria-label="Close tab preview"
                className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 ml-auto rtl:mr-auto rtl:ml-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Plus new tab icon */}
            <div className="text-slate-400 text-sm font-light px-1 select-none">+</div>
          </div>

          {/* Browser Address Bar */}
          <div className="px-4 py-2 bg-white dark:bg-slate-800/90 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">https://</span>
              <span>ibrahim-elshrief.com/</span>
            </div>
            <div className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {isCustomFavicon ? (language === 'ar' ? 'أيقونة مخصصة' : 'Custom Icon') : (language === 'ar' ? 'أيقونة افتراضية' : 'Default Icon')}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          PART 1: TAB TITLE CONTROLS (التحكم في اسم التاب)
         ------------------------------------------------------------- */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ar' ? '1. طريقة عرض اسم التاب في المتصفح:' : '1. Browser Tab Title Display Mode:'}</span>
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'ar' 
              ? 'اختر الصيغة التي تناسبك: ظهور الاسم بالعربية فقط، أو بالإنجليزية فقط، أو الاثنين معاً، أو تحديد نص مخصص بالكامل.' 
              : 'Select how you want your site tab title to appear in user browsers.'}
          </p>
        </div>

        {/* 4 Mode Radio Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Mode 1: Both (عربي + إنجليزي) */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, tabTitleMode: 'both' })}
            className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
              (formData.tabTitleMode || 'both') === 'both'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'الاثنان معاً (عربي + إنجليزي)' : 'Both (Arabic & English)'}
              </span>
              {(formData.tabTitleMode || 'both') === 'both' && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {formData.brandNameAr || 'إبراهيم الشريف'} | {formData.brandNameEn || 'Ibrahim Elshrief'}
            </p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold self-start">
              {language === 'ar' ? 'الوضع الافتراضي' : 'Default'}
            </span>
          </button>

          {/* Mode 2: Arabic Only */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, tabTitleMode: 'ar' })}
            className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
              formData.tabTitleMode === 'ar'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'الاسم بالعربي فقط' : 'Arabic Name Only'}
              </span>
              {formData.tabTitleMode === 'ar' && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold" dir="rtl">
              {formData.brandNameAr || 'إبراهيم الشريف'}
            </p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold self-start">
              {language === 'ar' ? 'للهوية العربية فقط' : 'Arabic Only'}
            </span>
          </button>

          {/* Mode 3: English Only */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, tabTitleMode: 'en' })}
            className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
              formData.tabTitleMode === 'en'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'الاسم بالإنجليزي فقط' : 'English Name Only'}
              </span>
              {formData.tabTitleMode === 'en' && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold" dir="ltr">
              {formData.brandNameEn || 'Ibrahim Elshrief'}
            </p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold self-start">
              {language === 'ar' ? 'للهوية الدولية' : 'International'}
            </span>
          </button>

          {/* Mode 4: Custom (نص مخصص بالكامل) */}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, tabTitleMode: 'custom' })}
            className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
              formData.tabTitleMode === 'custom'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'نص مخصص تماماً' : 'Completely Custom'}
              </span>
              {formData.tabTitleMode === 'custom' && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'كتابة اسم مخصص بحرية تامة' : 'Write any title you prefer freely'}
            </p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold self-start">
              {language === 'ar' ? 'تخصيص حر' : 'Flexible'}
            </span>
          </button>

        </div>

        {/* Custom Tab Title Inputs (Visible only when 'custom' mode is selected) */}
        {formData.tabTitleMode === 'custom' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'إدخال اسم التاب المخصص (يمكنك كتابة أي نص تريده للموقع):' : 'Enter Custom Browser Tab Titles:'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'اسم التاب المخصص (بالعربية)' : 'Custom Tab Title (Arabic)'}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder={language === 'ar' ? 'مثال: منصة إبراهيم الشريف | بحوث ومؤلفات ومتجر رقمي' : 'e.g. Ibrahim Elshrief | Works & Store'}
                  value={formData.customTabTitleAr || ''}
                  onChange={(e) => setFormData({ ...formData, customTabTitleAr: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'اسم التاب المخصص (بالإنجليزية)' : 'Custom Tab Title (English)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Ibrahim Elshrief | Official Research, Books & Store"
                  value={formData.customTabTitleEn || ''}
                  onChange={(e) => setFormData({ ...formData, customTabTitleEn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {language === 'ar' 
                ? '💡 نصيحة: إذا ملأت أحد الحقلين وتركت الآخر فارغاً، سيستخدم الموقع العنوان المتوفر تلقائياً في كلا اللغتين.' 
                : '💡 Tip: If you fill one language, it will automatically fallback to that title if the other is empty.'}
            </p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          PART 2: FAVICON CONTROLS (أيقونة الموقع)
         ------------------------------------------------------------- */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'ar' ? '2. أيقونة الموقع في المتصفح (FAVICON):' : '2. Website Favicon Icon:'}</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'ar' 
                ? 'الأيقونة الرمزية الصغيرة التي تظهر بجانب اسم التاب في المتصفح وقائمة المفضلة واختصارات الشاشة الرئيسية.' 
                : 'The small emblem displayed beside the tab title, bookmarks, and mobile home screen shortcuts.'}
            </p>
          </div>

          {/* Favicon Status Pill */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              isCustomFavicon
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCustomFavicon ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{isCustomFavicon ? (language === 'ar' ? 'أيقونة مخصصة مرفوعة' : 'Custom Favicon Active') : (language === 'ar' ? 'الأيقونة الافتراضية (⚡)' : 'Default Emblem (⚡)')}</span>
            </span>
          </div>
        </div>

        {/* Removed Notification Feedback */}
        {removedAlert && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {language === 'ar' 
                  ? 'تم إلغاء وحذف أيقونة الـ Favicon بنجاح! سيعود الموقع للأيقونة الافتراضية بمجرد الضغط على (حفظ كافة الإعدادات).' 
                  : 'Favicon removed successfully! The site will revert to the default icon upon clicking Save.'}
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setRemovedAlert(false)}
              className="text-amber-500 hover:text-amber-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* DETAILED FAVICON DIMENSIONS & SPECS GUIDE FOR THE OWNER (توضيح أبعاد الأيقونة للمالك) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-teal-500/10 border border-blue-500/25 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Info className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-extrabold text-blue-950 dark:text-blue-200">
              {language === 'ar' ? '📌 دليل ومواصفات الأبعاد المثالية لأيقونة الموقع (Favicon Guide):' : '📌 Recommended Dimensions & Specifications Guide:'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            {/* Spec 1: Standard Size */}
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-blue-200/60 dark:border-blue-800/60">
              <span className="block font-extrabold text-blue-900 dark:text-blue-300">
                {language === 'ar' ? 'المقاس القياسي لألسنة المتصفح:' : 'Standard Browser Tab:'}
              </span>
              <span className="block text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs mt-0.5">
                32 × 32 بكسل (أو 16 × 16)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {language === 'ar' ? 'المقاس الكلاسيكي لمعظم متصفحات الكمبيوتر' : 'Standard resolution for desktop tabs'}
              </span>
            </div>

            {/* Spec 2: Retina / High DPI */}
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-blue-200/60 dark:border-blue-800/60">
              <span className="block font-extrabold text-blue-900 dark:text-blue-300">
                {language === 'ar' ? 'المقاس فائق الدقة (شاشات Retina):' : 'Retina & High-DPI Displays:'}
              </span>
              <span className="block text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs mt-0.5">
                64 × 64 بكسل
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {language === 'ar' ? 'لضمان وضوح فائق على شاشات Mac والهواتف' : 'Sharpest display on 4K & Retina screens'}
              </span>
            </div>

            {/* Spec 3: Mobile & PWA */}
            <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-blue-200/60 dark:border-blue-800/60">
              <span className="block font-extrabold text-blue-900 dark:text-blue-300">
                {language === 'ar' ? 'أيقونة الهواتف وتطبيقات الويب (PWA):' : 'Mobile Shortcut & PWA Icon:'}
              </span>
              <span className="block text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs mt-0.5">
                192 × 192 (أو 512 × 512)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {language === 'ar' ? 'عند إضافة الموقع للشاشة الرئيسية بالهاتف' : 'Used when bookmarked to mobile screen'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 dark:text-slate-300 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span><strong>{language === 'ar' ? 'نسبة الأبعاد:' : 'Aspect Ratio:'}</strong> 1:1 مربعة تماماً (العرض مساوٍ للارتفاع).</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span><strong>{language === 'ar' ? 'الصيغة الموصى بها:' : 'Recommended Format:'}</strong> PNG بخلفية شفافة (Transparent)، أو SVG أو ICO أو WebP.</span>
            </div>
          </div>
        </div>

        {/* Live Favicon Preview & Clear Action */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Multiple scale previews */}
            <div className="flex items-end gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              {/* 32x32 representation */}
              <div className="text-center space-y-1">
                <div className="w-8 h-8 rounded border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={currentFavicon} 
                    alt="32x32 Favicon Preview" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultFaviconSvg;
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 block">32x32</span>
              </div>

              {/* 48x48 representation */}
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={currentFavicon} 
                    alt="48x48 Favicon Preview" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultFaviconSvg;
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 block">48x48</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {isCustomFavicon 
                  ? (language === 'ar' ? 'الأيقونة الحالية المخصصة' : 'Active Custom Favicon')
                  : (language === 'ar' ? 'الأيقونة الافتراضية المفعلة للموقع' : 'Default Platform Favicon')}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isCustomFavicon
                  ? (language === 'ar' ? 'يتم تطبيق هذه الأيقونة تلقائياً على كافة صفحات وزوار المنصة.' : 'This icon is applied dynamically to all browser tabs.')
                  : (language === 'ar' ? 'يستخدم الموقع رمز المنصة الافتراضي ⚡ لعدم رفع أيقونة مخصصة.' : 'Using the default emblem ⚡ since no custom icon is set.')}
              </p>
            </div>
          </div>

          {/* Clear / Delete Favicon Button (وكمان لو عاوز يلغيها يلغيها) */}
          {isCustomFavicon && (
            <button
              type="button"
              onClick={handleClearFavicon}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إلغاء وحذف أيقونة الموقع (Favicon)' : 'Remove & Reset Favicon'}</span>
            </button>
          )}
        </div>

        {/* Upload / Enter Favicon Tool */}
        <div className="space-y-2">
          <ImageUploadField
            value={formData.faviconUrl || ''}
            onChange={(url) => setFormData({ ...formData, faviconUrl: url })}
            aspectRatio="square"
            labelAr="رفع أو تغيير أيقونة الموقع (Favicon)"
            labelEn="Upload or Change Website Favicon"
            hintAr="اختر صورة مربعة (يفضل 32×32 أو 64×64 بكسل بصيغة PNG أو ICO أو SVG). يتم ضغطها تلقائياً وحفظها بأعلى جودة."
            hintEn="Select a square icon (recommended 32x32 or 64x64 px in PNG, ICO or SVG). Optimized automatically."
          />
        </div>

      </div>

    </div>
  );
};
