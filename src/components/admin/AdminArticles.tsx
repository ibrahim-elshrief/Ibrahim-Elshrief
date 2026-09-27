import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  Save, 
  Clock, 
  Tag,
  AlertCircle,
  CheckCircle2,
  Archive,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ArticleItem, ContentStatus, ProjectStatus } from '../../types';
import { db, cleanFirestorePayload } from '../../firebase';
import { deleteDocumentRecursively } from '../../utils/recursiveDelete';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { sendArticleBroadcastEmail } from '../../utils/emailService';
import { AdminTaxonomyManager } from './AdminTaxonomyManager';
import { AdminBulkActionBar } from './AdminBulkActionBar';
import { validateMediaLink } from '../../utils/mediaResolver';
import { LazyImage } from '../LazyImage';

interface AdminArticlesProps {
  articles: ArticleItem[];
  onRefresh: () => void;
}

export const AdminArticles: React.FC<AdminArticlesProps> = ({
  articles,
  onRefresh
}) => {
  const { language } = useLanguage();
  const { appUser, currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [notifySubscribers, setNotifySubscribers] = useState(true);

  // Archive & View Tab State
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'archived'>('active');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Permanent Delete Confirmation Modals
  const [articleToPermanentlyDelete, setArticleToPermanentlyDelete] = useState<ArticleItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEmptyArchiveModal, setShowEmptyArchiveModal] = useState(false);
  const [showBulkPermanentDeleteModal, setShowBulkPermanentDeleteModal] = useState(false);

  // Taxonomies State
  const defaultCategories = [
    'تحقيقات واستقصاءات',
    'دراسات فكرية وفلسفية',
    'مقالات رأي وتحليلات',
    'وثائقيات وبحوث تاريخية',
    'Distributed Systems',
    'Cloud Architecture',
    'Cybersecurity',
    'Web Development',
    'AI & Machine Learning',
    'DevOps & SRE'
  ];

  const defaultStatuses = ['published', 'draft', 'archived'];

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_articles_custom_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedCategories, setRemovedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_articles_removed_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customStatuses, setCustomStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_articles_custom_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedStatuses, setRemovedStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_articles_removed_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('admin_articles_custom_categories_v2', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('admin_articles_removed_categories_v2', JSON.stringify(removedCategories));
  }, [removedCategories]);

  useEffect(() => {
    localStorage.setItem('admin_articles_custom_statuses_v2', JSON.stringify(customStatuses));
  }, [customStatuses]);

  useEffect(() => {
    localStorage.setItem('admin_articles_removed_statuses_v2', JSON.stringify(removedStatuses));
  }, [removedStatuses]);

  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...articles.map(a => a.category).filter(Boolean),
    ...customCategories
  ])).filter(c => !removedCategories.includes(c));

  const allStatuses = Array.from(new Set([
    ...defaultStatuses,
    ...articles.map(a => a.status).filter(Boolean),
    ...customStatuses
  ])).filter(s => !removedStatuses.includes(s));

  const handleAddCategory = (cat: string) => {
    const clean = cat.trim();
    setRemovedCategories(prev => prev.filter(c => c.toLowerCase() !== clean.toLowerCase()));
    setCustomCategories(prev => Array.from(new Set([...prev, clean])));
  };

  const handleRemoveCategory = (cat: string) => {
    setRemovedCategories(prev => Array.from(new Set([...prev, cat])));
    setCustomCategories(prev => prev.filter(c => c !== cat));
  };

  const handleAddStatus = (st: string) => {
    const clean = st.trim();
    setRemovedStatuses(prev => prev.filter(s => s.toLowerCase() !== clean.toLowerCase()));
    setCustomStatuses(prev => Array.from(new Set([...prev, clean])));
  };

  const handleRemoveStatus = (st: string) => {
    setRemovedStatuses(prev => Array.from(new Set([...prev, st])));
    setCustomStatuses(prev => prev.filter(s => s !== st));
  };

  // Category usage count
  const categoryUsageCounts: Record<string, number> = {};
  articles.forEach(a => {
    if (a.category) {
      categoryUsageCounts[a.category] = (categoryUsageCounts[a.category] || 0) + 1;
    }
  });

  // Active vs Archived article lists
  const activeArticles = articles.filter(a => a.status !== 'archived' && !a.isArchived);
  const archivedArticles = articles.filter(a => a.status === 'archived' || a.isArchived);
  const displayedArticles = activeViewTab === 'active' ? activeArticles : archivedArticles;

  // Form State
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [excerptAr, setExcerptAr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [category, setCategory] = useState(allCategories[0] || 'Distributed Systems');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80');
  const [status, setStatus] = useState<ProjectStatus>('published');
  const [readTimeMinutes, setReadTimeMinutes] = useState(5);

  const handleOpenAdd = () => {
    setEditingArticle(null);
    setFormError(null);
    setTitleEn('');
    setTitleAr('');
    setExcerptEn('');
    setExcerptAr('');
    setContentEn('');
    setContentAr('');
    setCategory(allCategories[0] || 'Distributed Systems');
    setCoverImage('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80');
    setStatus('published');
    setReadTimeMinutes(5);
    setModalOpen(true);
  };

  const handleOpenEdit = (a: ArticleItem) => {
    setEditingArticle(a);
    setFormError(null);
    setTitleEn(a.titleEn || '');
    setTitleAr(a.titleAr || '');
    setExcerptEn(a.excerptEn || '');
    setExcerptAr(a.excerptAr || '');
    setContentEn(a.contentEn || '');
    setContentAr(a.contentAr || '');
    setCategory(a.category || allCategories[0] || 'Distributed Systems');
    setCoverImage(a.coverImage || '');
    setStatus(a.status || 'published');
    setReadTimeMinutes(a.readTimeMinutes || 5);
    setModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!titleEn.trim() && !titleAr.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال عنوان المقال' : 'Please enter article title');
      return;
    }

    setIsSubmitting(true);

    // Validation Layer: check cover image link
    if (coverImage.trim()) {
      const imgCheck = await validateMediaLink(coverImage.trim(), 'image');
      if (!imgCheck.isValid) {
        const msg = language === 'ar'
          ? `رابط غلاف المقال غير صالح أو معطل: ${imgCheck.error || ''}`
          : `Article cover image link is broken: ${imgCheck.error || ''}`;
        setFormError(msg);
        setFeedback({ type: 'error', message: msg });
        setIsSubmitting(false);
        return;
      }
    }

    const calculatedReadTime = Math.max(
      1,
      Math.ceil(((contentEn || '').split(/\s+/).length + (contentAr || '').split(/\s+/).length) / 200)
    );

    const rawPayload = {
      titleEn: titleEn.trim() || titleAr.trim(),
      titleAr: titleAr.trim() || titleEn.trim(),
      slug: (titleEn.trim() || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerptEn: excerptEn.trim(),
      excerptAr: excerptAr.trim(),
      contentEn: contentEn.trim() || excerptEn.trim(),
      contentAr: contentAr.trim() || excerptAr.trim(),
      category: category || 'Distributed Systems',
      coverImage: coverImage.trim() || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      status,
      isArchived: status === 'archived',
      archivedAt: status === 'archived' ? new Date().toISOString() : null,
      readTimeMinutes: Number(readTimeMinutes) || calculatedReadTime,
      tags: editingArticle?.tags || ['Engineering', 'Architecture'],
      publishedAt: editingArticle?.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const payload = cleanFirestorePayload(rawPayload);

    try {
      if (editingArticle) {
        try {
          await updateDoc(doc(db, 'articles', editingArticle.id), payload);
        } catch (updateErr: any) {
          await setDoc(doc(db, 'articles', editingArticle.id), payload, { merge: true });
        }
      } else {
        const newDocRef = doc(collection(db, 'articles'));
        await setDoc(newDocRef, {
          ...payload,
          authorId: currentUser?.uid || 'admin',
          authorName: appUser?.displayName || 'Editorial Team',
          createdAt: new Date().toISOString(),
          views: 0
        }, { merge: true });
      }

      // If user enabled notify subscribers and status is published, dispatch broadcast!
      if (notifySubscribers && status === 'published') {
        try {
          const subSnap = await getDocs(query(collection(db, 'subscribers'), where('status', '==', 'active')));
          const subsList: Array<{ email: string; language?: string }> = [];
          subSnap.forEach((d) => subsList.push(d.data() as any));
          if (subsList.length > 0) {
            const articleToBroadcast: ArticleItem = {
              id: editingArticle?.id || 'new_article',
              ...payload,
              status: 'published' as ContentStatus,
              author: appUser?.displayName || 'Editorial Team',
              featured: Boolean(editingArticle?.featured ?? true),
              views: 0
            };
            sendArticleBroadcastEmail(articleToBroadcast, subsList).catch((err) => {
              console.warn('Background article broadcast notice:', err);
            });
          }
        } catch (subErr) {
          console.warn('Could not dispatch subscriber notification:', subErr);
        }
      }

      setModalOpen(false);
      setNotifySubscribers(true);
      setFeedback({
        type: 'success',
        message: notifySubscribers && status === 'published'
          ? (language === 'ar' ? 'تم حفظ المقال وإرسال إشعار للمشتركين عبر البريد الإلكتروني!' : 'Article saved and email dispatched to subscribers!')
          : (language === 'ar' ? 'تم حفظ المقال بنجاح!' : 'Article saved successfully!')
      });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to save article in Firestore:', err);

      // Gracefully handle 'Document already exists' / 'already-exists' by updating the target document
      const isAlreadyExists = 
        err?.code === 'already-exists' || 
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('already exists'));

      if (isAlreadyExists) {
        try {
          const matchedId = err?.message?.match(/articles\/([a-zA-Z0-9_-]+)/)?.[1] || editingArticle?.id;
          if (matchedId) {
            await setDoc(doc(db, 'articles', matchedId), payload, { merge: true });
            setModalOpen(false);
            setFeedback({
              type: 'success',
              message: language === 'ar' ? 'تم حفظ وتحديث المقال بنجاح!' : 'Article updated and saved successfully!'
            });
            setTimeout(() => setFeedback(null), 3500);
            onRefresh();
            return;
          }
        } catch (recoverErr) {
          console.warn('Could not auto-recover from already-exists error:', recoverErr);
        }
      }

      setFormError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المقال' : 'Error saving article'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Soft Delete: Move Single Article to Archive ---
  const handleMoveToArchive = async (a: ArticleItem) => {
    try {
      await updateDoc(doc(db, 'articles', a.id), {
        status: 'archived',
        isArchived: true,
        archivedAt: new Date().toISOString()
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل المقال "${a.titleAr || a.titleEn}" إلى الأرشيف بنجاح` 
          : `Article moved to Archive successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== a.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to archive article:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء أرشفة المقال' : 'Failed to archive article'
      });
    }
  };

  // --- Soft Delete: Bulk Move Articles to Archive ---
  const handleBulkMoveToArchive = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'articles', id), {
          status: 'archived',
          isArchived: true,
          archivedAt: new Date().toISOString()
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل ${selectedIds.length} مقالات إلى الأرشيف بنجاح` 
          : `Moved ${selectedIds.length} articles to Archive`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk archive articles:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الأرشفة الجماعية' : 'Failed to bulk archive'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Restore: Single Article from Archive ---
  const handleRestoreArticle = async (a: ArticleItem) => {
    try {
      await updateDoc(doc(db, 'articles', a.id), {
        status: 'published',
        isArchived: false,
        archivedAt: null
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع المقال "${a.titleAr || a.titleEn}" بنجاح إلى المقالات النشطة` 
          : `Article restored to active list`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== a.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to restore article:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء استرجاع المقال' : 'Failed to restore article'
      });
    }
  };

  // --- Restore: Bulk Restore Articles ---
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'articles', id), {
          status: 'published',
          isArchived: false,
          archivedAt: null
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع ${selectedIds.length} مقالات من الأرشيف بنجاح` 
          : `Restored ${selectedIds.length} articles successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk restore articles:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الاسترجاع الجماعي' : 'Failed to bulk restore'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Permanent Delete: Single Article ---
  const confirmPermanentDeleteArticle = async () => {
    if (!articleToPermanentlyDelete) return;
    setDeleteLoading(true);
    try {
      const associatedUrls = [articleToPermanentlyDelete.coverImage].filter(Boolean) as string[];

      const deleteRes = await deleteDocumentRecursively('articles', articleToPermanentlyDelete.id, {
        subcollections: ['comments', 'feedback', 'reactions'],
        linkedCollections: [
          { collectionName: 'comments', foreignKeyField: 'articleId' }
        ],
        associatedMediaUrls: associatedUrls
      });

      const totalCleaned = deleteRes.subcollectionItemsDeleted + deleteRes.linkedItemsDeleted + deleteRes.associatedMediaDeleted;
      const subInfo = totalCleaned > 0
        ? (language === 'ar' 
            ? ` (تم تنظيف ${totalCleaned} من التعليقات والمرفقات المرتبطة)` 
            : ` (cleaned ${totalCleaned} associated comments & media)`)
        : '';

      setFeedback({
        type: 'success',
        message: (language === 'ar' ? 'تم الحذف النهائي للمقال وكافة متعلقاته من قاعدة البيانات' : 'Article permanently deleted') + subInfo
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== articleToPermanentlyDelete.id));
      setArticleToPermanentlyDelete(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to permanently delete article:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي للمقال' : 'Failed to permanently delete article'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Bulk Selected Articles ---
  const confirmBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of selectedIds) {
        const item = articles.find(a => a.id === id);
        const associatedUrls = [item?.coverImage].filter(Boolean) as string[];

        await deleteDocumentRecursively('articles', id, {
          subcollections: ['comments', 'feedback', 'reactions'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: 'articleId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم حذف ${selectedIds.length} مقالات نهائياً من قاعدة البيانات` 
          : `Permanently deleted ${selectedIds.length} articles`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowBulkPermanentDeleteModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk delete articles:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي الجماعي للمقالات' : 'Failed to bulk delete'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Empty Entire Archive ---
  const confirmEmptyArchive = async () => {
    if (archivedArticles.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const a of archivedArticles) {
        const associatedUrls = [a.coverImage].filter(Boolean) as string[];

        await deleteDocumentRecursively('articles', a.id, {
          subcollections: ['comments', 'feedback', 'reactions'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: 'articleId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم تفريغ الأرشيف وحذف جميع المقالات المؤرشفة نهائياً (${archivedArticles.length} مقال)` 
          : `Article archive emptied successfully (${archivedArticles.length} articles deleted)`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowEmptyArchiveModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to empty article archive:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تفريغ أرشيف المقالات' : 'Failed to empty archive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Checkbox helpers
  const isAllSelected = displayedArticles.length > 0 && displayedArticles.every(a => selectedIds.includes(a.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const displayedIds = displayedArticles.map(a => a.id);
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      const displayedIds = displayedArticles.map(a => a.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة المقالات والأبحاث والمحتوى' : 'Articles & Thought Leadership'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'إدارة المقالات، ضبط التصنيفات والحالات الافتراضية، التحديد الجماعي، ونظام الأرشفة الآمن.' 
              : 'Manage articles, master taxonomies, multi-selection actions, and soft-delete archive.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'كتابة مقال جديد' : 'New Article'}</span>
        </button>
      </div>

      {/* General Settings & Taxonomies Panel */}
      <AdminTaxonomyManager
        titleAr="الإعدادات العامة وتصنيفات المقالات والأبحاث"
        titleEn="Article Taxonomies & Default Settings"
        descriptionAr="سجّل التصنيفات والحالات الافتراضية التي تظهر تلقائياً في قائمة الاختيار عند كتابة مقال أو بحث جديد."
        descriptionEn="Manage master categories and publication statuses that automatically populate in dropdowns when creating articles."
        categories={allCategories}
        defaultCategories={defaultCategories}
        onAddCategory={handleAddCategory}
        onRemoveCategory={handleRemoveCategory}
        statuses={allStatuses}
        defaultStatuses={defaultStatuses}
        onAddStatus={handleAddStatus}
        onRemoveStatus={handleRemoveStatus}
        categoryUsageCounts={categoryUsageCounts}
      />

      {/* Tab Switcher: Active vs Archive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveViewTab('active');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'ar' ? 'المقالات النشطة' : 'Active Articles'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {activeArticles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveViewTab('archived');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'archived'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>{language === 'ar' ? 'أرشيف المحذوفات' : 'Archive & Trash'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === 'archived' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {archivedArticles.length}
            </span>
          </button>
        </div>

        {activeViewTab === 'archived' && archivedArticles.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyArchiveModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تفريغ الأرشيف نهائياً' : 'Empty Archive'}</span>
          </button>
        )}
      </div>

      {/* Archive Notice Banner */}
      {activeViewTab === 'archived' && (
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
          <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">
              {language === 'ar' ? 'نظام الحفظ الآمن للمقالات:' : 'Article Archive Vault:'}
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              {language === 'ar'
                ? 'جميع المقالات في هذا الأرشيف محفوظة تماماً وغير ظاهرة للقراء. يمكنك استرجاع أي مقال بنقرة زر أو حذفه نهائياً.'
                : 'All archived articles are safely stored in Firestore and hidden from readers. You can restore or permanently delete them anytime.'}
            </p>
          </div>
        </div>
      )}

      {/* Articles Table */}
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
                    disabled={displayedArticles.length === 0}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={language === 'ar' ? 'تحديد كل المعروض' : 'Select all displayed'}
                  />
                </th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المقال' : 'Article'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'زمن القراءة' : 'Read Time'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {activeViewTab === 'active' ? (
                        <>
                          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد مقالات نشطة حالياً' : 'No active articles'}</p>
                          <button
                            onClick={handleOpenAdd}
                            className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                          >
                            + {language === 'ar' ? 'كتابة مقال جديد' : 'Write your first article'}
                          </button>
                        </>
                      ) : (
                        <>
                          <Archive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'أرشيف المقالات فارغ تماماً' : 'Article archive is empty'}</p>
                          <p className="text-xs text-slate-400">{language === 'ar' ? 'المقالات المحذوفة ستظهر هنا' : 'Deleted articles will appear here'}</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedArticles.map((a) => {
                  const isSelected = selectedIds.includes(a.id);
                  return (
                    <tr 
                      key={a.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(a.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {a.coverImage && a.coverImage.trim() !== '' ? (
                            <LazyImage
                              src={a.coverImage}
                              alt={language === 'ar' ? a.titleAr : a.titleEn}
                              className="w-12 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                              containerClassName="w-12 h-10 rounded-lg overflow-hidden shrink-0"
                              fallbackIcon={
                                <div className="w-12 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                                  <BookOpen className="w-5 h-5" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-12 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {language === 'ar' ? a.titleAr : a.titleEn}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {a.tags ? a.tags.join(' • ') : (language === 'ar' ? a.excerptAr : a.excerptEn)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {a.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {a.readTimeMinutes} {language === 'ar' ? 'دقيقة' : 'min'}
                      </td>

                      <td className="py-3.5 px-4">
                        {a.isArchived || a.status === 'archived' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 w-fit">
                            <Archive className="w-3 h-3 text-amber-500" />
                            <span>{language === 'ar' ? 'مؤرشف' : 'Archived'}</span>
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            a.status === 'published'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {language === 'ar' ? (a.status === 'published' ? 'منشور' : a.status === 'draft' ? 'مسودة' : 'مؤرشف') : a.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeViewTab === 'active' ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(a)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'تعديل المقال' : 'Edit Article'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveToArchive(a)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'نقل إلى الأرشيف' : 'Move to Archive'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestoreArticle(a)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'استرجاع المقال إلى النشط' : 'Restore Article'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setArticleToPermanentlyDelete(a)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'حذف نهائي من قاعدة البيانات' : 'Permanently Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Floating Multi-Select Batch Action Bar */}
      <AdminBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={displayedArticles.length}
        isAllSelected={isAllSelected}
        onSelectAll={handleToggleSelectAll}
        onDeselectAll={() => setSelectedIds([])}
        currentTab={activeViewTab}
        itemLabelAr="مقالات"
        itemLabelEn="articles"
        isProcessing={isBulkProcessing}
        onMoveToArchive={handleBulkMoveToArchive}
        onRestoreSelected={handleBulkRestore}
        onPermanentDeleteSelected={() => setShowBulkPermanentDeleteModal(true)}
      />

      {/* Add / Edit Article Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-3xl bg-[#111216] text-white border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#0c0d10]">
              <h3 className="font-bold text-white text-base">
                {editingArticle ? (language === 'ar' ? 'تعديل المقال' : 'Edit Article') : (language === 'ar' ? 'نشر مقال جديد' : 'New Article')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Bilingual Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'عنوان المقال بالإنجليزية *' : 'English Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="E.g. The Architecture of Scalable Systems"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'عنوان المقال بالعربية *' : 'Arabic Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: هندسة النظم الموزعة والتوسع"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Category, Status, Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {allCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'حالة النشر' : 'Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="published">{language === 'ar' ? 'منشور (ظاهر للقراء)' : 'Published'}</option>
                    <option value="draft">{language === 'ar' ? 'مسودة (مخفي)' : 'Draft'}</option>
                    <option value="archived">{language === 'ar' ? 'مؤرشف (في الأرشيف)' : 'Archived'}</option>
                    {customStatuses.filter(s => !['published', 'draft', 'archived'].includes(s)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'زمن القراءة (دقائق)' : 'Read Time (min)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={readTimeMinutes}
                    onChange={(e) => setReadTimeMinutes(parseInt(e.target.value) || 5)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Cover Image URL with Upload & Instant Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'رابط صورة الغلاف *' : 'Cover Image URL *'}
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors border border-slate-300 dark:border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'رفع من الجهاز' : 'Upload from device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setCoverImage(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://drive.google.com/... أو رابط مباشر أو صورة Unsplash"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />

                {/* Instant Live Image Preview */}
                {coverImage && coverImage.trim() !== '' && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <LazyImage
                      src={coverImage}
                      alt="Article cover preview"
                      className="w-16 h-12 rounded-lg object-cover bg-slate-950 shrink-0"
                      containerClassName="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600"
                      fallbackIcon={
                        <div className="w-16 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-white/40 shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {language === 'ar' ? 'معاينة غلاف المقال نشطة' : 'Live Article Cover Preview Active'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {coverImage.slice(0, 50)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title={language === 'ar' ? 'إزالة' : 'Remove'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Excerpts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'مقتطف موجز بالإنجليزية' : 'English Excerpt'}
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={excerptEn}
                    onChange={(e) => setExcerptEn(e.target.value)}
                    placeholder="Brief summary..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'مقتطف موجز بالعربية' : 'Arabic Excerpt'}
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={excerptAr}
                    onChange={(e) => setExcerptAr(e.target.value)}
                    placeholder="نبذة سريعة..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Full Content */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'المحتوى الكامل بالإنجليزية (Markdown)' : 'English Content (Markdown)'}
                  </label>
                  <textarea
                    rows={6}
                    dir="ltr"
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="# Main Heading..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-mono"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'المحتوى الكامل بالعربية (Markdown)' : 'Arabic Content (Markdown)'}
                  </label>
                  <textarea
                    rows={6}
                    dir="rtl"
                    value={contentAr}
                    onChange={(e) => setContentAr(e.target.value)}
                    placeholder="# العنوان الرئيسي..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-mono"
                  />
                </div>
              </div>

              {/* Notify Subscribers via Email Option */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2.5 text-xs text-emerald-950 dark:text-emerald-200 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySubscribers}
                    onChange={(e) => setNotifySubscribers(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <span>{language === 'ar' ? 'إرسال إشعار فوري لجميع المشتركين عبر البريد الإلكتروني عند النشر' : 'Send instant email notification to subscribers upon publishing'}</span>
                </label>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                  {language === 'ar' ? 'بريد رسمي ومنسق' : 'Formatted Email'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ المقال' : 'Save Article')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Single Article Permanent Delete Confirmation Modal */}
      {articleToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تأكيد الحذف النهائي للمقال' : 'Confirm Permanent Deletion'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' ? 'تحذير: سيتم حذف هذا المقال وجميع تعليقاته نهائياً من قاعدة البيانات.' : 'Warning: This will permanently remove the article and all attached comments.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0d10] border border-neutral-800 text-xs font-mono text-neutral-300 truncate">
              {language === 'ar' ? articleToPermanentlyDelete.titleAr || articleToPermanentlyDelete.titleEn : articleToPermanentlyDelete.titleEn || articleToPermanentlyDelete.titleAr}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArticleToPermanentlyDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmPermanentDeleteArticle}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'حذف نهائي' : 'Yes, Delete Permanently')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Permanent Delete Modal */}
      {showBulkPermanentDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'حذف نهائي للمقالات المحددة' : 'Permanently Delete Selected'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `هل أنت متأكد من الحذف النهائي لعدد (${selectedIds.length}) مقالات من قاعدة البيانات؟ لا يمكن التراجع.` 
                    : `Permanently delete ${selectedIds.length} selected articles? This action cannot be undone.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkPermanentDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmBulkPermanentDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'حذف نهائي' : 'Delete Selected')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Archive Confirmation Modal */}
      {showEmptyArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تفريغ أرشيف المقالات بالكامل' : 'Empty Article Archive'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `سيتم الحذف النهائي لجميع المقالات المؤرشفة (${archivedArticles.length} مقال) ولن يمكن استرجاعها مطلقاً.` 
                    : `This will permanently delete all ${archivedArticles.length} archived articles.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyArchiveModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmEmptyArchive}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? (language === 'ar' ? 'جارٍ التفريغ...' : 'Emptying...') : (language === 'ar' ? 'تفريغ الأرشيف نهائياً' : 'Empty Archive')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
