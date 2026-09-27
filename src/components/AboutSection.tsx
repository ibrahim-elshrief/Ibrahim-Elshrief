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
  Globe,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Code2
} from 'lucide-react';
import { SiteSettings, HomeSectionItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

export const aboutIconMap: Record<string, any> = {
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
  Globe,
  ShieldCheck,
  Cpu,
  Code2
};

interface AboutSectionProps {
  settings: SiteSettings;
  sectionConfig?: HomeSectionItem;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ settings, sectionConfig }) => {
  const { language, t } = useLanguage();

  const badge = (language === 'ar' 
    ? (settings?.aboutBadgeAr || sectionConfig?.badgeAr) 
    : (settings?.aboutBadgeEn || sectionConfig?.badgeEn)) 
    || (language === 'ar' ? 'الرؤية والرسالة' : 'Vision & Mission');

  const heading = (language === 'ar' 
    ? (settings?.aboutHeadingAr || sectionConfig?.titleAr) 
    : (settings?.aboutHeadingEn || sectionConfig?.titleEn)) 
    || (language === 'ar' ? 'نبذة ورؤية عامة' : 'About & Overview');

  const sub = (language === 'ar' 
    ? (settings?.aboutSubAr || sectionConfig?.subtitleAr) 
    : (settings?.aboutSubEn || sectionConfig?.subtitleEn)) 
    || (language === 'ar' ? 'تقديم رؤية واضحة، وأهداف طموحة، ومعايير أداء استثنائية تقود إلى نتائج ملموسة.' : 'Driven by a clear vision, ambitious goals, and standards of excellence delivering tangible results.');
  
  const bio1 = (language === 'ar' ? settings.bioAr : settings.bioEn) || (language === 'ar' 
    ? 'نعمل بشغف واحترافية لتقديم أفضل الحلول والخدمات، مع التركيز على الجودة والابتكار لتحقيق نتائج ملموسة ومستدامة تلبي تطلعات عملائنا وشركائنا.'
    : 'Dedicated to delivering thoughtful solutions, high-quality experiences, and impactful work built with precision and care.');

  const bio2 = (language === 'ar' ? settings.aboutParagraph2Ar : settings.aboutParagraph2En) || (language === 'ar'
    ? 'نؤمن بأن التميز يتحقق من خلال الجمع بين الدقة في التنفيذ والتطوير المستمر، وبناء علاقات متينة قائمة على الثقة والشفافية التامة.'
    : 'Committed to excellence through continuous development, agile execution, and lasting partnerships grounded in transparency and reliability.');

  const features = settings.aboutFeatures && settings.aboutFeatures.length > 0
    ? settings.aboutFeatures
    : [
        { id: 'f1', textAr: 'أكثر من 10 سنوات من الخبرة والعمل المتواصل', textEn: 'Over 10 Years of Proven Industry Experience' },
        { id: 'f2', textAr: 'حلول مبتكرة مصممة بعناية لتلبية المتطلبات', textEn: 'Innovative Solutions Tailored to Real Needs' },
        { id: 'f3', textAr: 'التزام صارم بأعلى معايير الجودة والموثوقية', textEn: 'Uncompromising Standards of Quality & Trust' },
        { id: 'f4', textAr: 'دعم ومتابعة مستمرة لضمان أفضل النتائج', textEn: 'Dedicated Support & Continuous Value Delivery' },
      ];

  const principlesTitle = (language === 'ar' ? settings.aboutPrinciplesTitleAr : settings.aboutPrinciplesTitleEn) || (language === 'ar' ? 'المبادئ والقيم الأساسية' : 'Core Principles & Values');

  const principlesList = settings.aboutPrinciples && settings.aboutPrinciples.length > 0
    ? settings.aboutPrinciples
    : [
        {
          id: 'p1',
          iconName: 'Sparkles',
          titleAr: 'الجودة والإتقان',
          titleEn: 'Quality & Craftsmanship',
          descAr: 'التزام كامل بأدق التفاصيل لتقديم أعمال ومنتجات تتجاوز التوقعات.',
          descEn: 'Meticulous attention to detail, crafting solutions that consistently exceed expectations.',
        },
        {
          id: 'p2',
          iconName: 'Layers',
          titleAr: 'الابتكار والتطوير المستمر',
          titleEn: 'Innovation & Continuous Growth',
          descAr: 'تبني أحدث الأساليب والتقنيات لضمان تقديم حلول عصرية وفعالة ومستدامة.',
          descEn: 'Embracing modern approaches and agile thinking to deliver cutting-edge outcomes.',
        },
        {
          id: 'p3',
          iconName: 'ShieldCheck',
          titleAr: 'الموثوقية والشفافية',
          titleEn: 'Reliability & Transparency',
          descAr: 'بناء علاقات متينة قائمة على الوضوح، الأمانة، والالتزام الكامل بأعلى المعايير.',
          descEn: 'Fostering lasting partnerships built on trust, integrity, and dependable execution.',
        }
      ];

  const showNarrative = settings.sectionVisibility?.showAboutNarrative !== false;
  const showFeatures = settings.sectionVisibility?.showAboutFeatures !== false;
  const showPrinciples = settings.sectionVisibility?.showAboutPrinciples !== false;

  return (
    <section id="about" className="py-20 sm:py-28 bg-slate-50/50 dark:bg-[#0c0d10] border-t border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-neutral-800 bg-emerald-50 dark:bg-neutral-900 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {heading}
          </h2>
          <p className="text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
            {sub}
          </p>
        </div>

        {/* Two-Column Narrative & Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Narrative Column */}
          {showNarrative && (
            <div className={`${showPrinciples ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6 text-base sm:text-lg text-slate-700 dark:text-neutral-300 leading-relaxed`}>
              <div className="space-y-4">
                <MarkdownRenderer content={bio1} />
                <MarkdownRenderer content={bio2} />
              </div>

              {/* Quick Feature Checklist */}
              {showFeatures && features.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {features.map((feat) => {
                    const text = language === 'ar' ? feat.textAr : feat.textEn;
                    return (
                      <div key={feat.id} className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-neutral-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Operational Principles Column */}
          {showPrinciples && (
            <div className={`${showNarrative ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500 mb-3">
                {principlesTitle}
              </h3>

              <div className="space-y-4">
                {principlesList.map((p) => {
                  const Icon = (p.iconName && aboutIconMap[p.iconName]) ? aboutIconMap[p.iconName] : BookOpen;
                  const title = language === 'ar' ? p.titleAr : p.titleEn;
                  const desc = language === 'ar' ? p.descAr : p.descEn;

                  return (
                    <div 
                      key={p.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 space-y-2 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {title}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed ps-12">
                        {desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
