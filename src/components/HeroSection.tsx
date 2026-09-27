import React from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Terminal, 
  Github, 
  Linkedin, 
  Twitter, 
  Send, 
  Mail, 
  ShoppingBag,
  BookOpen,
  Video,
  Library,
  GraduationCap,
  Youtube,
  Instagram,
  Facebook,
  Radio,
  Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SiteSettings } from '../types';
import { XIcon } from './icons/XIcon';
import { LazyImage } from './LazyImage';

interface HeroSectionProps {
  settings: SiteSettings;
}

const heroIconMap: Record<string, any> = {
  BookOpen,
  Video,
  Library,
  GraduationCap,
  Terminal,
  Sparkles,
  Globe
};

export const HeroSection: React.FC<HeroSectionProps> = ({ settings }) => {
  const { language, direction, t } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const title = language === 'ar' ? settings.titleAr : settings.titleEn;
  const brandName = language === 'ar' ? settings.brandNameAr : settings.brandNameEn;
  const bio = language === 'ar' ? settings.bioAr : settings.bioEn;
  const location = language === 'ar' ? settings.locationAr : settings.locationEn;

  // Floating badges calculation
  const floatingBadges = settings.heroFloatingBadges && settings.heroFloatingBadges.length > 0
    ? settings.heroFloatingBadges.filter(b => b && b.enabled)
    : [
        {
          id: 'def-1',
          badgeValue: '10+',
          titleAr: 'سنوات من الخبرة والتميز',
          titleEn: 'Years of Experience',
          subAr: 'مشاريع وإنجازات متواصلة',
          subEn: 'Delivered Projects',
          position: 'top-start' as const,
          enabled: true
        },
        {
          id: 'def-2',
          badgeValue: '100%',
          titleAr: 'رضا وثقة العملاء',
          titleEn: 'Client Satisfaction',
          subAr: 'جودة واعتمادية عالية',
          subEn: 'Quality & Reliability',
          position: 'bottom-end' as const,
          enabled: true
        }
      ];

  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'top-end':
        return '-top-4 -end-4 sm:-end-6';
      case 'bottom-start':
        return '-bottom-4 -start-4 sm:-start-6';
      case 'bottom-end':
        return '-bottom-4 -end-4 sm:-end-6';
      case 'top-start':
      default:
        return '-top-4 -start-4 sm:-start-6';
    }
  };

  const showOverlay = settings.sectionVisibility?.showHeroOverlayBadge !== false;
  const showFloating = settings.sectionVisibility?.showHeroFloatingBadges !== false;

  const OverlayIcon = (settings.heroOverlayIcon && heroIconMap[settings.heroOverlayIcon])
    ? heroIconMap[settings.heroOverlayIcon]
    : Sparkles;

  const primaryCtaText = (language === 'ar' ? settings.heroCtaPrimaryAr : settings.heroCtaPrimaryEn) || (language === 'ar' ? 'استكشف المزيد' : 'Explore More');
  const primaryCtaLink = settings.heroCtaPrimaryLink || '#content-cards';
  const storeCtaText = (language === 'ar' ? settings.heroCtaStoreAr : settings.heroCtaStoreEn) || t('hero.ctaStore');
  const contactCtaText = (language === 'ar' ? settings.heroCtaContactAr : settings.heroCtaContactEn) || t('hero.ctaContact');

  return (
    <section id="hero" className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-white dark:bg-[#0c0d10] text-slate-900 dark:text-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Main Hero Content (Left in LTR / Right in RTL) */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Availability Pill */}
            {settings.sectionVisibility?.showHeroAvailabilityBadge !== false && (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {language === 'ar'
                    ? (settings.heroAvailabilityTextAr || t('hero.available'))
                    : (settings.heroAvailabilityTextEn || t('hero.available'))}
                </span>
              </div>
            )}

            {/* Main Headline */}
            <div className="space-y-3">
              <span className="block text-xs sm:text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                {brandName} • {location}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] sm:leading-[1.18]">
                {title}
              </h1>
            </div>

            {/* Bio Paragraph */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-neutral-400 leading-relaxed max-w-2xl font-normal">
              {bio}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
              <a
                id="hero-cta-portfolio"
                href={primaryCtaLink}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>{primaryCtaText}</span>
                <ArrowIcon className="w-4 h-4" />
              </a>

              <a
                id="hero-cta-store"
                href="#store"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700/80 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{storeCtaText}</span>
              </a>

              <a
                id="hero-cta-contact"
                href="#contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm sm:text-base font-semibold text-slate-800 dark:text-neutral-200 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-slate-300 dark:border-neutral-700 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Mail className="w-4 h-4 text-slate-600 dark:text-neutral-400" />
                <span>{contactCtaText}</span>
              </a>
            </div>

            {/* Social Network Channels */}
            <div className="pt-4 flex flex-wrap items-center gap-3 text-slate-600 dark:text-white/60">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/40">
                {language === 'ar' ? 'الشبكات والمنصات:' : 'Connect:'}
              </span>
              {settings.customSocialLinks && settings.customSocialLinks.length > 0 ? (
                settings.customSocialLinks.filter(s => s && s.enabled).slice(0, 6).map((soc) => {
                  let Icon: React.ComponentType<{ className?: string }> = Globe;
                  if (soc.platform === 'youtube') Icon = Youtube;
                  else if (soc.platform === 'twitter') Icon = XIcon;
                  else if (soc.platform === 'instagram') Icon = Instagram;
                  else if (soc.platform === 'facebook') Icon = Facebook;
                  else if (soc.platform === 'telegram') Icon = Send;
                  else if (soc.platform === 'linkedin') Icon = Linkedin;
                  else if (soc.platform === 'github') Icon = Github;
                  else if (soc.platform === 'podcast') Icon = Radio;
                  else if (soc.platform === 'goodreads') Icon = BookOpen;

                  return (
                    <a
                      key={soc.id}
                      href={soc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 text-slate-700 dark:text-white/80 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:text-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl transition-all shadow-2xs"
                      title={language === 'ar' ? soc.labelAr : soc.labelEn}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })
              ) : (
                <>
                  {settings.socialLinks?.github && (
                    <a href={settings.socialLinks.github} target="_blank" rel="noreferrer" className="p-2.5 text-slate-700 dark:text-white/80 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:text-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl transition-all shadow-2xs" aria-label="GitHub Profile">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {settings.socialLinks?.linkedin && (
                    <a href={settings.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-2.5 text-slate-700 dark:text-white/80 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:text-cyan-400 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl transition-all shadow-2xs" aria-label="LinkedIn Profile">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {settings.socialLinks?.twitter && (
                    <a href={settings.socialLinks.twitter} target="_blank" rel="noreferrer" className="p-2.5 text-slate-700 dark:text-white/80 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl transition-all shadow-2xs" aria-label="X / Twitter">
                      <XIcon className="w-4 h-4" />
                    </a>
                  )}
                  {settings.socialLinks?.telegram && (
                    <a href={settings.socialLinks.telegram} target="_blank" rel="noreferrer" className="p-2.5 hover:text-blue-500 hover:bg-blue-50 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl transition-all" aria-label="Telegram">
                      <Send className="w-4 h-4" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Hero Visual Card (Right in LTR / Left in RTL) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              
              {/* Profile Image with solid high-contrast harmonious frame */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-300/90 dark:border-neutral-700/80 bg-slate-100/90 dark:bg-[#111216] shadow-xl p-3.5 ring-1 ring-slate-900/5 dark:ring-white/10">
                {settings.avatarUrl && settings.avatarUrl.trim() !== '' ? (
                  <LazyImage
                    src={settings.avatarUrl}
                    alt={brandName || 'Profile'}
                    className="w-full h-80 sm:h-96 object-cover object-center rounded-2xl shadow-md border border-slate-300/80 dark:border-neutral-700 transition-all duration-500"
                    containerClassName="w-full h-80 sm:h-96 rounded-2xl overflow-hidden"
                  />
                ) : (
                  <div className="w-full h-80 sm:h-96 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-sm">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-neutral-950 border border-emerald-300 dark:border-neutral-700 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                        {brandName || (language === 'ar' ? 'منصة متكاملة' : 'Professional Platform')}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-neutral-400">
                        {language === 'ar' ? 'حلول عملية • خدمات متخصصة • تميز مستمر' : 'Practical Solutions • Specialized Services • Excellence'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Dynamic Overlay Badge */}
                {showOverlay && (
                  <div className="absolute bottom-6 inset-x-6 p-3.5 rounded-2xl bg-white/95 dark:bg-[#13141a]/95 border border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-white flex items-center justify-between shadow-lg backdrop-blur-sm ring-1 ring-slate-900/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {language === 'ar' 
                            ? (settings.heroOverlayTitleAr || settings.headerSubtitleAr || 'منصة متكاملة ومشاريع متخصصة') 
                            : (settings.heroOverlayTitleEn || settings.headerSubtitleEn || 'Comprehensive Platform & Projects')}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                          {language === 'ar' 
                            ? (settings.heroOverlaySubAr || 'حلول عملية • منتجات رقمية • تميز مستمر') 
                            : (settings.heroOverlaySubEn || 'Practical Solutions • Digital Products • Continuous Excellence')}
                        </p>
                      </div>
                    </div>
                    <OverlayIcon className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  </div>
                )}
              </div>

              {/* Dynamic Floating Badges */}
              {showFloating && floatingBadges.map((badge) => {
                const posClasses = getPositionClasses(badge.position);
                const titleText = language === 'ar' ? badge.titleAr : badge.titleEn;
                const subText = language === 'ar' ? badge.subAr : badge.subEn;

                return (
                  <div
                    key={badge.id}
                    className={`absolute ${posClasses} bg-white dark:bg-[#13141a] border border-slate-300 dark:border-neutral-700 rounded-2xl p-3 shadow-lg flex items-center gap-3 transition-all hover:border-emerald-500/60 dark:hover:border-neutral-600 z-10 ring-1 ring-slate-900/5`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-300 dark:border-neutral-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold font-mono text-sm shrink-0">
                      {badge.badgeValue}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {titleText}
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-neutral-400 font-mono">
                        {subText}
                      </p>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
