import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ComparisonProvider } from './context/ComparisonContext';
import { 
  SiteSettings, 
  HomeSectionItem, 
  PortfolioItem, 
  ProductItem, 
  ArticleItem, 
  ServiceItem, 
  Order, 
  ContactMessage, 
  AdminTab 
} from './types';
import { 
  db, 
  defaultSiteSettings, 
  defaultHomeSections, 
  defaultPortfolio, 
  defaultProducts, 
  defaultArticles, 
  defaultServices, 
  seedInitialDataIfEmpty,
  testConnection
} from './firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

// Public Components
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
import { AboutSection } from './components/AboutSection';
import { ContentCardsSection } from './components/ContentCardsSection';
import { SkillsSection } from './components/SkillsSection';
import { PortfolioSection } from './components/PortfolioSection';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ServicesSection } from './components/ServicesSection';
import { StoreSection } from './components/StoreSection';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ArticlesSection } from './components/ArticlesSection';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { TestimonialsSection } from './components/TestimonialsSection';
import { ContactSection } from './components/ContactSection';
import { NewsletterSubscription } from './components/NewsletterSubscription';
import { HeroCarousel } from './components/HeroCarousel';
import { Footer } from './components/Footer';
import { FloatingQuickConnect } from './components/FloatingQuickConnect';
import { MobileSectionSnapNavigator } from './components/MobileSectionSnapNavigator';
import { SectionDivider } from './components/SectionDivider';
import { getSectionBackgroundStyle } from './utils/sectionTheme';
import { InitialPreloader } from './components/InitialPreloader';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { ProductComparisonBar } from './components/ProductComparisonBar';
import { ProductComparisonModal } from './components/ProductComparisonModal';
import { CheckoutModal } from './components/CheckoutModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { CustomerPortalModal } from './components/CustomerPortalModal';

// Admin Components
import { AdminSecureLogin } from './components/AdminSecureLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminContentCMS } from './components/admin/AdminContentCMS';
import { AdminCarousel } from './components/admin/AdminCarousel';
import { AdminPortfolio } from './components/admin/AdminPortfolio';
import { AdminStore } from './components/admin/AdminStore';
import { AdminInventory } from './components/admin/AdminInventory';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminArticles } from './components/admin/AdminArticles';
import { AdminMedia } from './components/admin/AdminMedia';
import { AdminMessages } from './components/admin/AdminMessages';
import { AdminSubscribers } from './components/admin/AdminSubscribers';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminArchive } from './components/admin/AdminArchive';
import { AdminSecurity } from './components/admin/AdminSecurity';
import { AdminPayments } from './components/admin/AdminPayments';
import { AdminQuickConnect } from './components/admin/AdminQuickConnect';

function MainPlatform() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { 
    role, 
    isStaff, 
    isAdmin, 
    currentUser, 
    loading: authLoading
  } = useAuth();
  const { isCartOpen, setIsCartOpen } = useCart();

  // Path Routing State for dedicated admin login and admin dashboard
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const validAdminRoutes = ['/admin', '/login', '/admin-secure-login', '/owner'];
      if (validAdminRoutes.includes(hash)) return hash;
      const pathname = window.location.pathname;
      if (validAdminRoutes.includes(pathname)) return pathname;
    }
    return '/';
  });

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
    try {
      window.history.pushState(null, '', path);
    } catch {
      window.location.hash = path;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validAdminRoutes = ['/admin', '/login', '/admin-secure-login', '/owner'];
      if (validAdminRoutes.includes(hash)) {
        setCurrentPath(hash);
        return;
      }
      const pathname = window.location.pathname;
      if (validAdminRoutes.includes(pathname)) {
        setCurrentPath(pathname);
      } else {
        setCurrentPath('/');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const [adminTab, setAdminTab] = useState<AdminTab>('overview');

  // Platform Data Collections - Live directly from Firestore without stale local cache
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  const [homeSections, setHomeSections] = useState<HomeSectionItem[]>(defaultHomeSections);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(defaultPortfolio);
  const [products, setProducts] = useState<ProductItem[]>(defaultProducts);
  const [articles, setArticles] = useState<ArticleItem[]>(defaultArticles);
  const [services, setServices] = useState<ServiceItem[]>(defaultServices);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Public Interactive Modals
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOrdersPortalOpen, setIsOrdersPortalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [contactPrefillSubject, setContactPrefillSubject] = useState('');

  // Initial Seed & Data Fetching
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      // 1. Fetch site settings
    try {
      const settingsSnap = await getDoc(doc(db, 'siteSettings', 'global'));
      if (settingsSnap.exists()) {
        const loadedData = settingsSnap.data() as SiteSettings;
        setSettings(loadedData);
        setSettingsLoaded(true);
      } else {
        setSettingsLoaded(true);
      }
    } catch (e) {
      console.warn('Could not load remote site settings, using defaults:', e);
      setSettingsLoaded(true);
    }

    // 2. Fetch home sections
    try {
      const sectionsSnap = await getDocs(collection(db, 'homeSections'));
      if (!sectionsSnap.empty) {
        const secs: HomeSectionItem[] = [];
        sectionsSnap.forEach(d => secs.push({ id: d.id, ...d.data() } as HomeSectionItem));
        secs.sort((a, b) => a.order - b.order);
        setHomeSections(secs);
      }
    } catch (e) {
      console.warn('Could not load remote home sections, using defaults:', e);
    }

    // 3. Fetch portfolio
    try {
      const portfolioSnap = await getDocs(collection(db, 'portfolio'));
      const items: PortfolioItem[] = [];
      portfolioSnap.forEach(d => items.push({ id: d.id, ...d.data() } as PortfolioItem));
      setPortfolio(items);
    } catch (e) {
      console.warn('Could not load remote portfolio, using defaults:', e);
    }

    // 4. Fetch products
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      const prods: ProductItem[] = [];
      prodSnap.forEach(d => prods.push({ id: d.id, ...d.data() } as ProductItem));
      setProducts(prods);
    } catch (e) {
      console.warn('Could not load remote products, using defaults:', e);
    }

    // 5. Fetch articles
    try {
      const artSnap = await getDocs(collection(db, 'articles'));
      const arts: ArticleItem[] = [];
      artSnap.forEach(d => arts.push({ id: d.id, ...d.data() } as ArticleItem));
      setArticles(arts);
    } catch (e) {
      console.warn('Could not load remote articles, using defaults:', e);
    }

    // 6. Fetch services
    try {
      const srvSnap = await getDocs(collection(db, 'services'));
      const srvs: ServiceItem[] = [];
      srvSnap.forEach(d => srvs.push({ id: d.id, ...d.data() } as ServiceItem));
      setServices(srvs);
    } catch (e) {
      console.warn('Could not load remote services, using defaults:', e);
    }

    // 7. Fetch orders (staff / permission-permitted)
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const ords: Order[] = [];
      if (!ordersSnap.empty) {
        ordersSnap.forEach(d => ords.push({ id: d.id, ...d.data() } as Order));
        ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setOrders(ords);
    } catch {
      // Permission restricted for non-staff or empty; standard behavior
    }

    // 8. Fetch messages (staff / permission-permitted) live from Firestore
    try {
      const msgSnap = await getDocs(collection(db, 'messages'));
      const msgs: ContactMessage[] = [];
      if (!msgSnap.empty) {
        msgSnap.forEach(d => msgs.push({ id: d.id, ...d.data() } as ContactMessage));
      }
      msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(msgs);
    } catch {
      // Permission restricted for non-staff or empty; standard behavior
    }
    } finally {
      setDataLoading(false);
      // Brief smooth transition to guarantee pristine UI presentation
      setTimeout(() => {
        setInitialLoading(false);
      }, 400);
    }
  }, []);

  // Live real-time stream for contact messages so messages arrive instantly in notifications & inbox
  useEffect(() => {
    try {
      const q = query(collection(db, 'messages'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs: ContactMessage[] = [];
          snapshot.forEach((d) => {
            msgs.push({ id: d.id, ...d.data() } as ContactMessage);
          });
          msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMessages(msgs);
        },
        (error) => {
          console.debug('Messages live subscription status:', error.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not attach messages snapshot listener:', err);
    }
  }, []);

  // Window event listener for immediate inter-component message dispatch
  useEffect(() => {
    const handleNewMessage = (e: any) => {
      const newMsg = e?.detail as ContactMessage;
      if (newMsg && newMsg.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [newMsg, ...prev];
        });
      }
    };

    window.addEventListener('app_new_message', handleNewMessage);
    return () => window.removeEventListener('app_new_message', handleNewMessage);
  }, []);

  // Dynamically synchronize document.title, Open Graph meta tags, and Favicon
  useEffect(() => {
    const brandAr = settings.brandNameAr || 'إبراهيم الشريف';
    const brandEn = settings.brandNameEn || 'Ibrahim Elshrief';
    const mode = settings.tabTitleMode || 'both';

    let fullTitle = '';
    if (mode === 'ar') {
      fullTitle = brandAr;
    } else if (mode === 'en') {
      fullTitle = brandEn;
    } else if (mode === 'custom') {
      const customTitle = language === 'ar' 
        ? (settings.customTabTitleAr || settings.customTabTitleEn) 
        : (settings.customTabTitleEn || settings.customTabTitleAr);
      fullTitle = customTitle?.trim() || (language === 'ar' ? `${brandAr} | ${brandEn}` : `${brandEn} | ${brandAr}`);
    } else {
      // 'both' (default)
      if (brandAr && brandEn && brandAr !== brandEn) {
        fullTitle = language === 'ar' ? `${brandAr} | ${brandEn}` : `${brandEn} | ${brandAr}`;
      } else {
        fullTitle = language === 'ar' ? brandAr : (brandEn || brandAr);
      }
    }

    document.title = fullTitle;

    // Keep Open Graph tags and meta description in sync
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    if (settings.seoDescription || settings.bioAr || settings.bioEn) {
      const desc = settings.seoDescription || (language === 'ar' ? settings.bioAr : settings.bioEn);
      if (desc) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', desc);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', desc);
      }
    }

    // Dynamic Favicon Synchronization
    const defaultFavicon = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%2310b981'/><text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' fill='white' font-size='56' font-family='sans-serif' font-weight='800'>⚡</text></svg>";
    const activeFavicon = (settings.faviconUrl && settings.faviconUrl.trim()) ? settings.faviconUrl.trim() : defaultFavicon;

    // Update <link rel="icon">
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = activeFavicon;

    // Update <link rel="apple-touch-icon">
    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = activeFavicon;
  }, [
    settings.brandNameAr, 
    settings.brandNameEn, 
    settings.tabTitleMode,
    settings.customTabTitleAr,
    settings.customTabTitleEn,
    settings.faviconUrl,
    settings.seoDescription, 
    settings.bioAr, 
    settings.bioEn, 
    language
  ]);

  useEffect(() => {
    // Verify Firestore connectivity
    testConnection();

    // Attempt seed if authenticated and then load dataset
    seedInitialDataIfEmpty().finally(() => {
      fetchAllData().finally(() => {
        setDataLoading(false);
      });
    });
  }, [fetchAllData]);

  // Global keyboard shortcuts for enhanced navigation (Ctrl+K for search, Esc for modal dismissal)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Search Shortcut: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // 2. Escape Shortcut: Closes active modals in hierarchical order
      if (e.key === 'Escape') {
        if (selectedArticle) {
          setSelectedArticle(null);
          return;
        }
        if (selectedProduct) {
          setSelectedProduct(null);
          return;
        }
        if (selectedProject) {
          setSelectedProject(null);
          return;
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (isCheckoutOpen) {
          setIsCheckoutOpen(false);
          return;
        }
        if (isOrdersPortalOpen) {
          setIsOrdersPortalOpen(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    selectedArticle,
    selectedProduct,
    selectedProject,
    isSearchOpen,
    isCheckoutOpen,
    isOrdersPortalOpen
  ]);

  // Ensure body scroll is restored whenever all modals are closed
  useEffect(() => {
    const hasActiveModal = Boolean(
      selectedArticle ||
      selectedProduct ||
      selectedProject ||
      isOrdersPortalOpen ||
      isSearchOpen ||
      isCheckoutOpen
    );
    if (!hasActiveModal) {
      document.body.style.overflow = '';
    }
  }, [
    selectedArticle,
    selectedProduct,
    selectedProject,
    isOrdersPortalOpen,
    isSearchOpen,
    isCheckoutOpen
  ]);

  // Enable smooth mobile touch-to-scroll snapping on public homepage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasActiveModal = Boolean(
      selectedArticle ||
      selectedProduct ||
      selectedProject ||
      isOrdersPortalOpen ||
      isSearchOpen ||
      isCheckoutOpen
    );

    const isAdminRoute = currentPath === '/admin' || currentPath === '/login' || currentPath === '/admin-secure-login' || currentPath === '/owner';

    if (!isAdminRoute && !hasActiveModal) {
      document.documentElement.classList.add('homepage-touch-snapping');
      document.body.classList.add('homepage-touch-snapping');
    } else {
      document.documentElement.classList.remove('homepage-touch-snapping');
      document.body.classList.remove('homepage-touch-snapping');
    }

    return () => {
      document.documentElement.classList.remove('homepage-touch-snapping');
      document.body.classList.remove('homepage-touch-snapping');
    };
  }, [
    currentPath,
    selectedArticle,
    selectedProduct,
    selectedProject,
    isOrdersPortalOpen,
    isSearchOpen,
    isCheckoutOpen
  ]);

  // Handle service inquiry navigation to contact section
  const handleServiceInquire = (serviceTitle: string) => {
    setContactPrefillSubject(`Inquiry regarding: ${serviceTitle}`);
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Switch between public website and Admin/Owner Dashboard
  const handleToggleAdmin = () => {
    if (currentPath === '/admin') {
      navigate('/');
    } else {
      navigate('/admin');
    }
  };

  // Reassurance timeout: guarantees preloader dismisses cleanly even on slower connections
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="min-h-screen bg-transparent text-slate-900 dark:text-white selection:bg-teal-600 selection:text-white transition-colors relative"
      data-theme={theme}
    >
      {/* Initial Loading Screen with smooth animation for visitors */}
      <InitialPreloader
        isLoading={initialLoading}
        brandName={language === 'ar' ? (settings.brandNameAr || settings.brandNameEn) : (settings.brandNameEn || settings.brandNameAr)}
        subtitle={language === 'ar' ? (settings.titleAr || settings.headerSubtitleAr) : (settings.titleEn || settings.headerSubtitleEn)}
        avatarUrl={settings.avatarUrl}
        language={language}
        onForceEnter={() => setInitialLoading(false)}
      />
      
      {/* Route Branch: Dedicated Admin Page (Login if unauthenticated, Dashboard if authenticated) */}
      {(currentPath === '/admin' || currentPath === '/login' || currentPath === '/admin-secure-login' || currentPath === '/owner') ? (
        authLoading ? (
          <div className="min-h-screen bg-[#080517] flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-xs text-white/60 font-mono tracking-wider">Verifying Admin Credentials...</span>
            </div>
          </div>
        ) : isAdmin ? (
          <AdminLayout
            activeTab={adminTab}
            onSelectTab={setAdminTab}
            onTabChange={setAdminTab}
            onExit={() => navigate('/')}
            onExitAdmin={() => navigate('/')}
            unreadCount={(messages || []).filter(m => m && m.status === 'unread').length}
            unreadMessagesCount={(messages || []).filter(m => m && m.status === 'unread').length}
            lowStockCount={(products || []).filter(p => p && p.type === 'physical' && p.stock <= p.lowStockThreshold).length}
            pendingOrdersCount={(orders || []).filter(o => o && (o.orderStatus === 'pending' || o.orderStatus === 'paid')).length}
          >
            {adminTab === 'overview' && (
              <AdminOverview
                portfolio={portfolio}
                products={products}
                orders={orders}
                articles={articles}
                messages={messages}
                currency={settings.currency}
                settings={settings}
                onUpdateSettings={setSettings}
                onNavigate={setAdminTab}
                onNavigateTab={setAdminTab}
              />
            )}

            {adminTab === 'cms' && (
              <AdminContentCMS
                sections={homeSections}
                onUpdateSections={setHomeSections}
                settings={settings}
                onUpdateSettings={setSettings}
              />
            )}

            {adminTab === 'carousel' && (
              <AdminCarousel
                settings={settings}
                onUpdateSettings={setSettings}
                products={products}
                articles={articles}
                portfolio={portfolio}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'portfolio' && (
              <AdminPortfolio
                portfolio={portfolio}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'store' && (
              <AdminStore
                products={products}
                settings={settings}
                defaultCurrency={settings.currency}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'inventory' && (
              <AdminInventory
                products={products}
                settings={settings}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'orders' && (
              <AdminOrders
                orders={orders}
                onRefresh={fetchAllData}
                settings={settings}
              />
            )}

            {adminTab === 'payments' && (
              <AdminPayments
                settings={settings}
                onUpdateSettings={setSettings}
              />
            )}

            {adminTab === 'articles' && (
              <AdminArticles
                articles={articles}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'archive' && (
              <AdminArchive 
                portfolio={portfolio}
                products={products}
                articles={articles}
                onRefresh={fetchAllData}
                onRefreshAll={fetchAllData}
              />
            )}

            {adminTab === 'media' && (
              <AdminMedia />
            )}

            {adminTab === 'messages' && (
              <AdminMessages
                messages={messages}
                onRefresh={fetchAllData}
              />
            )}

            {adminTab === 'subscribers' && (
              <AdminSubscribers 
                settings={settings}
                onUpdateSettings={setSettings}
                onNavigateTab={setAdminTab}
              />
            )}

            {adminTab === 'security' && (
              <AdminSecurity />
            )}

            {adminTab === 'settings' && (
              <AdminSettings
                settings={settings}
                onUpdateSettings={setSettings}
                onNavigateTab={setAdminTab}
              />
            )}

            {adminTab === 'quickConnect' && (
              <AdminQuickConnect
                settings={settings}
                onUpdateSettings={setSettings}
              />
            )}
          </AdminLayout>
        ) : (
          <AdminSecureLogin
            onLoginSuccess={() => navigate('/admin')}
            onBackToHome={() => navigate('/')}
          />
        )
      ) : (
        /* Public Showcase Website */
        <motion.div 
          key={language}
          initial={{ opacity: 0.4, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex flex-col min-h-screen smooth-lang-container"
        >
          
          {/* Navigation Bar */}
          <Navbar
            settings={settings}
            settingsLoaded={settingsLoaded}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenOrders={() => setIsOrdersPortalOpen(true)}
            onOpenAdmin={handleToggleAdmin}
          />

          {/* Dynamic Modular Sections governed by No-Code CMS */}
          <main className="flex-1">
            {/* Hero Featured Spotlight Carousel at start of page */}
            {settings.carouselEnabled !== false && settings.sectionVisibility?.showCarousel !== false && (
              <div id="section-spotlight" className="mobile-snap-section w-full">
                <HeroCarousel
                  settings={settings}
                  products={products}
                  articles={articles}
                  portfolio={portfolio}
                  onSelectProduct={setSelectedProduct}
                  onSelectArticle={setSelectedArticle}
                  onSelectProject={setSelectedProject}
                />
              </div>
            )}

            {(() => {
              const activeSections = (homeSections || [])
                .filter(sec => sec && sec.enabled)
                .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

              return activeSections.map((sec, index) => {
                let sectionContent: React.ReactNode = null;

                switch (sec.sectionKey) {
                  case 'hero':
                    sectionContent = (
                      <HeroSection
                        settings={settings}
                      />
                    );
                    break;

                  case 'stats':
                    sectionContent = <StatsSection settings={settings} />;
                    break;

                  case 'about':
                    sectionContent = (
                      <AboutSection
                        settings={settings}
                        sectionConfig={sec}
                      />
                    );
                    break;

                  case 'skills':
                    sectionContent = <SkillsSection />;
                    break;

                  case 'contentCards':
                  case 'content-cards':
                    sectionContent = (
                      <ContentCardsSection 
                        settings={settings} 
                        sectionConfig={sec}
                      />
                    );
                    break;

                  case 'portfolio':
                    sectionContent = (
                      <PortfolioSection
                        portfolio={portfolio}
                        onSelectProject={setSelectedProject}
                        loading={dataLoading}
                        settings={settings}
                        sectionConfig={sec}
                      />
                    );
                    break;

                  case 'services':
                    sectionContent = null;
                    break;

                  case 'store':
                    sectionContent = (
                      <StoreSection
                        products={products}
                        settings={settings}
                        currency={settings.currency}
                        onSelectProduct={setSelectedProduct}
                        loading={dataLoading}
                        sectionConfig={sec}
                      />
                    );
                    break;

                  case 'articles':
                    sectionContent = (
                      <ArticlesSection
                        articles={articles}
                        onSelectArticle={setSelectedArticle}
                        settings={settings}
                        sectionConfig={sec}
                      />
                    );
                    break;

                  case 'testimonials':
                    sectionContent = <TestimonialsSection />;
                    break;

                  case 'subscribers':
                  case 'newsletter':
                    if (settings.sectionVisibility?.showNewsletter === false) {
                      sectionContent = null;
                    } else {
                      sectionContent = (
                        <section id="subscribers" className="py-16 sm:py-24 relative overflow-hidden bg-transparent border-t border-white/5">
                          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                            <NewsletterSubscription 
                              settings={settings} 
                              sectionConfig={sec} 
                            />
                          </div>
                        </section>
                      );
                    }
                    break;

                  case 'contact':
                    if (settings.sectionVisibility?.showContact === false) {
                      sectionContent = null;
                    } else {
                      sectionContent = (
                        <ContactSection
                          settings={settings}
                          sectionConfig={sec}
                          prefilledSubject={contactPrefillSubject}
                          onMessageSent={(newMsg) => {
                            setMessages((prev) => {
                              if (prev.some((m) => m.id === newMsg.id)) return prev;
                              return [newMsg, ...prev];
                            });
                          }}
                        />
                      );
                    }
                    break;

                  default:
                    sectionContent = null;
                }

                if (!sectionContent) return null;

                const bgStyle = getSectionBackgroundStyle(
                  sec.bgVariant, 
                  sec.bgCustomColor, 
                  sec.bgCustomColorDark
                );
                const isLast = index === activeSections.length - 1;
                const showDivider = settings.sectionDividers?.enabled !== false && !sec.hideDividerBottom && !isLast;

                return (
                  <React.Fragment key={sec.id}>
                    <div
                      id={`section-${sec.sectionKey}`}
                      data-section-key={sec.sectionKey}
                      className={`mobile-snap-section w-full transition-colors duration-300 ${bgStyle.className}`}
                      style={bgStyle.style}
                    >
                      {sectionContent}
                    </div>

                    {showDivider && (
                      <SectionDivider
                        style={settings.sectionDividers?.style}
                        colorPreset={settings.sectionDividers?.colorPreset}
                        customColor={settings.sectionDividers?.customColor}
                        spacing={settings.sectionDividers?.spacing}
                      />
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </main>

          {/* Footer */}
          <Footer
            settings={settings}
            onOpenAdmin={handleToggleAdmin}
          />

          {/* Mobile Touch-to-Scroll Snap Section Navigator (Mobile Only) */}
          <MobileSectionSnapNavigator
            settings={settings}
            homeSections={homeSections}
            hasHeroCarousel={settings.carouselEnabled !== false && settings.sectionVisibility?.showCarousel !== false}
          />

          {/* Global Interactive Overlays & Drawers */}
          <CartDrawer 
            currency={settings.currency}
            onCheckout={() => setIsCheckoutOpen(true)} 
          />

          <WishlistDrawer
            onSelectProduct={setSelectedProduct}
          />

          <ProductComparisonBar />
          <ProductComparisonModal
            onSelectProduct={setSelectedProduct}
          />

          <CheckoutModal
            isOpen={isCheckoutOpen}
            currency={settings.currency}
            settings={settings}
            onClose={() => setIsCheckoutOpen(false)}
            onOpenOrdersPortal={() => setIsOrdersPortalOpen(true)}
            onOrderPlaced={() => {
              fetchAllData();
            }}
          />

          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            portfolio={portfolio}
            products={products}
            articles={articles}
            services={services}
            onSelectProject={setSelectedProject}
            onSelectProduct={setSelectedProduct}
            onSelectArticle={setSelectedArticle}
          />

          {isOrdersPortalOpen && (
            <CustomerPortalModal
              isOpen={isOrdersPortalOpen}
              onClose={() => setIsOrdersPortalOpen(false)}
            />
          )}

          {selectedProject && (
            <ProjectDetailModal
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          )}

          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              currency={settings.currency}
              onClose={() => setSelectedProduct(null)}
            />
          )}

          {selectedArticle && (
            <ArticleDetailModal
              article={selectedArticle}
              onClose={() => setSelectedArticle(null)}
            />
          )}

          {/* Floating Direct Quick Connect Channels Widget */}
          <FloatingQuickConnect config={settings.floatingContact} />

        </motion.div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ComparisonProvider>
                <MainPlatform />
              </ComparisonProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
