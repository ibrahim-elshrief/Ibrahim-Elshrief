import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  File, 
  FileText, 
  FileArchive, 
  FileCode, 
  Video,
  Music,
  Check, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  resolveMedia, 
  readFileAsDataUrl, 
  detectMediaType, 
  validateMediaLink, 
  extractGoogleDriveFileId,
  getGoogleDriveDownloadUrl
} from '../../utils/mediaResolver';
import { UrlTypeBadge } from './UrlTypeBadge';

interface FileUploadFieldProps {
  id?: string;
  label?: string;
  labelAr?: string;
  labelEn?: string;
  value: string;
  onChange: (url: string, fileName?: string, fileSize?: string) => void;
  fileName?: string;
  fileSize?: string;
  category?: string;
  accept?: string;
  placeholder?: string;
  helperText?: string;
  onNavigateToCloudSettings?: () => void;
  required?: boolean;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id = 'file-uploader',
  label,
  labelAr,
  labelEn,
  value,
  onChange,
  fileName,
  fileSize,
  accept = '*/*',
  placeholder = 'https://...',
  helperText,
  required = false
}) => {
  const { language } = useLanguage();
  const effectiveLabel = (language === 'ar' ? labelAr : labelEn) || label || '';

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync url input if value changes externally
  useEffect(() => {
    if (value && !value.startsWith('data:')) {
      setUrlInput(value);
    }
  }, [value]);

  const handleDeviceUpload = async (file?: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const fileData = await readFileAsDataUrl(file);
      onChange(fileData.dataUrl, fileData.name, fileData.sizeFormatted);
      setActiveTab('upload');
    } catch (err: any) {
      setErrorMessage(
        language === 'ar'
          ? 'تعذر قراءة الملف من الجهاز. يرجى تجربة ملف آخر.'
          : 'Failed to read file from device. Please try another file.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    setIsValidating(true);

    try {
      // Validate link
      const validation = await validateMediaLink(trimmed, 'any' as any);
      if (!validation.isValid) {
        setErrorMessage(validation.error || (language === 'ar' ? 'الرابط غير صالح أو لا يعمل' : 'Link is broken or invalid'));
        setIsValidating(false);
        return;
      }

      const driveId = extractGoogleDriveFileId(trimmed);
      let finalUrl = trimmed;

      if (driveId) {
        // Automatically provide download URL for downloadable files
        finalUrl = getGoogleDriveDownloadUrl(driveId);
      } else {
        const resolved = resolveMedia(trimmed);
        finalUrl = resolved.downloadUrl || resolved.displayUrl;
      }

      // Extract file name from URL if possible
      let detectedName = fileName;
      try {
        const parsed = new URL(trimmed);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          detectedName = decodeURIComponent(segments[segments.length - 1]);
        }
      } catch (_) {
        // Ignore URL parse failure
      }

      onChange(finalUrl, detectedName || (driveId ? 'Google Drive File' : 'External File'), fileSize || '');
    } catch (err: any) {
      setErrorMessage(err?.message || (language === 'ar' ? 'حدث خطأ أثناء فحص الرابط' : 'Error validating link'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    onChange('', '', '');
    setUrlInput('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mediaType = detectMediaType(value);

  // Pick appropriate icon based on file type
  const renderFileIcon = () => {
    switch (mediaType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-indigo-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-emerald-500" />;
      case 'document':
        return <FileCode className="w-5 h-5 text-sky-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500 dark:text-neutral-400" />;
    }
  };

  const isDataUrl = value && value.startsWith('data:');

  return (
    <div 
      id={id} 
      className="space-y-2 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
          handleDeviceUpload(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Universal Desktop Drag-and-Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 rounded-xl bg-emerald-600/90 text-white flex flex-col items-center justify-center p-4 backdrop-blur-xs transition-all pointer-events-none">
          <Upload className="w-10 h-10 animate-bounce mb-2" />
          <p className="text-sm font-bold text-center">
            {language === 'ar' ? 'أفلت الملف هنا لرفعه فوراً من جهازك!' : 'Drop file here to upload from desktop!'}
          </p>
          <span className="text-xs text-emerald-100 mt-1">PDF, ZIP, DOC, MP4, Audio...</span>
        </div>
      )}

      {/* Label and Mode Switch */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span>{effectiveLabel}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>{language === 'ar' ? 'رفع من الجهاز' : 'Upload File'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>{language === 'ar' ? 'رابط مباشر' : 'Direct Link'}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {value ? (
        /* Display Current File Status Card */
        <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 shrink-0">
              {renderFileIcon()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {fileName || (language === 'ar' ? 'ملف مرفق' : 'Attached File')}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                {fileSize && <span>{fileSize}</span>}
                {fileSize && <span>•</span>}
                <span className="font-mono text-[10px] uppercase">
                  {isDataUrl
                    ? language === 'ar'
                      ? 'مرفوع من الجهاز'
                      : 'Device Upload'
                    : value.includes('google.com')
                    ? 'Google Drive'
                    : value.includes('dropbox.com')
                    ? 'Dropbox'
                    : language === 'ar'
                    ? 'رابط خارجي'
                    : 'External Link'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isDataUrl && (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 transition-colors"
                title={language === 'ar' ? 'فتح الرابط في نافذة جديدة' : 'Open in new tab'}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title={language === 'ar' ? 'حذف الملف' : 'Remove file'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : activeTab === 'upload' ? (
        /* Device Upload Box */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer border-slate-300 dark:border-neutral-700 hover:border-emerald-500/70 hover:bg-slate-50 dark:hover:bg-neutral-900/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleDeviceUpload(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                {isProcessing
                  ? language === 'ar'
                    ? 'جاري قراءة الملف وتجهيزه...'
                    : 'Reading file...'
                  : language === 'ar'
                  ? 'اضغط لاختيار ملف من جهازك أو اسحبه وأفلته هنا'
                  : 'Click to choose file or drag & drop desktop file'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {helperText || (language === 'ar' ? 'يدعم PDF, ZIP, EPUB, مستندات وملفات وسائط' : 'Supports PDF, ZIP, EPUB, documents and media')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Direct Link Box */
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUrlSubmit();
                }
              }}
              placeholder={placeholder}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isValidating}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              {isValidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isValidating ? (language === 'ar' ? 'فحص...' : 'Checking...') : (language === 'ar' ? 'تطبيق والتحقق' : 'Apply & Check')}</span>
            </button>
          </div>

          {/* Real-time URL Type Badge */}
          {urlInput.trim() && (
            <div className="pt-0.5">
              <UrlTypeBadge url={urlInput} />
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
            <span>💡</span>
            <span>
              {language === 'ar'
                ? 'يمكنك لصق روابط Google Drive أو Dropbox أو أي رابط مباشر لملف، وسيتعرف عليه النظام فوراً ويجهزه للتحميل أو المعاينة.'
                : 'Paste Google Drive, Dropbox, or any direct file URL and the system will automatically handle it.'}
            </span>
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
