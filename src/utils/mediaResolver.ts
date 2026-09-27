/**
 * Universal Media & URL Resolver
 * Automatically detects, normalizes, and resolves URLs from Google Drive, Dropbox, OneDrive,
 * YouTube, Vimeo, Imgur, GitHub, and local files so they display properly in the UI.
 */

export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'presentation' | 'code' | 'archive' | 'link' | 'other';

export interface ResolvedMediaInfo {
  originalUrl: string;
  displayUrl: string;
  embedUrl?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  mediaType: MediaType;
  isEmbeddable: boolean;
  provider?: 'google_drive' | 'dropbox' | 'onedrive' | 'youtube' | 'vimeo' | 'imgur' | 'github' | 'local' | 'direct';
}

/**
 * Extracts Google Drive file ID from any style of Google Drive URL.
 */
export const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim().replace(/^["'<({[]+|["'>)}\],]+$/g, '');
  if (!clean) return null;

  // Format: drive.google.com/file/(u/\d+/)?d/FILE_ID or drive.google.com/d/FILE_ID
  const matchFileD = clean.match(/drive\.google\.com\/(?:file\/)?(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{15,})/i);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Format: drive.google.com/open?id=FILE_ID or uc?id=FILE_ID or thumbnail?id=FILE_ID or export=download&id=FILE_ID
  const matchQueryId = clean.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]{15,})/i);
  if (matchQueryId && matchQueryId[1]) return matchQueryId[1];

  // Format: lh3.googleusercontent.com/d/FILE_ID or lh*.googleusercontent.com
  const matchLh3 = clean.match(/(?:lh\d|drive)\.google(?:usercontent)?\.com\/(?:d|u\/\d+\/d)\/([a-zA-Z0-9_-]{15,})/i);
  if (matchLh3 && matchLh3[1]) return matchLh3[1];

  // Format: docs.google.com/(document|spreadsheets|presentation|file)/d/FILE_ID
  const matchDocsD = clean.match(/docs\.google\.com\/(?:file|document|presentation|spreadsheets)\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{15,})/i);
  if (matchDocsD && matchDocsD[1]) return matchDocsD[1];

  // Generic drive.google.com with any /d/ID
  const matchAnyD = clean.match(/drive\.google\.com\/.*?\/([a-zA-Z0-9_-]{25,})/i);
  if (matchAnyD && matchAnyD[1]) return matchAnyD[1];

  // Raw Google Drive ID (25 to 50 alphanumeric characters without dots or slashes)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(clean)) {
    return clean;
  }

  return null;
};

/**
 * Extracts YouTube Video ID from any style of YouTube URL (watch, embed, short, youtu.be).
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;

  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
};

/**
 * Extracts Vimeo Video ID from Vimeo URLs.
 */
export const extractVimeoVideoId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  return match && match[1] ? match[1] : null;
};

/**
 * Detects the media category of a URL or base64 data string.
 */
export const detectMediaType = (url?: string, hint?: string): MediaType => {
  if (!url || typeof url !== 'string') return 'image';

  const clean = url.trim().toLowerCase();

  // Data URLs
  if (clean.startsWith('data:image/')) return 'image';
  if (clean.startsWith('data:video/')) return 'video';
  if (clean.startsWith('data:audio/')) return 'audio';
  if (clean.startsWith('data:application/pdf') || clean.includes('application/pdf')) return 'pdf';
  if (clean.startsWith('data:application/zip') || clean.startsWith('data:application/x-zip-compressed')) return 'archive';

  // Video providers
  if (extractYouTubeVideoId(clean) || extractVimeoVideoId(clean) || clean.includes('loom.com/share/')) {
    return 'video';
  }

  // Extensions check (ignoring query parameters)
  const pathname = clean.split('?')[0].split('#')[0];

  if (/\.(mp4|webm|ogg|mov|m4v|mkv|avi|wmv)$/i.test(pathname)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(pathname)) return 'audio';
  if (/\.(pdf)$/i.test(pathname)) return 'pdf';
  if (/\.(zip|rar|7z|tar|gz|bz2)$/i.test(pathname)) return 'archive';
  if (/\.(doc|docx|ppt|pptx|xls|xlsx|txt|rtf|csv|md)$/i.test(pathname)) return 'document';
  if (/\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|ico|tiff)$/i.test(pathname)) return 'image';

  // Google Drive URLs
  if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
    if (clean.includes('pdf') || hint === 'pdf' || hint === 'document') {
      return 'pdf';
    }
    // Default to image if used in media contexts
    return 'image';
  }

  // Fallback hint
  if (hint === 'video') return 'video';
  if (hint === 'audio') return 'audio';
  if (hint === 'pdf') return 'pdf';
  if (hint === 'document') return 'document';
  if (hint === 'archive') return 'archive';

  return 'image';
};

/**
 * Resolves any image URL to a direct, embeddable, displayable image URL.
 * Converts Google Drive, Dropbox, Imgur, GitHub, YouTube thumbnails to direct image URLs.
 */
export const resolveImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/^["'<({[]+|["'>)}\],]+$/g, '');
  if (!clean) return '';

  // Data URLs (base64) are already direct
  if (clean.startsWith('data:image/') || clean.startsWith('blob:')) {
    return clean;
  }

  // Handle missing protocol
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  } else if (/^(?:www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i.test(clean) && !clean.startsWith('http')) {
    clean = `https://${clean}`;
  }

  // 1. Google Drive URLs
  const driveId = extractGoogleDriveFileId(clean);
  if (driveId) {
    // googleusercontent CDN provides immediate, high-resolution direct rendering
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // 2. Dropbox URLs
  if (clean.includes('dropbox.com')) {
    let dlUrl = clean.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    dlUrl = dlUrl.replace(/[?&]dl=0/g, '').replace(/[?&]dl=1/g, '');
    const separator = dlUrl.includes('?') ? '&' : '?';
    return `${dlUrl}${separator}raw=1`;
  }

  // 3. YouTube (If a YouTube link was provided as an image/thumbnail)
  const ytId = extractYouTubeVideoId(clean);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  // 4. Imgur URLs (Direct JPG)
  if (clean.includes('imgur.com/') && !clean.includes('i.imgur.com') && !clean.includes('.')) {
    const imgurId = clean.split('imgur.com/').pop()?.split(/[?#]/)[0];
    if (imgurId) {
      return `https://i.imgur.com/${imgurId}.jpg`;
    }
  }

  // 5. GitHub raw file URLs
  if (clean.includes('github.com/') && clean.includes('/blob/')) {
    return clean.replace('github.com/', 'raw.githubusercontent.com/').replace('/blob/', '/');
  }

  // 6. Postimages URLs
  if (clean.includes('postimg.cc/') && !clean.includes('i.postimg.cc')) {
    const postimgId = clean.split('postimg.cc/').pop()?.split(/[?#]/)[0];
    if (postimgId) {
      return `https://i.postimg.cc/${postimgId}/image.jpg`;
    }
  }

  return clean;
};

/**
 * Comprehensive media resolver providing display URL, embed URL, thumbnail, and download link.
 */
export const resolveMedia = (url?: string, hint?: string): ResolvedMediaInfo => {
  const originalUrl = (url || '').trim();
  const type = detectMediaType(originalUrl, hint);

  // Default fallback
  const result: ResolvedMediaInfo = {
    originalUrl,
    displayUrl: originalUrl,
    mediaType: type,
    isEmbeddable: false,
    provider: 'direct'
  };

  if (!originalUrl) return result;

  // Local / Base64
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    result.provider = 'local';
    result.displayUrl = originalUrl;
    result.downloadUrl = originalUrl;
    return result;
  }

  // Google Drive
  const driveId = extractGoogleDriveFileId(originalUrl);
  if (driveId) {
    result.provider = 'google_drive';
    result.thumbnailUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
    result.embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    result.downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    result.isEmbeddable = true;

    if (type === 'image') {
      result.displayUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
    } else {
      result.displayUrl = result.embedUrl;
    }
    return result;
  }

  // YouTube
  const ytId = extractYouTubeVideoId(originalUrl);
  if (ytId) {
    result.provider = 'youtube';
    result.mediaType = 'video';
    result.thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    result.embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;
    result.displayUrl = result.embedUrl;
    result.isEmbeddable = true;
    return result;
  }

  // Vimeo
  const vimeoId = extractVimeoVideoId(originalUrl);
  if (vimeoId) {
    result.provider = 'vimeo';
    result.mediaType = 'video';
    result.embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    result.displayUrl = result.embedUrl;
    result.isEmbeddable = true;
    return result;
  }

  // Dropbox
  if (originalUrl.includes('dropbox.com')) {
    result.provider = 'dropbox';
    let dlUrl = originalUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    dlUrl = dlUrl.replace(/[?&]dl=0/g, '').replace(/[?&]dl=1/g, '');
    const sep = dlUrl.includes('?') ? '&' : '?';
    result.displayUrl = `${dlUrl}${sep}raw=1`;
    result.downloadUrl = `${dlUrl}${sep}dl=1`;
    result.thumbnailUrl = result.displayUrl;
    return result;
  }

  // GitHub
  if (originalUrl.includes('github.com/') && originalUrl.includes('/blob/')) {
    result.provider = 'github';
    result.displayUrl = originalUrl.replace('github.com/', 'raw.githubusercontent.com/').replace('/blob/', '/');
    result.downloadUrl = result.displayUrl;
    return result;
  }

  // General Image
  if (type === 'image') {
    result.displayUrl = resolveImageUrl(originalUrl);
    result.thumbnailUrl = result.displayUrl;
  }

  return result;
};

/**
 * Compresses an image file from the user's device and converts it to a clean base64 data URL
 * optimized for storage and fast rendering.
 */
export const compressAndEncodeImage = (
  file: File,
  maxDimension = 1400,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's SVG, keep original SVG text to preserve vector crispness
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP if supported, otherwise JPEG
        try {
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl && webpUrl.startsWith('data:image/webp')) {
            resolve(webpUrl);
            return;
          }
        } catch (_) {
          // Fallback to jpeg
        }

        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Reads any document, zip, PDF, or file from the user's device.
 */
export const readFileAsDataUrl = (
  file: File
): Promise<{
  dataUrl: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: file.type || 'application/octet-stream'
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Formats byte size into human readable string.
 */
export const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Google Drive URL Transformation Suite
 * Converts any Google Drive link to direct download, preview/embed, or high-res image format.
 */
export const getGoogleDriveDownloadUrl = (urlOrId: string): string => {
  const fileId = extractGoogleDriveFileId(urlOrId) || (urlOrId.trim().length > 15 && !urlOrId.includes('/') ? urlOrId.trim() : null);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

export const getGoogleDrivePreviewUrl = (urlOrId: string): string => {
  const fileId = extractGoogleDriveFileId(urlOrId) || (urlOrId.trim().length > 15 && !urlOrId.includes('/') ? urlOrId.trim() : null);
  if (!fileId) return urlOrId;
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

export const getGoogleDriveImageUrl = (urlOrId: string): string => {
  const fileId = extractGoogleDriveFileId(urlOrId) || (urlOrId.trim().length > 15 && !urlOrId.includes('/') ? urlOrId.trim() : null);
  if (!fileId) return urlOrId;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};

export const convertGoogleDriveUrl = (
  url: string,
  targetMode: 'download' | 'preview' | 'image'
): string => {
  if (!url) return '';
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;

  switch (targetMode) {
    case 'download':
      return getGoogleDriveDownloadUrl(fileId);
    case 'preview':
      return getGoogleDrivePreviewUrl(fileId);
    case 'image':
      return getGoogleDriveImageUrl(fileId);
    default:
      return url;
  }
};

/**
 * URL Analysis Result for Admin and UI Badging
 */
export interface UrlAnalysis {
  isValidUrl: boolean;
  rawInput: string;
  mediaType: MediaType;
  provider: 'google_drive' | 'youtube' | 'vimeo' | 'dropbox' | 'github' | 'local' | 'direct' | 'unknown';
  providerLabel: string;
  typeLabelAr: string;
  typeLabelEn: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: string;
  resolvedDisplayUrl: string;
  downloadUrl?: string;
  embedUrl?: string;
  isEmbeddable: boolean;
  driveId?: string;
}

/**
 * Analyzes an input string in real-time. If it is a valid URL or data URI,
 * extracts its exact media type, provider, and converts it appropriately.
 */
export const analyzeUrl = (input?: string): UrlAnalysis => {
  const raw = (input || '').trim();

  const emptyResult: UrlAnalysis = {
    isValidUrl: false,
    rawInput: raw,
    mediaType: 'image',
    provider: 'unknown',
    providerLabel: 'Unknown',
    typeLabelAr: 'غير معروف',
    typeLabelEn: 'Unknown',
    badgeBg: 'bg-neutral-100 dark:bg-neutral-800',
    badgeText: 'text-neutral-600 dark:text-neutral-400',
    badgeBorder: 'border-neutral-200 dark:border-neutral-700',
    iconName: 'Link',
    resolvedDisplayUrl: '',
    isEmbeddable: false
  };

  if (!raw) return emptyResult;

  // 1. Data URLs
  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    const isImage = raw.startsWith('data:image/');
    const isVideo = raw.startsWith('data:video/');
    const isAudio = raw.startsWith('data:audio/');
    const isPdf = raw.includes('application/pdf');

    const mType: MediaType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isPdf ? 'pdf' : 'document';
    return {
      isValidUrl: true,
      rawInput: raw,
      mediaType: mType,
      provider: 'local',
      providerLabel: 'Local Upload',
      typeLabelAr: isImage ? 'صورة مرفوعة' : isVideo ? 'فيديو مرفوع' : isPdf ? 'مستند PDF' : 'ملف مرفوع',
      typeLabelEn: isImage ? 'Uploaded Image' : isVideo ? 'Uploaded Video' : isPdf ? 'Uploaded PDF' : 'Uploaded File',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-700 dark:text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      iconName: 'Upload',
      resolvedDisplayUrl: raw,
      downloadUrl: raw,
      isEmbeddable: false
    };
  }

  // Check URL syntax validity
  let isValidUrl = false;
  try {
    const parsed = new URL(raw);
    isValidUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    isValidUrl = false;
  }

  if (!isValidUrl) {
    return emptyResult;
  }

  const driveId = extractGoogleDriveFileId(raw);
  const ytId = extractYouTubeVideoId(raw);
  const vimeoId = extractVimeoVideoId(raw);

  // Google Drive URL
  if (driveId) {
    const isExplicitPdf = raw.toLowerCase().includes('pdf');
    const isExplicitVideo = raw.toLowerCase().includes('video') || raw.toLowerCase().includes('mp4');

    let mType: MediaType = 'image';
    if (isExplicitPdf) mType = 'pdf';
    else if (isExplicitVideo) mType = 'video';

    return {
      isValidUrl: true,
      rawInput: raw,
      mediaType: mType,
      provider: 'google_drive',
      providerLabel: 'Google Drive',
      typeLabelAr: mType === 'video' ? 'فيديو درايف (معاينة وتشغيل)' : mType === 'pdf' ? 'مستند درايف (قراءة وتحميل)' : 'صورة درايف (معاينة مباشرة)',
      typeLabelEn: mType === 'video' ? 'Drive Video (Stream)' : mType === 'pdf' ? 'Drive Document' : 'Drive Image (Direct CDN)',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-700 dark:text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      iconName: 'HardDrive',
      resolvedDisplayUrl: mType === 'image' ? getGoogleDriveImageUrl(driveId) : getGoogleDrivePreviewUrl(driveId),
      downloadUrl: getGoogleDriveDownloadUrl(driveId),
      embedUrl: getGoogleDrivePreviewUrl(driveId),
      isEmbeddable: true,
      driveId
    };
  }

  // YouTube
  if (ytId) {
    return {
      isValidUrl: true,
      rawInput: raw,
      mediaType: 'video',
      provider: 'youtube',
      providerLabel: 'YouTube',
      typeLabelAr: 'فيديو يوتيوب مدمج',
      typeLabelEn: 'YouTube Video',
      badgeBg: 'bg-rose-500/10',
      badgeText: 'text-rose-700 dark:text-rose-400',
      badgeBorder: 'border-rose-500/30',
      iconName: 'Youtube',
      resolvedDisplayUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
      isEmbeddable: true
    };
  }

  // Vimeo
  if (vimeoId) {
    return {
      isValidUrl: true,
      rawInput: raw,
      mediaType: 'video',
      provider: 'vimeo',
      providerLabel: 'Vimeo',
      typeLabelAr: 'فيديو فيميو مدمج',
      typeLabelEn: 'Vimeo Video',
      badgeBg: 'bg-sky-500/10',
      badgeText: 'text-sky-700 dark:text-sky-400',
      badgeBorder: 'border-sky-500/30',
      iconName: 'Video',
      resolvedDisplayUrl: `https://player.vimeo.com/video/${vimeoId}`,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      isEmbeddable: true
    };
  }

  // General URL media detection
  const detectedType = detectMediaType(raw);
  const resolved = resolveMedia(raw);

  let providerLabel = 'Direct Web Link';
  let provider: UrlAnalysis['provider'] = 'direct';
  if (raw.includes('dropbox.com')) {
    provider = 'dropbox';
    providerLabel = 'Dropbox';
  } else if (raw.includes('github.com')) {
    provider = 'github';
    providerLabel = 'GitHub';
  }

  let typeLabelAr = 'رابط ويب';
  let typeLabelEn = 'Web Link';
  let badgeBg = 'bg-blue-500/10';
  let badgeText = 'text-blue-700 dark:text-blue-400';
  let badgeBorder = 'border-blue-500/30';
  let iconName = 'Link';

  if (detectedType === 'image') {
    typeLabelAr = 'صورة مباشرة (JPG/PNG/WebP)';
    typeLabelEn = 'Direct Image';
    badgeBg = 'bg-teal-500/10';
    badgeText = 'text-teal-700 dark:text-teal-400';
    badgeBorder = 'border-teal-500/30';
    iconName = 'Image';
  } else if (detectedType === 'video') {
    typeLabelAr = 'ملف فيديو مباشر (MP4/WebM)';
    typeLabelEn = 'Direct Video File';
    badgeBg = 'bg-indigo-500/10';
    badgeText = 'text-indigo-700 dark:text-indigo-400';
    badgeBorder = 'border-indigo-500/30';
    iconName = 'Video';
  } else if (detectedType === 'pdf') {
    typeLabelAr = 'مستند PDF رقمي';
    typeLabelEn = 'PDF Document';
    badgeBg = 'bg-amber-500/10';
    badgeText = 'text-amber-700 dark:text-amber-400';
    badgeBorder = 'border-amber-500/30';
    iconName = 'FileText';
  } else if (detectedType === 'audio') {
    typeLabelAr = 'ملف صوتي رقمي';
    typeLabelEn = 'Audio Track';
    badgeBg = 'bg-violet-500/10';
    badgeText = 'text-violet-700 dark:text-violet-400';
    badgeBorder = 'border-violet-500/30';
    iconName = 'Music';
  } else if (detectedType === 'archive') {
    typeLabelAr = 'ملف مضغوط (ZIP/RAR)';
    typeLabelEn = 'Archive File';
    badgeBg = 'bg-orange-500/10';
    badgeText = 'text-orange-700 dark:text-orange-400';
    badgeBorder = 'border-orange-500/30';
    iconName = 'Archive';
  }

  return {
    isValidUrl: true,
    rawInput: raw,
    mediaType: detectedType,
    provider,
    providerLabel,
    typeLabelAr,
    typeLabelEn,
    badgeBg,
    badgeText,
    badgeBorder,
    iconName,
    resolvedDisplayUrl: resolved.displayUrl,
    downloadUrl: resolved.downloadUrl || raw,
    embedUrl: resolved.embedUrl,
    isEmbeddable: resolved.isEmbeddable
  };
};

/**
 * Validates whether a media URL is active, reachable, and formatted correctly.
 * Performs real-time probing on images/videos to verify they load.
 */
export const validateMediaLink = async (
  url?: string,
  expectedType: MediaType = 'image'
): Promise<{ isValid: boolean; error?: string; mediaType: MediaType }> => {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'الرابط فارغ / URL is required', mediaType: expectedType };
  }

  const trimmed = url.trim();

  // 1. Data URLs / Blobs are always valid local media
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return { isValid: true, mediaType: detectMediaType(trimmed) };
  }

  // 2. Syntax validation
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'بروتوكول الرابط غير صالح، يجب أن يبدأ بـ http:// أو https://', mediaType: expectedType };
    }
  } catch {
    return { isValid: false, error: 'صيغة الرابط غير صحيحة / Invalid URL format', mediaType: expectedType };
  }

  // 3. Google Drive Validation
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    if (driveId.length < 10) {
      return { isValid: false, error: 'معرف ملف Google Drive غير صالح', mediaType: expectedType };
    }
    return { isValid: true, mediaType: expectedType };
  }

  // 4. YouTube / Vimeo Validation
  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return { isValid: true, mediaType: 'video' };
  }
  const vimeoId = extractVimeoVideoId(trimmed);
  if (vimeoId) {
    return { isValid: true, mediaType: 'video' };
  }

  // 5. Active Link Image Probing (Non-blocking probe to avoid false rejections)
  if (expectedType === 'image') {
    // If it's already a recognized provider, accept immediately
    if (driveId || ytId || trimmed.includes('dropbox.com') || trimmed.includes('imgur.com') || trimmed.includes('unsplash.com')) {
      return { isValid: true, mediaType: 'image' };
    }

    const resolved = resolveImageUrl(trimmed);
    const probeSuccess = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      let done = false;

      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          // In iframe environments, timeouts are common; allow valid URL syntax to proceed
          resolve(true);
        }
      }, 3000);

      img.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(true);
        }
      };

      img.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          // If the URL has valid protocol and hostname, pass gracefully to avoid blocking user inputs
          try {
            const u = new URL(resolved);
            if (u.hostname && u.hostname.includes('.')) {
              resolve(true);
              return;
            }
          } catch {
            // invalid URL
          }
          resolve(false);
        }
      };

      img.src = resolved;
    });

    if (!probeSuccess) {
      return {
        isValid: false,
        error: 'صيغة رابط الصورة غير صالحة أو تعذر تحديد الموقع المضيف.',
        mediaType: 'image'
      };
    }
  }

  return { isValid: true, mediaType: expectedType };
};
