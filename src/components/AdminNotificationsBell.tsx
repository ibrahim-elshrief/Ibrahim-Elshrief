import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShoppingBag, 
  Mail, 
  UserPlus, 
  X, 
  Check, 
  ExternalLink, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, ContactMessage, AdminTab } from '../types';
import { formatPrice } from '../utils/currencies';

interface AdminNotificationsBellProps {
  orders?: Order[];
  messages?: ContactMessage[];
  currency?: string;
  onNavigateAdminTab?: (tab: AdminTab) => void;
  floating?: boolean;
}

export const AdminNotificationsBell: React.FC<AdminNotificationsBellProps> = ({
  orders = [],
  messages = [],
  currency = 'USD',
  onNavigateAdminTab,
  floating = false
}) => {
  const { isAdmin, isOwner } = useAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'orders' | 'messages'>('all');
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_read_notification_ids');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save read notification IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('admin_read_notification_ids', JSON.stringify(readIds));
    } catch (e) {
      console.warn('Failed to save notification read state', e);
    }
  }, [readIds]);

  // Only active for admin / owner
  if (!isAdmin && !isOwner) {
    return null;
  }

  // Construct notifications list from orders & messages
  const orderNotifications = orders.map(order => ({
    id: `order-${order.id}`,
    originalId: order.id,
    type: 'order' as const,
    titleAr: `طلب شراء جديد #${order.id.slice(-6)}`,
    titleEn: `New Purchase Order #${order.id.slice(-6)}`,
    descAr: `العميل: ${order.customerName || order.customerEmail} • الإجمالي: ${formatPrice(order.total, currency, 'ar')}`,
    descEn: `Customer: ${order.customerName || order.customerEmail} • Total: ${formatPrice(order.total, currency, 'en')}`,
    date: order.createdAt ? new Date(order.createdAt) : new Date(),
    status: order.orderStatus,
    targetTab: 'orders' as AdminTab
  }));

  const messageNotifications = messages.map(msg => ({
    id: `msg-${msg.id}`,
    originalId: msg.id,
    type: 'message' as const,
    titleAr: `رسالة تواصل من ${msg.name}`,
    titleEn: `Inquiry from ${msg.name}`,
    descAr: msg.subject || msg.message.slice(0, 70),
    descEn: msg.subject || msg.message.slice(0, 70),
    date: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    status: msg.status,
    targetTab: 'messages' as AdminTab
  }));

  const allNotifications = [...orderNotifications, ...messageNotifications].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const filteredNotifications = allNotifications.filter(item => {
    if (filter === 'orders') return item.type === 'order';
    if (filter === 'messages') return item.type === 'message';
    return true;
  });

  const unreadCount = allNotifications.filter(item => !readIds[item.id]).length;

  const markAsRead = (id: string) => {
    setReadIds(prev => ({ ...prev, [id]: true }));
  };

  const markAllAsRead = () => {
    const updated: Record<string, boolean> = { ...readIds };
    allNotifications.forEach(n => {
      updated[n.id] = true;
    });
    setReadIds(updated);
  };

  const handleItemClick = (item: typeof allNotifications[0]) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (onNavigateAdminTab) {
      onNavigateAdminTab(item.targetTab);
    }
  };

  const formatDateLabel = (d: Date) => {
    const diffMin = Math.floor((Date.now() - d.getTime()) / (1000 * 60));
    if (diffMin < 1) return language === 'ar' ? 'الآن' : 'Just now';
    if (diffMin < 60) return language === 'ar' ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Trigger Button */}
      {floating ? (
        <button
          type="button"
          id="floating-admin-notifications-btn"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 start-5 z-45 p-3 sm:px-4 sm:py-3 rounded-full bg-white dark:bg-[#111216] text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-neutral-800 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title={language === 'ar' ? 'إشعارات المنصة للمالك' : 'Owner Live Notifications'}
        >
          <div className="relative">
            <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 border border-white dark:border-[#0c0d10] shadow-xs font-mono">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-white font-mono">
            {language === 'ar' ? 'إشعارات المالك' : 'Owner Alerts'}
          </span>
          {unreadCount > 0 && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
              {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          id="navbar-admin-notifications-btn"
          onClick={() => setIsOpen(true)}
          className="relative p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
          title={language === 'ar' ? 'إشعارات المالك' : 'Owner Notifications'}
        >
          <Bell className="w-4 h-4 text-amber-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow-md font-mono">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Notifications Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/80 animate-in fade-in duration-200">
          <div 
            id="admin-notifications-modal"
            className="w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] flex flex-col bg-white dark:bg-[#0c0d10] border border-slate-200 dark:border-neutral-800 sm:rounded-2xl shadow-2xl text-slate-900 dark:text-white overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-[#111216]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{language === 'ar' ? 'مركز إشعارات المالك المباشرة' : 'Live Owner Notifications'}</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
                        {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {language === 'ar' ? 'تنبيهات فورية بالمبيعات والرسائل المسجلة' : 'Real-time feed of purchases and messages'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-notifications-modal"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Mark Read */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900/80 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="filter-notif-all"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filter === 'all' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  {language === 'ar' ? 'الكل' : 'All'} ({allNotifications.length})
                </button>
                <button
                  type="button"
                  id="filter-notif-orders"
                  onClick={() => setFilter('orders')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filter === 'orders' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  {language === 'ar' ? 'الطلبات' : 'Orders'} ({orderNotifications.length})
                </button>
                <button
                  type="button"
                  id="filter-notif-messages"
                  onClick={() => setFilter('messages')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    filter === 'messages' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  {language === 'ar' ? 'الرسائل' : 'Messages'} ({messageNotifications.length})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  id="mark-all-notifications-read"
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-700 dark:text-cyan-400 hover:underline font-bold transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                </button>
              )}
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-white/40 space-y-2">
                  <Bell className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs font-semibold">
                    {language === 'ar' ? 'لا توجد إشعارات جديدة حالياً' : 'No notifications to display'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isRead = !!readIds[item.id];
                  const title = language === 'ar' ? item.titleAr : item.titleEn;
                  const desc = language === 'ar' ? item.descAr : item.descEn;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative group ${
                        isRead
                          ? 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100/70 dark:hover:bg-white/10 opacity-75'
                          : 'bg-emerald-50/70 dark:bg-gradient-to-r dark:from-emerald-500/10 dark:to-slate-800 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400 shadow-2xs'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl shrink-0 ${
                        item.type === 'order' 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' 
                          : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                      }`}>
                        {item.type === 'order' ? <ShoppingBag className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-cyan-300 transition-colors">
                            {title}
                          </h4>
                          <span className="text-[10px] text-slate-400 dark:text-white/40 shrink-0 font-mono">
                            {formatDateLabel(item.date)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-white/70 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-cyan-400 flex items-center gap-1 group-hover:underline">
                            <span>{language === 'ar' ? 'عرض في لوحة التحكم' : 'View in dashboard'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
              <span>{allNotifications.length} {language === 'ar' ? 'إجمالي الأحداث' : 'total items'}</span>
              <button
                type="button"
                id="close-notifications-btn"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold transition-all cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
