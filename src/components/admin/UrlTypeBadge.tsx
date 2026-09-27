import React from 'react';
import { 
  CheckCircle2, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Music, 
  Archive, 
  HardDrive, 
  Youtube, 
  Link, 
  ExternalLink,
  Download
} from 'lucide-react';
import { analyzeUrl } from '../../utils/mediaResolver';
import { useLanguage } from '../../context/LanguageContext';

interface UrlTypeBadgeProps {
  url?: string;
  className?: string;
}

export const UrlTypeBadge: React.FC<UrlTypeBadgeProps> = ({ url, className = '' }) => {
  const { language } = useLanguage();
  if (!url || !url.trim()) return null;

  const analysis = analyzeUrl(url);
  if (!analysis.isValidUrl) return null;

  const renderIcon = () => {
    switch (analysis.iconName) {
      case 'HardDrive':
        return <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'Youtube':
        return <Youtube className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'Video':
        return <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'FileText':
        return <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'Music':
        return <Music className="w-3.5 h-3.5 text-violet-500 shrink-0" />;
      case 'Archive':
        return <Archive className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
      case 'Image':
        return <ImageIcon className="w-3.5 h-3.5 text-teal-500 shrink-0" />;
      default:
        return <Link className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  const typeLabel = language === 'ar' ? analysis.typeLabelAr : analysis.typeLabelEn;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${analysis.badgeBg} ${analysis.badgeText} ${analysis.badgeBorder} ${className}`}>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        {renderIcon()}
      </div>

      <span className="font-semibold">{analysis.providerLabel}:</span>
      <span>{typeLabel}</span>

      {analysis.resolvedDisplayUrl && !analysis.rawInput.startsWith('data:') && (
        <a
          href={analysis.resolvedDisplayUrl}
          target="_blank"
          rel="noreferrer"
          className="ms-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={language === 'ar' ? 'معاينة الرابط المحول' : 'Preview resolved URL'}
        >
          <ExternalLink className="w-3 h-3 opacity-70 hover:opacity-100" />
        </a>
      )}

      {analysis.downloadUrl && analysis.provider === 'google_drive' && (
        <a
          href={analysis.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={language === 'ar' ? 'رابط التحميل المباشر' : 'Direct download link'}
        >
          <Download className="w-3 h-3 opacity-70 hover:opacity-100" />
        </a>
      )}
    </div>
  );
};
