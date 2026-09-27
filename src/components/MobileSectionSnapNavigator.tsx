import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Compass, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { HomeSectionItem, SiteSettings } from '../types';

export interface MobileSnapSectionInfo {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
}

interface MobileSectionSnapNavigatorProps {
  settings: SiteSettings;
  homeSections: HomeSectionItem[];
  hasHeroCarousel?: boolean;
}

export const MobileSectionSnapNavigator: React.FC<MobileSectionSnapNavigatorProps> = ({
  settings,
  homeSections,
  hasHeroCarousel = false,
}) => {
  const { language, direction } = useLanguage();
  const [activeSectionId, setActiveSectionId] = useState<string>('hero');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Compile ordered list of available public sections
  const sectionsList = useMemo<MobileSnapSectionInfo[]>(() => {
    const list: MobileSnapSectionInfo[] = [];

    // 1. Hero Carousel if enabled
    if (hasHeroCarousel) {
      list.push({
        id: 'hero-spotlight-carousel',
        key: 'heroCarousel',
        labelAr: 'المحتوى المميز',
        labelEn: 'Spotlight'
      });
    }

    // 2. Main Hero Section
    list.push({
      id: 'hero',
      key: 'hero',
      labelAr: 'الرئيسية',
      labelEn: 'Home'
    });

    // 3. Dynamic CMS Sections
    const sorted = [...(homeSections || [])]
      .filter(sec => sec && sec.enabled)
      .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

    sorted.forEach(sec => {
      // Avoid duplicate hero
      if (sec.sectionKey === 'hero') return;

      let labelAr = sec.titleAr || '';
      let labelEn = sec.titleEn || '';

      switch (sec.sectionKey) {
        case 'stats':
          labelAr = labelAr || 'الأرقام والإحصائيات';
          labelEn = labelEn || 'Key Stats';
          break;
        case 'about':
          labelAr = labelAr || 'نبذة ورؤية';
          labelEn = labelEn || 'About & Vision';
          break;
        case 'skills':
          labelAr = labelAr || 'الكفاءات والخبرات';
          labelEn = labelEn || 'Core Skills';
          break;
        case 'contentCards':
        case 'content-cards':
          labelAr = labelAr || 'بطاقات المحتوى';
          labelEn = labelEn || 'Cards';
          break;
        case 'portfolio':
          labelAr = labelAr || 'سجل الأعمال';
          labelEn = labelEn || 'Portfolio';
          break;
        case 'store':
          labelAr = labelAr || 'المتجر الرقمي';
          labelEn = labelEn || 'Store';
          break;
        case 'articles':
          labelAr = labelAr || 'المقالات والأبحاث';
          labelEn = labelEn || 'Articles';
          break;
        case 'testimonials':
          labelAr = labelAr || 'آراء وتوصيات';
          labelEn = labelEn || 'Testimonials';
          break;
        case 'subscribers':
        case 'newsletter':
          if (settings.sectionVisibility?.showNewsletter === false) return;
          labelAr = labelAr || 'النشرة البريدية';
          labelEn = labelEn || 'Newsletter';
          break;
        case 'contact':
          if (settings.sectionVisibility?.showContact === false) return;
          labelAr = labelAr || 'تواصل معنا';
          labelEn = labelEn || 'Contact';
          break;
        default:
          labelAr = labelAr || sec.sectionKey;
          labelEn = labelEn || sec.sectionKey;
      }

      list.push({
        id: sec.sectionKey === 'contentCards' ? 'content-cards' : sec.sectionKey,
        key: sec.sectionKey,
        labelAr,
        labelEn
      });
    });

    return list;
  }, [homeSections, hasHeroCarousel, settings.sectionVisibility]);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || sectionsList.length === 0) return;

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -40% 0px',
      threshold: [0.1, 0.4, 0.7]
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      // Find the entry that has the highest intersection ratio
      let bestEntry: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }
      }

      if (bestEntry && bestEntry.target) {
        const targetId = bestEntry.target.id;
        const matched = sectionsList.find(s => s.id === targetId || `section-${s.key}` === targetId);
        if (matched) {
          setActiveSectionId(matched.id);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    sectionsList.forEach(sec => {
      const el = document.getElementById(sec.id) || document.getElementById(`section-${sec.key}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionsList]);

  const activeIndex = useMemo(() => {
    const idx = sectionsList.findIndex(s => s.id === activeSectionId || s.key === activeSectionId);
    return idx >= 0 ? idx : 0;
  }, [sectionsList, activeSectionId]);

  const currentSection = sectionsList[activeIndex] || sectionsList[0];

  const scrollToSection = useCallback((targetId: string) => {
    const el = document.getElementById(targetId) || document.getElementById(`section-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(targetId);
      setIsMenuOpen(false);
    }
  }, []);

  const handlePrev = () => {
    if (activeIndex > 0) {
      const prev = sectionsList[activeIndex - 1];
      if (prev) scrollToSection(prev.id);
    }
  };

  const handleNext = () => {
    if (activeIndex < sectionsList.length - 1) {
      const next = sectionsList[activeIndex + 1];
      if (next) scrollToSection(next.id);
    }
  };

  if (!sectionsList || sectionsList.length <= 1) return null;

  return (
    <div 
      className="md:hidden fixed bottom-4 start-1/2 -translate-x-1/2 z-30 select-none transition-all duration-300 pointer-events-auto"
      dir={direction}
    >
      {/* Quick Jump Modal Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#13141a] border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'التنقل السريع بين الأقسام' : 'Section Navigation'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1.5 py-1">
              {sectionsList.map((sec, idx) => {
                const isActive = sec.id === currentSection?.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="truncate">
                      {language === 'ar' ? sec.labelAr : sec.labelEn}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                    }`}>
                      {idx + 1} / {sectionsList.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Touch Bar Control */}
      {!isMinimized ? (
        <div className="flex items-center gap-1.5 bg-slate-900/90 dark:bg-[#111216]/95 text-white border border-white/15 dark:border-neutral-700/80 backdrop-blur-md shadow-xl rounded-full px-2.5 py-1 text-xs">
          {/* Previous Section Touch Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex <= 0}
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label={language === 'ar' ? 'القسم السابق' : 'Previous section'}
            title={language === 'ar' ? 'القسم السابق' : 'Previous section'}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Section Indicator Pill with Tap to Open Menu */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title={language === 'ar' ? 'انقر لعرض قائمة الأقسام' : 'Click to jump to section'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold max-w-[110px] truncate text-[11px] leading-none">
              {currentSection ? (language === 'ar' ? currentSection.labelAr : currentSection.labelEn) : ''}
            </span>
            <span className="text-[9px] font-mono text-white/60 bg-white/10 px-1 py-0.5 rounded">
              {activeIndex + 1}/{sectionsList.length}
            </span>
          </button>

          {/* Next Section Touch Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex >= sectionsList.length - 1}
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            aria-label={language === 'ar' ? 'القسم التالي' : 'Next section'}
            title={language === 'ar' ? 'القسم التالي' : 'Next section'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-2 bg-slate-900/90 text-white rounded-full shadow-lg border border-white/15"
          aria-label="Expand section navigator"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
        </button>
      )}
    </div>
  );
};
