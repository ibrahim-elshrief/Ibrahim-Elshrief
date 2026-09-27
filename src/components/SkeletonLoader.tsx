import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] overflow-hidden shadow-xs animate-pulse">
      {/* Thumbnail Aspect Ratio Skeleton */}
      <div className="aspect-[4/3] w-full bg-slate-200 dark:bg-neutral-800/80 relative">
        <div className="absolute top-3 start-3 w-16 h-5 rounded-full bg-slate-300 dark:bg-neutral-700" />
        <div className="absolute top-3 end-3 w-8 h-8 rounded-xl bg-slate-300 dark:bg-neutral-700" />
      </div>

      {/* Content Skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Category */}
          <div className="w-20 h-3 rounded bg-slate-200 dark:bg-neutral-800" />
          {/* Title */}
          <div className="w-4/5 h-4 rounded bg-slate-300 dark:bg-neutral-700" />
          <div className="w-3/5 h-4 rounded bg-slate-300 dark:bg-neutral-700" />
          {/* Description line */}
          <div className="w-full h-3 rounded bg-slate-200 dark:bg-neutral-800/60" />
          <div className="w-2/3 h-3 rounded bg-slate-200 dark:bg-neutral-800/60" />
        </div>

        {/* Footer with Price & Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="w-24 h-5 rounded bg-slate-300 dark:bg-neutral-700" />
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
};

export const PortfolioCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] overflow-hidden shadow-xs animate-pulse mb-6">
      {/* Media Skeleton */}
      <div className="aspect-video w-full bg-slate-200 dark:bg-neutral-800/80 relative">
        <div className="absolute top-3 start-3 w-20 h-5 rounded-full bg-slate-300 dark:bg-neutral-700" />
      </div>

      {/* Details Skeleton */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-14 h-4 rounded-md bg-slate-200 dark:bg-neutral-800" />
          <div className="w-16 h-4 rounded-md bg-slate-200 dark:bg-neutral-800" />
        </div>
        <div className="w-3/4 h-5 rounded bg-slate-300 dark:bg-neutral-700" />
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3.5 rounded bg-slate-200 dark:bg-neutral-800/60" />
          <div className="w-4/5 h-3.5 rounded bg-slate-200 dark:bg-neutral-800/60" />
        </div>
        <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-neutral-800/80">
          <div className="w-24 h-4 rounded bg-slate-200 dark:bg-neutral-800" />
          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
};

export const StoreSkeletonGrid: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const PortfolioSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PortfolioCardSkeleton key={i} />
      ))}
    </div>
  );
};
