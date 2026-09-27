import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  BookOpen, 
  Library, 
  Video, 
  FileText, 
  Search, 
  GraduationCap, 
  Bookmark, 
  Feather, 
  Scroll, 
  Film, 
  Mic, 
  Newspaper, 
  Lightbulb, 
  Compass, 
  Sparkles, 
  Share2, 
  Award, 
  PenTool, 
  Quote, 
  FolderArchive, 
  Globe 
} from 'lucide-react';
import { SiteSettings, HomeSectionItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

export const contentIconMap: Record<string, any> = {
  BookOpen,
  Library,
  Video,
  FileText,
  Search,
  GraduationCap,
  Bookmark,
  Feather,
  Scroll,
  Film,
  Mic,
  Newspaper,
  Lightbulb,
  Compass,
  Sparkles,
  Share2,
  Award,
  PenTool,
  Quote,
  FolderArchive,
  Globe
};

interface ContentCardsSectionProps {
  settings: SiteSettings;
  sectionConfig?: HomeSectionItem;
}

export const ContentCardsSection: React.FC<ContentCardsSectionProps> = ({ settings, sectionConfig }) => {
  const { language } = useLanguage();

  const sectionBadge = (language === 'ar'
    ? (settings?.contentCardsBadgeAr || sectionConfig?.badgeAr)
    : (settings?.contentCardsBadgeEn || sectionConfig?.badgeEn))
    || (language === 'ar' ? 'المميزات والخدمات' : 'Key Highlights');

  const sectionTitle = (language === 'ar'
    ? (settings?.contentCardsTitleAr || sectionConfig?.titleAr)
    : (settings?.contentCardsTitleEn || sectionConfig?.titleEn))
    || (language === 'ar' ? 'المحاور والمميزات الرئيسية' : 'Key Highlights & Features');

  const sectionSubtitle = (language === 'ar'
    ? (settings?.contentCardsSubAr || sectionConfig?.subtitleAr)
    : (settings?.contentCardsSubEn || sectionConfig?.subtitleEn))
    || (language === 'ar'
      ? 'استعراض لأبرز المسارات، الخدمات، والمميزات الأساسية التي تقدم قيمة حقيقية.'
      : 'Overview of core pathways, services, and strategic advantages providing lasting value.');

  const cards = (settings.contentCards || []).filter(c => c && c.enabled);
  if (cards.length === 0) return null;

  // Sort by order
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  return (
    <section id="content-cards" className="py-16 sm:py-24 bg-white dark:bg-transparent border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-emerald-200 dark:border-neutral-800 bg-emerald-50 dark:bg-neutral-900 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{sectionBadge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {sectionTitle}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
            {sectionSubtitle}
          </p>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCards.map((card) => {
            const Icon = (card.iconName && contentIconMap[card.iconName]) ? contentIconMap[card.iconName] : BookOpen;
            const title = language === 'ar' ? card.titleAr : card.titleEn;
            const content = language === 'ar' ? card.contentAr : card.contentEn;
            const tag = language === 'ar' ? card.tagAr : card.tagEn;

            return (
              <div
                key={card.id}
                className="group relative p-6 rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all duration-300 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    {tag && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-400 text-[11px] font-mono font-semibold tracking-wider uppercase border border-slate-200 dark:border-neutral-800">
                        {tag}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {title}
                  </h3>

                  <div className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                    <MarkdownRenderer content={content} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
