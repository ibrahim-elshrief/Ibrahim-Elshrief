import React, { useState } from 'react';
import { 
  Phone, 
  Globe, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Move, 
  Star, 
  X, 
  Sparkles,
  MessageCircle,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { TelegramIcon } from '../icons/TelegramIcon';
import { FacebookIcon, MessengerIcon } from '../icons/FacebookIcon';
import { XIcon } from '../icons/XIcon';
import { useLanguage } from '../../context/LanguageContext';
import { SiteSettings, FloatingContactConfig, FloatingContactChannel, FloatingContactPosition } from '../../types';
import { db, cleanFirestorePayload } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface AdminQuickConnectProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
}

export const AdminQuickConnect: React.FC<AdminQuickConnectProps> = ({
  settings,
  onUpdateSettings
}) => {
  const { language } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize form state from settings or standard defaults
  const [config, setConfig] = useState<FloatingContactConfig>(() => {
    if (settings.floatingContact) {
      return {
        enabled: settings.floatingContact.enabled !== false,
        position: settings.floatingContact.position || 'bottom-right',
        primaryChannelId: settings.floatingContact.primaryChannelId || '',
        badgeTextAr: settings.floatingContact.badgeTextAr || 'تواصل معنا مباشرة',
        badgeTextEn: settings.floatingContact.badgeTextEn || 'Direct Chat',
        channels: settings.floatingContact.channels?.length
          ? settings.floatingContact.channels
          : [
              {
                id: 'fc-wa',
                type: 'whatsapp',
                titleAr: 'محادثة واتساب فورية',
                titleEn: 'WhatsApp Direct Chat',
                value: '+20123456789',
                isPrimary: true,
                enabled: true,
                color: '#25D366'
              },
              {
                id: 'fc-tg',
                type: 'telegram',
                titleAr: 'المراسلة عبر تيليجرام',
                titleEn: 'Telegram Direct Chat',
                value: 'https://t.me/username',
                isPrimary: false,
                enabled: true,
                color: '#24A1DE'
              },
              {
                id: 'fc-tg-group',
                type: 'telegram_group',
                titleAr: 'مجموعة تيليجرام الرسمية',
                titleEn: 'Telegram Community Group',
                value: 'https://t.me/group_invite',
                isPrimary: false,
                enabled: true,
                color: '#229ED9'
              },
              {
                id: 'fc-fb',
                type: 'facebook',
                titleAr: 'الصفحة الرسمية على فيسبوك',
                titleEn: 'Facebook Official Page',
                value: 'https://facebook.com/yourpage',
                isPrimary: false,
                enabled: true,
                color: '#1877F2'
              }
            ]
      };
    }

    return {
      enabled: true,
      position: 'bottom-right',
      primaryChannelId: 'fc-wa',
      badgeTextAr: 'تواصل معنا مباشرة',
      badgeTextEn: 'Direct Chat',
      channels: [
        {
          id: 'fc-wa',
          type: 'whatsapp',
          titleAr: 'محادثة واتساب فورية',
          titleEn: 'WhatsApp Direct Chat',
          value: '+20123456789',
          isPrimary: true,
          enabled: true,
          color: '#25D366'
        },
        {
          id: 'fc-tg',
          type: 'telegram',
          titleAr: 'المراسلة عبر تيليجرام',
          titleEn: 'Telegram Direct Chat',
          value: 'https://t.me/username',
          isPrimary: false,
          enabled: true,
          color: '#24A1DE'
        }
      ]
    };
  });

  // Simulator preview hover state
  const [simHover, setSimHover] = useState(false);

  // Set primary channel
  const handleSetPrimary = (channelId: string) => {
    setConfig((prev) => ({
      ...prev,
      primaryChannelId: channelId,
      channels: prev.channels.map((ch) => ({
        ...ch,
        isPrimary: ch.id === channelId
      }))
    }));
  };

  // Add a new direct contact channel
  const handleAddChannel = (type: FloatingContactChannel['type']) => {
    let titleAr = 'وسيلة تواصل جديدة';
    let titleEn = 'New Contact Channel';
    let defaultColor = '#10b981';

    switch (type) {
      case 'whatsapp':
        titleAr = 'محادثة واتساب فورية';
        titleEn = 'WhatsApp Direct Chat';
        defaultColor = '#25D366';
        break;
      case 'telegram':
        titleAr = 'المراسلة عبر تيليجرام';
        titleEn = 'Telegram Direct Chat';
        defaultColor = '#24A1DE';
        break;
      case 'telegram_group':
        titleAr = 'مجموعة تيليجرام الرسمية';
        titleEn = 'Telegram Community Group';
        defaultColor = '#229ED9';
        break;
      case 'facebook':
        titleAr = 'الصفحة الرسمية على فيسبوك';
        titleEn = 'Facebook Page';
        defaultColor = '#1877F2';
        break;
      case 'messenger':
        titleAr = 'المراسلة عبر ماسنجر';
        titleEn = 'Facebook Messenger';
        defaultColor = '#0084FF';
        break;
      case 'instagram':
        titleAr = 'حساب إنستغرام';
        titleEn = 'Instagram Profile';
        defaultColor = '#E1306C';
        break;
      case 'x':
        titleAr = 'حساب منصة إكس';
        titleEn = 'X Profile';
        defaultColor = '#0f1419';
        break;
      case 'phone':
        titleAr = 'اتصال هاتفي مباشر';
        titleEn = 'Direct Phone Call';
        defaultColor = '#059669';
        break;
      default:
        titleAr = 'رابط تواصل مخصص';
        titleEn = 'Custom Channel';
        defaultColor = '#4f46e5';
    }

    const newChannel: FloatingContactChannel = {
      id: `fc-${Date.now()}`,
      type,
      titleAr,
      titleEn,
      value: '',
      isPrimary: config.channels.length === 0,
      enabled: true,
      color: defaultColor
    };

    setConfig((prev) => ({
      ...prev,
      channels: [...prev.channels, newChannel],
      primaryChannelId: prev.channels.length === 0 ? newChannel.id : prev.primaryChannelId
    }));
  };

  // Remove channel
  const handleRemoveChannel = (id: string) => {
    setConfig((prev) => {
      const remaining = prev.channels.filter((ch) => ch.id !== id);
      const isPrimaryDeleted = prev.primaryChannelId === id;
      return {
        ...prev,
        channels: remaining,
        primaryChannelId: isPrimaryDeleted && remaining.length > 0 ? remaining[0].id : prev.primaryChannelId
      };
    });
  };

  // Update specific channel field
  const handleUpdateChannel = (id: string, updates: Partial<FloatingContactChannel>) => {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.map((ch) => (ch.id === id ? { ...ch, ...updates } : ch))
    }));
  };

  // Save to Firestore & Parent State
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        floatingContact: config
      };

      const settingsRef = doc(db, 'siteSettings', 'global');
      await updateDoc(settingsRef, cleanFirestorePayload({
        floatingContact: config
      }));

      onUpdateSettings(updatedSettings);

      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? 'تم حفظ إعدادات قنوات التواصل المباشر بنجاح'
          : 'Floating direct contact settings saved successfully!'
      });
    } catch (err: any) {
      console.error('Failed to save floating contact settings:', err);
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'تعذّر حفظ الإعدادات، يُرجى إعادة المحاولة لاحقاً.' : 'Failed to save settings.')
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Helper for authentic brand icons
  const renderChannelBrandIcon = (type: string, className = 'w-5 h-5 text-white') => {
    switch (type) {
      case 'whatsapp':
        return <WhatsAppIcon className={className} />;
      case 'telegram':
      case 'telegram_group':
        return <TelegramIcon className={`${className} -ml-0.5 mt-0.5`} />;
      case 'facebook':
        return <FacebookIcon className={className} />;
      case 'messenger':
        return <MessengerIcon className={className} />;
      case 'phone':
        return <Phone className={className} />;
      case 'instagram':
        return <Instagram className={className} />;
      case 'x':
        return <XIcon className={className} />;
      default:
        return <Globe className={className} />;
    }
  };

  const enabledChannels = config.channels.filter((c) => c.enabled && c.value.trim());
  const activePrimary = config.channels.find((c) => c.id === config.primaryChannelId || c.isPrimary) || enabledChannels[0] || config.channels[0];
  const activeSecondary = enabledChannels.filter((c) => c.id !== activePrimary?.id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto admin-scope">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <MessageCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'أزرار التواصل المباشر السريعة' : 'Floating Direct Quick Connect'}</span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {language === 'ar' ? 'الأيقونة العائمة' : 'Floating Action'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {language === 'ar' 
              ? 'إدارة وتخصيص قنوات التواصل المباشر مع الزوار والباحثين (واتساب، المراسلة عبر تيليجرام، مجموعات النقاش، والمكالمات الهاتفية)، مع ضبط موضع الأيقونة العائمة على الشاشة واختيار القناة الرئيسية المعتمدة.'
              : 'Register direct real-time communication channels (Telegram chat/group, WhatsApp, Facebook, phone) with full control over corner positioning and primary upfront channel.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? (language === 'ar' ? 'جارٍ حفظ التغييرات...' : 'Saving...') : (language === 'ar' ? 'حفظ إعدادات التواصل المباشر' : 'Save Floating Connect')}</span>
        </button>
      </div>

      {/* Master Toggle & Screen Placement */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'تفعيل أيقونة التواصل المباشر العائمة في واجهة الموقع' : 'Enable Floating Quick Connect on Website'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar' 
                ? 'إظهار الزر التفاعلي العائم في زاوية الشاشة لتمكين الزوار من المراسلة والتواصل المباشر بنقرة واحدة.' 
                : 'Display the floating action button to allow instant visitor messaging.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Screen Corner Placement Selector (بالعربية الفصحى) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Move className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'موضع الأيقونة العائمة على الشاشة:' : 'Floating Widget Screen Corner:'}</span>
            </label>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {config.position === 'bottom-right' && (language === 'ar' ? 'أسفل اليمين (الموضع المعتاد)' : 'Bottom Right (Standard)')}
              {config.position === 'bottom-left' && (language === 'ar' ? 'أسفل اليسار' : 'Bottom Left')}
              {config.position === 'top-right' && (language === 'ar' ? 'أعلى اليمين' : 'Top Right')}
              {config.position === 'top-left' && (language === 'ar' ? 'أعلى اليسار' : 'Top Left')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'bottom-right' as FloatingContactPosition, labelAr: 'أسفل اليمين', labelEn: 'Bottom Right', icon: '↘' },
              { id: 'bottom-left' as FloatingContactPosition, labelAr: 'أسفل اليسار', labelEn: 'Bottom Left', icon: '↙' },
              { id: 'top-right' as FloatingContactPosition, labelAr: 'أعلى اليمين', labelEn: 'Top Right', icon: '↗' },
              { id: 'top-left' as FloatingContactPosition, labelAr: 'أعلى اليسار', labelEn: 'Top Left', icon: '↖' }
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setConfig({ ...config, position: pos.id })}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  config.position === pos.id
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs scale-102'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-lg">{pos.icon}</span>
                <span className="text-xs font-semibold">{language === 'ar' ? pos.labelAr : pos.labelEn}</span>
                {config.position === pos.id && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                    {language === 'ar' ? 'الموضع المختار' : 'Selected'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Welcome Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'العنوان التوضيحي للأيقونة (باللغة العربية)' : 'Welcome Label (Arabic)'}
            </label>
            <input
              type="text"
              value={config.badgeTextAr || ''}
              onChange={(e) => setConfig({ ...config, badgeTextAr: e.target.value })}
              placeholder="تواصل مباشر مع المؤلف"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'العنوان التوضيحي للأيقونة (باللغة الإنجليزية)' : 'Welcome Label (English)'}
            </label>
            <input
              type="text"
              value={config.badgeTextEn || ''}
              onChange={(e) => setConfig({ ...config, badgeTextEn: e.target.value })}
              placeholder="Direct Chat with Author"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Interactive Simulator & Live Preview */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">
              {language === 'ar' ? 'محاكي المعاينة المباشرة للأيقونة العائمة' : 'Live Interactive Simulator'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {language === 'ar' ? 'مرّر مؤشر الفأرة فوق الأيقونة لمعاينة ظهور وسائل التواصل بالحجم الكامل' : 'Hover over the button to test full-size expansion'}
          </span>
        </div>

        {/* Simulated Browser Viewport */}
        <div className="relative h-64 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col justify-between p-4">
          <div className="flex items-center justify-between opacity-50 text-[10px] font-mono border-b border-white/10 pb-2">
            <span>https://mohamed-alhabib.com</span>
            <span>{language === 'ar' ? 'واجهة الموقع الرئيسية' : 'Website View'}</span>
          </div>

          <div className="text-center text-xs text-slate-500 py-6">
            <p>{language === 'ar' ? 'مساحة محتوى الصفحة...' : 'Homepage Content Layout...'}</p>
          </div>

          {/* Simulated Floating Widget */}
          <div 
            onMouseEnter={() => setSimHover(true)}
            onMouseLeave={() => setSimHover(false)}
            className={`absolute ${
              config.position === 'bottom-right' ? 'bottom-4 right-4' :
              config.position === 'bottom-left' ? 'bottom-4 left-4' :
              config.position === 'top-right' ? 'top-10 right-4' :
              'top-10 left-4'
            } flex flex-col items-center cursor-pointer select-none`}
          >
            {/* Expanded items on hover in simulator - EXACT SAME FULL SIZE with spring animation */}
            <AnimatePresence>
              {simHover && activeSecondary.length > 0 && (
                <div className={`flex flex-col gap-2.5 ${
                  config.position.startsWith('top') ? 'order-2 mt-2' : 'order-1 mb-2.5'
                }`}>
                  {activeSecondary.map((ch, index) => {
                    const isTop = config.position.startsWith('top');
                    const dist = isTop ? index : (activeSecondary.length - 1 - index);
                    const startY = isTop ? -((dist + 1) * 20) : ((dist + 1) * 20);

                    return (
                      <motion.div 
                        key={ch.id} 
                        initial={{ opacity: 0, scale: 0.2, y: startY }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.2, y: startY, transition: { duration: 0.15 } }}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 24,
                          mass: 0.7,
                          delay: dist * 0.05
                        }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xl border border-white/30 cursor-pointer"
                        style={{ backgroundColor: ch.color || (ch.type === 'telegram' ? '#24A1DE' : '#10b981') }}
                        title={language === 'ar' ? ch.titleAr : ch.titleEn}
                      >
                        {renderChannelBrandIcon(ch.type, 'w-5 h-5 text-white')}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            {/* Primary Button in simulator */}
            <div className={`relative ${config.position.startsWith('top') ? 'order-1' : 'order-2'}`}>
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                animate={{ scale: simHover ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xl border border-white/30 cursor-pointer"
                style={{ backgroundColor: activePrimary?.color || '#25D366' }}
                title={language === 'ar' ? activePrimary?.titleAr : activePrimary?.titleEn}
              >
                {renderChannelBrandIcon(activePrimary?.type || 'whatsapp', 'w-5 h-5 text-white')}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Channels List & Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'ar' ? 'قنوات التواصل المباشر المسجلة' : 'Registered Direct Channels'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold">
                {config.channels.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar' 
                ? 'انقر على رمز النجمة (★) لتعيين القناة لتكون الأيقونة الرئيسية الظاهرة أولاً على الشاشة، وتظهر باقي القنوات كاملة عند التمرير.'
                : 'Click the star (★) to set which channel is permanently visible upfront.'}
            </p>
          </div>

          {/* Quick Add Buttons with Authentic Icons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 me-1">
              {language === 'ar' ? '+ إضافة قناة تواصل:' : '+ Add Channel:'}
            </span>
            <button
              type="button"
              onClick={() => handleAddChannel('whatsapp')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              <span>واتساب</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('telegram')}
              className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TelegramIcon className="w-4 h-4 text-[#24A1DE]" />
              <span>محادثة تيليجرام</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('telegram_group')}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
              <span>مجموعة تيليجرام</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('facebook')}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
              <span>فيسبوك</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('instagram')}
              className="px-3 py-1.5 rounded-xl bg-pink-50 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Instagram className="w-4 h-4 text-[#E1306C]" />
              <span>إنستغرام</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('x')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <XIcon className="w-3.5 h-3.5" />
              <span>منصة إكس</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('phone')}
              className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>اتصال هاتفي</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddChannel('custom')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>رابط مخصص</span>
            </button>
          </div>
        </div>

        {/* Channel Cards */}
        <div className="space-y-4">
          {config.channels.map((channel) => {
            const isPrimary = channel.id === config.primaryChannelId || channel.isPrimary;

            return (
              <div 
                key={channel.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isPrimary
                    ? 'border-emerald-500 bg-emerald-50/25 dark:bg-emerald-950/15 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Icon, Badge & Primary Star */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: channel.color || (channel.type === 'whatsapp' ? '#25D366' : '#24A1DE') }}
                    >
                      {renderChannelBrandIcon(channel.type, 'w-6 h-6 text-white')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? channel.titleAr : channel.titleEn}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase font-mono font-bold">
                          {channel.type}
                        </span>
                      </div>

                      {/* Primary Indicator or Action */}
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(channel.id)}
                        className={`mt-1 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isPrimary
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-amber-400 text-amber-500' : ''}`} />
                        <span>
                          {isPrimary
                            ? (language === 'ar' ? 'القناة الرئيسية المعتمدة حالياً (الظاهرة دائماً)' : 'Visible First (Primary)')
                            : (language === 'ar' ? 'تعيين كقناة رئيسية أولى' : 'Set as Primary')}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1">
                    {/* Value / Link */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {channel.type === 'whatsapp' ? (language === 'ar' ? 'رقم الواتساب مع الرمز الدولي (مثال: \u202A+20123456789\u202C)' : 'WhatsApp Phone (e.g. +20123456789)') :
                         channel.type === 'telegram' ? (language === 'ar' ? 'معرف الحساب أو رابط المراسلة (مثال: t.me/username)' : 'Telegram Link / @username') :
                         channel.type === 'telegram_group' ? (language === 'ar' ? 'رابط الانضمام لمجموعة تيليجرام (مثال: t.me/group_invite)' : 'Telegram Group Link') :
                         channel.type === 'facebook' ? (language === 'ar' ? 'رابط الصفحة على فيسبوك (مثال: facebook.com/yourpage)' : 'Facebook Page URL') :
                         channel.type === 'instagram' ? (language === 'ar' ? 'رابط حساب إنستغرام أو اسم المستخدم (مثال: instagram.com/username)' : 'Instagram URL / @username') :
                         channel.type === 'x' ? (language === 'ar' ? 'رابط حساب منصة إكس أو اسم المستخدم (مثال: x.com/username)' : 'X / Twitter URL / @username') :
                         channel.type === 'phone' ? (language === 'ar' ? 'رقم الهاتف للاتصال المباشر (مثال: \u202A+20123456789\u202C)' : 'Phone Number (e.g. +20123456789)') :
                         (language === 'ar' ? 'الرابط الإلكتروني أو وسيلة التواصل' : 'URL or Value')}
                      </label>
                      <input
                        type="text"
                        value={channel.value}
                        onChange={(e) => handleUpdateChannel(channel.id, { value: e.target.value })}
                        placeholder={
                          channel.type === 'whatsapp' ? '+20123456789' :
                          channel.type === 'telegram' ? 'https://t.me/username' :
                          channel.type === 'telegram_group' ? 'https://t.me/group_invite' :
                          channel.type === 'facebook' ? 'https://facebook.com/yourpage' :
                          channel.type === 'instagram' ? 'https://instagram.com/username' :
                          channel.type === 'x' ? 'https://x.com/username' :
                          channel.type === 'phone' ? '+20123456789' :
                          'https://...'
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 font-mono"
                      />
                    </div>

                    {/* Arabic Title */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {language === 'ar' ? 'اسم القناة (باللغة العربية)' : 'Title (Arabic)'}
                      </label>
                      <input
                        type="text"
                        value={channel.titleAr}
                        onChange={(e) => handleUpdateChannel(channel.id, { titleAr: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* English Title */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {language === 'ar' ? 'اسم القناة (باللغة الإنجليزية)' : 'Title (English)'}
                      </label>
                      <input
                        type="text"
                        value={channel.titleEn}
                        onChange={(e) => handleUpdateChannel(channel.id, { titleEn: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Right Actions: Enabled Toggle & Delete */}
                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={(e) => handleUpdateChannel(channel.id, { enabled: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>{language === 'ar' ? 'مُفعَّلة' : 'Active'}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(channel.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title={language === 'ar' ? 'حذف هذه القناة' : 'Remove Channel'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
