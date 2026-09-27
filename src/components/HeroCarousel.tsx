import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  FileText, 
  FolderGit2, 
  Tag, 
  ExternalLink, 
  ArrowLeft, 
  ArrowRight, 
  ShoppingBag, 
  Clock, 
  Pin,
  Play,
  Pause
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { 
  SiteSettings, 
  ProductItem, 
  ArticleItem, 
  PortfolioItem, 
  CarouselCardItem,
  CarouselTag
} from '../types';
import { formatArabicText } from '../utils/arabicText';
import { LazyImage } from './LazyImage';

interface HeroCarouselProps {
  settings: SiteSettings;
  products?: ProductItem[];
  articles?: ArticleItem[];
  portfolio?: PortfolioItem[];
  onSelectProduct?: (product: ProductItem) => void;
  onSelectArticle?: (article: ArticleItem) => void;
  onSelectProject?: (project: PortfolioItem) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  settings,
  products = [],
  articles = [],
  portfolio = [],
  onSelectProduct,
  onSelectArticle,
  onSelectProject
}) => {
  const { language, direction } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Check if carousel is disabled globally
  const isEnabled = settings.carouselEnabled !== false && settings.sectionVisibility?.showCarousel !== false;

  // Resolve default fallback cards if none configured in settings
  const cards: CarouselCardItem[] = useMemo(() => {
    if (settings.carouselCards && settings.carouselCards.length > 0) {
      return settings.carouselCards.filter(c => c && c.enabled !== false);
    }
    // High-craft default curated cards
    return [
      {
        id: 'default-card-1',
        type: 'auto_latest_product',
        titleAr: 'أحدث كتاب وإصدار فكري منشور',
        titleEn: 'Latest Published Book & Intellectual Release',
        subtitleAr: 'استكشف أحدث مؤلف مطبوع ورقمي يضم خلاصة الأبحاث والملاحظات النقدية المعاصرة.',
        subtitleEn: 'Explore the latest published volume featuring in-depth research and critical scholarship.',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000',
        badgeTextAr: 'إصدار جديد',
        badgeTextEn: 'New Release',
        badgeColor: 'emerald',
        tags: [
          { id: 't1', textAr: 'كتاب فكري', textEn: 'Book', color: 'emerald' },
          { id: 't2', textAr: 'توثيق تاريخي', textEn: 'Historical', color: 'blue' }
        ],
        pinned: true,
        enabled: true,
        order: 1
      },
      {
        id: 'default-card-2',
        type: 'auto_latest_article',
        titleAr: 'أحدث دراسة وبحث استقصائي محكم',
        titleEn: 'Latest Peer-Reviewed Essay & Inquiry',
        subtitleAr: 'قراءة تحليلية معمقة في أحدث الأوراق والمقالات الفكرية المنشورة على المنصة.',
        subtitleEn: 'An analytical deep dive into contemporary inquiries and documentary archives.',
        imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=1000',
        badgeTextAr: 'بحث منشور',
        badgeTextEn: 'Published Research',
        badgeColor: 'blue',
        tags: [
          { id: 't3', textAr: 'مقال تحليلي', textEn: 'Essay', color: 'blue' },
          { id: 't4', textAr: 'قراءة 12 دقيقة', textEn: '12 min read', color: 'purple' }
        ],
        pinned: false,
        enabled: true,
        order: 2
      },
      {
        id: 'default-card-3',
        type: 'custom',
        titleAr: 'عرض خاص: باقة المجموعة الفكرية الكاملة',
        titleEn: 'Special Offer: Complete Intellectual Collection',
        subtitleAr: 'احصل على كافة الكتب والدراسات المطبوعة مع اشتراك مجاني في الأرشيف الوثائقي وخصم 35%.',
        subtitleEn: 'Get all published books and studies with exclusive access to archival documentaries at 35% off.',
        imageUrl: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?auto=format&fit=crop&q=80&w=1000',
        ctaTextAr: 'استكشف تفاصيل العرض',
        ctaTextEn: 'Claim Special Offer',
        ctaLink: '#store',
        badgeTextAr: 'خصم 35%',
        badgeTextEn: '35% Discount',
        badgeColor: 'rose',
        tags: [
          { id: 't5', textAr: 'عرض حصري', textEn: 'Exclusive Deal', color: 'amber' },
          { id: 't6', textAr: 'شحن مجاني', textEn: 'Free Shipping', color: 'emerald' },
          { id: 't7', textAr: 'لفترة محدودة', textEn: 'Limited Time', color: 'rose' }
        ],
        pinned: true,
        enabled: true,
        order: 3
      },
      {
        id: 'default-card-4',
        type: 'auto_latest_portfolio',
        titleAr: 'أحدث عمل في معرض الوثائقيات والإنتاج',
        titleEn: 'Latest Documentary & Creative Project',
        subtitleAr: 'شاهد أحدث سلسلة وثائقية تجمع بين الجمالية البصرية والبحث الاستقصائي الدقيق.',
        subtitleEn: 'Explore the newly released documentary series balancing visual aesthetic with research.',
        imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=1000',
        badgeTextAr: 'عمل وثائقي',
        badgeTextEn: 'Documentary',
        badgeColor: 'purple',
        tags: [
          { id: 't8', textAr: 'إنتاج سينمائي', textEn: 'Cinematic', color: 'purple' },
          { id: 't9', textAr: 'أرشيف مرئي', textEn: 'Visual Archive', color: 'slate' }
        ],
        pinned: false,
        enabled: true,
        order: 4
      }
    ];
  }, [settings.carouselCards]);

  const totalCards = cards.length;
  const speedSeconds = Math.max(1, Number(settings.carouselSpeed) || 4);
  const autoPlayEnabled = settings.carouselAutoPlay !== false;
  const pauseOnHover = settings.carouselPauseOnHover === true;

  // Infinite rotating navigation
  const nextCard = useCallback(() => {
    if (totalCards <= 1) return;
    setActiveIndex(prev => (prev + 1) % totalCards);
  }, [totalCards]);

  const prevCard = useCallback(() => {
    if (totalCards <= 1) return;
    setActiveIndex(prev => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  // Auto-play interval that reliably resets on activeIndex so each card gets its full duration
  useEffect(() => {
    if (!isEnabled || totalCards <= 1 || !autoPlayEnabled || isPaused) return;
    const ms = speedSeconds * 1000;
    const timer = setInterval(() => {
      nextCard();
    }, ms);
    return () => clearInterval(timer);
  }, [isEnabled, totalCards, autoPlayEnabled, isPaused, speedSeconds, nextCard, activeIndex]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left
        if (direction === 'rtl') prevCard();
        else nextCard();
      } else {
        // Swiped right
        if (direction === 'rtl') nextCard();
        else prevCard();
      }
    }
    touchStartX.current = null;
  };

  // Calculate sequential occurrence offset for repeated auto card types
  // Example: 1st book card gets index 0 (newest), 2nd gets index 1 (previous), 3rd gets index 2...
  const cardSequenceOffsets = useMemo(() => {
    const typeCounters: Record<string, number> = {};
    const offsetMap: Record<string, number> = {};

    cards.forEach((c) => {
      if (!c) return;
      if (c.autoOffset !== undefined && c.autoOffset >= 0) {
        offsetMap[c.id] = c.autoOffset;
      } else {
        const currentCount = typeCounters[c.type] || 0;
        offsetMap[c.id] = currentCount;
        typeCounters[c.type] = currentCount + 1;
      }
    });

    return offsetMap;
  }, [cards]);

  // Safe navigation helper that never throws DOMException and handles both section anchors and external URLs
  const safeNavigate = useCallback((target?: string) => {
    if (!target) return;
    const clean = target.trim();
    if (!clean) return;

    if (clean.startsWith('#') || (!clean.includes('://') && !clean.startsWith('mailto:') && !clean.startsWith('tel:'))) {
      const elementId = clean.replace(/^#+/, '').trim();
      if (elementId) {
        try {
          const el = document.getElementById(elementId) || document.querySelector(`#${CSS.escape(elementId)}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        } catch {
          // Fallback to location hash
        }
        try {
          window.location.hash = `#${elementId}`;
          return;
        } catch {
          // Ignore
        }
      }
    }

    if (/^https?:\/\//i.test(clean) || clean.startsWith('mailto:') || clean.startsWith('tel:')) {
      try {
        window.open(clean, '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = clean;
      }
    } else {
      try {
        const anchor = clean.startsWith('#') ? clean : `#${clean}`;
        window.location.hash = anchor;
      } catch {
        // Ignore
      }
    }
  }, []);

  // Helper to resolve card content dynamically
  const resolveCardData = (card?: CarouselCardItem) => {
    if (!card) {
      return {
        title: '',
        subtitle: '',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000',
        badge: '',
        actionText: language === 'ar' ? 'استكشف المزيد' : 'Explore Now',
        actionLink: '#store',
        onActionClick: () => safeNavigate('#store'),
        tags: []
      };
    }

    const offset = (card.id ? cardSequenceOffsets[card.id] : 0) ?? 0;

    let resolvedTitle = language === 'ar' ? card.titleAr : card.titleEn;
    let resolvedSubtitle = language === 'ar' ? card.subtitleAr : card.subtitleEn;
    let resolvedImage = card.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';
    let resolvedBadge = language === 'ar' ? card.badgeTextAr : card.badgeTextEn;
    let resolvedActionText = language === 'ar' ? (card.ctaTextAr || 'استكشف المزيد') : (card.ctaTextEn || 'Explore Now');
    let resolvedActionLink = card.ctaLink || '#';
    let onActionClick: (() => void) | undefined = undefined;

    // 1. Direct Specific Item Target (Direct Modal Open)
    if (card.targetType === 'product' && card.targetId) {
      const prod = products.find(p => p.id === card.targetId);
      if (prod) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? prod.nameAr : prod.nameEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? prod.descriptionAr : prod.descriptionEn);
        if (!card.imageUrl && prod.images && prod.images.length > 0) {
          resolvedImage = prod.images[0];
        }
        resolvedBadge = resolvedBadge || (language === 'ar' ? 'كتاب فكري مختار' : 'Featured Book');
        resolvedActionText = card.ctaTextAr || (language === 'ar' ? 'عرض تفاصيل الكتاب' : 'View Book Details');
        resolvedActionLink = '#store';
        onActionClick = () => {
          if (onSelectProduct) onSelectProduct(prod);
          else safeNavigate('#store');
        };
      }
    } else if (card.targetType === 'article' && card.targetId) {
      const art = articles.find(a => a.id === card.targetId);
      if (art) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? art.titleAr : art.titleEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? art.excerptAr : art.excerptEn);
        if (!card.imageUrl && art.coverImage) {
          resolvedImage = art.coverImage;
        }
        resolvedBadge = resolvedBadge || (language === 'ar' ? 'دراسة فكرية مختارة' : 'Featured Essay');
        resolvedActionText = card.ctaTextAr || (language === 'ar' ? 'قراءة المقال كاملًا' : 'Read Article');
        resolvedActionLink = '#articles';
        onActionClick = () => {
          if (onSelectArticle) onSelectArticle(art);
          else safeNavigate('#articles');
        };
      }
    } else if (card.targetType === 'portfolio' && card.targetId) {
      const proj = portfolio.find(p => p.id === card.targetId);
      if (proj) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? proj.titleAr : proj.titleEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? proj.shortDescAr : proj.shortDescEn);
        if (!card.imageUrl && proj.thumbnail) {
          resolvedImage = proj.thumbnail;
        }
        resolvedBadge = resolvedBadge || (language === 'ar' ? 'عمل وثائقي مختار' : 'Featured Project');
        resolvedActionText = card.ctaTextAr || (language === 'ar' ? 'استعراض العمل والوثائقي' : 'View Project');
        resolvedActionLink = '#portfolio';
        onActionClick = () => {
          if (onSelectProject) onSelectProject(proj);
          else safeNavigate('#portfolio');
        };
      }
    } else if (card.type === 'auto_latest_product') {
      // Automatic sequence of products
      const targetProd = products.length > 0 ? products[offset % products.length] : null;
      if (targetProd) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? targetProd.nameAr : targetProd.nameEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? targetProd.descriptionAr : targetProd.descriptionEn);
        if (!card.imageUrl && targetProd.images && targetProd.images.length > 0) {
          resolvedImage = targetProd.images[0];
        }
        if (!resolvedBadge) {
          if (offset === 0) {
            resolvedBadge = language === 'ar' ? 'أحدث كتاب / إصدار' : 'Latest Release';
          } else if (offset === 1) {
            resolvedBadge = language === 'ar' ? 'إصدار سابق (#2)' : 'Previous Release (#2)';
          } else {
            resolvedBadge = language === 'ar' ? `إصدار فكري (#${offset + 1})` : `Release (#${offset + 1})`;
          }
        }
        resolvedActionText = card.ctaTextAr
          ? (language === 'ar' ? card.ctaTextAr : card.ctaTextEn || 'View Book Details')
          : (language === 'ar' ? 'شراء أو استعراض الكتاب' : 'View Book Details');
        resolvedActionLink = '#store';
        onActionClick = () => {
          if (onSelectProduct) onSelectProduct(targetProd);
          else safeNavigate('#store');
        };
      }
    } else if (card.type === 'auto_latest_article') {
      // Automatic sequence of articles
      const targetArticle = articles.length > 0 ? articles[offset % articles.length] : null;
      if (targetArticle) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? targetArticle.titleAr : targetArticle.titleEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? targetArticle.excerptAr : targetArticle.excerptEn);
        if (!card.imageUrl && targetArticle.coverImage) {
          resolvedImage = targetArticle.coverImage;
        }
        if (!resolvedBadge) {
          if (offset === 0) {
            resolvedBadge = language === 'ar' ? 'أحدث مقال وبحث' : 'Latest Essay';
          } else if (offset === 1) {
            resolvedBadge = language === 'ar' ? 'بحث سابق (#2)' : 'Previous Essay (#2)';
          } else {
            resolvedBadge = language === 'ar' ? `بحث منشور (#${offset + 1})` : `Published Essay (#${offset + 1})`;
          }
        }
        resolvedActionText = card.ctaTextAr
          ? (language === 'ar' ? card.ctaTextAr : card.ctaTextEn || 'Read Article')
          : (language === 'ar' ? 'قراءة المقال كاملًا' : 'Read Article');
        resolvedActionLink = '#articles';
        onActionClick = () => {
          if (onSelectArticle) onSelectArticle(targetArticle);
          else safeNavigate('#articles');
        };
      }
    } else if (card.type === 'auto_latest_portfolio') {
      // Automatic sequence of portfolio
      const targetProj = portfolio.length > 0 ? portfolio[offset % portfolio.length] : null;
      if (targetProj) {
        resolvedTitle = resolvedTitle || (language === 'ar' ? targetProj.titleAr : targetProj.titleEn);
        resolvedSubtitle = resolvedSubtitle || (language === 'ar' ? targetProj.shortDescAr : targetProj.shortDescEn);
        if (!card.imageUrl && targetProj.thumbnail) {
          resolvedImage = targetProj.thumbnail;
        }
        if (!resolvedBadge) {
          if (offset === 0) {
            resolvedBadge = language === 'ar' ? 'أحدث إنتاج وثائقي' : 'Latest Project';
          } else if (offset === 1) {
            resolvedBadge = language === 'ar' ? 'عمل سابق (#2)' : 'Previous Project (#2)';
          } else {
            resolvedBadge = language === 'ar' ? `عمل وثائقي (#${offset + 1})` : `Project (#${offset + 1})`;
          }
        }
        resolvedActionText = card.ctaTextAr
          ? (language === 'ar' ? card.ctaTextAr : card.ctaTextEn || 'View Project')
          : (language === 'ar' ? 'استعراض العمل والوثائقي' : 'View Project');
        resolvedActionLink = '#portfolio';
        onActionClick = () => {
          if (onSelectProject) onSelectProject(targetProj);
          else safeNavigate('#portfolio');
        };
      }
    }

    // Explicit custom external URL overrides auto destination if explicitly configured
    if (card.targetType === 'url' && card.ctaLink) {
      resolvedActionLink = card.ctaLink;
      onActionClick = () => safeNavigate(card.ctaLink);
    } else if (!onActionClick) {
      // Fallback section or custom URL if item modal click handler wasn't attached
      if (card.targetSection) {
        const secId = card.targetSection.replace(/^#+/, '').trim();
        const anchor = `#${secId || 'store'}`;
        resolvedActionLink = anchor;
        onActionClick = () => safeNavigate(anchor);
      } else if (card.ctaLink) {
        resolvedActionLink = card.ctaLink;
        onActionClick = () => safeNavigate(card.ctaLink);
      } else {
        resolvedActionLink = '#store';
        onActionClick = () => safeNavigate('#store');
      }
    }

    // Apply strict Classical Arabic & Tanween rule (Tanween before Alif)
    if (language === 'ar') {
      resolvedTitle = formatArabicText(resolvedTitle);
      resolvedSubtitle = formatArabicText(resolvedSubtitle);
      resolvedBadge = formatArabicText(resolvedBadge);
      resolvedActionText = formatArabicText(resolvedActionText);
    }

    return {
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
      imageUrl: resolvedImage,
      badge: resolvedBadge,
      actionText: resolvedActionText,
      actionLink: resolvedActionLink,
      onActionClick,
      tags: card.tags || []
    };
  };

  const getBadgeColorClasses = (color?: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
      case 'blue':
        return 'bg-sky-500/15 text-sky-800 dark:text-sky-400 border-sky-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-800 dark:text-purple-400 border-purple-500/30';
      case 'slate':
        return 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30';
      case 'emerald':
      default:
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  // Ensure activeIndex is within safe bounds
  useEffect(() => {
    if (activeIndex >= totalCards && totalCards > 0) {
      setActiveIndex(0);
    }
  }, [totalCards, activeIndex]);

  if (!isEnabled || totalCards === 0) {
    return null;
  }

  const safeIndex = activeIndex >= totalCards ? 0 : activeIndex;
  const activeCard = cards[safeIndex] || cards[0];
  if (!activeCard) {
    return null;
  }
  const activeData = resolveCardData(activeCard);

  // Calculate relative indices for the rotating cards
  const prevIndex = (safeIndex - 1 + totalCards) % totalCards;
  const nextIndex = (safeIndex + 1) % totalCards;

  const prevCardItem = cards[prevIndex] || activeCard;
  const prevData = resolveCardData(prevCardItem);

  const nextCardItem = cards[nextIndex] || activeCard;
  const nextData = resolveCardData(nextCardItem);

  return (
    <section 
      id="hero-spotlight-carousel"
      className="relative w-full py-8 sm:py-12 overflow-hidden bg-gradient-to-b from-slate-100/60 via-transparent to-transparent dark:from-slate-900/40 dark:via-transparent dark:to-transparent select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes carouselTimerLine {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Carousel Header with optional Title/Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>{language === 'ar' ? 'المختارات والإصدارات البارزة' : 'Featured Spotlight'}</span>
            </div>
            {(settings.carouselTitleAr || settings.carouselTitleEn) && (
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {language === 'ar' ? settings.carouselTitleAr : settings.carouselTitleEn}
              </h2>
            )}
            {(settings.carouselSubtitleAr || settings.carouselSubtitleEn) && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {language === 'ar' ? settings.carouselSubtitleAr : settings.carouselSubtitleEn}
              </p>
            )}
          </div>

          {/* Controls: Prev / Play-Pause / Next Buttons */}
          {totalCards > 1 && (
            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* Duration indicator badge */}
              {autoPlayEnabled && (
                <div 
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  title={language === 'ar' ? `مدة بقاء البطاقة: ${speedSeconds} ثوانٍ` : `Card stay duration: ${speedSeconds}s`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{speedSeconds}{language === 'ar' ? ' ثوانٍ' : 's'}</span>
                </div>
              )}

              {/* Play / Pause Toggle Button */}
              {autoPlayEnabled && (
                <button
                  onClick={() => setIsPaused(prev => !prev)}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                    isPaused 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40' 
                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700'
                  }`}
                  title={isPaused ? (language === 'ar' ? 'استئناف الحركة التلقائية' : 'Resume Auto Play') : (language === 'ar' ? 'إيقاف مؤقت للحركة' : 'Pause Auto Play')}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={prevCard}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                title={language === 'ar' ? 'البطاقة السابقة' : 'Previous Card'}
              >
                {direction === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              
              <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 px-2">
                <span>{activeIndex + 1}</span>
                <span className="opacity-40 mx-1">/</span>
                <span>{totalCards}</span>
              </div>

              <button
                onClick={nextCard}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                title={language === 'ar' ? 'البطاقة التالية' : 'Next Card'}
              >
                {direction === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>

        {/* 3D Spotlight Stage */}
        <div className="relative w-full flex items-center justify-center min-h-[360px] sm:min-h-[400px]">

          {/* Left / Previous Side Card (Smaller, dimmed, clickable) */}
          {totalCards > 1 && (
            <div 
              onClick={prevCard}
              className="hidden lg:block absolute start-0 top-1/2 -translate-y-1/2 w-[28%] max-w-sm h-[82%] z-10 cursor-pointer transition-all duration-500 transform scale-90 opacity-40 hover:opacity-75 hover:scale-95 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-lg backdrop-blur-xs"
            >
              <div className="relative w-full h-full overflow-hidden flex flex-col justify-end p-5">
                <LazyImage 
                  src={prevData.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover grayscale-[30%]"
                  containerClassName="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="relative z-10 space-y-1.5 text-white">
                  {prevData.badge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                      {prevData.badge}
                    </span>
                  )}
                  <h4 className="text-sm font-bold truncate">{prevData.title}</h4>
                </div>
              </div>
            </div>
          )}

          {/* Center Active Spotlight Card (Prominent, large, focused, animated) */}
          <div className="relative z-20 w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard.id || activeIndex}
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -8 }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
                onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
                className="relative w-full rounded-2xl sm:rounded-3xl border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden ring-4 ring-emerald-500/10"
              >
                {/* Active Card Progress Countdown Line */}
                {autoPlayEnabled && !isPaused && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-emerald-100/50 dark:bg-emerald-950/50 overflow-hidden z-30 pointer-events-none">
                    <div 
                      key={`card-timer-${activeIndex}`}
                      className="h-full bg-emerald-500 origin-left"
                      style={{
                        animation: `carouselTimerLine ${speedSeconds}s linear forwards`
                      }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                  
                  {/* Visual Artwork Column */}
                  <div className="md:col-span-5 relative h-56 md:h-auto min-h-[220px] overflow-hidden bg-slate-950">
                    <LazyImage
                      src={activeData.imageUrl}
                      alt={activeData.title}
                      className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                    
                    {/* Floating Pinned / Type Icon Badge */}
                    <div className="absolute top-3.5 start-3.5 flex items-center gap-1.5 z-10">
                      {activeCard.pinned && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500 text-slate-950 shadow-md">
                          <Pin className="w-3 h-3" />
                          <span>{language === 'ar' ? 'مثبت' : 'Pinned'}</span>
                        </span>
                      )}
                      {activeData.badge && (
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border backdrop-blur-md shadow-sm ${getBadgeColorClasses(activeCard.badgeColor)}`}>
                          {activeData.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Details Column */}
                  <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    
                    {/* Tags Row */}
                    <div className="space-y-3">
                      {activeData.tags && activeData.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeData.tags.map((tag) => {
                            const tagText = language === 'ar' ? tag.textAr : tag.textEn;
                            return (
                              <span
                                key={tag.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getBadgeColorClasses(tag.color)}`}
                              >
                                <Tag className="w-3 h-3 opacity-70" />
                                <span>{tagText}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Main Title */}
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                        {activeData.title}
                      </h3>

                      {/* Subtitle / Description */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {activeData.subtitle}
                      </p>
                    </div>

                    {/* Action Button & Metadata */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          if (activeData.onActionClick) {
                            try {
                              activeData.onActionClick();
                            } catch (err) {
                              console.error('Error executing carousel action:', err);
                              safeNavigate(activeData.actionLink || '#store');
                            }
                          } else if (activeData.actionLink) {
                            safeNavigate(activeData.actionLink);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <span>{activeData.actionText}</span>
                        {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                      </button>

                      {/* Quick Type Indicator */}
                      <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        {activeCard.type === 'auto_latest_product' && (language === 'ar' ? 'تحديث تلقائيّ للمتجر والكتب' : 'Auto synced with store')}
                        {activeCard.type === 'auto_latest_article' && (language === 'ar' ? 'تحديث تلقائيّ للمقالات والبحوث' : 'Auto synced with articles')}
                        {activeCard.type === 'auto_latest_portfolio' && (language === 'ar' ? 'تحديث تلقائيّ للإنتاج والمعرض' : 'Auto synced with portfolio')}
                        {activeCard.type === 'specific_item' && (language === 'ar' ? 'عرض مباشر لعنصر محدَّد' : 'Direct Item Spotlight')}
                        {activeCard.type === 'custom' && (language === 'ar' ? 'إعلان وعرض خاص' : 'Custom Announcement')}
                      </span>
                    </div>

                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right / Next Side Card (Smaller, dimmed, clickable) */}
          {totalCards > 1 && (
            <div 
              onClick={nextCard}
              className="hidden lg:block absolute end-0 top-1/2 -translate-y-1/2 w-[28%] max-w-sm h-[82%] z-10 cursor-pointer transition-all duration-500 transform scale-90 opacity-40 hover:opacity-75 hover:scale-95 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-lg backdrop-blur-xs"
            >
              <div className="relative w-full h-full overflow-hidden flex flex-col justify-end p-5">
                <LazyImage 
                  src={nextData.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover grayscale-[30%]"
                  containerClassName="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="relative z-10 space-y-1.5 text-white">
                  {nextData.badge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                      {nextData.badge}
                    </span>
                  )}
                  <h4 className="text-sm font-bold truncate">{nextData.title}</h4>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Carousel Dots Indicator Bar */}
        {totalCards > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {cards.map((card, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={card.id || idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'w-10 bg-slate-200 dark:bg-slate-800 ring-2 ring-emerald-500/20' 
                      : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  title={language === 'ar' ? `البطاقة ${idx + 1}` : `Slide ${idx + 1}`}
                >
                  {isActive && autoPlayEnabled && !isPaused && (
                    <span 
                      key={`dot-fill-${activeIndex}`}
                      className="absolute inset-0 bg-emerald-600 dark:bg-emerald-500 rounded-full block origin-left"
                      style={{
                        animation: `carouselTimerLine ${speedSeconds}s linear forwards`
                      }}
                    />
                  )}
                  {isActive && (!autoPlayEnabled || isPaused) && (
                    <span className="absolute inset-0 bg-emerald-600 dark:bg-emerald-500 rounded-full block" />
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
