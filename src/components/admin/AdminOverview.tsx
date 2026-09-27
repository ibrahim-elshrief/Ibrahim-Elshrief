import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderGit2, 
  ShoppingBag, 
  ReceiptText, 
  DollarSign, 
  AlertTriangle, 
  Inbox, 
  ArrowUpRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  Send,
  Bot,
  Bell,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  Activity,
  Boxes
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { PortfolioItem, ProductItem, Order, ContactMessage, SiteSettings } from '../../types';
import { AdminTab } from './AdminLayout';
import { formatPrice } from '../../utils/currencies';
import { sendTelegramMessage, buildTelegramSummaryText, getStoredTelegramCredentials } from '../../utils/telegramService';
import { db, cleanFirestorePayload } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AdminNotificationsBell } from './AdminNotificationsBell';

export interface AdminOverviewProps {
  portfolio: PortfolioItem[];
  products: ProductItem[];
  orders: Order[];
  messages: ContactMessage[];
  articles?: any[];
  currency?: string;
  settings?: SiteSettings;
  onUpdateSettings?: (s: SiteSettings) => void;
  onNavigate?: (tab: AdminTab) => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  portfolio,
  products,
  orders,
  messages,
  currency = 'USD',
  settings,
  onUpdateSettings,
  onNavigate,
  onNavigateTab
}) => {
  const { language, t } = useLanguage();
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleNavigate = (tab: AdminTab) => {
    if (typeof onNavigate === 'function') onNavigate(tab);
    if (typeof onNavigateTab === 'function') onNavigateTab(tab);
  };

  // Instant Manual Telegram Digest on button click
  const handleSendInstantTelegramDigest = async () => {
    setIsSendingTelegram(true);
    setTelegramFeedback(null);
    try {
      const { botToken, chatId } = await getStoredTelegramCredentials(settings);

      if (!botToken || !chatId) {
        setTelegramFeedback({
          type: 'info',
          message: language === 'ar'
            ? 'يرجى ربط بوت تيليجرام أولاً من تبويب (الأمان وقنوات المالك) أو (الإعدادات) بإدخال Bot Token و Chat ID.'
            : 'Please configure your Telegram Bot Token & Chat ID first in Security or General Settings.'
        });
        setIsSendingTelegram(false);
        setTimeout(() => setTelegramFeedback(null), 5000);
        return;
      }

      const summaryText = buildTelegramSummaryText({
        orders,
        messages,
        products,
        siteSettings: settings,
        isInstantManual: true
      });

      const res = await sendTelegramMessage(
        botToken,
        chatId,
        summaryText
      );

      if (res.success) {
        setTelegramFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم إرسال الملخص الفوري بنجاح إلى حساب التيليجرام الخاص بك!'
            : 'Instant summary sent successfully to your Telegram chat!'
        });
      } else {
        setTelegramFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setTelegramFeedback({
        type: 'error',
        message: err?.message || 'فشل إرسال الملخص عبر تيليجرام'
      });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramFeedback(null), 6000);
    }
  };

  // Automated Evening Daily Digest Dispatcher (Runs once each evening)
  useEffect(() => {
    const checkAutomatedDailyDigest = async () => {
      if (!settings?.telegramDailyDigestEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      // Trigger after 19:00 (7 PM evening)
      if (currentHour < 19) return;

      const todayDateStr = now.toISOString().split('T')[0];
      if (settings.lastTelegramDigestDate === todayDateStr) {
        // Already dispatched today's evening digest
        return;
      }

      try {
        const eveningText = buildTelegramSummaryText({
          orders,
          messages,
          products,
          siteSettings: settings,
          isInstantManual: false
        });

        const res = await sendTelegramMessage(
          settings.telegramBotToken,
          settings.telegramChatId,
          eveningText
        );

        if (res.success) {
          const updatedSettings = { ...settings, lastTelegramDigestDate: todayDateStr };
          if (onUpdateSettings) {
            onUpdateSettings(updatedSettings);
          }
          await setDoc(doc(db, 'siteSettings', 'global'), cleanFirestorePayload(updatedSettings), { merge: true });
        }
      } catch (err) {
        console.warn('Auto evening digest dispatch warning:', err);
      }
    };

    checkAutomatedDailyDigest();
  }, [settings?.telegramDailyDigestEnabled, settings?.telegramBotToken, settings?.telegramChatId, settings?.lastTelegramDigestDate, orders, messages, products]);

  const totalRevenue = (orders || [])
    .filter(o => o && (o.orderStatus === 'paid' || o.orderStatus === 'completed'))
    .reduce((sum, o) => sum + (o?.total || 0), 0);

  const trackedProductsList = (products || []).filter(
    p => p && (p.type === 'physical' || (p.stock !== undefined && p.stock < 999900))
  );

  const totalWarehouseUnits = trackedProductsList.reduce(
    (sum, p) => sum + Math.max(0, p.stock || 0), 0
  );

  const lowStockProducts = trackedProductsList.filter(
    p => p && p.stock <= (p.lowStockThreshold || 10)
  );

  const unreadMessages = (messages || []).filter(m => m && m.status === 'unread');

  const statCards = [
    {
      title: language === 'ar' ? 'إجمالي المشاريع' : 'Portfolio Projects',
      value: (portfolio || []).length,
      sub: `${(portfolio || []).filter(p => p && p.status === 'published').length} ${language === 'ar' ? 'مشروع منشور' : 'published'}`,
      icon: FolderGit2,
      color: 'emerald',
      tab: 'portfolio' as const
    },
    {
      title: language === 'ar' ? 'المنتجات في المتجر' : 'Active Products',
      value: (products || []).length,
      sub: `${(products || []).filter(p => p && p.type === 'digital').length} ${language === 'ar' ? 'رقمي' : 'digital'} • ${(products || []).filter(p => p && p.type === 'physical').length} ${language === 'ar' ? 'ملموس' : 'physical'}`,
      icon: ShoppingBag,
      color: 'blue',
      tab: 'store' as const
    },
    {
      title: language === 'ar' ? 'مخزون المستودع' : 'Warehouse Stock',
      value: `${totalWarehouseUnits} ${language === 'ar' ? 'قطعة' : 'units'}`,
      sub: lowStockProducts.length > 0 
        ? `${lowStockProducts.length} ${language === 'ar' ? 'منتجات قاربت على النفاد ⚠️' : 'items low on stock ⚠️'}` 
        : (language === 'ar' ? 'جميع مستويات المخزون كافية' : 'All stock levels healthy'),
      icon: Boxes,
      color: lowStockProducts.length > 0 ? 'amber' : 'emerald',
      tab: 'inventory' as const
    },
    {
      title: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
      value: (orders || []).length,
      sub: `${(orders || []).filter(o => o && (o.orderStatus === 'paid' || o.orderStatus === 'completed')).length} ${language === 'ar' ? 'طلب مكتمل' : 'completed/paid'}`,
      icon: ReceiptText,
      color: 'purple',
      tab: 'orders' as const
    },
    {
      title: language === 'ar' ? 'إجمالي المبيعات' : 'Gross Revenue',
      value: formatPrice(totalRevenue, currency, language),
      sub: language === 'ar' ? 'مبيعات المتجر الإلكتروني' : 'Processed via cloud store',
      icon: DollarSign,
      color: 'emerald',
      tab: 'orders' as const
    }
  ];

  const getOrderStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'paid': return 'مدفوع';
        case 'completed': return 'مكتمل';
        case 'pending': return 'قيد الانتظار';
        case 'processing': return 'قيد التجهيز';
        case 'shipped': return 'تم الشحن';
        case 'delivered': return 'تم التوصيل';
        case 'cancelled': return 'ملغى';
        default: return status;
      }
    }
    return status;
  };

  // Recharts Monthly Trend Data aggregation
  const [trendViewMode, setTrendViewMode] = useState<'combined' | 'revenue' | 'orders'>('combined');
  const [trendMonthsRange, setTrendMonthsRange] = useState<6 | 12>(6);

  const monthlyTrendData = useMemo(() => {
    const monthsData: { 
      key: string; 
      name: string; 
      sales: number; 
      orders: number; 
      completedOrders: number;
    }[] = [];

    const now = new Date();
    // Build array of past N months in chronological order
    for (let i = trendMonthsRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      const monthName = d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        year: '2-digit'
      });

      monthsData.push({
        key,
        name: monthName,
        sales: 0,
        orders: 0,
        completedOrders: 0
      });
    }

    // Populate data from orders dataset
    (orders || []).forEach((ord) => {
      if (!ord || !ord.createdAt) return;
      const orderDate = new Date(ord.createdAt);
      if (isNaN(orderDate.getTime())) return;

      const orderKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthsData.find(m => m.key === orderKey);
      if (bucket) {
        bucket.orders += 1;
        const total = typeof ord.total === 'number' ? ord.total : parseFloat(String(ord.total || 0)) || 0;
        if (ord.orderStatus !== 'cancelled') {
          bucket.sales += Math.round(total);
        }
        if (ord.orderStatus === 'paid' || ord.orderStatus === 'completed' || ord.orderStatus === 'shipped') {
          bucket.completedOrders += 1;
        }
      }
    });

    return monthsData;
  }, [orders, trendMonthsRange, language]);

  const totalAnalyzedSales = monthlyTrendData.reduce((acc, curr) => acc + curr.sales, 0);
  const totalAnalyzedOrders = monthlyTrendData.reduce((acc, curr) => acc + curr.orders, 0);
  const averageOrderValue = totalAnalyzedOrders > 0 ? Math.round(totalAnalyzedSales / totalAnalyzedOrders) : 0;
  const peakMonth = [...monthlyTrendData].sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Title & Quick Actions Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'لوحة القيادة والعمليات المركزية' : 'Platform Operations Overview'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'مراقبة أداء المنصة، إدارة المحتوى، المبيعات والمخزون الحي.' 
              : 'Real-time overview of platform health, digital commerce, orders, and content CMS.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AdminNotificationsBell
            unreadMessagesCount={unreadMessages.length}
            pendingOrdersCount={(orders || []).filter(o => o && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length}
            lowStockCount={lowStockProducts.length}
            onNavigate={handleNavigate}
          />

          <button
            type="button"
            id="telegram-instant-summary-btn"
            onClick={handleSendInstantTelegramDigest}
            disabled={isSendingTelegram}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            title={language === 'ar' ? 'إرسال ملخص فوري بالأحداث حتى هذه اللحظة إلى تيليجرام' : 'Send instant snapshot to Telegram'}
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSendingTelegram 
                ? (language === 'ar' ? 'جارٍ الإرسال إلى تيليجرام...' : 'Sending to Telegram...') 
                : (language === 'ar' ? 'إرسال ملخص فوري إلى تيليجرام' : 'Send Telegram Digest')}
            </span>
          </button>

          <button
            onClick={() => handleNavigate('cms')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            {language === 'ar' ? 'تعديل نصوص وتخطيط الواجهة' : 'Edit Homepage CMS'}
          </button>
        </div>
      </div>

      {/* Telegram Feedback Banner */}
      {telegramFeedback && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border animate-in fade-in duration-200 ${
          telegramFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
            : telegramFeedback.type === 'info'
            ? 'bg-sky-50 dark:bg-cyan-950/60 border-sky-200 dark:border-cyan-800/60 text-sky-800 dark:text-cyan-300'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
            <span>{telegramFeedback.message}</span>
          </div>
          <button
            onClick={() => setTelegramFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Telegram Integration Overview Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/80 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                {language === 'ar' ? 'نظام الملخص اليومي عبر تيليجرام' : 'Telegram Automated Daily Digest'}
              </h3>
              {settings?.telegramBotToken && settings?.telegramChatId ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{language === 'ar' ? 'متصل وجاهز' : 'Connected'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400">
                  {language === 'ar' ? 'بحاجة للتهيئة' : 'Needs Config'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar'
                ? 'يرسل ملخصاً يومياً منسقاً كل مساء بالمبيعات والرسائل والمخزون، أو اضغط على الزر للإرسال فوراً.'
                : 'Formats and sends daily evening reports with sales, inquiries, and alerts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSendInstantTelegramDigest}
            disabled={isSendingTelegram}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'إرسال الملخص الآن' : 'Trigger Digest Now'}</span>
          </button>
          {(!settings?.telegramBotToken || !settings?.telegramChatId) && (
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              {language === 'ar' ? 'ضبط الربط' : 'Configure'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => handleNavigate(card.tab)}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 cursor-pointer transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                  {card.title}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {card.value}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recharts Monthly Sales Volume & Order Frequency Trend Analysis */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Chart Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <TrendingUp className="w-5 h-5" />
              <span>{language === 'ar' ? 'تحليل اتجاهات المبيعات الشهرية وتواتر الطلبات' : 'Sales Volume & Order Frequency Trends'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50">
              {language === 'ar' 
                ? 'رسم بياني تفاعلي يحلل حجم الإيرادات التراكمية وعدد الطلبات عبر دورات الشهور السابقة.' 
                : 'Interactive trend analysis visualizing monthly commercial revenue and order velocity.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTrendMonthsRange(6)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  trendMonthsRange === 6 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {language === 'ar' ? 'آخر 6 أشهر' : 'Last 6 Months'}
              </button>
              <button
                type="button"
                onClick={() => setTrendMonthsRange(12)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  trendMonthsRange === 12 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {language === 'ar' ? 'سنة كاملة' : 'Last 12 Months'}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTrendViewMode('combined')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  trendViewMode === 'combined' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {language === 'ar' ? 'مجمّع' : 'Combined'}
              </button>
              <button
                type="button"
                onClick={() => setTrendViewMode('revenue')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  trendViewMode === 'revenue' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {language === 'ar' ? 'المبيعات' : 'Sales ($)'}
              </button>
              <button
                type="button"
                onClick={() => setTrendViewMode('orders')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  trendViewMode === 'orders' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {language === 'ar' ? 'الطلبات' : 'Orders'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Analytical Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Revenue'}</span>
            <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(totalAnalyzedSales, settings?.currency || 'USD')}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</span>
            <p className="font-extrabold text-base text-slate-900 dark:text-white font-mono">
              {totalAnalyzedOrders} {language === 'ar' ? 'طلب' : 'orders'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">{language === 'ar' ? 'متوسط قيمة الطلب' : 'Average Order'}</span>
            <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(averageOrderValue, settings?.currency || 'USD')}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">{language === 'ar' ? 'ذروة الإيرادات' : 'Peak Performance'}</span>
            <p className="font-extrabold text-base text-slate-900 dark:text-white font-mono truncate">
              {peakMonth ? `${peakMonth.name} (${formatPrice(peakMonth.sales, settings?.currency || 'USD')})` : '-'}
            </p>
          </div>
        </div>

        {/* Responsive Recharts Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                yAxisId="salesAxis"
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) => `${val}`}
              />
              {trendViewMode === 'combined' && (
                <YAxis 
                  yAxisId="ordersAxis"
                  orientation="right"
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  allowDecimals={false}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'sales') {
                    return [formatPrice(Number(value) || 0, settings?.currency || 'USD'), language === 'ar' ? 'حجم المبيعات' : 'Sales Volume'];
                  }
                  if (name === 'orders') {
                    return [value, language === 'ar' ? 'عدد الطلبات' : 'Order Frequency'];
                  }
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                formatter={(val) => {
                  if (val === 'sales') return language === 'ar' ? 'حجم المبيعات' : 'Sales Volume';
                  if (val === 'orders') return language === 'ar' ? 'وتيرة الطلبات' : 'Order Frequency';
                  return val;
                }}
              />
              {(trendViewMode === 'combined' || trendViewMode === 'revenue') && (
                <Area
                  yAxisId="salesAxis"
                  type="monotone"
                  dataKey="sales"
                  name="sales"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              )}
              {(trendViewMode === 'combined' || trendViewMode === 'orders') && (
                <Bar
                  yAxisId={trendViewMode === 'combined' ? 'ordersAxis' : 'salesAxis'}
                  dataKey="orders"
                  name="orders"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock & Unread Message Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Boxes className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'متابعة المخزن وحالة التوريد' : 'Warehouse & Stock Status'}
              </h3>
            </div>
            <button
              onClick={() => handleNavigate('inventory')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{language === 'ar' ? 'توريد وإدارة المخزون' : 'Manage & Restock'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{language === 'ar' ? 'جميع مستويات المخزون الفيزيائي والمستودع ضمن المعدل الآمن والطبيعي.' : 'All warehouse stock levels are healthy.'}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map(p => {
                const isOut = p.stock <= 0;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOut ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                      <span className="font-semibold text-slate-800 dark:text-white truncate">
                        {language === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-md font-bold font-mono ${
                        isOut 
                          ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                      }`}>
                        {isOut 
                          ? (language === 'ar' ? 'نفد تماماً (0)' : 'Out of stock (0)')
                          : `${p.stock} ${language === 'ar' ? 'متبقي (الحد:' : 'left (Limit:'} ${p.lowStockThreshold || 10})`}
                      </span>
                      <button
                        onClick={() => handleNavigate('inventory')}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        {language === 'ar' ? 'توريد' : 'Restock'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unread Inquiries Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Inbox className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'الرسائل والاستفسارات الواردة' : 'Recent Inbound Messages'}
              </h3>
            </div>
            <button
              onClick={() => handleNavigate('messages')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض الكل' : 'View Inbox'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {messages.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'ar' ? 'لا توجد رسائل واردة حالياً.' : 'No customer messages in the inbox.'}
            </p>
          ) : (
            <div className="space-y-2">
              {messages.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div className="truncate max-w-[220px]">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{m.name} ({m.email})</p>
                    <p className="text-slate-500 dark:text-slate-400 truncate">{m.subject}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    m.status === 'unread' 
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300' 
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {m.status === 'unread' ? (language === 'ar' ? 'جديدة' : 'Unread') : (language === 'ar' ? 'مقروءة' : 'Read')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'أحدث المعاملات والطلبات' : 'Recent E-Commerce Orders'}
          </h3>
          <button
            onClick={() => handleNavigate('orders')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'سجل الطلبات الكامل' : 'View All Orders'}
          </button>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
            {language === 'ar' ? 'لم يتم تسجيل أي طلبات شراء بعد.' : 'No orders recorded in the platform database yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'المنتجات' : 'Items'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'القيمة' : 'Total'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      #{o.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{o.customerName}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{o.customerEmail}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {o.items.length} {language === 'ar' ? 'عناصر' : 'items'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatPrice(o.total, o.currency || currency, language)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        o.orderStatus === 'paid' || o.orderStatus === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                          : o.orderStatus === 'shipped'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-400'
                          : o.orderStatus === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
                      }`}>
                        {getOrderStatusLabel(o.orderStatus)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

