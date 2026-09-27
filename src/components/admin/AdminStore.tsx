import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Package, 
  Calendar, 
  X, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Tag,
  Coins,
  Eye,
  Archive,
  RotateCcw,
  AlertTriangle,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Boxes
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ProductItem, ProductType, ContentStatus, ProjectStatus, SiteSettings } from '../../types';
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
import { sendProductOfferBroadcastEmail } from '../../utils/emailService';
import { ARAB_AND_USD_CURRENCIES, formatPrice, convertCurrency } from '../../utils/currencies';
import { AdminTaxonomyManager } from './AdminTaxonomyManager';
import { AdminBulkActionBar } from './AdminBulkActionBar';
import { validateMediaLink } from '../../utils/mediaResolver';
import { LazyImage } from '../LazyImage';

export const FILE_FORMAT_GROUPS = [
  {
    id: 'docs',
    labelAr: 'مستندات وملفات رقمية',
    labelEn: 'Documents & Digital Files',
    formats: ['PDF', 'EPUB', 'MOBI', 'DOCX', 'TXT', 'PPTX']
  },
  {
    id: 'code',
    labelAr: 'حزم ومصادر وملفات رقمية مضغوطة',
    labelEn: 'Bundles & Digital Archives',
    formats: ['ZIP', 'RAR', '7Z', 'TAR.GZ', 'JSON', 'XML']
  },
  {
    id: 'video',
    labelAr: 'فيديو ومحتوى مرئي',
    labelEn: 'Video Formats',
    formats: ['MP4', 'MKV', 'MOV', 'WEBM', 'AVI']
  },
  {
    id: 'audio',
    labelAr: 'صوتيات وموسيقى وبودكاست',
    labelEn: 'Audio Formats',
    formats: ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG']
  },
  {
    id: 'design',
    labelAr: 'تصاميم وجرافيكس وقوالب',
    labelEn: 'Design & Graphics',
    formats: ['PNG', 'JPG', 'SVG', 'PSD', 'AI', 'FIG', 'EPS']
  },
  {
    id: '3d',
    labelAr: 'نماذج ثلاثية الأبعاد وهندسية',
    labelEn: '3D Models & Assets',
    formats: ['OBJ', 'FBX', 'BLEND', 'STL', 'GLTF']
  }
];

interface AdminStoreProps {
  products: ProductItem[];
  settings?: SiteSettings;
  onRefresh: () => void;
  defaultCurrency?: string;
}

export const AdminStore: React.FC<AdminStoreProps> = ({
  products,
  settings,
  onRefresh,
  defaultCurrency = 'USD'
}) => {
  const { language } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
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
  const [productToPermanentlyDelete, setProductToPermanentlyDelete] = useState<ProductItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEmptyArchiveModal, setShowEmptyArchiveModal] = useState(false);
  const [showBulkPermanentDeleteModal, setShowBulkPermanentDeleteModal] = useState(false);

  // Dynamic Product Types & Taxonomies State
  const defaultProductTypes = [
    { value: 'digital', labelAr: 'رقمي (تنزيل فوري)', labelEn: 'Digital (Instant Download)' },
    { value: 'physical', labelAr: 'فيزيائي (شحن وتوصيل)', labelEn: 'Physical (Shipped Items)' },
    { value: 'service', labelAr: 'خدمة واستشارة وتوجيه مباشر', labelEn: 'Direct Consultation & Advisory' },
  ];

  const defaultCategories = [
    'كتب وإصدارات',
    'أبحاث ودراسات',
    'مرئيات وصوتيات',
    'منتجات رقمية',
    'استشارات وجلسات',
    'Books & Publications',
    'Research & Studies',
    'Audio & Video',
    'Digital Downloads',
    'Advisory & Sessions'
  ];

  const defaultStatuses = ['published', 'draft', 'archived'];

  const [customProductTypes, setCustomProductTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_custom_types_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedProductTypes, setRemovedProductTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_removed_types_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_custom_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedCategories, setRemovedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_removed_categories_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customStatuses, setCustomStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_custom_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedStatuses, setRemovedStatuses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_store_removed_statuses_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('admin_store_custom_types_v2', JSON.stringify(customProductTypes));
  }, [customProductTypes]);

  useEffect(() => {
    localStorage.setItem('admin_store_removed_types_v2', JSON.stringify(removedProductTypes));
  }, [removedProductTypes]);

  useEffect(() => {
    localStorage.setItem('admin_store_custom_categories_v2', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('admin_store_removed_categories_v2', JSON.stringify(removedCategories));
  }, [removedCategories]);

  useEffect(() => {
    localStorage.setItem('admin_store_custom_statuses_v2', JSON.stringify(customStatuses));
  }, [customStatuses]);

  useEffect(() => {
    localStorage.setItem('admin_store_removed_statuses_v2', JSON.stringify(removedStatuses));
  }, [removedStatuses]);

  const allProductTypesList = Array.from(new Set([
    'digital',
    'physical',
    'service',
    ...products.map(p => p.type).filter(Boolean),
    ...customProductTypes
  ]))
    .filter(val => !removedProductTypes.includes(val))
    .map(val => {
      const existing = defaultProductTypes.find(t => t.value === val);
      return existing || { value: val, labelAr: val, labelEn: val };
    });

  const officialStoreCategories = settings?.storeCategories || [];
  const officialCategoryOptions = officialStoreCategories.flatMap(c => [
    c.nameAr,
    c.nameEn,
    c.slug
  ]).filter(Boolean);

  const allCategories = Array.from(new Set([
    ...officialCategoryOptions,
    ...defaultCategories,
    ...products.map(p => p.category).filter(Boolean),
    ...customCategories
  ])).filter(c => !removedCategories.includes(c));

  const allStatuses = Array.from(new Set([
    ...defaultStatuses,
    ...products.map(p => p.status).filter(Boolean),
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

  const handleAddType = (newTp: string) => {
    const clean = newTp.trim();
    setRemovedProductTypes(prev => prev.filter(t => t.toLowerCase() !== clean.toLowerCase()));
    setCustomProductTypes(prev => Array.from(new Set([...prev, clean])));
  };

  const handleRemoveType = (tpVal: string) => {
    setRemovedProductTypes(prev => Array.from(new Set([...prev, tpVal])));
    setCustomProductTypes(prev => prev.filter(t => t !== tpVal));
  };

  // Category usage count
  const categoryUsageCounts: Record<string, number> = {};
  products.forEach(p => {
    if (p.category) {
      categoryUsageCounts[p.category] = (categoryUsageCounts[p.category] || 0) + 1;
    }
  });

  // Active vs Archived product lists
  const activeProducts = products.filter(p => p.status !== 'archived' && !p.isArchived);
  const archivedProducts = products.filter(p => p.status === 'archived' || p.isArchived);
  const displayedProducts = activeViewTab === 'active' ? activeProducts : archivedProducts;

  // Form State
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [price, setPrice] = useState(49);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [type, setType] = useState<ProductType>('digital');
  const [category, setCategory] = useState(allCategories[0] || 'Digital Products');
  const [stock, setStock] = useState(50);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [sku, setSku] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [digitalFileUrl, setDigitalFileUrl] = useState('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
  
  const [fileSizeNum, setFileSizeNum] = useState<number | string>(15);
  const [fileSizeUnit, setFileSizeUnit] = useState<'KB' | 'MB' | 'GB'>('MB');
  const [fileFormat, setFileFormat] = useState('ZIP');
  const [customFileFormat, setCustomFileFormat] = useState('');

  const [enablePreviewUrl, setEnablePreviewUrl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80');
  const [status, setStatus] = useState<ProjectStatus>('published');

  const [showAddType, setShowAddType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormError(null);
    setNameEn('');
    setNameAr('');
    setDescEn('');
    setDescAr('');
    setPrice(49);
    setCurrency(defaultCurrency || 'USD');
    setType('digital');
    setShowAddType(false);
    setCategory(allCategories[0] || 'Digital Products');
    setShowAddCategory(false);
    setShowAddStatus(false);
    setStock(50);
    setLowStockThreshold(10);
    setSku(`PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    setTrackStock(true);
    setDigitalFileUrl('');
    setFileSizeNum(15);
    setFileSizeUnit('MB');
    setFileFormat('ZIP');
    setCustomFileFormat('');
    setEnablePreviewUrl(false);
    setPreviewUrl('');
    setImageUrl('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80');
    setStatus('published');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setFormError(null);
    setNameEn(p.nameEn || '');
    setNameAr(p.nameAr || '');
    setDescEn(p.descriptionEn || '');
    setDescAr(p.descriptionAr || '');
    setPrice(p.price || 0);
    setCurrency(p.currency || defaultCurrency || 'USD');
    setType(p.type || 'digital');
    setShowAddType(false);
    setCategory(p.category || allCategories[0] || 'Digital Products');
    setShowAddCategory(false);
    setShowAddStatus(false);
    const hasTrackedStock = p.type === 'physical' || (p.stock !== undefined && p.stock < 999900);
    setTrackStock(hasTrackedStock);
    setStock(p.stock !== undefined && p.stock < 999900 ? p.stock : 50);
    setLowStockThreshold(p.lowStockThreshold !== undefined ? p.lowStockThreshold : 10);
    setSku(p.sku || `PRD-${Date.now().toString(36).toUpperCase()}`);
    setDigitalFileUrl(p.digitalFileUrl || '');

    if (p.digitalFileSize) {
      const parts = p.digitalFileSize.trim().split(/\s+/);
      if (parts.length >= 1) {
        setFileSizeNum(parts[0]);
      }
      if (parts.length >= 2 && ['KB', 'MB', 'GB'].includes(parts[1].toUpperCase())) {
        setFileSizeUnit(parts[1].toUpperCase() as any);
      }
      if (parts.length >= 3) {
        const fmt = parts.slice(2).join(' ').toUpperCase();
        const allKnown = FILE_FORMAT_GROUPS.flatMap(g => g.formats);
        if (allKnown.includes(fmt)) {
          setFileFormat(fmt);
        } else {
          setFileFormat('CUSTOM');
          setCustomFileFormat(fmt);
        }
      }
    } else {
      setFileSizeNum(15);
      setFileSizeUnit('MB');
      setFileFormat('ZIP');
      setCustomFileFormat('');
    }

    setEnablePreviewUrl(Boolean(p.previewUrl));
    setPreviewUrl(p.previewUrl || '');
    setImageUrl((p.images && p.images[0]) || '');
    setStatus(p.status || 'published');
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nameEn.trim() && !nameAr.trim()) {
      setFormError(language === 'ar' ? 'يرجى إدخال اسم المنتج أو الكتاب' : 'Please enter product name');
      return;
    }

    setIsSubmitting(true);

    // Validation Layer: check product cover image
    if (imageUrl.trim()) {
      const imgCheck = await validateMediaLink(imageUrl.trim(), 'image');
      if (!imgCheck.isValid) {
        const msg = language === 'ar' 
          ? `رابط صورة غلاف المنتج غير صالح أو معطل: ${imgCheck.error || ''}` 
          : `Product cover image link is broken or unreachable: ${imgCheck.error || ''}`;
        setFormError(msg);
        setFeedback({ type: 'error', message: msg });
        setIsSubmitting(false);
        return;
      }
    }

    // Validation Layer: check digital file URL if digital product
    if (type === 'digital' && digitalFileUrl.trim()) {
      const fileCheck = await validateMediaLink(digitalFileUrl.trim(), 'any' as any);
      if (!fileCheck.isValid) {
        const msg = language === 'ar'
          ? `رابط الملف الرقمي المرفق غير صالح أو لا يعمل: ${fileCheck.error || ''}`
          : `Digital file link is invalid or unreachable: ${fileCheck.error || ''}`;
        setFormError(msg);
        setFeedback({ type: 'error', message: msg });
        setIsSubmitting(false);
        return;
      }
    }

    // Validation Layer: check sample preview link if enabled
    if (enablePreviewUrl && previewUrl.trim()) {
      const prevCheck = await validateMediaLink(previewUrl.trim(), 'any' as any);
      if (!prevCheck.isValid) {
        const msg = language === 'ar'
          ? `رابط المعاينة والتجربة غير صالح أو معطل: ${prevCheck.error || ''}`
          : `Sample preview link is broken: ${prevCheck.error || ''}`;
        setFormError(msg);
        setFeedback({ type: 'error', message: msg });
        setIsSubmitting(false);
        return;
      }
    }

    const finalFormat = fileFormat === 'CUSTOM' ? (customFileFormat.trim().toUpperCase() || 'FILE') : fileFormat;
    const finalFileSize = type === 'digital' && fileSizeNum ? `${fileSizeNum} ${fileSizeUnit} ${finalFormat}` : '';
    const autoSku = sku.trim() || editingProduct?.sku || `PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const finalStock = Math.max(0, Number(stock) || 0);

    const rawPayload = {
      nameEn: nameEn.trim() || nameAr.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      descriptionEn: descEn.trim(),
      descriptionAr: descAr.trim(),
      price: Number(price) || 0,
      compareAtPrice: 0,
      currency: currency || 'USD',
      type: type || 'digital',
      category: category || 'Digital Products',
      images: [imageUrl.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'],
      stock: finalStock,
      lowStockThreshold: Number(lowStockThreshold) || 10,
      sku: autoSku,
      previewUrl: enablePreviewUrl ? previewUrl.trim() : '',
      digitalFileUrl: type === 'digital' ? digitalFileUrl.trim() : '',
      digitalFileSize: finalFileSize,
      status,
      isArchived: status === 'archived',
      archivedAt: status === 'archived' ? new Date().toISOString() : null,
      featured: true,
      updatedAt: new Date().toISOString()
    };

    const payload = cleanFirestorePayload(rawPayload);

    try {
      if (editingProduct) {
        try {
          await updateDoc(doc(db, 'products', editingProduct.id), payload);
        } catch (updateErr: any) {
          await setDoc(doc(db, 'products', editingProduct.id), payload, { merge: true });
        }

        // If stock level changed, record audit transaction in inventoryTransactions
        if (editingProduct.stock !== finalStock) {
          const delta = finalStock - (editingProduct.stock || 0);
          await addDoc(collection(db, 'inventoryTransactions'), cleanFirestorePayload({
            productId: editingProduct.id,
            productName: rawPayload.nameAr || rawPayload.nameEn || 'Product',
            type: delta >= 0 ? 'restock' : 'adjustment',
            quantity: delta,
            previousStock: editingProduct.stock || 0,
            newStock: finalStock,
            reason: language === 'ar' ? 'تعديل رصيد المخزون من لوحة إدارة المتجر' : 'Stock level adjusted in Store management',
            createdAt: new Date().toISOString()
          }));
        }
      } else {
        const docRef = doc(collection(db, 'products'));
        await setDoc(docRef, {
          ...payload,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Record opening stock batch in inventory transactions
        if (finalStock > 0) {
          await addDoc(collection(db, 'inventoryTransactions'), cleanFirestorePayload({
            productId: docRef.id,
            productName: rawPayload.nameAr || rawPayload.nameEn || 'Product',
            type: 'in',
            quantity: finalStock,
            previousStock: 0,
            newStock: finalStock,
            reason: language === 'ar' ? 'توريد رصيد افتتاحي عند إنشاء المنتج' : 'Opening stock upon creation',
            createdAt: new Date().toISOString()
          }));
        }
      }

      // If user checked notify subscribers and status is published, broadcast offer email!
      if (notifySubscribers && status === 'published') {
        try {
          const subSnap = await getDocs(query(collection(db, 'subscribers'), where('status', '==', 'active')));
          const subsList: Array<{ email: string; language?: string }> = [];
          subSnap.forEach((d) => subsList.push(d.data() as any));
          if (subsList.length > 0) {
            const productToBroadcast: ProductItem = {
              id: editingProduct?.id || 'new_product',
              slug: (nameEn || nameAr).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              createdAt: editingProduct?.createdAt || new Date().toISOString(),
              ...rawPayload,
              status: 'published' as ContentStatus
            };
            sendProductOfferBroadcastEmail(productToBroadcast, subsList, settings).catch((err) => {
              console.warn('Background product offer broadcast notice:', err);
            });
          }
        } catch (subErr) {
          console.warn('Could not dispatch subscriber notification for store:', subErr);
        }
      }

      setModalOpen(false);
      setNotifySubscribers(true);
      setFeedback({
        type: 'success',
        message: notifySubscribers && status === 'published'
          ? (language === 'ar' ? 'تم حفظ المنتج وإرسال إشعار للمشتركين عبر البريد الإلكتروني!' : 'Product saved and email dispatched to subscribers!')
          : (language === 'ar' ? 'تم حفظ المنتج بنجاح!' : 'Product saved successfully!')
      });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to save product in Firestore:', err);

      const isAlreadyExists = 
        err?.code === 'already-exists' || 
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('already exists'));

      if (isAlreadyExists) {
        try {
          const matchedId = err?.message?.match(/products\/([a-zA-Z0-9_-]+)/)?.[1] || editingProduct?.id;
          if (matchedId) {
            await setDoc(doc(db, 'products', matchedId), payload, { merge: true });
            setModalOpen(false);
            setFeedback({
              type: 'success',
              message: language === 'ar' ? 'تم تحديث وحفظ بيانات المنتج بنجاح!' : 'Product updated and saved successfully!'
            });
            setTimeout(() => setFeedback(null), 3500);
            onRefresh();
            return;
          }
        } catch (recoverErr) {
          console.warn('Could not auto-recover product save:', recoverErr);
        }
      }

      setFormError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المنتج' : 'Error saving product'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Soft Delete: Move Single Product to Archive ---
  const handleMoveToArchive = async (prod: ProductItem) => {
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        status: 'archived',
        isArchived: true,
        archivedAt: new Date().toISOString()
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل "${prod.nameAr || prod.nameEn}" إلى الأرشيف بنجاح (يمكن استرجاعه في أي وقت)` 
          : `Product moved to Archive successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== prod.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to archive product:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء نقل المنتج للأرشيف' : 'Failed to archive product'
      });
    }
  };

  // --- Soft Delete: Bulk Move to Archive ---
  const handleBulkMoveToArchive = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'products', id), {
          status: 'archived',
          isArchived: true,
          archivedAt: new Date().toISOString()
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم نقل ${selectedIds.length} عناصر إلى الأرشيف بنجاح` 
          : `Moved ${selectedIds.length} products to Archive`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk archive products:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الأرشفة الجماعية' : 'Failed to bulk archive'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Restore: Single Product from Archive ---
  const handleRestoreProduct = async (prod: ProductItem) => {
    try {
      await updateDoc(doc(db, 'products', prod.id), {
        status: 'published',
        isArchived: false,
        archivedAt: null
      });
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع "${prod.nameAr || prod.nameEn}" بنجاح إلى المتجر النشط` 
          : `Product restored to active store`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== prod.id));
      onRefresh();
    } catch (err: any) {
      console.error('Failed to restore product:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء استرجاع المنتج' : 'Failed to restore product'
      });
    }
  };

  // --- Restore: Bulk Restore Products ---
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'products', id), {
          status: 'published',
          isArchived: false,
          archivedAt: null
        });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم استرجاع ${selectedIds.length} عناصر من الأرشيف بنجاح` 
          : `Restored ${selectedIds.length} items successfully`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk restore products:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'حدث خطأ أثناء الاسترجاع الجماعي' : 'Failed to bulk restore'
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- Permanent Delete: Single Product ---
  const confirmPermanentDeleteProduct = async () => {
    if (!productToPermanentlyDelete) return;
    setDeleteLoading(true);
    try {
      const associatedUrls = [
        ...(productToPermanentlyDelete.images || [])
      ].filter(Boolean) as string[];

      const deleteRes = await deleteDocumentRecursively('products', productToPermanentlyDelete.id, {
        subcollections: ['reviews', 'ratings', 'questions', 'downloads'],
        linkedCollections: [
          { collectionName: 'inventoryTransactions', foreignKeyField: 'productId' },
          { collectionName: 'comments', foreignKeyField: 'productId' }
        ],
        associatedMediaUrls: associatedUrls
      });

      const totalCleaned = deleteRes.subcollectionItemsDeleted + deleteRes.linkedItemsDeleted + deleteRes.associatedMediaDeleted;
      const subInfo = totalCleaned > 0
        ? (language === 'ar' 
            ? ` (تم تنظيف ${totalCleaned} من سجلات المخزون والوسائط)` 
            : ` (cleaned ${totalCleaned} inventory logs & media)`)
        : '';

      setFeedback({
        type: 'success',
        message: (language === 'ar' ? 'تم الحذف النهائي للمنتج وسجلاته بنجاح' : 'Product permanently deleted') + subInfo
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds(prev => prev.filter(id => id !== productToPermanentlyDelete.id));
      setProductToPermanentlyDelete(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to permanently delete product:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي للمنتج' : 'Failed to permanently delete product'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Bulk Selected Products ---
  const confirmBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const id of selectedIds) {
        const item = products.find(p => p.id === id);
        const associatedUrls = [...(item?.images || [])].filter(Boolean) as string[];

        await deleteDocumentRecursively('products', id, {
          subcollections: ['reviews', 'ratings', 'questions', 'downloads'],
          linkedCollections: [
            { collectionName: 'inventoryTransactions', foreignKeyField: 'productId' },
            { collectionName: 'comments', foreignKeyField: 'productId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم حذف ${selectedIds.length} عناصر نهائياً من قاعدة البيانات` 
          : `Permanently deleted ${selectedIds.length} products`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowBulkPermanentDeleteModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to bulk delete products:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل الحذف النهائي الجماعي' : 'Failed to bulk delete'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Permanent Delete: Empty Entire Archive ---
  const confirmEmptyArchive = async () => {
    if (archivedProducts.length === 0) return;
    setDeleteLoading(true);
    try {
      for (const prod of archivedProducts) {
        const associatedUrls = [...(prod.images || [])].filter(Boolean) as string[];

        await deleteDocumentRecursively('products', prod.id, {
          subcollections: ['reviews', 'ratings', 'questions', 'downloads'],
          linkedCollections: [
            { collectionName: 'inventoryTransactions', foreignKeyField: 'productId' },
            { collectionName: 'comments', foreignKeyField: 'productId' }
          ],
          associatedMediaUrls: associatedUrls
        });
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم تفريغ الأرشيف وحذف جميع المنتجات المؤرشفة (${archivedProducts.length} عنصر)` 
          : `Archive emptied successfully (${archivedProducts.length} items deleted)`
      });
      setTimeout(() => setFeedback(null), 4000);
      setSelectedIds([]);
      setShowEmptyArchiveModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to empty store archive:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تفريغ الأرشيف' : 'Failed to empty archive'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Checkbox helpers
  const isAllSelected = displayedProducts.length > 0 && displayedProducts.every(p => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const displayedIds = displayedProducts.map(p => p.id);
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      const displayedIds = displayedProducts.map(p => p.id);
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
            <ShoppingBag className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة المتجر والمنتجات' : 'Store & Products Catalog'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'إدارة المنتجات، ضبط التصنيفات والأنواع الافتراضية، التحديد الجماعي، ونظام الأرشفة الآمن.' 
              : 'Manage products, master taxonomies, modalities, multi-selection actions, and soft-delete archive.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة منتج جديد' : 'New Product'}</span>
        </button>
      </div>

      {/* General Settings & Taxonomies Panel */}
      <AdminTaxonomyManager
        titleAr="الإعدادات العامة وتصنيفات المتجر والمنتجات"
        titleEn="Store Taxonomies & Default Settings"
        descriptionAr="حدد التصنيفات، أنواع المنتجات، وحالات العرض المتاحة التي تظهر تلقائياً عند إضافة منتج جديد."
        descriptionEn="Manage master categories, product types, and visibility states automatically populated in creation forms."
        categories={allCategories}
        defaultCategories={defaultCategories}
        onAddCategory={handleAddCategory}
        onRemoveCategory={handleRemoveCategory}
        statuses={allStatuses}
        defaultStatuses={defaultStatuses}
        onAddStatus={handleAddStatus}
        onRemoveStatus={handleRemoveStatus}
        types={allProductTypesList}
        onAddType={handleAddType}
        onRemoveType={handleRemoveType}
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
            <ShoppingBag className="w-4 h-4" />
            <span>{language === 'ar' ? 'المنتجات النشطة' : 'Active Products'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeViewTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {activeProducts.length}
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
              {archivedProducts.length}
            </span>
          </button>
        </div>

        {activeViewTab === 'archived' && archivedProducts.length > 0 && (
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
              {language === 'ar' ? 'أرشيف المحذوفات الآمن:' : 'Archive Safe Vault:'}
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              {language === 'ar'
                ? 'جميع المنتجات والعناصر هنا محفوظة في قاعدة البيانات ولكنها غير ظاهرة لزوار المتجر. يمكنك استرجاع أي عنصر بنقرة زر أو حذفه نهائياً.'
                : 'All archived items are retained safely in Firestore and hidden from shoppers. You can restore any item or permanently delete it.'}
            </p>
          </div>
        </div>
      )}

      {/* Products Table */}
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
                    disabled={displayedProducts.length === 0}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title={language === 'ar' ? 'تحديد كل المعروض' : 'Select all displayed'}
                  />
                </th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'النوع والتصنيف' : 'Type & Category'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'السعر' : 'Price'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {activeViewTab === 'active' ? (
                        <>
                          <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد منتجات نشطة حالياً' : 'No active products'}</p>
                          <button
                            onClick={handleOpenAdd}
                            className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                          >
                            + {language === 'ar' ? 'إضافة منتج جديد' : 'Add your first product'}
                          </button>
                        </>
                      ) : (
                        <>
                          <Archive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium">{language === 'ar' ? 'أرشيف المتجر فارغ تماماً' : 'Store archive is empty'}</p>
                          <p className="text-xs text-slate-400">{language === 'ar' ? 'العناصر المحذوفة من المتجر ستظهر هنا' : 'Deleted products will appear here'}</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((prod) => {
                  const isSelected = selectedIds.includes(prod.id);
                  return (
                    <tr 
                      key={prod.id} 
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
                          onChange={() => handleToggleSelect(prod.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.images && prod.images[0] && prod.images[0].trim() !== '' ? (
                            <LazyImage
                              src={prod.images[0]}
                              alt={language === 'ar' ? prod.nameAr : prod.nameEn}
                              className="w-11 h-11 rounded-lg object-cover bg-slate-950 shrink-0"
                              containerClassName="w-11 h-11 rounded-lg overflow-hidden shrink-0"
                              fallbackIcon={
                                <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-white/30 shrink-0">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {language === 'ar' ? prod.nameAr : prod.nameEn}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              SKU: {prod.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block">
                            {language === 'ar' ? (prod.type === 'digital' ? 'رقمي' : prod.type === 'physical' ? 'فيزيائي' : 'خدمة') : prod.type}
                          </span>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">{prod.category}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {formatPrice(prod.price, prod.currency || defaultCurrency || 'USD', language)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs inline-flex items-center gap-1.5 w-fit shadow-xs ${
                            (prod.stock || 0) <= 0
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : (prod.stock || 0) <= (prod.lowStockThreshold || 10)
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            <Boxes className="w-3.5 h-3.5" />
                            <span>{prod.stock || 0} {language === 'ar' ? 'بالمخزن' : 'in warehouse'}</span>
                          </span>
                          {(prod.stock || 0) <= 0 ? (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                              <span>⚠️ {language === 'ar' ? 'نفد (يظهر غير متوفر بالمتجر)' : 'Out of Stock on Store'}</span>
                            </span>
                          ) : (prod.stock || 0) <= (prod.lowStockThreshold || 10) ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <span>⚡ {language === 'ar' ? `قارب على النفاد (الحد: ${prod.lowStockThreshold || 10})` : `Low stock (<${prod.lowStockThreshold || 10})`}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span>✓ {language === 'ar' ? 'متاح للشراء بالمتجر' : 'Available for purchase'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {prod.isArchived || prod.status === 'archived' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1 w-fit">
                            <Archive className="w-3 h-3 text-amber-500" />
                            <span>{language === 'ar' ? 'مؤرشف' : 'Archived'}</span>
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            prod.status === 'published'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {language === 'ar' ? (prod.status === 'published' ? 'منشور' : 'مسودة') : prod.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeViewTab === 'active' ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'تعديل المنتج' : 'Edit Product'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveToArchive(prod)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'نقل إلى الأرشيف' : 'Move to Archive'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestoreProduct(prod)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'استرجاع إلى المتجر النشط' : 'Restore Product'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setProductToPermanentlyDelete(prod)}
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
        totalCount={displayedProducts.length}
        isAllSelected={isAllSelected}
        onSelectAll={handleToggleSelectAll}
        onDeselectAll={() => setSelectedIds([])}
        currentTab={activeViewTab}
        itemLabelAr="منتجات / كتب"
        itemLabelEn="products / books"
        isProcessing={isBulkProcessing}
        onMoveToArchive={handleBulkMoveToArchive}
        onRestoreSelected={handleBulkRestore}
        onPermanentDeleteSelected={() => setShowBulkPermanentDeleteModal(true)}
      />

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-3xl bg-[#111216] text-white border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#0c0d10]">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? (language === 'ar' ? 'تعديل بيانات المنتج أو الكتاب' : 'Edit Product Details') : (language === 'ar' ? 'إضافة كتاب أو منتج جديد' : 'Create New Product')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Bilingual Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'اسم المنتج بالإنجليزية *' : 'English Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="E.g. Distributed Consensus Guide"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'اسم المنتج بالعربية *' : 'Arabic Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: دليل الإجماع الموزع وهندسة الأنظمة"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Bilingual Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'وصف المنتج بالإنجليزية' : 'English Description'}
                  </label>
                  <textarea
                    rows={3}
                    dir="ltr"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Technical overview, syllabus, deliverables..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'وصف المنتج بالعربية' : 'Arabic Description'}
                  </label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="تفاصيل المحتوى والمخرجات وما سيحصل عليه المشتري..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>

              {/* Price, Currency, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'السعر *' : 'Price *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  {price > 0 && currency !== 'USD' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                      ≈ ${convertCurrency(price, 'USD', undefined, currency).toFixed(2)} USD (سعر الصرف البنكي المباشر)
                    </span>
                  )}
                  {price > 0 && currency === 'USD' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                      ≈ {convertCurrency(price, 'EGP', undefined, 'USD').toFixed(1)} ج.م (سعر الصرف البنكي المباشر)
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'العملة' : 'Currency'}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono cursor-pointer"
                  >
                    {ARAB_AND_USD_CURRENCIES.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} ({language === 'ar' ? curr.nameAr : curr.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نوع المنتج' : 'Product Modality'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductType)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {allProductTypesList.map(tp => (
                      <option key={tp.value} value={tp.value}>
                        {language === 'ar' ? tp.labelAr : tp.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {officialStoreCategories.length > 0 && (
                      <optgroup label={language === 'ar' ? '⭐ أقسام وتصنيفات المتجر المعتمدة' : '⭐ Official Store Categories'}>
                        {officialStoreCategories.map(cat => (
                          <option key={cat.id} value={cat.nameAr}>
                            {cat.nameAr} ({cat.slug}) {cat.enabledOnHome !== false ? (language === 'ar' ? '• معروض بالرئيسية' : '• On Home') : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label={language === 'ar' ? 'تصنيفات وقوائم أخرى' : 'Other Categories'}>
                      {allCategories
                        .filter(c => !officialStoreCategories.some(oc => oc.nameAr === c))
                        .map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'حالة النشر والعرض' : 'Publication Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="published">{language === 'ar' ? 'منشور (ظاهر في المتجر)' : 'Published'}</option>
                    <option value="draft">{language === 'ar' ? 'مسودة (مخفي)' : 'Draft'}</option>
                    <option value="archived">{language === 'ar' ? 'مؤرشف (في الأرشيف)' : 'Archived'}</option>
                    {customStatuses.filter(s => !['published', 'draft', 'archived'].includes(s)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inventory & Stock Tracking Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171922] border border-slate-200 dark:border-neutral-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    <span>{language === 'ar' ? 'الربط المباشر مع المخزن والمستودع' : 'Direct Warehouse & Inventory Link'}</span>
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded">
                    {language === 'ar' ? '✓ مربوط آلياً بالمخزن' : '✓ Linked to Inventory'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                  {language === 'ar'
                    ? 'أي منتج يتم إضافته أو تعديله هنا يظهر تلقائياً في شاشة (المخازن والمستودع) لتوريد كميات إضافية وتتبع حركته. يتم خصم الرصيد تلقائياً مع كل عملية شراء ناجحة في المتجر.'
                    : 'Any product saved here automatically appears in Warehouse Inventory to restock quantities. Quantities deduct automatically on purchase.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'الكمية المتوفرة بالمخزن *' : 'Current Warehouse Stock *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white font-mono font-bold"
                      placeholder="50"
                    />
                    <div className="flex items-center gap-1 pt-0.5">
                      {[0, 10, 25, 50, 100].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setStock(amt)}
                          className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'حد إنذار النواقص' : 'Alert Threshold'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white font-mono"
                      placeholder="10"
                    />
                    <p className="text-[10px] text-slate-400">
                      {language === 'ar' ? 'تنبيه عند وصول الرصيد لهذا الحد' : 'Alerts when stock reaches this limit'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {language === 'ar' ? 'كود المخزن (SKU)' : 'SKU Code'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setSku(`PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'توليد تلقائي' : 'Auto'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="PRD-ITEM-001"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Digital download file details */}
              {type === 'digital' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171922] border border-slate-200 dark:border-neutral-700/80 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إعدادات الملف الرقمي (اختياري)' : 'Digital File Settings (Optional)'}</span>
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-700 dark:text-neutral-300">
                      {language === 'ar' ? 'رابط الملف الرقمي (اختياري - يمكنك تركه فارغاً)' : 'Direct File URL (Optional - can be left empty)'}
                    </label>
                    <input
                      type="text"
                      value={digitalFileUrl}
                      onChange={(e) => setDigitalFileUrl(e.target.value)}
                      placeholder={language === 'ar' ? 'اختياري: اتركه فارغاً إذا كنت ستسلمه للمشتري بعد تأكيد الدفع والإيصال' : 'Optional: Leave empty for manual delivery upon order confirmation'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white font-mono"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      {language === 'ar' 
                        ? '💡 ملاحظة: إذا تركت الرابط فارغاً، سيظهر المنتج للزوار باسمه وصورته وسعره فقط للشراء دون أي رابط تحميل عام. وعند إتمام الشراء ومراجعة إيصال الدفع يتم تسليم المنتج للمشتري.'
                        : '💡 Note: Leaving this empty keeps the digital file private. Customers will buy based on name, cover, and price, and receive the file after payment verification.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Product Image URL with Upload & Instant Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'رابط صورة المنتج *' : 'Product Image URL *'}
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
                              setImageUrl(event.target.result as string);
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
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://drive.google.com/... أو رابط مباشر أو صورة Unsplash"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />

                {/* Instant Live Image Preview */}
                {imageUrl && imageUrl.trim() !== '' && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <LazyImage
                      src={imageUrl}
                      alt="Product preview"
                      className="w-16 h-16 rounded-lg object-cover bg-slate-950 shrink-0"
                      containerClassName="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600"
                      fallbackIcon={
                        <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-white/40 shrink-0">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {language === 'ar' ? 'معاينة صورة المنتج نشطة' : 'Live Product Image Preview Active'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {imageUrl.slice(0, 50)}...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title={language === 'ar' ? 'إزالة' : 'Remove'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                  <span>{language === 'ar' ? 'إرسال إشعار فوري لجميع المشتركين عبر البريد الإلكتروني بهذا العرض/المنتج عند النشر' : 'Send instant email notification to subscribers upon publishing this deal/product'}</span>
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
                  <span>{isSubmitting ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ المنتج' : 'Save Product')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Single Product Permanent Delete Confirmation Modal */}
      {productToPermanentlyDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-[#111216] border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-800/50">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تأكيد الحذف النهائي للمنتج' : 'Confirm Permanent Deletion'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' ? 'تحذير: سيتم حذف هذا المنتج وسجلاته نهائياً من قاعدة البيانات ولا يمكن استرجاعه.' : 'Warning: This will permanently remove the product and all associated records.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c0d10] border border-neutral-800 text-xs font-mono text-neutral-300 truncate">
              {language === 'ar' ? productToPermanentlyDelete.nameAr || productToPermanentlyDelete.nameEn : productToPermanentlyDelete.nameEn || productToPermanentlyDelete.nameAr}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProductToPermanentlyDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmPermanentDeleteProduct}
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
                  {language === 'ar' ? 'حذف نهائي للعناصر المحددة' : 'Permanently Delete Selected'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `هل أنت متأكد من الحذف النهائي لعدد (${selectedIds.length}) منتجات من قاعدة البيانات؟ لا يمكن التراجع.` 
                    : `Permanently delete ${selectedIds.length} selected items? This action cannot be undone.`}
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
                  {language === 'ar' ? 'تفريغ أرشيف المتجر بالكامل' : 'Empty Store Archive'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {language === 'ar' 
                    ? `سيتم الحذف النهائي لجميع المنتجات المؤرشفة (${archivedProducts.length} عنصر) ولن يمكن استرجاعها مطلقاً.` 
                    : `This will permanently delete all ${archivedProducts.length} archived products.`}
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
