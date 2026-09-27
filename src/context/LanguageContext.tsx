import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Direction } from '../types';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isTransitioning: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.portfolio': 'Portfolio',
    'nav.services': 'Services',
    'nav.store': 'Store',
    'nav.articles': 'Articles',
    'nav.contact': 'Contact',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.cart': 'Cart',
    'nav.myOrders': 'My Purchases',
    'nav.search': 'Search',

    // Hero
    'hero.available': 'Available for advisory & bespoke systems',
    'hero.ctaPortfolio': 'Explore Selected Works',
    'hero.ctaContact': 'Initiate Consultation',
    'hero.ctaStore': 'Browse Digital Assets',
    'hero.scrollDown': 'Scroll down to explore',

    // Stats
    'stats.experience': 'Years of High-Scale Engineering',
    'stats.projects': 'Enterprise Platforms Delivered',
    'stats.volume': 'Transaction Volume Processed',
    'stats.uptime': 'Production Service SLA',

    // About
    'about.heading': 'About & Overview',
    'about.sub': 'Driven by a clear vision, ambitious goals, and standards of excellence delivering tangible results.',
    'about.badge': 'Vision & Mission',
    'about.principlesTitle': 'Core Values & Principles',
    'about.p1Title': 'First-Principles Thinking',
    'about.p1Desc': 'Building lean, purpose-built systems that deliver high efficiency, reliability, and measurable value.',
    'about.p2Title': 'Commitment to Quality',
    'about.p2Desc': 'Highest standards of integrity, attention to detail, and client-first execution across all work.',
    'about.p3Title': 'Bilingual Craftsmanship',
    'about.p3Desc': 'Native support for Arabic and English typography, layouts, and intuitive user experiences.',

    // Skills
    'skills.heading': 'Core Capabilities & Arsenal',
    'skills.sub': 'Proven competencies and tools applied to deliver robust results.',

    // Portfolio
    'portfolio.heading': 'Featured Works & Portfolio',
    'portfolio.sub': 'Explore curated projects, strategic initiatives, and delivered solutions.',
    'portfolio.filterAll': 'All Projects',
    'portfolio.viewProject': 'View Details',
    'portfolio.liveDemo': 'Live Preview',
    'portfolio.sourceCode': 'Source Code',
    'portfolio.client': 'Client',
    'portfolio.year': 'Year',
    'portfolio.category': 'Discipline',
    'portfolio.mediaGallery': 'Project Assets & Media',

    // Services
    'services.heading': 'Services & Solutions',
    'services.sub': 'Specialized consulting, strategic planning, and end-to-end execution.',
    'services.startingFrom': 'Starting from',
    'services.inquire': 'Inquire About Service',

    // Store
    'store.heading': 'Store & Solutions',
    'store.sub': 'Curated digital and physical products designed to meet your needs.',
    'store.filterAll': 'All Products',
    'store.filterDigital': 'Digital Assets',
    'store.filterPhysical': 'Physical Products',
    'store.filterService': 'Specialized Services',
    'store.addToCart': 'Add to Cart',
    'store.buyNow': 'Buy Instantly',
    'store.inStock': 'in stock',
    'store.lowStock': 'Low Stock!',
    'store.outOfStock': 'Out of Stock',
    'store.digitalDownload': 'Instant Digital Download',
    'store.instantAccess': 'Instant Access & Download',
    'store.viewDetails': 'View Details',

    // Cart & Checkout
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is currently empty.',
    'cart.emptySub': 'Browse the store to explore available products, resources, and services.',
    'cart.subtotal': 'Subtotal',
    'cart.total': 'Total Due',
    'cart.checkout': 'Proceed to Checkout',
    'checkout.title': 'Secure Checkout',
    'checkout.sub': 'Direct cloud verification and instant digital fulfillment.',
    'checkout.fullName': 'Full Name',
    'checkout.email': 'Email Address (for fulfillment & access)',
    'checkout.phone': 'Phone Number',
    'checkout.address': 'Delivery / Billing Address',
    'checkout.paymentMethod': 'Payment Method',
    'checkout.payOnline': 'Card / Instant Digital Pay (Simulated/Ready)',
    'checkout.payTransfer': 'Wire Transfer / Invoice Confirmation',
    'checkout.payDelivery': 'Cash on Delivery (Physical items)',
    'checkout.completeOrder': 'Authorize & Place Order',
    'checkout.successTitle': 'Order Successfully Confirmed!',
    'checkout.orderNumber': 'Order Reference',
    'checkout.successDesc': 'Thank you! Your order has been securely recorded. Digital items are unlocked below.',
    'checkout.downloadFile': 'Download Access File',
    'checkout.close': 'Return to Platform',

    // Articles
    'articles.heading': 'Articles, Research & Insights',
    'articles.sub': 'In-depth essays, specialized research studies, and curated publications.',
    'articles.readArticle': 'Read Essay',
    'articles.readTime': 'min read',

    // Contact
    'contact.heading': 'Initiate Consultation',
    'contact.sub': 'Have an inquiry, publication proposal, or collaboration request? Let us connect.',
    'contact.name': 'Your Name',
    'contact.email': 'Your Email Address',
    'contact.subject': 'Subject / Topic',
    'contact.message': 'Your Message or Inquiry Brief',
    'contact.send': 'Send Message',
    'contact.sending': 'Sending message...',
    'contact.success': 'Message received. I will review and reply within 24 hours.',
    'contact.info': 'Direct Coordinates',

    // Footer
    'footer.links': 'Quick Navigation',
    'footer.socials': 'Network & Channels',
    'footer.stayTuned': 'Stay Informed',
    'footer.newsletterSub': 'Occasional deep dives into research, books, and creative releases.',

    // Theme
    'theme.toggle': 'Toggle Theme',
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',

    // Orders & Tracking
    'orders.trackOrder': 'Track Order',
    'orders.trackOrderSub': 'Enter your order reference number to see real-time shipping and fulfillment progress.',
    'orders.orderNumberPlaceholder': 'e.g. ORD-1024 or #1024',
    'orders.trackButton': 'Track Shipment',
    'orders.trackingStatus': 'Tracking Status',
    'orders.confirmed': 'Order Confirmed',
    'orders.processing': 'Processing & Packaging',
    'orders.shipped': 'Shipped & In Transit',
    'orders.delivered': 'Delivered / Fulfilled',
    'orders.printInvoice': 'Print Invoice / Receipt',
    'orders.customerPortalTitle': 'Customer Portal & Tracking',
    'orders.purchasesTab': 'Order History',
    'orders.trackTab': 'Track Order',
    'orders.notFound': 'No order found with reference',
    'orders.carrier': 'Carrier / Logistics',
    'orders.estimatedDelivery': 'Estimated Arrival',
    'orders.trackingNumber': 'Carrier Waybill #',

    // Newsletter
    'newsletter.title': 'Subscribers & Curated Newsletter',
    'newsletter.subtitle': 'Latest publications, research studies, audio-visual works, and curated releases delivered to your inbox.',
    'newsletter.placeholder': 'Enter your email address...',
    'newsletter.button': 'Subscribe',
    'newsletter.subscribing': 'Subscribing...',
    'newsletter.success': 'You are successfully subscribed! Welcome aboard.',
    'newsletter.alreadySubscribed': 'You are already subscribed to updates.',
    'newsletter.privacy': 'Strict privacy, zero spam, and unsubscribe anytime.',
    'newsletter.badge': 'Curated Publications',

    // Common Print & Transitions
    'common.print': 'Print',
    'common.printInvoice': 'Print Official Invoice',
    'common.printArticle': 'Print Article',
    'lang.switched': 'Switched to English',

    // Admin Dashboard
    'admin.dashboard': 'Platform Control Center',
    'admin.noCodeCms': 'Visual No-Code CMS & Operations',
    'admin.overview': 'Overview',
    'admin.cms': 'Visual CMS (Home)',
    'admin.portfolio': 'Portfolio Projects',
    'admin.store': 'Store & Products',
    'admin.inventory': 'Inventory & Stock',
    'admin.orders': 'Orders & Fulfillment',
    'admin.articles': 'Articles & Research',
    'admin.media': 'Media Vault',
    'admin.messages': 'Inquiries & Messages',
    'admin.settings': 'Platform Settings',
    'admin.users': 'Users & RBAC',
    'admin.exit': 'Return to Public Site',
    'admin.saveChanges': 'Save & Publish to Cloud',
    'admin.draft': 'Draft',
    'admin.published': 'Published',
    'admin.archived': 'Archived',
    'admin.addNew': 'Add New Item',
    'admin.edit': 'Edit',
    'admin.delete': 'Delete',
    'admin.confirmDelete': 'Are you sure you want to remove this item?',
    'admin.cancel': 'Cancel',
    'admin.save': 'Save Item',
    'admin.previewMode': 'Live Preview Mode'
  },
  ar: {
    // Nav
    'nav.home': 'الرئيسية',
    'nav.about': 'عني',
    'nav.portfolio': 'معرض الأعمال',
    'nav.services': 'الخدمات',
    'nav.store': 'المتجر',
    'nav.articles': 'المقالات',
    'nav.contact': 'تواصل معي',
    'nav.dashboard': 'لوحة التحكم',
    'nav.login': 'تسجيل الدخول',
    'nav.logout': 'تسجيل الخروج',
    'nav.cart': 'السلة',
    'nav.myOrders': 'مشترياتي',
    'nav.search': 'بحث',

    // Hero
    'hero.available': 'متاح للأعمال والمشاريع والتعاون المهني',
    'hero.ctaPortfolio': 'استكشف أبرز الأعمال',
    'hero.ctaContact': 'ابدأ التواصل الآن',
    'hero.ctaStore': 'تصفح المتجر',
    'hero.scrollDown': 'مرر للأسفل للاستكشاف',

    // Stats
    'stats.experience': 'سنوات من الخبرة والعمل المتواصل',
    'stats.projects': 'عملاً وإصداراً تم نشره بنجاح',
    'stats.volume': 'مشاريع وشراكات منجزة',
    'stats.uptime': 'معايير الجودة والالتزام التام',

    // About
    'about.heading': 'الرؤية والتعريف بالمنصة',
    'about.sub': 'تقديم حلول متكاملة ورؤية واضحة تقود إلى أفضل النتائج والقيمة المستدامة.',
    'about.badge': 'الرؤية والأهداف',
    'about.principlesTitle': 'المبادئ والقيم الأساسية',
    'about.p1Title': 'التفكير من المبادئ الأولى',
    'about.p1Desc': 'الاعتماد على حلول مباشرة، مرنة، وعالية الكفاءة تحقق أقصى فاعلية وقيمة ملموسة.',
    'about.p2Title': 'الالتزام بأعلى معايير الجودة',
    'about.p2Desc': 'تطبيق معايير الدقة والاحترافية والاهتمام بأدق التفاصيل لضمان رضا وثقة العملاء والشركاء.',
    'about.p3Title': 'إتقان ثنائي اللغة (RTL)',
    'about.p3Desc': 'دعم أصيل ومتكامل للغتين العربية والإنجليزية لتوفير تجربة استخدام راقية ومتسقة.',

    // Skills
    'skills.heading': 'المجالات والقدرات الأساسية',
    'skills.sub': 'إمكانات وخبرات عملية مطبقة لتحقيق نتائج متفوقة ومستدامة.',

    // Portfolio
    'portfolio.heading': 'معرض الأعمال والمخرجات',
    'portfolio.sub': 'استعراض لأبرز المشاريع، الحلول المنفذة، والمبادرات الناجحة.',
    'portfolio.filterAll': 'كل المشاريع',
    'portfolio.viewProject': 'تفاصيل المشروع',
    'portfolio.liveDemo': 'معاينة حية',
    'portfolio.sourceCode': 'الكود المصدري',
    'portfolio.client': 'الجهة / العميل',
    'portfolio.year': 'سنة التنفيذ',
    'portfolio.category': 'المجال',
    'portfolio.mediaGallery': 'معرض وسائط وملفات المشروع',

    // Services
    'services.heading': 'الخدمات والحلول',
    'services.sub': 'استشارات متخصصة، تخطيط استراتيجي، وحلول شاملة تلبي متطلباتكم.',
    'services.startingFrom': 'تبدأ من',
    'services.inquire': 'طلب تفاصيل الخدمة',

    // Store
    'store.heading': 'المتجر والحلول الرقمية',
    'store.sub': 'منتجات وخدمات رقمية وملموسة مصممة بعناية لتلبية تطلعاتك.',
    'store.filterAll': 'جميع المنتجات',
    'store.filterDigital': 'منتجات رقمية',
    'store.filterPhysical': 'منتجات ملموسة',
    'store.filterService': 'خدمات واستشارات',
    'store.addToCart': 'أضف إلى السلة',
    'store.buyNow': 'شراء فوري',
    'store.inStock': 'قطعة متوفرة',
    'store.lowStock': 'كمية محدودة!',
    'store.outOfStock': 'نفدت الكمية',
    'store.digitalDownload': 'تحميل رقمي فوري',
    'store.instantAccess': 'وصول وتحميل فوري للملفات',
    'store.viewDetails': 'تفاصيل المنتج',

    // Cart & Checkout
    'cart.title': 'سلة المشتريات',
    'cart.empty': 'سلتك فارغة حالياً.',
    'cart.emptySub': 'تصفح المتجر لاكتشاف المنتجات والخدمات والموارد المتاحة.',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.total': 'المجموع الكلي',
    'cart.checkout': 'متابعة الدفع والطلب',
    'checkout.title': 'إتمام الطلب بأمان',
    'checkout.sub': 'معالجة سحابية آمنة وتسليم فوري للمنتجات الرقمية.',
    'checkout.fullName': 'الاسم الكامل',
    'checkout.email': 'البريد الإلكتروني (لتسليم الملفات والوصول)',
    'checkout.phone': 'رقم الهاتف',
    'checkout.address': 'عنوان الشحن أو الفاتورة',
    'checkout.paymentMethod': 'طريقة الدفع',
    'checkout.payOnline': 'بطاقة بنكية / دفع رقمي مباشر',
    'checkout.payTransfer': 'تحويل بنكي / تأكيد الفاتورة',
    'checkout.payDelivery': 'الدفع عند الاستلام (للمنتجات الملموسة)',
    'checkout.completeOrder': 'تأكيد وإتمام الطلب الآن',
    'checkout.successTitle': 'تم تأكيد طلبك بنجاح!',
    'checkout.orderNumber': 'رقم الطلب المرجعي',
    'checkout.successDesc': 'شكراً لك! تم تسجيل طلبك في النظام بأمان. يمكنك تحميل ملفاتك الرقمية بالأسفل مباشرة.',
    'checkout.downloadFile': 'تحميل الملف الرقمي',
    'checkout.close': 'العودة للمنصة',

    // Articles
    'articles.heading': 'المقالات والأبحاث والدراسات',
    'articles.sub': 'دراسات معمقة، أطروحات فكرية، أبحاث متخصصة، ومقالات دورية تثري المعرفة.',
    'articles.readArticle': 'قراءة المقال بالكامل',
    'articles.readTime': 'دقائق قراءة',

    // Contact
    'contact.heading': 'تواصل معي مباشرة',
    'contact.sub': 'هل لديك استفسار، فكرة عمل، أو رغبة في التعاون وبناء مشاريع مميزة؟ يسعدني التواصل معك.',
    'contact.name': 'اسمك الكريم',
    'contact.email': 'بريدك الإلكتروني',
    'contact.subject': 'موضوع الرسالة',
    'contact.message': 'تفاصيل رسالتك أو استفسارك',
    'contact.send': 'إرسال الرسالة',
    'contact.sending': 'جارٍ إرسال الرسالة...',
    'contact.success': 'تم استلام رسالتك بنجاح! سأرد عليك شخصياً خلال 24 ساعة.',
    'contact.info': 'قنوات التواصل المباشرة',

    // Footer
    'footer.links': 'روابط سريعة',
    'footer.socials': 'الشبكات والقنوات',
    'footer.stayTuned': 'ابقَ على اطلاع',
    'footer.newsletterSub': 'أحدث الإصدارات، الأبحاث والمقالات مباشرة إلى بريدك الإلكتروني.',

    // Theme
    'theme.toggle': 'تبديل المظهر',
    'theme.light': 'الوضع الفاتح',
    'theme.dark': 'الوضع الداكن',

    // Orders & Tracking
    'orders.trackOrder': 'تتبع الطلب',
    'orders.trackOrderSub': 'أدخل رقم الطلب المرجعي للاطلاع على حالة الشحن والتسليم اللحظية.',
    'orders.orderNumberPlaceholder': 'مثال: ORD-1024 أو #1024',
    'orders.trackButton': 'تتبع الشحنة',
    'orders.trackingStatus': 'حالة الشحن',
    'orders.confirmed': 'تم تأكيد الطلب',
    'orders.processing': 'التجهيز والتغليف',
    'orders.shipped': 'تم الشحن وفي الطريق',
    'orders.delivered': 'تم التسليم بنجاح',
    'orders.printInvoice': 'طباعة الفاتورة والإيصال',
    'orders.customerPortalTitle': 'بوابة المشتريات وتتبع الطلبات',
    'orders.purchasesTab': 'سجل المشتريات',
    'orders.trackTab': 'تتبع الطلب',
    'orders.notFound': 'لم يتم العثور على طلب بهذا الرقم المرجعي',
    'orders.carrier': 'شركة الشحن واللوجستيات',
    'orders.estimatedDelivery': 'موعد الوصول المتوقع',
    'orders.trackingNumber': 'رقم بوليصة الشحن',

    // Newsletter
    'newsletter.title': 'المشتركون والنشرة الفكرية',
    'newsletter.subtitle': 'أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك.',
    'newsletter.placeholder': 'أدخل بريدك الإلكتروني...',
    'newsletter.button': 'اشتراك',
    'newsletter.subscribing': 'جارٍ التسجيل...',
    'newsletter.success': 'تم اشتراكك بنجاح! يسعدنا انضمامك.',
    'newsletter.alreadySubscribed': 'أنت مشترك بالفعل في النشرة البريدية.',
    'newsletter.privacy': 'خصوصية تامة، بدون رسائل مزعجة، وإمكانية إلغاء الاشتراك في أي وقت.',
    'newsletter.badge': 'إصدارات ومحتوى دوري',

    // Common Print & Transitions
    'common.print': 'طباعة',
    'common.printInvoice': 'طباعة الفاتورة الرسمية',
    'common.printArticle': 'طباعة المقال',
    'lang.switched': 'تم التحويل إلى العربية',

    // Admin Dashboard
    'admin.dashboard': 'مركز قيادة المنصة',
    'admin.noCodeCms': 'نظام إدارة المحتوى البصري والعمليات',
    'admin.overview': 'نظرة عامة',
    'admin.cms': 'المحتوى البصري (الرئيسية)',
    'admin.portfolio': 'مشاريع المعرض',
    'admin.store': 'المتجر والمنتجات',
    'admin.inventory': 'المخزون والكميات',
    'admin.orders': 'الطلبات والمبيعات',
    'admin.articles': 'المقالات والمدونة',
    'admin.media': 'مكتبة الوسائط',
    'admin.messages': 'رسائل التواصل',
    'admin.settings': 'إعدادات المنصة',
    'admin.users': 'المستخدمين والصلاحيات',
    'admin.exit': 'العودة للموقع العام',
    'admin.saveChanges': 'حفظ ونشر على السحابة',
    'admin.draft': 'مسودة',
    'admin.published': 'منشور',
    'admin.archived': 'مؤرشف',
    'admin.addNew': 'إضافة عنصر جديد',
    'admin.edit': 'تعديل',
    'admin.delete': 'حذف',
    'admin.confirmDelete': 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟',
    'admin.cancel': 'إلغاء',
    'admin.save': 'حفظ العنصر',
    'admin.previewMode': 'وضع المعاينة المباشرة'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('site_language') as Language;
    return saved === 'ar' || saved === 'en' ? saved : 'ar'; // Default Arabic as requested
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('site_language', language);
  }, [language, direction]);

  const triggerTransition = (newLang: Language) => {
    if (newLang === language) return;
    setIsTransitioning(true);
    setShowToast(true);
    setLanguageState(newLang);
    
    // Smooth transition duration to match layout change
    setTimeout(() => {
      setIsTransitioning(false);
    }, 320);

    setTimeout(() => {
      setShowToast(false);
    }, 1800);
  };

  const setLanguage = (lang: Language) => {
    triggerTransition(lang);
  };

  const toggleLanguage = () => {
    triggerTransition(language === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, isTransitioning, setLanguage, toggleLanguage, t }}>
      {children}
      {/* Floating smooth transition pill notification */}
      {showToast && (
        <div 
          className="fixed bottom-6 start-6 z-50 pointer-events-none transition-all duration-300 transform translate-y-0 opacity-100 no-print"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#111216] text-white shadow-2xl border border-neutral-800 text-xs font-mono font-medium tracking-wide animate-in fade-in slide-in-from-bottom-3 duration-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{language === 'ar' ? 'تم تحويل الواجهة إلى اللغة العربية (RTL)' : 'Switched interface to English (LTR)'}</span>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
