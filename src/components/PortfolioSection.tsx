import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PortfolioItem, SiteSettings, HomeSectionItem } from '../types';
import { FilePreviewer } from './FilePreviewer';
import { PortfolioSkeletonGrid } from './SkeletonLoader';
import { SectionEmptyState } from './SectionEmptyState';
import { 
  FolderGit2, 
  ExternalLink, 
  Search, 
  Play, 
  Volume2, 
  FileText, 
  ArrowUpRight,
  Code,
  LayoutGrid,
  Columns,
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface PortfolioSectionProps {
  portfolio: PortfolioItem[];
  onSelectProject: (project: PortfolioItem) => void;
  loading?: boolean;
  settings?: SiteSettings;
  sectionConfig?: HomeSectionItem;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({ 
  portfolio, 
  onSelectProject,
  loading = false,
  settings,
  sectionConfig
}) => {
  const { language, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');

  const sectionBadge = (language === 'ar' 
    ? (sectionConfig?.badgeAr || settings?.portfolioBadgeAr)
    : (sectionConfig?.badgeEn || settings?.portfolioBadgeEn)) 
    || (language === 'ar' ? 'سجل الإنجازات والأعمال' : 'Portfolio & Showcase');

  const sectionTitle = (language === 'ar'
    ? (sectionConfig?.titleAr || settings?.portfolioTitleAr)
    : (sectionConfig?.titleEn || settings?.portfolioTitleEn))
    || (language === 'ar' ? 'معرض الأعمال والإنتاج' : 'Selected Works & Projects');

  const sectionSubtitle = (language === 'ar'
    ? (sectionConfig?.subtitleAr || settings?.portfolioSubAr)
    : (sectionConfig?.subtitleEn || settings?.portfolioSubEn))
    || (language === 'ar' 
      ? 'استعراض للمشاريع، النظم والإنتاج المنفذ.' 
      : 'Deep dives into engineering systems, creative works, and productions.');

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set((portfolio || []).map(p => p.category)))];

  const filteredProjects = (portfolio || []).filter((item) => {
    // Only published and non-archived items for public view
    if (item.status !== 'published' || item.isArchived) return false;

    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.titleEn || '').toLowerCase().includes(q) ||
      (item.titleAr || '').toLowerCase().includes(q) ||
      (item.shortDescEn || '').toLowerCase().includes(q) ||
      (item.shortDescAr || '').toLowerCase().includes(q) ||
      (item.tags || []).some(tag => (tag || '').toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <section id="portfolio" className="py-20 sm:py-28 bg-white dark:bg-transparent border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-mono">
              {sectionBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {sectionTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
              {sectionSubtitle}
            </p>
          </div>

          {/* Controls: Search + Layout Toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto self-start md:self-end">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث بالاسم أو التصنيف...' : 'Search projects or categories...'}
                className="w-full ps-10 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#111216] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all shadow-2xs"
              />
            </div>

            {/* Masonry / Grid Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 shrink-0">
              <button
                type="button"
                onClick={() => setLayoutMode('masonry')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'masonry'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title={language === 'ar' ? 'تخطيط الميزونري المتناسق (Masonry)' : 'Masonry Grid'}
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title={language === 'ar' ? 'شبكة متساوية الأبعاد' : 'Equal Grid'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white font-bold shadow-xs dark:bg-white dark:text-neutral-950'
                  : 'border border-slate-300 dark:border-neutral-800 bg-white dark:bg-[#13141a] text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800'
              }`}
            >
              {cat === 'all' ? t('portfolio.filterAll') : cat}
            </button>
          ))}
        </div>

        {/* Projects Grid / Masonry */}
        {loading ? (
          <PortfolioSkeletonGrid count={4} />
        ) : (portfolio || []).filter(item => item.status === 'published' && !item.isArchived).length === 0 ? (
          <SectionEmptyState
            icon={FolderGit2}
            badgeAr="معرض الأعمال"
            badgeEn="Portfolio Showcase"
            titleAr="سجل الأعمال والإصدارات قيد التجهيز والتوثيق"
            titleEn="Works & Publications Under Preparation"
            descriptionAr="يجري حالياً توثيق وإعداد باقة جديدة من الأعمال، الإصدارات، والأبحاث المتنوعة لتنشر قريباً بكل تفاصيلها."
            descriptionEn="New publications, research studies, and projects are currently being documented and curated for publishing. Reach out directly to discuss collaborations."
            primaryActionTextAr="تواصل لمناقشة مشروع أو شراكة"
            primaryActionTextEn="Discuss a Project or Collaboration"
            primaryActionHref="#contact"
            primaryActionIcon={MessageSquare}
          />
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] shadow-xs space-y-4">
            <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">
              {language === 'ar' ? 'لا توجد مشاريع مطابقة لمعايير البحث المحددة.' : 'No projects found matching your selection.'}
            </p>
            <button
              type="button"
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'إعادة ضبط الفلترة والبحث' : 'Reset Filters & Search'}
            </button>
          </div>
        ) : (
          <div className={
            layoutMode === 'masonry'
              ? 'columns-1 md:columns-2 gap-8 [column-fill:_balance]'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8'
          }>
            {filteredProjects.map((project) => {
              const title = language === 'ar' ? project.titleAr : project.titleEn;
              const shortDesc = language === 'ar' ? project.shortDescAr : project.shortDescEn;

              // Check multimedia presence
              const hasVideo = project.media?.some(m => m.type === 'video');
              const hasAudio = project.media?.some(m => m.type === 'audio');
              const hasPdf = project.media?.some(m => m.type === 'pdf');

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`group cursor-pointer rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between ${
                    layoutMode === 'masonry' ? 'break-inside-avoid w-full inline-block mb-8 align-top' : ''
                  }`}
                >
                  {/* Card Thumbnail with Dynamic Aspect Handling & FilePreviewer */}
                  <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-neutral-950 ${
                    layoutMode === 'grid' ? 'aspect-video' : 'min-h-[220px] max-h-[480px]'
                  }`}>
                    <FilePreviewer
                      src={project.thumbnail}
                      alt={title}
                      mode="thumbnail"
                      aspectRatio={layoutMode === 'grid' ? 'aspect-video' : ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      containerClassName="w-full h-full"
                      fallbackIcon={<Code className="w-10 h-10 text-slate-400 dark:text-neutral-600" />}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Multimedia Badges */}
                    <div className="absolute top-4 start-4 flex items-center gap-2 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-neutral-950/90 text-neutral-200 border border-neutral-800 backdrop-blur-xs">
                        {project.category}
                      </span>
                      {hasVideo && (
                        <span className="p-1 rounded-lg bg-emerald-500 text-white text-[10px] flex items-center gap-1 px-2 font-bold shadow-xs" title="Contains Video Demo">
                          <Play className="w-3 h-3 fill-current" />
                          <span>Video</span>
                        </span>
                      )}
                      {hasAudio && (
                        <span className="p-1 rounded-lg bg-indigo-500 text-white text-[10px] flex items-center gap-1 px-2 font-bold shadow-xs" title="Contains Audio Track">
                          <Volume2 className="w-3 h-3" />
                          <span>Audio</span>
                        </span>
                      )}
                      {hasPdf && (
                        <span className="p-1 rounded-lg bg-rose-500 text-white text-[10px] flex items-center gap-1 px-2 font-bold shadow-xs" title="Contains Technical PDF">
                          <FileText className="w-3 h-3" />
                          <span>PDF</span>
                        </span>
                      )}
                    </div>

                    {/* Year badge */}
                    {project.year && (
                      <div className="absolute top-4 end-4 px-2.5 py-1 rounded-lg text-xs font-mono bg-neutral-950/90 text-neutral-300 border border-neutral-800 backdrop-blur-xs pointer-events-none">
                        {project.year}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                        <span>{title}</span>
                        <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                        {shortDesc}
                      </p>
                    </div>

                    {/* Tech Stack Pills */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {project.tags.slice(0, 4).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 4 && (
                        <span className="px-2 py-1 text-xs text-slate-500 dark:text-neutral-500 font-mono">
                          +{project.tags.length - 4}
                        </span>
                      )}
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
