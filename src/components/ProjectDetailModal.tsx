import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Github, 
  Play, 
  Volume2, 
  FileText, 
  Image as ImageIcon, 
  Calendar, 
  Building2, 
  Check, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PortfolioItem, PortfolioMedia } from '../types';
import { LazyImage } from './LazyImage';
import { FilePreviewer } from './FilePreviewer';
import { resolveMedia } from '../utils/mediaResolver';

interface ProjectDetailModalProps {
  project: PortfolioItem | null;
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  const { language, direction, t } = useLanguage();
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [project, onClose]);

  if (!project) return null;

  const title = language === 'ar' ? project.titleAr : project.titleEn;
  const shortDesc = language === 'ar' ? project.shortDescAr : project.shortDescEn;
  const fullDesc = language === 'ar' ? project.fullDescAr : project.fullDescEn;

  const mediaList = project.media && project.media.length > 0
    ? project.media
    : [{ id: 'm-default', type: 'image' as const, url: project.thumbnail, titleEn: 'Preview', titleAr: 'معاينة' }];

  const currentMedia = mediaList[activeMediaIdx] || mediaList[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col bg-white dark:bg-[#111216] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Sticky Header with Prominent Close */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#0c0d10]/95 backdrop-blur-xs">
          <div className="flex items-center gap-2 truncate me-2">
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-50 dark:bg-neutral-900 text-emerald-800 dark:text-cyan-400 border border-emerald-200 dark:border-neutral-800 shrink-0">
              {project.category}
            </span>
            {project.year && (
              <span className="text-xs text-slate-500 dark:text-neutral-500 font-mono shrink-0">
                • {project.year}
              </span>
            )}
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate hidden sm:inline">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-slate-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Copy Link"
              aria-label="Share"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-cyan-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              id="project-modal-close-btn"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              aria-label="Close modal"
              title={language === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Media Viewer Area */}
          <div className="relative bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-white min-h-[220px] sm:min-h-[320px] max-h-[46vh] sm:max-h-[50vh] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-neutral-800">
            <div className="w-full h-full flex items-center justify-center">
              <FilePreviewer
                src={currentMedia.url}
                alt={language === 'ar' ? currentMedia.titleAr || title : currentMedia.titleEn || title}
                typeHint={currentMedia.type}
                mode="interactive"
                fileName={language === 'ar' ? currentMedia.titleAr : currentMedia.titleEn}
                allowDownload={true}
                className="max-h-[46vh] sm:max-h-[50vh] w-auto max-w-full"
                containerClassName="w-full min-h-[220px] sm:min-h-[320px] max-h-[46vh] sm:max-h-[50vh] flex items-center justify-center"
                fallbackIcon={<Layers className="w-12 h-12 text-slate-400 dark:text-neutral-600" />}
              />
            </div>

            {/* Media Slider Controls if multiple */}
            {mediaList.length > 1 && (
              <>
                <button
                  onClick={() => setActiveMediaIdx((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1))}
                  className="absolute start-3 sm:start-4 p-2 rounded-full bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-800 text-slate-800 dark:text-white border border-slate-200 dark:border-neutral-800 shadow-md transition-colors cursor-pointer"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveMediaIdx((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0))}
                  className="absolute end-3 sm:end-4 p-2 rounded-full bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-800 text-slate-800 dark:text-white border border-slate-200 dark:border-neutral-800 shadow-md transition-colors cursor-pointer"
                  aria-label="Next media"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Media Thumbnails Selector */}
          {mediaList.length > 1 && (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-[#0c0d10] border-b border-slate-200 dark:border-neutral-800 overflow-x-auto">
              {mediaList.map((m, idx) => (
                <button
                  key={m.id || idx}
                  onClick={() => setActiveMediaIdx(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all cursor-pointer ${
                    activeMediaIdx === idx
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-neutral-800 text-emerald-900 dark:text-white font-semibold'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111216] text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m.type === 'video' && <Play className="w-3 h-3" />}
                  {m.type === 'audio' && <Volume2 className="w-3 h-3" />}
                  {m.type === 'pdf' && <FileText className="w-3 h-3" />}
                  {m.type === 'image' && <ImageIcon className="w-3 h-3" />}
                  <span>
                    {language === 'ar' ? m.titleAr || `وسيط ${idx + 1}` : m.titleEn || `Asset ${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Details Content */}
          <div className="p-4 sm:p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-300 leading-relaxed font-normal">
                {shortDesc}
              </p>
            </div>

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-4 py-3 border-y border-slate-200 dark:border-neutral-800 text-xs text-slate-500 dark:text-neutral-400">
            {project.client && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                <span className="font-semibold text-slate-700 dark:text-neutral-300">{t('portfolio.client')}:</span>
                <span>{project.client}</span>
              </div>
            )}
            {project.year && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                <span className="font-semibold text-slate-700 dark:text-neutral-300">{t('portfolio.year')}:</span>
                <span>{project.year}</span>
              </div>
            )}
          </div>

          {/* Full Description & Overview */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-cyan-400">
              {language === 'ar' ? 'تفاصيل العمل والمحتوى' : 'Work Details & Overview'}
            </h3>
            <p className="text-sm sm:text-base text-slate-700 dark:text-neutral-300 leading-relaxed">
              {fullDesc}
            </p>
          </div>

          {/* Tags & Topics Pills */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-500">
              {language === 'ar' ? 'الوسوم والتصنيفات' : 'Tags & Topics'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, tIdx) => (
                <span 
                  key={tIdx} 
                  className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* External Action Links */}
          <div className="pt-4 flex flex-wrap gap-3">
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-sm font-bold shadow-xs transition-all cursor-pointer"
              >
                <span>{t('portfolio.liveDemo')}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-semibold transition-all cursor-pointer"
              >
                <Github className="w-4 h-4" />
                <span>{t('portfolio.sourceCode')}</span>
              </a>
            )}
          </div>
        </div>
        </div>

      </div>
    </div>
  );
};
