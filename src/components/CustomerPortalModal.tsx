import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Download, 
  Search, 
  FileCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Truck,
  Printer,
  Calendar,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { formatPrice } from '../utils/currencies';
import { exportOrderInvoicePDF, exportOrderHistoryPDF } from '../utils/pdfExport';

interface CustomerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

export const CustomerPortalModal: React.FC<CustomerPortalModalProps> = ({ 
  isOpen, 
  onClose,
  initialOrderId
}) => {
  const { language, direction, t } = useLanguage();
  const { currentUser, appUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'track' | 'purchases'>('track');
  
  // Track Order State
  const [orderIdInput, setOrderIdInput] = useState(initialOrderId || '');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Email Lookup State
  const [lookupEmail, setLookupEmail] = useState(currentUser?.email || appUser?.email || '');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      setOrderIdInput(initialOrderId);
      trackOrderById(initialOrderId);
    }
  }, [initialOrderId]);

  useEffect(() => {
    if (isOpen && (currentUser?.email || appUser?.email)) {
      const email = currentUser?.email || appUser?.email || '';
      setLookupEmail(email);
      fetchOrdersForEmail(email);
    }
  }, [isOpen, currentUser, appUser]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const trackOrderById = async (idToSearch: string) => {
    const raw = idToSearch.trim();
    if (!raw) {
      setTrackingError(language === 'ar' ? 'يرجى إدخال رقم الطلب المرجعي.' : 'Please enter an Order ID.');
      return;
    }

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedOrder(null);

    try {
      const cleanNum = raw.replace(/^#/, '').trim();

      // 1. Try querying orderNumber without #
      let q = query(collection(db, 'orders'), where('orderNumber', '==', cleanNum));
      let snap = await getDocs(q);

      // 2. If empty, try querying orderNumber with #
      if (snap.empty) {
        q = query(collection(db, 'orders'), where('orderNumber', '==', `#${cleanNum}`));
        snap = await getDocs(q);
      }

      // 3. If empty, try document ID
      if (snap.empty) {
        try {
          const docRef = doc(db, 'orders', raw);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setTrackedOrder({ id: docSnap.id, ...docSnap.data() } as Order);
            setTrackingLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (!snap.empty) {
        const found = snap.docs[0];
        setTrackedOrder({ id: found.id, ...found.data() } as Order);
      } else {
        setTrackingError(
          language === 'ar'
            ? `لم يتم العثور على أي طلب برقم مرجعي: "${raw}". يرجى التحقق من الرقم والمحاولة مرة أخرى.`
            : `No order found with reference: "${raw}". Please double-check the Order ID and try again.`
        );
      }
    } catch (err) {
      console.warn('Track order lookup notice:', err);
      setTrackingError(
        language === 'ar'
          ? 'تعذر الوصول إلى تفاصيل الطلب حالياً. يرجى إعادة المحاولة لاحقاً.'
          : 'Could not fetch order details at this moment. Please try again later.'
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const fetchOrdersForEmail = async (emailToQuery: string) => {
    if (!emailToQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerEmail', '==', emailToQuery.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      const fetched: Order[] = [];
      snap.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() } as Order);
      });
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(fetched);
    } catch (err) {
      console.warn('Orders lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Status mapping for progress stepper
  const getStepProgress = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'paid':
        return 2;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 printable-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0d10] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden printable-order-track"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#111216]/95 backdrop-blur-xs no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-neutral-900 text-emerald-600 dark:text-cyan-400 border border-emerald-200 dark:border-neutral-800">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {t('orders.customerPortalTitle')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {language === 'ar' ? 'تتبع الشحنات والاطلاع على التراخيص وتحميل الأصول' : 'Track live parcels, view licenses & download assets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            aria-label="Close"
            title={language === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Sticky */}
        <div className="shrink-0 z-10 flex border-b border-slate-200 dark:border-neutral-800 bg-slate-100/70 dark:bg-[#0c0d10] p-1.5 gap-1.5 no-print">
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'track'
                ? 'bg-white dark:bg-[#16181d] text-emerald-800 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#111216]'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
            <span>{t('orders.trackTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-white dark:bg-[#16181d] text-emerald-800 dark:text-white shadow-xs border border-slate-200 dark:border-neutral-700'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#111216]'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600 dark:text-cyan-500" />
            <span>{t('orders.purchasesTab')}</span>
          </button>
        </div>

        {/* TAB 1: TRACK ORDER */}
        {activeTab === 'track' && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
            {/* Search Box */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-3 no-print">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('orders.trackOrder')}
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('orders.trackOrderSub')}
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  trackOrderById(orderIdInput);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    placeholder={t('orders.orderNumberPlaceholder')}
                    className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {trackingLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'ar' ? 'جارٍ التتبع...' : 'Tracking...'}</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>{t('orders.trackButton')}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Error Message */}
            {trackingError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <span>{trackingError}</span>
              </div>
            )}

            {/* Tracked Order Details */}
            {trackedOrder && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Print Header for clean paper printing */}
                <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
                  <h1 className="text-xl font-bold uppercase tracking-wider">
                    {language === 'ar' ? 'إيصال شحن وتفاصيل طلب العميل' : 'ORDER SHIPMENT RECEIPT & WAYBILL'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Generated: {new Date().toLocaleString()} | Reference: #{trackedOrder.orderNumber}
                  </p>
                </div>

                {/* Summary Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                          #{trackedOrder.orderNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {trackedOrder.orderStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'ar' ? 'تاريخ الإنشاء:' : 'Placed on:'} {new Date(trackedOrder.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportOrderInvoicePDF(trackedOrder, language)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors no-print cursor-pointer"
                        title={language === 'ar' ? 'تحميل الفاتورة بصيغة PDF' : 'Download Formatted PDF Invoice'}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors no-print cursor-pointer"
                        title={t('orders.printInvoice')}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('common.print')}</span>
                      </button>
                      <span className="font-mono font-black text-lg text-slate-950 dark:text-white">
                        {formatPrice(trackedOrder.total, trackedOrder.currency || 'USD', language)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Shipping Stepper */}
                  <div className="py-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-500" />
                      <span>{t('orders.trackingStatus')}</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {[
                        { step: 1, title: t('orders.confirmed'), desc: language === 'ar' ? 'تم الدفع وتأكيد الحجز' : 'Payment Authorized' },
                        { step: 2, title: t('orders.processing'), desc: language === 'ar' ? 'الفحص والتجهيز السحابي' : 'Packaging & Verification' },
                        { step: 3, title: t('orders.shipped'), desc: language === 'ar' ? 'في الطريق مع الناقل' : 'In Transit via Logistics' },
                        { step: 4, title: t('orders.delivered'), desc: language === 'ar' ? 'تم التسليم / جاهز للاستخدام' : 'Fulfilled / Delivered' },
                      ].map((st, i) => {
                        const currentStep = getStepProgress(trackedOrder.orderStatus);
                        const isCompleted = currentStep >= st.step;
                        const isCurrent = currentStep === st.step;

                        return (
                          <div key={i} className="flex flex-col items-center space-y-1.5 relative">
                            {/* Step Indicator Dot */}
                            <div 
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-md'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                            </div>
                            <span className={`text-[11px] sm:text-xs font-bold leading-tight ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {st.title}
                            </span>
                            <span className="text-[10px] text-slate-400 hidden sm:inline leading-tight">
                              {st.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logistics & Carrier Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        {t('orders.carrier')}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-cyan-500" />
                        {trackedOrder.items.some(it => it.type === 'physical') 
                          ? 'Aramex Express International' 
                          : 'Instant Digital Cloud CDN'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        {t('orders.trackingNumber')}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                        AWB-{trackedOrder.orderNumber}-GL
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        {t('orders.estimatedDelivery')}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {trackedOrder.orderStatus === 'completed'
                          ? (language === 'ar' ? 'تم التسليم بنجاح' : 'Delivered')
                          : (language === 'ar' ? 'خلال 2-4 أيام عمل' : 'Within 2-4 Business Days')}
                      </span>
                    </div>
                  </div>

                  {/* Destination Address if present */}
                  {trackedOrder.shippingAddress && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">{language === 'ar' ? 'عنوان التسليم:' : 'Shipping Address:'} </strong>
                        <span>{trackedOrder.shippingAddress}</span>
                      </div>
                    </div>
                  )}

                  {/* Items Included */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {language === 'ar' ? 'محتويات الشحنة والطرود:' : 'Package Contents:'}
                    </span>

                    {trackedOrder.items.map((it, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-emerald-500 shadow-xs">
                            <FileCode className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {language === 'ar' ? it.productNameAr : it.productNameEn}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatPrice(it.price, trackedOrder.currency || 'USD', language)} × {it.quantity}
                            </span>
                          </div>
                        </div>

                        {it.type === 'digital' ? (
                          <a
                            href={it.digitalFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors no-print"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'تحميل الملف' : 'Download'}</span>
                          </a>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                            {language === 'ar' ? 'طرد مادي' : 'Physical Package'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty placeholder if not yet tracked */}
            {!trackedOrder && !trackingLoading && !trackingError && (
              <div className="text-center py-10 text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Truck className="w-7 h-7 opacity-60" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'تتبع مسار شحنتك لحظة بلحظة' : 'Track Your Shipment Step-by-Step'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' 
                      ? 'أدخل رقم الطلب المرفق في رسالة التأكيد أو الفاتورة لمشاهدة خط السير والموعد التقديري للوصول.'
                      : 'Enter your order ID from your confirmation email or invoice to check current logistics status and arrival date.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PURCHASES & DOWNLOADS BY EMAIL */}
        {activeTab === 'purchases' && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
            {/* Email Lookup Bar */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-3 no-print">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'ar' ? 'البحث بالبريد الإلكتروني المستخدم في الشراء:' : 'Lookup by Email Address:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => fetchOrdersForEmail(lookupEmail)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (language === 'ar' ? 'جارٍ البحث...' : 'Searching...') : (language === 'ar' ? 'عرض الطلبات' : 'Find Orders')}
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">
                    {searched
                      ? (language === 'ar' ? 'لم يتم العثور على طلبات مسجلة لهذا البريد الإلكتروني.' : 'No orders found for this email.')
                      : (language === 'ar' ? 'أدخل بريدك الإلكتروني لعرض سجل مشترياتك وتحميل ملفاتك' : 'Enter your email to view order history and download files')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Export Full History Action */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'ar' 
                          ? `إجمالي الطلبات المسجلة: (${orders.length}) طلبات` 
                          : `Total Registered Orders: (${orders.length})`}
                      </span>
                    </div>
                    <button
                      onClick={() => exportOrderHistoryPDF(orders, lookupEmail, language)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title={language === 'ar' ? 'تصدير كشف كامل بجميع المشتريات والطلبات كملف PDF' : 'Download Complete Orders History as Formatted PDF'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تحميل كشف الطلبات PDF' : 'Export History PDF'}</span>
                    </button>
                  </div>

                  {orders.map((order) => (
                    <div 
                      key={order.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-slate-400 ms-2">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {order.orderStatus}
                          </span>
                          <span className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                            {formatPrice(order.total, order.currency || 'USD', language)}
                          </span>
                          <button
                            onClick={() => exportOrderInvoicePDF(order, language)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                            title={language === 'ar' ? 'تحميل فاتورة الطلب بصيغة PDF' : 'Download Formatted PDF Invoice'}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          <button
                            onClick={() => {
                              setOrderIdInput(order.orderNumber);
                              trackOrderById(order.orderNumber);
                              setActiveTab('track');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{t('orders.trackTab')}</span>
                          </button>
                        </div>
                      </div>

                    {/* Items & Download links */}
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {language === 'ar' ? item.productNameAr : item.productNameEn}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">×{item.quantity}</span>
                          </div>

                          {item.type === 'digital' ? (
                            <a
                              href={item.digitalFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>{language === 'ar' ? 'تحميل الملف' : 'Download File'}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {language === 'ar' ? 'منتج ملموس (قيد الشحن والتجهيز)' : 'Physical item (Processing shipment)'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
