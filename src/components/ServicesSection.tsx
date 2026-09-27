import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ServiceItem } from '../types';
import { 
  Cloud, 
  Code, 
  Cpu, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';

interface ServicesSectionProps {
  services: ServiceItem[];
  onSelectService?: (serviceName: string) => void;
  onInquire?: (serviceName: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ 
  services, 
  onSelectService,
  onInquire
}) => {
  const { language, direction, t } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleInquireAction = (serviceTitle: string) => {
    if (typeof onSelectService === 'function') {
      onSelectService(serviceTitle);
    } else if (typeof onInquire === 'function') {
      onInquire(serviceTitle);
    }
  };

  if (!services || services.length === 0) {
    return null;
  }

  const iconMap: Record<string, React.ElementType> = {
    Cloud,
    Code,
    Cpu,
    ShieldCheck
  };

  return (
    <section id="services" className="py-20 sm:py-28 bg-slate-50/70 dark:bg-[#0a0a0c] border-y border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            {language === 'ar' ? 'الخدمات والاستشارات' : 'Services & Advisory'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('services.heading')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400">
            {t('services.sub')}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => {
            const Icon = iconMap[service.iconName] || Code;
            const title = language === 'ar' ? service.titleAr : service.titleEn;
            const desc = language === 'ar' ? service.descAr : service.descEn;
            const features = language === 'ar' ? service.featuresAr : service.featuresEn;

            return (
              <div 
                key={service.id}
                className="p-7 sm:p-8 rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md hover:border-emerald-500/50 dark:hover:border-neutral-700 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Top Bar with Icon & Price */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    {service.priceStarting && (
                      <div className="text-end">
                        <span className="text-xs text-slate-500 dark:text-neutral-500 block font-mono">
                          {t('services.startingFrom')}
                        </span>
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                          ${service.priceStarting}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed">
                    {desc}
                  </p>

                  {/* Feature Checklist */}
                  <div className="pt-2 space-y-2.5">
                    {features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inquiry Action */}
                <button
                  onClick={() => handleInquireAction(title)}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 flex items-center justify-center gap-2 transition-all group active:scale-98 shadow-xs cursor-pointer"
                >
                  <span>{t('services.inquire')}</span>
                  <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
