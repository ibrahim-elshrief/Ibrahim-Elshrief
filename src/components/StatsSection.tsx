import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SiteSettings, StatsItem } from '../types';
import { 
  BookOpen, 
  Users, 
  Video, 
  Award, 
  Scroll, 
  Library, 
  GraduationCap, 
  Film, 
  Clock, 
  Layers, 
  TrendingUp, 
  Server 
} from 'lucide-react';

interface StatsSectionProps {
  settings?: SiteSettings;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ settings }) => {
  const { language } = useLanguage();

  const getStatsIcon = (iconName?: string) => {
    switch (iconName) {
      case 'book':
      case 'BookOpen': return BookOpen;
      case 'users':
      case 'Users': return Users;
      case 'video':
      case 'Video': return Video;
      case 'award':
      case 'Award': return Award;
      case 'scroll':
      case 'Scroll': return Scroll;
      case 'library':
      case 'Library': return Library;
      case 'cap':
      case 'GraduationCap': return GraduationCap;
      case 'film':
      case 'Film': return Film;
      case 'clock':
      case 'Clock': return Clock;
      case 'layers':
      case 'Layers': return Layers;
      case 'trending':
      case 'TrendingUp': return TrendingUp;
      case 'server':
      case 'Server': return Server;
      default: return BookOpen;
    }
  };

  const dynamicStats: StatsItem[] = settings?.statsItems && settings.statsItems.length > 0
    ? settings.statsItems
    : [
        {
          id: 'st-1',
          value: '15+',
          labelAr: 'مؤلفات وأبحاث منشورة',
          labelEn: 'Published Books & Works',
          detailAr: 'إصدارات ورقية ورقمية محكّمة',
          detailEn: 'Print & Digital Monographs',
          iconName: 'BookOpen'
        },
        {
          id: 'st-2',
          value: '2.5M+',
          labelAr: 'قارئ ومتابع معرفي',
          labelEn: 'Readers & Intellectual Audience',
          detailAr: 'عبر كافة منصات الوطن العربي',
          detailEn: 'Across the Arab World',
          iconName: 'Users'
        },
        {
          id: 'st-3',
          value: '12+',
          labelAr: 'أفلام وسلاسل وثائقية',
          labelEn: 'Documentary Series',
          detailAr: 'تحقيقات واستقصاء مرئي',
          detailEn: 'Investigative & Historical Series',
          iconName: 'Video'
        },
        {
          id: 'st-4',
          value: '100%',
          labelAr: 'أصالة وتوثيق منهجي',
          labelEn: 'Academic Rigor & Citations',
          detailAr: 'مراجع ومخطوطات موثقة',
          detailEn: 'Verified Primary Sources',
          iconName: 'Award'
        }
      ];

  return (
    <section id="stats" className="py-12 sm:py-16 border-y border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-[#0e0f13] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {dynamicStats.map((item) => {
            const Icon = getStatsIcon(item.iconName);
            const label = language === 'ar' ? item.labelAr : item.labelEn;
            const detail = language === 'ar' ? item.detailAr : item.detailEn;

            return (
              <div 
                key={item.id} 
                id={`stat-box-${item.id}`}
                className="flex flex-col p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#13141a] border border-slate-200 dark:border-neutral-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                    {item.value}
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                  {label}
                </h2>
                {detail && (
                  <span className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                    {detail}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

