import React from 'react';
import { SectionDividerStyle } from '../types';

export interface SectionDividerProps {
  style?: SectionDividerStyle;
  colorPreset?: 'emerald' | 'subtle' | 'slate' | 'custom';
  customColor?: string;
  spacing?: 'compact' | 'normal' | 'spacious';
  className?: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
  style = 'gradient',
  colorPreset = 'emerald',
  customColor,
  spacing = 'normal',
  className = ''
}) => {
  const getSpacingClass = () => {
    switch (spacing) {
      case 'compact':
        return 'my-4 sm:my-6';
      case 'spacious':
        return 'my-12 sm:my-16';
      case 'normal':
      default:
        return 'my-8 sm:my-10';
    }
  };

  const spacingClass = getSpacingClass();

  // Custom Color override
  if (colorPreset === 'custom' && customColor) {
    if (style === 'gradient') {
      return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <div
            className="h-px w-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${customColor} 50%, transparent 100%)`
            }}
          />
        </div>
      );
    }

    if (style === 'glow') {
      return (
        <div className={`relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <div
            className="h-px w-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${customColor} 50%, transparent 100%)`,
              boxShadow: `0 0 12px ${customColor}`
            }}
          />
        </div>
      );
    }

    return (
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
        <div
          className="h-px w-full"
          style={{
            backgroundColor: customColor
          }}
        />
      </div>
    );
  }

  // Predefined Presets
  switch (style) {
    case 'line':
      return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <hr className={`border-t ${
            colorPreset === 'emerald'
              ? 'border-emerald-500/25 dark:border-emerald-500/20'
              : colorPreset === 'slate'
              ? 'border-slate-300 dark:border-slate-700'
              : 'border-slate-200 dark:border-slate-800'
          }`} />
        </div>
      );

    case 'dashed':
      return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <div className={`h-px w-full border-t border-dashed ${
            colorPreset === 'emerald'
              ? 'border-emerald-500/40 dark:border-emerald-400/30'
              : colorPreset === 'slate'
              ? 'border-slate-400/60 dark:border-slate-600'
              : 'border-slate-300/80 dark:border-slate-800'
          }`} />
        </div>
      );

    case 'dots':
      return (
        <div className={`w-full max-w-5xl mx-auto px-4 flex items-center justify-center gap-3 ${spacingClass} ${className}`} aria-hidden="true">
          <span className={`w-1.5 h-1.5 rounded-full ${
            colorPreset === 'emerald'
              ? 'bg-emerald-500/40'
              : 'bg-slate-300 dark:bg-slate-700'
          }`} />
          <span className={`w-2 h-2 rounded-full ${
            colorPreset === 'emerald'
              ? 'bg-emerald-500/80'
              : 'bg-slate-400 dark:bg-slate-600'
          }`} />
          <span className={`w-2.5 h-2.5 rounded-full ${
            colorPreset === 'emerald'
              ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
              : 'bg-slate-600 dark:bg-slate-400'
          }`} />
          <span className={`w-2 h-2 rounded-full ${
            colorPreset === 'emerald'
              ? 'bg-emerald-500/80'
              : 'bg-slate-400 dark:bg-slate-600'
          }`} />
          <span className={`w-1.5 h-1.5 rounded-full ${
            colorPreset === 'emerald'
              ? 'bg-emerald-500/40'
              : 'bg-slate-300 dark:bg-slate-700'
          }`} />
        </div>
      );

    case 'glow':
      return (
        <div className={`relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <div className={`h-px w-full ${
            colorPreset === 'emerald'
              ? 'bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : colorPreset === 'slate'
              ? 'bg-gradient-to-r from-transparent via-slate-400/60 to-transparent shadow-[0_0_8px_rgba(148,163,184,0.3)]'
              : 'bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent'
          }`} />
        </div>
      );

    case 'accent-wave':
      return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-4 ${spacingClass} ${className}`} aria-hidden="true">
          <div className={`flex-1 h-px ${
            colorPreset === 'emerald'
              ? 'bg-gradient-to-r from-transparent to-emerald-500/40'
              : 'bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700'
          }`} />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rotate-45 bg-emerald-500/60 rounded-xs" />
            <span className="w-2.5 h-2.5 rotate-45 bg-emerald-500 rounded-xs shadow-2xs shadow-emerald-500/50" />
            <span className="w-1.5 h-1.5 rotate-45 bg-emerald-500/60 rounded-xs" />
          </div>
          <div className={`flex-1 h-px ${
            colorPreset === 'emerald'
              ? 'bg-gradient-to-l from-transparent to-emerald-500/40'
              : 'bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700'
          }`} />
        </div>
      );

    case 'gradient':
    default:
      return (
        <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${spacingClass} ${className}`} aria-hidden="true">
          <div className={`h-px w-full ${
            colorPreset === 'emerald'
              ? 'bg-gradient-to-r from-transparent via-emerald-500/40 dark:via-emerald-400/30 to-transparent'
              : colorPreset === 'slate'
              ? 'bg-gradient-to-r from-transparent via-slate-400/50 dark:via-slate-600/50 to-transparent'
              : 'bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent'
          }`} />
        </div>
      );
  }
};
