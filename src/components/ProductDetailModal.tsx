import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Zap, 
  Download, 
  Package, 
  Calendar, 
  Check, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Heart,
  ArrowLeftRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useComparison } from '../context/ComparisonContext';
import { ProductItem } from '../types';
import { formatPrice } from '../utils/currencies';
import { LazyImage } from './LazyImage';
import { FilePreviewer } from './FilePreviewer';
import { ProductReviews } from './ProductReviews';

interface ProductDetailModalProps {
  product: ProductItem | null;
  currency?: string;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, currency = 'USD', onClose }) => {
  const { language, t } = useLanguage();
  const { addToCart, setIsCheckoutOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isInComparison, toggleComparison } = useComparison();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'gallery' | 'preview'>('gallery');

  React.useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  const name = language === 'ar' ? product.nameAr : product.nameEn;
  const description = language === 'ar' ? product.descriptionAr : product.descriptionEn;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'];

  const currentStock = product.stock !== undefined ? product.stock : 0;
  const isUnpublished = product.status !== 'published';
  const isOutOfStock = currentStock <= 0;
  const isLowStock = !isOutOfStock && currentStock <= (product.lowStockThreshold || 5);

  const handleAddToCart = () => {
    if (isOutOfStock || isUnpublished) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock || isUnpublished) return;
    addToCart(product, quantity);
    onClose();
    setIsCheckoutOpen(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0d10] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header with Prominent Close */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#111216]/95 backdrop-blur-xs">
          <div className="flex items-center gap-2 truncate me-2">
            <span className="px-2.5 py-1 text-[10px] font-mono font-semibold rounded-md uppercase tracking-wider bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 shrink-0">
              {product.type}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono shrink-0">
              SKU: {product.sku}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate hidden sm:inline">
              {name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Wishlist button */}
            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isInWishlist(product.id)
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
              title={isInWishlist(product.id) ? (language === 'ar' ? 'محفوظ في قائمة الرغبات' : 'In Wishlist') : (language === 'ar' ? 'حفظ في قائمة الرغبات' : 'Save to Wishlist')}
            >
              <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current text-rose-600 dark:text-rose-400' : ''}`} />
            </button>

            {/* Compare button */}
            <button
              type="button"
              onClick={() => toggleComparison(product)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isInComparison(product.id)
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
              title={isInComparison(product.id) ? (language === 'ar' ? 'مضاف إلى المقارنة' : 'In Comparison') : (language === 'ar' ? 'إضافة إلى المقارنة' : 'Compare Product')}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              aria-label="Close"
              title={language === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Media Column (Gallery & Interactive Preview) */}
          <div className="md:col-span-6 space-y-3">
            {/* Optional Tabs if previewUrl is available */}
            {product.previewUrl && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('gallery')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    activeMediaTab === 'gallery'
                      ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'معرض الصور' : 'Photo Gallery'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('preview')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    activeMediaTab === 'preview'
                      ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'معاينة العينة (PDF / فيديو)' : 'Interactive Preview / Sample'}
                </button>
              </div>
            )}

            {activeMediaTab === 'preview' && product.previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-950 p-2 min-h-[360px]">
                <FilePreviewer
                  src={product.previewUrl}
                  title={name}
                  mode="interactive"
                  aspectRatio="aspect-4/3"
                  className="rounded-lg w-full h-full"
                  containerClassName="w-full h-full"
                />
              </div>
            ) : (
              <>
                <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-950">
                  <FilePreviewer
                    src={images[selectedImageIdx]}
                    alt={name}
                    mode="thumbnail"
                    aspectRatio="aspect-square"
                    className="w-full h-full object-cover object-center"
                    containerClassName="w-full h-full"
                    fallbackIcon={<ShoppingBag className="w-12 h-12 text-slate-400 dark:text-neutral-600" />}
                  />
                </div>

                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                          selectedImageIdx === idx ? 'border-emerald-600 scale-105' : 'border-slate-200 dark:border-neutral-800 opacity-60'
                        }`}
                      >
                        <FilePreviewer
                          src={img}
                          alt="Thumb"
                          mode="thumbnail"
                          aspectRatio="aspect-square"
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                          fallbackIcon={<ShoppingBag className="w-5 h-5 text-slate-400 dark:text-neutral-600" />}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Product Info Column */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              
              {/* Category */}
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                {product.category}
              </span>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {name}
              </h2>

              {/* Price & Discount */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatPrice(product.price, product.currency || currency || 'USD', language)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-base text-slate-400 line-through font-mono">
                    {formatPrice(product.compareAtPrice, product.currency || currency || 'USD', language)}
                  </span>
                )}
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                    {language === 'ar' ? 'خصم بقيمة' : 'Save'} {formatPrice(product.compareAtPrice - product.price, product.currency || currency || 'USD', language)}
                  </span>
                )}
              </div>

              {/* Live Warehouse Availability Badging */}
              <div>
                {isUnpublished ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span>{language === 'ar' ? 'غير معروض للطلب حالياً (مسودة في المتجر)' : 'Not Currently Listed for Sale'}</span>
                  </div>
                ) : isOutOfStock ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>{language === 'ar' ? '⚠️ نفد من المخزن حالياً (غير متوفر للطلب)' : '⚠️ Out of Stock in Warehouse'}</span>
                  </div>
                ) : isLowStock ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{language === 'ar' ? `⚡ كمية محدودة بالمخزن: متبقي ${currentStock} فقط!` : `⚡ Limited Stock: Only ${currentStock} left in warehouse!`}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
                    <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? `✓ متوفر في المخزن (${currentStock} قطعة جاهزة للتسليم)` : `✓ In Stock (${currentStock} units available)`}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Purchase Controls */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-neutral-800">
              
              {/* Quantity Picker */}
              {!isOutOfStock && !isUnpublished && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-neutral-400 uppercase">
                    {language === 'ar' ? 'الكمية:' : 'Quantity:'}
                  </span>
                  <div className="flex items-center border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#111216] rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 text-sm font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-sm font-bold font-mono text-slate-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => {
                        const max = currentStock > 0 ? currentStock : 99;
                        setQuantity(Math.min(max, quantity + 1));
                      }}
                      className="px-3 py-1 text-sm font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {currentStock > 0 && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({language === 'ar' ? `الحد الأقصى المتاح: ${currentStock}` : `Max available: ${currentStock}`})
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  disabled={isOutOfStock || isUnpublished}
                  onClick={handleAddToCart}
                  className="py-3 px-4 rounded-xl border border-slate-300 hover:border-emerald-600 dark:border-neutral-800 bg-white hover:bg-slate-50 dark:bg-[#111216] dark:hover:bg-[#16181d] text-slate-800 dark:text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  {added ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
                  <span>
                    {isUnpublished
                      ? (language === 'ar' ? 'غير معروض حالياً' : 'Not Currently Listed')
                      : isOutOfStock
                      ? (language === 'ar' ? 'نفد من المخزن' : 'Out of Stock')
                      : added
                      ? (language === 'ar' ? 'أضيف للسلة!' : 'Added!')
                      : t('store.addToCart')}
                  </span>
                </button>

                <button
                  disabled={isOutOfStock || isUnpublished}
                  onClick={handleBuyNow}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {isUnpublished
                      ? (language === 'ar' ? 'غير متاح للطلب' : 'Unavailable')
                      : isOutOfStock
                      ? (language === 'ar' ? 'نفد الرصيد' : 'Out of Stock')
                      : t('store.buyNow')}
                  </span>
                </button>
              </div>

              {/* Secondary Utility Controls: Wishlist & Compare */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isInWishlist(product.id)
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'border-slate-200 dark:border-neutral-800 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                  <span>
                    {isInWishlist(product.id)
                      ? (language === 'ar' ? 'في قائمة الرغبات' : 'Saved in Wishlist')
                      : (language === 'ar' ? 'حفظ في الرغبات' : 'Add to Wishlist')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleComparison(product)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isInComparison(product.id)
                      ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-neutral-800 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>
                    {isInComparison(product.id)
                      ? (language === 'ar' ? 'مضاف للمقارنة' : 'In Comparison')
                      : (language === 'ar' ? 'مقارنة المنتج' : 'Compare Product')}
                  </span>
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Customer Reviews Section */}
        <ProductReviews productId={product.id} productName={name} />

      </div>
    </div>
    </div>
  );
};
