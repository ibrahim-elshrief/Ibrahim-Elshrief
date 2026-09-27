import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  X, 
  FileText, 
  Video, 
  Music, 
  ExternalLink 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { FileUploadField } from './FileUploadField';
import { LazyImage } from '../LazyImage';

interface VaultItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'pdf';
  category: string;
  createdAt: string;
}

export const AdminMedia: React.FC = () => {
  const { language } = useLanguage();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'audio' | 'pdf'>('image');
  const [category, setCategory] = useState('Portfolio');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMedia = async () => {
    try {
      const snap = await getDocs(collection(db, 'mediaVault'));
      const list: VaultItem[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as VaultItem);
      });
      if (list.length === 0) {
        // Provide rich defaults
        const defaults: VaultItem[] = [
          {
            id: 'm1',
            name: 'Cloud Architecture Diagram',
            url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
            type: 'image',
            category: 'Architecture',
            createdAt: new Date().toISOString()
          },
          {
            id: 'm2',
            name: 'Edge AI Vision Model Demo Video',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            type: 'video',
            category: 'Video Showcase',
            createdAt: new Date().toISOString()
          },
          {
            id: 'm3',
            name: 'Technical Whitepaper Specification PDF',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            type: 'pdf',
            category: 'Documents',
            createdAt: new Date().toISOString()
          }
        ];
        setItems(defaults);
      } else {
        setItems(list);
      }
    } catch (err) {
      console.warn('Failed to fetch media vault:', err);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        url,
        type,
        category,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'mediaVault'), payload);
      setModalOpen(false);
      setName('');
      setUrl('');
      fetchMedia();
    } catch (err) {
      console.error('Failed to add media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, fileUrl: string) => {
    navigator.clipboard.writeText(fileUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeletePrompt = (item: VaultItem) => {
    setItemToDelete(item);
  };

  const confirmDeleteMedia = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      try {
        await deleteDoc(doc(db, 'mediaVault', itemToDelete.id));
      } catch (e) {
        // May be a default local item or already removed
      }
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete media:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'الخزنة الرقمية ومكتبة الوسائط' : 'Media Vault & Asset Library'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'ar' 
              ? 'مكتبة مركزية للأصول، الروابط السحابية، نسخ روابط التحميل للمشاريع والمنتجات.' 
              : 'Central hub for multimedia assets, video showcases, and instant link copying.'}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة أصل رقمي' : 'Register New Asset'}</span>
        </button>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div 
            key={item.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            {/* Preview Box */}
            <div className="relative aspect-16/10 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {item.type === 'image' && item.url && item.url.trim() !== '' ? (
                <LazyImage
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                  fallbackIcon={
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-[11px] font-mono text-slate-400">Failed to load image</span>
                    </div>
                  }
                />
              ) : item.type === 'image' ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <ImageIcon className="w-10 h-10" />
                  <span className="text-[11px] font-mono text-slate-400">Image Asset</span>
                </div>
              ) : item.type === 'video' ? (
                <div className="flex flex-col items-center gap-2 text-emerald-400">
                  <Video className="w-10 h-10" />
                  <span className="text-[11px] font-mono text-slate-300">Video Stream</span>
                </div>
              ) : item.type === 'audio' ? (
                <div className="flex flex-col items-center gap-2 text-purple-400">
                  <Music className="w-10 h-10" />
                  <span className="text-[11px] font-mono text-slate-300">Audio Track</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-blue-400">
                  <FileText className="w-10 h-10" />
                  <span className="text-[11px] font-mono text-slate-300">PDF Document</span>
                </div>
              )}

              <span className="absolute top-3 start-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white border border-slate-700">
                {item.type}
              </span>
            </div>

            {/* Info & Copy Action */}
            <div className="p-4 space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {item.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                  {item.url}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleCopy(item.id, item.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === item.id ? 'Copied URL!' : 'Copy URL'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeletePrompt(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                    title={language === 'ar' ? 'حذف الأصل' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Add Media Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'ar' ? 'تسجيل أصل وسائط جديد' : 'Register New Media Asset'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedia} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'اسم الأصل *' : 'Asset Label Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. System Diagram v2"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <FileUploadField
                id="media-file-uploader"
                labelAr="ملف الأصل / الرابط المباشر *"
                labelEn="Asset Media File / Direct Link *"
                value={url}
                onChange={(newUrl) => setUrl(newUrl)}
                category="media"
                helperText={language === 'ar' ? 'يدعم الصور ومقاطع الفيديو والملفات الصوتية والمستندات، يتم تخزينه سحابياً.' : 'Supports images, video clips, audio tracks and documents via cloud.'}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نوع الوسائط' : 'Media Type'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="image">{language === 'ar' ? 'صورة (Image)' : 'Image (PNG, WebP, JPG)'}</option>
                    <option value="video">{language === 'ar' ? 'فيديو (Video)' : 'Video (MP4, WebM)'}</option>
                    <option value="audio">{language === 'ar' ? 'صوت (Audio)' : 'Audio (MP3, WAV)'}</option>
                    <option value="pdf">{language === 'ar' ? 'مستند (PDF)' : 'PDF Document'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'التصنيف' : 'Category Tag'}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
                >
                  {loading ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...') : (language === 'ar' ? 'إضافة للخزنة' : 'Add to Vault')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Media Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد حذف الملف من الخزنة' : 'Confirm Delete Media Asset'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'سيتم إزالة هذا الأصل الرقمي من الخزنة.' : 'This asset will be removed from your vault.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
              {itemToDelete.name}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedia}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'نعم، احذف الأصل' : 'Yes, Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
