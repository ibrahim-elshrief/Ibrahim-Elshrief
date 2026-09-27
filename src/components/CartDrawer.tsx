import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Download, Package } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/currencies';
import { LazyImage } from './LazyImage';

export interface CartDrawerProps {
  currency?: string;
  onCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ currency, onCheckout }) => {
  const { language, direction, t } = useLanguage();
  const { 
    cart, 
    cartTotal, 
    getCartTotal,
    cartCount, 
    updateQuantity, 
    removeFromCart, 
    isCartOpen, 
    setIsCartOpen,
    setIsCheckoutOpen 
  } = useCart();

  if (!isCartOpen) return null;

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const effectiveCurrency = cart[0]?.product?.currency || currency || 'USD';
  const subtotal = getCartTotal ? getCartTotal(effectiveCurrency) : cartTotal;

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    if (onCheckout) {
      onCheckout();
    } else {
      setIsCheckoutOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#111216] text-slate-900 dark:text-white h-full shadow-2xl flex flex-col justify-between border-s border-slate-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('cart.title')}
            </h2>
            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-800 dark:text-emerald-400">
              {cartCount}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-[#111216]">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500 mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('cart.empty')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto">
                {t('cart.emptySub')}
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const name = language === 'ar' ? item.product.nameAr : item.product.nameEn;
              return (
                <div 
                  key={item.product.id}
                  className="flex gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-[#13141a]"
                >
                  {item.product.images && item.product.images[0] && item.product.images[0].trim() !== '' ? (
                    <LazyImage
                      src={item.product.images[0]}
                      alt={name}
                      className="w-16 h-16 rounded-lg object-cover bg-slate-100 dark:bg-neutral-950 shrink-0"
                      containerClassName="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-800 shrink-0"
                      fallbackIcon={
                        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-neutral-900 flex items-center justify-center text-slate-400 dark:text-neutral-500 shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500 shrink-0">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  )}
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-mono font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                        {item.product.type === 'digital' ? (language === 'ar' ? 'منتج رقمي' : 'Digital') : (language === 'ar' ? 'منتج ملموس' : 'Physical')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                        {formatPrice(item.product.price * item.quantity, item.product.currency || effectiveCurrency, language)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Subtotal & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-neutral-400">{t('cart.subtotal')}</span>
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                {formatPrice(subtotal, effectiveCurrency, language)}
              </span>
            </div>

            <button
              onClick={handleProceedCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span>{t('cart.checkout')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
