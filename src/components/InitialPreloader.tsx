import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Wifi, Sparkles, ArrowRight } from 'lucide-react';

interface InitialPreloaderProps {
  isLoading: boolean;
  brandName?: string;
  subtitle?: string;
  avatarUrl?: string;
  language?: 'ar' | 'en';
  onForceEnter?: () => void;
}

export const InitialPreloader: React.FC<InitialPreloaderProps> = ({
  isLoading,
  brandName,
  subtitle,
  avatarUrl,
  language = 'ar',
  onForceEnter
}) => {
  const [slowNotice, setSlowNotice] = useState<boolean>(false);
  const [verySlowNotice, setVerySlowNotice] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(15);

  const isAr = language === 'ar';

  // Progress bar simulation while background fetching runs
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + Math.floor(Math.random() * 12) + 5;
        if (prev < 85) return prev + Math.floor(Math.random() * 5) + 2;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 280);

    // After 3 seconds, show friendly slow-connection reassurance
    const slowTimer = setTimeout(() => {
      setSlowNotice(true);
    }, 3000);

    // After 6 seconds, show extended slow notice + direct enter fallback
    const verySlowTimer = setTimeout(() => {
      setVerySlowNotice(true);
    }, 6500);

    return () => {
      clearInterval(interval);
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="app-initial-preloader"
          id="app-initial-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Subtle Ambient Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-sky-500/10 dark:bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Central Card */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-6"
          >
            {/* Visual Icon / Avatar with Pulsing Rings */}
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing wave */}
              <span className="absolute w-24 h-24 rounded-3xl bg-emerald-500/15 dark:bg-emerald-500/20 animate-ping duration-1000 opacity-60" />
              <span className="absolute w-20 h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 animate-pulse" />

              {/* Center emblem or avatar */}
              <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon on image error
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {brandName ? brandName.charAt(0).toUpperCase() : <Sparkles className="w-5 h-5" />}
                  </div>
                )}
              </div>
            </div>

            {/* Platform / Brand Title */}
            <div className="space-y-1.5 px-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {brandName || (isAr ? 'المنصة الرقمية' : 'Digital Platform')}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs mx-auto">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full max-w-xs space-y-2">
              <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-xs shadow-emerald-500/50"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1 min-h-[22px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="transition-all duration-300">
                  {verySlowNotice
                    ? (isAr ? 'جاري تحسين الاتصال وإتمام التجهيز...' : 'Optimizing connection and preparing...')
                    : slowNotice
                    ? (isAr ? 'جاري جلب أحدث البيانات والمحتوى...' : 'Fetching latest data & content...')
                    : (isAr ? 'جاري تحميل المنصة...' : 'Loading platform...')}
                </span>
              </div>
            </div>

            {/* Reassurance Notice when Internet is Slow */}
            {slowNotice && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center justify-center gap-2 max-w-xs"
              >
                <Wifi className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                <span>
                  {isAr
                    ? 'يبدو أن سرعة الإنترنت بطيئة، جاري التنسيق...'
                    : 'Slow connection detected, preparing content...'}
                </span>
              </motion.div>
            )}

            {/* Fallback Direct Entry button if connection is extremely slow */}
            {verySlowNotice && onForceEnter && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={onForceEnter}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-200/90 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>{isAr ? 'بدء التصفح الآن' : 'Enter platform now'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
