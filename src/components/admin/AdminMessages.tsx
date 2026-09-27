import React, { useState, useMemo } from 'react';
import { 
  Inbox, 
  Mail, 
  Trash2, 
  Archive, 
  CheckCircle2, 
  X, 
  Calendar, 
  Clock,
  Filter,
  Search,
  CheckCheck,
  RotateCcw,
  RotateCw,
  ChevronDown,
  CalendarDays,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  MailOpen,
  AlertTriangle,
  FileSpreadsheet,
  Tag,
  Briefcase,
  User,
  AlertCircle,
  HelpCircle,
  SearchX
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ContactMessage } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { deleteDocumentRecursively } from '../../utils/recursiveDelete';

export type DateFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';
export type StatusFilterType = 'all' | 'unread' | 'read' | 'archived';
export type MessageTagType = 'all' | 'work' | 'personal' | 'urgent' | 'general';

interface AdminMessagesProps {
  messages: ContactMessage[];
  onRefresh: () => void;
}

export const AdminMessages: React.FC<AdminMessagesProps> = ({
  messages = [],
  onRefresh
}) => {
  const { language } = useLanguage();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Bulk Selection State
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Filter States
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [tagFilter, setTagFilter] = useState<MessageTagType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  // Helper to verify if a date falls within the selected date filter
  const matchesDateFilter = (dateStr: string, filter: DateFilterType): boolean => {
    if (filter === 'all') return true;
    if (!dateStr) return false;

    const msgDate = new Date(dateStr);
    if (isNaN(msgDate.getTime())) return false;

    const now = new Date();

    if (filter === 'today') {
      return (
        msgDate.getFullYear() === now.getFullYear() &&
        msgDate.getMonth() === now.getMonth() &&
        msgDate.getDate() === now.getDate()
      );
    }

    if (filter === 'this_week') {
      // Calculate start of current week (Sunday midnight)
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay(); // 0: Sun, 1: Mon, ...
      startOfWeek.setDate(now.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      return msgDate >= startOfWeek && msgDate <= endOfWeek;
    }

    if (filter === 'this_month') {
      return (
        msgDate.getFullYear() === now.getFullYear() &&
        msgDate.getMonth() === now.getMonth()
      );
    }

    if (filter === 'this_year') {
      return msgDate.getFullYear() === now.getFullYear();
    }

    if (filter === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (!isNaN(start.getTime()) && msgDate < start) {
          return false;
        }
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59.999');
        if (!isNaN(end.getTime()) && msgDate > end) {
          return false;
        }
      }
      return true;
    }

    return true;
  };

  // Counts for each date category
  const dateCounts = useMemo(() => {
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let thisYear = 0;

    messages.forEach((m) => {
      if (matchesDateFilter(m.createdAt, 'today')) today++;
      if (matchesDateFilter(m.createdAt, 'this_week')) thisWeek++;
      if (matchesDateFilter(m.createdAt, 'this_month')) thisMonth++;
      if (matchesDateFilter(m.createdAt, 'this_year')) thisYear++;
    });

    return {
      all: messages.length,
      today,
      this_week: thisWeek,
      this_month: thisMonth,
      this_year: thisYear
    };
  }, [messages]);

  // Filtered Messages based on search, date filter, status filter, and tag filter
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // 1. Date Filter
      if (!matchesDateFilter(m.createdAt, dateFilter)) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }

      // 3. Tag Filter
      if (tagFilter !== 'all') {
        const msgTag = m.tag || 'general';
        if (msgTag !== tagFilter) {
          return false;
        }
      }

      // 4. Search Query - matches sender name, email, or content text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = m.name?.toLowerCase().includes(query);
        const emailMatch = m.email?.toLowerCase().includes(query);
        const subjectMatch = m.subject?.toLowerCase().includes(query);
        const messageMatch = m.message?.toLowerCase().includes(query);

        if (!nameMatch && !emailMatch && !subjectMatch && !messageMatch) {
          return false;
        }
      }

      return true;
    });
  }, [messages, dateFilter, statusFilter, tagFilter, searchQuery, customStartDate, customEndDate]);

  // Bulk Selection Helpers
  const filteredMessageIds = useMemo(() => {
    return filteredMessages.map((m) => m.id);
  }, [filteredMessages]);

  const isAllSelected = useMemo(() => {
    if (filteredMessageIds.length === 0) return false;
    return filteredMessageIds.every((id) => selectedMessageIds.has(id));
  }, [filteredMessageIds, selectedMessageIds]);

  const isPartiallySelected = useMemo(() => {
    if (isAllSelected || selectedMessageIds.size === 0) return false;
    return filteredMessageIds.some((id) => selectedMessageIds.has(id));
  }, [isAllSelected, filteredMessageIds, selectedMessageIds]);

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      // Deselect all visible
      const newSelected = new Set(selectedMessageIds);
      filteredMessageIds.forEach((id) => newSelected.delete(id));
      setSelectedMessageIds(newSelected);
    } else {
      // Select all visible
      const newSelected = new Set(selectedMessageIds);
      filteredMessageIds.forEach((id) => newSelected.add(id));
      setSelectedMessageIds(newSelected);
    }
  };

  const handleToggleSelectMessage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedMessageIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMessageIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedMessageIds(new Set());
  };

  // Bulk Mark as Read
  const handleBulkMarkAsRead = async () => {
    const idsToUpdate = Array.from(selectedMessageIds);
    if (idsToUpdate.length === 0) return;

    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      idsToUpdate.forEach((id) => {
        batch.update(doc(db, 'messages', id), { status: 'read' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark selected messages as read:', err);
    }

    onRefresh();
    setBatchActionLoading(false);
  };

  // Bulk Mark as Unread
  const handleBulkMarkAsUnread = async () => {
    const idsToUpdate = Array.from(selectedMessageIds);
    if (idsToUpdate.length === 0) return;

    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      idsToUpdate.forEach((id) => {
        batch.update(doc(db, 'messages', id), { status: 'unread' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark selected messages as unread:', err);
    }

    onRefresh();
    setBatchActionLoading(false);
  };

  // Bulk Delete Selected Messages
  const handleConfirmBulkDelete = async () => {
    const idsToDelete = Array.from(selectedMessageIds);
    if (idsToDelete.length === 0) return;

    setDeleteLoading(true);
    try {
      // Recursively delete each document to ensure clean subcollections
      await Promise.all(
        idsToDelete.map((id) =>
          deleteDocumentRecursively('messages', id, {
            subcollections: ['replies', 'notes', 'history']
          })
        )
      );
    } catch (err) {
      console.error('Failed to bulk delete messages from db:', err);
    }

    if (selectedMessage && idsToDelete.includes(selectedMessage.id)) {
      setSelectedMessage(null);
    }
    clearSelection();
    setIsBulkDeleteModalOpen(false);
    onRefresh();
    setDeleteLoading(false);
  };

  // Export to CSV Function
  const handleExportToCSV = () => {
    // If messages are selected, export selected; otherwise export all currently filtered messages
    const targetMessages = selectedMessageIds.size > 0
      ? messages.filter((m) => selectedMessageIds.has(m.id))
      : filteredMessages.length > 0 
        ? filteredMessages 
        : messages;

    if (targetMessages.length === 0) return;

    const headers = language === 'ar'
      ? ['معرف الرسالة', 'تاريخ ووقت الإرسال', 'اسم المرسل', 'البريد الإلكتروني', 'الموضوع', 'محتوى الرسالة', 'التصنيف', 'الحالة']
      : ['Message ID', 'Date & Time', 'Sender Name', 'Email', 'Subject', 'Message Content', 'Tag', 'Status'];

    const rows = targetMessages.map((m) => {
      const dateFormatted = new Date(m.createdAt).toISOString();
      const nameClean = (m.name || '').replace(/"/g, '""');
      const emailClean = (m.email || '').replace(/"/g, '""');
      const subjectClean = (m.subject || '').replace(/"/g, '""');
      const contentClean = (m.message || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
      const tagLabel = getTagLabel(m.tag || 'general');
      const statusLabel = m.status === 'unread' ? (language === 'ar' ? 'غير مقروءة' : 'Unread')
        : m.status === 'read' ? (language === 'ar' ? 'مقروءة' : 'Read')
        : (language === 'ar' ? 'مؤرشفة' : 'Archived');

      return [
        `"${m.id}"`,
        `"${dateFormatted}"`,
        `"${nameClean}"`,
        `"${emailClean}"`,
        `"${subjectClean}"`,
        `"${contentClean}"`,
        `"${tagLabel}"`,
        `"${statusLabel}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `messages-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle read / unread directly from list
  const handleToggleReadStatus = async (m: ContactMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus: 'read' | 'unread' = m.status === 'unread' ? 'read' : 'unread';
    try {
      await updateDoc(doc(db, 'messages', m.id), { status: nextStatus });
    } catch (err) {
      console.warn('Failed to update message status in db:', err);
    }
    if (selectedMessage?.id === m.id) {
      setSelectedMessage({ ...selectedMessage, status: nextStatus });
    }
    onRefresh();
  };

  // Assign or update tag for single message
  const handleUpdateMessageTag = async (m: ContactMessage, newTag: 'work' | 'personal' | 'urgent' | 'general', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateDoc(doc(db, 'messages', m.id), { tag: newTag });
    } catch (err) {
      console.warn('Failed to update message tag in db:', err);
    }
    if (selectedMessage?.id === m.id) {
      setSelectedMessage({ ...selectedMessage, tag: newTag });
    }
    onRefresh();
  };

  // Bulk tag assignment
  const handleBulkAssignTag = async (newTag: 'work' | 'personal' | 'urgent' | 'general') => {
    const idsToUpdate = Array.from(selectedMessageIds);
    if (idsToUpdate.length === 0) return;

    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      idsToUpdate.forEach((id) => {
        batch.update(doc(db, 'messages', id), { tag: newTag });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to bulk assign tag:', err);
    }
    onRefresh();
    setBatchActionLoading(false);
  };

  const handleOpenMessage = async (m: ContactMessage) => {
    setSelectedMessage(m);
    if (m.status === 'unread') {
      try {
        await updateDoc(doc(db, 'messages', m.id), { status: 'read' });
      } catch (err) {
        console.warn('Failed to mark message read in db:', err);
      }
      onRefresh();
    }
  };

  const handleToggleArchive = async (m: ContactMessage) => {
    const nextStatus = m.status === 'archived' ? 'read' : 'archived';
    try {
      await updateDoc(doc(db, 'messages', m.id), { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle archive in db:', err);
    }
    onRefresh();
    if (selectedMessage?.id === m.id) {
      setSelectedMessage({ ...selectedMessage, status: nextStatus });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadList = filteredMessages.filter((m) => m.status === 'unread');
    if (unreadList.length === 0) return;

    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      unreadList.forEach((msg) => {
        const ref = doc(db, 'messages', msg.id);
        batch.update(ref, { status: 'read' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
    onRefresh();
    setBatchActionLoading(false);
  };

  const handleDeletePrompt = (m: ContactMessage) => {
    setMessageToDelete(m);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDocumentRecursively('messages', messageToDelete.id, {
        subcollections: ['replies', 'notes', 'history']
      });
    } catch (err) {
      console.error('Failed to delete message recursively from db:', err);
    }
    if (selectedMessage?.id === messageToDelete.id) setSelectedMessage(null);
    if (selectedMessageIds.has(messageToDelete.id)) {
      const newSet = new Set(selectedMessageIds);
      newSet.delete(messageToDelete.id);
      setSelectedMessageIds(newSet);
    }
    setMessageToDelete(null);
    onRefresh();
    setDeleteLoading(false);
  };

  const handleDateFilterSelect = (filterType: DateFilterType) => {
    setDateFilter(filterType);
    if (filterType === 'custom') {
      setShowCustomDateInputs(true);
    } else {
      setShowCustomDateInputs(false);
    }
  };

  const resetAllFilters = () => {
    setDateFilter('all');
    setStatusFilter('all');
    setTagFilter('all');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDateInputs(false);
  };

  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'unread': return 'غير مقروءة';
        case 'read': return 'مقروءة';
        case 'archived': return 'مؤرشفة';
        default: return status;
      }
    }
    return status.toUpperCase();
  };

  const getTagLabel = (tag?: string) => {
    if (language === 'ar') {
      switch (tag) {
        case 'work': return 'عمل';
        case 'personal': return 'شخصي';
        case 'urgent': return 'عاجل';
        default: return 'عام';
      }
    }
    switch (tag) {
      case 'work': return 'Work';
      case 'personal': return 'Personal';
      case 'urgent': return 'Urgent';
      default: return 'General';
    }
  };

  const getTagBadgeStyle = (tag?: string) => {
    switch (tag) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
      case 'work':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
      case 'personal':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900/60';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const unreadTotal = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto admin-scope">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Inbox className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'رسائل التواصل وصندوق الوارد' : 'Direct Inquiries & Messages'}</span>
            {unreadTotal > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-xs">
                {unreadTotal} {language === 'ar' ? 'جديدة' : 'new'}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'متابعة استفسارات الزوار والباحثين، تحديد الرسائل بالجملة، التصدير إلى ملف CSV، والفلترة المتقدمة.' 
              : 'Review user inquiries, manage messages in bulk, export history to CSV, and filter communication archives.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to CSV Button */}
          <button
            onClick={handleExportToCSV}
            disabled={messages.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title={language === 'ar' ? 'تصدير سجل الرسائل إلى ملف CSV' : 'Export messages to CSV spreadsheet'}
          >
            <Download className="w-4 h-4" />
            <span>
              {language === 'ar' 
                ? (selectedMessageIds.size > 0 ? `تصدير المحددة (${selectedMessageIds.size})` : 'تصدير إلى CSV') 
                : (selectedMessageIds.size > 0 ? `Export Selected (${selectedMessageIds.size})` : 'Export to CSV')}
            </span>
          </button>

          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={batchActionLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title={language === 'ar' ? 'تحديد كافة الرسائل كمقروءة' : 'Mark all as read'}
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={language === 'ar' ? 'تحديث القائمة' : 'Refresh messages'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Date Period Range Picker Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'تصفية حسب التاريخ والوقت (Date Range):' : 'Filter by Date Range:'}</span>
          </div>

          {(dateFilter !== 'all' || statusFilter !== 'all' || searchQuery || customStartDate || customEndDate) && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إلغاء الفلاتر والعودة للكل' : 'Reset all filters'}</span>
            </button>
          )}
        </div>

        {/* Date Range Picker Tabs: Today, This Week, This Month, This Year, Custom Range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* الكل */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              dateFilter === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'الكل' : 'All'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dateCounts.all}
            </span>
          </button>

          {/* Today / اليوم */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              dateFilter === 'today'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'اليوم (Today)' : 'Today'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'today' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dateCounts.today}
            </span>
          </button>

          {/* This Week / هذا الأسبوع */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('this_week')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              dateFilter === 'this_week'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'هذا الأسبوع (This Week)' : 'This Week'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'this_week' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dateCounts.this_week}
            </span>
          </button>

          {/* This Month / هذا الشهر */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('this_month')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              dateFilter === 'this_month'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'هذا الشهر (This Month)' : 'This Month'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'this_month' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dateCounts.this_month}
            </span>
          </button>

          {/* This Year / هذا العام */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('this_year')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              dateFilter === 'this_year'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'هذا العام (This Year)' : 'This Year'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              dateFilter === 'this_year' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {dateCounts.this_year}
            </span>
          </button>

          {/* Custom Range / نطاق مخصص */}
          <button
            type="button"
            onClick={() => handleDateFilterSelect('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              dateFilter === 'custom'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'نطاق مخصص (Custom Range)' : 'Custom Range'}</span>
          </button>
        </div>

        {/* Custom Date Inputs Section */}
        {showCustomDateInputs && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                {language === 'ar' ? 'من تاريخ:' : 'From:'}
              </span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                {language === 'ar' ? 'إلى تاريخ:' : 'To:'}
              </span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>

            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
              >
                {language === 'ar' ? 'مسح التاريخ' : 'Clear Dates'}
              </button>
            )}
          </div>
        )}

        {/* Search Bar & Status Filter */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar - filtering by sender name, email, or content text */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              id="messages-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم، البريد الإلكتروني، الموضوع، أو نص الرسالة...' : 'Search by sender name, email, subject, or message text...'}
              className="w-full ps-10 pe-9 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
            {searchQuery && (
              <button
                id="messages-clear-search-btn"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={language === 'ar' ? 'مسح البحث' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {(['all', 'unread', 'read', 'archived'] as StatusFilterType[]).map((st) => (
              <button
                key={st}
                id={`filter-status-btn-${st}`}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {st === 'all' && (language === 'ar' ? 'كل الحالات' : 'All Status')}
                {st === 'unread' && (language === 'ar' ? 'غير مقروءة' : 'Unread')}
                {st === 'read' && (language === 'ar' ? 'مقروءة' : 'Read')}
                {st === 'archived' && (language === 'ar' ? 'مؤرشفة' : 'Archived')}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Categorization Filter Tabs */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 me-1">
            <Tag className="w-3 h-3 text-emerald-500" />
            <span>{language === 'ar' ? 'التصنيف:' : 'Category:'}</span>
          </span>
          {(['all', 'work', 'personal', 'urgent', 'general'] as MessageTagType[]).map((tag) => (
            <button
              key={tag}
              id={`filter-tag-btn-${tag}`}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                tagFilter === tag
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tag === 'work' && <Briefcase className="w-3 h-3" />}
              {tag === 'personal' && <User className="w-3 h-3" />}
              {tag === 'urgent' && <AlertCircle className="w-3 h-3 text-rose-400" />}
              {tag === 'general' && <HelpCircle className="w-3 h-3" />}
              <span>
                {tag === 'all' && (language === 'ar' ? 'كافة التصنيفات' : 'All Categories')}
                {tag === 'work' && (language === 'ar' ? 'عمل (Work)' : 'Work')}
                {tag === 'personal' && (language === 'ar' ? 'شخصي (Personal)' : 'Personal')}
                {tag === 'urgent' && (language === 'ar' ? 'عاجل (Urgent)' : 'Urgent')}
                {tag === 'general' && (language === 'ar' ? 'عام (General)' : 'General')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Floating/Pinned Toolbar when items are selected */}
      {selectedMessageIds.size > 0 && (
        <div id="bulk-selection-toolbar" className="rounded-2xl p-3 sm:p-4 bg-slate-900 text-white dark:bg-slate-800 shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {selectedMessageIds.size}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                {language === 'ar' 
                  ? `تم تحديد ${selectedMessageIds.size} رسالة من القائمة` 
                  : `${selectedMessageIds.size} message(s) selected`}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' 
                  ? 'اختر الإجراء المطلوب تطبيقه على الرسائل المحددة' 
                  : 'Choose an action to apply to the selected messages'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Mark as Read */}
            <button
              id="bulk-mark-read-btn"
              onClick={handleBulkMarkAsRead}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'ar' ? 'تحديد كمقروءة' : 'Mark as Read'}</span>
            </button>

            {/* Mark as Unread */}
            <button
              id="bulk-mark-unread-btn"
              onClick={handleBulkMarkAsUnread}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
            >
              <MailOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'ar' ? 'تحديد كغير مقروءة' : 'Mark as Unread'}</span>
            </button>

            {/* Bulk Tagging Selector */}
            <div className="relative inline-flex items-center">
              <select
                id="bulk-tag-select"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAssignTag(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                disabled={batchActionLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-100 text-xs font-semibold border border-slate-700 cursor-pointer disabled:opacity-50 focus:outline-none"
              >
                <option value="" disabled>
                  {language === 'ar' ? '🏷️ تصنيف المحددة إلى...' : '🏷️ Tag Selected as...'}
                </option>
                <option value="work">{language === 'ar' ? '💼 عمل (Work)' : '💼 Work'}</option>
                <option value="personal">{language === 'ar' ? '👤 شخصي (Personal)' : '👤 Personal'}</option>
                <option value="urgent">{language === 'ar' ? '🚨 عاجل (Urgent)' : '🚨 Urgent'}</option>
                <option value="general">{language === 'ar' ? '📁 عام (General)' : '📁 General'}</option>
              </select>
            </div>

            {/* Delete Selected */}
            <button
              id="bulk-delete-btn"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'حذف المحددة' : 'Delete Selected'}</span>
            </button>

            {/* Clear Selection */}
            <button
              id="bulk-clear-selection-btn"
              onClick={clearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={language === 'ar' ? 'إلغاء التحديد' : 'Deselect all'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Counter Notice */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          {language === 'ar' 
            ? `عرض ${filteredMessages.length} من إجمالي ${messages.length} رسالة`
            : `Showing ${filteredMessages.length} of ${messages.length} messages`}
        </span>
        {dateFilter !== 'all' && (
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {dateFilter === 'today' && (language === 'ar' ? '• نطاق اليوم' : '• Today')}
            {dateFilter === 'this_week' && (language === 'ar' ? '• نطاق هذا الأسبوع' : '• This Week')}
            {dateFilter === 'this_month' && (language === 'ar' ? '• نطاق هذا الشهر' : '• This Month')}
            {dateFilter === 'this_year' && (language === 'ar' ? '• نطاق هذا العام' : '• This Year')}
            {dateFilter === 'custom' && (language === 'ar' ? '• تاريخ مخصص' : '• Custom Date Range')}
          </span>
        )}
      </div>

      {/* Messages Table with Checkboxes */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                {/* Checkbox Select All */}
                <th className="py-3.5 px-4 w-10 text-center">
                  <button
                    id="select-all-messages-btn"
                    type="button"
                    onClick={handleSelectAllToggle}
                    disabled={filteredMessages.length === 0}
                    className="cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30 inline-flex items-center justify-center"
                    title={isAllSelected ? (language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect all') : (language === 'ar' ? 'تحديد كل المعروض' : 'Select all')}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isPartiallySelected ? (
                      <MinusSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المرسل' : 'Sender'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الموضوع والرسالة' : 'Subject & Message'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التصنيف' : 'Tag'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'تاريخ الإرسال' : 'Date'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 px-4">
                    {/* Illustrative Empty State depending on whether search/filter or empty inbox */}
                    {searchQuery.trim() ? (
                      /* No Search Results State */
                      <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-500 shadow-sm">
                          <SearchX className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                            {language === 'ar' ? 'لم يتم العثور على نتائج للبحث' : 'No matching messages found'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {language === 'ar' 
                              ? `لم تتطابق أي رسالة مع "${searchQuery}". تأكد من صحة الكلمات أو جرب كلمات مفتاحية أخرى.`
                              : `No messages match "${searchQuery}". Please check the spelling or try broader search terms.`}
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            id="empty-clear-search-btn"
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'مسح عبارة البحث' : 'Clear Search Query'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (dateFilter !== 'all' || statusFilter !== 'all' || tagFilter !== 'all') ? (
                      /* Filter Yielded No Results State */
                      <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center mx-auto text-blue-500 shadow-sm">
                          <Filter className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                            {language === 'ar' ? 'لا توجد رسائل مطابقة للفلاتر النشطة' : 'No messages match active filters'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            {language === 'ar'
                              ? 'الفلاتر الحالية (التاريخ أو الحالة أو التصنيف) لا تحتوي على رسائل مستلمة.'
                              : 'The active date, status, or category filters currently do not match any incoming messages.'}
                          </p>
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          <button
                            id="empty-reset-filters-btn"
                            type="button"
                            onClick={resetAllFilters}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Entirely Empty Inbox State */
                      <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 shadow-inner">
                          <Inbox className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                            {language === 'ar' ? 'صندوق الوارد فارغ تماماً' : 'Your inbox is completely clear'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                            {language === 'ar'
                              ? 'لم تتلق أي رسائل اتصال من الزوار حتى الآن. ستظهر جميع الرسائل الواردة هنا فور إرسالها.'
                              : 'No visitor inquiries or messages have been received yet. New submissions will appear here instantly.'}
                          </p>
                        </div>
                        <div className="pt-1">
                          <button
                            id="empty-refresh-inbox-btn"
                            type="button"
                            onClick={onRefresh}
                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'تحديث الصندوق الآن' : 'Refresh Inbox Now'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = selectedMessageIds.has(m.id);
                  const currentTag = m.tag || 'general';
                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => handleOpenMessage(m)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40'
                          : m.status === 'unread' 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-semibold' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`select-message-checkbox-${m.id}`}
                          type="button"
                          onClick={(e) => handleToggleSelectMessage(m.id, e)}
                          className="cursor-pointer text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center justify-center p-1 rounded-md"
                          title={isSelected ? (language === 'ar' ? 'إلغاء تحديد الرسالة' : 'Deselect message') : (language === 'ar' ? 'تحديد الرسالة' : 'Select message')}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {m.status === 'unread' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{m.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Message Content */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs">{m.subject}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-sm mt-0.5">{m.message}</p>
                      </td>

                      {/* Tag / Category Column with Direct Dropdown Assignment */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex items-center">
                          <select
                            id={`message-tag-select-${m.id}`}
                            value={currentTag}
                            onChange={(e) => handleUpdateMessageTag(m, e.target.value as any)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer focus:outline-none transition-colors ${getTagBadgeStyle(currentTag)}`}
                          >
                            <option value="work">{language === 'ar' ? '💼 عمل' : '💼 Work'}</option>
                            <option value="personal">{language === 'ar' ? '👤 شخصي' : '👤 Personal'}</option>
                            <option value="urgent">{language === 'ar' ? '🚨 عاجل' : '🚨 Urgent'}</option>
                            <option value="general">{language === 'ar' ? '📁 عام' : '📁 General'}</option>
                          </select>
                        </div>
                      </td>

                      {/* Status with Direct Toggle Button */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`toggle-read-status-btn-${m.id}`}
                          type="button"
                          onClick={(e) => handleToggleReadStatus(m, e)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                            m.status === 'unread'
                              ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                              : m.status === 'read'
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                          }`}
                          title={m.status === 'unread' 
                            ? (language === 'ar' ? 'اضغط للتبديل إلى مقروءة' : 'Click to mark as read') 
                            : (language === 'ar' ? 'اضغط للتبديل إلى غير مقروءة' : 'Click to mark as unread')}
                        >
                          {m.status === 'unread' ? (
                            <>
                              <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{getStatusLabel(m.status)}</span>
                            </>
                          ) : (
                            <>
                              <MailOpen className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>{getStatusLabel(m.status)}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        <div>{new Date(m.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Single Actions */}
                      <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Read/Unread Quick Toggle Icon */}
                          <button
                            id={`quick-toggle-read-${m.id}`}
                            type="button"
                            onClick={(e) => handleToggleReadStatus(m, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title={m.status === 'unread' 
                              ? (language === 'ar' ? 'تبديل إلى مقروءة' : 'Mark as read') 
                              : (language === 'ar' ? 'تبديل إلى غير مقروءة' : 'Mark as unread')}
                          >
                            {m.status === 'unread' ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                          </button>

                          {/* Archive/Unarchive */}
                          <button
                            id={`toggle-archive-${m.id}`}
                            type="button"
                            onClick={() => handleToggleArchive(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title={m.status === 'archived' ? (language === 'ar' ? 'إلغاء الأرشفة' : 'Unarchive') : (language === 'ar' ? 'أرشفة' : 'Archive')}
                          >
                            <Archive className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            id={`delete-message-${m.id}`}
                            type="button"
                            onClick={() => handleDeletePrompt(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                            title={language === 'ar' ? 'حذف الرسالة' : 'Delete'}
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

      {/* Message Viewer Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'تاريخ الاستلام:' : 'Received:'} {new Date(selectedMessage.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </span>
              <button onClick={() => setSelectedMessage(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {selectedMessage.subject}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {language === 'ar' ? 'من:' : 'From:'} {selectedMessage.name}
                  </h3>
                  <a href={`mailto:${selectedMessage.email}`} className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-mono">
                    {selectedMessage.email}
                  </a>
                </div>

                {/* Tag Selector in Detail Modal */}
                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'تصنيف الرسالة:' : 'Message Tag:'}
                  </span>
                  <select
                    id="detail-modal-tag-select"
                    value={selectedMessage.tag || 'general'}
                    onChange={(e) => handleUpdateMessageTag(selectedMessage, e.target.value as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none transition-colors ${getTagBadgeStyle(selectedMessage.tag || 'general')}`}
                  >
                    <option value="work">{language === 'ar' ? '💼 عمل (Work)' : '💼 Work'}</option>
                    <option value="personal">{language === 'ar' ? '👤 شخصي (Personal)' : '👤 Personal'}</option>
                    <option value="urgent">{language === 'ar' ? '🚨 عاجل (Urgent)' : '🚨 Urgent'}</option>
                    <option value="general">{language === 'ar' ? '📁 عام (General)' : '📁 General'}</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {selectedMessage.message}
              </div>

              <div className="flex justify-between items-center pt-2">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الرد عبر البريد الإلكتروني' : 'Reply via Email'}</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleArchive(selectedMessage)}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    {selectedMessage.status === 'archived' ? (language === 'ar' ? 'استعادة للوارد' : 'Move to Inbox') : (language === 'ar' ? 'أرشفة' : 'Archive')}
                  </button>
                  <button
                    onClick={() => handleDeletePrompt(selectedMessage)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-300 dark:hover:border-rose-900/50 cursor-pointer transition-colors"
                    title={language === 'ar' ? 'حذف الرسالة' : 'Delete Message'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Single Message Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد حذف الرسالة' : 'Confirm Delete Message'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? 'سيتم حذف رسالة الاستفسار نهائياً من صندوق الوارد.' : 'This message will be permanently deleted.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white mb-1">{messageToDelete.name} ({messageToDelete.email})</p>
              <p className="text-slate-500 dark:text-slate-400 truncate">{messageToDelete.subject || messageToDelete.message}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'نعم، احذف الرسالة' : 'Yes, Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 admin-scope">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد حذف الرسائل المحددة' : 'Confirm Bulk Delete Messages'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' 
                    ? `هل أنت متأكد من حذف ${selectedMessageIds.size} رسالة محددة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.` 
                    : `Are you sure you want to permanently delete ${selectedMessageIds.size} selected message(s)? This action cannot be undone.`}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
              {language === 'ar' 
                ? `سيتم حذف كافة السجلات والردود المرتبطة بالـ ${selectedMessageIds.size} رسالة المختارة من قاعدة البيانات.`
                : `All records and logs associated with the ${selectedMessageIds.size} selected messages will be removed.`}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteLoading ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? `نعم، احذف (${selectedMessageIds.size}) رسائل` : `Yes, Delete (${selectedMessageIds.size})`)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
