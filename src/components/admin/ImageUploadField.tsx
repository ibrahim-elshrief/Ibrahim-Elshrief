import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Link, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { resolveImageUrl, compressAndEncodeImage, validateMediaLink } from '../../utils/mediaResolver';
import { UrlTypeBadge } from './UrlTypeBadge';
import { LazyImage } from '../LazyImage';

interface ImageUploadFieldProps {
  id?: string;
  label?: string;
  labelAr?: string;
  labelEn?: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  hintAr?: string;
  hintEn?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  category?: string;
  onNavigateToCloudSettings?: () => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-uploader',
  label,
  labelAr,
  labelEn,
  value,
  onChange,
  helperText,
  hintAr,
  hintEn,
  aspectRatio = 'portrait'
}) => {
  const { language } = useLanguage();
  const effectiveLabel = (language === 'ar' ? labelAr : labelEn) || label;
  const effectiveHint = (language === 'ar' ? hintAr : hintEn) || helperText;

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync urlInput when value changes from external sources
  useEffect(() => {
    if (value && !value.startsWith('data:image/')) {
      setUrlInput(value);
    }
  }, [value]);

  // Reset load error when value changes
  useEffect(() => {
    setImageLoadError(false);
  }, [value]);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(
        language === 'ar'
          ? 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP, SVG).'
          : 'Please select a valid image file (JPG, PNG, WebP, SVG).'
      );
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      // Compress and convert to base64 data URL
      const dataUrl = await compressAndEncodeImage(file, 1600, 0.85);
      onChange(dataUrl);
      setActiveMode('upload');
    } catch (err: any) {
      setError(
        language === 'ar'
          ? 'فشل في معالجة الصورة من الجهاز. يرجى تجربة صورة أخرى.'
          : 'Failed to process image from device. Please try another image.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setError(null);
    setImageLoadError(false);
    setIsValidatingUrl(true);

    try {
      // Validate link is active and reachable
      const validation = await validateMediaLink(trimmed, 'image');
      if (!validation.isValid) {
        setError(validation.error || (language === 'ar' ? 'الرابط غير صالح أو تعذر الوصول إليه' : 'Link is broken or unreachable'));
        setIsValidatingUrl(false);
        return;
      }

      // Smart resolve any link (e.g. Google Drive, Dropbox, YouTube)
      const resolved = resolveImageUrl(trimmed);
      onChange(resolved);
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل التحقق من الرابط' : 'Failed to validate link'));
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    setError(null);
    setImageLoadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Resolved display URL
  const displayUrl = resolveImageUrl(value);
  const isDataUrl = value && value.startsWith('data:image/');

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'landscape'
      ? 'aspect-video'
      : 'aspect-[3/4]';

  return (
    <div 
      id={id} 
      className="space-y-2 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // Only trigger leave if relatedTarget is outside current target
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
          handleFileChange(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Universal Desktop Drag-and-Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 rounded-xl bg-emerald-600/90 text-white flex flex-col items-center justify-center p-4 backdrop-blur-xs transition-all pointer-events-none">
          <Upload className="w-10 h-10 animate-bounce mb-2" />
          <p className="text-sm font-bold text-center">
            {language === 'ar' ? 'أفلت الصورة هنا لرفعها فوراً من جهازك!' : 'Drop image here to upload from desktop!'}
          </p>
          <span className="text-xs text-emerald-100 mt-1">JPG, PNG, WebP, SVG</span>
        </div>
      )}

      {/* Label and Mode Switch */}
      <div className="flex items-center justify-between">
        {effectiveLabel && (
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{effectiveLabel}</span>
          </label>
        )}

        {/* Tab switcher */}
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>{language === 'ar' ? 'رفع من الجهاز' : 'Upload File'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'url'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link className="w-3 h-3" />
            <span>{language === 'ar' ? 'رابط مباشر' : 'Direct Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {value ? (
        /* Preview with Action Overlay */
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 p-2">
          <div className={`relative ${aspectClass} w-full max-w-xs mx-auto overflow-hidden rounded-lg bg-neutral-900 flex items-center justify-center`}>
            <LazyImage
              src={displayUrl}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
              containerClassName="w-full h-full"
              fallbackIcon={
                <div className="p-4 text-center text-slate-400 dark:text-neutral-400 space-y-2 flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs font-medium">
                    {language === 'ar' ? 'تعذر تحميل الصورة من الرابط' : 'Unable to load image from link'}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-500 block truncate max-w-[200px]">
                    {value}
                  </span>
                </div>
              }
            />

            {/* Remove / Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 end-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer shadow-md"
              title={language === 'ar' ? 'حذف الصورة' : 'Remove image'}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge Indicator */}
            <div className="absolute bottom-2 start-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
              {isDataUrl ? (
                <>
                  <Upload className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{language === 'ar' ? 'من الجهاز' : 'Device Upload'}</span>
                </>
              ) : (
                <>
                  <Link className="w-2.5 h-2.5 text-sky-400" />
                  <span>
                    {value.includes('google.com')
                      ? 'Google Drive'
                      : value.includes('dropbox.com')
                      ? 'Dropbox'
                      : value.includes('youtube.com') || value.includes('youtu.be')
                      ? 'YouTube Thumbnail'
                      : language === 'ar'
                      ? 'رابط مباشر'
                      : 'Direct Link'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : activeMode === 'upload' ? (
        /* Device Upload Drag & Drop Area */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer border-slate-300 dark:border-neutral-700 hover:border-emerald-500/70 hover:bg-slate-50 dark:hover:bg-neutral-900/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                {isProcessing
                  ? language === 'ar'
                    ? 'جاري معالجة الصورة وتجهيزها...'
                    : 'Processing image...'
                  : language === 'ar'
                  ? 'اضغط لاختيار صورة من جهازك أو اسحبها وأفلتها هنا'
                  : 'Click to choose image or drag & drop desktop file'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {effectiveHint || (language === 'ar' ? 'يدعم JPG, PNG, WebP, SVG' : 'Supports JPG, PNG, WebP, SVG')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Direct URL Input Area with Instant Smart Recognition */
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
                placeholder={
                  language === 'ar'
                    ? 'https://... (رابط صورة، درايف، دروب بوكس، يوتيوب)'
                    : 'https://... (Direct image, Google Drive, Dropbox, YouTube)'
                }
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isValidatingUrl}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              {isValidatingUrl ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isValidatingUrl ? (language === 'ar' ? 'جاري الفحص...' : 'Validating...') : (language === 'ar' ? 'تطبيق والتحقق' : 'Apply & Validate')}</span>
            </button>
          </div>

          {/* Real-time Recognized URL Badge */}
          {urlInput.trim() && (
            <div className="pt-0.5">
              <UrlTypeBadge url={urlInput} />
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
            <span>💡</span>
            <span>
              {language === 'ar'
                ? 'يتعرف النظام تلقائياً على روابط Google Drive و Dropbox و Imgur ومصغرات YouTube ويتحقق من صلاحيتها قبل الحفظ.'
                : 'Automatically detects, validates, and transforms Google Drive, Dropbox, and YouTube links.'}
            </span>
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
