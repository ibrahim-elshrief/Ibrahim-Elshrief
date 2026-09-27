import React from 'react';
import { LucideIcon, ArrowRight, ArrowLeft, PlusCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface SectionEmptyStateProps {
  icon: LucideIcon;
  badgeAr?: string;
  badgeEn?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  primaryActionTextAr: string;
  primaryActionTextEn: string;
  primaryActionHref?: string;
  onPrimaryAction?: () => void;
  primaryActionIcon?: LucideIcon;
  adminActionTextAr?: string;
  adminActionTextEn?: string;
  onAdminAction?: () => void;
}

export const SectionEmptyState: React.FC<SectionEmptyStateProps> = ({
  icon: Icon,
  badgeAr,
  badgeEn,
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  primaryActionTextAr,
  primaryActionTextEn,
  primaryActionHref,
  onPrimaryAction,
  primaryActionIcon: PrimaryIcon,
  adminActionTextAr,
  adminActionTextEn,
  onAdminAction
}) => {
  const { language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const title = language === 'ar' ? titleAr : titleEn;
  const description = language === 'ar' ? descriptionAr : descriptionEn;
  const badge = language === 'ar' ? badgeAr : badgeEn;
  const primaryText = language === 'ar' ? primaryActionTextAr : primaryActionTextEn;
  const adminText = language === 'ar' ? adminActionTextAr : adminActionTextEn;

  const handlePrimaryClick = (e: React.MouseEvent) => {
    if (onPrimaryAction) {
      e.preventDefault();
      onPrimaryAction();
    }
  };

  return (
    <div className="w-full py-12 sm:py-16 px-6 sm:px-10 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#111216]/60 backdrop-blur-xs text-center flex flex-col items-center justify-center max-w-3xl mx-auto shadow-2xs transition-colors">
      {/* Icon with refined double-ring container */}
      <div className="relative mb-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
          <Icon className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
        </div>
        <div className="absolute -bottom-1.5 -end-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>
      </div>

      {/* Badge */}
      {badge && (
        <span className="inline-block px-3 py-1 mb-3 text-xs font-mono font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          {badge}
        </span>
      )}

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2.5 max-w-xl">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mb-8">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
        {primaryActionHref ? (
          <a
            href={primaryActionHref}
            onClick={handlePrimaryClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer w-full sm:w-auto"
          >
            {PrimaryIcon && <PrimaryIcon className="w-4 h-4" />}
            <span>{primaryText}</span>
            <Arrow className="w-4 h-4" />
          </a>
        ) : (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer w-full sm:w-auto"
          >
            {PrimaryIcon && <PrimaryIcon className="w-4 h-4" />}
            <span>{primaryText}</span>
            <Arrow className="w-4 h-4" />
          </button>
        )}

        {adminText && onAdminAction && (
          <button
            type="button"
            onClick={onAdminAction}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs transition-all active:scale-98 cursor-pointer w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{adminText}</span>
          </button>
        )}
      </div>
    </div>
  );
};
