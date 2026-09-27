import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ShoppingBag, 
  Search, 
  Menu, 
  X, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { SiteSettings } from '../types';

interface NavbarProps {
  settings: SiteSettings;
  settingsLoaded?: boolean;
  onOpenSearch: () => void;
  onOpenAdmin?: () => void;
  onOpenDashboard?: () => void;
  onOpenOrders?: () => void;
  onOpenCustomerPortal?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  settings, 
  settingsLoaded = true,
  onOpenSearch, 
  onOpenAdmin,
  onOpenDashboard,
  onOpenOrders,
  onOpenCustomerPortal,
  onOpenAuth
}) => {
  const { language, toggleLanguage, direction, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, role, setIsAuthModalOpen, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistCount, setIsWishlistOpen } = useWishlist();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleAdminClick = onOpenAdmin || onOpenDashboard;
  const handleOrdersClick = onOpenOrders || onOpenCustomerPortal;

  const brandName = language === 'ar' ? (settings.brandNameAr || '') : (settings.brandNameEn || '');
  const showJobTitle = settings?.showJobTitleInHeader !== false && settings?.sectionVisibility?.showJobTitleInHeader !== false;
  const headerSubtitle = language === 'ar'
    ? (settings.headerSubtitleAr?.trim() || settings.titleAr?.trim() || '')
    : (settings.headerSubtitleEn?.trim() || settings.titleEn?.trim() || '');

  const isServicesNav = (nav: { id?: string; href?: string; labelEn?: string; labelAr?: string }) => 
    nav.href === '#services' || 
    nav.id === 'services' || 
    nav.id === '4' || 
    nav.labelEn?.toLowerCase() === 'services' || 
    nav.labelAr === 'الخدمات';

  const navLinks = (settings?.navigation || []).filter(item => item && item.enabled && !isServicesNav(item));

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Prevent background scroll when sidebar drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <header className="site-header sticky top-0 z-40 w-full border-b border-emerald-800 bg-emerald-700 text-white shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Name & Subtitle - Centered Vertically */}
        <a 
          href="#hero" 
          className="flex items-center group focus:outline-none focus:ring-2 focus:ring-white/40 rounded-xl p-1 shrink-0 min-w-max"
        >
          {showJobTitle ? (
            <div className="flex flex-col justify-center min-w-max">
              {brandName ? (
                <span className="font-bold text-base sm:text-xl text-white leading-tight tracking-tight whitespace-nowrap">
                  {brandName}
                </span>
              ) : !settingsLoaded ? (
                <div className="h-5 w-28 bg-white/30 rounded animate-pulse" />
              ) : (
                <span className="font-bold text-base sm:text-xl text-white leading-tight tracking-tight whitespace-nowrap">
                  {language === 'ar' ? 'المنصة الرقمية' : 'Digital Platform'}
                </span>
              )}
              
              {headerSubtitle ? (
                <span className="header-subtitle text-[11px] sm:text-xs text-emerald-100 font-bold tracking-tight whitespace-nowrap mt-0.5">
                  {headerSubtitle}
                </span>
              ) : !settingsLoaded ? (
                <div className="h-3 w-16 bg-white/20 rounded animate-pulse mt-1" />
              ) : null}
            </div>
          ) : (
            <div className="flex items-center min-w-max h-full py-1">
              {brandName ? (
                <span className="font-extrabold text-base sm:text-2xl text-white leading-none tracking-tight whitespace-nowrap">
                  {brandName}
                </span>
              ) : !settingsLoaded ? (
                <div className="h-5 w-28 bg-white/30 rounded animate-pulse" />
              ) : (
                <span className="font-extrabold text-base sm:text-2xl text-white leading-none tracking-tight whitespace-nowrap">
                  {language === 'ar' ? 'المنصة الرقمية' : 'Digital Platform'}
                </span>
              )}
            </div>
          )}
        </a>

        {/* Header Controls: ONLY Search, Cart, and 3-Bars Menu - On ALL screen sizes */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 1. Search Button */}
          <button
            id="nav-search-btn"
            onClick={onOpenSearch}
            aria-label={t('nav.search')}
            title={language === 'ar' ? 'البحث السريع (Ctrl+K)' : 'Quick Search (Ctrl+K)'}
            className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-500/40 bg-emerald-800/60 hover:bg-emerald-800 text-white transition-all group cursor-pointer shadow-2xs h-10 sm:h-11"
          >
            <Search className="w-4 h-4 text-emerald-100 group-hover:text-white transition-colors shrink-0" />
            <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap hidden sm:inline">
              {language === 'ar' ? 'بحث' : 'Search'}
            </span>
            <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-950/60 text-emerald-200 border border-emerald-600/40">
              Ctrl K
            </span>
          </button>

          {/* 2. Cart Trigger Button */}
          <button
            id="nav-cart-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label={t('nav.cart')}
            title={t('nav.cart')}
            className="relative flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2.5 text-white hover:bg-emerald-800 border border-emerald-500/40 bg-emerald-800/60 rounded-xl transition-all cursor-pointer shadow-2xs h-10 sm:h-11 w-10 sm:w-auto gap-2"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:inline">
              {t('nav.cart')}
            </span>
            {cartCount > 0 && (
              <span className="bg-white text-emerald-900 font-extrabold text-[11px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {/* 3. 3-Bars Hamburger Menu (الشرط) - Visible on ALL screens (Computers, Tablets & Phones) */}
          <button
            id="nav-menu-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 text-white hover:bg-emerald-800 rounded-xl border border-emerald-500/50 bg-emerald-800/80 hover:border-emerald-400 focus:outline-none cursor-pointer active:scale-95 shadow-2xs h-10 sm:h-11"
            aria-label="Toggle Navigation Menu"
            title={language === 'ar' ? 'القائمة الجانبية (الأقسام والإعدادات)' : 'Navigation Menu & Settings'}
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-emerald-100" />
            ) : (
              <Menu className="w-5 h-5 text-emerald-100" />
            )}
            <span className="hidden lg:inline text-xs sm:text-sm font-bold text-white whitespace-nowrap">
              {language === 'ar' ? 'القائمة' : 'Menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Side Slide-Over Drawer - Responsive for both Desktop and Mobile */}
      {isSidebarOpen && (
        <div className={`fixed inset-0 z-50 flex ${direction === 'rtl' ? 'justify-start' : 'justify-end'}`}>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/75 transition-opacity cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Sliding Side Panel (Drawer) */}
          <div 
            className={`relative z-50 w-80 sm:w-96 max-w-[85vw] h-full bg-emerald-950 border-emerald-800 text-white shadow-2xl flex flex-col justify-between overflow-y-auto ${
              direction === 'rtl' ? 'border-e' : 'border-s'
            }`}
            dir={direction}
          >
            {/* Drawer Top Header */}
            <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between bg-emerald-900/40">
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg text-white">
                  {brandName || (language === 'ar' ? 'المنصة الرقمية' : 'Digital Platform')}
                </span>
                {headerSubtitle && (
                  <span className="text-xs text-emerald-200 mt-0.5">
                    {headerSubtitle}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors border border-emerald-700/40"
                aria-label="Close menu"
                title={language === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links & Sections in Drawer */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-3 py-1 mb-1">
                  {language === 'ar' ? 'أقسام المنصة' : 'Sections & Navigation'}
                </span>
                <div className="space-y-1">
                  {navLinks.map((nav) => {
                    const label = language === 'ar' ? nav.labelAr : nav.labelEn;
                    return (
                      <a
                        key={nav.id}
                        href={nav.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-white/95 hover:text-white hover:bg-emerald-800/90 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                          <span>{label}</span>
                        </div>
                        {direction === 'rtl' ? (
                          <ChevronLeft className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Personal Lists & Services in Drawer */}
              <div className="pt-3 border-t border-emerald-800/80 space-y-1.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-3 py-1">
                  {language === 'ar' ? 'الخدمات والمفضلة' : 'Services & Tools'}
                </span>

                {/* Wishlist in Drawer */}
                <button
                  id="drawer-wishlist-btn"
                  onClick={() => {
                    setIsWishlistOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800/80 rounded-xl transition-colors text-start cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-400 text-rose-400' : 'text-rose-300'}`} />
                    <span>{language === 'ar' ? 'قائمة المفضلة والمحفوظات' : 'Wishlist & Saved Items'}</span>
                  </div>
                  {wishlistCount > 0 ? (
                    <span className="bg-rose-500 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                      {wishlistCount}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-300/70">
                      {language === 'ar' ? 'فارغة' : 'Empty'}
                    </span>
                  )}
                </button>

                {/* Customer Orders in Drawer */}
                <button
                  id="drawer-my-orders-btn"
                  onClick={() => {
                    handleOrdersClick?.();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800/80 rounded-xl transition-colors text-start cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t('nav.myOrders')}</span>
                  </div>
                  {direction === 'rtl' ? (
                    <ChevronLeft className="w-4 h-4 text-emerald-400/60" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-emerald-400/60" />
                  )}
                </button>

                {/* Cart View inside Drawer */}
                <button
                  id="drawer-cart-btn"
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800/80 rounded-xl transition-colors text-start cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t('nav.cart')}</span>
                  </div>
                  {cartCount > 0 && (
                    <span className="bg-white text-emerald-950 font-bold text-xs px-2 py-0.5 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Actions: Theme, Language & Admin (Only if logged in) */}
            <div className="p-4 sm:p-5 border-t border-emerald-800/80 space-y-3 bg-emerald-950/80">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                {language === 'ar' ? 'اللغة والمظهر' : 'Preferences'}
              </span>

              {/* Language and Theme buttons in Drawer */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="drawer-language-btn"
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white border border-emerald-700/60 transition-colors cursor-pointer"
                  title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
                >
                  <Globe className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{language === 'ar' ? 'English' : 'عربي'}</span>
                </button>

                <button
                  id="drawer-theme-btn"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-white border border-emerald-700/60 transition-colors cursor-pointer"
                  title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{language === 'ar' ? 'نهاري' : 'Light'}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-emerald-200 shrink-0" />
                      <span>{language === 'ar' ? 'ليلي' : 'Dark'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Admin Portal or Dashboard - ONLY visible when owner is logged in */}
              {isAdmin && (
                <div className="space-y-2 pt-3 border-t border-emerald-800/80">
                  <button
                    onClick={() => {
                      handleAdminClick?.();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>{t('nav.dashboard')} ({role})</span>
                  </button>
                  <button
                    onClick={async () => {
                      await logout();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-200 bg-rose-900/60 hover:bg-rose-900 border border-rose-500/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
};
