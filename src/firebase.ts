import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  collection, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  SiteSettings, 
  PortfolioItem, 
  ProductItem, 
  ArticleItem, 
  HomeSectionItem, 
  ServiceItem,
  MediaItem
} from './types';

// Suppress benign internal WebChannel streaming/reconnect warning logs
try {
  setLogLevel('error');
} catch {}

// Initialize Firebase SDK
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID from config as mandated by Firebase Skill.
// In browser environments (particularly inside sandboxed iframes and proxy buffers),
// experimentalForceLongPolling avoids WebChannel persistent stream transport errors on idle disconnects.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      ...(typeof window !== 'undefined' ? { experimentalForceLongPolling: true } : {}),
      ignoreUndefinedProperties: true
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection verification test as mandated by Firebase Skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore client running in offline-first mode.');
    }
  }
}

// Structured Firestore error handling as mandated by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Utility to recursively strip all undefined properties from Firestore write payloads
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (typeof item === 'object' && item !== null) ? cleanFirestorePayload(item) : item) as unknown as T;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = cleanFirestorePayload(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// Default Site Settings - Clean initial state matching the registered platform
export const defaultSiteSettings: SiteSettings = {
  brandNameEn: 'Ibrahim Elshrief',
  brandNameAr: 'إبراهيم الشريف',
  headerSubtitleEn: '',
  headerSubtitleAr: '',
  showJobTitleInHeader: true,
  titleEn: '',
  titleAr: '',
  bioEn: '',
  bioAr: '',
  avatarUrl: '',
  contactEmail: '',
  phone: '',
  locationEn: '',
  locationAr: '',
  socialLinks: {
    github: '',
    linkedin: '',
    twitter: '',
    youtube: '',
    telegram: '',
    whatsapp: ''
  },
  navigation: [
    { id: '1', labelEn: 'Home', labelAr: 'الرئيسية', href: '#hero', enabled: true },
    { id: '2', labelEn: 'About', labelAr: 'عني', href: '#about', enabled: true },
    { id: '3', labelEn: 'Portfolio', labelAr: 'معرض الأعمال', href: '#portfolio', enabled: true },
    { id: '5', labelEn: 'Store', labelAr: 'المتجر الرقمي', href: '#store', enabled: true },
    { id: '6', labelEn: 'Articles', labelAr: 'المقالات', href: '#articles', enabled: true },
    { id: '7', labelEn: 'Contact', labelAr: 'تواصل معي', href: '#contact', enabled: true },
  ],
  footerTextEn: '',
  footerTextAr: '',
  seoTitle: 'إبراهيم الشريف | Ibrahim Elshrief',
  seoDescription: '',
  tabTitleMode: 'both',
  customTabTitleAr: '',
  customTabTitleEn: '',
  faviconUrl: '',
  currency: 'USD',
  themeDefault: 'light',
  paymentGateways: {
    cashEnabled: true,
    cashWalletNumber: '01012345678',
    cashWalletHolder: '',
    cashInstructionsAr: 'يتم التحويل على الرقم وتصوير شاشة الإيصال لإرفاقها في الخطوة التالية',
    cashExchangeRateUsdToEgp: 50,
    airtmEnabled: true,
    airtmUsername: 'username',
    airtmInstructionsAr: 'يتم التحويل على حساب AIRTM الموضح والتقاط لقطة شاشة للإيصال',
    airtmDirectLink: 'https://app.airtm.com/',
    paypalEnabled: true,
    paypalEmailOrLink: '',
    paypalInstructionsAr: 'يتم الدفع عبر حساب PayPal وإرفاق بيانات ومعرف المعاملة',
    customMethods: []
  },
  aboutBadgeEn: 'Vision & Mission',
  aboutBadgeAr: 'الرؤية والرسالة',
  aboutHeadingEn: 'About & Overview',
  aboutHeadingAr: 'نبذة ورؤية عامة',
  aboutSubEn: 'Driven by a clear vision, ambitious goals, and standards of excellence delivering tangible results.',
  aboutSubAr: 'تقديم رؤية واضحة، وأهداف طموحة، ومعايير أداء استثنائية تقود إلى نتائج ملموسة.',
  aboutParagraph2En: 'Dedicated to delivering thoughtful solutions, high-quality experiences, and impactful work built with precision and care.',
  aboutParagraph2Ar: 'نسعى دائماً لتقديم حلول متقنة وتجارب ذات قيمة استثنائية، تجمع بين الاحترافية والجودة العالية بما يحقق تطلعات عملائنا وشركائنا.',
  aboutFeatures: [
    { id: 'f1', textAr: 'أكثر من 10 سنوات من الخبرة والعمل المتواصل', textEn: 'Over 10 Years of Proven Industry Experience' },
    { id: 'f2', textAr: 'حلول مبتكرة مصممة بعناية لتلبية المتطلبات', textEn: 'Innovative Solutions Tailored to Real Needs' },
    { id: 'f3', textAr: 'التزام صارم بأعلى معايير الجودة والموثوقية', textEn: 'Uncompromising Standards of Quality & Trust' },
    { id: 'f4', textAr: 'دعم ومتابعة مستمرة لضمان أفضل النتائج', textEn: 'Dedicated Support & Continuous Value Delivery' },
  ],
  aboutPrinciplesTitleEn: 'Core Principles & Values',
  aboutPrinciplesTitleAr: 'المبادئ والقيم الأساسية',
  aboutPrinciples: [
    {
      id: 'p1',
      iconName: 'Sparkles',
      titleAr: 'الجودة والإتقان',
      titleEn: 'Quality & Craftsmanship',
      descAr: 'التزام كامل بأدق التفاصيل لتقديم أعمال ومنتجات تتجاوز التوقعات.',
      descEn: 'Meticulous attention to detail, crafting solutions that consistently exceed expectations.',
    },
    {
      id: 'p2',
      iconName: 'Layers',
      titleAr: 'الابتكار والتطوير المستمر',
      titleEn: 'Innovation & Continuous Growth',
      descAr: 'تبني أحدث المنهجيات والأساليب لضمان تقديم حلول رصينة، فعالة، ومستدامة.',
      descEn: 'Embracing modern approaches and agile thinking to deliver cutting-edge outcomes.',
    },
    {
      id: 'p3',
      iconName: 'ShieldCheck',
      titleAr: 'الموثوقية والشفافية',
      titleEn: 'Reliability & Transparency',
      descAr: 'بناء علاقات متينة قائمة على الوضوح، الأمانة، والالتزام الكامل بأعلى المعايير.',
      descEn: 'Fostering lasting partnerships built on trust, integrity, and dependable execution.',
    }
  ],
  heroAvailabilityTextAr: 'متاح للمشاريع والتعاون المهني والحلول المبتكرة',
  heroAvailabilityTextEn: 'Available for projects and strategic collaborations',
  heroOverlayTitleAr: 'منصة متكاملة ومشاريع متخصصة',
  heroOverlayTitleEn: 'Comprehensive Platform & Specialized Solutions',
  heroOverlaySubAr: 'حلول عملية • منتجات رقمية • تميز مستمر',
  heroOverlaySubEn: 'Practical Solutions • Digital Products • Continuous Excellence',
  heroOverlayIcon: 'Sparkles',
  heroFloatingBadges: [
    {
      id: 'hb-1',
      badgeValue: '10+',
      titleAr: 'سنوات من الخبرة والتميز',
      titleEn: 'Years of Experience',
      subAr: 'مشاريع وإنجازات متواصلة',
      subEn: 'Delivered Projects',
      position: 'top-start',
      enabled: true
    },
    {
      id: 'hb-2',
      badgeValue: '100%',
      titleAr: 'رضا وثقة العملاء',
      titleEn: 'Client Satisfaction',
      subAr: 'جودة واعتمادية عالية',
      subEn: 'Quality & Reliability',
      position: 'bottom-end',
      enabled: true
    }
  ],
  customSocialLinks: [
    { id: 'cs-yt', platform: 'youtube', labelAr: 'قناة اليوتيوب', labelEn: 'YouTube Channel', url: 'https://youtube.com', enabled: true },
    { id: 'cs-x', platform: 'twitter', labelAr: 'منصة إكس (تويتر)', labelEn: 'X (Twitter)', url: 'https://x.com', enabled: true },
    { id: 'cs-gr', platform: 'goodreads', labelAr: 'صفحة المنصة', labelEn: 'Platform Page', url: 'https://goodreads.com', enabled: false },
    { id: 'cs-ig', platform: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram', url: 'https://instagram.com', enabled: true },
    { id: 'cs-pod', platform: 'podcast', labelAr: 'البودكاست', labelEn: 'Podcast', url: 'https://podcasts.google.com', enabled: false },
    { id: 'cs-tg', platform: 'telegram', labelAr: 'قناة التلغرام', labelEn: 'Telegram', url: 'https://t.me', enabled: true }
  ],
  contentCards: [
    {
      id: 'cc-1',
      tagAr: 'الخدمات والمنتجات',
      tagEn: 'Offerings & Products',
      titleAr: 'منتجات متكاملة وحلول ذكية',
      titleEn: 'Comprehensive Solutions & Products',
      contentAr: 'تقديم منتجات وحلول مصممة لتلبية احتياجاتك بكفاءة عالية وجودة فائقة مع التركيز على النتائج الملموسة.',
      contentEn: 'Delivering tailored solutions and premium products built to drive measurable results and superior performance.',
      iconName: 'Sparkles',
      order: 1,
      enabled: true
    },
    {
      id: 'cc-2',
      tagAr: 'الإبداع والتطوير',
      tagEn: 'Creative Innovation',
      titleAr: 'تطوير مستمر وابتكار متجدد',
      titleEn: 'Continuous Development & Innovation',
      contentAr: 'اعتماد أحدث المنهجيات والأفكار لضمان بقاء أعمالك في الصدارة ومواكبة متطلبات المستقبل.',
      contentEn: 'Leveraging modern methodologies and agile thinking to ensure your initiatives stay ahead of the curve.',
      iconName: 'Layers',
      order: 2,
      enabled: true
    },
    {
      id: 'cc-3',
      tagAr: 'الموثوقية والجودة',
      tagEn: 'Quality & Reliability',
      titleAr: 'معايير إتقان ومتابعة مستدامة',
      titleEn: 'Standards of Excellence & Support',
      contentAr: 'التزام كامل بالجودة والدقة، مع توفير دعم ومتابعة دورية تضمن تحقيق أقصى قيمة ممكنة.',
      contentEn: 'Uncompromising commitment to precision, backed by reliable continuous support for lasting success.',
      iconName: 'ShieldCheck',
      order: 3,
      enabled: true
    }
  ],
  sectionVisibility: {
    showHero: true,
    showHeroAvailabilityBadge: true,
    showHeroOverlayBadge: true,
    showHeroFloatingBadges: true,
    showAbout: true,
    showAboutNarrative: true,
    showAboutFeatures: true,
    showAboutPrinciples: true,
    showContentCards: true,
    showPortfolio: true,
    showServices: true,
    showStore: true,
    showArticles: true,
    showTestimonials: true,
    showContact: true,
    showNewsletter: true,
    showFooterSection: true,
    showFooterNewsletter: true,
    showFooterBrandInfo: true,
    showFooterSocialChannels: true,
    showFooterSocialIcons: true,
    showFooterDirectContact: true,
    showFooterNav: true,
    showFooterBottomBar: true,
    showFooterBackToTop: true,
    showFooterOwnerPortalLink: true
  },
  carouselEnabled: true,
  carouselAutoPlay: true,
  carouselSpeed: 4,
  carouselPauseOnHover: false,
  storeCategories: [
    {
      id: 'cat-digital',
      slug: 'digital',
      nameAr: 'كتب ومواد رقمية',
      nameEn: 'Books & Digital Media',
      enabledOnHome: true,
      homeLimit: 4,
      homeOrder: 1,
      badgeAr: 'تحميل فوري',
      badgeEn: 'Instant Downloads',
      subtitleAr: 'كتب إلكترونية، ملفات صوتية ومرئية، وأبحاث جاهزة للاستخدام والتحميل المباشر',
      subtitleEn: 'E-books, audio-visual files, and research ready for instant access',
      iconName: 'Layers'
    },
    {
      id: 'cat-physical',
      slug: 'physical',
      nameAr: 'مطبوعات وإصدارات ورقية',
      nameEn: 'Printed Books & Publications',
      enabledOnHome: true,
      homeLimit: 4,
      homeOrder: 2,
      badgeAr: 'شحن وتوصيل',
      badgeEn: 'Physical Shipping',
      subtitleAr: 'كتب ومطبوعات وإصدارات متخصصة متوفرة للشحن والتوصيل المباشر',
      subtitleEn: 'Curated physical books, publications, and items available for shipping',
      iconName: 'Package'
    },
    {
      id: 'cat-services',
      slug: 'services',
      nameAr: 'خدمات واستشارات',
      nameEn: 'Services & Advisory',
      enabledOnHome: true,
      homeLimit: 4,
      homeOrder: 3,
      badgeAr: 'استشارات متخصصة',
      badgeEn: 'Direct Advisory',
      subtitleAr: 'جلسات استشارية وخدمات تنفيذية مصممة خصيصاً لمشاريعك',
      subtitleEn: 'Custom advisory sessions and professional services tailored to your needs',
      iconName: 'Sparkles'
    }
  ],
  floatingContact: {
    enabled: true,
    position: 'bottom-right',
    badgeTextAr: 'تواصل معنا مباشرة',
    badgeTextEn: 'Direct Chat',
    channels: [
      {
        id: 'fc-wa',
        type: 'whatsapp',
        titleAr: 'محادثة واتساب فورية',
        titleEn: 'WhatsApp Direct Chat',
        value: '+20123456789',
        isPrimary: true,
        enabled: true,
        color: '#25D366'
      },
      {
        id: 'fc-tg',
        type: 'telegram',
        titleAr: 'تيليجرام / محادثة مباشرة',
        titleEn: 'Telegram Direct Chat',
        value: 'https://t.me/username',
        isPrimary: false,
        enabled: true,
        color: '#0088cc'
      },
      {
        id: 'fc-tg-group',
        type: 'telegram_group',
        titleAr: 'مجموعة تيليجرام الرسمية',
        titleEn: 'Telegram Community Group',
        value: 'https://t.me/group_invite',
        isPrimary: false,
        enabled: true,
        color: '#229ED9'
      },
      {
        id: 'fc-fb',
        type: 'facebook',
        titleAr: 'صفحة فيسبوك الرسمية',
        titleEn: 'Facebook Official Page',
        value: 'https://facebook.com/yourpage',
        isPrimary: false,
        enabled: true,
        color: '#1877F2'
      }
    ]
  },
  sectionDividers: {
    enabled: true,
    style: 'gradient',
    colorPreset: 'emerald',
    spacing: 'normal'
  },
  newsletterBadgeAr: 'إصدارات ومحتوى دوري',
  newsletterBadgeEn: 'Curated Publications',
  newsletterTitleAr: 'المشتركون والنشرة الفكرية',
  newsletterTitleEn: 'Subscribers & Curated Newsletter',
  newsletterSubAr: 'أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك.',
  newsletterSubEn: 'Latest publications, research studies, audio-visual works, and curated releases delivered to your inbox.',
  newsletterPrivacyAr: 'خصوصية تامة، بدون رسائل مزعجة، وإمكانية إلغاء الاشتراك في أي وقت.',
  newsletterPrivacyEn: 'Strict privacy, zero spam, and unsubscribe anytime.',
  newsletterButtonAr: 'اشتراك',
  newsletterButtonEn: 'Subscribe',
  newsletterPlaceholderAr: 'أدخل بريدك الإلكتروني...',
  newsletterPlaceholderEn: 'Enter your email address...'
};

// Default Home Sections
export const defaultHomeSections: HomeSectionItem[] = [
  { 
    id: 'sec-hero', 
    sectionKey: 'hero', 
    titleEn: 'Hero Header', 
    titleAr: 'الواجهة الرئيسية', 
    enabled: true, 
    order: 1,
    bgVariant: 'default'
  },
  { 
    id: 'sec-about', 
    sectionKey: 'about', 
    titleEn: 'About & Overview', 
    titleAr: 'نبذة ورؤية عامة', 
    badgeAr: 'الرؤية والرسالة',
    badgeEn: 'Vision & Mission',
    subtitleAr: 'تقديم رؤية واضحة، وأهداف طموحة، ومعايير أداء استثنائية تقود إلى نتائج ملموسة.',
    subtitleEn: 'Driven by a clear vision, ambitious goals, and standards of excellence delivering tangible results.',
    enabled: true, 
    order: 2,
    bgVariant: 'muted'
  },
  { 
    id: 'sec-content-cards', 
    sectionKey: 'contentCards', 
    titleEn: 'Key Highlights & Features', 
    titleAr: 'المحاور والمميزات الرئيسية', 
    badgeAr: 'المميزات والخدمات',
    badgeEn: 'Key Highlights',
    subtitleAr: 'استعراض لأبرز المسارات، الخدمات، والمميزات الأساسية التي تقدم قيمة حقيقية.',
    subtitleEn: 'Overview of core pathways, services, and strategic advantages providing lasting value.',
    enabled: true, 
    order: 3,
    bgVariant: 'default'
  },
  { 
    id: 'sec-portfolio', 
    sectionKey: 'portfolio', 
    titleEn: 'Featured Projects & Works', 
    titleAr: 'معرض الأعمال والمشاريع', 
    badgeAr: 'سجل الإنجازات',
    badgeEn: 'Portfolio & Works',
    subtitleAr: 'استعراض للمشاريع، النظم، والحلول المنفذة بجودة واحترافية عالية.',
    subtitleEn: 'Showcase of selected projects, solutions, and implementations delivered with excellence.',
    enabled: true, 
    order: 4,
    bgVariant: 'subtle'
  },
  { 
    id: 'sec-store', 
    sectionKey: 'store', 
    titleEn: 'Store & Products', 
    titleAr: 'المتجر والمنتجات', 
    badgeAr: 'المتجر والمنتجات',
    badgeEn: 'Store & Catalog',
    subtitleAr: 'تصفح باقة منتقاة من المنتجات، الحلول، والملفات الرقمية المتاحة للطلب الفوري.',
    subtitleEn: 'Explore a curated collection of premium products, solutions, and digital items available instantly.',
    enabled: true, 
    order: 5,
    bgVariant: 'default'
  },
  { 
    id: 'sec-articles', 
    sectionKey: 'articles', 
    titleEn: 'Articles & Insights', 
    titleAr: 'المقالات والأفكار', 
    badgeAr: 'الأفكار والمقالات',
    badgeEn: 'Articles & Insights',
    subtitleAr: 'رؤى وتحليلات متخصصة ومقالات دورية تناقش أهم المستجدات والأفكار.',
    subtitleEn: 'In-depth analysis, expert perspectives, and curated articles on relevant topics.',
    enabled: true, 
    order: 6,
    bgVariant: 'muted'
  },
  { 
    id: 'sec-subscribers', 
    sectionKey: 'subscribers', 
    titleEn: 'Subscribers & Curated Newsletter', 
    titleAr: 'المشتركون والنشرة الفكرية', 
    badgeAr: 'إصدارات ومحتوى دوري',
    badgeEn: 'Curated Publications',
    subtitleAr: 'أحدث الإصدارات، الأبحاث والدراسات، ومشاركات دورية تصلك مباشرة إلى بريدك.',
    subtitleEn: 'Latest publications, research studies, audio-visual works, and curated releases delivered to your inbox.',
    enabled: true, 
    order: 7,
    bgVariant: 'subtle'
  },
  { 
    id: 'sec-contact', 
    sectionKey: 'contact', 
    titleEn: 'Contact Us', 
    titleAr: 'تواصل معنا', 
    badgeAr: 'قنوات التواصل المباشرة',
    badgeEn: 'Direct Communication Channels',
    subtitleAr: 'يسعدنا دائماً استقبال استفساراتك، مقترحاتك، والتواصل معك.',
    subtitleEn: 'We welcome your inquiries, feedback, and are ready to assist you.',
    enabled: true, 
    order: 8,
    bgVariant: 'default'
  },
];

export const defaultServices: ServiceItem[] = [];

export const defaultPortfolio: PortfolioItem[] = [];

export const defaultProducts: ProductItem[] = [];
export const defaultArticles: ArticleItem[] = [];

export const defaultMedia: MediaItem[] = [];

// Helper to seed initial structure if empty - Never injects fake or demo records
let seedExecutionPromise: Promise<void> | null = null;

export async function seedInitialDataIfEmpty(): Promise<void> {
  if (seedExecutionPromise) {
    return seedExecutionPromise;
  }

  seedExecutionPromise = (async () => {
    try {
      const settingsRef = doc(db, 'siteSettings', 'global');
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(settingsRef, cleanFirestorePayload(defaultSiteSettings));

        for (const section of defaultHomeSections) {
          const secRef = doc(db, 'homeSections', section.id);
          batch.set(secRef, cleanFirestorePayload(section));
        }

        // Initialize default admin credentials in Firestore if not already set
        const credsRef = doc(db, 'systemConfig', 'adminCredentials');
        batch.set(credsRef, {
          username: 'admin',
          password: 'admin',
          isInitialSetup: true,
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        console.log('Initialized empty platform site structure in Firestore.');
      }
    } catch (error) {
      console.warn('Firestore initial structure check notice:', error);
    }
  })();

  return seedExecutionPromise;
}
