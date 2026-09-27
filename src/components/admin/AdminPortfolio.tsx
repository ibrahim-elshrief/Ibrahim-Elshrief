import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  ExternalLink, 
  X, 
  Save, 
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  Sparkles,
  Upload
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PortfolioItem, ProjectStatus, PortfolioMedia } from '../../types';
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
import { sendPortfolioBroadcastEmail } from '../../utils/emailService';
import { AdminTaxonomyManager } from './AdminTaxonomyManager';
import { AdminBulkActionBar } from './AdminBulkActionBar';
import { validateMediaLink } from '../../utils/mediaResolver';
import { LazyImage } from '../LazyImage';

interface AdminPortfolioProps {
  portfolio: PortfolioItem[];
  onRefresh: () => void;
}

export const AdminPortfolio: React.FC<AdminPortfolioProps> = ({
  portfolio,
  onRefresh
}) => {
  const { language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  
  // Archive & View Tab State
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'archived'>('active');
  
  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Permanent Delete Confirmation Modal
  const [projectToPermanentlyDelete, setProjectToPermanentlyDelete] = useState<PortfolioItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEmptyArchiveModal, setShowEmptyArchiveModal] = useState(false);
  const [showBulkPermanentDeleteModal, setShowBulkPermanentDeleteModal] = useState(false);

  // Taxonomies State (persisted in localStorage)
  const defaultCategories = ['Cloud Systems', 'AI & ML', 'سلاسل وثائقية', 'تحقيقات واستقصاءات', 'Creative Tech', 'أبحاث ودراسات تاريخية', 'FinTech', 'Hardware & IoT'];
  const defaultStatuses = ['published', 'draft', 'archived'];

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_portfolio_custom_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedCategories, setRemovedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_portfolio_removed_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customStatuses, setCustomStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_portfolio_custom_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedStatuses, setRemovedStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_portfolio_removed_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage when custom categories/statuses change
  useEffect(() => {
    localStorage.setItem('admin_portfolio_custom_categories_v2', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('admin_portfolio_removed_categories_v2', JSON.stringify(removedCategories));
  }, [removedCategories]);

  useEffect(() => {
    localStorage.setItem('admin_portfolio_custom_statuses_v2', JSON.stringify(customStatuses));
  }, [customStatuses]);

  useEffect(() => {
    localStorage.setItem('admin_portfolio_removed_statuses_v2', JSON.stringify(removedStatuses));
  }, [removedStatuses]);

  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...portfolio.map(p => p.category).filter(Boolean),
    ...customCategories
  ])).filter(c => !removedCategories.includes(c));

  const allStatuses = Array.from(new Set([
    ...defaultStatuses,
    ...portfolio.map(p => p.status).filter(Boolean),
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
  portfolio.forEach(p => {
    if (p.category) {
      categoryUsageCounts[p.category] = (categoryUsageCounts[p.category] || 0) + 1;
    }
  });

  // Active vs Archived project lists
  const activeProjects = portfolio.filter(p => p.status !== 'archived' && !p.isArchived);
  const archivedProjects = portfolio.filter(p => p.status === 'archived' || p.isArchived);
  const displayedProjects = activeViewTab === 'active' ? activeProjects : archivedProjects;

  // Form State
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [category, setCategory] = useState('Cloud Systems');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80');
  const [status, setStatus] = useState<ProjectStatus>('published');
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [featured, setFeatured] = useState(true);
  const [liveUrl, setLiveUrl] = useState('https://example.com');
  const [client, setClient] = useState('Apex Systems');
  const [mediaList, setMediaList] = useState<PortfolioMedia[]>([]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormError(null);
    setTitleEn('');
    setTitleAr('');
    setDescEn('');
    setDescAr('');
    setCategory(allCategories[0] || 'Cloud Systems');
    setShowAddCategory(false);
    setShowAddStatus(false);
    setThumbnail('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80');
    setStatus('published');
    setFeatured(true);
    setLiveUrl('');
    setClient('');
    setMediaList([]);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: PortfolioItem) => {
    setEditingProject(p);
    setFormError(null);
    setTitleEn(p.titleEn || '');
    setTitleAr(p.titleAr || '');
    setDescEn(p.shortDescEn || p.fullDescEn || '');
    setDescAr(p.shortDescAr || p.fullDescAr || '');
    setCategory(p.category || allCategories[0] || 'Cloud Systems');
    setShowAddCategory(false);
    setShowAddStatus(false);
    setThumbnail(p.thumbnail || '');
    setStatus(p.status || 'published');
    setFeatured(p.featured !== undefined ? p.featured : true);
    setLiveUrl(p.projectUrl || '');
    setClient(p.client || '');
    setMediaList(p.media || []);
    setModalOpen(true);
  };

  // Save/Create Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!titleEn.trim() && !titleAr.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال عنوان المشروع' : 'Please enter project title');
      return;
    }

    setIsSubmitting(true);

    // Validation Layer: verify image/video/media links before saving to database
    if (thumbnail.trim()) {
      const thumbCheck = await validateMediaLink(thumbnail.trim(), 'image');
      if (!thumbCheck.isValid) {
        const errorMsg = language === 'ar'
          ? `رابط الصورة المصغرة غير صالح أو لا يمكن الوصول إليه: ${thumbCheck.error || ''}`
          : `Thumbnail link is broken or unreachable: ${thumbCheck.error || ''}`;
        setFormError(errorMsg);
        setFeedback({ type: 'error', message: errorMsg });
        setIsSubmitting(false);
        return;
      }
    }

    for (const m of mediaList) {
      if (m.url && m.url.trim()) {
        const mCheck = await validateMediaLink(m.url.trim(), m.type || 'image');
        if (!mCheck.isValid) {
          const errorMsg = language === 'ar'
            ? `رابط الوسائط (${m.titleAr || m.titleEn || m.type}) غير صالح أو معطل!`
            : `Media link for (${m.titleEn || m.titleAr || m.type}) is broken or unreachable!`;
          setFormError(errorMsg);
          setFeedback({ type: 'error', message: errorMsg });
          setIsSubmitting(false);
          return;
        }
      }
    }

    const rawPayload = {
      titleEn: titleEn.trim() || titleAr.trim(),
      titleAr: titleAr.trim() || titleEn.trim(),
      slug: (titleEn.trim() || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescEn: descEn.trim(),
      shortDescAr: descAr.trim(),
      fullDescEn: descEn.trim(),
      fullDescAr: descAr.trim(),
      category: category || 'Cloud Systems',
      tags: editingProject?.tags || [],
      thumbnail: thumbnail.trim() || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
      status,
      isArchived: status === 'archived',
      archivedAt: status === 'archived' ? new Date().toISOString() : null,
      featured,
      projectUrl: liveUrl.trim(),
      githubUrl: editingProject?.githubUrl || '',
      client: client.trim(),
      year: '2026',
      media: mediaList.length > 0 ? mediaList : [
        {
          id: 'm1',
          type: 'image' as const,
          url: thumbnail.trim() || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
          titleEn: 'Primary Screenshot',
          titleAr: 'الصورة أو اللقطة الرئيسية'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    const payload = cleanFirestorePayload(rawPayload);

    try {
      if (editingProject) {
        try {
          await updateDoc(doc(db, 'portfolio', editingProject.id), payload);
        } catch (updateErr: any) {
          await setDoc(doc(db, 'portfolio', editingProject.id), payload, { merge: true });
        }
      } else {
        const newDocRef = doc(collection(db, 'portfolio'));
        await setDoc(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      // If user enabled notify subscribers and status is published, broadcast!
      if (notifySubscribers && status === 'published') {
        try {
          const subSnap = await getDocs(query(collection(db, 'subscribers'), where('status', '==', 'active')));
          const subsList: Array<{ email: string; language?: string }> = [];
          subSnap.forEach((d) => subsList.push(d.data() as any));
          if (subsList.length > 0) {
            const projectToBroadcast: PortfolioItem = {
              id: editingProject?.id || 'new_project',
              createdAt: editingProject?.createdAt || new Date().toISOString(),
              ...payload,
              status: 'published'
            };
            sendPortfolioBroadcastEmail(projectToBroadcast, subsList).catch((err) => {
              console.warn('Background portfolio broadcast notice:', err);
            });
          }
        } catch (subErr) {
          console.warn('Could not dispatch subscriber notification for portfolio:', subErr);
        }
      }

      setModalOpen(false);
      setNotifySubscribers(true);
      setFeedback({
        type: 'success',
        message: notifySubscribers && status === 'published'
          ? (language === 'ar' ? 'تم حفظ المشروع وإرسال إشعار للمشتركين عبر البريد الإلكتروني!' : 'Project saved and email dispatched to subscribers!')
          : (language === 'ar' ? 'تم حفظ بيانات المشروع بنجاح!' : 'Project saved successfully!')
      });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to save project in Firestore:', err);

      const isAlreadyExists = 
        err?.code === 'already-exists' || 
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('already exists'));

      if (isAlreadyExists) {
        try {
          const matchedId = err?.message?.match(/portfolio\/([a-zA-Z0-9_-]+)/)?.[1] || editingProject?.id;
          if (matchedId) {
            await setDoc(doc(db, 'portfolio', matchedId), payload, { merge: true });
            setModalOpen(false);
            setFeedback({
              type: 'success',
              message: language === 'ar' ? 'تم تحديث وحفظ بيانات المشروع بنجاح!' : 'Project updated and saved successfully!'
            });
            setTimeout(() => setFeedback(null), 3500);
            onRefresh();
            return;
          }
        } catch (recoverErr) {
          console.warn('Could not auto-recover project save:', recoverErr);
        }
      }

      setFormError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المشروع' : 'Error saving project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Soft Delete: Move Single Item to Archive ---
  const handleMoveToArchive = async (p: PortfolioItem) => {
    try {
      await updateDoc(doc(db, 'portfolio', p.id), {
        status: 'archived',
        isArchived: true,
        archivedAt: new Date().toISOString()
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل المشروع "${p.titleAr || p.titleEn}" إلى الأرشيف بنجاح (يمكن استرجاعه في أي وقت)` 
          : `Project moved to Archive successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== p.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to archive project:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء أرشفة المشروع' : 'Failed to archive project'
      });
    }
  };

  // --- Soft Delete: Bulk Move to Archive ---
  const handleBulkMoveToArchive = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'portfolio', id), {
          status: 'archived',
          isArchived: true,
          archivedAt: new Date().toISOString()
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل ${selectedIds.length} مشاريع إلى الأرشيف بنجاح` 
          : `Moved ${selectedIds.length} projects to Archive`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk archive projects:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الأرشفة الجماعية' : 'Failed to bulk archive'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Restore: Restore Single Item from Archive ---
  const handleRestoreProject = async (p: PortfolioItem) => {
    try {
      await updateDoc(doc(db, 'portfolio', p.id), {
        status: 'published',
        isArchived: false,
        archivedAt: null
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع المشروع "${p.titleAr || p.titleEn}" بنجاح إلى المعرض النشط` 
          : `Project restored to active portfolio`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== p.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to restore project:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء استرجاع المشروع' : 'Failed to restore project'
      });
    }
  };

  // --- Restore: Bulk Restore from Archive ---
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'portfolio', id), {
          status: 'published',
          isArchived: false,
          archivedAt: null
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع ${selectedIds.length} مشاريع من الأرشيف بنجاح` 
          : `Restored ${selectedIds.length} projects successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk restore projects:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الاسترجاع الجماعي' : 'Failed to bulk restore'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Permanent Delete: Single Item ---
  const confirmPermanentDeleteProject = async () => {
    if (!projectToPermanentlyDelete) return;
    setDeleteLoading(true);
    try {
      const associatedUrls = [
        projectToPermanentlyDelete.thumbnail,
        ...(projectToPermanentlyDelete.media || []).map((m: PortfolioMedia) => m.url)
      ].filter(Boolean) as string[];

      const deleteRes = await deleteDocumentRecursively('portfolio', projectToPermanentlyDelete.id, {
        subcollections: ['comments', 'media', 'ratings', 'feedback'],
        linkedCollections: [
          { collectionName: 'comments', foreignKeyField: 'projectId' },
          { collectionName: 'media', foreignKeyField: 'parentId' }
        ],
        associatedMediaUrls: associatedUrls
      });

      const totalCleaned = deleteRes.subcollectionItemsDeleted + deleteRes.linkedItemsDeleted + deleteRes.associatedMediaDeleted;
      const subInfo = totalCleaned > 0
        ? (language === 'ar' 
            ? ` (تم تنظيف ${totalCleaned} من العناصر المرتبطة)` 
            : ` (cleaned ${totalCleaned} associated assets)`)
        : '';

      setFeedback({
        type: 'success',
        message: (language === 'ar' ? 'تم الحذف النهائي للمشروع وكافة متعلقاته من قاعدة البيانات' : 'Project permanently deleted') + subInfo
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== projectToPermanentlyDelete.id));
      setProjectToPermanentlyDelete(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to permanently delete project:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي للمشروع' : 'Failed to permanently delete project'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Bulk Selected Items ---
  const confirmBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of selectedIds) {
        const item = portfolio.find(p => p.id === id);
        const associatedUrls = [
          item?.thumbnail,
          ...(item?.media || []).map((m: PortfolioMedia) => m.url)
        ].filter(Boolean) as string[];

        await deleteDocumentRecursively('portfolio', id, {
          subcollections: ['comments', 'media', 'ratings', 'feedback'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: 'projectId' },
            { collectionName: 'media', foreignKeyField: 'parentId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم حذف ${selectedIds.length} مشاريع نهائياً من قاعدة البيانات` 
          : `Permanently deleted ${selectedIds.length} projects`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowBulkPermanentDeleteModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk permanently delete:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي الجماعي' : 'Failed to bulk delete'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Empty All Archive ---
  const confirmEmptyArchive = async () => {
    if (archivedProjects.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const p of archivedProjects) {
        const associatedUrls = [
          p.thumbnail,
          ...(p.media || []).map((m: PortfolioMedia) => m.url)
        ].filter(Boolean) as string[];

        await deleteDocumentRecursively('portfolio', p.id, {
          subcollections: ['comments', 'media', 'ratings', 'feedback'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: 'projectId' },
            { collectionName: 'media', foreignKeyField: 'parentId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم تفريغ الأرشيف وحذف جميع المشاريع المؤرشفة نهائياً (${archivedProjects.length} مشاريع)` 
          : `Archive emptied successfully (${archivedProjects.length} projects deleted)`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowEmptyArchiveModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to empty archive:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تفريغ الأرشيف' : 'Failed to empty archive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Checkbox helpers
  const isAllSelected = displayedProjects.length > 0 && displayedProjects.every(p => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect only displayed ones
      const displayedIds = displayedProjects.map(p => p.id);
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      // Add all displayed ones
      const displayedIds = displayedProjects.map(p => p.id);
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

      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة معرض الأعمال والمشاريع' : 'Portfolio & Engineering Projects'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'إدارة المشاريع، ضبط التصنيفات والحالات الافتراضية، التحديد الجماعي، ونظام الأرشفة الآمن.' 
              : 'Manage showcases, taxonomies, statuses, multi-selection batch actions, and soft-delete archive.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة مشروع جديد' : 'New Project'}</span>
        </button>
      </div>

      {/* General Settings & Taxonomies Panel */}
      <AdminTaxonomyManager
        titleAr="الإعدادات العامة وتصنيفات المشاريع"
        titleEn="Portfolio Taxonomies & Default Settings"
        descriptionAr="سجّل التصنيفات والحالات الافتراضية التي تظهر تلقائياً في قائمة الاختيار عند إنشاء أي مشروع جديد دون الحاجة لفتح كل مشروع."
        descriptionEn="Manage master categories and lifecycle statuses that automatically populate in dropdowns when creating projects."
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
            <FolderGit2 className="w-4 h-4" />
            <span>{language === 'ar' ? 'المشاريع النشطة' : 'Active Projects'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {activeProjects.length}
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
              {archivedProjects.length}
            </span>
          </button>
        </div>

        {/* Empty Archive button when in archived view */}
        {activeViewTab === 'archived' && archivedProjects.length > 0 && (
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
              {language === 'ar' ? 'نظام الحفظ الآمن في الأرشيف:' : 'Archive Safety Vault:'}
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              {language === 'ar'
                ? 'جميع المشاريع الموجودة هنا محفوظة في قاعدة البيانات ولكنها غير ظاهرة لزوار الموقع. يمكنك استرجاع أي مشروع في أي وقت بنقرة زر أو حذفه نهائياً.'
                : 'All archived projects are retained safely in Firestore but hidden from public visitors. You can restore any item anytime or permanently delete it.'}
            </p>
          </div>
        </div>
      )}

      {/* Projects Table */}
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
                    disabled={displayedProjects.length === 0}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={language === 'ar' ? 'تحديد كل المعروض' : 'Select all displayed'}
                  />
                </th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المشروع' : 'Project'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الوسائط' : 'Media'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {activeViewTab === 'active' ? (
                        <>
                          <FolderGit2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد مشاريع نشطة حالياً' : 'No active projects found'}</p>
                          <button
                            onClick={handleOpenAdd}
                            className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                          >
                            + {language === 'ar' ? 'إضافة مشروع جديد' : 'Add your first project'}
                          </button>
                        </>
                      ) : (
                        <>
                          <Archive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'الأرشيف فارغ تماماً' : 'Archive is empty'}</p>
                          <p className="text-xs text-slate-400">{language === 'ar' ? 'عند حذف أي مشروع نشط سينتقل إلى هنا تلقائياً' : 'Deleted active projects will appear here'}</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProjects.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Project Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.thumbnail && p.thumbnail.trim() !== '' ? (
                            <LazyImage
                              src={p.thumbnail}
                              alt={language === 'ar' ? p.titleAr : p.titleEn}
                              className="w-12 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                              containerClassName="w-12 h-10 rounded-lg overflow-hidden shrink-0"
                              fallbackIcon={
                                <div className="w-12 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                                  <FolderGit2 className="w-5 h-5" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-12 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                              <FolderGit2 className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {language === 'ar' ? p.titleAr : p.titleEn}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {(p.tags && p.tags.length > 0) ? p.tags.join(' • ') : (language === 'ar' ? p.shortDescAr : p.shortDescEn)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                      </td>

                      {/* Media assets */}
                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="font-mono">{p.media?.length || 1} {language === 'ar' ? 'ملف/عنصر' : 'assets'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {p.isArchived || p.status === 'archived' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 w-fit">
                            <Archive className="w-3 h-3 text-amber-500" />
                            <span>{language === 'ar' ? 'مؤرشف' : 'Archived'}</span>
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'published'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {language === 'ar' ? (p.status === 'published' ? 'منشور' : 'مسودة') : p.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeViewTab === 'active' ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              {/* Soft Delete to Archive */}
                              <button
                                onClick={() => handleMoveToArchive(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'نقل إلى الأرشيف' : 'Move to Archive'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Restore from Archive */}
                              <button
                                onClick={() => handleRestoreProject(p)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'استرجاع المشروع إلى المعرض النشط' : 'Restore Project'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              {/* Permanent Delete from Archive */}
                              <button
                                onClick={() => setProjectToPermanentlyDelete(p)}
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
        totalCount={displayedProjects.length}
        isAllSelected={isAllSelected}
        onSelectAll={handleToggleSelectAll}
        onDeselectAll={() => setSelectedIds([])}
        currentTab={activeViewTab}
        itemLabelAr="مشاريع"
        itemLabelEn="projects"
        isProcessing={isBulkProcessing}
        onMoveToArchive={handleBulkMoveToArchive}
        onRestoreSelected={handleBulkRestore}
        onPermanentDeleteSelected={() => setShowBulkPermanentDeleteModal(true)}
      />

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-3xl bg-[#111216] text-white border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#0c0d10]">
              <h3 className="font-bold text-white text-base">
                {editingProject ? (language === 'ar' ? 'تعديل بيانات المشروع' : 'Edit Project Details') : (language === 'ar' ? 'إضافة مشروع جديد' : 'Create New Project')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
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
                    {language === 'ar' ? 'عنوان المشروع بالإنجليزية *' : 'English Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: Autonomous Edge AI Pipeline' : 'E.g. Autonomous Edge AI Pipeline'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'عنوان المشروع بالعربية *' : 'Arabic Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: منظومة الذكاء الاصطناعي الطرفي' : 'مثال: منظومة الذكاء الاصطناعي'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Bilingual Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'وصف المشروع بالإنجليزية *' : 'English Description *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    dir="ltr"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Detailed architecture description..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'وصف المشروع بالعربية *' : 'Arabic Description *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder={language === 'ar' ? 'شرح تفصيلي للعمل أو المشروع ومحاوره ومحتواه...' : 'Detailed description in Arabic...'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category select with dynamic options */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'التصنيف' : 'Category'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{language === 'ar' ? 'إضافة تصنيف' : 'Add Category'}</span>
                    </button>
                  </div>

                  {showAddCategory ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder={language === 'ar' ? 'اسم التصنيف الجديد...' : 'New category name...'}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newCategoryInput.trim()) {
                              setCustomCategories(prev => [...prev, newCategoryInput.trim()]);
                              setCategory(newCategoryInput.trim());
                              setNewCategoryInput('');
                              setShowAddCategory(false);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            setCustomCategories(prev => [...prev, newCategoryInput.trim()]);
                            setCategory(newCategoryInput.trim());
                            setNewCategoryInput('');
                            setShowAddCategory(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                      >
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(false)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowAddCategory(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__add_new__">+ {language === 'ar' ? 'إضافة تصنيف جديد...' : 'Add New Category...'}</option>
                    </select>
                  )}
                </div>

                {/* Status select */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'حالة النشر والعرض' : 'Publication Status'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddStatus(!showAddStatus)}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{language === 'ar' ? 'إضافة حالة' : 'Add Status'}</span>
                    </button>
                  </div>

                  {showAddStatus ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newStatusInput}
                        onChange={(e) => setNewStatusInput(e.target.value)}
                        placeholder={language === 'ar' ? 'اسم الحالة الجديدة...' : 'New status name...'}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newStatusInput.trim()) {
                              setCustomStatuses(prev => [...prev, newStatusInput.trim()]);
                              setStatus(newStatusInput.trim() as any);
                              setNewStatusInput('');
                              setShowAddStatus(false);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newStatusInput.trim()) {
                            setCustomStatuses(prev => [...prev, newStatusInput.trim()]);
                            setStatus(newStatusInput.trim() as any);
                            setNewStatusInput('');
                            setShowAddStatus(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                      >
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddStatus(false)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <select
                      value={status}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowAddStatus(true);
                        } else {
                          setStatus(e.target.value as ProjectStatus);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="published">{language === 'ar' ? 'منشور (ظاهر للجميع)' : 'Published'}</option>
                      <option value="draft">{language === 'ar' ? 'مسودة (مخفي)' : 'Draft'}</option>
                      <option value="archived">{language === 'ar' ? 'مؤرشف (في الأرشيف)' : 'Archived'}</option>
                      {customStatuses.filter(s => !['published', 'draft', 'archived'].includes(s)).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="__add_new__">+ {language === 'ar' ? 'إضافة حالة جديدة...' : 'Add Custom Status...'}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Thumbnail URL with Upload & Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'رابط صورة الغلاف أو المعاينة *' : 'Thumbnail Image URL *'}
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
                              setThumbnail(event.target.result as string);
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
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://drive.google.com/... أو رابط مباشر أو صورة Unsplash"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />

                {/* Instant Live Image Preview */}
                {thumbnail && thumbnail.trim() !== '' && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <LazyImage
                      src={thumbnail}
                      alt="Thumbnail preview"
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
                        {language === 'ar' ? 'معاينة الغلاف نشطة' : 'Live Cover Preview Active'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {thumbnail.slice(0, 50)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setThumbnail('')}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title={language === 'ar' ? 'إزالة' : 'Remove'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Project Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'رابط المشروع المباشر (إن وجد)' : 'Live Production URL'}
                </label>
                <input
                  type="text"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
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
                  <span>{language === 'ar' ? 'إرسال إشعار فوري لجميع المشتركين عبر البريد الإلكتروني عند نشر هذا العمل' : 'Send instant email notification to subscribers upon publishing this work'}</span>
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
                  <span>{isSubmitting ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ المشروع' : 'Save Project')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Single Project Permanent Delete Confirmation Modal */}
      {projectToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تأكيد الحذف النهائي من الأرشيف' : 'Confirm Permanent Deletion'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' ? 'تحذير: سيتم حذف هذا المشروع نهائياً من قاعدة البيانات مع كافة وسائطه ولا يمكن استرجاعه أبداً.' : 'Warning: This will permanently delete the project and all attached assets.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0d10] border border-neutral-800 text-xs font-mono text-neutral-300 truncate">
              {language === 'ar' ? projectToPermanentlyDelete.titleAr || projectToPermanentlyDelete.titleEn : projectToPermanentlyDelete.titleEn || projectToPermanentlyDelete.titleAr}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProjectToPermanentlyDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmPermanentDeleteProject}
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
                  {language === 'ar' ? 'حذف نهائي للمشاريع المحددة' : 'Permanently Delete Selected'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `هل أنت متأكد من الحذف النهائي لعدد (${selectedIds.length}) مشاريع من قاعدة البيانات؟ لا يمكن التراجع.` 
                    : `Permanently delete ${selectedIds.length} selected projects? This action cannot be undone.`}
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

      {/* Empty Entire Archive Confirmation Modal */}
      {showEmptyArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تفريغ أرشيف المشاريع بالكامل' : 'Empty Project Archive'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `سيتم الحذف النهائي لجميع المشاريع المؤرشفة (${archivedProjects.length} مشروع) ولن يمكن استرجاعها مطلقاً.` 
                    : `This will permanently delete all ${archivedProjects.length} archived projects and associated media.`}
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
