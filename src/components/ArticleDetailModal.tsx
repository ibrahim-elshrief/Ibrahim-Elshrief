import React from 'react';
import { X, Calendar, Clock, User, Share2, Check, ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ArticleItem } from '../types';
import { LazyImage } from './LazyImage';

interface ArticleDetailModalProps {
  article: ArticleItem | null;
  onClose: () => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ article, onClose }) => {
  const { language, direction, t } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!article) return;
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
  }, [article, onClose]);

  if (!article) return null;

  const title = language === 'ar' ? article.titleAr : article.titleEn;
  const content = language === 'ar' ? article.contentAr : article.contentEn;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 printable-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0d10] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden printable-article"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#111216]/95 backdrop-blur-xs no-print">
          <div className="flex items-center gap-2 truncate me-2">
            <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 text-emerald-800 dark:text-cyan-400 shrink-0">
              {article.category}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate hidden sm:inline">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-slate-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={t('common.printArticle')}
              aria-label={t('common.printArticle')}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-slate-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Share"
              aria-label="Share"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4" />}
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
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Cover Image */}
          {article.coverImage && article.coverImage.trim() !== '' && (
            <div className="w-full h-48 sm:h-72 overflow-hidden bg-slate-100 dark:bg-neutral-950 border-b border-slate-200 dark:border-neutral-800">
              <LazyImage
                src={article.coverImage}
                alt={title}
                className="w-full h-full object-cover object-center"
                containerClassName="w-full h-full"
              />
            </div>
          )}

          {/* Article Prose Body */}
          <div className="p-4 sm:p-8 md:p-10 space-y-6 max-w-2xl mx-auto">
          
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
              <span>{article.readTimeMinutes} {t('articles.readTime')}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h1>

          {/* Formatted Content */}
          <div className="prose dark:prose-invert max-w-none text-base sm:text-lg text-slate-700 dark:text-neutral-300 leading-relaxed space-y-4 whitespace-pre-line">
            {content}
          </div>

          {/* Tags */}
          <div className="pt-6 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap gap-2">
            {article.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs font-mono font-medium rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400"
              >
                #{tag}
              </span>
            ))}
          </div>

        </div>
        </div>

      </div>
    </div>
  );
};
