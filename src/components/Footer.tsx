import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SiteSettings } from '../types';
import { XIcon } from './icons/XIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { 
  Github, 
  Linkedin, 
  Twitter, 
  Send, 
  Globe, 
  ArrowUp, 
  Shield, 
  Youtube, 
  Instagram, 
  Facebook, 
  Radio, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react';

interface FooterProps {
  settings: SiteSettings;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onOpenAdmin }) => {
  const { language, t } = useLanguage();

  const brandName = language === 'ar' ? settings.brandNameAr : settings.brandNameEn;
  const copyrightText = language === 'ar' 
    ? (settings.footerCopyrightAr || settings.footerTextAr || `© ${new Date().getFullYear()} ${brandName || 'المنصة'}. جميع الحقوق محفوظة.`)
    : (settings.footerCopyrightEn || settings.footerTextEn || `© ${new Date().getFullYear()} ${brandName || 'Platform'}. All rights reserved.`);
  const customNote = language === 'ar' ? settings.footerCustomNoteAr : settings.footerCustomNoteEn;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return Youtube;
      case 'twitter': return XIcon;
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'telegram': return TelegramIcon;
      case 'whatsapp': return WhatsAppIcon;
      case 'linkedin': return Linkedin;
      case 'github': return Github;
      case 'podcast': return Radio;
      case 'goodreads': return BookOpen;
      case 'researchgate': return BookOpen;
      default: return Globe;
    }
  };

  const customSocials = settings.customSocialLinks && settings.customSocialLinks.length > 0
    ? settings.customSocialLinks.filter(s => s && s.enabled)
    : [
        { id: '1', platform: 'youtube', labelAr: 'قناة اليوتيوب', labelEn: 'YouTube Channel', url: 'https://youtube.com', enabled: true },
        { id: '2', platform: 'twitter', labelAr: 'منصة إكس / تويتر', labelEn: 'X / Twitter', url: 'https://x.com', enabled: true },
        { id: '3', platform: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram', url: 'https://instagram.com', enabled: true },
        { id: '4', platform: 'telegram', labelAr: 'قناة التلغرام', labelEn: 'Telegram Channel', url: 'https://t.me', enabled: true }
      ];

  if (settings.sectionVisibility?.showFooterSection === false) {
    return null;
  }

  return (
    <footer className="bg-slate-50 dark:bg-[#0c0d10] border-t border-slate-200 dark:border-neutral-800 pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Top Grid of Footer */}
        {(settings.sectionVisibility?.showFooterBrandInfo !== false || 
          settings.sectionVisibility?.showFooterNav !== false || 
          settings.sectionVisibility?.showFooterSocialChannels !== false) && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-200 dark:border-neutral-800">
            
            {/* Brand Info */}
            {settings.sectionVisibility?.showFooterBrandInfo !== false && (
              <div className={`${
                settings.sectionVisibility?.showFooterNav === false && settings.sectionVisibility?.showFooterSocialChannels === false
                  ? 'md:col-span-12'
                  : settings.sectionVisibility?.showFooterSocialChannels === false
                  ? 'md:col-span-8'
                  : 'md:col-span-5'
              } space-y-4`}>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-xl text-slate-900 dark:text-white">
                    {brandName || (language === 'ar' ? 'المنصة' : 'Platform')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-sm leading-relaxed">
                  {language === 'ar'
                    ? (settings.footerDescriptionAr || settings.footerTextAr || 'منصة متكاملة تضم أحدث المنتجات، الحلول المتخصصة، والمشاريع المنفذة مع التزام مستمر بأعلى معايير الجودة.')
                    : (settings.footerDescriptionEn || settings.footerTextEn || 'Comprehensive platform showcasing products, specialized solutions, and featured projects built with excellence.')}
                </p>
                
                {/* Quick mini-row of primary channels */}
                {settings.sectionVisibility?.showFooterSocialIcons !== false && (
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-neutral-400 pt-2">
                    {customSocials.slice(0, 5).map((soc) => {
                      const Icon = getPlatformIcon(soc.platform);
                      return (
                        <a
                          key={soc.id}
                          href={soc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-700 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-white rounded-xl bg-white dark:bg-neutral-900 hover:bg-emerald-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 transition-all shadow-2xs"
                          title={language === 'ar' ? soc.labelAr : soc.labelEn}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Direct Contact Button */}
                {settings.sectionVisibility?.showFooterDirectContact !== false && (
                  <div className="pt-2">
                    <a
                      href={settings.contactEmail ? `mailto:${settings.contactEmail}` : '#contact'}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-900 hover:bg-emerald-50 dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-200 border border-slate-300 dark:border-neutral-800 hover:border-emerald-600 dark:hover:border-neutral-700 transition-all shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-neutral-400" />
                      <span>{language === 'ar' ? 'تواصل معنا مباشرة' : 'Direct Contact'}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Links */}
            {settings.sectionVisibility?.showFooterNav !== false && (
              <div className={`${
                settings.sectionVisibility?.showFooterBrandInfo === false
                  ? 'md:col-span-5'
                  : 'md:col-span-3'
              } space-y-3`}>
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500">
                  {t('footer.links')}
                </h4>
                <ul className="space-y-2 text-sm">
                  {(settings?.navigation || []).filter(n => n && n.enabled).slice(0, 6).map((nav) => (
                    <li key={nav.id}>
                      <a
                        href={nav.href}
                        className="text-slate-600 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{language === 'ar' ? nav.labelAr : nav.labelEn}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Custom Social Channels */}
            {settings.sectionVisibility?.showFooterSocialChannels !== false && (
              <div className={`${
                settings.sectionVisibility?.showFooterBrandInfo === false && settings.sectionVisibility?.showFooterNav === false
                  ? 'md:col-span-12'
                  : settings.sectionVisibility?.showFooterBrandInfo === false
                  ? 'md:col-span-7'
                  : 'md:col-span-4'
              } space-y-4`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500">
                    {language === 'ar' ? 'وسائل وقنوات التواصل' : 'Connect & Follow Platforms'}
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-neutral-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-neutral-800">
                    {customSocials.length} {language === 'ar' ? 'منصة' : 'channels'}
                  </span>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                  {language === 'ar'
                    ? 'تابع أحدث الإصدارات والمحاضرات والحلقات الوثائقية عبر المنصات المفتوحة التالية:'
                    : 'Follow the latest publications, lectures, and documentaries across these channels:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customSocials.map((soc) => {
                    const Icon = getPlatformIcon(soc.platform);
                    const label = language === 'ar' ? soc.labelAr : soc.labelEn;
                    return (
                      <a
                        key={soc.id}
                        href={soc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-emerald-50/70 dark:hover:bg-neutral-800 hover:border-emerald-500 dark:hover:border-neutral-700 text-slate-800 dark:text-neutral-300 hover:text-emerald-800 dark:hover:text-white transition-all text-xs group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate font-medium">{label}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 dark:text-neutral-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 ms-1" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Bottom Bar */}
        {settings.sectionVisibility?.showFooterBottomBar !== false && (
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-500">
            <div className="space-y-1 text-center sm:text-start">
              <p>{copyrightText}</p>
              {customNote && (
                <p className="text-[11px] text-slate-400 dark:text-neutral-600 font-mono">{customNote}</p>
              )}
            </div>
            <div className="flex items-center gap-5">
              {onOpenAdmin && settings.sectionVisibility?.showFooterOwnerPortalLink !== false && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  title={language === 'ar' ? 'بوابة دخول المالك' : 'Owner Portal'}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'بوابة المالك' : 'Owner Portal'}</span>
                </button>
              )}
              {settings.sectionVisibility?.showFooterBackToTop !== false && (
                <button
                  onClick={scrollToTop}
                  className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span>{language === 'ar' ? 'العودة للأعلى' : 'Back to top'}</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </footer>
  );
};

