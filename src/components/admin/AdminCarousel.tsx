import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Pin, 
  Save, 
  Sliders, 
  Tag as TagIcon, 
  Image as ImageIcon, 
  Check, 
  AlertCircle,
  BookOpen,
  FileText,
  FolderGit2,
  Megaphone,
  Clock,
  RotateCw,
  Layers,
  X,
  Compass,
  Link2,
  ExternalLink,
  Navigation,
  CheckCircle2,
  ArrowUpRight,
  Info,
  Upload
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanFirestorePayload } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { LazyImage } from '../LazyImage';
import { 
  SiteSettings, 
  CarouselCardItem, 
  CarouselCardType, 
  CarouselTag,
  ProductItem,
  ArticleItem,
  PortfolioItem
} from '../../types';
import { formatArabicText, fixArabicTanween, getArabicOrdinal } from '../../utils/arabicText';

interface AdminCarouselProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  products?: ProductItem[];
  articles?: ArticleItem[];
  portfolio?: PortfolioItem[];
  onRefresh?: () => void;
}

const DEFAULT_CAROUSEL_CARDS: CarouselCardItem[] = [
  {
    id: 'card-product-1',
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
    id: 'card-article-2',
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
    id: 'card-offer-3',
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
    id: 'card-portfolio-4',
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

export const AdminCarousel: React.FC<AdminCarouselProps> = ({
  settings,
  onUpdateSettings,
  products = [],
  articles = [],
  portfolio = [],
  onRefresh
}) => {
  const { language } = useLanguage();

  const [isEnabled, setIsEnabled] = useState<boolean>(
    settings.carouselEnabled !== false && settings.sectionVisibility?.showCarousel !== false
  );
  const [speed, setSpeed] = useState<number>(settings.carouselSpeed || 4);
  const [autoPlay, setAutoPlay] = useState<boolean>(settings.carouselAutoPlay !== false);
  const [pauseOnHover, setPauseOnHover] = useState<boolean>(settings.carouselPauseOnHover === true);
  const [titleAr, setTitleAr] = useState<string>(settings.carouselTitleAr || '');
  const [titleEn, setTitleEn] = useState<string>(settings.carouselTitleEn || '');
  const [subtitleAr, setSubtitleAr] = useState<string>(settings.carouselSubtitleAr || '');
  const [subtitleEn, setSubtitleEn] = useState<string>(settings.carouselSubtitleEn || '');

  const [cards, setCards] = useState<CarouselCardItem[]>(() => {
    if (settings.carouselCards && settings.carouselCards.length > 0) {
      return settings.carouselCards;
    }
    return DEFAULT_CAROUSEL_CARDS;
  });

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Tag form helper inside editor
  const [newTagTextAr, setNewTagTextAr] = useState('');
  const [newTagTextEn, setNewTagTextEn] = useState('');
  const [newTagColor, setNewTagColor] = useState<'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate'>('emerald');

  // Sync state if settings prop changes
  useEffect(() => {
    setIsEnabled(settings.carouselEnabled !== false && settings.sectionVisibility?.showCarousel !== false);
    setSpeed(settings.carouselSpeed || 4);
    setAutoPlay(settings.carouselAutoPlay !== false);
    setPauseOnHover(settings.carouselPauseOnHover === true);
    setTitleAr(settings.carouselTitleAr || '');
    setTitleEn(settings.carouselTitleEn || '');
    setSubtitleAr(settings.carouselSubtitleAr || '');
    setSubtitleEn(settings.carouselSubtitleEn || '');
    if (settings.carouselCards && settings.carouselCards.length > 0) {
      setCards(settings.carouselCards);
    }
  }, [settings]);

  // Calculate sequential occurrence offset for repeated auto card types
  // Example: 1st book card gets offset 0 (newest), 2nd gets offset 1 (previous), 3rd gets offset 2...
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

  // Card Reordering
  const moveCard = (idx: number, direction: 'up' | 'down') => {
    const list = [...cards];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((c, i) => ({ ...c, order: i + 1 }));
    setCards(reordered);
  };

  // Toggle card visibility
  const toggleCardEnabled = (id: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  // Toggle card pinned status
  const toggleCardPinned = (id: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  // Delete card
  const deleteCard = (id: string) => {
    if (cards.length <= 1) {
      alert(language === 'ar' ? 'يجب الإبقاء على بطاقة واحدة على الأقل في القائمة.' : 'Keep at least one card in the list.');
      return;
    }
    setCards(cards.filter(c => c.id !== id));
    if (editingCardId === id) setEditingCardId(null);
  };

  // Add new card
  const addNewCard = () => {
    const newCard: CarouselCardItem = {
      id: `card-${Date.now()}`,
      type: 'custom',
      titleAr: 'بطاقة إعلانية أو تنبيه جديد',
      titleEn: 'New Announcement or Alert',
      subtitleAr: 'أدخل تفاصيل الإعلان أو العرض الخاص أو التنبيه هنا.',
      subtitleEn: 'Enter announcement, promotion or alert description here.',
      imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=1000',
      badgeTextAr: 'تنبيه',
      badgeTextEn: 'Notice',
      badgeColor: 'amber',
      ctaTextAr: 'معرفة المزيد',
      ctaTextEn: 'Learn More',
      ctaLink: '#',
      targetType: 'section',
      targetSection: 'store',
      tags: [
        { id: `tag-${Date.now()}`, textAr: 'تنبيه هام', textEn: 'Notice', color: 'amber' }
      ],
      pinned: false,
      enabled: true,
      order: cards.length + 1
    };

    setCards([...cards, newCard]);
    setEditingCardId(newCard.id);
  };

  // Update card fields
  const updateEditingCard = (patch: Partial<CarouselCardItem>) => {
    if (!editingCardId) return;
    setCards(cards.map(c => c.id === editingCardId ? { ...c, ...patch } : c));
  };

  // Add Tag to editing card
  const handleAddTag = () => {
    if (!editingCardId || !newTagTextAr.trim()) return;
    const currentCard = cards.find(c => c.id === editingCardId);
    if (!currentCard) return;

    const newTag: CarouselTag = {
      id: `tag-${Date.now()}`,
      textAr: fixArabicTanween(newTagTextAr.trim()),
      textEn: newTagTextEn.trim() || newTagTextAr.trim(),
      color: newTagColor
    };

    const updatedTags = [...(currentCard.tags || []), newTag];
    updateEditingCard({ tags: updatedTags });
    setNewTagTextAr('');
    setNewTagTextEn('');
  };

  // Remove Tag from editing card
  const handleRemoveTag = (tagId: string) => {
    if (!editingCardId) return;
    const currentCard = cards.find(c => c.id === editingCardId);
    if (!currentCard) return;

    const updatedTags = (currentCard.tags || []).filter(t => t.id !== tagId);
    updateEditingCard({ tags: updatedTags });
  };

  // Save changes to Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      // Clean and normalize Arabic texts according to Classical Arabic & Tanween rule
      const normalizedCards = cards.map(c => ({
        ...c,
        titleAr: c.titleAr ? fixArabicTanween(c.titleAr) : c.titleAr,
        subtitleAr: c.subtitleAr ? fixArabicTanween(c.subtitleAr) : c.subtitleAr,
        badgeTextAr: c.badgeTextAr ? fixArabicTanween(c.badgeTextAr) : c.badgeTextAr,
        ctaTextAr: c.ctaTextAr ? fixArabicTanween(c.ctaTextAr) : c.ctaTextAr,
        tags: c.tags?.map(t => ({
          ...t,
          textAr: t.textAr ? fixArabicTanween(t.textAr) : t.textAr
        }))
      }));

      const updatedSettings: SiteSettings = {
        ...settings,
        carouselEnabled: isEnabled,
        carouselAutoPlay: autoPlay,
        carouselSpeed: Math.max(1, Number(speed) || 4),
        carouselPauseOnHover: pauseOnHover,
        carouselTitleAr: titleAr ? fixArabicTanween(titleAr) : titleAr,
        carouselTitleEn: titleEn,
        carouselSubtitleAr: subtitleAr ? fixArabicTanween(subtitleAr) : subtitleAr,
        carouselSubtitleEn: subtitleEn,
        carouselCards: normalizedCards,
        sectionVisibility: {
          ...(settings.sectionVisibility || {}),
          showCarousel: isEnabled
        }
      };

      const payload = cleanFirestorePayload(updatedSettings);
      await setDoc(doc(db, 'siteSettings', 'global'), payload, { merge: true });
      onUpdateSettings(updatedSettings);

      if (onRefresh) onRefresh();

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? 'تم حفظ إعدادات وبطاقات شريط الكاروسيل بنجاح!' 
          : 'Hero Carousel settings and cards saved successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error saving carousel settings:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar'
          ? 'تعذر الحفظ: ' + (err.message || 'خطأ في الاتصال')
          : 'Failed to save: ' + (err.message || 'Network error')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const editingCard = cards.find(c => c.id === editingCardId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-slate-900 dark:text-slate-100">
      
      {/* Top Banner & Master Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {language === 'ar' ? 'إدارة شريط الكاروسيل التفاعلي' : 'Hero Carousel Manager'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isEnabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
              }`}>
                {isEnabled ? (language === 'ar' ? 'مُفَعَّل ونَشِط' : 'Active') : (language === 'ar' ? 'مُعَطَّل حاليًّا' : 'Disabled')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {language === 'ar'
                ? 'تحكّم كامل بالبطاقات الدوارة، تثبيت آخر كتاب أو مقال تلقائيًّا، بطاقات الإعلانات والخصومات، الوسوم، والتأثيرات الحركية.'
                : 'Manage rotating cards, auto-sync latest releases, announcements, promotional tags, and 3D focus animation.'}
            </p>
          </div>
        </div>

        {/* Master Toggle & Save Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Master Enable/Disable Button */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
              isEnabled
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/60 dark:hover:bg-rose-900/50'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 dark:hover:bg-emerald-900/50'
            }`}
          >
            {isEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>
              {isEnabled 
                ? (language === 'ar' ? 'تعطيل الكاروسيل بالكامل' : 'Disable Carousel') 
                : (language === 'ar' ? 'تفعيل نظام الكاروسيل' : 'Enable Carousel')}
            </span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm animate-fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-200'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-700/60 dark:text-rose-200'
        }`}>
          {feedback.type === 'success' ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          <span className="text-xs sm:text-sm font-bold">{feedback.message}</span>
        </div>
      )}

      {/* Carousel Global Behavior & Headers Box */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إعدادات توقيت وتدوير الكاروسيل' : 'Carousel Timing & Playback Controls'}</span>
          </h3>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            {speed} {language === 'ar' ? 'ثوانٍ لكل بطاقة' : 'sec / card'}
          </span>
        </div>

        {/* Primary Dwell Duration & Behavior Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Duration Card (Takes 7 cols on desktop) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'مدة توقف البطاقة قبل الانتقال للتالية (بالثواني)' : 'Card Stay Duration Before Transition (Seconds)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'ar' 
                    ? 'حدد المدة الزمنية الدقيقة التي تظل فيها كل بطاقة ثابتة ومقروءة أمام الزائر.' 
                    : 'Configure the exact seconds each card stays visible before automatically rotating.'}
                </p>
              </div>

              {/* Direct Numeric Input with quick +/- buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSpeed(Math.max(1, speed - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  title={language === 'ar' ? 'إنقاص ثانية' : 'Decrease 1s'}
                >
                  -
                </button>
                <div className="flex items-center gap-1 px-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={speed}
                    onChange={(e) => setSpeed(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className="w-12 text-center bg-transparent text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'ث' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSpeed(Math.min(60, speed + 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                  title={language === 'ar' ? 'زيادة ثانية' : 'Increase 1s'}
                >
                  +
                </button>
              </div>
            </div>

            {/* Continuous Smooth Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-emerald-600 dark:accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>1 {language === 'ar' ? 'ثانية' : 'sec'}</span>
                <span>5 {language === 'ar' ? 'ثوانٍ' : 'sec'}</span>
                <span>10 {language === 'ar' ? 'ثوانٍ' : 'sec'}</span>
                <span>15 {language === 'ar' ? 'ثانية' : 'sec'}</span>
                <span>20 {language === 'ar' ? 'ثانية' : 'sec'}</span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                {language === 'ar' ? 'خيارات سريعة ومقترحة:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { sec: 2, labelAr: '2 ثوانٍ (سريع)', labelEn: '2s (Fast)' },
                  { sec: 3, labelAr: '3 ثوانٍ (نشط)', labelEn: '3s (Dynamic)' },
                  { sec: 4, labelAr: '4 ثوانٍ (موصى به)', labelEn: '4s (Recommended)' },
                  { sec: 5, labelAr: '5 ثوانٍ (متوازن)', labelEn: '5s (Balanced)' },
                  { sec: 7, labelAr: '7 ثوانٍ (هادئ)', labelEn: '7s (Relaxed)' },
                  { sec: 10, labelAr: '10 ثوانٍ (مطول)', labelEn: '10s (Long)' }
                ].map(preset => (
                  <button
                    key={preset.sec}
                    type="button"
                    onClick={() => setSpeed(preset.sec)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      speed === preset.sec
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50'
                    }`}
                  >
                    {language === 'ar' ? preset.labelAr : preset.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Explanation Badge */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
              <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-spin-slow" />
              <span>
                {language === 'ar'
                  ? `ستبقى كل بطاقة معروضة لمدة ${speed} ثوانٍ كاملة، ثم تنتقل تلقائياً للبطاقة التي تليها.`
                  : `Each card will remain visible for ${speed} full seconds before automatically rotating to the next card.`}
              </span>
            </div>
          </div>

          {/* Behavior Toggles Column (Takes 5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            
            {/* Auto Play Toggle Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold block text-slate-900 dark:text-white">
                  {language === 'ar' ? 'التدوير التلقائي المستمر' : 'Continuous Auto Play'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {autoPlay 
                    ? (language === 'ar' ? 'مفعّل: تدور البطاقات ذاتياً كل ' + speed + ' ثوانٍ.' : 'Enabled: Cards rotate automatically every ' + speed + 's.') 
                    : (language === 'ar' ? 'معطّل: التحرك يتم يدوياً فقط عبر الأسهم.' : 'Disabled: Manual arrows only.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoPlay(!autoPlay)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                  autoPlay ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Pause On Hover Toggle Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold block text-slate-900 dark:text-white">
                  {language === 'ar' ? 'إيقاف الحركة عند لمس الماوس' : 'Pause on Mouse Hover'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {pauseOnHover 
                    ? (language === 'ar' ? 'مفعّل: تتوقف البطاقة مؤقتاً عند وضع الماوس فوقها.' : 'Enabled: Slide freezes while cursor hovers over card.') 
                    : (language === 'ar' ? 'معطّل (الموصى به): تستمر الحركة بسلاسة دون تجمد أثناء التصفح.' : 'Disabled (Recommended): Rotation stays active even while hovering.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPauseOnHover(!pauseOnHover)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                  pauseOnHover ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

          </div>

        </div>

        {/* Section Titles Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'عنوان القسم الرئيسي (اختياري - عربي)' : 'Section Title (Arabic)'}
            </label>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="المختارات والإصدارات البارزة"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="space-y-1.5" dir="ltr">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Section Title (English)
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Featured Spotlight"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>

      </div>

      {/* Cards Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List of Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'قائمة بطاقات الكاروسيل' : 'Carousel Cards List'}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                {cards.length}
              </span>
            </h3>

            <button
              onClick={addNewCard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة بطاقة' : 'Add Card'}</span>
            </button>
          </div>

          {/* Cards Items List */}
          <div className="space-y-2.5">
            {cards.map((card, idx) => {
              const isSelected = card.id === editingCardId;
              const cardTitle = language === 'ar' ? card.titleAr : card.titleEn;

              return (
                <div
                  key={card.id}
                  onClick={() => setEditingCardId(card.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
                      : card.enabled
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <LazyImage
                        src={card.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'}
                        alt={card.titleAr || card.titleEn || ''}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                        fallbackIcon={
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        }
                      />
                    </div>

                    {/* Title & Badges */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {card.pinned && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-slate-950 shadow-xs">
                            <Pin className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'مثبت' : 'Pin'}</span>
                          </span>
                        )}
                        {(() => {
                          const offset = cardSequenceOffsets[card.id] ?? 0;
                          if (card.type === 'auto_latest_product') {
                            const ordinal = offset === 0 ? 'الأحدث نشرًا' : (offset === 1 ? 'السابق للأحدث (#2)' : `ترتيب (#${offset + 1})`);
                            return (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                                {language === 'ar' ? `كتاب: ${ordinal}` : `Book (#${offset + 1})`}
                              </span>
                            );
                          }
                          if (card.type === 'auto_latest_article') {
                            const ordinal = offset === 0 ? 'الأحدث نشرًا' : (offset === 1 ? 'السابق للأحدث (#2)' : `ترتيب (#${offset + 1})`);
                            return (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                                {language === 'ar' ? `مقال: ${ordinal}` : `Article (#${offset + 1})`}
                              </span>
                            );
                          }
                          if (card.type === 'auto_latest_portfolio') {
                            const ordinal = offset === 0 ? 'الأحدث نشرًا' : (offset === 1 ? 'السابق للأحدث (#2)' : `ترتيب (#${offset + 1})`);
                            return (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                                {language === 'ar' ? `عمل: ${ordinal}` : `Project (#${offset + 1})`}
                              </span>
                            );
                          }
                          if (card.type === 'specific_item') {
                            return (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                                {language === 'ar' ? 'عنصر محدَّد مباشر' : 'Direct Item'}
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {language === 'ar' ? 'إعلان مخصص' : 'Custom'}
                            </span>
                          );
                        })()}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {cardTitle || (language === 'ar' ? 'بطاقة بدون عنوان' : 'Untitled Card')}
                      </h4>
                    </div>
                  </div>

                  {/* Actions (Reorder, Visibility, Delete) */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Move Up */}
                    <button
                      onClick={() => moveCard(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      title={language === 'ar' ? 'تحريك لأعلى' : 'Move Up'}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => moveCard(idx, 'down')}
                      disabled={idx === cards.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 cursor-pointer"
                      title={language === 'ar' ? 'تحريك لأسفل' : 'Move Down'}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Pin */}
                    <button
                      onClick={() => toggleCardPinned(card.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        card.pinned ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/20' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                      }`}
                      title={language === 'ar' ? 'تثبيت البطاقة' : 'Pin Card'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Visibility */}
                    <button
                      onClick={() => toggleCardEnabled(card.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        card.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                      title={language === 'ar' ? 'إظهار / إخفاء' : 'Toggle Visibility'}
                    >
                      {card.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer"
                      title={language === 'ar' ? 'حذف البطاقة' : 'Delete Card'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card Editor Drawer */}
        <div className="lg:col-span-7">
          {editingCard ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{language === 'ar' ? 'تعديل بيانات البطاقة' : 'Edit Card Details'}</span>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">#{editingCard.order}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar'
                      ? 'حدد نوع البطاقة، النصوص، الوسوم، وألوان الشارات التفاعلية.'
                      : 'Configure card type, tags, actions, and media.'}
                  </p>
                </div>

                <button
                  onClick={() => setEditingCardId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Type Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'طريقة عمل البطاقة ومصدر المحتوى:' : 'Card Source & Data Type:'}
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'يدعم التسلسل التلقائي الذكي للبطاقات المتعددة' : 'Supports smart sequential resolution'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'auto_latest_product' as CarouselCardType,
                      labelAr: 'تلقائي: كتب المتجر',
                      labelEn: 'Auto: Store Books',
                      descAr: 'يعرض أحدث كتاب ثم السابق له بالتسلسل',
                      descEn: 'Sequentially resolves latest books',
                      icon: BookOpen,
                      color: 'emerald'
                    },
                    {
                      id: 'auto_latest_article' as CarouselCardType,
                      labelAr: 'تلقائي: المقالات والأبحاث',
                      labelEn: 'Auto: Essays & Research',
                      descAr: 'يعرض أحدث مقال ثم السابق له بالتسلسل',
                      descEn: 'Sequentially resolves latest essays',
                      icon: FileText,
                      color: 'blue'
                    },
                    {
                      id: 'auto_latest_portfolio' as CarouselCardType,
                      labelAr: 'تلقائي: المعرض والوثائقيات',
                      labelEn: 'Auto: Documentaries',
                      descAr: 'يعرض أحدث عمل ثم السابق له بالتسلسل',
                      descEn: 'Sequentially resolves latest projects',
                      icon: FolderGit2,
                      color: 'purple'
                    },
                    {
                      id: 'specific_item' as CarouselCardType,
                      labelAr: 'عنصر محدَّد بالاسم',
                      labelEn: 'Specific Item Spotlight',
                      descAr: 'تثبيت كتاب، مقال، أو فيلم محدد بذاته',
                      descEn: 'Spotlight a specific chosen item',
                      icon: Compass,
                      color: 'amber'
                    },
                    {
                      id: 'custom' as CarouselCardType,
                      labelAr: 'مخصص: إعلان أو تنبيه',
                      labelEn: 'Custom Announcement',
                      descAr: 'تحكم يدوي كامل بالنصوص، الروابط، والشارات',
                      descEn: 'Fully custom promo, text, image, and link',
                      icon: Megaphone,
                      color: 'rose'
                    },
                  ].map((item) => {
                    const isSelected = editingCard.type === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => updateEditingCard({ type: item.id })}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-slate-900 dark:text-white shadow-xs ring-1 ring-emerald-500/40'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          <span className="text-xs font-bold block text-slate-900 dark:text-white truncate">
                            {language === 'ar' ? item.labelAr : item.labelEn}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                            {language === 'ar' ? item.descAr : item.descEn}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Sequence Information Banner (For repeated auto cards) */}
              {['auto_latest_product', 'auto_latest_article', 'auto_latest_portfolio'].includes(editingCard.type) && (() => {
                const currentOffset = cardSequenceOffsets[editingCard.id] ?? 0;
                let resolvedTargetName = '';
                let typeLabelAr = '';

                if (editingCard.type === 'auto_latest_product') {
                  typeLabelAr = 'أحدث كتاب';
                  const prod = products.length > 0 ? products[currentOffset % products.length] : null;
                  resolvedTargetName = prod ? (language === 'ar' ? prod.nameAr : prod.nameEn) : 'لم تتم إضافة كتب بالمتجر بعد';
                } else if (editingCard.type === 'auto_latest_article') {
                  typeLabelAr = 'أحدث مقال';
                  const art = articles.length > 0 ? articles[currentOffset % articles.length] : null;
                  resolvedTargetName = art ? (language === 'ar' ? art.titleAr : art.titleEn) : 'لم تتم إضافة مقالات بعد';
                } else if (editingCard.type === 'auto_latest_portfolio') {
                  typeLabelAr = 'أحدث إنتاج وثائقي';
                  const proj = portfolio.length > 0 ? portfolio[currentOffset % portfolio.length] : null;
                  resolvedTargetName = proj ? (language === 'ar' ? proj.titleAr : proj.titleEn) : 'لم تتم إضافة أعمال بالمعرض بعد';
                }

                const ordinalLabelAr = currentOffset === 0 
                  ? 'الأحدث نشرًا (#1)' 
                  : currentOffset === 1 
                  ? 'السابق للأحدث (#2)' 
                  : `الترتيب رقم (${currentOffset + 1})`;

                return (
                  <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            {language === 'ar' ? 'التسلسل التلقائي الذكي للبطاقات المتكررة' : 'Smart Auto Sequence Resolution'}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                            {language === 'ar' ? `البطاقة رقم ${currentOffset + 1} من نوع (${typeLabelAr})` : `Card #${currentOffset + 1}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                          {language === 'ar'
                            ? `نظام ذكي: عند وجود أكثر من بطاقة من نفس النوع، فإن البطاقة الأولى تجلب الأحدث، والبطاقة الثانية تجلب السابق له، والثالثة تجلب الذي قبله تلقائيًّا. هذه البطاقة ستعرض حاليًّا: «${resolvedTargetName}» (${ordinalLabelAr}).`
                            : `Automatically resolves to item #${currentOffset + 1}: "${resolvedTargetName}".`}
                        </p>
                      </div>
                    </div>

                    {/* Manual override option */}
                    <div className="pt-2.5 border-t border-emerald-200/70 dark:border-emerald-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-emerald-950 dark:text-emerald-200">
                        {language === 'ar' ? 'تخصيص ترتيب العنصر المستجلب (اختياري):' : 'Custom Sequence Offset (Optional):'}
                      </span>
                      <select
                        value={editingCard.autoOffset !== undefined ? editingCard.autoOffset : -1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateEditingCard({ autoOffset: val === -1 ? undefined : val });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs cursor-pointer"
                      >
                        <option value={-1}>
                          {language === 'ar' ? `تلقائيّ حسب ترتيب البطاقة في الشريط (#${currentOffset + 1})` : `Auto by carousel position (#${currentOffset + 1})`}
                        </option>
                        <option value={0}>{language === 'ar' ? 'العنصر الأول: الأحدث نشرًا (#1)' : 'Index 0: Newest (#1)'}</option>
                        <option value={1}>{language === 'ar' ? 'العنصر الثاني: السابق للأحدث (#2)' : 'Index 1: 2nd Newest (#2)'}</option>
                        <option value={2}>{language === 'ar' ? 'العنصر الثالث: في الترتيب (#3)' : 'Index 2: 3rd Newest (#3)'}</option>
                        <option value={3}>{language === 'ar' ? 'العنصر الرابع: في الترتيب (#4)' : 'Index 3: 4th Newest (#4)'}</option>
                        <option value={4}>{language === 'ar' ? 'العنصر الخامس: في الترتيب (#5)' : 'Index 4: 5th Newest (#5)'}</option>
                      </select>
                    </div>
                  </div>
                );
              })()}

              {/* Specific Item Picker (If specific_item is chosen) */}
              {editingCard.type === 'specific_item' && (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-600" />
                      <span>{language === 'ar' ? 'اختر العنصر المراد تثبيته بالبطاقة:' : 'Select Target Item to Spotlight:'}</span>
                    </label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">
                      {language === 'ar' ? 'يمكنك تعبئة بيانات البطاقة منه بضغطة واحدة' : 'One-click auto fill available'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Category Selector */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {language === 'ar' ? 'نوع العنصر:' : 'Item Type:'}
                      </label>
                      <select
                        value={editingCard.targetType || 'product'}
                        onChange={(e) => {
                          const newType = e.target.value as any;
                          updateEditingCard({ 
                            targetType: newType,
                            targetId: undefined
                          });
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="product">{language === 'ar' ? 'كتاب / إصدار من المتجر' : 'Store Book / Publication'}</option>
                        <option value="article">{language === 'ar' ? 'مقال / دراسة فكرية' : 'Article / Study'}</option>
                        <option value="portfolio">{language === 'ar' ? 'عمل / فيلم وثائقي' : 'Documentary Work'}</option>
                      </select>
                    </div>

                    {/* Specific Item Select Dropdown */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {language === 'ar' ? 'العنصر المحدد:' : 'Specific Item:'}
                      </label>
                      <select
                        value={editingCard.targetId || ''}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          updateEditingCard({ targetId: chosenId });
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium truncate"
                      >
                        <option value="">{language === 'ar' ? '-- اختر العنصر من القائمة --' : '-- Choose Item --'}</option>
                        {editingCard.targetType === 'article' ? (
                          articles.map(art => (
                            <option key={art.id} value={art.id}>
                              {art.titleAr} ({art.category || 'مقال'})
                            </option>
                          ))
                        ) : editingCard.targetType === 'portfolio' ? (
                          portfolio.map(proj => (
                            <option key={proj.id} value={proj.id}>
                              {proj.titleAr} ({proj.category || 'عمل وثائقي'})
                            </option>
                          ))
                        ) : (
                          products.map(prod => (
                            <option key={prod.id} value={prod.id}>
                              {prod.nameAr} ({prod.price} {prod.currency || '$'})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Auto-fill button */}
                  {editingCard.targetId && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingCard.targetType === 'article') {
                            const art = articles.find(a => a.id === editingCard.targetId);
                            if (art) {
                              updateEditingCard({
                                titleAr: art.titleAr,
                                titleEn: art.titleEn || art.titleAr,
                                subtitleAr: art.excerptAr || '',
                                subtitleEn: art.excerptEn || art.excerptAr || '',
                                imageUrl: art.coverImage || editingCard.imageUrl,
                                badgeTextAr: 'مقال مختار',
                                badgeTextEn: 'Featured Essay',
                                ctaTextAr: 'قراءة المقال كاملًا',
                                ctaTextEn: 'Read Article'
                              });
                            }
                          } else if (editingCard.targetType === 'portfolio') {
                            const proj = portfolio.find(p => p.id === editingCard.targetId);
                            if (proj) {
                              updateEditingCard({
                                titleAr: proj.titleAr,
                                titleEn: proj.titleEn || proj.titleAr,
                                subtitleAr: proj.shortDescAr || '',
                                subtitleEn: proj.shortDescEn || proj.shortDescAr || '',
                                imageUrl: proj.thumbnail || editingCard.imageUrl,
                                badgeTextAr: 'عمل وثائقي مميز',
                                badgeTextEn: 'Featured Project',
                                ctaTextAr: 'استعراض العمل والوثائقي',
                                ctaTextEn: 'View Project'
                              });
                            }
                          } else {
                            const prod = products.find(p => p.id === editingCard.targetId);
                            if (prod) {
                              updateEditingCard({
                                titleAr: prod.nameAr,
                                titleEn: prod.nameEn || prod.nameAr,
                                subtitleAr: prod.descriptionAr || '',
                                subtitleEn: prod.descriptionEn || prod.descriptionAr || '',
                                imageUrl: (prod.images && prod.images[0]) || editingCard.imageUrl,
                                badgeTextAr: 'كتاب مميز',
                                badgeTextEn: 'Featured Book',
                                ctaTextAr: 'شراء أو استعراض الكتاب',
                                ctaTextEn: 'View Book'
                              });
                            }
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تعبئة بيانات البطاقة تلقائيًّا من هذا العنصر' : 'Pre-fill Card Fields with this Item'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Title Inputs: English on Left, Arabic on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Card Title (English)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingCard.titleEn || ''}
                    onChange={(e) => updateEditingCard({ titleEn: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium text-left"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'عنوان البطاقة (عربي)' : 'Card Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={editingCard.titleAr || ''}
                    onChange={(e) => updateEditingCard({ titleAr: fixArabicTanween(e.target.value) })}
                    placeholder={language === 'ar' ? 'اتركه فارغاً للاستجلاب التلقائي أو اكتب عنواناً مخصصاً' : 'Title'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium text-right"
                  />
                </div>
              </div>

              {/* Subtitle / Description Inputs: English on Left, Arabic on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subtitle / Description (English)
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={editingCard.subtitleEn || ''}
                    onChange={(e) => updateEditingCard({ subtitleEn: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium text-left"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الوصف والنص المختصر (عربي)' : 'Subtitle / Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={editingCard.subtitleAr || ''}
                    onChange={(e) => updateEditingCard({ subtitleAr: fixArabicTanween(e.target.value) })}
                    placeholder={language === 'ar' ? 'اتركه فارغاً للاستجلاب التلقائي أو اكتب وصفاً مخصصاً' : 'Description'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium text-right"
                  />
                </div>
              </div>

              {/* Image URL & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Image URL with Upload & Instant Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'ar' ? 'رابط الصورة (اتركه فارغاً للاستجلاب التلقائي)' : 'Image URL'}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors border border-slate-300 dark:border-slate-700">
                      <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'ar' ? 'رفع من الجهاز' : 'Upload from device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                updateEditingCard({ imageUrl: event.target.result as string });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={editingCard.imageUrl || ''}
                    onChange={(e) => updateEditingCard({ imageUrl: e.target.value })}
                    placeholder="https://drive.google.com/... أو رابط مباشر أو صورة Unsplash"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />

                  {/* Live Preview */}
                  {editingCard.imageUrl && editingCard.imageUrl.trim() !== '' && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <LazyImage
                        src={editingCard.imageUrl}
                        alt="Carousel card preview"
                        className="w-16 h-12 rounded-lg object-cover bg-slate-950 shrink-0"
                        containerClassName="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600"
                        fallbackIcon={
                          <div className="w-16 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-white/40 shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          {language === 'ar' ? 'معاينة صورة البطاقة نشطة' : 'Live Card Image Preview Active'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {editingCard.imageUrl.slice(0, 50)}...
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateEditingCard({ imageUrl: '' })}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                        title={language === 'ar' ? 'إزالة' : 'Remove'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Badge text & color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الشارة العلوية (مثال: إصدار جديد / خصم خاص)' : 'Top Badge Text'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingCard.badgeTextAr || ''}
                      onChange={(e) => updateEditingCard({ badgeTextAr: fixArabicTanween(e.target.value) })}
                      placeholder="إصدار جديد"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                    />
                    <select
                      value={editingCard.badgeColor || 'emerald'}
                      onChange={(e) => updateEditingCard({ badgeColor: e.target.value as any })}
                      className="px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                    >
                      <option value="emerald">زمردي (Emerald)</option>
                      <option value="amber">أصفر (Amber)</option>
                      <option value="rose">وردي (Rose)</option>
                      <option value="blue">أزرق (Blue)</option>
                      <option value="purple">بنفسجي (Purple)</option>
                      <option value="slate">رمادي (Slate)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button Destination & Interaction Settings */}
              {/* As requested: User selects section from a friendly dropdown without writing # */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'وجهة زر التفاعل وتحديد القسم أو الرابط:' : 'Action Button Destination & Interaction:'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'اختر القسم مباشرةً من القائمة دون الحاجة لكتابة #' : 'Select section directly without typing #'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Destination Mode Selector */}
                  {(() => {
                    const isExternalMode = editingCard.targetType === 'url' || Boolean(editingCard.ctaLink && !editingCard.ctaLink.startsWith('#') && !editingCard.targetSection);

                    return (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {language === 'ar' ? 'نوع الوجهة والتفاعل:' : 'Destination Type:'}
                          </label>
                          <select
                            value={isExternalMode ? 'custom_url' : 'section'}
                            onChange={(e) => {
                              const mode = e.target.value;
                              if (mode === 'section') {
                                const defaultSec = editingCard.targetSection || 'store';
                                updateEditingCard({
                                  targetType: 'section',
                                  targetSection: defaultSec,
                                  ctaLink: '#' + defaultSec
                                });
                              } else {
                                updateEditingCard({
                                  targetType: 'url',
                                  targetSection: undefined,
                                  ctaLink: (editingCard.ctaLink && !editingCard.ctaLink.startsWith('#')) ? editingCard.ctaLink : 'https://'
                                });
                              }
                            }}
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                          >
                            <option value="section">
                              {language === 'ar' ? 'الانتقال إلى قسم في الصفحة الرئيسية (موصى به)' : 'Navigate to page section'}
                            </option>
                            <option value="custom_url">
                              {language === 'ar' ? 'رابط مخصص (رابط خارجي مثل يوتيوب أو موقع آخر)' : 'Custom External URL'}
                            </option>
                          </select>
                        </div>

                        {/* Section Choice OR Custom URL input */}
                        {!isExternalMode ? (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {language === 'ar' ? 'اختر القسم المستهدف:' : 'Target Section:'}
                            </label>
                            <select
                              value={editingCard.targetSection || (editingCard.ctaLink?.replace('#', '') || 'store')}
                              onChange={(e) => {
                                const sec = e.target.value as 'store' | 'articles' | 'portfolio' | 'about' | 'contact' | 'services';
                                updateEditingCard({
                                  targetType: 'section',
                                  targetSection: sec,
                                  ctaLink: '#' + sec
                                });
                              }}
                              className="w-full px-3.5 py-2 text-xs rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer ring-1 ring-emerald-400/30"
                            >
                              <option value="store">{language === 'ar' ? '📚 متجر الكتب والمؤلفات الفكرية (#store)' : 'Store & Books'}</option>
                              <option value="articles">{language === 'ar' ? '📝 المقالات والدراسات المحكمة (#articles)' : 'Articles & Research'}</option>
                              <option value="portfolio">{language === 'ar' ? '🎬 معرض الأعمال والإنتاج الوثائقي (#portfolio)' : 'Portfolio & Documentaries'}</option>
                              <option value="about">{language === 'ar' ? '👤 نبذة عن المؤلف والمشروع الفكري (#about)' : 'About Author & Project'}</option>
                              <option value="contact">{language === 'ar' ? '✉️ التواصل وحجز الاستشارات (#contact)' : 'Contact & Consultations'}</option>
                              <option value="services">{language === 'ar' ? '💼 الخدمات والاستشارات (#services)' : 'Services'}</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>{language === 'ar' ? 'الرابط الخارجي المخصص:' : 'Custom External URL:'}</span>
                              <span className="text-[10px] text-slate-400 font-normal">مثال: https://...</span>
                            </label>
                            <input
                              type="url"
                              value={editingCard.ctaLink || ''}
                              onChange={(e) => updateEditingCard({ 
                                targetType: 'url',
                                targetSection: undefined,
                                ctaLink: e.target.value 
                              })}
                              placeholder="https://..."
                              className="w-full px-3.5 py-2 text-xs rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 ring-1 ring-emerald-400/30"
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Button Label Inputs: English on Left, Arabic on Right */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700/60" dir="ltr">
                  <div className="space-y-1.5 text-left" dir="ltr">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Button Label (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editingCard.ctaTextEn || ''}
                      onChange={(e) => updateEditingCard({ ctaTextEn: e.target.value })}
                      placeholder="e.g. View Details / Read Article"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-left"
                    />
                  </div>

                  <div className="space-y-1.5 text-right" dir="rtl">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'نص زر التفاعل (عربي)' : 'Button Label (Arabic)'}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={editingCard.ctaTextAr || ''}
                      onChange={(e) => updateEditingCard({ ctaTextAr: fixArabicTanween(e.target.value) })}
                      placeholder={language === 'ar' ? 'مثال: شراء أو استعراض الكتاب / استكشف المزيد' : 'e.g. View Book Details'}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-right"
                    />
                  </div>
                </div>

                {/* Quick Presets for button label */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'ar' ? 'اقتراحات سريعة لنص الزر:' : 'Quick Presets:'}
                  </span>
                  {[
                    { ar: 'شراء أو استعراض الكتاب', en: 'View Book Details' },
                    { ar: 'قراءة المقال كاملًا', en: 'Read Article' },
                    { ar: 'مشاهدة العمل الوثائقي', en: 'Watch Documentary' },
                    { ar: 'استكشف المتجر', en: 'Explore Store' },
                    { ar: 'معرفة المزيد', en: 'Learn More' },
                  ].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => updateEditingCard({ ctaTextAr: p.ar, ctaTextEn: p.en })}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? p.ar : p.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Manager ("وسوم فوق البطاقة أقدر اضيفها او الغيا") */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'الوسوم فوق البطاقة (Tags)' : 'Card Tags'}</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'أضف وسوماً مميزة لكل بطاقة' : 'Add custom tags with distinct colors'}
                  </span>
                </div>

                {/* Active Tags list */}
                <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
                  {(editingCard.tags && editingCard.tags.length > 0) ? (
                    editingCard.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          tag.color === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30' :
                          tag.color === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30' :
                          tag.color === 'blue' ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30' :
                          tag.color === 'purple' ? 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30' :
                          tag.color === 'slate' ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                        }`}
                      >
                        <span>{language === 'ar' ? tag.textAr : tag.textEn}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title={language === 'ar' ? 'إزالة الوسم' : 'Remove tag'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                      {language === 'ar' ? 'لا توجد وسوم مضافة لهذه البطاقة حالياً' : 'No tags added yet'}
                    </span>
                  )}
                </div>

                {/* Add Tag Row: English on Left, Arabic on Right */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60" dir="ltr">
                  <input
                    type="text"
                    dir="ltr"
                    value={newTagTextEn}
                    onChange={(e) => setNewTagTextEn(e.target.value)}
                    placeholder="Tag (En)"
                    className="w-28 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-left"
                  />
                  <input
                    type="text"
                    dir="rtl"
                    value={newTagTextAr}
                    onChange={(e) => setNewTagTextAr(e.target.value)}
                    placeholder={language === 'ar' ? 'نص الوسم (عربي)' : 'Tag text (Arabic)'}
                    className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-right"
                  />
                  <select
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="emerald">زمردي</option>
                    <option value="amber">أصفر</option>
                    <option value="rose">وردي</option>
                    <option value="blue">أزرق</option>
                    <option value="purple">بنفسجي</option>
                    <option value="slate">رمادي</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTagTextAr.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة وسم' : 'Add Tag'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed text-center text-slate-400 dark:text-slate-500 space-y-3">
              <Sparkles className="w-10 h-10 opacity-30 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'اختر بطاقة من القائمة لتعديل تفاصيلها' : 'Select a card from the list to edit'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  {language === 'ar'
                    ? 'يمكنك تثبيت بطاقات تلقائية لآخر الكتب، المقالات، والأعمال، أو إنشاء بطاقات مخصصة للإعلانات والتنبيهات.'
                    : 'Configure auto-updating cards or custom promotional announcements.'}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
