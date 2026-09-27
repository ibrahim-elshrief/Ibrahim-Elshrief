import React from 'react';
import { ArrowLeftRight, X, Trash2, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useComparison } from '../context/ComparisonContext';
import { LazyImage } from './LazyImage';

export const ProductComparisonBar: React.FC = () => {
  const { language } = useLanguage();
  const { comparisonProducts, removeFromComparison, clearComparison, setIsComparisonModalOpen } = useComparison();

  if (comparisonProducts.length === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-6 sm:bottom-6 z-40 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 dark:bg-[#121318]/95 backdrop-blur-md text-white border border-slate-700/80 dark:border-neutral-700/80 rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 max-w-xl">
        
        {/* Thumbnails of compared products */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ArrowLeftRight className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {comparisonProducts.map((prod) => {
              const name = language === 'ar' ? prod.nameAr : prod.nameEn;
              return (
                <div 
                  key={prod.id} 
                  className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-700 dark:border-neutral-700 shrink-0 bg-slate-800"
                  title={name}
                >
                  <LazyImage
                    src={prod.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80'}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromComparison(prod.id);
                    }}
                    className="absolute inset-0 bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={language === 'ar' ? 'إزالة' : 'Remove'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Empty slots placeholders up to 4 */}
            {Array.from({ length: Math.max(0, 4 - comparisonProducts.length) }).map((_, idx) => (
              <div 
                key={idx}
                className="w-10 h-10 rounded-lg border border-dashed border-slate-700 dark:border-neutral-700 flex items-center justify-center text-slate-500 text-xs font-mono"
              >
                +
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-xs font-semibold text-slate-300">
            <span>
              {language === 'ar' 
                ? `مقارنة (${comparisonProducts.length}/4)` 
                : `Compare (${comparisonProducts.length}/4)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearComparison}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'ar' ? 'مسح الاختيار' : 'Clear All'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={comparisonProducts.length < 2}
              onClick={() => setIsComparisonModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {comparisonProducts.length < 2
                  ? (language === 'ar' ? 'اختر منتجين للمقارنة' : 'Select at least 2')
                  : (language === 'ar' ? 'عرض جدول المقارنة' : 'Compare Now')}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
