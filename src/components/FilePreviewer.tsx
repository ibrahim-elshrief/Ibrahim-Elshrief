import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  FileArchive, 
  FileCode, 
  Download, 
  ExternalLink, 
  Maximize2, 
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { 
  resolveMedia, 
  extractGoogleDriveFileId, 
  getGoogleDrivePreviewUrl, 
  getGoogleDriveDownloadUrl, 
  MediaType 
} from '../utils/mediaResolver';
import { LazyImage } from './LazyImage';
import { useLanguage } from '../context/LanguageContext';

export interface FilePreviewerProps {
  src?: string;
  alt?: string;
  title?: string;
  typeHint?: MediaType;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  allowDownload?: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
  fallbackIcon?: React.ReactNode;
  mode?: 'auto' | 'thumbnail' | 'interactive';
  onClick?: () => void;
}

export const FilePreviewer: React.FC<FilePreviewerProps> = ({
  src,
  alt = '',
  title,
  typeHint,
  className = '',
  containerClassName = '',
  aspectRatio,
  showControls = true,
  autoPlay = false,
  allowDownload = true,
  downloadUrl,
  fileName,
  fileSize,
  fallbackIcon,
  mode = 'auto',
  onClick
}) => {
  const { language } = useLanguage();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isDrivePreviewModalOpen, setIsDrivePreviewModalOpen] = useState(false);

  if (!src || !src.trim()) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-100 dark:bg-neutral-900 text-slate-400 dark:text-neutral-600 ${aspectRatio || 'aspect-video'} ${containerClassName}`}
        onClick={onClick}
      >
        {fallbackIcon || <ImageIcon className="w-8 h-8 opacity-40" />}
      </div>
    );
  }

  const resolved = resolveMedia(src, typeHint);
  const driveId = extractGoogleDriveFileId(src);

  // Determine effective download link
  const effectiveDownloadUrl = downloadUrl || resolved.downloadUrl || (driveId ? getGoogleDriveDownloadUrl(driveId) : src);
  const effectivePreviewUrl = resolved.embedUrl || (driveId ? getGoogleDrivePreviewUrl(driveId) : src);

  // 1. YouTube / Vimeo Video (in Thumbnail Mode vs Interactive Mode)
  if (resolved.mediaType === 'video' && (resolved.provider === 'youtube' || resolved.provider === 'vimeo')) {
    if (mode === 'thumbnail') {
      return (
        <div 
          className={`relative group overflow-hidden bg-slate-950 cursor-pointer ${aspectRatio || 'aspect-video'} ${containerClassName}`}
          onClick={onClick}
        >
          <LazyImage
            src={resolved.thumbnailUrl || resolved.displayUrl}
            alt={alt}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
            containerClassName="w-full h-full"
            fallbackIcon={<Film className="w-8 h-8 text-neutral-600" />}
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ms-0.5" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden bg-black ${aspectRatio || 'aspect-video'} ${containerClassName}`}>
        <iframe
          src={resolved.embedUrl}
          title={alt || 'Video Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={`w-full h-full border-0 ${className}`}
        />
      </div>
    );
  }

  // 2. Google Drive Video
  if (resolved.mediaType === 'video' && driveId) {
    if (mode === 'thumbnail') {
      return (
        <div 
          className={`relative group overflow-hidden bg-slate-950 cursor-pointer ${aspectRatio || 'aspect-video'} ${containerClassName}`}
          onClick={onClick}
        >
          <LazyImage
            src={resolved.thumbnailUrl || `https://lh3.googleusercontent.com/d/${driveId}`}
            alt={alt}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
            containerClassName="w-full h-full"
            fallbackIcon={<Film className="w-8 h-8 text-neutral-600" />}
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ms-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 start-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1">
            <span>Google Drive Video</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden bg-black ${aspectRatio || 'aspect-video'} ${containerClassName}`}>
        <iframe
          src={effectivePreviewUrl}
          title={alt || 'Drive Video Preview'}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={`w-full h-full border-0 min-h-[300px] ${className}`}
        />
      </div>
    );
  }

  // 3. Direct HTML5 Video (.mp4, .webm, data:video)
  if (resolved.mediaType === 'video') {
    return (
      <div className={`relative overflow-hidden bg-black flex items-center justify-center ${aspectRatio || 'aspect-video'} ${containerClassName}`}>
        <video
          src={resolved.displayUrl}
          controls={showControls}
          autoPlay={autoPlay}
          playsInline
          className={`w-full h-full object-contain ${className}`}
        >
          {language === 'ar' ? 'المتصفح لا يدعم تشغيل هذا الفيديو.' : 'Your browser does not support the video tag.'}
        </video>
      </div>
    );
  }

  // 4. Audio (.mp3, .wav, data:audio)
  if (resolved.mediaType === 'audio') {
    return (
      <div className={`p-4 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col justify-center gap-3 ${containerClassName}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {fileName || alt || (language === 'ar' ? 'ملف صوتي رقمي' : 'Audio Track')}
            </p>
            {fileSize && (
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                {fileSize}
              </span>
            )}
          </div>
        </div>
        <audio 
          src={resolved.displayUrl} 
          controls 
          className="w-full h-9"
          onPlay={() => setIsPlayingAudio(true)}
          onPause={() => setIsPlayingAudio(false)}
        />
      </div>
    );
  }

  // 5. PDF or Google Drive Document
  if (resolved.mediaType === 'pdf' || resolved.mediaType === 'document' || resolved.mediaType === 'archive') {
    const isPdf = resolved.mediaType === 'pdf';
    const isArchive = resolved.mediaType === 'archive';

    return (
      <div className={`relative p-5 rounded-2xl bg-slate-50 dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-4 ${containerClassName}`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isPdf 
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
              : isArchive 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
          }`}>
            {isPdf ? <FileText className="w-6 h-6" /> : isArchive ? <FileArchive className="w-6 h-6" /> : <FileCode className="w-6 h-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                {isPdf ? 'PDF' : isArchive ? 'ZIP' : 'DOC'}
              </span>
              {driveId && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Google Drive
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
              {fileName || alt || (isPdf ? (language === 'ar' ? 'مستند PDF' : 'PDF Document') : (language === 'ar' ? 'ملف مرفق' : 'Attached File'))}
            </p>
            {fileSize && (
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                {fileSize}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-neutral-800">
          <a
            href={effectivePreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-900 dark:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'معاينة المستند' : 'Preview Document'}</span>
          </a>

          {allowDownload && (
            <a
              href={effectiveDownloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={language === 'ar' ? 'تحميل مباشر' : 'Download File'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تحميل' : 'Download'}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // 6. Default: Image (Handles Google Drive, Direct URLs, Data URIs)
  return (
    <div 
      className={`relative overflow-hidden ${aspectRatio || ''} ${containerClassName}`}
      onClick={onClick}
    >
      <LazyImage
        src={resolved.displayUrl}
        alt={alt}
        className={className}
        containerClassName="w-full h-full"
        fallbackIcon={fallbackIcon}
      />
    </div>
  );
};
