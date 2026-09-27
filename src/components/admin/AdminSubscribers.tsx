import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  UserPlus, 
  RefreshCw, 
  Calendar, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  Users,
  Sliders,
  History,
  Sparkles
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { deleteDocumentRecursively } from '../../utils/recursiveDelete';
import { useLanguage } from '../../context/LanguageContext';
import { NewsletterSubscriber, EmailCampaign, SiteSettings } from '../../types';
import { AdminEmailBroadcastModal } from './AdminEmailBroadcastModal';
import { AdminEmailSettingsModal } from './AdminEmailSettingsModal';

interface AdminSubscribersProps {
  settings?: SiteSettings;
  onUpdateSettings?: (s: SiteSettings) => void;
  onNavigateTab?: (tab: any) => void;
}

export const AdminSubscribers: React.FC<AdminSubscribersProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab
}) => {
  const { language } = useLanguage();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [copied, setCopied] = useState(false);
  
  // Email Broadcast & Settings Modals
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [emailSettingsModalOpen, setEmailSettingsModalOpen] = useState(false);
  const [textsModalOpen, setTextsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showCampaignsHistory, setShowCampaignsHistory] = useState(false);

  // Newsletter texts customization state
  const [badgeAr, setBadgeAr] = useState(settings?.newsletterBadgeAr || '');
  const [badgeEn, setBadgeEn] = useState(settings?.newsletterBadgeEn || '');
  const [titleAr, setTitleAr] = useState(settings?.newsletterTitleAr || '');
  const [titleEn, setTitleEn] = useState(settings?.newsletterTitleEn || '');
  const [subAr, setSubAr] = useState(settings?.newsletterSubAr || '');
  const [subEn, setSubEn] = useState(settings?.newsletterSubEn || '');
  const [buttonAr, setButtonAr] = useState(settings?.newsletterButtonAr || '');
  const [privacyAr, setPrivacyAr] = useState(settings?.newsletterPrivacyAr || '');
  const [savingTexts, setSavingTexts] = useState(false);

  useEffect(() => {
    if (settings) {
      setBadgeAr(settings.newsletterBadgeAr || '');
      setBadgeEn(settings.newsletterBadgeEn || '');
      setTitleAr(settings.newsletterTitleAr || '');
      setTitleEn(settings.newsletterTitleEn || '');
      setSubAr(settings.newsletterSubAr || '');
      setSubEn(settings.newsletterSubEn || '');
      setButtonAr(settings.newsletterButtonAr || '');
      setPrivacyAr(settings.newsletterPrivacyAr || '');
    }
  }, [settings]);

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newLang, setNewLang] = useState<'ar' | 'en'>('ar');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // In-app delete confirmation state (no window.confirm)
  const [subscriberToDelete, setSubscriberToDelete] = useState<NewsletterSubscriber | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'subscribers'));
      const list: NewsletterSubscriber[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          email: data.email || d.id,
          language: data.language || 'ar',
          subscribedAt: data.subscribedAt || new Date().toISOString(),
          status: data.status === 'unsubscribed' ? 'unsubscribed' : 'active',
          source: data.source || 'footer_newsletter'
        });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
      setSubscribers(list);
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
      showToast(language === 'ar' ? 'فشل تحميل قائمة المشتركين' : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'emailCampaigns'));
      const list: EmailCampaign[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EmailCampaign);
      });
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setCampaigns(list);
    } catch (err) {
      console.warn('Failed to fetch campaigns history:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
    fetchCampaigns();
  }, []);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setAddError(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Valid email required.');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const docId = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
      const payload: NewsletterSubscriber = {
        id: docId,
        email: clean,
        language: newLang,
        subscribedAt: new Date().toISOString(),
        status: 'active',
        source: 'admin_manual'
      };

      await setDoc(doc(db, 'subscribers', docId), payload);
      setSubscribers((prev) => [payload, ...prev.filter(s => s.id !== docId)]);
      setAddModalOpen(false);
      setNewEmail('');
      showToast(language === 'ar' ? 'تمت إضافة المشترك بنجاح' : 'Subscriber added successfully');
    } catch (err) {
      console.error('Failed to add subscriber:', err);
      setAddError(language === 'ar' ? 'حدث خطأ أثناء الحفظ في قاعدة البيانات.' : 'Error adding subscriber.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (sub: NewsletterSubscriber) => {
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active';
    try {
      await updateDoc(doc(db, 'subscribers', sub.id), { status: newStatus });
      setSubscribers((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: newStatus } : s))
      );
      showToast(
        language === 'ar'
          ? `تم تغيير حالة المشترك إلى: ${newStatus === 'active' ? 'نشط' : 'ملغي'}`
          : `Status updated to ${newStatus}`
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const confirmDelete = async () => {
    if (!subscriberToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDocumentRecursively('subscribers', subscriberToDelete.id, {
        subcollections: ['logs', 'campaigns']
      });
      setSubscribers((prev) => prev.filter((s) => s.id !== subscriberToDelete.id));
      showToast(language === 'ar' ? 'تم حذف المشترك وسجلاته نهائياً' : 'Subscriber deleted');
      setSubscriberToDelete(null);
    } catch (err) {
      console.error('Failed to delete subscriber recursively:', err);
      showToast(language === 'ar' ? 'فشل حذف المشترك' : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveNewsletterTexts = async () => {
    setSavingTexts(true);
    try {
      const updateData = {
        newsletterBadgeAr: badgeAr,
        newsletterBadgeEn: badgeEn,
        newsletterTitleAr: titleAr,
        newsletterTitleEn: titleEn,
        newsletterSubAr: subAr,
        newsletterSubEn: subEn,
        newsletterButtonAr: buttonAr,
        newsletterPrivacyAr: privacyAr,
      };
      await setDoc(doc(db, 'siteSettings', 'global'), updateData, { merge: true });
      if (settings && onUpdateSettings) {
        onUpdateSettings({ ...settings, ...updateData });
      }
      showToast(language === 'ar' ? 'تم حفظ نصوص النشرة والوسام الأخضر بنجاح!' : 'Newsletter texts & badge saved!');
      setTextsModalOpen(false);
    } catch (e: any) {
      showToast(e?.message || (language === 'ar' ? 'فشل حفظ النصوص' : 'Failed to save'));
    } finally {
      setSavingTexts(false);
    }
  };

  const handleCopyEmails = () => {
    const activeEmails = filteredSubscribers
      .filter((s) => s.status === 'active')
      .map((s) => s.email)
      .join(', ');

    if (!activeEmails) {
      showToast(language === 'ar' ? 'لا يوجد بريد إلكتروني لنسخه' : 'No emails to copy');
      return;
    }

    navigator.clipboard.writeText(activeEmails);
    setCopied(true);
    showToast(language === 'ar' ? 'تم نسخ جميع البريدات الإلكترونية' : 'All emails copied');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      showToast(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = ['Email', 'Language', 'Subscribed At', 'Status', 'Source'];
    const rows = subscribers.map((s) => [
      s.email,
      s.language || 'ar',
      s.subscribedAt,
      s.status,
      s.source || 'newsletter'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(language === 'ar' ? 'تم تنزيل ملف CSV بنجاح' : 'CSV exported successfully');
  };

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchQuery, statusFilter]);

  const activeCount = useMemo(() => subscribers.filter((s) => s.status === 'active').length, [subscribers]);
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return subscribers.filter((s) => {
      const d = new Date(s.subscribedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [subscribers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'مشتركو النشرة البريدية' : 'Newsletter Subscribers'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'إدارة قاعدة بيانات القراء والمتابعين المسجلين في النشرة الفكرية مع أدوات النسخ والتصدير.' 
              : 'Manage subscribers database, copy mailing lists, and export contacts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchSubscribers}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
            title={language === 'ar' ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setEmailSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title={language === 'ar' ? 'إعدادات مزود وخادم البريد الإلكتروني' : 'Email Provider & SMTP Settings'}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'ar' ? 'إعدادات مزود البريد' : 'Email Settings'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTextsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title={language === 'ar' ? 'تخصيص نصوص النشرة والوسام الأخضر والعناوين' : 'Customize Newsletter Texts & Badge'}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'نصوص النشرة والوسام الأخضر' : 'Newsletter Texts & Badge'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyEmails}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{language === 'ar' ? 'نسخ البريدات' : 'Copy Emails'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-500" />
            <span>{language === 'ar' ? 'إضافة مشترك' : 'Add'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBroadcastModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'ar' ? 'إرسال نشرة / إشعار بريدي' : 'Send Email Broadcast'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {language === 'ar' ? 'إجمالي المشتركين' : 'Total Subscribers'}
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {subscribers.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {language === 'ar' ? 'المشتركون النشطون' : 'Active Subscribers'}
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {activeCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              {language === 'ar' ? 'اشتراكات هذا الشهر' : 'Subscribed This Month'}
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {thisMonthCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setShowCampaignsHistory(!showCampaignsHistory)}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition-all group"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block group-hover:text-emerald-600 transition-colors">
              {language === 'ar' ? 'النشرات المرسلة (عرض السجل)' : 'Campaigns Sent (View)'}
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {campaigns.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'البحث عن طريق البريد الإلكتروني...' : 'Search by email...'}
            className="w-full ps-9 pe-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'active', 'unsubscribed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st === 'all' 
                ? (language === 'ar' ? 'الكل' : 'All')
                : st === 'active'
                ? (language === 'ar' ? 'النشط' : 'Active')
                : (language === 'ar' ? 'الملغي' : 'Unsubscribed')}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table / List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">{language === 'ar' ? 'جاري تحميل المشتركين...' : 'Loading subscribers...'}</span>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Mail className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد مشتركون مطابقون' : 'No subscribers found'}
            </p>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'ستظهر هنا عناوين البريد المسجلة من الفوتر أو المضافة يدوياً.' : 'Subscribers from footer will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-start">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  </th>
                  <th className="py-3.5 px-4 text-start">
                    {language === 'ar' ? 'اللغة' : 'Language'}
                  </th>
                  <th className="py-3.5 px-4 text-start">
                    {language === 'ar' ? 'تاريخ الاشتراك' : 'Subscribed Date'}
                  </th>
                  <th className="py-3.5 px-4 text-start">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="py-3.5 px-4 text-end">
                    {language === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          {sub.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-xs">{sub.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{sub.language === 'ar' ? 'العربية' : 'English'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(sub.subscribedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(sub)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          sub.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600'
                        }`}
                        title={language === 'ar' ? 'انقر لتبديل الحالة' : 'Click to toggle status'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{sub.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'ملغي' : 'Unsubscribed')}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => setSubscriberToDelete(sub)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف المشترك' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-App Delete Confirmation Modal */}
      {subscriberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد حذف المشترك' : 'Confirm Delete Subscriber'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'هذا الإجراء سيحذف العنوان نهائياً من قاعدة البيانات.' : 'This will remove the email permanently.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white truncate">
              {subscriberToDelete.email}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSubscriberToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleteLoading ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (language === 'ar' ? 'نعم، احذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <span>{language === 'ar' ? 'إضافة مشترك يدوياً' : 'Add Subscriber Manually'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'لغة المراسلة المفضلة' : 'Preferred Language'}
                </label>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value as 'ar' | 'en')}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">الإنجليزية (English)</option>
                </select>
              </div>

              {addError && (
                <div className="text-xs text-rose-500 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {addLoading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'إضافة المشترك' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaigns History Section */}
      {showCampaignsHistory && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'سجل النشرات والإشعارات البريدية المرسلة' : 'Sent Email Broadcasts & Campaigns History'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCampaignsHistory(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق السجل ✕' : 'Close ✕'}
            </button>
          </div>

          {campaignsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
              <span>{language === 'ar' ? 'جاري تحميل سجل النشرات...' : 'Loading history...'}</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {language === 'ar' ? 'لم يتم إرسال أي نشرات أو حملات بريدية حتى الآن. يمكنك إرسال أول نشرة بالضغط على "إرسال نشرة / إشعار بريدي".' : 'No email campaigns dispatched yet.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {campaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between flex-wrap gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{camp.subject || camp.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {camp.type === 'article_published' ? (language === 'ar' ? 'مقال منشور' : 'Article')
                          : camp.type === 'product_offer' ? (language === 'ar' ? 'عرض متجر' : 'Store Deal')
                          : camp.type === 'welcome' ? (language === 'ar' ? 'ترحيب' : 'Welcome')
                          : (language === 'ar' ? 'بيان مخصص' : 'Broadcast')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(camp.sentAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} • {camp.recipientsCount} {language === 'ar' ? 'مستلم' : 'recipients'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      camp.status === 'sent' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}>
                      {camp.status === 'sent' ? (language === 'ar' ? 'تم الإرسال' : 'Sent') : (language === 'ar' ? 'تمت المعالجة' : 'Processed')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Broadcast / Campaign Modal */}
      <AdminEmailBroadcastModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        subscribers={subscribers}
        onOpenSettings={() => setEmailSettingsModalOpen(true)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchCampaigns();
        }}
      />

      {/* Email Provider & SMTP Settings Modal */}
      <AdminEmailSettingsModal
        isOpen={emailSettingsModalOpen}
        onClose={() => setEmailSettingsModalOpen(false)}
        onSaved={(msg) => {
          showToast(msg);
        }}
      />

      {/* Newsletter Texts & Badge Customization Modal */}
      {textsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'تخصيص نصوص النشرة الفكرية والوسام الأخضر' : 'Customize Newsletter Texts & Badge'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'تعديل النص الأخضر، العنوان الرئيسي، والوصف التوضيحي للنشرة' : 'Configure green badge, main headline, and subtitle'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTextsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Green Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                  {language === 'ar' ? 'النص الأخضر (الوسام / الشارة العلوية)' : 'Green Pill Badge Text'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: إصدارات ومحتوى دوري"
                    value={badgeAr}
                    onChange={(e) => setBadgeAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Curated Publications"
                    value={badgeEn}
                    onChange={(e) => setBadgeEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'العنوان الرئيسي للنشرة' : 'Main Headline'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: المشتركون والنشرة الفكرية"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Subscribers & Curated Newsletter"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'الوصف التوضيحي للنشرة' : 'Newsletter Subtitle'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <textarea
                    rows={2}
                    dir="rtl"
                    placeholder="مثال: أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك."
                    value={subAr}
                    onChange={(e) => setSubAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <textarea
                    rows={2}
                    dir="ltr"
                    placeholder="e.g. Latest publications, research studies, audio-visual works, and curated releases."
                    value={subEn}
                    onChange={(e) => setSubEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Button text & Privacy note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نص زر الاشتراك' : 'Button Text'}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: اشتراك"
                    value={buttonAr}
                    onChange={(e) => setButtonAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'عبارة الخصوصية' : 'Privacy Note'}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: خصوصية تامة، بدون رسائل مزعجة..."
                    value={privacyAr}
                    onChange={(e) => setPrivacyAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTextsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveNewsletterTexts}
                disabled={savingTexts}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingTexts ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ النصوص فورياً' : 'Save Texts Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
