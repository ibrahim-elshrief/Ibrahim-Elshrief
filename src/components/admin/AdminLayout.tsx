import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Palette, 
  FolderGit2, 
  ShoppingBag, 
  Boxes, 
  ReceiptText, 
  BookOpen, 
  Image as ImageIcon, 
  Inbox, 
  Settings, 
  ArrowLeft, 
  ArrowRight,
  Globe,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  MailCheck,
  Layers,
  Archive,
  ShieldCheck,
  CreditCard,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AdminNotificationsBell } from './AdminNotificationsBell';
import { AdminTab } from '../../types';

export type { AdminTab };

export interface AdminLayoutProps {
  activeTab: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
  onTabChange?: (tab: AdminTab) => void;
  onExit?: () => void;
  onExitAdmin?: () => void;
  children: React.ReactNode;
  unreadCount?: number;
  unreadMessagesCount?: number;
  lowStockCount?: number;
  pendingOrdersCount?: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  onTabChange,
  onExit,
  onExitAdmin,
  children,
  unreadCount = 0,
  unreadMessagesCount = 0,
  lowStockCount = 0,
  pendingOrdersCount = 0
}) => {
  const { language, toggleLanguage, direction, t } = useLanguage();
  const { role, logout, appUser } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ExitArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const handleSelectTab = (tab: AdminTab) => {
    if (typeof onSelectTab === 'function') onSelectTab(tab);
    if (typeof onTabChange === 'function') onTabChange(tab);
  };

  const handleExitAction = () => {
    if (typeof onExit === 'function') onExit();
    if (typeof onExitAdmin === 'function') onExitAdmin();
  };

  const effectiveUnread = unreadCount || unreadMessagesCount || 0;
  const effectiveLowStock = lowStockCount || 0;

  const navItems = [
    { id: 'overview' as const, label: t('admin.overview'), icon: LayoutDashboard },
    { id: 'cms' as const, label: t('admin.cms'), icon: Palette },
    { 
      id: 'carousel' as const, 
      label: language === 'ar' ? 'شريط الكاروسيل' : 'Hero Carousel', 
      icon: Layers 
    },
    { id: 'portfolio' as const, label: t('admin.portfolio'), icon: FolderGit2 },
    { id: 'store' as const, label: t('admin.store'), icon: ShoppingBag },
    { 
      id: 'inventory' as const, 
      label: t('admin.inventory'), 
      icon: Boxes, 
      badge: effectiveLowStock > 0 ? effectiveLowStock : undefined 
    },
    { id: 'orders' as const, label: t('admin.orders'), icon: ReceiptText },
    { 
      id: 'payments' as const, 
      label: language === 'ar' ? 'طرق وبوابات الدفع' : 'Payment Gateways', 
      icon: CreditCard 
    },
    { id: 'articles' as const, label: t('admin.articles'), icon: BookOpen },
    { 
      id: 'archive' as const, 
      label: language === 'ar' ? 'الأرشيف المركزي' : 'Central Archive', 
      icon: Archive 
    },
    { id: 'media' as const, label: t('admin.media'), icon: ImageIcon },
    { 
      id: 'messages' as const, 
      label: t('admin.messages'), 
      icon: Inbox, 
      badge: effectiveUnread > 0 ? effectiveUnread : undefined 
    },
    { 
      id: 'subscribers' as const, 
      label: language === 'ar' ? 'المشتركون' : 'Subscribers', 
      icon: MailCheck 
    },
    { 
      id: 'quickConnect' as const, 
      label: language === 'ar' ? 'التواصل المباشر العائم' : 'Floating Connect', 
      icon: MessageCircle 
    },
    { 
      id: 'security' as const, 
      label: language === 'ar' ? 'الأمان وتسجيل الدخول' : 'Security & Login', 
      icon: ShieldCheck 
    },
    { id: 'settings' as const, label: t('admin.settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-[#0a0a0c] text-slate-900 dark:text-white flex flex-col md:flex-row transition-colors">
      
      {/* Mobile Top Header for Admin */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#064e3b] dark:bg-[#0c0d10] border-b border-emerald-700 dark:border-slate-800 text-white">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-800 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm text-white">
            {t('admin.dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AdminNotificationsBell
            unreadMessagesCount={effectiveUnread}
            lowStockCount={effectiveLowStock}
            pendingOrdersCount={pendingOrdersCount}
            onNavigate={handleSelectTab}
          />
          <button
            onClick={handleExitAction}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-emerald-800/80 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-emerald-600 dark:border-slate-700 transition-colors"
          >
            <ExitArrow className="w-3.5 h-3.5 text-white" />
            <span>{t('admin.exit')}</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              handleExitAction();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-500 transition-colors shadow-xs"
            title={language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        admin-sidebar ${mobileNavOpen ? 'block' : 'hidden'} md:flex
        w-full md:w-64 bg-[#064e3b] dark:bg-[#0c0d10] border-e border-emerald-700 dark:border-slate-800 shrink-0 flex-col justify-between p-4 z-40 text-white
      `}>
        <div className="space-y-6">
          
          {/* Brand & User Card */}
          <div className="space-y-3 pb-4 border-b border-emerald-700/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 dark:bg-emerald-950/80 text-white dark:text-emerald-300 border border-emerald-500 dark:border-emerald-800/80 flex items-center justify-center font-bold text-sm shadow-xs">
                  Z
                </div>
                <div>
                  <h1 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Platform CMS
                  </h1>
                  <span className="sidebar-subtitle text-[10px] text-emerald-200 dark:text-slate-400 font-medium">Cloud Operations</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <AdminNotificationsBell
                  unreadMessagesCount={effectiveUnread}
                  lowStockCount={effectiveLowStock}
                  pendingOrdersCount={pendingOrdersCount}
                  onNavigate={handleSelectTab}
                />
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-700 dark:bg-slate-800 text-white dark:text-slate-200 border border-emerald-500 dark:border-slate-700 font-mono">
                  {role}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-800/90 dark:bg-slate-900 border border-emerald-600/70 dark:border-slate-800 text-xs shadow-xs text-white">
              <p className="font-bold text-white truncate">
                {appUser?.displayName || 'Administrator'}
              </p>
              <p className="text-[11px] text-emerald-100 dark:text-slate-400 truncate mt-0.5">
                {appUser?.email}
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleSelectTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-white text-emerald-950 dark:bg-emerald-600 dark:text-white font-bold shadow-md active'
                      : 'text-emerald-100 hover:text-emerald-950 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-emerald-700 dark:text-white' : 'text-emerald-200 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                    }`} />
                    <span className={`transition-colors ${
                      isActive ? 'text-emerald-950 dark:text-white font-bold' : 'text-emerald-100 dark:text-slate-400 group-hover:text-emerald-950 dark:group-hover:text-white group-hover:font-bold'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                      isActive ? 'bg-emerald-900 dark:bg-emerald-950 text-white dark:text-emerald-300' : 'bg-emerald-900/60 dark:bg-slate-800 text-emerald-100 dark:text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-slate-700 group-hover:text-emerald-900 dark:group-hover:text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-emerald-700/80 dark:border-slate-800 space-y-2">
          <button
            onClick={toggleLanguage}
            className="sidebar-lang-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-100 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-emerald-700/60 dark:border-slate-800 hover:border-white dark:hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-200 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
              <span className="group-hover:text-emerald-950 dark:group-hover:text-white group-hover:font-bold transition-colors">{language === 'ar' ? 'English' : 'العربية'}</span>
            </div>
            <span className="uppercase text-[10px] font-bold text-emerald-300 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{language}</span>
          </button>

          <button
            onClick={handleExitAction}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700/90 hover:bg-emerald-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 border border-emerald-500/70 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ExitArrow className="w-4 h-4 text-white" />
            <span>{language === 'ar' ? 'العودة للموقع' : 'Back to Website'}</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              handleExitAction();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border border-rose-500 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-white" />
            <span>{language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}</span>
          </button>
        </div>

      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto max-h-screen admin-scope">
        {children}
      </main>

    </div>
  );
};
