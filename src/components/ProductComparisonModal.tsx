import React, { useEffect } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowLeftRight, 
  Check, 
  AlertCircle, 
  Download, 
  Package, 
  Calendar,
  Star,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useComparison } from '../context/ComparisonContext';
import { useCart } from '../context/CartContext';
import { ProductItem } from '../types';
import { formatPrice } from '../utils/currencies';
import { LazyImage } from './LazyImage';

interface ProductComparisonModalProps {
  onSelectProduct?: (product: ProductItem) => void;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({ onSelectProduct }) => {
  const { language, t } = useLanguage();
  const { comparisonProducts, removeFromComparison, clearComparison, isComparisonModalOpen, setIsComparisonModalOpen } = useComparison();
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    if (!isComparisonModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsComparisonModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isComparisonModalOpen, setIsComparisonModalOpen]);

  if (!isComparisonModalOpen) return null;

  const handleAddToCart = (product: ProductItem) => {
    addToCart(product, 1);
    setIsCartOpen(true);
  };

  const isAr = language === 'ar';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => setIsComparisonModalOpen(false)}
    >
      <div 
        className="relative w-full max-w-6xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[92vh] flex flex-col bg-white dark:bg-[#0d0e12] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-[#121318]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
                {isAr ? 'مقارنة المنتجات والمؤلفات جنباً إلى جنب' : 'Side-by-Side Product Comparison'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {isAr 
                  ? `مقارنة المواصفات والأسعار والمميزات بين (${comparisonProducts.length}) منتجات`
                  : `Comparing specifications, prices, and features across (${comparisonProducts.length}) items`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearComparison}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-slate-600 dark:text-neutral-300 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح الكل' : 'Clear All'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsComparisonModalOpen(false)}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Table Body */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 md:p-8">
          {comparisonProducts.length === 0 ? (
            <div className="text-center py-16 space-y-3 text-slate-400">
              <ArrowLeftRight className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm font-semibold">
                {isAr ? 'لم تختر أي منتجات للمقارنة بعد.' : 'No products selected for comparison.'}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs sm:text-sm min-w-[640px]">
              {/* Product Header Row */}
              <thead>
                <tr>
                  <th className="p-4 w-44 text-start font-bold uppercase tracking-wider text-[11px] text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-[#111216] border-b border-slate-200 dark:border-neutral-800 rounded-s-xl">
                    {isAr ? 'المعيار / الخاصية' : 'Specification'}
                  </th>
                  {comparisonProducts.map((prod) => {
                    const name = isAr ? prod.nameAr : prod.nameEn;
                    return (
                      <th key={prod.id} className="p-4 text-start bg-slate-50 dark:bg-[#111216] border-b border-slate-200 dark:border-neutral-800 align-top">
                        <div className="space-y-3">
                          {/* Thumbnail */}
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 group">
                            <LazyImage
                              src={prod.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                              alt={name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <button
                              type="button"
                              onClick={() => removeFromComparison(prod.id)}
                              className="absolute top-2 end-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                              title={isAr ? 'إزالة' : 'Remove'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Title */}
                          <h3 
                            onClick={() => {
                              if (onSelectProduct) {
                                onSelectProduct(prod);
                                setIsComparisonModalOpen(false);
                              }
                            }}
                            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                          >
                            {name}
                          </h3>

                          {/* Quick Add to Cart Button */}
                          <button
                            type="button"
                            disabled={prod.type === 'physical' && prod.stock <= 0}
                            onClick={() => handleAddToCart(prod)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{t('store.addToCart')}</span>
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {/* 1. Price Row */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'السعر والخصم' : 'Price & Discount'}
                  </td>
                  {comparisonProducts.map((prod) => (
                    <td key={prod.id} className="p-4">
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
                          {formatPrice(prod.price, prod.currency || 'USD', language)}
                        </span>
                        {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(prod.compareAtPrice, prod.currency || 'USD', language)}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 2. Type Row */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'طبيعة المنتج' : 'Product Type'}
                  </td>
                  {comparisonProducts.map((prod) => (
                    <td key={prod.id} className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-slate-200">
                        {prod.type === 'digital' ? (
                          <>
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isAr ? 'محتوى رقمي فوري' : 'Digital Download'}</span>
                          </>
                        ) : prod.type === 'physical' ? (
                          <>
                            <Package className="w-3.5 h-3.5 text-cyan-500" />
                            <span>{isAr ? 'كتاب / مطبوعة ورقية' : 'Physical Book / Goods'}</span>
                          </>
                        ) : (
                          <>
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            <span>{isAr ? 'خدمة / جلسة استشارية' : 'Consultation / Service'}</span>
                          </>
                        )}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 3. Category Row */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'التصنيف والقسم' : 'Category'}
                  </td>
                  {comparisonProducts.map((prod) => (
                    <td key={prod.id} className="p-4">
                      <span className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400 uppercase">
                        {prod.category}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 4. Rating & Reviews */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'تقييم القراء والعملاء' : 'Customer Rating'}
                  </td>
                  {comparisonProducts.map((prod) => {
                    const rating = prod.averageRating;
                    const count = prod.reviewCount || 0;
                    return (
                      <td key={prod.id} className="p-4">
                        {rating && rating > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? 'fill-current' : 'text-slate-300 dark:text-neutral-700'}`} 
                                />
                              ))}
                            </div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                              {rating.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({count})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-neutral-500 italic">
                            {isAr ? 'لا يوجد تقييم بعد' : 'No ratings yet'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 5. Stock / Availability */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'حالة التوفر والمخزون' : 'Availability'}
                  </td>
                  {comparisonProducts.map((prod) => {
                    const isOutOfStock = prod.type === 'physical' && prod.stock <= 0;
                    return (
                      <td key={prod.id} className="p-4">
                        {prod.type === 'digital' ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            {isAr ? 'متوفر للتحميل الفوري بعد الدفع' : 'Instant Cloud Delivery'}
                          </span>
                        ) : isOutOfStock ? (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {isAr ? 'نفد المخزون حالياً' : 'Out of Stock'}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {prod.stock} {t('store.inStock')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Digital Specs / File format if digital */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'صيغة التسليم والملف' : 'Delivery & File Details'}
                  </td>
                  {comparisonProducts.map((prod) => (
                    <td key={prod.id} className="p-4 text-xs text-slate-600 dark:text-neutral-400">
                      {prod.type === 'digital' ? (
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {prod.digitalFileName || (isAr ? 'مستند PDF محمي' : 'PDF E-Book Document')}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {prod.digitalFileSize || '12.4 MB'} • {isAr ? 'رابط تحميل مشفر' : 'Encrypted Download'}
                          </span>
                        </div>
                      ) : prod.type === 'physical' ? (
                        <span>
                          {isAr ? 'شحن بريدي مع رقم تتبع دولي' : 'Standard courier shipping with tracking'}
                        </span>
                      ) : (
                        <span>
                          {isAr ? 'رابط لقاء افتراضي مخصص' : 'Custom video meeting link provided'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 7. SKU */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'الرقم المرجعي (SKU)' : 'SKU / Identifier'}
                  </td>
                  {comparisonProducts.map((prod) => (
                    <td key={prod.id} className="p-4 font-mono text-xs text-slate-600 dark:text-neutral-400">
                      {prod.sku}
                    </td>
                  ))}
                </tr>

                {/* 8. Description Summary */}
                <tr>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#111216]/50">
                    {isAr ? 'نبذة ومحتوى العمل' : 'Overview & Summary'}
                  </td>
                  {comparisonProducts.map((prod) => {
                    const desc = isAr ? prod.descriptionAr : prod.descriptionEn;
                    return (
                      <td key={prod.id} className="p-4 text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                        {desc}
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 sm:px-8 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-[#121318]/90 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isAr 
              ? 'يمكنك إضافة حتى 4 مؤلفات في المقارنة الواحدة.' 
              : 'You can compare up to 4 items simultaneously.'}
          </span>
          <button
            type="button"
            onClick={() => setIsComparisonModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-neutral-900 font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isAr ? 'إغلاق المقارنة' : 'Close Comparison'}
          </button>
        </div>

      </div>
    </div>
  );
};
