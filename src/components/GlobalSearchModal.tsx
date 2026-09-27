import React, { useState } from 'react';
import { Search, X, FolderGit2, ShoppingBag, BookOpen, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PortfolioItem, ProductItem, ArticleItem, ServiceItem } from '../types';
import { LazyImage } from './LazyImage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioItem[];
  products: ProductItem[];
  articles: ArticleItem[];
  services: ServiceItem[];
  onSelectProject: (p: PortfolioItem) => void;
  onSelectProduct: (p: ProductItem) => void;
  onSelectArticle: (a: ArticleItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  portfolio,
  products,
  articles,
  services,
  onSelectProject,
  onSelectProduct,
  onSelectArticle
}) => {
  const { language, direction } = useLanguage();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedProjects = q ? (portfolio || []).filter(p => 
    p && (
      (p.titleEn || '').toLowerCase().includes(q) || 
      (p.titleAr || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => (t || '').toLowerCase().includes(q))
    )
  ) : [];

  const matchedProducts = q ? (products || []).filter(p => 
    p && (
      (p.nameEn || '').toLowerCase().includes(q) || 
      (p.nameAr || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  ) : [];

  const matchedArticles = q ? (articles || []).filter(a => 
    a && (
      (a.titleEn || '').toLowerCase().includes(q) || 
      (a.titleAr || '').toLowerCase().includes(q) ||
      (a.tags || []).some(t => (t || '').toLowerCase().includes(q))
    )
  ) : [];

  const hasResults = matchedProjects.length > 0 || matchedProducts.length > 0 || matchedArticles.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c0d10] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#111216] gap-3">
          <Search className="w-5 h-5 text-emerald-600 dark:text-neutral-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث في المشاريع، المنتجات، المقالات، والأكواد...' : 'Search projects, books, products, articles...'}
            className="w-full text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!q ? (
            <div className="text-center py-12 text-slate-400 dark:text-neutral-500 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30 text-slate-400 dark:text-neutral-500" />
              <p className="text-xs">
                {language === 'ar' ? 'اكتب كلمة للبحث الفوري في جميع محتويات المنصة' : 'Type to instantly search across the entire platform'}
              </p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-12 text-slate-500 dark:text-neutral-400">
              <p className="text-sm">
                {language === 'ar' ? 'لم يتم العثور على نتائج.' : 'No results found.'}
              </p>
            </div>
          ) : (
            <>
              {/* Portfolio Matches */}
              {matchedProjects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-neutral-400 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
                    <span>{language === 'ar' ? 'المشاريع' : 'Projects'}</span>
                  </span>
                  {matchedProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { onSelectProject(p); onClose(); }}
                      className="p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-[#111216] border border-transparent hover:border-emerald-200 dark:hover:border-neutral-800 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {p.thumbnail && p.thumbnail.trim() !== '' ? (
                          <LazyImage src={p.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" containerClassName="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-neutral-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500 shrink-0">
                            <Layers className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-cyan-400 transition-colors">
                            {language === 'ar' ? p.titleAr : p.titleEn}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">{p.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Matches */}
              {matchedProducts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-neutral-400 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
                    <span>{language === 'ar' ? 'المنتجات والمتجر' : 'Products & Store'}</span>
                  </span>
                  {matchedProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { onSelectProduct(p); onClose(); }}
                      className="p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-[#111216] border border-transparent hover:border-emerald-200 dark:hover:border-neutral-800 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {p.images && p.images[0] && p.images[0].trim() !== '' ? (
                          <LazyImage src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" containerClassName="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-neutral-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-cyan-400 transition-colors">
                            {language === 'ar' ? p.nameAr : p.nameEn}
                          </h4>
                          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">${p.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Article Matches */}
              {matchedArticles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-neutral-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
                    <span>{language === 'ar' ? 'المقالات والأبحاث' : 'Articles & Research'}</span>
                  </span>
                  {matchedArticles.map(a => (
                    <div
                      key={a.id}
                      onClick={() => { onSelectArticle(a); onClose(); }}
                      className="p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-[#111216] border border-transparent hover:border-emerald-200 dark:hover:border-neutral-800 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {a.coverImage && a.coverImage.trim() !== '' ? (
                          <LazyImage src={a.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover" containerClassName="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-neutral-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500 shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-cyan-400 transition-colors">
                            {language === 'ar' ? a.titleAr : a.titleEn}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">{a.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
