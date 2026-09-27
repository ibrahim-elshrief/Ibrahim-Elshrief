export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export type ContentStatus = 'draft' | 'published' | 'archived';
export type ProjectStatus = ContentStatus | string;
export type ProductType = 'digital' | 'physical' | 'service' | string;
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'CUSTOMER';
export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'presentation' | 'code';
export type AdminTab = 
  | 'overview' 
  | 'cms' 
  | 'carousel' 
  | 'portfolio' 
  | 'store' 
  | 'inventory' 
  | 'orders' 
  | 'payments'
  | 'articles' 
  | 'archive'
  | 'media' 
  | 'messages' 
  | 'subscribers' 
  | 'security'
  | 'quickConnect'
  | 'settings';

export interface OwnerRegisteredPhone {
  id: string;
  phone: string;
  label: string;
  telegramChatId?: string;
  isLinkedToTelegram: boolean;
  linkedAt?: string;
}

export interface OwnerSecurityChannels {
  registeredEmails: string[];
  registeredPhones: OwnerRegisteredPhone[];
  telegramBotToken?: string;
  telegramChatId?: string;
  requireTelegram2FA?: boolean;
  updatedAt?: string;
}

export type CarouselCardType = 
  | 'auto_latest_product'
  | 'auto_latest_article'
  | 'auto_latest_portfolio'
  | 'auto_latest_media'
  | 'specific_item'
  | 'custom';

export interface CarouselTag {
  id: string;
  textAr: string;
  textEn: string;
  color?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';
}

export interface CarouselCardItem {
  id: string;
  type: CarouselCardType;
  targetType?: 'product' | 'article' | 'portfolio' | 'section' | 'url';
  targetId?: string;
  targetSection?: 'store' | 'articles' | 'portfolio' | 'about' | 'contact' | 'services';
  autoOffset?: number;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl?: string;
  ctaTextAr?: string;
  ctaTextEn?: string;
  ctaLink?: string;
  badgeTextAr?: string;
  badgeTextEn?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';
  tags?: CarouselTag[];
  pinned?: boolean;
  enabled: boolean;
  order: number;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface NavLinkItem {
  id: string;
  labelEn: string;
  labelAr: string;
  href: string;
  isExternal?: boolean;
  enabled: boolean;
}

export interface AboutFeaturePoint {
  id: string;
  textEn: string;
  textAr: string;
}

export interface AboutPrinciple {
  id: string;
  iconName?: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}

export interface HeroFloatingBadge {
  id: string;
  badgeValue: string; // e.g. "15+", "2.5M+", "100%"
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  position: 'top-start' | 'bottom-end' | 'top-end' | 'bottom-start';
  enabled: boolean;
}

export interface CustomSocialLink {
  id: string;
  platform: string; // 'youtube' | 'twitter' | 'instagram' | 'facebook' | 'telegram' | 'linkedin' | 'github' | 'podcast' | 'goodreads' | 'researchgate' | 'whatsapp' | 'website' | 'email' | 'custom'
  labelAr: string;
  labelEn: string;
  url: string;
  enabled: boolean;
}

export interface ContentCardItem {
  id: string;
  tagAr?: string;
  tagEn?: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  iconName?: string;
  order: number;
  enabled: boolean;
}

export interface StoreCategoryItem {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  enabledOnHome?: boolean; // Whether to showcase this category shelf on the homepage
  homeLimit?: number;      // Maximum number of products to preview on homepage (default 4)
  homeOrder?: number;      // Display sort order on the homepage
  subtitleAr?: string;     // Explanatory subtitle for homepage display
  subtitleEn?: string;
  badgeAr?: string;        // E.g. "مطبوعات ورقية", "أبحاث محكمة"
  badgeEn?: string;
  iconName?: string;       // Cultural icon name (e.g. BookOpen, Video, Library)
}

export interface StatsItem {
  id: string;
  value: string; // e.g. "15+", "2.5M+", "100%"
  labelAr: string;
  labelEn: string;
  detailAr?: string;
  detailEn?: string;
  iconName?: string;
}

export interface AppNotification {
  id: string;
  type: 'order' | 'message' | 'subscriber' | 'inventory' | 'system';
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  timestamp: string;
  read: boolean;
  linkTab?: AdminTab;
  data?: any;
}

export interface SectionVisibilitySettings {
  showJobTitleInHeader?: boolean;
  showHero?: boolean;
  showCarousel?: boolean;
  showHeroAvailabilityBadge?: boolean;
  showHeroOverlayBadge?: boolean;
  showHeroFloatingBadges?: boolean;
  showAbout?: boolean;
  showAboutNarrative?: boolean;
  showAboutFeatures?: boolean;
  showAboutPrinciples?: boolean;
  showContentCards?: boolean;
  showPortfolio?: boolean;
  showServices?: boolean;
  showStore?: boolean;
  showArticles?: boolean;
  showTestimonials?: boolean;
  showContact?: boolean;
  showNewsletter?: boolean;
  showFooterSection?: boolean;
  showFooterNewsletter?: boolean;
  showFooterSocialChannels?: boolean;
  showFooterSocialIcons?: boolean;
  showFooterDirectContact?: boolean;
  showFooterNav?: boolean;
  showFooterBrandInfo?: boolean;
  showFooterBottomBar?: boolean;
  showFooterBackToTop?: boolean;
  showFooterOwnerPortalLink?: boolean;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  language?: 'ar' | 'en';
  subscribedAt: string;
  status: 'active' | 'unsubscribed';
  source?: string;
}

export interface CustomPaymentMethod {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'cash_wallet' | 'airtm' | 'paypal' | 'bank_transfer' | 'crypto' | 'custom';
  accountNumber?: string;
  accountName?: string;
  instructionsAr?: string;
  instructionsEn?: string;
  region: 'all' | 'egypt' | 'nonegypt';
  icon?: string;
  enabled: boolean;
}

export interface PaymentGatewaySettings {
  cashEnabled?: boolean;
  cashWalletNumber?: string;
  cashWalletHolder?: string;
  cashInstructionsAr?: string;
  cashExchangeRateUsdToEgp?: number;
  cashAutoExchangeRate?: boolean;
  
  airtmEnabled?: boolean;
  airtmUsername?: string;
  airtmInstructionsAr?: string;
  airtmDirectLink?: string;
  
  paypalEnabled?: boolean;
  paypalEmailOrLink?: string;
  paypalInstructionsAr?: string;

  customMethods?: CustomPaymentMethod[];
}

export interface SiteSettings {
  brandNameEn: string;
  brandNameAr: string;
  headerSubtitleEn?: string;
  headerSubtitleAr?: string;
  showJobTitleInHeader?: boolean;
  titleEn: string;
  titleAr: string;
  bioEn: string;
  bioAr: string;
  avatarUrl: string;
  contactEmail: string;
  phone?: string;
  locationEn: string;
  locationAr: string;
  socialLinks: SocialLinks;
  navigation: NavLinkItem[];
  footerTextEn: string;
  footerTextAr: string;
  seoTitle: string;
  seoDescription: string;
  // Browser Tab & Favicon Controls
  tabTitleMode?: 'both' | 'ar' | 'en' | 'custom';
  customTabTitleAr?: string;
  customTabTitleEn?: string;
  faviconUrl?: string;
  currency: string;
  themeDefault: 'light' | 'dark' | 'system';
  paymentGateways?: PaymentGatewaySettings;
  // About / Philosophy CMS
  aboutBadgeEn?: string;
  aboutBadgeAr?: string;
  aboutHeadingEn?: string;
  aboutHeadingAr?: string;
  aboutSubEn?: string;
  aboutSubAr?: string;
  aboutParagraph2En?: string;
  aboutParagraph2Ar?: string;
  aboutFeatures?: AboutFeaturePoint[];
  aboutPrinciplesTitleEn?: string;
  aboutPrinciplesTitleAr?: string;
  aboutPrinciples?: AboutPrinciple[];

  // Hero Image Overlay and Floating Badges CMS
  heroAvailabilityTextAr?: string;
  heroAvailabilityTextEn?: string;
  heroOverlayTitleAr?: string;
  heroOverlayTitleEn?: string;
  heroOverlaySubAr?: string;
  heroOverlaySubEn?: string;
  heroOverlayIcon?: string;
  heroFloatingBadges?: HeroFloatingBadge[];

  // Section Visibilities
  sectionVisibility?: SectionVisibilitySettings;

  // Custom Social Links (Footer & Connect)
  customSocialLinks?: CustomSocialLink[];

  // Dynamic Content Sections (Information cards like Experience, Methodology, Philosophy)
  contentCards?: ContentCardItem[];

  // Telegram Integration for Instant and Daily Summaries
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramDailyDigestEnabled?: boolean;
  lastTelegramDigestDate?: string;

  // Custom Store Categories (User-defined instead of hardcoded)
  storeCategories?: StoreCategoryItem[];

  // Dynamic Platform Stats (Modifiable 10+ Years, Values, Icons)
  statsItems?: StatsItem[];

  // Footer Customization (Description under brand, Copyright & Custom Note)
  footerDescriptionAr?: string;
  footerDescriptionEn?: string;
  footerCopyrightAr?: string;
  footerCopyrightEn?: string;
  footerCustomNoteAr?: string;
  footerCustomNoteEn?: string;

  // Hero Featured Spotlight Carousel
  carouselEnabled?: boolean;
  carouselTitleAr?: string;
  carouselTitleEn?: string;
  carouselSubtitleAr?: string;
  carouselSubtitleEn?: string;
  carouselAutoPlay?: boolean;
  carouselSpeed?: number; // Duration in seconds each card stays
  carouselPauseOnHover?: boolean;
  carouselCards?: CarouselCardItem[];

  // Floating Direct Quick Connect Widget (بوت وزر التواصل المباشر العائم)
  floatingContact?: FloatingContactConfig;

  // Global Sections Titles & Badges Override
  portfolioBadgeAr?: string;
  portfolioBadgeEn?: string;
  portfolioTitleAr?: string;
  portfolioTitleEn?: string;
  portfolioSubAr?: string;
  portfolioSubEn?: string;

  storeBadgeAr?: string;
  storeBadgeEn?: string;
  storeTitleAr?: string;
  storeTitleEn?: string;
  storeSubAr?: string;
  storeSubEn?: string;

  articlesBadgeAr?: string;
  articlesBadgeEn?: string;
  articlesTitleAr?: string;
  articlesTitleEn?: string;
  articlesSubAr?: string;
  articlesSubEn?: string;

  newsletterBadgeAr?: string;
  newsletterBadgeEn?: string;
  newsletterTitleAr?: string;
  newsletterTitleEn?: string;
  newsletterSubAr?: string;
  newsletterSubEn?: string;
  newsletterPrivacyAr?: string;
  newsletterPrivacyEn?: string;
  newsletterButtonAr?: string;
  newsletterButtonEn?: string;
  newsletterPlaceholderAr?: string;
  newsletterPlaceholderEn?: string;

  contactBadgeAr?: string;
  contactBadgeEn?: string;
  contactTitleAr?: string;
  contactTitleEn?: string;
  contactSubAr?: string;
  contactSubEn?: string;

  statsBadgeAr?: string;
  statsBadgeEn?: string;
  statsTitleAr?: string;
  statsTitleEn?: string;
  statsSubAr?: string;
  statsSubEn?: string;

  contentCardsBadgeAr?: string;
  contentCardsBadgeEn?: string;
  contentCardsTitleAr?: string;
  contentCardsTitleEn?: string;
  contentCardsSubAr?: string;
  contentCardsSubEn?: string;

  // Hero CTA Action Buttons Customization
  heroCtaPrimaryAr?: string;
  heroCtaPrimaryEn?: string;
  heroCtaPrimaryLink?: string;
  heroCtaStoreAr?: string;
  heroCtaStoreEn?: string;
  heroCtaContactAr?: string;
  heroCtaContactEn?: string;

  // Horizontal Section Dividers
  sectionDividers?: SectionDividersConfig;

  // Cached Sections List configuration
  sectionsList?: HomeSectionItem[];
}

export type SectionBackgroundVariant = 
  | 'default' 
  | 'primary' 
  | 'muted' 
  | 'subtle' 
  | 'card' 
  | 'dark' 
  | 'warm' 
  | 'custom';

export type SectionDividerStyle = 
  | 'line' 
  | 'gradient' 
  | 'dots' 
  | 'dashed' 
  | 'glow' 
  | 'accent-wave';

export interface SectionDividersConfig {
  enabled: boolean;
  style?: SectionDividerStyle;
  colorPreset?: 'emerald' | 'subtle' | 'slate' | 'custom';
  customColor?: string;
  spacing?: 'compact' | 'normal' | 'spacious';
}

export type FloatingContactPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface FloatingContactChannel {
  id: string;
  type: 'whatsapp' | 'telegram' | 'telegram_group' | 'facebook' | 'messenger' | 'phone' | 'instagram' | 'x' | 'email' | 'custom';
  titleAr: string;
  titleEn: string;
  value: string; // phone, username, group link, or url
  isPrimary?: boolean; // Whether this channel is visible first / upfront
  enabled: boolean;
  color?: string;
}

export interface FloatingContactConfig {
  enabled: boolean;
  position: FloatingContactPosition;
  primaryChannelId?: string;
  badgeTextAr?: string;
  badgeTextEn?: string;
  channels: FloatingContactChannel[];
}

export interface HomeSectionItem {
  id: string;
  sectionKey: 'hero' | 'about' | 'services' | 'skills' | 'stats' | 'portfolio' | 'store' | 'articles' | 'testimonials' | 'contact' | 'contentCards' | 'content-cards' | 'subscribers' | 'newsletter';
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  badgeEn?: string;
  badgeAr?: string;
  enabled: boolean;
  order: number;
  // Visual rhythm & styling
  bgVariant?: SectionBackgroundVariant;
  bgCustomColor?: string;
  bgCustomColorDark?: string;
  hideDividerBottom?: boolean;
}

export type SectionConfig = HomeSectionItem;

export interface PortfolioMedia {
  id: string;
  type: MediaType;
  url: string;
  titleEn?: string;
  titleAr?: string;
  thumbnail?: string;
}

export interface PortfolioItem {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  shortDescEn: string;
  shortDescAr: string;
  fullDescEn: string;
  fullDescAr: string;
  category: string;
  tags: string[];
  thumbnail: string;
  media: PortfolioMedia[];
  projectUrl?: string;
  githubUrl?: string;
  projectFileUrl?: string;
  projectFileName?: string;
  client?: string;
  year?: string;
  featured: boolean;
  status: ContentStatus;
  createdAt: string;
  views?: number;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface ServiceItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  priceStarting?: number;
  iconName: string;
  featuresEn: string[];
  featuresAr: string[];
}

export interface ArticleItem {
  id: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  excerptEn: string;
  excerptAr: string;
  contentEn: string;
  contentAr: string;
  coverImage: string;
  attachmentUrl?: string;
  attachmentName?: string;
  category: string;
  tags: string[];
  author: string;
  status: ContentStatus;
  featured: boolean;
  publishedAt: string;
  readTimeMinutes: number;
  views?: number;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface ProductItem {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  type: ProductType;
  category: string;
  images: string[];
  stock: number;
  lowStockThreshold: number;
  sku: string;
  previewUrl?: string;
  digitalFileUrl?: string;
  digitalFileName?: string;
  digitalFileSize?: string;
  status: ContentStatus;
  featured: boolean;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  authorName: string;
  authorEmail?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  price: number;
  quantity: number;
  type: ProductType;
  digitalFileUrl?: string;
  currency?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingAddress?: string;
  shippingCity?: string;
  notes?: string;
  createdAt: string;
  // Step-by-step payment transfer details
  region?: 'egypt' | 'nonegypt' | string;
  transferFrom?: string; // Wallet phone number or account email/name
  transferDate?: string;
  receiptUrl?: string; // Screenshot or receipt image/base64
  convertedAmount?: string; // e.g. "500.00 EGP"
  paymentMethodTitle?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'sale' | 'restock' | 'damage' | 'return' | 'manual_adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  tag?: 'work' | 'personal' | 'urgent' | 'general';
  createdAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: MediaType;
  size: number;
  category: string;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark';

export type EmailProviderType = 'smtp' | 'gmail' | 'brevo' | 'resend' | 'firebase' | 'auto';

export interface EmailSettings {
  provider: EmailProviderType;
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  // SMTP credentials
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  // API keys
  brevoApiKey?: string;
  resendApiKey?: string;
  // Automation switches
  autoWelcomeEnabled?: boolean;
  autoNewArticleNotify?: boolean;
  autoNewProductNotify?: boolean;
}

export interface EmailCampaign {
  id: string;
  title: string;
  subject: string;
  type: 'welcome' | 'article_published' | 'product_offer' | 'custom_broadcast' | 'test';
  sentAt: string;
  recipientsCount: number;
  status: 'sent' | 'partially_sent' | 'failed' | 'simulated';
  previewHtml?: string;
  targetEmails?: string[];
  articleId?: string;
  productId?: string;
  details?: string;
}
