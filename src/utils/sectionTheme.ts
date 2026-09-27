import { CSSProperties } from 'react';
import { SectionBackgroundVariant } from '../types';

export interface SectionStyleResult {
  className: string;
  style?: CSSProperties;
}

export function getSectionBackgroundStyle(
  variant?: SectionBackgroundVariant,
  customColor?: string,
  customColorDark?: string
): SectionStyleResult {
  switch (variant) {
    case 'muted':
      return {
        className: 'bg-slate-50/90 dark:bg-[#12141c] border-y border-slate-200/70 dark:border-slate-800/80'
      };

    case 'subtle':
      return {
        className: 'bg-emerald-50/40 dark:bg-emerald-950/25 border-y border-emerald-500/15 dark:border-emerald-500/10'
      };

    case 'card':
      return {
        className: 'bg-slate-100/60 dark:bg-[#161822] border-y border-slate-200/80 dark:border-slate-800'
      };

    case 'dark':
      return {
        className: 'bg-slate-900 dark:bg-[#08090d] text-slate-100 border-y border-slate-800'
      };

    case 'warm':
      return {
        className: 'bg-[#faf8f5] dark:bg-[#151619] border-y border-stone-200/70 dark:border-stone-800/60'
      };

    case 'primary':
      return {
        className: 'bg-emerald-900 text-white dark:bg-emerald-950 border-y border-emerald-800/80'
      };

    case 'custom':
      if (customColor) {
        return {
          className: 'border-y border-black/5 dark:border-white/5 transition-colors',
          style: {
            backgroundColor: customColor
          }
        };
      }
      return {
        className: 'bg-white dark:bg-[#0c0d10]'
      };

    case 'default':
    default:
      return {
        className: 'bg-white dark:bg-[#0c0d10]'
      };
  }
}
