import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  AlertCircle, 
  X, 
  Image as ImageIcon, 
  UserCheck, 
  Globe, 
  Plus, 
  Trash2, 
  BookOpen, 
  Library, 
  Video, 
  GraduationCap, 
  FileText, 
  Search, 
  Bookmark, 
  Feather, 
  Scroll, 
  Film, 
  Mic, 
  Newspaper, 
  Lightbulb, 
  Compass, 
  Quote, 
  Share2, 
  Sliders, 
  LayoutGrid, 
  ExternalLink,
  Award,
  Cpu,
  ShieldCheck,
  Code2,
  Terminal,
  Lock,
  Zap,
  Server,
  Database,
  Workflow,
  ShoppingBag,
  BarChart3,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Tag,
  Package,
  GripVertical,
  PaintBucket,
  Check,
  Move,
  SplitSquareHorizontal
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  SiteSettings, 
  HomeSectionItem, 
  AboutFeaturePoint, 
  AboutPrinciple,
  HeroFloatingBadge,
  CustomSocialLink,
  ContentCardItem,
  SectionVisibilitySettings,
  StatsItem,
  StoreCategoryItem,
  ProductItem,
  SectionBackgroundVariant,
  SectionDividerStyle,
  SectionDividersConfig
} from '../../types';
import { productMatchesCategory, getProductsForCategory } from '../../utils/categoryMatching';
import { db, cleanFirestorePayload, defaultHomeSections, defaultSiteSettings, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RichTextMarkdownEditor } from './RichTextMarkdownEditor';
import { ImageUploadField } from './ImageUploadField';
import { SectionDivider } from '../SectionDivider';

const getVariantColorSwatch = (variant?: SectionBackgroundVariant, customColor?: string) => {
  switch (variant) {
    case 'muted': return '#94a3b8';
    case 'subtle': return '#10b981';
    case 'card': return '#64748b';
    case 'dark': return '#0f172a';
    case 'warm': return '#f59e0b';
    case 'primary': return '#059669';
    case 'custom': return customColor || '#3b82f6';
    case 'default':
    default:
      return '#e2e8f0';
  }
};

const getVariantLabel = (variant?: SectionBackgroundVariant, lang: string = 'ar') => {
  switch (variant) {
    case 'muted': return lang === 'ar' ? 'رمادي هادئ' : 'Muted Slate';
    case 'subtle': return lang === 'ar' ? 'لمسة زمردية' : 'Subtle Emerald';
    case 'card': return lang === 'ar' ? 'رمادي كروتي' : 'Card Slate';
    case 'dark': return lang === 'ar' ? 'كتلة داكنة' : 'Deep Contrast';
    case 'warm': return lang === 'ar' ? 'أوف وايت دافئ' : 'Warm Sand';
    case 'primary': return lang === 'ar' ? 'زمردي ملكي' : 'Royal Emerald';
    case 'custom': return lang === 'ar' ? 'لون مخصص' : 'Custom Color';
    case 'default':
    default:
      return lang === 'ar' ? 'افتراضي' : 'Default';
  }
};

export interface AdminContentCMSProps {
  sections?: HomeSectionItem[];
  onUpdateSections?: (sections: HomeSectionItem[]) => void;
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  products?: ProductItem[];
}

type CMSTab = 'identity' | 'heroBadges' | 'stats' | 'storeCategories' | 'about' | 'contentCards' | 'visibility' | 'social' | 'footer';

export const AdminContentCMS: React.FC<AdminContentCMSProps> = ({
  sections,
  onUpdateSections,
  settings,
  onUpdateSettings,
  products = []
}) => {
  const { language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<CMSTab>('identity');
  const [formData, setFormData] = useState<SiteSettings>(settings || defaultSiteSettings);
  const [sectionsList, setSectionsList] = useState<HomeSectionItem[]>(
    sections && sections.length > 0 ? sections : defaultHomeSections
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isAutoSavingOrder, setIsAutoSavingOrder] = useState(false);

  // Synchronize when incoming props change
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (sections && sections.length > 0) {
      setSectionsList(sections);
    }
  }, [sections]);

  // Section List Reorder, Toggle & Field Updates
  const toggleSection = (id: string) => {
    const updated = (sectionsList || []).map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSectionsList(updated);
  };

  const updateSectionField = (id: string, field: keyof HomeSectionItem, value: any) => {
    setSectionsList(prev => (prev || []).map(s => s.id === id ? { ...s, [field]: value } : s));

    // Two-way synchronization with formData so editing section titles updates both models
    const targetSec = (sectionsList || []).find(s => s.id === id);
    const secKey = targetSec?.sectionKey;

    if (secKey === 'about' || id === 'sec-about') {
      if (field === 'titleAr') {
        setFormData(prev => ({
          ...prev,
          aboutHeadingAr: value,
          navigation: (prev.navigation || []).map(item => 
            (item.href === '#about' || item.id === 'about' || item.id === '1') ? { ...item, labelAr: value } : item
          )
        }));
      }
      if (field === 'titleEn') {
        setFormData(prev => ({
          ...prev,
          aboutHeadingEn: value,
          navigation: (prev.navigation || []).map(item => 
            (item.href === '#about' || item.id === 'about' || item.id === '1') ? { ...item, labelEn: value } : item
          )
        }));
      }
      if (field === 'badgeAr') setFormData(prev => ({ ...prev, aboutBadgeAr: value }));
      if (field === 'badgeEn') setFormData(prev => ({ ...prev, aboutBadgeEn: value }));
      if (field === 'subtitleAr') setFormData(prev => ({ ...prev, aboutSubAr: value }));
      if (field === 'subtitleEn') setFormData(prev => ({ ...prev, aboutSubEn: value }));
    } else if (secKey === 'contentCards' || secKey === 'content-cards' || id === 'sec-content-cards') {
      if (field === 'titleAr') setFormData(prev => ({ ...prev, contentCardsTitleAr: value }));
      if (field === 'titleEn') setFormData(prev => ({ ...prev, contentCardsTitleEn: value }));
      if (field === 'badgeAr') setFormData(prev => ({ ...prev, contentCardsBadgeAr: value }));
      if (field === 'badgeEn') setFormData(prev => ({ ...prev, contentCardsBadgeEn: value }));
      if (field === 'subtitleAr') setFormData(prev => ({ ...prev, contentCardsSubAr: value }));
      if (field === 'subtitleEn') setFormData(prev => ({ ...prev, contentCardsSubEn: value }));
    }
  };

  // Auto-save section order sequence to Firestore
  const autoSaveSectionOrder = async (updatedList: HomeSectionItem[]) => {
    setIsAutoSavingOrder(true);
    try {
      for (const sec of updatedList) {
        const secRef = doc(db, 'homeSections', sec.id);
        const payloadSec = cleanFirestorePayload(sec);
        await setDoc(secRef, payloadSec, { merge: true });
      }
      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? 'تم حفظ تسلسل وترتيب الأقسام الجديد تلقائياً في قاعدة البيانات!'
          : 'Section sequence reordered & saved automatically in Firestore!'
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to auto-save section order:', err);
    } finally {
      setIsAutoSavingOrder(false);
    }
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const list = [...(sectionsList || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((s, i) => ({ ...s, order: i + 1 }));
    setSectionsList(reordered);
    if (onUpdateSections) onUpdateSections(reordered);
    autoSaveSectionOrder(reordered);
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Keep active hover state
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const list = [...(sectionsList || [])];
    const [draggedItem] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);

    const reordered = list.map((s, i) => ({ ...s, order: i + 1 }));
    setSectionsList(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (onUpdateSections) onUpdateSections(reordered);
    autoSaveSectionOrder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Section Visibility Matrix Helper
  const handleToggleVisibility = (key: keyof SectionVisibilitySettings) => {
    const currentVis = formData.sectionVisibility || defaultSiteSettings.sectionVisibility || {};
    const updated = {
      ...currentVis,
      [key]: currentVis[key] === undefined ? false : !currentVis[key]
    };
    setFormData({ ...formData, sectionVisibility: updated });
  };

  // Feature Checklist Helpers
  const handleAddFeature = () => {
    const newFeat: AboutFeaturePoint = {
      id: 'f_' + Date.now(),
      textAr: language === 'ar' ? 'ميزة وقيمة مضافة جديدة' : 'New Key Capability or Feature',
      textEn: 'New Key Capability or Feature'
    };
    const currentFeatures = formData.aboutFeatures && formData.aboutFeatures.length > 0 
      ? formData.aboutFeatures 
      : defaultSiteSettings.aboutFeatures || [];
    setFormData({ ...formData, aboutFeatures: [...currentFeatures, newFeat] });
  };

  const handleUpdateFeature = (id: string, field: 'textAr' | 'textEn', val: string) => {
    const currentFeatures = formData.aboutFeatures && formData.aboutFeatures.length > 0 
      ? formData.aboutFeatures 
      : defaultSiteSettings.aboutFeatures || [];
    const updated = currentFeatures.map(f => f.id === id ? { ...f, [field]: val } : f);
    setFormData({ ...formData, aboutFeatures: updated });
  };

  const handleRemoveFeature = (id: string) => {
    const currentFeatures = formData.aboutFeatures && formData.aboutFeatures.length > 0 
      ? formData.aboutFeatures 
      : defaultSiteSettings.aboutFeatures || [];
    const updated = currentFeatures.filter(f => f.id !== id);
    setFormData({ ...formData, aboutFeatures: updated });
  };

  // Principles Cards Helpers
  const handleAddPrinciple = () => {
    const newPrinciple: AboutPrinciple = {
      id: 'p_' + Date.now(),
      iconName: 'Sparkles',
      titleAr: language === 'ar' ? 'مبدأ أو قيمة جديدة' : 'New Core Principle',
      titleEn: 'New Core Principle',
      descAr: language === 'ar' ? 'وصف تفصيلي للمبدأ أو القيمة التشغيلية والمنهجية...' : 'Description of core value, standards, and methodology...',
      descEn: 'Description of core value, standards, and methodology...'
    };
    const currentPrinciples = formData.aboutPrinciples && formData.aboutPrinciples.length > 0 
      ? formData.aboutPrinciples 
      : defaultSiteSettings.aboutPrinciples || [];
    setFormData({ ...formData, aboutPrinciples: [...currentPrinciples, newPrinciple] });
  };

  const handleUpdatePrinciple = (id: string, updates: Partial<AboutPrinciple>) => {
    const currentPrinciples = formData.aboutPrinciples && formData.aboutPrinciples.length > 0 
      ? formData.aboutPrinciples 
      : defaultSiteSettings.aboutPrinciples || [];
    const updated = currentPrinciples.map(p => p.id === id ? { ...p, ...updates } : p);
    setFormData({ ...formData, aboutPrinciples: updated });
  };

  const handleRemovePrinciple = (id: string) => {
    const currentPrinciples = formData.aboutPrinciples && formData.aboutPrinciples.length > 0 
      ? formData.aboutPrinciples 
      : defaultSiteSettings.aboutPrinciples || [];
    const updated = currentPrinciples.filter(p => p.id !== id);
    setFormData({ ...formData, aboutPrinciples: updated });
  };

  // Hero Floating Badges Helpers
  const handleAddFloatingBadge = () => {
    const newBadge: HeroFloatingBadge = {
      id: 'hb_' + Date.now(),
      badgeValue: '20+',
      titleAr: language === 'ar' ? 'إنجازاً ومخرجات عمل' : 'Projects & Milestones',
      titleEn: 'Projects & Milestones',
      subAr: language === 'ar' ? 'خبرة وجودة استثنائية' : 'Exceptional Quality',
      subEn: 'Exceptional Quality',
      position: 'top-start',
      enabled: true
    };
    const current = formData.heroFloatingBadges || defaultSiteSettings.heroFloatingBadges || [];
    setFormData({ ...formData, heroFloatingBadges: [...current, newBadge] });
  };

  const handleUpdateFloatingBadge = (id: string, updates: Partial<HeroFloatingBadge>) => {
    const current = formData.heroFloatingBadges || defaultSiteSettings.heroFloatingBadges || [];
    const updated = current.map(b => b.id === id ? { ...b, ...updates } : b);
    setFormData({ ...formData, heroFloatingBadges: updated });
  };

  const handleRemoveFloatingBadge = (id: string) => {
    const current = formData.heroFloatingBadges || defaultSiteSettings.heroFloatingBadges || [];
    setFormData({ ...formData, heroFloatingBadges: current.filter(b => b.id !== id) });
  };

  // Dynamic Content Cards Helpers
  const handleAddContentCard = () => {
    const current = formData.contentCards || defaultSiteSettings.contentCards || [];
    const newCard: ContentCardItem = {
      id: 'cc_' + Date.now(),
      tagAr: language === 'ar' ? 'مجال مميز' : 'Featured Track',
      tagEn: 'Featured Track',
      titleAr: language === 'ar' ? 'عنوان بطاقة المحتوى الجديد' : 'New Content Card Title',
      titleEn: 'New Content Card Title',
      contentAr: language === 'ar' ? 'وصف تفصيلي يتناول **أبرز النقاط**، والخدمات المقدمة، مع تنسيق ماركداون كامل.' : 'Detailed synthesis describing **key highlights**, offerings, and value delivered.',
      contentEn: 'Detailed synthesis describing **key highlights**, offerings, and value delivered.',
      iconName: 'Layers',
      order: current.length + 1,
      enabled: true
    };
    setFormData({ ...formData, contentCards: [...current, newCard] });
  };

  const handleUpdateContentCard = (id: string, updates: Partial<ContentCardItem>) => {
    const current = formData.contentCards || defaultSiteSettings.contentCards || [];
    const updated = current.map(c => c.id === id ? { ...c, ...updates } : c);
    setFormData({ ...formData, contentCards: updated });
  };

  const handleMoveContentCard = (idx: number, direction: 'up' | 'down') => {
    const current = [...(formData.contentCards || defaultSiteSettings.contentCards || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;

    const temp = current[idx];
    current[idx] = current[targetIdx];
    current[targetIdx] = temp;

    const reordered = current.map((c, i) => ({ ...c, order: i + 1 }));
    setFormData({ ...formData, contentCards: reordered });
  };

  const handleRemoveContentCard = (id: string) => {
    const current = formData.contentCards || defaultSiteSettings.contentCards || [];
    setFormData({ ...formData, contentCards: current.filter(c => c.id !== id) });
  };

  // Custom Social Links Helpers
  const handleAddSocialLink = () => {
    const current = formData.customSocialLinks || defaultSiteSettings.customSocialLinks || [];
    const newLink: CustomSocialLink = {
      id: 'soc_' + Date.now(),
      platform: 'youtube',
      labelAr: language === 'ar' ? 'القناة والوثائقيات' : 'Channel & Media',
      labelEn: 'Channel & Media',
      url: 'https://youtube.com',
      enabled: true
    };
    setFormData({ ...formData, customSocialLinks: [...current, newLink] });
  };

  const handleUpdateSocialLink = (id: string, updates: Partial<CustomSocialLink>) => {
    const current = formData.customSocialLinks || defaultSiteSettings.customSocialLinks || [];
    const updated = current.map(s => s.id === id ? { ...s, ...updates } : s);
    setFormData({ ...formData, customSocialLinks: updated });
  };

  const handleRemoveSocialLink = (id: string) => {
    const current = formData.customSocialLinks || defaultSiteSettings.customSocialLinks || [];
    setFormData({ ...formData, customSocialLinks: current.filter(s => s.id !== id) });
  };

  // Stats Items Helpers (Hero stats cards like 10+ Years of Experience / Books)
  const handleAddStatItem = () => {
    const current = formData.statsItems || defaultSiteSettings.statsItems || [];
    const newStat: StatsItem = {
      id: 'stat_' + Date.now(),
      value: '10+',
      labelAr: language === 'ar' ? 'إنجاز أو مؤلف جديد' : 'New Metric',
      labelEn: 'New Metric',
      detailAr: language === 'ar' ? 'تفاصيل إضافية عن الرقم المعروض' : 'Additional detail',
      detailEn: 'Additional detail',
      iconName: 'BookOpen'
    };
    setFormData({ ...formData, statsItems: [...current, newStat] });
  };

  const handleUpdateStatItem = (id: string, updates: Partial<StatsItem>) => {
    const current = formData.statsItems || defaultSiteSettings.statsItems || [];
    const updated = current.map(s => s.id === id ? { ...s, ...updates } : s);
    setFormData({ ...formData, statsItems: updated });
  };

  const handleRemoveStatItem = (id: string) => {
    const current = formData.statsItems || defaultSiteSettings.statsItems || [];
    setFormData({ ...formData, statsItems: current.filter(s => s.id !== id) });
  };

  // Store Categories Helpers (User-defined store departments matching Store section)
  const handleAddStoreCategory = () => {
    const current = formData.storeCategories || defaultSiteSettings.storeCategories || [];
    const idNum = Date.now();
    const newCat: StoreCategoryItem = {
      id: 'cat_' + idNum,
      nameAr: language === 'ar' ? 'قسم جديد' : 'New Category',
      nameEn: 'New Category',
      slug: 'category-' + idNum,
      enabledOnHome: true,
      homeLimit: 4,
      homeOrder: current.length + 1,
      badgeAr: language === 'ar' ? 'قسم معتمد' : 'Verified Category',
      badgeEn: 'Verified Category',
      subtitleAr: '',
      subtitleEn: '',
      iconName: 'BookOpen'
    };
    setFormData({ ...formData, storeCategories: [...current, newCat] });
  };

  const handleUpdateStoreCategory = (id: string, updates: Partial<StoreCategoryItem>) => {
    const current = formData.storeCategories || defaultSiteSettings.storeCategories || [];
    const updated = current.map(c => c.id === id ? { ...c, ...updates } : c);
    setFormData({ ...formData, storeCategories: updated });
  };

  const handleRemoveStoreCategory = (id: string) => {
    const current = formData.storeCategories || defaultSiteSettings.storeCategories || [];
    setFormData({ ...formData, storeCategories: current.filter(c => c.id !== id) });
  };

  const handleMoveStoreCategory = (index: number, direction: 'up' | 'down') => {
    const current = [...(formData.storeCategories || defaultSiteSettings.storeCategories || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    const reordered = current.map((c, i) => ({ ...c, homeOrder: i + 1 }));
    setFormData({ ...formData, storeCategories: reordered });
  };

  const handleToggleStoreCategoryOnHome = (id: string) => {
    const current = formData.storeCategories || defaultSiteSettings.storeCategories || [];
    const updated = current.map(c => {
      if (c.id === id) {
        return { ...c, enabledOnHome: c.enabledOnHome === false ? true : false };
      }
      return c;
    });
    setFormData({ ...formData, storeCategories: updated });
  };

  const handleImportUnregisteredProductCategories = (missingCats: string[]) => {
    const current = formData.storeCategories || defaultSiteSettings.storeCategories || [];
    const newItems: StoreCategoryItem[] = missingCats.map((catName, idx) => {
      const slug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '') || `cat-${Date.now()}-${idx}`;
      return {
        id: 'cat_import_' + Date.now() + '_' + idx,
        nameAr: catName,
        nameEn: catName,
        slug: slug,
        enabledOnHome: true,
        homeLimit: 4,
        homeOrder: current.length + idx + 1,
        badgeAr: catName,
        badgeEn: catName,
        subtitleAr: '',
        subtitleEn: '',
        iconName: 'BookOpen'
      };
    });
    setFormData({ ...formData, storeCategories: [...current, ...newItems] });
  };

  // Save changes to Firestore
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      // 1. Save global site settings
      const settingsRef = doc(db, 'siteSettings', 'global');
      const payloadSettings = cleanFirestorePayload(formData);
      await setDoc(settingsRef, payloadSettings, { merge: true });
      onUpdateSettings(formData);

      // 2. Save each section state in homeSections collection
      if (sectionsList && sectionsList.length > 0) {
        for (const sec of sectionsList) {
          const secRef = doc(db, 'homeSections', sec.id);
          const payloadSec = cleanFirestorePayload(sec);
          await setDoc(secRef, payloadSec, { merge: true });
        }
        if (onUpdateSections) {
          onUpdateSections(sectionsList);
        }
      }

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? 'تم حفظ إعدادات المحتوى والبطاقات وقنوات التواصل بنجاح في قاعدة البيانات!' 
          : 'CMS layout, badges, content cards, and social links saved successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update CMS settings in Firestore:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'siteSettings/global');
        } catch {
          // Handled and logged structured error
        }
      }
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings')
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Versatile Icons available
  const culturalIcons = [
    { name: 'Layers', label: language === 'ar' ? 'طبقات ومحاور متعددة' : 'Layers & Tracks' },
    { name: 'Sparkles', label: language === 'ar' ? 'تميز وابتكار وجودة' : 'Innovation & Excellence' },
    { name: 'Lightbulb', label: language === 'ar' ? 'أفكار ورؤى واستراتيجية' : 'Ideas & Strategy' },
    { name: 'Award', label: language === 'ar' ? 'جوائز وإنجازات معتمدة' : 'Recognition & Awards' },
    { name: 'ShieldCheck', label: language === 'ar' ? 'موثوقية ومعايير وأمان' : 'Integrity & Trust' },
    { name: 'FileText', label: language === 'ar' ? 'مستندات ومخرجات عمل' : 'Documents & Deliverables' },
    { name: 'BookOpen', label: language === 'ar' ? 'معرفة ومحتوى تعليمي' : 'Knowledge & Content' },
    { name: 'Library', label: language === 'ar' ? 'أرشيف ومصادر ومراجع' : 'Archive & Resources' },
    { name: 'Video', label: language === 'ar' ? 'مرئيات وإنتاج وسائط' : 'Media & Video' },
    { name: 'GraduationCap', label: language === 'ar' ? 'خبرة وتدريب وأكاديميا' : 'Expertise & Training' },
    { name: 'Search', label: language === 'ar' ? 'بحث وتحليل واستقصاء' : 'Research & Insights' },
    { name: 'Compass', label: language === 'ar' ? 'توجيه واستشارات' : 'Consulting & Direction' },
    { name: 'Tag', label: language === 'ar' ? 'تصنيف وعلامات' : 'Categories & Tags' },
    { name: 'Package', label: language === 'ar' ? 'حلول وحزم متكاملة' : 'Solutions & Packages' }
  ];

  const tabsConfig = [
    { id: 'identity' as CMSTab, labelAr: 'الهوية والصورة والواجهة', labelEn: 'Identity & Hero Bio', icon: UserCheck },
    { id: 'heroBadges' as CMSTab, labelAr: 'البطاقات العائمة وشارة الصورة', labelEn: 'Floating Badges & Overlay', icon: Sparkles },
    { id: 'stats' as CMSTab, labelAr: 'أرقام وإحصائيات الواجهة', labelEn: 'Hero Stats Cards', icon: Award },
    { id: 'storeCategories' as CMSTab, labelAr: 'أقسام وتصنيفات المتجر', labelEn: 'Store Categories', icon: ShoppingBag },
    { id: 'about' as CMSTab, labelAr: 'الفقرة التعريفية والرؤية (About & Vision)', labelEn: 'About & Overview Section', icon: Layers },
    { id: 'contentCards' as CMSTab, labelAr: 'بطاقات المحتوى والمجالات (Content Cards)', labelEn: 'Content & Area Cards', icon: LayoutGrid },
    { id: 'visibility' as CMSTab, labelAr: 'ترتيب وظهور الأقسام', labelEn: 'Sections & Visibility', icon: Sliders },
    { id: 'social' as CMSTab, labelAr: 'قنوات التواصل والمتابعة', labelEn: 'Social & External Channels', icon: Share2 },
    { id: 'footer' as CMSTab, labelAr: 'تذييل الصفحة وحقوق النشر', labelEn: 'Footer & Copyright', icon: FileText },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Palette className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة محتوى وأقسام الموقع (CMS)' : 'Website Content & CMS Management'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'التحكم الكامل في بطاقات الصورة العائمة، بطاقات المحتوى، تنسيق الماركداون، قنوات التواصل، وظهور الأقسام وتسميتها.' 
              : 'Full control over hero badges, content cards, markdown texts, social channels, and dynamic section naming.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          {feedback?.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? (language === 'ar' ? 'جارٍ الحفظ السحابي...' : 'Saving to Cloud...') : (language === 'ar' ? 'حفظ كافة التعديلات' : 'Save All Changes')}</span>
        </button>
      </div>

      {/* Navigational Segmented Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* ==========================================
            TAB 1: IDENTITY & HERO TEXTS & AVATAR
           ========================================== */}
        {activeTab === 'identity' && (
          <div className="space-y-8">
            {/* 1. Header Subtitle & Job Title */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'المسمى والصفة في شريط التنقل العلوي (Header Subtitle)' : 'Header Subtitle & Author Title'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' 
                      ? 'يظهر أسفل اسمك مباشرة في الهيدر العلوي ليعبر عن صفتك (مؤلف، باحث، صانع محتوى مرئي).' 
                      : 'Appears directly beneath your name in the sticky top navbar.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'المسمى بالإنجليزية' : 'Job Title in English'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Author, Scholar & Documentary Creator"
                    value={formData.headerSubtitleEn || ''}
                    onChange={(e) => setFormData({ ...formData, headerSubtitleEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'المسمى بالعربية' : 'Job Title in Arabic'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: كاتب وباحث وصانع وثائقيات"
                    value={formData.headerSubtitleAr || ''}
                    onChange={(e) => setFormData({ ...formData, headerSubtitleAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 text-right font-sans"
                  />
                </div>
              </div>
            </div>

            {/* 2. Hero Availability Badge / Pill Editor */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ar' 
                        ? 'شارة الجاهزية والاستشارات (Hero Availability Badge)' 
                        : 'Hero Availability & Consultation Badge'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'ar' 
                        ? 'العبارة الترحيبية الدائرية أعلى العنوان الرئيسي ("متاح للأعمال والمشاريع والتعاون المهني" أو ما يناسب تخصصك الحالي).' 
                        : 'The rounded interactive pill above the hero headline displaying your current availability and consultation status.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showHeroAvailabilityBadge')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    formData.sectionVisibility?.showHeroAvailabilityBadge !== false
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    formData.sectionVisibility?.showHeroAvailabilityBadge !== false ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  <span>
                    {formData.sectionVisibility?.showHeroAvailabilityBadge !== false
                      ? (language === 'ar' ? 'ظاهرة بالهيدر' : 'Active & Visible')
                      : (language === 'ar' ? 'مخفية مؤقتاً' : 'Hidden')}
                  </span>
                </button>
              </div>

              {/* Input Fields: English on Left, Arabic on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نص الشارة بالإنجليزية' : 'English Pill Text'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Available for advisory & bespoke systems"
                    value={formData.heroAvailabilityTextEn ?? ''}
                    onChange={(e) => setFormData({ ...formData, heroAvailabilityTextEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نص الشارة بالعربية' : 'Arabic Pill Text'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: متاح للاستشارات والإنتاج المعرفي"
                    value={formData.heroAvailabilityTextAr ?? ''}
                    onChange={(e) => setFormData({ ...formData, heroAvailabilityTextAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 text-right font-sans"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  {language === 'ar' ? 'معاينة حية كما تظهر لزوار الواجهة الرئيسية' : 'Live Preview in Hero Header'}
                </span>
                <div className="pt-1 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-[#13141a] text-cyan-400 text-xs sm:text-sm font-mono font-medium">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>
                      {language === 'ar'
                        ? (formData.heroAvailabilityTextAr || 'متاح للأعمال والمشاريع والتعاون المهني')
                        : (formData.heroAvailabilityTextEn || 'Available for projects and strategic collaborations')}
                    </span>
                  </div>
                  {formData.sectionVisibility?.showHeroAvailabilityBadge === false && (
                    <span className="text-[11px] text-amber-400 font-mono">
                      {language === 'ar' ? '(الشارة مخفية حالياً)' : '(Currently hidden)'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Hero Profile Image / Avatar */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'صورة الكاتب / المؤلف في الواجهة الرئيسية (Hero Portrait)' : 'Hero & Profile Portrait Image'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' 
                      ? 'ضع رابط صورتك الشخصية ليتم عرضها بإطار فني مع شارات الخبرة والبطاقات التفاعلية.' 
                      : 'Set your profile portrait for the hero showcase card.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <ImageUploadField
                  value={formData.avatarUrl || ''}
                  onChange={(val) => setFormData({ ...formData, avatarUrl: val })}
                  labelAr="صورة الكاتب والباحث في الهيدر (رفع مباشر من جهازك)"
                  labelEn="Hero Portrait Photo (Direct Upload from Device)"
                  hintAr="اسحب الصورة وأفلتها هنا أو اضغط لاختيارها مباشرة من ملفات جهازك. يتم ضغط الصورة وحفظها فوراً دون أي روابط خارجية."
                  hintEn="Drag & drop your portrait photo or click to browse files from your computer."
                />
              </div>
            </div>

            {/* 3. Hero Texts & Headings */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'نصوص الواجهة الترحيبية (Hero Headlines & Bio)' : 'Hero Section Headlines & Intro'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="ltr">
                {/* English Column (Left) */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left" dir="ltr">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'المحتوى باللغة الإنجليزية' : 'English Content'}</span>
                  </span>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Author / Brand Name (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.brandNameEn || ''}
                      onChange={(e) => setFormData({ ...formData, brandNameEn: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Hero Headline (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.titleEn || ''}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Hero Brief Bio (English)
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={formData.bioEn || ''}
                      onChange={(e) => setFormData({ ...formData, bioEn: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Location (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.locationEn || ''}
                      onChange={(e) => setFormData({ ...formData, locationEn: e.target.value })}
                      placeholder="e.g. Cairo, Egypt / Global Arabic Studies"
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans"
                    />
                  </div>
                </div>

                {/* Arabic Column (Right) */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-right" dir="rtl">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-end">
                    <span>{language === 'ar' ? 'المحتوى باللغة العربية' : 'Arabic Content'}</span>
                    <Globe className="w-3.5 h-3.5" />
                  </span>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'الاسم الشخصي / اسم المنصة' : 'Brand / Author Name'}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.brandNameAr || ''}
                      onChange={(e) => setFormData({ ...formData, brandNameAr: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'العنوان الرئيسي الترحيبي' : 'Hero Main Headline'}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.titleAr || ''}
                      onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'النبذة الترحيبية الموجزة' : 'Hero Brief Bio / Intro'}
                    </label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      value={formData.bioAr || ''}
                      onChange={(e) => setFormData({ ...formData, bioAr: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'الموقع الجغرافي ونطاق العمل' : 'Location & Operations'}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.locationAr || ''}
                      onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })}
                      placeholder={language === 'ar' ? 'مثال: القاهرة / العالم العربي' : 'Location in Arabic'}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: HERO FLOATING BADGES & OVERLAY
           ========================================== */}
        {activeTab === 'heroBadges' && (
          <div className="space-y-8">
            
            {/* 1. Hero Overlay Badge (البطاقة الزجاجية فوق الصورة) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'البطاقة المركزية فوق الصورة (Hero Overlay Badge)' : 'Hero Image Central Overlay Badge'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'ar'
                        ? 'البطاقة الأنيقة التي تظهر في أسفل الصورة مباشرة وتبرز التخصص الرئيسي والأيقونة الرمزية.'
                        : 'The prominent badge positioned directly over the bottom edge of your hero portrait.'}
                    </p>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showHeroOverlayBadge')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    formData.sectionVisibility?.showHeroOverlayBadge !== false
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {formData.sectionVisibility?.showHeroOverlayBadge !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{formData.sectionVisibility?.showHeroOverlayBadge !== false ? (language === 'ar' ? 'مفعلة وتظهر' : 'Visible') : (language === 'ar' ? 'مخفية' : 'Hidden')}</span>
                </button>
              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5 max-w-sm pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'الأيقونة الرمزية للبطاقة' : 'Badge Icon'}
                </label>
                <select
                  value={formData.heroOverlayIcon || 'BookOpen'}
                  onChange={(e) => setFormData({ ...formData, heroOverlayIcon: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  {culturalIcons.map((ic) => (
                    <option key={ic.name} value={ic.name}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Titles: English on Left, Arabic on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Overlay Title (English)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.heroOverlayTitleEn || ''}
                    onChange={(e) => setFormData({ ...formData, heroOverlayTitleEn: e.target.value })}
                    placeholder="e.g. Author, Researcher & Documentarist"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'العنوان الرئيسي للبطاقة بالعربية' : 'Overlay Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.heroOverlayTitleAr || ''}
                    onChange={(e) => setFormData({ ...formData, heroOverlayTitleAr: e.target.value })}
                    placeholder="مثال: مؤلف وباحث وصانع وثائقيات"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-right font-sans"
                  />
                </div>
              </div>

              {/* Subtitles: English on Left, Arabic on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="ltr">
                <div className="space-y-1.5 text-left" dir="ltr">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Overlay Subtitle (English)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.heroOverlaySubEn || ''}
                    onChange={(e) => setFormData({ ...formData, heroOverlaySubEn: e.target.value })}
                    placeholder="e.g. Scholarly Inquiries • Books • Documentaries"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                  />
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'النص الفرعي للبطاقة بالعربية' : 'Overlay Subtitle (Arabic)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.heroOverlaySubAr || ''}
                    onChange={(e) => setFormData({ ...formData, heroOverlaySubAr: e.target.value })}
                    placeholder="مثال: أبحاث فكرية معمقة • كتب منشورة • وثائقيات"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                  />
                </div>
              </div>
            </div>

            {/* 2. Hero Floating Badges (البطاقات العائمة حول الصورة كـ 10 سنوات خبرة وغيرها) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'البطاقات العائمة حول الصورة (Floating Stat Badges)' : 'Hero Floating Stat Badges'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'ar'
                      ? 'البطاقات العائمة التي تظهر في زوايا الصورة (مثل: +15 مؤلفاً وبحثاً، 2.5M+ قارئ ومشاهد، وغيرها) مع إمكانية تعديل الأرقام والنصوص وموضع الظهور.'
                      : 'Floating badges over corners of the hero portrait displaying numbers, key credentials, and audience metrics.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility('showHeroFloatingBadges')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      formData.sectionVisibility?.showHeroFloatingBadges !== false
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {formData.sectionVisibility?.showHeroFloatingBadges !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{formData.sectionVisibility?.showHeroFloatingBadges !== false ? (language === 'ar' ? 'الكل مفعل' : 'All Enabled') : (language === 'ar' ? 'الكل مخفي' : 'All Hidden')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddFloatingBadge}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة بطاقة عائمة جديدة' : 'Add Floating Badge'}</span>
                  </button>
                </div>
              </div>

              {/* Badges List */}
              <div className="space-y-4">
                {(formData.heroFloatingBadges || defaultSiteSettings.heroFloatingBadges || []).map((badge, idx) => (
                  <div
                    key={badge.id || idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      badge.enabled !== false 
                        ? 'bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60' 
                        : 'bg-slate-100/40 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {language === 'ar' ? 'موضع الظهور:' : 'Position:'}
                          </label>
                          <select
                            value={badge.position || 'top-start'}
                            onChange={(e) => handleUpdateFloatingBadge(badge.id, { position: e.target.value as any })}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                          >
                            <option value="top-start">{language === 'ar' ? 'أعلى البداية (Top-Start)' : 'Top-Start'}</option>
                            <option value="top-end">{language === 'ar' ? 'أعلى النهاية (Top-End)' : 'Top-End'}</option>
                            <option value="bottom-start">{language === 'ar' ? 'أسفل البداية (Bottom-Start)' : 'Bottom-Start'}</option>
                            <option value="bottom-end">{language === 'ar' ? 'أسفل النهاية (Bottom-End)' : 'Bottom-End'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateFloatingBadge(badge.id, { enabled: badge.enabled === false ? true : false })}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                            badge.enabled !== false 
                              ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                          title={badge.enabled !== false ? 'إخفاء هذه البطاقة' : 'تفعيل هذه البطاقة'}
                        >
                          {badge.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFloatingBadge(badge.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs cursor-pointer"
                          title={language === 'ar' ? 'حذف البطاقة' : 'Delete Badge'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3" dir="ltr">
                      {/* Big Value */}
                      <div className="space-y-1 sm:col-span-1 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {language === 'ar' ? 'الرقم / القيمة الكبيرة' : 'Stat Value'}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={badge.badgeValue}
                          onChange={(e) => handleUpdateFloatingBadge(badge.id, { badgeValue: e.target.value })}
                          placeholder="e.g. 15+ or 2.5M"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center"
                        />
                      </div>

                      {/* Title En & Sub En (Left) */}
                      <div className="space-y-1 sm:col-span-2 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Title & Subtitle (English)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={badge.titleEn}
                          onChange={(e) => handleUpdateFloatingBadge(badge.id, { titleEn: e.target.value })}
                          placeholder="Published Books & Studies"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          value={badge.subEn}
                          onChange={(e) => handleUpdateFloatingBadge(badge.id, { subEn: e.target.value })}
                          placeholder="Subtitle: Scholarly Essays & Books"
                          className="w-full px-3 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1 font-sans"
                        />
                      </div>

                      {/* Title Ar & Sub Ar (Right) */}
                      <div className="space-y-1 sm:col-span-2 text-right" dir="rtl">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {language === 'ar' ? 'العنوان بالعربية' : 'Title (Arabic)'}
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={badge.titleAr}
                          onChange={(e) => handleUpdateFloatingBadge(badge.id, { titleAr: e.target.value })}
                          placeholder="مؤلفاً وبحثاً منشوراً"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={badge.subAr}
                          onChange={(e) => handleUpdateFloatingBadge(badge.id, { subAr: e.target.value })}
                          placeholder="نص فرعي: دراسات فكرية وميدانية"
                          className="w-full px-3 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1 font-sans"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            TAB 3: ABOUT NARRATIVE & PRINCIPLES
           ========================================== */}
        {activeTab === 'about' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-8">
              
              {/* Header Titles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'الفقرة التعريفية والرؤية العامة (About & Overview)' : 'Overview & Narrative Section'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'محرر ماركداون غني لتنسيق النصوص التعريفية، الرؤية والأهداف، ونقاط الميزات والمبادئ.'
                      : 'Rich Markdown editors for your overview narrative, mission, feature points, and core principles.'}
                  </p>
                </div>
              </div>

              {/* Section Headings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                {/* English Section Headings (Left) */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3 text-left" dir="ltr">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    {language === 'ar' ? 'عناوين الفقرة بالإنجليزية' : 'English Section Headings'}
                  </span>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Top Badge (English)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.aboutBadgeEn ?? 'Vision & Mission'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutBadgeEn: val });
                        updateSectionField('sec-about', 'badgeEn', val);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Section Title / Name</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.aboutHeadingEn ?? 'About & Overview'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutHeadingEn: val });
                        updateSectionField('sec-about', 'titleEn', val);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Subtitle</label>
                    <textarea
                      rows={2}
                      dir="ltr"
                      value={formData.aboutSubEn ?? 'Driven by a clear vision, ambitious goals, and standards of excellence delivering tangible results.'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutSubEn: val });
                        updateSectionField('sec-about', 'subtitleEn', val);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                    />
                  </div>
                </div>

                {/* Arabic Section Headings (Right) */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3 text-right" dir="rtl">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    {language === 'ar' ? 'تخصيص اسم وعناوين الفقرة التعريفية' : 'Arabic Section Headings'}
                  </span>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">الشارة العلوية (Badge)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.aboutBadgeAr ?? 'الرؤية والرسالة'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutBadgeAr: val });
                        updateSectionField('sec-about', 'badgeAr', val);
                      }}
                      placeholder="مثال: الرؤية والرسالة"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>اسم الفقرة / العنوان الرئيسي</span>
                      <span className="text-[10px] text-emerald-600 font-normal">يمكنك تغييره بحرية تامة</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.aboutHeadingAr ?? 'الرؤية والتعريف بالمنصة'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutHeadingAr: val });
                        updateSectionField('sec-about', 'titleAr', val);
                      }}
                      placeholder="مثال: نبذة عنا / الرؤية والرسالة / من نحن"
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-emerald-500/40 dark:border-emerald-600/40 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right focus:border-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">العنوان الفرعي التوضيحي للفقرة</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={formData.aboutSubAr ?? 'تقديم حلول متكاملة ورؤية واضحة تقود إلى أفضل النتائج والقيمة المستدامة.'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, aboutSubAr: val });
                        updateSectionField('sec-about', 'subtitleAr', val);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Rich Text Markdown Narrative */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Feather className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'السرد والنصوص التعريفية (محرر ماركداون فوري مع معاينة)' : 'Overview & Narrative Texts (Markdown Rich Text)'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="ltr">
                  {/* English Narrative (Left) */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left" dir="ltr">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      {language === 'ar' ? 'السرد باللغة الإنجليزية' : 'English Narrative'}
                    </span>
                    <RichTextMarkdownEditor
                      label="Paragraph 1 (Main Narrative / Background)"
                      value={formData.bioEn || ''}
                      onChange={(val) => setFormData({ ...formData, bioEn: val })}
                      dir="ltr"
                      language={language}
                      rows={4}
                    />
                    <RichTextMarkdownEditor
                      label="Paragraph 2 (Methodology / Value Proposition)"
                      value={formData.aboutParagraph2En || ''}
                      onChange={(val) => setFormData({ ...formData, aboutParagraph2En: val })}
                      dir="ltr"
                      language={language}
                      rows={4}
                    />
                  </div>

                  {/* Arabic Narrative (Right) */}
                  <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-right" dir="rtl">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      {language === 'ar' ? 'السرد باللغة العربية' : 'Arabic Narrative'}
                    </span>
                    <RichTextMarkdownEditor
                      label={language === 'ar' ? 'الفقرة الأولى (التعريف العام والخلفية)' : 'Paragraph 1 (Main Narrative)'}
                      value={formData.bioAr || ''}
                      onChange={(val) => setFormData({ ...formData, bioAr: val })}
                      dir="rtl"
                      language={language}
                      rows={4}
                    />
                    <RichTextMarkdownEditor
                      label={language === 'ar' ? 'الفقرة الثانية (المنهجية والقيمة المقدمة)' : 'Paragraph 2 (Methodology)'}
                      value={formData.aboutParagraph2Ar || ''}
                      onChange={(val) => setFormData({ ...formData, aboutParagraph2Ar: val })}
                      dir="rtl"
                      language={language}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Checklist Points */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'ar' ? 'نقاط وميزات القيمة المضافة (Feature Points Checklist)' : 'Key Highlights Checklist'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة نقطة ميزة' : 'Add Point'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.aboutFeatures || defaultSiteSettings.aboutFeatures || []).map((feat, idx) => (
                    <div 
                      key={feat.id || idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/60 flex flex-col md:flex-row items-stretch md:items-center gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2" dir="ltr">
                        <input
                          type="text"
                          dir="ltr"
                          value={feat.textEn}
                          onChange={(e) => handleUpdateFeature(feat.id, 'textEn', e.target.value)}
                          placeholder="English text (e.g. End-to-end quality and proven execution)"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={feat.textAr}
                          onChange={(e) => handleUpdateFeature(feat.id, 'textAr', e.target.value)}
                          placeholder="النص بالعربية (مثال: جودة شاملة وتنفيذ متقن ومثبت)"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(feat.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer self-end md:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Principles Cards */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'ar' ? 'المبادئ والقيم التشغيلية الأساسية (Principles Cards)' : 'Core Values & Principles Cards'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'ar'
                        ? 'تخصيص البطاقات الأساسية مع اختيار الأيقونات المناسبة، العناوين، والتفاصيل.'
                        : 'Configure key principles cards with versatile icons, custom titles, and descriptions.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPrinciple}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة بطاقة مبدأ' : 'Add Principle'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(formData.aboutPrinciples || defaultSiteSettings.aboutPrinciples || []).map((p, pIdx) => (
                    <div 
                      key={p.id || pIdx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/60 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                            {pIdx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {language === 'ar' ? 'الأيقونة:' : 'Icon:'}
                            </label>
                            <select
                              value={p.iconName || 'BookOpen'}
                              onChange={(e) => handleUpdatePrinciple(p.id, { iconName: e.target.value })}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                            >
                              {culturalIcons.map((ic) => (
                                <option key={ic.name} value={ic.name}>
                                  {ic.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePrinciple(p.id)}
                          className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'حذف' : 'Remove'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="ltr">
                        {/* English Details (Left) */}
                        <div className="space-y-2 text-left" dir="ltr">
                          <input
                            type="text"
                            dir="ltr"
                            value={p.titleEn}
                            onChange={(e) => handleUpdatePrinciple(p.id, { titleEn: e.target.value })}
                            placeholder="Principle Title (English)"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-left"
                          />
                          <textarea
                            rows={2}
                            dir="ltr"
                            value={p.descEn}
                            onChange={(e) => handleUpdatePrinciple(p.id, { descEn: e.target.value })}
                            placeholder="Principle details (English)..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                          />
                        </div>

                        {/* Arabic Details (Right) */}
                        <div className="space-y-2 text-right" dir="rtl">
                          <input
                            type="text"
                            dir="rtl"
                            value={p.titleAr}
                            onChange={(e) => handleUpdatePrinciple(p.id, { titleAr: e.target.value })}
                            placeholder="عنوان المبدأ بالعربية"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right"
                          />
                          <textarea
                            rows={2}
                            dir="rtl"
                            value={p.descAr}
                            onChange={(e) => handleUpdatePrinciple(p.id, { descAr: e.target.value })}
                            placeholder="الشرح والتفاصيل بالعربية..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: DYNAMIC CONTENT CARDS & SERIES
           ========================================== */}
        {activeTab === 'contentCards' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'بطاقات المحتوى والمجالات (Content Cards)' : 'Dynamic Content & Area Cards'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'أضف واحذف وأعد ترتيب وتخصيص بطاقات المحتوى التفاعلية ومحاور العمل مع محرر ماركداون كامل لكل بطاقة.'
                      : 'Add, delete, reorder and customize dynamic content cards and focal areas with full Markdown support.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddContentCard}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة بطاقة محتوى جديدة' : 'Add Content Card'}</span>
                </button>
              </div>

              {/* Section Header Customization Box */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'تخصيص اسم وعناوين فقرة بطاقات المحتوى في الصفحة الرئيسية' : 'Customize Content Cards Section Title & Headings'}</span>
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {language === 'ar' ? 'تحكم كامل في مسمى الفقرة' : 'Full Title Control'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Headings */}
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5 text-left" dir="ltr">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">English Section Info</span>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Badge</label>
                      <input
                        type="text"
                        value={formData.contentCardsBadgeEn ?? 'Featured Areas & Highlights'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsBadgeEn: val });
                          updateSectionField('sec-content-cards', 'badgeEn', val);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Section Title</label>
                      <input
                        type="text"
                        value={formData.contentCardsTitleEn ?? 'Focus Areas & Capabilities'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsTitleEn: val });
                          updateSectionField('sec-content-cards', 'titleEn', val);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
                      <textarea
                        rows={2}
                        value={formData.contentCardsSubEn ?? 'Explore diverse core tracks, key initiatives, and comprehensive capabilities.'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsSubEn: val });
                          updateSectionField('sec-content-cards', 'subtitleEn', val);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Arabic Headings */}
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5 text-right" dir="rtl">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">عناوين ومسمى الفقرة بالعربية</span>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">الشارة العلوية (Badge)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={formData.contentCardsBadgeAr ?? 'المجالات والمحاور'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsBadgeAr: val });
                          updateSectionField('sec-content-cards', 'badgeAr', val);
                        }}
                        placeholder="مثال: المجالات والمحاور"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>اسم الفقرة / العنوان الرئيسي</span>
                        <span className="text-[10px] text-emerald-600 font-normal">يمكنك تعديله بحرية تامة</span>
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={formData.contentCardsTitleAr ?? 'المجالات ومحاور العمل'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsTitleAr: val });
                          updateSectionField('sec-content-cards', 'titleAr', val);
                        }}
                        placeholder="مثال: مجالات عملنا / بطاقات المحتوى / مخرجاتنا"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border-2 border-emerald-500/40 dark:border-emerald-600/40 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">العنوان الفرعي التوضيحي للفقرة</label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={formData.contentCardsSubAr ?? 'استعراض المسارات الأساسية والحلول المتكاملة التي نقدمها بدقة واحترافية.'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, contentCardsSubAr: val });
                          updateSectionField('sec-content-cards', 'subtitleAr', val);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-6">
                {(formData.contentCards || defaultSiteSettings.contentCards || []).map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                      card.enabled !== false 
                        ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60' 
                        : 'bg-slate-100/40 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    {/* Card Top Actions */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {language === 'ar' ? 'الأيقونة:' : 'Icon:'}
                          </label>
                          <select
                            value={card.iconName || 'BookOpen'}
                            onChange={(e) => handleUpdateContentCard(card.id, { iconName: e.target.value })}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            {culturalIcons.map((ic) => (
                              <option key={ic.name} value={ic.name}>
                                {ic.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveContentCard(idx, 'up')}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === ((formData.contentCards?.length ?? 1) - 1)}
                          onClick={() => handleMoveContentCard(idx, 'down')}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateContentCard(card.id, { enabled: card.enabled === false ? true : false })}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            card.enabled !== false 
                              ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                          title={card.enabled !== false ? 'إخفاء البطاقة' : 'تفعيل البطاقة'}
                        >
                          {card.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContentCard(card.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title={language === 'ar' ? 'حذف البطاقة' : 'Delete Card'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tag & Title Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                      {/* English Header (Left) */}
                      <div className="space-y-2 text-left" dir="ltr">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Category Tag</label>
                            <input
                              type="text"
                              dir="ltr"
                              value={card.tagEn || ''}
                              onChange={(e) => handleUpdateContentCard(card.id, { tagEn: e.target.value })}
                              placeholder="Key Track"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Card Title (English)</label>
                            <input
                              type="text"
                              dir="ltr"
                              value={card.titleEn}
                              onChange={(e) => handleUpdateContentCard(card.id, { titleEn: e.target.value })}
                              placeholder="Core Area or Solution Track"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-left"
                            />
                          </div>
                        </div>

                        {/* Markdown Content En */}
                        <RichTextMarkdownEditor
                          label="Card Content (English Markdown)"
                          value={card.contentEn || ''}
                          onChange={(val) => handleUpdateContentCard(card.id, { contentEn: val })}
                          dir="ltr"
                          language={language}
                          rows={3}
                        />
                      </div>

                      {/* Arabic Header (Right) */}
                      <div className="space-y-2 text-right" dir="rtl">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">الوسم / التصنيف</label>
                            <input
                              type="text"
                              dir="rtl"
                              value={card.tagAr || ''}
                              onChange={(e) => handleUpdateContentCard(card.id, { tagAr: e.target.value })}
                              placeholder="المسار الرئيسي"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">عنوان البطاقة بالعربية</label>
                            <input
                              type="text"
                              dir="rtl"
                              value={card.titleAr}
                              onChange={(e) => handleUpdateContentCard(card.id, { titleAr: e.target.value })}
                              placeholder="المجال أو الحل الرئيسي"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right"
                            />
                          </div>
                        </div>

                        {/* Markdown Content Ar */}
                        <RichTextMarkdownEditor
                          label={language === 'ar' ? 'نص البطاقة بالعربية (مع تنسيق ماركداون)' : 'Card Content (Arabic Markdown)'}
                          value={card.contentAr || ''}
                          onChange={(val) => handleUpdateContentCard(card.id, { contentAr: val })}
                          dir="rtl"
                          language={language}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 5: SECTION ORDER & VISIBILITY MATRIX
           ========================================== */}
        {activeTab === 'visibility' && (
          <div className="space-y-8">
            
            {/* Section Visibility Toggles Grid */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'مفاتيح ظهور وإخفاء الأقسام والبطاقات' : 'Section & Card Visibility Toggles'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar'
                      ? 'يمكنك بنقرة زر واحدة إخفاء أو إظهار أي بطاقة أو قسم بالكامل على الموقع بدون حذف البيانات.'
                      : 'Toggle on or off any specific section or card component without losing stored data.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {[
                  { key: 'showJobTitleInHeader' as const, labelAr: 'المسمى الوظيفي تحت الاسم في الهيدر', labelEn: 'Job Title Under Name in Header' },
                  { key: 'showHero' as const, labelAr: 'قسم الواجهة الترحيبية Hero', labelEn: 'Hero Header Section' },
                  { key: 'showCarousel' as const, labelAr: 'شريط الكاروسيل التفاعلي البارز', labelEn: 'Featured Hero Spotlight Carousel' },
                  { key: 'showHeroAvailabilityBadge' as const, labelAr: 'شارة الاستشارات والجاهزية بالهيدر', labelEn: 'Hero Availability Badge' },
                  { key: 'showHeroOverlayBadge' as const, labelAr: 'شارة الصورة المركزية', labelEn: 'Central Overlay Badge' },
                  { key: 'showHeroFloatingBadges' as const, labelAr: 'البطاقات العائمة حول الصورة', labelEn: 'Hero Floating Badges' },
                  { key: 'showAbout' as const, labelAr: 'قسم نبذة وفلسفة العمل بالكامل', labelEn: 'Full About Section' },
                  { key: 'showAboutNarrative' as const, labelAr: 'السرد الشخصي في قسم نبذة', labelEn: 'Personal Narrative Bio' },
                  { key: 'showAboutFeatures' as const, labelAr: 'نقاط ميزات الخبرة السريعة', labelEn: 'Quick Feature Points' },
                  { key: 'showAboutPrinciples' as const, labelAr: 'بطاقات المبادئ الأساسية', labelEn: 'Operational Principles Cards' },
                  { key: 'showContentCards' as const, labelAr: 'قسم بطاقات المحتوى والمؤلفات', labelEn: 'Dynamic Content Cards Section' },
                  { key: 'showPortfolio' as const, labelAr: 'معرض الأعمال والوثائقيات', labelEn: 'Portfolio / Media Gallery' },
                  { key: 'showServices' as const, labelAr: 'قسم الاستشارات والمحاضرات', labelEn: 'Services & Advisory' },
                  { key: 'showStore' as const, labelAr: 'المتجر والمؤلفات الرقمية', labelEn: 'Store & Published Works' },
                  { key: 'showArticles' as const, labelAr: 'قسم المقالات والدراسات', labelEn: 'Articles & Essays Section' },
                  { key: 'showTestimonials' as const, labelAr: 'آراء وشهادات القراء والجمهور', labelEn: 'Testimonials & Reviews' },
                  { key: 'showContact' as const, labelAr: 'نموذج التواصل المباشر الرئيسي', labelEn: 'Contact Inquiry Form' },
                  { key: 'showNewsletter' as const, labelAr: 'قسم النشرة البريدية وصندوق المشتركين', labelEn: 'Newsletter Subscription Section' },
                  { key: 'showFooterSection' as const, labelAr: 'الفوتر والجزء السفلي بالكامل', labelEn: 'Complete Footer Section' },
                  { key: 'showFooterSocialChannels' as const, labelAr: 'قنوات ووسائل التواصل بالفوتر', labelEn: 'Footer Social Channels' },
                  { key: 'showFooterNav' as const, labelAr: 'روابط التنقل السريع بالفوتر', labelEn: 'Footer Navigation Links' },
                  { key: 'showFooterBrandInfo' as const, labelAr: 'بيانات ونبذة المنصة في الفوتر', labelEn: 'Footer Brand Bio Info' },
                  { key: 'showFooterBottomBar' as const, labelAr: 'شريط الحقوق وبوابة المالك السفلي', labelEn: 'Footer Bottom Copyright Bar' },
                  { key: 'showFooterNewsletter' as const, labelAr: 'صندوق النشرة في الفوتر', labelEn: 'Footer Newsletter Widget' },
                ].map((item) => {
                  const isVisible = formData.sectionVisibility?.[item.key] !== false;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggleVisibility(item.key)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isVisible
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-900 dark:text-white'
                          : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">
                          {language === 'ar' ? item.labelAr : item.labelEn}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {isVisible ? (language === 'ar' ? 'ظاهر للزوار' : 'Visible') : (language === 'ar' ? 'مخفي حالياً' : 'Hidden')}
                        </span>
                      </div>

                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isVisible ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sections Reordering List */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'ترتيب تسلسل أقسام الصفحة الرئيسية' : 'Homepage Section Order Sequence'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'ar' 
                        ? 'اسحب وأفلت لإعادة الترتيب الفوري، أو استخدم أزرار الأسهم. يتم الحفظ تلقائياً في قاعدة البيانات.' 
                        : 'Drag & drop to reorder immediately, or use arrow buttons. Changes auto-save to Firestore.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {isAutoSavingOrder && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse bg-emerald-500/10 px-3 py-1 rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'ar' ? 'جاري الحفظ التلقائي...' : 'Auto-saving order...'}</span>
                    </span>
                  )}
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {sectionsList?.length || 0} {language === 'ar' ? 'أقسام مخصصة' : 'Sections'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {(sectionsList || []).map((sec, idx) => {
                  const isEditing = editingSectionId === sec.id;
                  const isDragged = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

                  return (
                    <div 
                      key={sec.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-xl border transition-all duration-200 ${
                        isDragged 
                          ? 'opacity-40 border-dashed border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 scale-[0.99]' 
                          : isDragOver
                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 scale-[1.01] shadow-md'
                            : sec.enabled 
                              ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600' 
                              : 'bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between p-3.5 gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Drag Handle */}
                          <div 
                            className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors shrink-0"
                            title={language === 'ar' ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Index Badge */}
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                              <span className="truncate">{language === 'ar' ? (sec.titleAr || sec.sectionKey) : (sec.titleEn || sec.sectionKey)}</span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
                                {sec.sectionKey}
                              </span>
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {sec.enabled ? (language === 'ar' ? 'ظاهر على الموقع' : 'Visible on site') : (language === 'ar' ? 'مخفي' : 'Hidden')}
                              </span>
                              {sec.badgeAr && (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  • {language === 'ar' ? sec.badgeAr : (sec.badgeEn || sec.badgeAr)}
                                </span>
                              )}
                              {/* Background Swatch Pill */}
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs" 
                                  style={{ backgroundColor: getVariantColorSwatch(sec.bgVariant, sec.bgCustomColor) }}
                                />
                                <span>{getVariantLabel(sec.bgVariant, language)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingSectionId(isEditing ? null : sec.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                              isEditing
                                ? 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title={language === 'ar' ? 'تخصيص نصوص، خلفية وشارة القسم' : 'Customize Texts, Background & Badges'}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'ar' ? (isEditing ? 'إغلاق' : 'تخصيص') : (isEditing ? 'Close' : 'Customize')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={language === 'ar' ? 'تحريك لأعلى' : 'Move Up'}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (sectionsList?.length ?? 1) - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
                            title={language === 'ar' ? 'تحريك لأسفل' : 'Move Down'}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSection(sec.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              sec.enabled 
                                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={sec.enabled ? 'إخفاء القسم' : 'تفعيل القسم'}
                          >
                            {sec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Edit Form */}
                      {isEditing && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 rounded-b-xl space-y-4">
                          {/* Titles */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'عنوان القسم (عربي)' : 'Section Title (Arabic)'}
                              </label>
                              <input
                                type="text"
                                value={sec.titleAr || ''}
                                onChange={(e) => updateSectionField(sec.id, 'titleAr', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'عنوان القسم (إنجليزي)' : 'Section Title (English)'}
                              </label>
                              <input
                                type="text"
                                value={sec.titleEn || ''}
                                onChange={(e) => updateSectionField(sec.id, 'titleEn', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'شارة القسم الصغيرة (عربي)' : 'Section Badge (Arabic)'}
                              </label>
                              <input
                                type="text"
                                value={sec.badgeAr || ''}
                                onChange={(e) => updateSectionField(sec.id, 'badgeAr', e.target.value)}
                                placeholder={language === 'ar' ? 'شارة توضيحية تعلو العنوان' : 'Badge text'}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'شارة القسم الصغيرة (إنجليزي)' : 'Section Badge (English)'}
                              </label>
                              <input
                                type="text"
                                value={sec.badgeEn || ''}
                                onChange={(e) => updateSectionField(sec.id, 'badgeEn', e.target.value)}
                                placeholder="Section Badge text"
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                          </div>

                          {/* Subtitles */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'الوصف الفرعي للقسم (عربي)' : 'Subtitle / Description (Arabic)'}
                              </label>
                              <textarea
                                rows={2}
                                value={sec.subtitleAr || ''}
                                onChange={(e) => updateSectionField(sec.id, 'subtitleAr', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {language === 'ar' ? 'الوصف الفرعي للقسم (إنجليزي)' : 'Subtitle / Description (English)'}
                              </label>
                              <textarea
                                rows={2}
                                value={sec.subtitleEn || ''}
                                onChange={(e) => updateSectionField(sec.id, 'subtitleEn', e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                          </div>

                          {/* Background Color Variant & Visual Rhythm Controls */}
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <PaintBucket className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{language === 'ar' ? 'لون وخامة خلفية هذا القسم (تناغم الإيقاع البصري)' : 'Section Background Color & Visual Rhythm'}</span>
                              </label>
                              {sec.bgVariant && sec.bgVariant !== 'default' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateSectionField(sec.id, 'bgVariant', 'default');
                                    updateSectionField(sec.id, 'bgCustomColor', '');
                                  }}
                                  className="text-[10px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer underline"
                                >
                                  {language === 'ar' ? 'استعادة الافتراضي' : 'Reset to Default'}
                                </button>
                              )}
                            </div>

                            {/* Preset Buttons Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { id: 'default', labelAr: 'افتراضي السمة', labelEn: 'Theme Default', descAr: 'أبيض / داكن نقي', color: '#f8fafc' },
                                { id: 'muted', labelAr: 'رمادي هادئ', labelEn: 'Muted Slate', descAr: 'خافت ومريح للعين', color: '#f1f5f9' },
                                { id: 'subtle', labelAr: 'لمسة زمردية', labelEn: 'Subtle Emerald', descAr: 'خلفية زمردية خافتة', color: '#ecfdf5' },
                                { id: 'card', labelAr: 'رمادي كروتي', labelEn: 'Card Slate', descAr: 'رمادي معتدل مميز', color: '#e2e8f0' },
                                { id: 'dark', labelAr: 'كتلة داكنة', labelEn: 'Deep Contrast', descAr: 'خلفية متباينة وفخمة', color: '#0f172a' },
                                { id: 'warm', labelAr: 'أوف وايت دافئ', labelEn: 'Warm Sand', descAr: 'درجة كريمية كلاسيكية', color: '#fefce8' },
                                { id: 'primary', labelAr: 'زمردي ملكي', labelEn: 'Royal Emerald', descAr: 'لون هوية بارز', color: '#059669' },
                                { id: 'custom', labelAr: 'لون مخصص...', labelEn: 'Custom Color...', descAr: 'درجة تختارها بنفسك', color: sec.bgCustomColor || '#3b82f6' }
                              ].map((variant) => {
                                const isSelected = (sec.bgVariant || 'default') === variant.id;
                                return (
                                  <button
                                    key={variant.id}
                                    type="button"
                                    onClick={() => updateSectionField(sec.id, 'bgVariant', variant.id as SectionBackgroundVariant)}
                                    className={`p-2 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-2 ${
                                      isSelected
                                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span 
                                      className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs flex items-center justify-center text-[9px]"
                                      style={{ backgroundColor: variant.color }}
                                    >
                                      {isSelected && <Check className={`w-2.5 h-2.5 ${variant.id === 'dark' || variant.id === 'primary' ? 'text-white' : 'text-slate-900'}`} />}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="text-[11px] font-bold block truncate">
                                        {language === 'ar' ? variant.labelAr : variant.labelEn}
                                      </span>
                                      <span className="text-[9px] text-slate-400 block truncate">
                                        {variant.descAr}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Color Input if selected */}
                            {sec.bgVariant === 'custom' && (
                              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {language === 'ar' ? 'اختر كود اللون المخصص (Hex):' : 'Choose Custom Hex Color:'}
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={sec.bgCustomColor || '#ffffff'}
                                    onChange={(e) => updateSectionField(sec.id, 'bgCustomColor', e.target.value)}
                                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer p-0 bg-transparent"
                                  />
                                  <input
                                    type="text"
                                    value={sec.bgCustomColor || ''}
                                    onChange={(e) => updateSectionField(sec.id, 'bgCustomColor', e.target.value)}
                                    placeholder="#f4f6f9"
                                    className="w-28 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Hide bottom divider option for this section */}
                            <div className="pt-2">
                              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={sec.hideDividerBottom === true}
                                  onChange={(e) => updateSectionField(sec.id, 'hideDividerBottom', e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                />
                                <span>
                                  {language === 'ar' 
                                    ? 'إخفاء الفاصل الأفقي أسفل هذا القسم مباشرة' 
                                    : 'Hide bottom horizontal divider directly beneath this section'}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Section Dividers Settings Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <SplitSquareHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'فواصل الأقسام الأفقية (Section Dividers)' : 'Horizontal Section Dividers'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'ar'
                        ? 'فواصل جمالية اختيارية تفصل بين أقسام الصفحة الرئيسية لإعطاء إيقاع بصري وتنسيق مرتب'
                        : 'Custom horizontal dividers between homepage sections for enhanced visual rhythm'}
                    </p>
                  </div>
                </div>

                {/* Master Divider Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.sectionDividers || defaultSiteSettings.sectionDividers || { enabled: true };
                    setFormData({
                      ...formData,
                      sectionDividers: {
                        ...current,
                        enabled: current.enabled !== false ? false : true
                      }
                    });
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    formData.sectionDividers?.enabled !== false
                      ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {formData.sectionDividers?.enabled !== false ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === 'ar' ? 'الفواصل مفعلة' : 'Dividers Enabled'}</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>{language === 'ar' ? 'الفواصل معطلة' : 'Dividers Disabled'}</span>
                    </>
                  )}
                </button>
              </div>

              {formData.sectionDividers?.enabled !== false && (
                <div className="space-y-5">
                  {/* Style Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {language === 'ar' ? 'نمط الفاصل الجمالي (Divider Style)' : 'Divider Visual Style'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {[
                        { id: 'gradient', labelAr: 'تدرج انسيابي', labelEn: 'Gradient', descAr: 'ناعم وخافت' },
                        { id: 'line', labelAr: 'خط كلاسيكي', labelEn: 'Clean Line', descAr: 'خط أفقي دقيق' },
                        { id: 'dots', labelAr: 'نقاط هندسية', labelEn: 'Dots', descAr: 'نقاط راقية' },
                        { id: 'dashed', labelAr: 'خط متقطع', labelEn: 'Dashed', descAr: 'متقطع حديث' },
                        { id: 'glow', labelAr: 'توهج ناعم', labelEn: 'Glow', descAr: 'توهج زمردي خفيف' },
                        { id: 'accent-wave', labelAr: 'زخرفة ماسية', labelEn: 'Accent Diamond', descAr: 'شريط مع ماسة' }
                      ].map((st) => {
                        const isSel = (formData.sectionDividers?.style || 'gradient') === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                sectionDividers: {
                                  ...(formData.sectionDividers || {}),
                                  enabled: true,
                                  style: st.id as SectionDividerStyle
                                }
                              });
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              isSel
                                ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600 font-bold'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="text-xs">{language === 'ar' ? st.labelAr : st.labelEn}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{st.descAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Preset & Spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {language === 'ar' ? 'طيف الألوان (Color Scheme)' : 'Divider Color Scheme'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'emerald', labelAr: 'زمردي متناسق', labelEn: 'Emerald Brand', dot: '#10b981' },
                          { id: 'subtle', labelAr: 'رمادي خفيف هادئ', labelEn: 'Subtle Slate', dot: '#94a3b8' },
                          { id: 'slate', labelAr: 'داكن متباين', labelEn: 'Deep Slate', dot: '#475569' },
                          { id: 'custom', labelAr: 'لون مخصص...', labelEn: 'Custom Color', dot: formData.sectionDividers?.customColor || '#3b82f6' }
                        ].map((c) => {
                          const isSel = (formData.sectionDividers?.colorPreset || 'emerald') === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  sectionDividers: {
                                    ...(formData.sectionDividers || {}),
                                    enabled: true,
                                    colorPreset: c.id as any
                                  }
                                });
                              }}
                              className={`p-2 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-2 ${
                                isSel
                                  ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600 font-bold'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
                              <span className="text-xs truncate">{language === 'ar' ? c.labelAr : c.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>

                      {formData.sectionDividers?.colorPreset === 'custom' && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.sectionDividers?.customColor || '#10b981'}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                sectionDividers: {
                                  ...(formData.sectionDividers || {}),
                                  enabled: true,
                                  customColor: e.target.value
                                }
                              });
                            }}
                            className="w-8 h-8 rounded cursor-pointer p-0 bg-transparent border border-slate-300 dark:border-slate-600"
                          />
                          <input
                            type="text"
                            value={formData.sectionDividers?.customColor || ''}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                sectionDividers: {
                                  ...(formData.sectionDividers || {}),
                                  enabled: true,
                                  customColor: e.target.value
                                }
                              });
                            }}
                            placeholder="#10b981"
                            className="w-28 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {language === 'ar' ? 'المسافة الرأسية للفاصل (Spacing)' : 'Divider Vertical Spacing'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'compact', labelAr: 'متقارب', labelEn: 'Compact' },
                          { id: 'normal', labelAr: 'متوسط', labelEn: 'Normal' },
                          { id: 'spacious', labelAr: 'متباعد', labelEn: 'Spacious' }
                        ].map((sp) => {
                          const isSel = (formData.sectionDividers?.spacing || 'normal') === sp.id;
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  sectionDividers: {
                                    ...(formData.sectionDividers || {}),
                                    enabled: true,
                                    spacing: sp.id as any
                                  }
                                });
                              }}
                              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                isSel
                                  ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600 font-bold'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="text-xs block">{language === 'ar' ? sp.labelAr : sp.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Live Preview of Divider */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      {language === 'ar' ? 'معاينة فورية حية للفاصل كما سيظهر بين الأقسام:' : 'Live Divider Preview:'}
                    </span>
                    <div className="py-4">
                      <SectionDivider
                        style={formData.sectionDividers?.style || 'gradient'}
                        colorPreset={formData.sectionDividers?.colorPreset || 'emerald'}
                        customColor={formData.sectionDividers?.customColor}
                        spacing={formData.sectionDividers?.spacing || 'normal'}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==========================================
            TAB 6: SOCIAL & CULTURAL CHANNELS
           ========================================== */}
        {activeTab === 'social' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'قنوات التواصل والمتابعة في الفوتر (Footer Channels)' : 'Footer Social & Cultural Channels'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'أضف أي عدد من وسائل التواصل (يوتيوب للوثائقيات، تويتر، جودريدز للكتب، بودكاست، تلغرام، إلخ) لتظهر في أسفل الموقع.'
                      : 'Add custom social media and publishing channels (YouTube, Goodreads, Podcast, Telegram, X, etc.) to the footer.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة وسيلة تواصل جديدة' : 'Add Social Channel'}</span>
                </button>
              </div>

              {/* Master Visibility Toggle for Footer Channels */}
              <div 
                onClick={() => handleToggleVisibility('showFooterSocialChannels')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  formData.sectionVisibility?.showFooterSocialChannels !== false
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.sectionVisibility?.showFooterSocialChannels !== false ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {formData.sectionVisibility?.showFooterSocialChannels !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">
                      {language === 'ar' ? 'حالة ظهور قسم قنوات التواصل في الفوتر' : 'Footer Channels Section Visibility'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {formData.sectionVisibility?.showFooterSocialChannels !== false
                        ? (language === 'ar' ? 'ظاهر حالياً لزوار الموقع في الجزء السفلي' : 'Currently visible in footer')
                        : (language === 'ar' ? 'مخفي حالياً من الجزء السفلي للموقع' : 'Currently hidden from footer')}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  formData.sectionVisibility?.showFooterSocialChannels !== false
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {formData.sectionVisibility?.showFooterSocialChannels !== false
                    ? (language === 'ar' ? 'ظاهر' : 'Active')
                    : (language === 'ar' ? 'مخفي' : 'Hidden')}
                </span>
              </div>

              {/* List of custom social links */}
              <div className="space-y-4">
                {(formData.customSocialLinks || defaultSiteSettings.customSocialLinks || []).map((soc, idx) => (
                  <div
                    key={soc.id || idx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      soc.enabled !== false
                        ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                        : 'bg-slate-100/40 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {language === 'ar' ? 'المنصة:' : 'Platform:'}
                          </label>
                          <select
                            value={soc.platform || 'youtube'}
                            onChange={(e) => handleUpdateSocialLink(soc.id, { platform: e.target.value })}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="youtube">YouTube (قناة اليوتيوب والوثائقيات)</option>
                            <option value="twitter">X (منصة إكس)</option>
                            <option value="goodreads">Goodreads (جودريدز والمؤلفات)</option>
                            <option value="podcast">Podcast (البودكاست الصوتي)</option>
                            <option value="telegram">Telegram (قناة التلغرام الفكرية)</option>
                            <option value="instagram">Instagram (إنستغرام والمرئيات)</option>
                            <option value="facebook">Facebook (فيسبوك)</option>
                            <option value="linkedin">LinkedIn (لينكد إن)</option>
                            <option value="researchgate">ResearchGate (أبحاث أكاديمية)</option>
                            <option value="whatsapp">WhatsApp (واتساب المباشر)</option>
                            <option value="website">Personal Website (موقع إلكتروني)</option>
                            <option value="custom">Custom / Other (قناة مخصصة)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {soc.url && (
                          <a
                            href={soc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                            title="فتح الرابط في نافذة جديدة"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateSocialLink(soc.id, { enabled: soc.enabled === false ? true : false })}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                            soc.enabled !== false 
                              ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {soc.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialLink(soc.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" dir="ltr">
                      <div className="space-y-1 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Label (English)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={soc.labelEn}
                          onChange={(e) => handleUpdateSocialLink(soc.id, { labelEn: e.target.value })}
                          placeholder="YouTube Documentary Channel"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-left"
                        />
                      </div>

                      <div className="space-y-1 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          URL Link
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          value={soc.url}
                          onChange={(e) => handleUpdateSocialLink(soc.id, { url: e.target.value })}
                          placeholder="https://youtube.com/@channel"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-left"
                        />
                      </div>

                      <div className="space-y-1 text-right" dir="rtl">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {language === 'ar' ? 'اسم القناة بالعربية' : 'Label (Arabic)'}
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={soc.labelAr}
                          onChange={(e) => handleUpdateSocialLink(soc.id, { labelAr: e.target.value })}
                          placeholder="قناة اليوتيوب والوثائقيات"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: HERO STATS CARDS (إحصائيات وأرقام الواجهة)
           ========================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {language === 'ar' ? 'بطاقات وأرقام الإحصائيات في الصفحة الرئيسية' : 'Hero Stats & Milestones Cards'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'ar' 
                        ? 'تعديل الأرقام المعروضة (مثل: 15+ مؤلفات، 2.5M+ قارئ)، الأيقونة الثقافية، العنوان، والتفاصيل التوضيحية.' 
                        : 'Customize numeric milestones (values, labels, subtitles, and cultural icons) displayed in the hero stats band.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddStatItem}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة بطاقة رقمية جديدة' : 'Add Stat Card'}</span>
                </button>
              </div>

              {/* Stats List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {(formData.statsItems || defaultSiteSettings.statsItems || []).map((st, idx) => (
                  <div
                    key={st.id}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {language === 'ar' ? (st.labelAr || 'بطاقة إحصائية') : (st.labelEn || 'Stat Card')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStatItem(st.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف البطاقة' : 'Delete Stat'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {language === 'ar' ? 'الرقم / القيمة المعروضة' : 'Displayed Metric Value'}
                        </label>
                        <input
                          type="text"
                          value={st.value}
                          onChange={(e) => handleUpdateStatItem(st.id, { value: e.target.value })}
                          placeholder="e.g. 15+ or 2.5M"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {language === 'ar' ? 'الأيقونة التعبيرية' : 'Icon'}
                        </label>
                        <select
                          value={st.iconName || 'BookOpen'}
                          onChange={(e) => handleUpdateStatItem(st.id, { iconName: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          {culturalIcons.map((ic) => (
                            <option key={ic.name} value={ic.name}>
                              {ic.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
                      <div className="space-y-1 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Label (English)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={st.labelEn}
                          onChange={(e) => handleUpdateStatItem(st.id, { labelEn: e.target.value })}
                          placeholder="Published Monographs"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                        />
                      </div>

                      <div className="space-y-1 text-right" dir="rtl">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          العنوان باللغة العربية
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={st.labelAr}
                          onChange={(e) => handleUpdateStatItem(st.id, { labelAr: e.target.value })}
                          placeholder="مؤلفات وبحوث منشورة"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
                      <div className="space-y-1 text-left" dir="ltr">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Detail Subtitle (English)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={st.detailEn || ''}
                          onChange={(e) => handleUpdateStatItem(st.id, { detailEn: e.target.value })}
                          placeholder="Integrated research & film productions"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                        />
                      </div>

                      <div className="space-y-1 text-right" dir="rtl">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          تفصيل إضافي (عربي)
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={st.detailAr || ''}
                          onChange={(e) => handleUpdateStatItem(st.id, { detailAr: e.target.value })}
                          placeholder="أعمال فكرية ومشاريع وثائقية متكاملة"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: STORE CATEGORIES (أقسام وتصنيفات المتجر في الصفحة الرئيسية)
           ========================================== */}
        {activeTab === 'storeCategories' && (() => {
          const currentStoreCats: StoreCategoryItem[] = formData.storeCategories || defaultSiteSettings.storeCategories || [];
          
          // Detect any categories on active products that aren't yet registered in storeCategories
          const existingSlugsAndNames = new Set(
            currentStoreCats.flatMap(c => [
              (c.slug || '').toLowerCase().trim(),
              (c.nameAr || '').toLowerCase().trim(),
              (c.nameEn || '').toLowerCase().trim(),
              (c.id || '').toLowerCase().trim()
            ]).filter(Boolean)
          );

          const discoveredMissingCats: string[] = [];
          (products || []).forEach(p => {
            if (p && !p.isArchived && p.status === 'published' && p.category) {
              const catTrimmed = p.category.trim();
              if (catTrimmed && !existingSlugsAndNames.has(catTrimmed.toLowerCase())) {
                if (!discoveredMissingCats.includes(catTrimmed)) {
                  discoveredMissingCats.push(catTrimmed);
                }
              }
            }
          });

          const totalHomeShelves = currentStoreCats.filter(c => c.enabledOnHome !== false).length;

          return (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
                
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{language === 'ar' ? 'أقسام وتصنيفات المتجر في الصفحة الرئيسية' : 'Homepage Store Categories & Shelves'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {currentStoreCats.length} {language === 'ar' ? 'أقسام' : 'Categories'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        {language === 'ar' 
                          ? 'تحكّم في الأقسام والتصنيفات المعتمدة في المتجر، وحدد أيّاً منها ترغب في إظهاره كـ "رف معروض" في الصفحة الرئيسية مع تحديد عدد المنتجات المعروضة كمعاينة وزر يحوّل الزائر مباشرة إلى المتجر مصفّى حسب هذا القسم.' 
                          : 'Manage approved store categories and choose which ones appear on the homepage with a preview subset and a direct filtered store link.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddStoreCategory}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{language === 'ar' ? 'إضافة قسم جديد للمتجر' : 'Add Store Category'}</span>
                    </button>
                  </div>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {language === 'ar' ? 'إجمالي الأقسام المعتمدة:' : 'Total Categories:'}
                    </span>
                    <strong className="font-bold text-slate-900 dark:text-white font-mono">{currentStoreCats.length}</strong>
                  </div>
                  <div className="flex items-center gap-2.5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {language === 'ar' ? 'المعروض في الرئيسية:' : 'Enabled on Homepage:'}
                    </span>
                    <strong className="font-bold text-slate-900 dark:text-white font-mono">{totalHomeShelves}</strong>
                  </div>
                  <div className="flex items-center gap-2.5 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {language === 'ar' ? 'إجمالي المنتجات بالمتجر:' : 'Total Store Products:'}
                    </span>
                    <strong className="font-bold text-slate-900 dark:text-white font-mono">{(products || []).filter(p => !p.isArchived).length}</strong>
                  </div>
                </div>

                {/* Discovered Missing Categories Banner */}
                {discoveredMissingCats.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">
                          {language === 'ar' ? 'تم رصد تصنيفات مستخدمة في المنتجات ولم تُسجل كأقسام بعد:' : 'Found categories in existing products not in the official list:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {discoveredMissingCats.map(catName => (
                            <span key={catName} className="px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/50 text-[11px] font-mono font-semibold">
                              {catName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportUnregisteredProductCategories(discoveredMissingCats)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
                    >
                      {language === 'ar' ? 'اعتمادها وإدراجها كأقسام فوراً' : 'Auto-Import as Categories'}
                    </button>
                  </div>
                )}

                {/* Categories List */}
                <div className="space-y-5">
                  {currentStoreCats.map((cat, idx) => {
                    const matchingProducts = getProductsForCategory(products || [], cat, false);
                    const isEnabledOnHome = cat.enabledOnHome !== false;

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-2xl border transition-all duration-200 ${
                          isEnabledOnHome 
                            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-xs' 
                            : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 opacity-80'
                        }`}
                      >
                        {/* Card Top Bar */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/80 rounded-t-2xl">
                          
                          {/* Order & Title */}
                          <div className="flex items-center gap-2.5">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveStoreCategory(idx, 'up')}
                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'تقديم الترتيب' : 'Move Up'}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentStoreCats.length - 1}
                                onClick={() => handleMoveStoreCategory(idx, 'down')}
                                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                title={language === 'ar' ? 'تأخير الترتيب' : 'Move Down'}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold font-mono flex items-center justify-center">
                              #{idx + 1}
                            </span>

                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{language === 'ar' ? (cat.nameAr || 'قسم جديد') : (cat.nameEn || 'New Category')}</span>
                                <span className="text-[11px] font-mono text-slate-400 font-normal">
                                  ({cat.slug})
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center gap-1 font-semibold ${
                                  matchingProducts.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                                }`}>
                                  <Package className="w-3 h-3" />
                                  <span>
                                    {language === 'ar' 
                                      ? `${matchingProducts.length} منتجات مسجلة بهذا القسم` 
                                      : `${matchingProducts.length} products in this category`}
                                  </span>
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Action Controls: Homepage Toggle & Delete */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Prominent Homepage Visibility Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleStoreCategoryOnHome(cat.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                                isEnabledOnHome
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}
                              title={language === 'ar' ? 'تفعيل أو إخفاء ظهور هذا القسم في الصفحة الرئيسية' : 'Toggle Homepage Visibility'}
                            >
                              {isEnabledOnHome ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>{language === 'ar' ? 'ظاهر بالصفحة الرئيسية' : 'Shown on Home'}</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'مخفي من الرئيسية' : 'Hidden on Home'}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveStoreCategory(cat.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={language === 'ar' ? 'حذف القسم' : 'Delete Category'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 sm:p-6 space-y-5">
                          
                          {/* Row 1: Names & Slug */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1 text-right" dir="rtl">
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                {language === 'ar' ? 'اسم القسم (بالعربية) *' : 'Category Name (Arabic)'}
                              </label>
                              <input
                                type="text"
                                dir="rtl"
                                value={cat.nameAr}
                                onChange={(e) => handleUpdateStoreCategory(cat.id, { nameAr: e.target.value })}
                                placeholder="كتب ومؤلفات ورقية"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-right"
                              />
                            </div>

                            <div className="space-y-1 text-left" dir="ltr">
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                {language === 'ar' ? 'اسم القسم (بالإنجليزية)' : 'Category Name (English)'}
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={cat.nameEn}
                                onChange={(e) => handleUpdateStoreCategory(cat.id, { nameEn: e.target.value })}
                                placeholder="Books & Monographs"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-sans text-left"
                              />
                            </div>

                            <div className="space-y-1 text-left" dir="ltr">
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                {language === 'ar' ? 'المعرف الفريد (Slug)' : 'Identifier Slug'}
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={cat.slug}
                                onChange={(e) => handleUpdateStoreCategory(cat.id, { slug: e.target.value })}
                                placeholder="books"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs text-left"
                              />
                            </div>
                          </div>

                          {/* Row 2: Cultural Icon & Homepage Display Controls (Visible when enabledOnHome) */}
                          {isEnabledOnHome && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="w-4 h-4" />
                                <span>{language === 'ar' ? 'تخصيص عرض القسم في الصفحة الرئيسية (Homepage Shelf Settings)' : 'Homepage Shelf Customization'}</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                
                                {/* Home Products Preview Limit */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {language === 'ar' ? 'عدد المنتجات كمعاينة بالرئيسية' : 'Homepage Preview Limit'}
                                  </label>
                                  <select
                                    value={cat.homeLimit || 4}
                                    onChange={(e) => handleUpdateStoreCategory(cat.id, { homeLimit: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                                  >
                                    <option value={2}>{language === 'ar' ? '2 منتجات فقط' : '2 Products'}</option>
                                    <option value={3}>{language === 'ar' ? '3 منتجات' : '3 Products'}</option>
                                    <option value={4}>{language === 'ar' ? '4 منتجات (الموصى به)' : '4 Products (Recommended)'}</option>
                                    <option value={6}>{language === 'ar' ? '6 منتجات' : '6 Products'}</option>
                                    <option value={8}>{language === 'ar' ? '8 منتجات' : '8 Products'}</option>
                                  </select>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {language === 'ar' ? 'يظهر هذا العدد فقط كمعاينة، والباقي عبر زر المتجر' : 'Subset shown on home; remaining via store button'}
                                  </p>
                                </div>

                                {/* Promotional Badge Tag */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {language === 'ar' ? 'شارة القسم الترويجية (Badge)' : 'Category Tag / Badge'}
                                  </label>
                                  <input
                                    type="text"
                                    value={language === 'ar' ? (cat.badgeAr || '') : (cat.badgeEn || '')}
                                    onChange={(e) => handleUpdateStoreCategory(cat.id, {
                                      badgeAr: language === 'ar' ? e.target.value : (cat.badgeAr || e.target.value),
                                      badgeEn: language === 'en' ? e.target.value : (cat.badgeEn || e.target.value)
                                    })}
                                    placeholder={language === 'ar' ? 'مطبوعات ورقية' : 'Printed Volumes'}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                  />
                                </div>

                                {/* Icon Picker */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {language === 'ar' ? 'الأيقونة الثقافية' : 'Cultural Icon'}
                                  </label>
                                  <select
                                    value={cat.iconName || 'BookOpen'}
                                    onChange={(e) => handleUpdateStoreCategory(cat.id, { iconName: e.target.value })}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-sans"
                                  >
                                    {culturalIcons.map(icon => (
                                      <option key={icon.name} value={icon.name}>{icon.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Shelf Subtitle / Tagline */}
                              <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {language === 'ar' ? 'الوصف التوضيحي للقسم في الواجهة (Subtitle)' : 'Shelf Subtitle / Tagline'}
                                </label>
                                <input
                                  type="text"
                                  value={language === 'ar' ? (cat.subtitleAr || '') : (cat.subtitleEn || '')}
                                  onChange={(e) => handleUpdateStoreCategory(cat.id, {
                                    subtitleAr: language === 'ar' ? e.target.value : (cat.subtitleAr || e.target.value),
                                    subtitleEn: language === 'en' ? e.target.value : (cat.subtitleEn || e.target.value)
                                  })}
                                  placeholder={language === 'ar' ? 'مؤلفات ودراسات فكرية موثقة متوفرة للشحن والتوصيل الفوري' : 'In-depth published monographs and hardcovers available for delivery'}
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                              </div>

                              {/* Live Products & Direct Store Button Mockup */}
                              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 space-y-3">
                                
                                {/* Products matching chips */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {language === 'ar' ? 'معاينة المنتجات التابعة لهذا القسم:' : 'Matching Products in Store:'}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {language === 'ar' ? `سيُعرض أول ${Math.min(matchingProducts.length, cat.homeLimit || 4)} منتجات في الواجهة` : `First ${Math.min(matchingProducts.length, cat.homeLimit || 4)} shown on homepage`}
                                  </span>
                                </div>

                                {matchingProducts.length === 0 ? (
                                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>
                                      {language === 'ar' 
                                        ? `لا توجد منتجات منشورة مسجلة بتصنيف "${cat.nameAr}" أو معرف "${cat.slug}" حتى الآن. يمكنك تعيين هذا التصنيف للمنتجات من قسم المتجر.` 
                                        : `No published products currently assigned to "${cat.nameEn}". Assign this category in the Store Manager.`}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {matchingProducts.slice(0, 6).map(prod => (
                                      <div key={prod.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700">
                                        <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span className="font-semibold">{language === 'ar' ? prod.nameAr : prod.nameEn}</span>
                                        <span className="text-[10px] font-mono text-slate-500">${prod.price}</span>
                                      </div>
                                    ))}
                                    {matchingProducts.length > 6 && (
                                      <span className="text-xs text-slate-400 self-center font-mono">
                                        +{matchingProducts.length - 6} {language === 'ar' ? 'مؤلفات أخرى' : 'more'}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Interactive Mockup of the Homepage View More Button */}
                                <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                                    <span>{language === 'ar' ? '🎯 معاينة الزر التوجيهي الذي سيظهر في الصفحة الرئيسية:' : '🎯 Homepage Direct Navigation Button Mockup:'}</span>
                                    <span className="text-[10px] font-mono">{language === 'ar' ? 'توجيه فوري ومصفى' : 'Auto-Filtered'}</span>
                                  </div>
                                  
                                  <div className="inline-flex items-center justify-between w-full max-w-md px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
                                    <span>
                                      {language === 'ar'
                                        ? `تصفح كافة منتجات قسم ${cat.nameAr || 'المتجر'} (${matchingProducts.length} مؤلف) في المتجر مباشرة`
                                        : `View All ${cat.nameEn || 'Store'} Works (${matchingProducts.length}) in Store`}
                                    </span>
                                    <ArrowRight className="w-4 h-4 rtl:rotate-180 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  </div>

                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {language === 'ar'
                                      ? '⚡ عند ضغط الزائر على هذا الزر بالصفحة الرئيسية، يتم نقله فوراً إلى قسم المتجر مع اختيار وتفعيل هذا القسم تلقائياً وإظهار كافة منتجاته المسجلة.'
                                      : '⚡ Clicking this button on the homepage navigates directly to the store with this category pre-selected and all its products displayed.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })()}

        {/* ==========================================
            TAB: FOOTER & COPYRIGHT (تذييل الصفحة وحقوق النشر)
           ========================================== */}
        {activeTab === 'footer' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'تخصيص تذييل الصفحة (Footer & Copyright Settings)' : 'Footer Content & Copyright Settings'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' 
                      ? 'التحكم بنص النبذة المختصرة في الفوتر، سطر حقوق النشر المخصص، والملاحظة التوثيقية والملكية الفكرية.' 
                      : 'Customize footer mission statement, dynamic copyright text, and intellectual property disclaimers.'}
                  </p>
                </div>
              </div>

              {/* Visibility Controls for Footer & Lower Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {language === 'ar' ? 'التحكم في إظهار وإخفاء أجزاء الفوتر والجزء السفلي' : 'Footer Components Visibility Controls'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'showFooterSection' as const, labelAr: 'الفوتر والجزء السفلي بالكامل', labelEn: 'Complete Footer Section' },
                    { key: 'showFooterSocialChannels' as const, labelAr: 'قنوات ووسائل التواصل بالفوتر', labelEn: 'Footer Social Channels' },
                    { key: 'showFooterNav' as const, labelAr: 'روابط التنقل السريع بالفوتر', labelEn: 'Footer Navigation Links' },
                    { key: 'showFooterBrandInfo' as const, labelAr: 'بيانات ونبذة المنصة في الفوتر', labelEn: 'Footer Brand Bio Info' },
                    { key: 'showFooterBottomBar' as const, labelAr: 'شريط الحقوق السفلي وبوابة الدخول', labelEn: 'Footer Bottom Copyright Bar' },
                    { key: 'showFooterNewsletter' as const, labelAr: 'صندوق النشرة البريدية بالفوتر', labelEn: 'Footer Newsletter Widget' },
                  ].map((item) => {
                    const isVisible = formData.sectionVisibility?.[item.key] !== false;
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggleVisibility(item.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isVisible
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block">
                            {language === 'ar' ? item.labelAr : item.labelEn}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {isVisible ? (language === 'ar' ? 'ظاهر للزوار' : 'Visible') : (language === 'ar' ? 'مخفي حالياً' : 'Hidden')}
                          </span>
                        </div>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isVisible ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Mission / Description */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {language === 'ar' ? 'الجملة والنبذة التعريفية تحت اسم المنصة في ذيل الصفحة' : 'Brand Tagline & Description Under Platform Name in Footer'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                  <div className="space-y-1.5 text-left" dir="ltr">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Brand Tagline in Footer (English)
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={formData.footerDescriptionEn !== undefined ? formData.footerDescriptionEn : (formData.footerTextEn || '')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        footerDescriptionEn: e.target.value,
                        footerTextEn: e.target.value 
                      })}
                      placeholder="Knowledge platform showcasing published books, investigative research, and visual documentary productions."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-sans text-left"
                    />
                  </div>

                  <div className="space-y-1.5 text-right" dir="rtl">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'ar' ? 'الجملة التعريفية تحت اسم المنصة (عربي)' : 'Brand Tagline in Footer (Arabic)'}
                    </label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      value={formData.footerDescriptionAr !== undefined ? formData.footerDescriptionAr : (formData.footerTextAr || '')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        footerDescriptionAr: e.target.value,
                        footerTextAr: e.target.value 
                      })}
                      placeholder="منصة فكرية ومعرفية متكاملة تضم أحدث المؤلفات، الأبحاث المحكّمة، والسلاسل الوثائقية المرئية، مع أرشيف مفتوح للمراجع والدراسات."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-sans text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Copyright Text */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {language === 'ar' ? 'سطر حقوق النشر (Copyright Notice)' : 'Copyright Notice Line'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                  <div className="space-y-1.5 text-left" dir="ltr">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Copyright Text (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.footerCopyrightEn || ''}
                      onChange={(e) => setFormData({ ...formData, footerCopyrightEn: e.target.value })}
                      placeholder="All rights reserved © Author & Scholar"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                    />
                  </div>

                  <div className="space-y-1.5 text-right" dir="rtl">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      حقوق النشر (عربي)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.footerCopyrightAr || ''}
                      onChange={(e) => setFormData({ ...formData, footerCopyrightAr: e.target.value })}
                      placeholder="جميع الحقوق محفوظة © للمؤلف والباحث"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Disclaimer / Intellectual Property Note */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {language === 'ar' ? 'ملاحظة الأمانة العلمية والملكية الفكرية' : 'Intellectual Property & Scholarly Note'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                  <div className="space-y-1.5 text-left" dir="ltr">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scholarly Disclaimer Note (English)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.footerCustomNoteEn || ''}
                      onChange={(e) => setFormData({ ...formData, footerCustomNoteEn: e.target.value })}
                      placeholder="Monographs & publications are officially registered and protected under international intellectual property laws."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-left"
                    />
                  </div>

                  <div className="space-y-1.5 text-right" dir="rtl">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      الملاحظة التوثيقية (عربي)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.footerCustomNoteAr || ''}
                      onChange={(e) => setFormData({ ...formData, footerCustomNoteAr: e.target.value })}
                      placeholder="المؤلفات والأبحاث مسجلة رسمياً ومحمية بموجب قوانين الملكية الفكرية الدولية."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button at bottom */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (language === 'ar' ? 'جارٍ حفظ التعديلات السحابية...' : 'Updating Cloud CMS...') : (language === 'ar' ? 'حفظ ونشر التعديلات فوراً' : 'Save & Publish Updates')}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
