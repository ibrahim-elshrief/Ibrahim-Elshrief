import React, { useState, useEffect, useRef } from 'react';
import { resolveImageUrl, extractGoogleDriveFileId } from '../utils/mediaResolver';

interface LazyImageProps {
  src?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: string;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  fallbackIcon,
  aspectRatio,
  rootMargin = '150px'
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryIndex, setRetryIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Derive resolved primary URL
  const resolvedPrimary = resolveImageUrl(src);

  // Generate fallback chain especially for Google Drive links
  const gdriveId = extractGoogleDriveFileId(src || '');
  const urlFallbacks = React.useMemo(() => {
    if (!src) return [];
    if (gdriveId) {
      return [
        `https://lh3.googleusercontent.com/d/${gdriveId}`,
        `https://drive.google.com/thumbnail?id=${gdriveId}&sz=w1600`,
        `https://drive.google.com/uc?export=view&id=${gdriveId}`
      ];
    }
    return [resolvedPrimary];
  }, [src, gdriveId, resolvedPrimary]);

  const currentSrc = urlFallbacks[retryIndex] || resolvedPrimary;

  // Reset states when src prop changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setRetryIndex(0);
  }, [src]);

  useEffect(() => {
    // If browser doesn't support IntersectionObserver, load immediately
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

      // Fallback timer: ensure images load even in complex nested scroll containers
      const fallbackTimer = setTimeout(() => {
        setIsInView(true);
      }, 200);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              clearTimeout(fallbackTimer);
              if (containerRef.current) {
                observer.unobserve(containerRef.current);
              }
            }
          });
        },
        {
          rootMargin,
          threshold: 0.01
        }
      );

      const currentEl = containerRef.current;
      if (currentEl) {
        observer.observe(currentEl);
      }

      return () => {
        clearTimeout(fallbackTimer);
        if (currentEl) {
          observer.unobserve(currentEl);
        }
      };
  }, [rootMargin]);

  const handleImageError = () => {
    // Attempt next fallback in urlFallbacks before failing
    if (retryIndex + 1 < urlFallbacks.length) {
      setRetryIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const hasValidSrc = Boolean(currentSrc && currentSrc.trim() !== '');

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-neutral-900/60 ${aspectRatio || ''} ${containerClassName}`}
    >
      {/* Skeleton Placeholder while loading or before entering viewport */}
      {(!isLoaded || !isInView) && hasValidSrc && !hasError && (
        <div className="absolute inset-0 bg-neutral-800/40 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
        </div>
      )}

      {/* Actual Image when in viewport */}
      {isInView && hasValidSrc && !hasError ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`${className} transition-opacity duration-500 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}

      {/* Fallback View if no src or error loading */}
      {(!hasValidSrc || hasError) && (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white/30">
          {fallbackIcon || (
            <div className="text-center p-4">
              <span className="text-xs text-neutral-500 font-mono">No Preview</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
