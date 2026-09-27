import React, { useEffect } from 'react';
import { X, Trash2, ShoppingBag, Heart, ArrowRight, ArrowLeft, Package, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { ProductItem } from '../types';
import { formatPrice } from '../utils/currencies';
import { LazyImage } from './LazyImage';

interface WishlistDrawerProps {
  onSelectProduct?: (product: ProductItem) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({ onSelectProduct }) => {
  const { language, direction } = useLanguage();
  const { wishlist, isWishlistOpen, setIsWishlistOpen, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    if (!isWishlistOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWishlistOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isWishlistOpen, setIsWishlistOpen]);

  if (!isWishlistOpen) return null;

  const handleAddToCart = (product: ProductItem) => {
    addToCart(product, 1);
    setIsCartOpen(true);
  };

  const handleAddAllToCart = () => {
    wishlist.forEach(item => addToCart(item, 1));
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className={`fixed inset-y-0 ${direction === 'rtl' ? 'left-0' : 'right-0'} max-w-full flex`}>
        <div className="w-screen max-w-md bg-white dark:bg-[#101115] text-slate-900 dark:text-white shadow-2xl flex flex-col border-s border-slate-200 dark:border-neutral-800">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#14151a]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  {language === 'ar' ? 'قائمة الرغبات والمحفوظات' : 'Wishlist & Saved Items'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  {wishlist.length} {language === 'ar' ? 'مؤلف / منتج محفوظ' : 'saved items'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {wishlist.length > 0 && (
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-xs font-semibold cursor-pointer"
                  title={language === 'ar' ? 'إفراغ القائمة' : 'Clear All'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-500">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'قائمة الرغبات فارغة حالياً' : 'Your Wishlist is Empty'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                    {language === 'ar' 
                      ? 'احفظ الكتب والدراسات والأعمال الفكرية المفضلة لديك بالضغط على أيقونة القلب للرجوع إليها لاحقاً.' 
                      : 'Save books, research papers, and publications by clicking the heart icon on any product.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsWishlistOpen(false);
                    const el = document.getElementById('store');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  {language === 'ar' ? 'استكشف المتجر' : 'Explore Store'}
                </button>
              </div>
            ) : (
              wishlist.map((item) => {
                const name = language === 'ar' ? item.nameAr : item.nameEn;
                const desc = language === 'ar' ? item.descriptionAr : item.descriptionEn;
                const isOutOfStock = item.type === 'physical' && item.stock <= 0;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#14151a] hover:border-slate-300 dark:hover:border-neutral-700 transition-all space-y-3 group"
                  >
                    <div className="flex gap-3">
                      {/* Image Thumbnail */}
                      <div 
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(item);
                            setIsWishlistOpen(false);
                          }
                        }}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-800 shrink-0 cursor-pointer bg-slate-100 dark:bg-neutral-900"
                      >
                        <LazyImage
                          src={item.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 
                            onClick={() => {
                              if (onSelectProduct) {
                                onSelectProduct(item);
                                setIsWishlistOpen(false);
                              }
                            }}
                            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                            title={language === 'ar' ? 'حذف من القائمة' : 'Remove'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                          {desc}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatPrice(item.price, item.currency || 'USD', language)}
                          </span>
                          {item.type === 'digital' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 uppercase">
                              {language === 'ar' ? 'رقمي فوري' : 'Digital'}
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isOutOfStock 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}>
                              {isOutOfStock ? (language === 'ar' ? 'نفد المخزون' : 'Out of Stock') : (language === 'ar' ? 'متوفر' : 'In Stock')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(item);
                            setIsWishlistOpen(false);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      </button>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إلى السلة' : 'Add to Cart'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {wishlist.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-[#14151a] space-y-2">
              <button
                type="button"
                onClick={handleAddAllToCart}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة كل المحفوظات إلى السلة' : 'Add All to Shopping Cart'}</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
