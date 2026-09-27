import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Filter, 
  FolderGit2, 
  ShoppingBag, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Calendar,
  Layers,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PortfolioItem, ProductItem, ArticleItem } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { deleteDocumentRecursively } from '../../utils/recursiveDelete';
import { AdminBulkActionBar } from './AdminBulkActionBar';
import { LazyImage } from '../LazyImage';

export interface AdminArchiveProps {
  portfolio?: PortfolioItem[];
  products?: ProductItem[];
  articles?: ArticleItem[];
  onRefresh?: () => void;
  onRefreshAll?: () => void;
}

export type ArchivedItemType = 'portfolio' | 'product' | 'article';

export interface UnifiedArchivedItem {
  id: string;
  type: ArchivedItemType;
  titleAr: string;
  titleEn: string;
  category: string;
  image?: string;
  archivedAt?: string | null;
  rawItem: PortfolioItem | ProductItem | ArticleItem;
}

export const AdminArchive: React.FC<AdminArchiveProps> = ({
  portfolio = [],
  products = [],
  articles = [],
  onRefresh,
  onRefreshAll
}) => {
  const { language } = useLanguage();

  const handleTriggerRefresh = () => {
    if (typeof onRefresh === 'function') onRefresh();
    if (typeof onRefreshAll === 'function') onRefreshAll();
  };

  // Active filter tab: 'all' | 'portfolio' | 'product' | 'article'
  const [filterType, setFilterType] = useState<'all' | ArchivedItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]); // Format: `${type}:${id}`
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Single Item Deletion Modal State
  const [itemToPermanentlyDelete, setItemToPermanentlyDelete] = useState<UnifiedArchivedItem | null>(null);
  const [showBulkPermanentDeleteModal, setShowBulkPermanentDeleteModal] = useState(false);
  const [showEmptyArchiveModal, setShowEmptyArchiveModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Gather all archived items
  const allArchivedItems = useMemo<UnifiedArchivedItem[]>(() => {
    const list: UnifiedArchivedItem[] = [];

    // Portfolio
    (portfolio || []).forEach(p => {
      if (p && (p.isArchived || p.status === 'archived')) {
        list.push({
          id: p.id,
          type: 'portfolio',
          titleAr: p.titleAr || p.titleEn || 'مشروع غير معنون',
          titleEn: p.titleEn || p.titleAr || 'Untitled Project',
          category: p.category || 'Portfolio',
          image: p.thumbnail || (p as any).imageUrl || (p as any).thumbnailUrl,
          archivedAt: p.archivedAt || (p as any).updatedAt || (p as any).createdAt,
          rawItem: p
        });
      }
    });

    // Products
    (products || []).forEach(pr => {
      if (pr && (pr.isArchived || pr.status === 'archived')) {
        list.push({
          id: pr.id,
          type: 'product',
          titleAr: pr.nameAr || pr.nameEn || 'منتج غير معنون',
          titleEn: pr.nameEn || pr.nameAr || 'Untitled Product',
          category: pr.category || 'Store',
          image: pr.images?.[0],
          archivedAt: pr.archivedAt || (pr as any).updatedAt || (pr as any).createdAt,
          rawItem: pr
        });
      }
    });

    // Articles
    (articles || []).forEach(a => {
      if (a && (a.isArchived || a.status === 'archived')) {
        list.push({
          id: a.id,
          type: 'article',
          titleAr: a.titleAr || a.titleEn || 'مقال غير معنون',
          titleEn: a.titleEn || a.titleAr || 'Untitled Article',
          category: a.category || 'Article',
          image: a.coverImage,
          archivedAt: a.archivedAt || (a as any).updatedAt || (a as any).createdAt,
          rawItem: a
        });
      }
    });

    // Sort by archived date descending
    return list.sort((a, b) => {
      const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [portfolio, products, articles]);

  // Counts by type
  const counts = useMemo(() => {
    const pCount = allArchivedItems.filter(i => i.type === 'portfolio').length;
    const prCount = allArchivedItems.filter(i => i.type === 'product').length;
    const aCount = allArchivedItems.filter(i => i.type === 'article').length;
    return {
      all: allArchivedItems.length,
      portfolio: pCount,
      product: prCount,
      article: aCount
    };
  }, [allArchivedItems]);

  // Filtered displayed items
  const displayedItems = useMemo(() => {
    return allArchivedItems.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.titleAr.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [allArchivedItems, filterType, searchQuery]);

  // Multi-select helpers
  const handleToggleSelectKey = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const isAllSelected = displayedItems.length > 0 && displayedItems.every(i => selectedKeys.includes(`${i.type}:${i.id}`));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all displayed
      const displayedKeys = new Set(displayedItems.map(i => `${i.type}:${i.id}`));
      setSelectedKeys(prev => prev.filter(k => !displayedKeys.has(k)));
    } else {
      // Select all displayed
      const displayedKeys = displayedItems.map(i => `${i.type}:${i.id}`);
      setSelectedKeys(prev => Array.from(new Set([...prev, ...displayedKeys])));
    }
  };

  // Restore Single Item
  const handleRestoreSingleItem = async (item: UnifiedArchivedItem) => {
    try {
      const collectionName = item.type === 'portfolio' 
        ? 'portfolio' 
        : item.type === 'product' 
          ? 'products' 
          : 'articles';

      await updateDoc(doc(db, collectionName, item.id), {
        status: 'published',
        isArchived: false,
        archivedAt: null
      });

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع "${item.titleAr || item.titleEn}" إلى قسمه النشط بنجاح!` 
          : `Restored "${item.titleEn || item.titleAr}" to active successfully!`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedKeys(prev => prev.filter(k => k !== `${item.type}:${item.id}`));
      handleTriggerRefresh();
    } catch (err: any) {
      console.error('Failed to restore item:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء استرجاع العنصر' : 'Failed to restore item'
      });
    }
  };

  // Bulk Restore Selected Items
  const handleBulkRestore = async () => {
    if (selectedKeys.length === 0) return;
    setIsBulkProcessing(true);

    try {
      for (const key of selectedKeys) {
        const [type, id] = key.split(':') as [ArchivedItemType, string];
        const collectionName = type === 'portfolio' 
          ? 'portfolio' 
          : type === 'product' 
            ? 'products' 
            : 'articles';

        await updateDoc(doc(db, collectionName, id), {
          status: 'published',
          isArchived: false,
          archivedAt: null
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع ${selectedKeys.length} عناصر إلى الأقسام النشطة بنجاح!` 
          : `Restored ${selectedKeys.length} items to active sections successfully!`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedKeys([]);
      handleTriggerRefresh();
    } catch (err: any) {
      console.error('Failed to bulk restore items:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل استرجاع بعض العناصر المحددة' : 'Failed to restore some selected items'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Permanent Delete Single Item with recursive cleanup
  const confirmPermanentDeleteSingle = async () => {
    if (!itemToPermanentlyDelete) return;
    setDeleteLoading(true);

    try {
      const item = itemToPermanentlyDelete;
      const collectionName = item.type === 'portfolio' 
        ? 'portfolio' 
        : item.type === 'product' 
          ? 'products' 
          : 'articles';

      const mediaUrls = [item.image].filter(Boolean) as string[];

      await deleteDocumentRecursively(collectionName, item.id, {
        subcollections: ['comments', 'reviews', 'reactions', 'feedback'],
        linkedCollections: [
          { collectionName: 'comments', foreignKeyField: item.type === 'article' ? 'articleId' : 'projectId' },
          { collectionName: 'reviews', foreignKeyField: 'productId' }
        ],
        associatedMediaUrls: mediaUrls
      });

      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? `تم الحذف النهائي للعنصر "${item.titleAr || item.titleEn}" وكافة ملحقاته من قاعدة البيانات`
          : `Permanently deleted item "${item.titleEn || item.titleAr}" and associated data`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedKeys(prev => prev.filter(k => k !== `${item.type}:${item.id}`));
      setItemToPermanentlyDelete(null);
      handleTriggerRefresh();
    } catch (err: any) {
      console.error('Permanent delete failed:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي للعنصر' : 'Failed to permanently delete item'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk Permanent Delete Selected Items
  const confirmBulkPermanentDelete = async () => {
    if (selectedKeys.length === 0) return;
    setDeleteLoading(true);

    try {
      for (const key of selectedKeys) {
        const [type, id] = key.split(':') as [ArchivedItemType, string];
        const collectionName = type === 'portfolio' 
          ? 'portfolio' 
          : type === 'product' 
            ? 'products' 
            : 'articles';

        const found = allArchivedItems.find(i => i.type === type && i.id === id);
        const mediaUrls = [found?.image].filter(Boolean) as string[];

        await deleteDocumentRecursively(collectionName, id, {
          subcollections: ['comments', 'reviews', 'reactions', 'feedback'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: type === 'article' ? 'articleId' : 'projectId' },
            { collectionName: 'reviews', foreignKeyField: 'productId' }
          ],
          associatedMediaUrls: mediaUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? `تم الحذف النهائي لـ ${selectedKeys.length} عناصر ومرفقاتها من قاعدة البيانات تماماً`
          : `Permanently deleted ${selectedKeys.length} items from database`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedKeys([]);
      setShowBulkPermanentDeleteModal(false);
      handleTriggerRefresh();
    } catch (err: any) {
      console.error('Bulk permanent delete failed:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي لبعض العناصر' : 'Failed to permanently delete items'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Empty Entire Archive across all collections
  const confirmEmptyEntireArchive = async () => {
    setDeleteLoading(true);
    try {
      for (const item of allArchivedItems) {
        const collectionName = item.type === 'portfolio' 
          ? 'portfolio' 
          : item.type === 'product' 
            ? 'products' 
            : 'articles';

        const mediaUrls = [item.image].filter(Boolean) as string[];

        await deleteDocumentRecursively(collectionName, item.id, {
          subcollections: ['comments', 'reviews', 'reactions', 'feedback'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: item.type === 'article' ? 'articleId' : 'projectId' },
            { collectionName: 'reviews', foreignKeyField: 'productId' }
          ],
          associatedMediaUrls: mediaUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' ? 'تم تفريغ الأرشيف بالكامل وحذف كافة عناصره نهائياً!' : 'Entire archive emptied successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedKeys([]);
      setShowEmptyArchiveModal(false);
      handleTriggerRefresh();
    } catch (err: any) {
      console.error('Failed to empty archive:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تفريغ الأرشيف بالكامل' : 'Failed to empty entire archive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper type badge
  const renderTypeBadge = (type: ArchivedItemType) => {
    switch (type) {
      case 'portfolio':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'مشروع' : 'Project'}</span>
          </span>
        );
      case 'product':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'متجر / كتاب' : 'Product'}</span>
          </span>
        );
      case 'article':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'مقال وبحث' : 'Article'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Archive className="w-7 h-7 text-amber-500" />
            <span>{language === 'ar' ? 'الأرشيف المركزي الموحد (Soft Delete Vault)' : 'Central Unified Archive'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'مستودع الأمان المركزي لكافة المشاريع والمنتجات والمقالات المحذوفة بصورة آمنة عبر المنصة مع إمكانية الاسترجاع أو الحذف النهائي.' 
              : 'Unified archive vault containing all soft-deleted projects, store products, and articles with restore & permanent delete controls.'}
          </p>
        </div>

        {allArchivedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyArchiveModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'تفريغ الأرشيف بالكامل' : 'Empty All Archive'}</span>
          </button>
        )}
      </div>

      {/* Safety Vault Information Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold text-sm">
            {language === 'ar' ? 'نظام الحذف الآمن (Soft Delete Guarantee):' : 'Soft Delete Architecture:'}
          </p>
          <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
            {language === 'ar'
              ? 'عند حذف أي مشروع أو منتج أو مقال من أقسام الإدارة، يتم حفظه هنا تلقائياً وتكون محجوبة تماماً عن زوار الموقع دون فقدان بياناتك. يمكنك استرجاع أي عنصر بنقرة زر ليعود فوراً إلى مكانه المنشور، أو حذفه نهائياً عند الرغبة في تحرير المساحة وتنظيف الملحقات.'
              : 'Items removed from admin tables are preserved here in soft-deleted state, hidden from public visitors. You can restore them instantly to their original published state or purge them permanently.'}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterType('all');
              setSelectedKeys([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{language === 'ar' ? 'كافة المحذوفات' : 'All Archived'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              filterType === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterType('portfolio');
              setSelectedKeys([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'portfolio'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'المشاريع' : 'Projects'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              filterType === 'portfolio' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.portfolio}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterType('product');
              setSelectedKeys([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'product'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{language === 'ar' ? 'المتجر والمنتجات' : 'Store Products'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              filterType === 'product' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.product}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterType('article');
              setSelectedKeys([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'article'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'ar' ? 'المقالات والأبحاث' : 'Articles'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              filterType === 'article' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {counts.article}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث في الأرشيف...' : 'Search archived items...'}
            className="w-full ps-9.5 pe-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Unified Archive Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    disabled={displayedItems.length === 0}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    title={language === 'ar' ? 'تحديد كل المعروض' : 'Select all displayed'}
                  />
                </th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'العنصر المؤرشف' : 'Archived Item'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'القسم الأصلي' : 'Original Section'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'تاريخ الأرشفة' : 'Archived Date'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        {language === 'ar' ? 'الأرشيف فارغ حالياً' : 'Archive is completely empty'}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {language === 'ar' 
                          ? 'أي عناصر تقوم بحذفها من أقسام المشاريع، المتجر، أو المقالات ستظهر هنا تلقائياً ويمكن استرجاعها في أي لحظة.' 
                          : 'Items deleted from Portfolio, Store, or Articles sections will safely appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const key = `${item.type}:${item.id}`;
                  const isSelected = selectedKeys.includes(key);

                  return (
                    <tr
                      key={key}
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-amber-500/5 dark:bg-amber-500/10' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectKey(key)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.image && item.image.trim() !== '' ? (
                            <LazyImage
                              src={item.image}
                              alt={language === 'ar' ? item.titleAr : item.titleEn}
                              className="w-11 h-11 rounded-lg object-cover bg-slate-950 shrink-0"
                              containerClassName="w-11 h-11 rounded-lg overflow-hidden shrink-0"
                              fallbackIcon={
                                <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                                  <Archive className="w-5 h-5" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                              <Archive className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-xs sm:max-w-sm">
                              {language === 'ar' ? item.titleAr : item.titleEn}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              ID: {item.id.slice(0, 10)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderTypeBadge(item.type)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Restore Button */}
                          <button
                            type="button"
                            onClick={() => handleRestoreSingleItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold cursor-pointer transition-colors"
                            title={language === 'ar' ? 'استرجاع العنصر إلى وضعه النشط' : 'Restore item to active'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'استرجاع' : 'Restore'}</span>
                          </button>

                          {/* Permanent Delete Button */}
                          <button
                            type="button"
                            onClick={() => setItemToPermanentlyDelete(item)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title={language === 'ar' ? 'حذف نهائي من قاعدة البيانات' : 'Permanently Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistent Batch Action Bar when items are selected */}
      <AdminBulkActionBar
        selectedCount={selectedKeys.length}
        totalCount={displayedItems.length}
        isAllSelected={isAllSelected}
        onSelectAll={handleToggleSelectAll}
        onDeselectAll={() => setSelectedKeys([])}
        currentTab="archived"
        itemLabelAr="عناصر من الأرشيف"
        itemLabelEn="archived items"
        isProcessing={isBulkProcessing}
        onRestoreSelected={handleBulkRestore}
        onPermanentDeleteSelected={() => setShowBulkPermanentDeleteModal(true)}
      />

      {/* Modal: Single Item Permanent Delete Confirmation */}
      {itemToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111216] border border-rose-900/50 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {language === 'ar' ? 'تأكيد الحذف النهائي الجذري' : 'Confirm Permanent Deletion'}
                </h3>
                <p className="text-[11px] text-rose-400">
                  {language === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه بعد إتمامه' : 'This action is completely irreversible'}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف "${itemToPermanentlyDelete.titleAr || itemToPermanentlyDelete.titleEn}" نهائياً؟ سيتم مسح المستند، المجموعات الفرعية المرتبطة به، والتعليقات والوسائط من Firestore تماماً.`
                : `Are you sure you want to permanently purge "${itemToPermanentlyDelete.titleEn || itemToPermanentlyDelete.titleAr}" from Firestore? All associated comments and files will be removed.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setItemToPermanentlyDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmPermanentDeleteSingle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'ar' ? 'نعم، احذف نهائياً' : 'Yes, Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Permanent Delete Confirmation */}
      {showBulkPermanentDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111216] border border-rose-900/50 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {language === 'ar' ? `حذف نهائي لـ ${selectedKeys.length} عناصر` : `Permanently Delete ${selectedKeys.length} Items`}
                </h3>
                <p className="text-[11px] text-rose-400">
                  {language === 'ar' ? 'سيتم مسح العناصر المحددة من قاعدة البيانات نهائياً' : 'Selected items will be permanently erased'}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `أنت على وشك حذف ${selectedKeys.length} عناصر محددة من الأرشيف نهائياً. سيتم حذف كافة متعلقاتها من قاعدة البيانات دون إمكانية استرجاعها.`
                : `You are about to permanently delete ${selectedKeys.length} items from the database. This cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setShowBulkPermanentDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmBulkPermanentDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Empty Entire Archive Confirmation */}
      {showEmptyArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111216] border border-rose-900/50 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {language === 'ar' ? 'تفريغ الأرشيف بالكامل' : 'Empty Entire Archive'}
                </h3>
                <p className="text-[11px] text-rose-400">
                  {language === 'ar' ? `حذف جميع العناصر المؤرشفة (${allArchivedItems.length}) نهائياً` : `Delete all ${allArchivedItems.length} archived items`}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `تحذير: سيتم حذف جميع المشاريع والمنتجات والمقالات المؤرشفة (${allArchivedItems.length} عنصر) نهائياً من قاعدة البيانات وتنظيف كافة ملفاتها. هذا الإجراء نهائي ولا يمكن التراجع عنه.`
                : `Warning: This will permanently erase all ${allArchivedItems.length} archived items across all categories from Firestore. This cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setShowEmptyArchiveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmEmptyEntireArchive}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer transition-colors disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'ar' ? 'نعم، تفريغ الأرشيف نهائياً' : 'Yes, Empty All Archive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
