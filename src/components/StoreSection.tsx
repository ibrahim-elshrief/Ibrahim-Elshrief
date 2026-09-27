import React, { useState, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useComparison } from '../context/ComparisonContext';
import { ProductItem, SiteSettings, StoreCategoryItem, HomeSectionItem } from '../types';
import { formatPrice } from '../utils/currencies';
import { LazyImage } from './LazyImage';
import { FilePreviewer } from './FilePreviewer';
import { StoreSkeletonGrid } from './SkeletonLoader';
import { productMatchesCategory, getProductsForCategory } from '../utils/categoryMatching';
import { 
  ShoppingBag, 
  Download, 
  Package, 
  Calendar, 
  Check, 
  BookOpen,
  Library,
  Video,
  GraduationCap,
  Mic,
  Feather,
  Scroll,
  Film,
  FileText,
  Search,
  Bookmark,
  Lightbulb,
  Compass,
  Quote,
  Award,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Layers,
  Columns,
  ArrowLeft,
  Heart,
  ArrowLeftRight,
  Star,
  AlertCircle,
  X
} from 'lucide-react';
import { SectionEmptyState } from './SectionEmptyState';

interface StoreSectionProps {
  products: ProductItem[];
  settings?: SiteSettings;
  currency?: string;
  onSelectProduct: (product: ProductItem) => void;
  activeCategoryFilter?: string;
  onFilterChange?: (filter: string) => void;
  loading?: boolean;
  sectionConfig?: HomeSectionItem;
}

const culturalIconsMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Library,
  Video,
  GraduationCap,
  Mic,
  Feather,
  Scroll,
  Film,
  FileText,
  Search,
  Bookmark,
  Lightbulb,
  Compass,
  Quote,
  Award,
  ShieldCheck,
  ShoppingBag
};

export const StoreSection: React.FC<StoreSectionProps> = ({ 
  products, 
  settings,
  currency = 'USD',
  onSelectProduct,
  activeCategoryFilter,
  onFilterChange,
  loading = false,
  sectionConfig
}) => {
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isInComparison, toggleComparison } = useComparison();
  const [internalFilter, setInternalFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'shelves' | 'grid'>('shelves');
  const [layoutStyle, setLayoutStyle] = useState<'masonry' | 'grid'>('masonry');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const sectionBadge = (language === 'ar' 
    ? (sectionConfig?.badgeAr || settings?.storeBadgeAr)
    : (sectionConfig?.badgeEn || settings?.storeBadgeEn)) 
    || (language === 'ar' ? 'المتجر والمنتجات' : 'Store & Catalog');

  const sectionTitle = (language === 'ar'
    ? (sectionConfig?.titleAr || settings?.storeTitleAr)
    : (sectionConfig?.titleEn || settings?.storeTitleEn))
    || (language === 'ar' ? 'المنتجات والحلول' : 'Products & Solutions');

  const sectionSubtitle = (language === 'ar'
    ? (sectionConfig?.subtitleAr || settings?.storeSubAr)
    : (sectionConfig?.subtitleEn || settings?.storeSubEn))
    || (language === 'ar' 
      ? 'تصفح باقة منتقاة من المنتجات، الحلول، والملفات الرقمية المتاحة للطلب الفوري.' 
      : 'Explore a curated collection of premium products, solutions, and digital items available instantly.');

  const activeFilter = activeCategoryFilter !== undefined ? activeCategoryFilter : internalFilter;

  const setActiveFilter = (val: string) => {
    setInternalFilter(val);
    if (onFilterChange) {
      onFilterChange(val);
    }
  };

  // Derive dynamic custom categories from settings or standard fallbacks
  const customCategories: StoreCategoryItem[] = useMemo(() => {
    if (settings?.storeCategories && settings.storeCategories.length > 0) {
      return [...settings.storeCategories].sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0));
    }
    return [
      {
        id: 'cat-digital',
        slug: 'digital',
        nameAr: 'كتب ومواد رقمية',
        nameEn: 'Books & Digital Media',
        enabledOnHome: true,
        homeLimit: 4,
        homeOrder: 1,
        badgeAr: 'تحميل فوري',
        badgeEn: 'Instant Downloads',
        subtitleAr: 'كتب إلكترونية، ملفات صوتية ومرئية، وأبحاث جاهزة للاستخدام والتحميل المباشر',
        subtitleEn: 'E-books, audio-visual files, and research ready for instant access',
        iconName: 'Layers'
      },
      {
        id: 'cat-physical',
        slug: 'physical',
        nameAr: 'مطبوعات وإصدارات ورقية',
        nameEn: 'Printed Books & Publications',
        enabledOnHome: true,
        homeLimit: 4,
        homeOrder: 2,
        badgeAr: 'شحن وتوصيل',
        badgeEn: 'Physical Shipping',
        subtitleAr: 'كتب ومطبوعات وإصدارات متخصصة متوفرة للشحن والتوصيل المباشر',
        subtitleEn: 'Curated physical books, publications, and items available for shipping',
        iconName: 'Package'
      },
      {
        id: 'cat-services',
        slug: 'services',
        nameAr: 'خدمات واستشارات',
        nameEn: 'Services & Advisory',
        enabledOnHome: true,
        homeLimit: 4,
        homeOrder: 3,
        badgeAr: 'استشارات متخصصة',
        badgeEn: 'Direct Advisory',
        subtitleAr: 'جلسات استشارية وخدمات تنفيذية مصممة خصيصاً لمشاريعك',
        subtitleEn: 'Custom advisory sessions and professional services tailored to your needs',
        iconName: 'Sparkles'
      }
    ];
  }, [settings?.storeCategories]);

  // Categories selected to be shown on the homepage
  const homeEnabledCategories = useMemo(() => {
    return customCategories.filter(c => c.enabledOnHome !== false);
  }, [customCategories]);

  const filterTabs = [
    { id: 'all', label: language === 'ar' ? 'كافة المنتجات والأقسام' : 'All Products & Departments' },
    ...customCategories.map(cat => ({
      id: cat.slug || cat.id,
      label: language === 'ar' ? cat.nameAr : cat.nameEn
    }))
  ];

  // Active Category Details if a specific category is filtered
  const activeCategoryItem = useMemo(() => {
    if (activeFilter === 'all') return null;
    return customCategories.find(c => c.slug === activeFilter || c.id === activeFilter) || null;
  }, [activeFilter, customCategories]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const published = (products || []).filter(p => p && p.status === 'published' && !p.isArchived);
    if (activeFilter === 'all') return published;

    const targetCat = customCategories.find(c => c.slug === activeFilter || c.id === activeFilter);
    if (targetCat) {
      return getProductsForCategory(published, targetCat, false);
    }

    // Direct fallback check
    return published.filter(p => {
      const prodCat = (p.category || '').toLowerCase().trim();
      return prodCat === activeFilter.toLowerCase().trim();
    });
  }, [products, activeFilter, customCategories]);

  const totalPublishedCount = useMemo(() => {
    return (products || []).filter(p => p && p.status === 'published' && !p.isArchived).length;
  }, [products]);

  const handleFilterClick = (tabId: string) => {
    setActiveFilter(tabId);
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, product: ProductItem) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  // Reusable Single Product Card Component
  const renderProductCard = (prod: ProductItem) => {
    const name = language === 'ar' ? prod.nameAr : prod.nameEn;
    const desc = language === 'ar' ? prod.descriptionAr : prod.descriptionEn;
    const isAdded = addedIds[prod.id];
    
    // Live warehouse inventory availability
    const currentStock = prod.stock !== undefined ? prod.stock : 0;
    const isUnpublished = prod.status !== 'published';
    const isOutOfStock = currentStock <= 0;
    const isLowStock = !isOutOfStock && currentStock <= (prod.lowStockThreshold || 5);

    return (
      <div
        key={prod.id}
        id={`product-card-${prod.id}`}
        onClick={() => onSelectProduct(prod)}
        className={`group cursor-pointer rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-500/60 dark:hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between ${
          layoutStyle === 'masonry' ? 'break-inside-avoid w-full inline-block mb-6 align-top' : ''
        }`}
      >
        {/* Product Image & Badges with FilePreviewer & Masonry Handling */}
        <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-neutral-950 ${
          layoutStyle === 'grid' ? 'aspect-4/3' : 'min-h-[220px] max-h-[440px]'
        }`}>
          <FilePreviewer
            src={prod.images && prod.images[0]}
            alt={name}
            mode="thumbnail"
            aspectRatio={layoutStyle === 'grid' ? 'aspect-4/3' : ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            containerClassName="w-full h-full"
            fallbackIcon={<ShoppingBag className="w-10 h-10 text-slate-400 dark:text-neutral-600" />}
          />
          
          {/* Category / Type Badge */}
          <div className="absolute top-3 start-3 pointer-events-none">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900/80 text-white dark:bg-neutral-950/90 dark:text-neutral-200 border border-slate-700 dark:border-neutral-800 backdrop-blur-xs">
              {prod.category || (prod.type === 'physical' ? (language === 'ar' ? 'منتج ملموس' : 'Physical') : (language === 'ar' ? 'رقمي' : 'Digital'))}
            </span>
          </div>

          {/* Warehouse Stock Availability Badge */}
          {isUnpublished ? (
            <div className="absolute bottom-3 end-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-xs shadow-xs pointer-events-none">
              {language === 'ar' ? 'غير معروض حالياً' : 'Not Listed'}
            </div>
          ) : isOutOfStock ? (
            <div className="absolute bottom-3 end-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600/95 text-white backdrop-blur-xs shadow-xs pointer-events-none flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{language === 'ar' ? 'نفد من المخزن' : 'Out of Stock'}</span>
            </div>
          ) : isLowStock ? (
            <div className="absolute bottom-3 end-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-neutral-950 shadow-xs pointer-events-none flex items-center gap-1">
              <span>⚡ {language === 'ar' ? `متبقي ${currentStock} فقط` : `Only ${currentStock} left`}</span>
            </div>
          ) : (
            <div className="absolute bottom-3 end-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/90 text-white backdrop-blur-xs shadow-xs pointer-events-none flex items-center gap-1">
              <span>{language === 'ar' ? 'متوفر' : 'In Stock'}</span>
            </div>
          )}

          {/* Instant Download Icon for Digital */}
          {prod.type === 'digital' && (
            <div className="absolute bottom-3 start-3 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs pointer-events-none" title="Instant Digital Download">
              <Download className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Quick Action Overlay: Wishlist & Compare Buttons */}
          <div className="absolute top-3 end-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(prod);
              }}
              className={`p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
                isInWishlist(prod.id)
                  ? 'bg-rose-600 text-white'
                  : 'bg-black/60 hover:bg-black/80 text-white/90 hover:text-white'
              }`}
              title={isInWishlist(prod.id) ? (language === 'ar' ? 'محفوظ في الرغبات' : 'Saved in Wishlist') : (language === 'ar' ? 'حفظ في الرغبات' : 'Add to Wishlist')}
            >
              <Heart className={`w-3.5 h-3.5 ${isInWishlist(prod.id) ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleComparison(prod);
              }}
              className={`p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
                isInComparison(prod.id)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-black/60 hover:bg-black/80 text-white/90 hover:text-white'
              }`}
              title={isInComparison(prod.id) ? (language === 'ar' ? 'مضاف للمقارنة' : 'In Comparison') : (language === 'ar' ? 'مقارنة المنتج' : 'Compare Product')}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide truncate max-w-[140px]">
                {prod.category}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold ${
                  isUnpublished 
                    ? 'text-slate-400' 
                    : isOutOfStock 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : isLowStock 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isUnpublished 
                    ? (language === 'ar' ? 'غير معروض' : 'Unlisted') 
                    : isOutOfStock 
                    ? (language === 'ar' ? 'نفد الرصيد' : 'Out of stock') 
                    : isLowStock 
                    ? (language === 'ar' ? `متبقي ${currentStock}` : `${currentStock} left`) 
                    : (language === 'ar' ? `متوفر (${currentStock})` : `In stock (${currentStock})`)}
                </span>
                {Boolean(prod.averageRating && prod.averageRating > 0) && (
                  <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs font-mono font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{prod.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
              {name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-2">
              {desc}
            </p>
          </div>

          {/* Price & Add to Cart */}
          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                {formatPrice(prod.price, prod.currency || settings?.currency || currency || 'USD', language)}
              </span>
              {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                <span className="text-xs text-slate-400 dark:text-neutral-500 line-through ms-2 font-mono">
                  {formatPrice(prod.compareAtPrice, prod.currency || settings?.currency || currency || 'USD', language)}
                </span>
              )}
            </div>

            <button
              disabled={isOutOfStock || isUnpublished}
              onClick={(e) => handleQuickAdd(e, prod)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white hover:bg-emerald-600 text-slate-800 hover:text-white dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-white dark:hover:text-neutral-950 shadow-2xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                isUnpublished
                  ? (language === 'ar' ? 'غير معروض حالياً للطلب' : 'Not currently listed')
                  : isOutOfStock
                  ? (language === 'ar' ? 'نفد من المخزن' : 'Out of stock')
                  : t('store.addToCart')
              }
            >
              {isAdded ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : isOutOfStock || isUnpublished ? (
                <X className="w-4 h-4 text-slate-400" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

      </div>
    );
  };

  return (
    <section id="store" className="py-20 sm:py-28 bg-slate-50/50 dark:bg-transparent border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header - Generous full width, elegant typography, harmonious flow */}
        <div className="space-y-3 mb-8 max-w-4xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
            <ShoppingBag className="w-4 h-4" />
            <span>{sectionBadge}</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {sectionTitle}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-300 max-w-3xl leading-relaxed">
            {sectionSubtitle}
          </p>
        </div>

        {/* Dynamic Filter Tabs & Layout Controls - Dedicated spacious row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 dark:bg-[#13141a] border border-slate-300 dark:border-neutral-800 rounded-xl overflow-x-auto scrollbar-none max-w-full">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                id={`store-filter-${tab.id}`}
                onClick={() => handleFilterClick(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs dark:bg-white dark:text-neutral-950'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View and Layout Controls */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            {/* Masonry / Equal Grid Style Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-[#13141a] border border-slate-300 dark:border-neutral-800 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setLayoutStyle('masonry')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutStyle === 'masonry'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={language === 'ar' ? 'تخطيط الميزونري المتناسق (Masonry)' : 'Masonry Grid'}
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('grid')}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutStyle === 'grid'
                    ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={language === 'ar' ? 'شبكة متساوية الأبعاد' : 'Equal Grid'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Toggle when viewing all (Shelves vs Flat) */}
            {activeFilter === 'all' && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-[#13141a] border border-slate-300 dark:border-neutral-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('shelves')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'shelves'
                      ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title={language === 'ar' ? 'عرض الرفوف المعتمدة' : 'Shelves View'}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title={language === 'ar' ? 'عرض القائمة الموحدة' : 'Unified List View'}
                >
                  <Package className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Products Anchor */}
        <div ref={gridContainerRef} id="store-products-area" className="scroll-mt-28">

          {loading ? (
            <div className="py-4">
              <StoreSkeletonGrid count={8} />
            </div>
          ) : totalPublishedCount === 0 ? (
            <SectionEmptyState
              icon={ShoppingBag}
              badgeAr="المتجر والإصدارات"
              badgeEn="Store & Publications"
              titleAr="المتجر والمنشورات قيد التجهيز والتحديث"
              titleEn="Store Catalog Currently Being Updated"
              descriptionAr="يجري حالياً إعداد وإطلاق مؤلفات رقمية، أدلة معرفية، واستشارات متكاملة ستتاح قريباً للطلب المباشر. تواصل معنا لأي استفسار أو طلب مسبق."
              descriptionEn="Curated digital publications, guides, and consultation packages are currently being prepared. Reach out directly for pre-orders or inquiries."
              primaryActionTextAr="طلب استشارة أو مؤلف مسبق"
              primaryActionTextEn="Inquire or Pre-order"
              primaryActionHref="#contact"
              primaryActionIcon={ShoppingBag}
            />
          ) : (
            <>
              {/* =========================================================================
                  CASE 1: A SPECIFIC CATEGORY IS FILTERED (via tabs or View More button)
                 ========================================================================= */}
              {activeFilter !== 'all' && (
            <div className="space-y-8">
              {/* Category Active Header Banner */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = culturalIconsMap[activeCategoryItem?.iconName || 'BookOpen'] || BookOpen;
                    return (
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <IconComponent className="w-6 h-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {language === 'ar' ? 'تصفية حسب القسم المعتمد' : 'Filtered Store Category'}
                      </span>
                      {activeCategoryItem?.badgeAr && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {language === 'ar' ? activeCategoryItem.badgeAr : activeCategoryItem.badgeEn}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-950 dark:text-white mt-0.5">
                      {language === 'ar' 
                        ? (activeCategoryItem?.nameAr || activeFilter) 
                        : (activeCategoryItem?.nameEn || activeFilter)}
                    </h3>
                    {activeCategoryItem?.subtitleAr && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {language === 'ar' ? activeCategoryItem.subtitleAr : activeCategoryItem.subtitleEn}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? `${filteredProducts.length} مؤلف متاح` : `${filteredProducts.length} works`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <span>{language === 'ar' ? 'الرجوع لكافة الأقسام' : 'Show All Shelves'}</span>
                  </button>
                </div>
              </div>

              {/* Grid / Masonry of Category Products */}
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-slate-600 dark:text-neutral-400 space-y-3 bg-white dark:bg-[#111216] rounded-2xl border border-slate-200 dark:border-neutral-800 p-8 shadow-sm">
                  <BookOpen className="w-12 h-12 mx-auto opacity-40 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'لا توجد إصدارات منشورة في هذا القسم حالياً' : 'No publications in this category yet'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
                    {language === 'ar' ? 'يمكنك تصفح باقي الأقسام أو عرض كافة الإصدارات المتوفرة.' : 'You can browse other categories or view all available works.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    {language === 'ar' ? 'عرض كافة الإصدارات' : 'View All Works'}
                  </button>
                </div>
              ) : (
                <div className={
                  layoutStyle === 'masonry'
                    ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
                }>
                  {filteredProducts.map(prod => renderProductCard(prod))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              CASE 2: ACTIVE FILTER === 'ALL' WITH SHELVES VIEW (HOMEPAGE SHOWCASE)
             ========================================================================= */}
          {activeFilter === 'all' && viewMode === 'shelves' && (
            <div className="space-y-16">
              {homeEnabledCategories.map((cat) => {
                const catProducts = getProductsForCategory(products || [], cat, false);
                if (catProducts.length === 0) return null; // Only show shelves that have published items

                const limit = cat.homeLimit || 4;
                const previewProducts = catProducts.slice(0, limit);
                const hasMore = catProducts.length > limit;
                const IconComponent = culturalIconsMap[cat.iconName || 'BookOpen'] || BookOpen;

                return (
                  <div 
                    key={cat.id} 
                    id={`store-shelf-${cat.slug}`}
                    className="space-y-6 pt-4 first:pt-0"
                  >
                    {/* Shelf Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                              {language === 'ar' ? cat.nameAr : cat.nameEn}
                            </h3>
                            {cat.badgeAr && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                {language === 'ar' ? cat.badgeAr : cat.badgeEn}
                              </span>
                            )}
                          </div>
                          {cat.subtitleAr && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-1 max-w-2xl">
                              {language === 'ar' ? cat.subtitleAr : cat.subtitleEn}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Top Right Quick Link */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                          {language === 'ar' 
                            ? `معروض ${previewProducts.length} من أصل ${catProducts.length}` 
                            : `Showing ${previewProducts.length} of ${catProducts.length}`}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleFilterClick(cat.slug || cat.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>{language === 'ar' ? 'عرض الكل' : 'View All'}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Products Grid / Masonry */}
                    <div className={
                      layoutStyle === 'masonry'
                        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]'
                        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
                    }>
                      {previewProducts.map(prod => renderProductCard(prod))}
                    </div>

                    {/* Prominent Direct Store Link Button (المحول للمتجر والمختار للتصنيف) */}
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleFilterClick(cat.slug || cat.id)}
                        className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 hover:border-emerald-600 dark:hover:border-emerald-400 text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-300 font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        <span>
                          {language === 'ar' 
                            ? `تصفح كافة منتجات قسم ${cat.nameAr} (${catProducts.length} منتج) في المتجر مباشرة` 
                            : `Explore All ${cat.nameEn} Products (${catProducts.length} items) in Store`}
                        </span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform text-emerald-600 dark:text-emerald-400" />
                      </button>
                    </div>

                  </div>
                );
              })}

              {/* Check if any published products were not displayed in the above shelves */}
              {(() => {
                const published = (products || []).filter(p => p && p.status === 'published' && !p.isArchived);
                const assignedProductIds = new Set(
                  homeEnabledCategories.flatMap(cat => getProductsForCategory(published, cat, false).map(p => p.id))
                );
                const unassignedProducts = published.filter(p => !assignedProductIds.has(p.id));

                if (unassignedProducts.length === 0) return null;

                return (
                  <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                            {language === 'ar' ? 'منتجات وحلول إضافية' : 'Additional Products & Items'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {language === 'ar' ? 'منتجات وعناصر متنوعة متوفرة في المتجر' : 'Other items available in store'}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-slate-500">
                        {unassignedProducts.length} {language === 'ar' ? 'منتج' : 'items'}
                      </span>
                    </div>

                    <div className={
                      layoutStyle === 'masonry'
                        ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]'
                        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
                    }>
                      {unassignedProducts.slice(0, 4).map(prod => renderProductCard(prod))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================================
              CASE 3: ACTIVE FILTER === 'ALL' WITH UNIFIED GRID VIEW
             ========================================================================= */}
          {activeFilter === 'all' && viewMode === 'grid' && (
            <div className={
              layoutStyle === 'masonry'
                ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
            }>
              {filteredProducts.map(prod => renderProductCard(prod))}
            </div>
          )}
          </>
        )}

        </div>

      </div>
    </section>
  );
};

