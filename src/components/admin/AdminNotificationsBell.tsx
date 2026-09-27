import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Check, 
  Inbox, 
  ShoppingBag, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  CheckCheck,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AppNotification } from '../../types';
import { AdminTab } from './AdminLayout';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export interface AdminNotificationsBellProps {
  onNavigate?: (tab: AdminTab) => void;
  unreadMessagesCount?: number;
  pendingOrdersCount?: number;
  lowStockCount?: number;
  className?: string;
}

export const AdminNotificationsBell: React.FC<AdminNotificationsBellProps> = ({
  onNavigate,
  unreadMessagesCount = 0,
  pendingOrdersCount = 0,
  lowStockCount = 0,
  className = ''
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [firestoreNotifications, setFirestoreNotifications] = useState<AppNotification[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 384 });

  // Subscribe to Firestore notifications collection with local sync cache fallback
  useEffect(() => {
    // Load local fallback cache first
    try {
      const cached = localStorage.getItem('app_notifications_sync');
      if (cached) {
        const parsed: AppNotification[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFirestoreNotifications(parsed);
        }
      }
    } catch {}

    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(25)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: AppNotification[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            loaded.push({
              id: d.id,
              type: data.type || 'system',
              titleAr: data.titleAr || '',
              titleEn: data.titleEn || '',
              descriptionAr: data.descriptionAr || '',
              descriptionEn: data.descriptionEn || '',
              timestamp: data.timestamp || new Date().toISOString(),
              read: !!data.read,
              linkTab: data.linkTab as AdminTab,
              data: data.data
            });
          });

          // Merge with any offline/local cached notifications
          try {
            const cached = localStorage.getItem('app_notifications_sync');
            if (cached) {
              const parsed: AppNotification[] = JSON.parse(cached);
              parsed.forEach((cn) => {
                if (!loaded.some((item) => item.id === cn.id)) {
                  loaded.push(cn);
                }
              });
            }
          } catch {}

          loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setFirestoreNotifications(loaded);
        },
        (error) => {
          // If collection doesn't exist yet, that's completely fine; synthesized notifications take over
          console.debug('Notifications stream info:', error.message);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.debug('Failed to subscribe to notifications:', err);
    }
  }, []);

  // Window event listener for instantaneous new message/notification reflection
  useEffect(() => {
    const handleNewMessage = (e: any) => {
      const msg = e?.detail;
      if (!msg) return;
      const newNotif: AppNotification = {
        id: `local_msg_${msg.id || Date.now()}`,
        type: 'message',
        titleAr: `رسالة تواصل واستفسار من ${msg.name || 'زائر'}`,
        titleEn: `Direct inquiry from ${msg.name || 'Visitor'}`,
        descriptionAr: `الموضوع: ${msg.subject || 'تواصل'} — "${(msg.message || '').slice(0, 80)}"`,
        descriptionEn: `Subject: ${msg.subject || 'Inquiry'} — "${(msg.message || '').slice(0, 80)}"`,
        timestamp: msg.createdAt || new Date().toISOString(),
        read: false,
        linkTab: 'messages',
        data: {
          messageId: msg.id,
          senderName: msg.name,
          senderEmail: msg.email,
          subject: msg.subject
        }
      };

      setFirestoreNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id || (n.data?.messageId && n.data.messageId === msg.id))) {
          return prev;
        }
        return [newNotif, ...prev];
      });
    };

    window.addEventListener('app_new_message', handleNewMessage);
    return () => window.removeEventListener('app_new_message', handleNewMessage);
  }, []);

  // Build synthesized active operational alerts
  const synthesizedAlerts: AppNotification[] = [];

  if (pendingOrdersCount > 0) {
    synthesizedAlerts.push({
      id: 'synth_orders',
      type: 'order',
      titleAr: `${pendingOrdersCount} طلبات جديدة بانتظار المراجعة`,
      titleEn: `${pendingOrdersCount} Pending store orders require review`,
      descriptionAr: 'يوجد طلبات شراء جديدة تحتاج للتأكيد وتجهيز الشحن أو إرسال التحميل.',
      descriptionEn: 'New customer orders waiting for fulfillment.',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'orders'
    });
  }

  if (unreadMessagesCount > 0) {
    synthesizedAlerts.push({
      id: 'synth_messages',
      type: 'message',
      titleAr: `${unreadMessagesCount} رسائل واستفسارات غير مقروءة`,
      titleEn: `${unreadMessagesCount} Unread inquiries & messages`,
      descriptionAr: 'تواصل زوار وباحثون معك عبر نموذج المراسلة المباشر.',
      descriptionEn: 'Scholars and visitors sent inquiries via contact form.',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'messages'
    });
  }

  if (lowStockCount > 0) {
    synthesizedAlerts.push({
      id: 'synth_inventory',
      type: 'inventory',
      titleAr: `تنبيه مخزون: ${lowStockCount} كتب ومطبوعات أوشكت على النفاد`,
      titleEn: `Inventory alert: ${lowStockCount} items low in stock`,
      descriptionAr: 'تأكد من إعادة طباعة أو توريد نسخ إضافية للمتجر.',
      descriptionEn: 'Check inventory reserves to avoid stockouts.',
      timestamp: new Date().toISOString(),
      read: false,
      linkTab: 'inventory'
    });
  }

  // Combined notifications: synthesized operational alerts + firestore custom notifications
  const allNotifications = [...synthesizedAlerts, ...firestoreNotifications];
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  // Calculate dynamic coordinates to guarantee the dropdown never goes off screen
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl' || language === 'ar';
    const desiredWidth = Math.min(390, window.innerWidth - 32);

    let left: number;
    if (isRtl) {
      // In RTL, align the right edge of the dropdown with the right edge of the button
      left = rect.right - desiredWidth;
    } else {
      // In LTR, align the left edge of the dropdown with the left edge of the button
      left = rect.left;
    }

    // Safety margins: clamp strictly within viewport (at least 16px padding on both sides)
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - desiredWidth - 16);
    left = Math.max(minLeft, Math.min(maxLeft, left));

    let top = rect.bottom + 8;
    const availableBelow = window.innerHeight - top;
    // If not enough vertical space below the trigger, flip upwards
    if (availableBelow < 280 && rect.top > 320) {
      top = Math.max(16, rect.top - 8 - Math.min(480, rect.top - 24));
    }

    setCoords({ top, left, width: desiredWidth });
  };

  // Reposition on open, resize, or scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleReposition = () => updatePosition();
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
      return () => {
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen, language]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: AppNotification) => {
    // If it's a firestore notification, mark as read
    if (!notif.id.startsWith('synth_')) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (err) {
        console.warn('Could not mark notification as read:', err);
      }
    }

    if (notif.linkTab && onNavigate) {
      onNavigate(notif.linkTab);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    for (const notif of firestoreNotifications.filter((n) => !n.read)) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (err) {
        console.warn('Error marking all as read:', err);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'message':
        return <Inbox className="w-4 h-4 text-sky-400" />;
      case 'inventory':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        id="admin-notifications-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 border border-emerald-600/80 text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
        title={language === 'ar' ? 'التنبيهات والإشعارات التشغيلية' : 'Operational Notifications & Alerts'}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel rendered at root level with createPortal to prevent sidebar clipping or horizontal screen overflow */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="fixed rounded-2xl bg-[#0c0d10] border border-neutral-800 shadow-2xl z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `min(540px, calc(100vh - ${coords.top + 24}px))`
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#111216]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono">
                {language === 'ar' ? 'مركز التنبيهات والأحداث' : 'Notification Center'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-cyan-400 border border-neutral-700 font-mono">
                  {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {firestoreNotifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  title={language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تحديد كمقروء' : 'Mark read'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/5 mx-auto flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-white">
                  {language === 'ar' ? 'لا توجد تنبيهات معلقة حالياً' : 'No pending notifications'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {language === 'ar' ? 'جميع الطلبات والمراسلات في حالة مستقرة' : 'All orders, messages, and stock levels are up to date.'}
                </p>
              </div>
            ) : (
              allNotifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full p-4 text-start flex items-start gap-3 transition-colors hover:bg-white/10 cursor-pointer ${
                    !n.read ? 'bg-indigo-950/30' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">
                        {language === 'ar' ? n.titleAr : n.titleEn}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {language === 'ar' ? n.descriptionAr : n.descriptionEn}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(n.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {n.linkTab && (
                        <span className="text-indigo-400 font-bold flex items-center gap-0.5 ms-auto">
                          {language === 'ar' ? 'انتقال للقسم' : 'View'}
                          <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer of Dropdown */}
          <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {language === 'ar' ? 'نظام الإشعارات اللحظية' : 'Live Notification Engine'}
            </span>
            <span className="text-emerald-400 font-mono font-bold text-[10px]">
              ● ONLINE
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
