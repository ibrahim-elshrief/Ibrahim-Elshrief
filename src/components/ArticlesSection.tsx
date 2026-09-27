import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ArticleItem, SiteSettings, HomeSectionItem } from '../types';
import { Clock, Calendar, ArrowUpRight, BookOpen, Mail } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { SectionEmptyState } from './SectionEmptyState';

interface ArticlesSectionProps {
  articles: ArticleItem[];
  onSelectArticle: (article: ArticleItem) => void;
  settings?: SiteSettings;
  sectionConfig?: HomeSectionItem;
}

export const ArticlesSection: React.FC<ArticlesSectionProps> = ({ 
  articles, 
  onSelectArticle,
  settings,
  sectionConfig
}) => {
  const { language, t } = useLanguage();

  const sectionBadge = (language === 'ar' 
    ? (sectionConfig?.badgeAr || settings?.articlesBadgeAr)
    : (sectionConfig?.badgeEn || settings?.articlesBadgeEn)) 
    || (language === 'ar' ? 'الأبحاث والكتابات' : 'Articles & Research');

  const sectionTitle = (language === 'ar'
    ? (sectionConfig?.titleAr || settings?.articlesTitleAr)
    : (sectionConfig?.titleEn || settings?.articlesTitleEn))
    || (language === 'ar' ? 'المقالات والأبحاث' : 'Articles & Essays');

  const sectionSubtitle = (language === 'ar'
    ? (sectionConfig?.subtitleAr || settings?.articlesSubAr)
    : (sectionConfig?.subtitleEn || settings?.articlesSubEn))
    || (language === 'ar' 
      ? 'دراسات وأطروحات معمقة ومقالات متخصصة بمصداقية وأصالة.' 
      : 'In-depth essays, critical analysis, and scholarly writings.');

  const publishedArticles = (articles || []).filter(a => a?.status === 'published' && !a?.isArchived);

  return (
    <section id="articles" className="py-20 sm:py-28 bg-slate-50/70 dark:bg-[#0c0d10] border-y border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            {sectionBadge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {sectionTitle}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
            {sectionSubtitle}
          </p>
        </div>

        {/* Articles Grid or Empty State */}
        {publishedArticles.length === 0 ? (
          <SectionEmptyState
            icon={BookOpen}
            badgeAr="المقالات والأبحاث"
            badgeEn="Articles & Research"
            titleAr="المقالات والأبحاث قيد التحرير والمراجعة"
            titleEn="Articles & Essays Under Editorial Review"
            descriptionAr="يجري حالياً كتابة وتحرير باقة من المقالات المتخصصة، الدراسات النقدية، والأوراق المعمقة لتنشر هنا قريباً. انضم إلى قائمتنا البريدية ليصلك إشعار فور نشر أي مقال جديد."
            descriptionEn="In-depth analytical essays, industry insights, and research papers are currently being written. Subscribe to our newsletter to receive new publications immediately."
            primaryActionTextAr="الاشتراك بالنشرة البريدية"
            primaryActionTextEn="Subscribe to Newsletter"
            primaryActionHref="#newsletter"
            primaryActionIcon={Mail}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publishedArticles.map((article) => {
              const title = language === 'ar' ? article.titleAr : article.titleEn;
              const excerpt = language === 'ar' ? article.excerptAr : article.excerptEn;

              return (
                <div
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="group cursor-pointer rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 dark:bg-neutral-950">
                    {article.coverImage && article.coverImage.trim() !== '' ? (
                      <LazyImage
                        src={article.coverImage}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        containerClassName="w-full h-full"
                        fallbackIcon={
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-neutral-900 text-slate-400 dark:text-neutral-600">
                            <BookOpen className="w-10 h-10" />
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-neutral-900 text-slate-400 dark:text-neutral-600">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
                    <div className="absolute top-4 start-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-neutral-950/90 text-neutral-200 border border-neutral-800">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-neutral-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {article.readTimeMinutes} {t('articles.readTime')}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex items-start justify-between gap-2">
                        <span>{title}</span>
                        <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 mt-1" />
                      </h3>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed line-clamp-3">
                        {excerpt}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {article.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
