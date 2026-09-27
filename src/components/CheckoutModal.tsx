import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Building, 
  AlertCircle,
  Package,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Upload,
  ExternalLink,
  Smartphone,
  Globe,
  DollarSign,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Trash2,
  FileText,
  Sparkles,
  BookOpen,
  RotateCcw,
  RefreshCw,
  Coins
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db, cleanFirestorePayload } from '../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { Order, OrderItem, SiteSettings, CustomPaymentMethod } from '../types';
import { formatPrice, convertCurrency, ARAB_AND_USD_CURRENCIES, useLiveExchangeRates } from '../utils/currencies';
import { sendOrderTelegramNotification, sendLowStockTelegramAlert } from '../utils/telegramService';
import { LazyImage } from './LazyImage';

export interface CheckoutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOrderPlaced?: () => void;
  currency?: string;
  settings?: SiteSettings;
  onOpenOrdersPortal?: () => void;
}

export type PaymentMethodKey = 'cash' | 'airtm' | 'paypal' | string;

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderPlaced,
  currency,
  settings,
  onOpenOrdersPortal
}) => {
  const { language, direction, t } = useLanguage();
  const { cart, cartTotal, clearCart, isCheckoutOpen, setIsCheckoutOpen, updateQuantity, removeFromCart } = useCart();
  const { currentUser, appUser } = useAuth();

  // 4 Steps State:
  // Step 1: Review Items & Choose Payment Method
  // Step 2: Transfer Details & Currency Conversion
  // Step 3: Receipt & Transfer Verification
  // Step 4: Buyer Information & Submit Order
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected Payment Method
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey>('cash');

  // Customer Form Fields
  const [customerName, setCustomerName] = useState(appUser?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || appUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Transfer & Receipt Details
  const [transferFrom, setTransferFrom] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileSize, setReceiptFileSize] = useState<string>('');

  // Airtm / Multi-Currency Converter
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');

  // Copy status
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Submission State
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modalOpen = isOpen !== undefined ? isOpen : isCheckoutOpen;

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setCompletedOrder(null);
    setCurrentStep(1);
    setError('');
    setShowErrorModal(false);
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  // Live Currency Exchange Rates
  const { egpRate, isLive: isRatesLive, loading: isRatesLoading, refreshRates, getRate } = useLiveExchangeRates();

  // Payment Gateway Settings from Admin or Defaults
  const gateways = settings?.paymentGateways;
  const cashEnabled = gateways?.cashEnabled !== false;
  const cashWalletNumber = gateways?.cashWalletNumber || '01012345678';
  const cashWalletHolder = gateways?.cashWalletHolder || '';
  const cashInstructions = gateways?.cashInstructionsAr || 'يتم التحويل على الرقم وتصوير شاشة الإيصال لإرفاقها في الخطوة التالية.';
  
  // If auto exchange rate is enabled (or unset), automatically use live egpRate
  const isCashAutoRate = gateways?.cashAutoExchangeRate !== false;
  const cashExchangeRate = isCashAutoRate ? egpRate : (gateways?.cashExchangeRateUsdToEgp || egpRate);

  const airtmEnabled = gateways?.airtmEnabled !== false;
  const airtmUsername = gateways?.airtmUsername || 'username';
  const airtmDirectLink = gateways?.airtmDirectLink || 'https://app.airtm.com/';
  const airtmInstructions = gateways?.airtmInstructionsAr || 'يتم التحويل على حساب AIRTM الموضح والتقاط لقطة شاشة للإيصال.';

  const paypalEnabled = gateways?.paypalEnabled !== false;
  const paypalEmailOrLink = gateways?.paypalEmailOrLink || '';
  const paypalInstructions = gateways?.paypalInstructionsAr || 'يتم الدفع عبر حساب PayPal وإرفاق بيانات ومعرف المعاملة.';

  const customMethods: CustomPaymentMethod[] = (gateways?.customMethods || []).filter(m => m.enabled !== false);

  const hasPhysicalItems = cart.some(i => i.product.type === 'physical');
  const cartBaseCurrency = cart[0]?.product?.currency || currency || 'USD';
  const allSameCurrency = cart.length > 0 && cart.every(i => (i.product?.currency || 'USD').toUpperCase() === cartBaseCurrency.toUpperCase());
  const displayCurrency = allSameCurrency ? cartBaseCurrency : (currency || 'USD');

  // Subtotal in USD accurately converted from each item's actual currency
  const subtotalUSD = cart.reduce((sum, item) => {
    const itemCurrency = item.product?.currency || 'USD';
    const itemTotal = (item.product?.price || 0) * (item.quantity || 1);
    return sum + convertCurrency(itemTotal, 'USD', isCashAutoRate ? undefined : cashExchangeRate, itemCurrency);
  }, 0);
  const shippingFeeUSD = hasPhysicalItems ? 15 : 0;
  const grandTotalUSD = Number((subtotalUSD + shippingFeeUSD).toFixed(2));

  // Subtotal in EGP accurately converted from each item's actual currency
  // (If item is already priced in EGP, e.g. 500 EGP, it stays EXACTLY 500 EGP)
  const subtotalEGP = Math.round(cart.reduce((sum, item) => {
    const itemCurrency = item.product?.currency || 'USD';
    const itemTotal = (item.product?.price || 0) * (item.quantity || 1);
    return sum + convertCurrency(itemTotal, 'EGP', cashExchangeRate, itemCurrency);
  }, 0));
  const shippingFeeEGP = hasPhysicalItems ? Math.round(convertCurrency(15, 'EGP', cashExchangeRate, 'USD')) : 0;
  const totalInEgp = subtotalEGP + shippingFeeEGP;

  // Total in user-selected currency (from the live currency counter / selector widget)
  const targetRate = getRate(targetCurrency, 'USD', isCashAutoRate ? undefined : cashExchangeRate);
  const totalInSelectedCurrency = cart.reduce((sum, item) => {
    const itemCurrency = item.product?.currency || 'USD';
    const itemTotal = (item.product?.price || 0) * (item.quantity || 1);
    return sum + convertCurrency(itemTotal, targetCurrency, isCashAutoRate ? undefined : cashExchangeRate, itemCurrency);
  }, 0) + (shippingFeeUSD ? convertCurrency(shippingFeeUSD, targetCurrency, isCashAutoRate ? undefined : cashExchangeRate, 'USD') : 0);

  // Display Subtotal and Total for Step 1 review
  const displaySubtotal = allSameCurrency
    ? cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0)
    : (displayCurrency === 'USD' ? subtotalUSD : (displayCurrency === 'EGP' ? subtotalEGP : totalInSelectedCurrency));
  const displayShipping = hasPhysicalItems
    ? (displayCurrency === 'USD' ? shippingFeeUSD : (displayCurrency === 'EGP' ? shippingFeeEGP : convertCurrency(shippingFeeUSD, displayCurrency, isCashAutoRate ? undefined : cashExchangeRate, 'USD')))
    : 0;
  const displayGrandTotal = displaySubtotal + displayShipping;

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الصورة كبير جداً، يرجى اختيار ملف أقل من 8 ميجابايت' : 'File is too large. Max 8MB.');
      setShowErrorModal(true);
      return;
    }

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setReceiptFileName(file.name);
    setReceiptFileSize(sizeStr);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImageBase64(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptImageBase64('');
    setReceiptFileName('');
    setReceiptFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1 -> Step 2 Validation
  const handleProceedToStep2 = () => {
    if (cart.length === 0) {
      setError(language === 'ar' ? 'سلة التسوق فارغة، يرجى إضافة منتجات للمتابعة' : 'Your cart is empty.');
      setShowErrorModal(true);
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  // Step 2 -> Step 3 Validation
  const handleProceedToStep3 = () => {
    setError('');
    setCurrentStep(3);
  };

  // Step 3 -> Step 4 Validation
  const handleProceedToStep4 = () => {
    if (!transferFrom.trim()) {
      const msg = selectedMethod === 'cash'
        ? (language === 'ar' ? 'يرجى إدخال رقم المحفظة / الكاش الذي تم التحويل منه' : 'Please provide the sender wallet phone number.')
        : selectedMethod === 'airtm'
        ? (language === 'ar' ? 'يرجى إدخال اسم حساب AIRTM الذي تم التحويل منه' : 'Please provide your Airtm username.')
        : selectedMethod === 'paypal'
        ? (language === 'ar' ? 'يرجى إدخال البريد الإلكتروني لحساب PayPal أو معرف المعاملة' : 'Please provide your PayPal email or transaction ID.')
        : (language === 'ar' ? 'يرجى إدخال بيانات الحساب أو الرقم المحول منه' : 'Please provide the sender account info.');
      setError(msg);
      setShowErrorModal(true);
      return;
    }

    if (!receiptImageBase64) {
      setError(language === 'ar' ? 'يرجى إرفاق صورة إيصال التحويل أو لقطة الشاشة' : 'Please upload transfer receipt screenshot.');
      setShowErrorModal(true);
      return;
    }

    setError('');
    setCurrentStep(4);
  };

  // Final Order Submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المشتري' : 'Please provide buyer name.');
      setShowErrorModal(true);
      return;
    }

    if (!customerEmail.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني أو وسيلة التواصل' : 'Please provide your email address.');
      setShowErrorModal(true);
      return;
    }

    // Check for invalid Arabic characters in email if formatted as email
    if (customerEmail.includes('@') && /[\u0600-\u06FF]/.test(customerEmail)) {
      setError(language === 'ar' ? 'البريد الإلكتروني لا يمكن أن يحتوي على حروف عربية. يرجى إدخال بريد إنجليزي صحيح.' : 'Email cannot contain Arabic letters.');
      setShowErrorModal(true);
      return;
    }

    if (!customerPhone.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال رقم الهاتف أو الواتساب للتواصل' : 'Please provide a phone/WhatsApp number.');
      setShowErrorModal(true);
      return;
    }

    if (hasPhysicalItems && !shippingAddress.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال عنوان التوصيل والشحن للمنتجات المادية' : 'Please provide delivery address for physical items.');
      setShowErrorModal(true);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const orderNumber = `ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        productNameEn: item.product.nameEn,
        productNameAr: item.product.nameAr,
        price: item.product.price,
        quantity: item.quantity,
        type: item.product.type,
        digitalFileUrl: item.product.digitalFileUrl,
        currency: item.product.currency || displayCurrency
      }));

      // Method Title label
      let methodTitle = 'المحافظ الإلكترونية (كاش / InstaPay)';
      if (selectedMethod === 'airtm') {
        methodTitle = 'منصة AIRTM';
      } else if (selectedMethod === 'paypal') {
        methodTitle = 'بايبال PayPal';
      } else {
        const customObj = customMethods.find(c => c.id === selectedMethod);
        if (customObj) {
          methodTitle = language === 'ar' ? customObj.nameAr : customObj.nameEn;
        }
      }

      // Order Currency & Amounts:
      const finalOrderCurrency = selectedMethod === 'cash' 
        ? 'EGP' 
        : (['paypal', 'airtm'].includes(selectedMethod) ? 'USD' : displayCurrency);

      const finalOrderTotal = selectedMethod === 'cash' 
        ? totalInEgp 
        : (['paypal', 'airtm'].includes(selectedMethod) ? grandTotalUSD : Number(displayGrandTotal.toFixed(2)));

      const finalOrderSubtotal = selectedMethod === 'cash' 
        ? subtotalEGP 
        : (['paypal', 'airtm'].includes(selectedMethod) ? Number(subtotalUSD.toFixed(2)) : Number(displaySubtotal.toFixed(2)));

      const finalShipping = selectedMethod === 'cash' 
        ? shippingFeeEGP 
        : (['paypal', 'airtm'].includes(selectedMethod) ? shippingFeeUSD : Number(displayShipping.toFixed(2)));

      let convertedAmountStr = `${finalOrderTotal} ${finalOrderCurrency}`;
      if (selectedMethod === 'cash') {
        convertedAmountStr = `${totalInEgp.toLocaleString()} EGP (≈ $${grandTotalUSD.toFixed(2)} USD @ 1 USD = ${cashExchangeRate.toFixed(2)} EGP)`;
      } else if (finalOrderCurrency === 'USD') {
        convertedAmountStr = `$${grandTotalUSD.toFixed(2)} USD (≈ ${totalInEgp.toLocaleString()} EGP)`;
      } else {
        convertedAmountStr = `${finalOrderTotal.toFixed(2)} ${finalOrderCurrency} (≈ $${grandTotalUSD.toFixed(2)} USD / ${totalInEgp.toLocaleString()} EGP)`;
      }

      const newOrder: Omit<Order, 'id'> = {
        orderNumber,
        customerEmail,
        customerName,
        customerPhone,
        items: orderItems,
        subtotal: finalOrderSubtotal,
        discount: 0,
        shipping: finalShipping,
        total: finalOrderTotal,
        currency: finalOrderCurrency,
        orderStatus: 'pending',
        paymentStatus: 'paid',
        paymentMethod: selectedMethod,
        paymentMethodTitle: methodTitle,
        shippingAddress: hasPhysicalItems ? shippingAddress : undefined,
        notes: orderNotes || undefined,
        createdAt: new Date().toISOString(),
        region: 'all',
        transferFrom,
        transferDate,
        receiptUrl: receiptImageBase64,
        convertedAmount: convertedAmountStr
      };

      // Save order to Firestore with cleaned payload to eliminate any undefined values
      const orderDocRef = await addDoc(collection(db, 'orders'), cleanFirestorePayload(newOrder));
      const fullPlacedOrder: Order = { id: orderDocRef.id, ...newOrder };

      // 1. Inventory & Stock deduction, inventory transaction audit logs, and low-stock alerts
      for (const item of cart) {
        try {
          const prodRef = doc(db, 'products', item.product.id);
          const prodSnap = await getDoc(prodRef);
          const prodData = prodSnap.exists() ? prodSnap.data() : null;
          
          // Deduct stock if physical product or if stock is tracked (< 999900)
          const isTracked = item.product.type === 'physical' || 
            (prodData && prodData.stock !== undefined && prodData.stock < 999900) || 
            (item.product.stock !== undefined && item.product.stock < 999900);

          if (isTracked) {
            const currentStock = prodData && prodData.stock !== undefined 
              ? Number(prodData.stock) 
              : Number(item.product.stock || 0);

            const newStock = Math.max(0, currentStock - item.quantity);

            // Update product stock and total units sold
            await updateDoc(prodRef, {
              stock: newStock,
              salesCount: increment(item.quantity),
              updatedAt: new Date().toISOString()
            });

            // Log detailed inventory transaction
            await addDoc(collection(db, 'inventoryTransactions'), cleanFirestorePayload({
              productId: item.product.id,
              productName: item.product.nameAr || item.product.nameEn || 'Product',
              type: 'sale',
              quantity: -item.quantity,
              previousStock: currentStock,
              newStock,
              reason: `عملية شراء - طلب رقم #${orderNumber} للعميل ${customerName}`,
              orderId: orderDocRef.id,
              orderNumber,
              createdAt: new Date().toISOString()
            }));

            // If stock dropped to low threshold or out of stock, dispatch alerts
            const threshold = item.product.lowStockThreshold || (prodData && prodData.lowStockThreshold) || 5;
            if (newStock <= threshold) {
              const isOut = newStock <= 0;
              await addDoc(collection(db, 'notifications'), cleanFirestorePayload({
                type: 'inventory',
                titleAr: isOut 
                  ? `🚨 نفاد مخزون: ${item.product.nameAr || item.product.nameEn}`
                  : `⚠️ تنبيه مخزون منخفض: ${item.product.nameAr || item.product.nameEn}`,
                titleEn: isOut
                  ? `🚨 Out of stock: ${item.product.nameEn || item.product.nameAr}`
                  : `⚠️ Low stock alert: ${item.product.nameEn || item.product.nameAr}`,
                descriptionAr: isOut
                  ? `نفد رصيد هذا المنتج تماماً (0 نسخة) بعد عملية الشراء الأخيرة (طلب #${orderNumber}).`
                  : `تبقى ${newStock} نسخ فقط من هذا المنتج بعد عملية الشراء الأخيرة (طلب #${orderNumber}). الحد الأدنى: ${threshold}.`,
                descriptionEn: isOut
                  ? `Product is completely out of stock (0 units remaining) following order #${orderNumber}.`
                  : `Only ${newStock} copies remaining after purchase (order #${orderNumber}). Safety threshold: ${threshold}.`,
                timestamp: new Date().toISOString(),
                read: false,
                linkTab: 'inventory',
                productId: item.product.id
              }));

              // Dispatch real-time Telegram alert to store owner
              try {
                await sendLowStockTelegramAlert(
                  {
                    id: item.product.id,
                    nameAr: item.product.nameAr,
                    nameEn: item.product.nameEn,
                    stock: newStock,
                    lowStockThreshold: threshold,
                    sku: item.product.sku || prodData?.sku,
                    type: item.product.type
                  },
                  currentStock,
                  orderNumber,
                  settings
                );
              } catch (tgAlertErr) {
                console.warn('Low stock telegram alert send warning:', tgAlertErr);
              }
            }
          } else {
            // Non-stock tracked digital file: increment sales count
            await updateDoc(prodRef, {
              salesCount: increment(item.quantity),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (stkErr) {
          console.warn('Inventory & stock sync notice:', stkErr);
        }
      }

      // 2. In-App Platform Notification (Website Bell & Admin Dashboard)
      try {
        await addDoc(collection(db, 'notifications'), cleanFirestorePayload({
          type: 'order',
          titleAr: `عملية شراء جديدة (#${orderNumber})`,
          titleEn: `New Purchase Order (#${orderNumber})`,
          descriptionAr: `قام ${customerName} بإتمام عملية شراء بقيمة ${convertedAmountStr} (${methodTitle}). الدفع مؤكد.`,
          descriptionEn: `${customerName} completed purchase for ${convertedAmountStr} (${methodTitle}). Payment confirmed.`,
          timestamp: new Date().toISOString(),
          read: false,
          linkTab: 'orders',
          orderId: orderDocRef.id,
          orderNumber,
          customerName,
          amount: finalOrderTotal
        }));
      } catch (notifErr) {
        console.warn('In-app notification creation notice:', notifErr);
      }

      // 3. Customer Inquiry / Order Notes in Messages Collection (صندوق الرسائل واستفسارات المتجر)
      if (orderNotes && orderNotes.trim()) {
        try {
          await addDoc(collection(db, 'messages'), cleanFirestorePayload({
            name: customerName,
            email: customerEmail,
            subject: `ملاحظة واستفسار طلب شراء (#${orderNumber})`,
            message: `ملاحظة مرفقة مع طلب الشراء #${orderNumber}:\n\n${orderNotes.trim()}\n\nطريقة الدفع: ${methodTitle}\nالمبلغ: ${convertedAmountStr}`,
            status: 'unread',
            createdAt: new Date().toISOString(),
            orderId: orderDocRef.id,
            orderNumber
          }));
        } catch (msgErr) {
          console.warn('Order message log notice:', msgErr);
        }
      }

      // 4. Send Instant Purchase Alert to Telegram Bot (تيليجرام المالك)
      try {
        await sendOrderTelegramNotification(fullPlacedOrder, settings);
      } catch (tgErr) {
        console.warn('Telegram purchase alert notice:', tgErr);
      }

      setCompletedOrder(fullPlacedOrder);
      clearCart();
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (err: any) {
      console.error('Order placement failed:', err);
      setError(language === 'ar' ? 'حدث خطأ أثناء حفظ الطلب. يرجى إعادة المحاولة.' : 'Failed to save order. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!modalOpen) return null;

  // Selected Method Display Name
  const getSelectedMethodInfo = () => {
    if (selectedMethod === 'cash') {
      return {
        titleAr: 'المحافظ الإلكترونية (فودافون كاش، اتصالات، أورنج، وي، InstaPay)',
        titleEn: 'E-Wallets (Vodafone Cash, InstaPay, etc.)',
        icon: Smartphone
      };
    }
    if (selectedMethod === 'airtm') {
      return {
        titleAr: 'حساب AIRTM (التحويل المباشر لجميع الدول)',
        titleEn: 'Airtm Account (Direct Transfer)',
        icon: Globe
      };
    }
    if (selectedMethod === 'paypal') {
      return {
        titleAr: 'بايبال PayPal (الدفع السريع والآمن)',
        titleEn: 'PayPal (Direct Payment)',
        icon: CreditCard
      };
    }
    const custom = customMethods.find(m => m.id === selectedMethod);
    return {
      titleAr: custom?.nameAr || 'طريقة دفع مخصصة',
      titleEn: custom?.nameEn || 'Custom Method',
      icon: Building
    };
  };

  const selectedInfo = getSelectedMethodInfo();
  const SelectedIcon = selectedInfo.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
      dir={direction}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] md:max-h-[92vh] flex flex-col bg-white dark:bg-[#0d0f14] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Close */}
        <div className="shrink-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/95 dark:bg-[#12151c]/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {completedOrder 
                    ? (language === 'ar' ? 'تم استلام طلبك بنجاح! 🎉' : 'Order Received Successfully! 🎉') 
                    : (language === 'ar' ? 'خطوات الشراء وإتمام الدفع' : 'Order & Payment Steps')}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  SECURE CHECKOUT
                </span>
              </div>
              {!completedOrder && (
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  {language === 'ar' ? 'اتبع الخطوات أدناه لإتمام طلبك ودفع القيمة بسهولة' : 'Follow the steps below to complete your order smoothly'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            aria-label="Close"
            title={language === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Steps Stepper Wizard (dots and lines) */}
        {!completedOrder && (
          <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-neutral-800/80 bg-slate-100/50 dark:bg-[#0f1118]/80">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              {[
                { step: 1, labelAr: 'الطلب والطريقة', labelEn: '1. Review & Method' },
                { step: 2, labelAr: 'التحويل والقيمة', labelEn: '2. Transfer Details' },
                { step: 3, labelAr: 'بيانات الإيصال', labelEn: '3. Receipt Upload' },
                { step: 4, labelAr: 'تأكيد الطلب', labelEn: '4. Confirm & Place' }
              ].map((item, idx, arr) => {
                const isActive = currentStep === item.step;
                const isDone = currentStep > item.step;
                const isLast = idx === arr.length - 1;

                return (
                  <React.Fragment key={item.step}>
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                          isActive 
                            ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-500/20 scale-105' 
                            : isDone 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : item.step}
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-semibold transition-colors ${
                        isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-neutral-400'
                      }`}>
                        {language === 'ar' ? item.labelAr : item.labelEn}
                      </span>
                    </div>

                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-300 ${
                        currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-neutral-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 space-y-6">

          {/* ----------------- COMPLETED ORDER VIEW ----------------- */}
          {completedOrder ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تم إرسال طلب الشراء بنجاح! 🎉' : 'Order Placed Successfully! 🎉'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                  {language === 'ar'
                    ? 'شكراً لك! تم استلام بيانات التحويل وإيصال الدفع. سيتم مراجعة إيصالك وتأكيد طلبك وتفعيل الكتب والملفات الرقمية وشحن المنتجات خلال أقل من 24 ساعة.'
                    : 'Thank you! We received your transfer receipt and order details. Your items and files will be confirmed and delivered within 24 hours.'}
                </p>
              </div>

              {/* Order Number Box */}
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#161822] border border-slate-200 dark:border-neutral-800">
                <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                  {language === 'ar' ? 'رقم الطلب المرجعي:' : 'Order ID:'}
                </span>
                <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-700 dark:text-emerald-400">
                  {completedOrder.orderNumber}
                </span>
                <button
                  onClick={() => handleCopy(completedOrder.orderNumber, 'order-num')}
                  className="p-1 text-slate-500 hover:text-emerald-600 dark:text-neutral-400 cursor-pointer"
                  title={language === 'ar' ? 'نسخ رقم الطلب' : 'Copy Order ID'}
                >
                  {copiedKey === 'order-num' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Items Purchased List */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#11131a] text-start max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-neutral-300">
                  <span>{language === 'ar' ? 'المنتجات المطلوبة' : 'Items Ordered'} ({completedOrder.items.length})</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{completedOrder.convertedAmount || `${completedOrder.total} ${completedOrder.currency}`}</span>
                </div>
                <div className="space-y-2">
                  {completedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#0d0f14] border border-slate-200 dark:border-neutral-800 text-xs">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
                          {language === 'ar' ? item.productNameAr : item.productNameEn}
                        </span>
                      </div>
                      <span className="text-slate-500 dark:text-neutral-400 font-mono">
                        {item.quantity}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                {onOpenOrdersPortal && (
                  <button
                    onClick={() => {
                      handleClose();
                      onOpenOrdersPortal();
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    {language === 'ar' ? 'متابعة الطلب في بوابة طلباتي' : 'View in My Orders Portal'}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'العودة للمتجر' : 'Close & Return'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ----------------- STEP 1: REVIEW PRODUCTS & CHOOSE PAYMENT METHOD ----------------- */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Cart Items List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{language === 'ar' ? 'المنتجات المطلوبة في سلتك' : 'Products in Your Order'} ({cart.length})</span>
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatPrice(displaySubtotal, displayCurrency, language)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-neutral-800 border border-slate-200 dark:border-neutral-800 rounded-2xl bg-slate-50/50 dark:bg-[#11131a] overflow-hidden">
                      {cart.map((item) => (
                        <div key={item.product.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.product.images?.[0] ? (
                              <LazyImage 
                                src={item.product.images[0]} 
                                alt={item.product.nameEn} 
                                className="w-12 h-12 rounded-xl object-cover" 
                                containerClassName="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-700 shrink-0"
                                fallbackIcon={
                                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-6 h-6 text-slate-400" />
                                  </div>
                                }
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                                <BookOpen className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                                  {item.product.type === 'physical' 
                                    ? (language === 'ar' ? 'مطبوع ورقي' : 'Physical') 
                                    : (language === 'ar' ? 'كتاب / ملف رقمي' : 'Digital / PDF')}
                                </span>
                                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-neutral-400">
                                  {formatPrice(item.product.price, item.product.currency || displayCurrency, language)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Quantity buttons */}
                            <div className="flex items-center border border-slate-300 dark:border-neutral-700 rounded-lg overflow-hidden text-xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-100 text-slate-700 dark:text-white cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-100 text-slate-700 dark:text-white cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                              title={language === 'ar' ? 'إزالة' : 'Remove'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Cards Grid */}
                  <div className="space-y-3">
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-neutral-200">
                      {language === 'ar' ? 'اختر طريقة الدفع المناسبة لك لإتمام الشراء:' : 'Choose Your Payment Method:'}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. E-Wallets / Cash */}
                      {cashEnabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('cash')}
                          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                            selectedMethod === 'cash'
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-[#151c24] ring-2 ring-emerald-500 shadow-sm'
                              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#11131a] hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Smartphone className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {language === 'ar' ? 'المحافظ الإلكترونية / كاش' : 'E-Wallets / Cash'}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {language === 'ar' ? 'فودافون كاش، أورنج، اتصالات، وي، InstaPay' : 'Vodafone, Orange, Etisalat, We, InstaPay'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedMethod === 'cash' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-neutral-700'
                            }`}>
                              {selectedMethod === 'cash' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            {language === 'ar' ? 'التحويل المباشر بالجنيه المصري' : 'Direct transfer in EGP'}
                          </span>
                        </button>
                      )}

                      {/* 2. AIRTM */}
                      {airtmEnabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('airtm')}
                          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                            selectedMethod === 'airtm'
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-[#151c24] ring-2 ring-emerald-500 shadow-sm'
                              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#11131a] hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {language === 'ar' ? 'منصة AIRTM' : 'AIRTM Platform'}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {language === 'ar' ? 'تحويل حساب AIRTM دولي لجميع الدول' : 'Global transfer via Airtm username'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedMethod === 'airtm' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-neutral-700'
                            }`}>
                              {selectedMethod === 'airtm' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {language === 'ar' ? 'يدعم التحويل بجميع العملات' : 'Multi-currency supported'}
                          </span>
                        </button>
                      )}

                      {/* 3. PayPal */}
                      {paypalEnabled && (
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('paypal')}
                          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                            selectedMethod === 'paypal'
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-[#151c24] ring-2 ring-emerald-500 shadow-sm'
                              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#11131a] hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                <CreditCard className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {language === 'ar' ? 'بايبال PayPal' : 'PayPal'}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {language === 'ar' ? 'الدفع السريع والآمن عبر حساب بايبال' : 'Fast and secure payment via PayPal'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedMethod === 'paypal' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-neutral-700'
                            }`}>
                              {selectedMethod === 'paypal' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            {language === 'ar' ? 'دفع آمن بالدولار الأمريكي' : 'Secure USD Payment'}
                          </span>
                        </button>
                      )}

                      {/* 4. Custom Methods from Admin */}
                      {customMethods.map((cm) => (
                        <button
                          key={cm.id}
                          type="button"
                          onClick={() => setSelectedMethod(cm.id)}
                          className={`p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                            selectedMethod === cm.id
                              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-[#151c24] ring-2 ring-emerald-500 shadow-sm'
                              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#11131a] hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                <Building className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {language === 'ar' ? cm.nameAr : cm.nameEn}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                  {cm.accountNumber ? `${cm.accountNumber}` : (cm.instructionsAr || 'طريقة دفع مخصصة')}
                                </p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedMethod === cm.id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-neutral-700'
                            }`}>
                              {selectedMethod === cm.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {language === 'ar' ? 'حساب رسمي معتمد' : 'Verified Official Channel'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Order Total Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-neutral-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                      <span>{language === 'ar' ? 'مجموع المنتجات' : 'Subtotal'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatPrice(displaySubtotal, displayCurrency, language)}
                      </span>
                    </div>
                    {hasPhysicalItems && (
                      <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                        <span>{language === 'ar' ? 'الشحن والتوصيل (منتجات مطبوعة)' : 'Shipping (Physical Items)'}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatPrice(displayShipping, displayCurrency, language)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                      <span>{language === 'ar' ? 'المجموع النهائي المطلوب' : 'Grand Total'}</span>
                      <div className="text-end">
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base block">
                          {formatPrice(displayGrandTotal, displayCurrency, language)}
                        </span>
                        {displayCurrency !== 'USD' && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            (≈ ${grandTotalUSD.toFixed(2)} USD)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Next Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <span>{language === 'ar' ? 'المتابعة للتحويل والقيمة' : 'Proceed to Transfer'}</span>
                      {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------- STEP 2: TRANSFER & CURRENCY CONVERSION ----------------- */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Selected Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <SelectedIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          {language === 'ar' ? selectedInfo.titleAr : selectedInfo.titleEn}
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-mono">
                          {cart.length} {language === 'ar' ? 'عناصر في الطلب' : 'items'} • {formatPrice(displayGrandTotal, displayCurrency, language)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تغيير الطريقة' : 'Change'}</span>
                    </button>
                  </div>

                  {/* Amount Box */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#11131a] border border-slate-200 dark:border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? 'القيمة والمبلغ المطلوب تحويله' : 'Required Transfer Amount'}
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {formatPrice(displayGrandTotal, displayCurrency, language)}{displayCurrency !== 'USD' ? ` (≈ $${grandTotalUSD.toFixed(2)} USD)` : ''}
                      </span>
                    </div>

                    {/* E-Wallets Currency Details */}
                    {selectedMethod === 'cash' && (
                      <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {language === 'ar' ? 'المبلغ المطلوب بالجنيه المصري (سعر صرف بنكي مباشر):' : 'Amount in Egyptian Pounds (Live Rate):'}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                              {totalInEgp.toLocaleString()} EGP
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {language === 'ar' ? 'سعر حي ومباشر' : 'Live Rate'}
                            </span>
                          </div>
                          {displayCurrency !== 'EGP' && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">
                              ({language === 'ar' ? 'معادل للقيمة الأصلية:' : 'Equivalent to:'} {formatPrice(displayGrandTotal, displayCurrency, language)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            1 USD = {cashExchangeRate.toFixed(2)} EGP
                          </span>
                          <button
                            type="button"
                            onClick={() => refreshRates()}
                            disabled={isRatesLoading}
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-emerald-600 transition-colors"
                            title={language === 'ar' ? 'تحديث سعر الصرف' : 'Refresh rate'}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRatesLoading ? 'animate-spin text-emerald-600' : ''}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Airtm Multi-Currency Converter */}
                    {selectedMethod === 'airtm' && (
                      <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {language === 'ar' ? 'المبلغ المطلوب تحويله بحساب AIRTM:' : 'Required Transfer via Airtm:'}
                          </span>
                          <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                            ${grandTotalUSD.toFixed(2)} USD
                          </span>
                          {displayCurrency !== 'USD' && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">
                              ({language === 'ar' ? 'معادل للقيمة الأصلية:' : 'Equivalent to:'} {formatPrice(displayGrandTotal, displayCurrency, language)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Universal Live Currency Calculator & Converter Widget */}
                    <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {language === 'ar' ? 'عداد ومحول العملات اللحظي (حساب القيمة بأي عملة):' : 'Live Currency Counter & Rate Checker:'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {language === 'ar' ? 'سعر الصرف حي الآن' : 'Live Rates'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => refreshRates()}
                          disabled={isRatesLoading}
                          className="text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 self-start sm:self-auto cursor-pointer transition-colors"
                          title={language === 'ar' ? 'تحديث أسعار العملات لحظياً' : 'Refresh live rates'}
                        >
                          <RefreshCw className={`w-3 h-3 ${isRatesLoading ? 'animate-spin text-emerald-600' : ''}`} />
                          <span>{language === 'ar' ? 'تحديث الأسعار' : 'Refresh'}</span>
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500 shrink-0">
                            {language === 'ar' ? 'اختر عملتك لمعرفة المعادل:' : 'Select currency:'}
                          </label>
                          <select
                            value={targetCurrency}
                            onChange={(e) => setTargetCurrency(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white font-medium text-xs cursor-pointer shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="USD">🇺🇸 USD - دولار أمريكي</option>
                            {ARAB_AND_USD_CURRENCIES.filter(c => c.code !== 'USD').map(c => (
                              <option key={c.code} value={c.code}>
                                {c.code} - {language === 'ar' ? c.nameAr : c.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {targetCurrency !== displayCurrency && (
                          <div className="text-start sm:text-end bg-slate-50 dark:bg-neutral-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-neutral-700/60">
                            <span className="text-[10px] text-slate-500 block">
                              {language === 'ar' ? `المعادل اللحظي بـ (${targetCurrency}):` : `Live Equivalent (${targetCurrency}):`}
                            </span>
                            <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                              {totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                              {displayCurrency !== 'USD'
                                ? `${formatPrice(displayGrandTotal, displayCurrency, language)} = ${totalInSelectedCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${targetCurrency}`
                                : `1 USD = ${targetRate.toFixed(targetRate > 100 ? 1 : 3)} ${targetCurrency}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PayPal Amount */}
                    {selectedMethod === 'paypal' && (
                      <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {language === 'ar' ? 'المبلغ المطلوب بالدولار عبر PayPal:' : 'PayPal Payment Amount:'}
                          </span>
                          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                            ${grandTotalUSD.toFixed(2)} USD
                          </span>
                          {displayCurrency !== 'USD' && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">
                              ({language === 'ar' ? 'معادل للقيمة الأصلية:' : 'Equivalent to:'} {formatPrice(displayGrandTotal, displayCurrency, language)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Method Amount */}
                    {!['cash', 'airtm', 'paypal'].includes(selectedMethod) && (
                      <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {language === 'ar' ? 'المبلغ المطلوب:' : 'Amount:'}
                          </span>
                          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                            {formatPrice(displayGrandTotal, displayCurrency, language)}
                          </span>
                          {displayCurrency !== 'USD' && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">
                              (≈ ${grandTotalUSD.toFixed(2)} USD)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transfer Details Box */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200 dark:border-neutral-800 space-y-4">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'ar' ? 'بيانات وحساب التحويل الرسمي' : 'Official Transfer Recipient Details'}</span>
                    </h4>

                    {/* 1. Cash / E-Wallets Info */}
                    {selectedMethod === 'cash' && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] text-slate-500 block">
                              {language === 'ar' ? 'رقم محفظة فودافون كاش / المحافظ الإلكترونية:' : 'Vodafone Cash / E-Wallet Number:'}
                            </span>
                            <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tracking-wider">
                              {cashWalletNumber}
                            </span>
                            {cashWalletHolder && (
                              <span className="text-xs text-slate-500 block mt-0.5">
                                {language === 'ar' ? `باسم: ${cashWalletHolder}` : `Name: ${cashWalletHolder}`}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(cashWalletNumber, 'cash-num')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            {copiedKey === 'cash-num' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === 'cash-num' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ الرقم' : 'Copy')}</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                          ⚠️ {cashInstructions}
                        </p>
                      </div>
                    )}

                    {/* 2. Airtm Info */}
                    {selectedMethod === 'airtm' && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] text-slate-500 block">
                              {language === 'ar' ? 'اسم مستخدم حساب AIRTM المعتمد:' : 'Official Airtm Username:'}
                            </span>
                            <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tracking-wider">
                              @{airtmUsername}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(airtmUsername, 'airtm-user')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              {copiedKey === 'airtm-user' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === 'airtm-user' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ اليوزر' : 'Copy')}</span>
                            </button>
                            {airtmDirectLink && (
                              <a
                                href={airtmDirectLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'فتح المنصة' : 'Open'}</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                          ℹ️ {airtmInstructions}
                        </p>
                      </div>
                    )}

                    {/* 3. PayPal Info */}
                    {selectedMethod === 'paypal' && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] text-slate-500 block">
                              {language === 'ar' ? 'البريد أو رابط الدفع في PayPal:' : 'PayPal Email or PayPal.Me:'}
                            </span>
                            <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                              {paypalEmailOrLink || 'paypal@domain.com'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(paypalEmailOrLink, 'paypal-acc')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              {copiedKey === 'paypal-acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === 'paypal-acc' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ الحساب' : 'Copy')}</span>
                            </button>
                            {paypalEmailOrLink.startsWith('http') && (
                              <a
                                href={paypalEmailOrLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'دفع مباشر' : 'Pay'}</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
                          ℹ️ {paypalInstructions}
                        </p>
                      </div>
                    )}

                    {/* 4. Custom Method Info */}
                    {!['cash', 'airtm', 'paypal'].includes(selectedMethod) && (() => {
                      const cm = customMethods.find(m => m.id === selectedMethod);
                      if (!cm) return null;
                      return (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d12] border border-slate-200 dark:border-neutral-800 space-y-2">
                            {cm.accountNumber && (
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-[11px] text-slate-500 block">
                                    {language === 'ar' ? 'رقم الحساب / الآيبان / المحفظة:' : 'Account Number / IBAN:'}
                                  </span>
                                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                                    {cm.accountNumber}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(cm.accountNumber || '', 'custom-acc')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                                >
                                  {copiedKey === 'custom-acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedKey === 'custom-acc' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
                                </button>
                              </div>
                            )}
                            {cm.accountName && (
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                <span className="text-slate-400">{language === 'ar' ? 'اسم المستفيد: ' : 'Name: '}</span>
                                <span className="font-bold">{cm.accountName}</span>
                              </div>
                            )}
                          </div>
                          {(cm.instructionsAr || cm.instructionsEn) && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                              ℹ️ {language === 'ar' ? cm.instructionsAr : cm.instructionsEn}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {language === 'ar' ? 'السابق' : 'Back'}
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <span>{language === 'ar' ? 'المتابعة لبيانات الإيصال' : 'Proceed to Receipt'}</span>
                      {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------- STEP 3: RECEIPT & TRANSFER VERIFICATION ----------------- */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Selected Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <SelectedIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          {language === 'ar' ? selectedInfo.titleAr : selectedInfo.titleEn}
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-mono">
                          {selectedMethod === 'cash' ? `${totalInEgp.toLocaleString()} EGP` : (['paypal', 'airtm'].includes(selectedMethod) ? `$${grandTotalUSD.toFixed(2)} USD` : formatPrice(displayGrandTotal, displayCurrency, language))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تغيير الطريقة' : 'Change'}</span>
                    </button>
                  </div>

                  {/* Transfer Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {selectedMethod === 'cash' 
                          ? (language === 'ar' ? 'رقم الكاش / الهاتف المحول منه *' : 'Sender Wallet Phone Number *')
                          : selectedMethod === 'airtm'
                          ? (language === 'ar' ? 'اسم مستخدم حساب AIRTM المحول منه *' : 'Sender Airtm Username *')
                          : selectedMethod === 'paypal'
                          ? (language === 'ar' ? 'البريد الإلكتروني لحساب PayPal أو رقم المعاملة *' : 'Sender PayPal Email or Transaction ID *')
                          : (language === 'ar' ? 'بيانات الحساب / الرقم المحول منه *' : 'Sender Account Details *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value)}
                        placeholder={
                          selectedMethod === 'cash'
                            ? (language === 'ar' ? 'مثال: 01012345678' : '01012345678')
                            : selectedMethod === 'airtm'
                            ? '@username'
                            : 'user@example.com / TXN-9988...'
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {language === 'ar' ? 'تاريخ ووقت التحويل' : 'Transfer Date & Time'}
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                        <input
                          type="datetime-local"
                          value={transferDate}
                          onChange={(e) => setTransferDate(e.target.value)}
                          className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Receipt Upload Box */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {language === 'ar' ? 'إرفاق صورة إيصال التحويل أو لقطة الشاشة *' : 'Transfer Receipt Screenshot *'}
                      </label>

                      {receiptImageBase64 ? (
                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <LazyImage 
                              src={receiptImageBase64} 
                              alt="Receipt" 
                              className="w-14 h-14 rounded-xl object-cover" 
                              containerClassName="w-14 h-14 rounded-xl overflow-hidden border border-emerald-400/50 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {receiptFileName || (language === 'ar' ? 'صورة الإيصال' : 'Receipt Image')}
                              </p>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                {receiptFileSize || 'Image Ready'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleRemoveReceipt}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                            title={language === 'ar' ? 'حذف وتغيير الصورة' : 'Remove image'}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-6 border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl bg-slate-50/50 dark:bg-[#11131a] flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                              {language === 'ar' ? 'اضغط هنا لرفع صورة الإيصال أو اسحب الصورة وأفلتها' : 'Click to upload receipt or drag & drop'}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                              {language === 'ar' ? 'يدعم صور PNG, JPG, WEBP حتى 8 ميجابايت' : 'PNG, JPG, WEBP up to 8MB'}
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {language === 'ar' ? 'السابق' : 'Back'}
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep4}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <span>{language === 'ar' ? 'المتابعة لبيانات المشتري' : 'Proceed to Buyer Info'}</span>
                      {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------- STEP 4: BUYER DETAILS & PLACE ORDER ----------------- */}
              {currentStep === 4 && (
                <form onSubmit={handleFinalSubmit} className="space-y-6">
                  {/* Selected Banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <SelectedIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          {language === 'ar' ? selectedInfo.titleAr : selectedInfo.titleEn}
                        </div>
                        <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-mono">
                          {selectedMethod === 'cash' ? `${totalInEgp.toLocaleString()} EGP` : (['paypal', 'airtm'].includes(selectedMethod) ? `$${grandTotalUSD.toFixed(2)} USD` : formatPrice(displayGrandTotal, displayCurrency, language))} • {language === 'ar' ? 'الإيصال جاهز' : 'Receipt attached'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تغيير الطريقة' : 'Change'}</span>
                    </button>
                  </div>

                  {/* Buyer Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {language === 'ar' ? 'اسم المشتري / الحساب *' : 'Full Name *'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={language === 'ar' ? 'الاسم بالكامل' : 'Full name'}
                          className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                          {language === 'ar' ? 'البريد الإلكتروني * (لتلقي روابط الملفات)' : 'Email Address *'}
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                          <input
                            type="email"
                            required
                            dir="ltr"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs font-sans text-left"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                          {language === 'ar' ? 'رقم الهاتف / الواتساب للتواصل *' : 'Phone / WhatsApp *'}
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="+20 10... / +966..."
                            className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs font-mono text-left"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping address for physical items */}
                    {hasPhysicalItems && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                          {language === 'ar' ? 'عنوان الشحن والتوصيل للمطبوعات الورقية *' : 'Shipping Address *'}
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                          <textarea
                            rows={2}
                            required
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            placeholder={language === 'ar' ? 'الدولة، المدينة، الشارع، تفاصيل العنوان...' : 'Country, city, street, postal code...'}
                            className="w-full ps-9 pe-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-neutral-200">
                        {language === 'ar' ? 'ملاحظات إضافية على الطلب (اختياري)' : 'Order Notes (Optional)'}
                      </label>
                      <textarea
                        rows={2}
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder={language === 'ar' ? 'أي تعليمات أو ملاحظات خاصة...' : 'Any extra details...'}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Navigation & Submit Button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {language === 'ar' ? 'السابق' : 'Back'}
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{language === 'ar' ? 'جارٍ إرسال الطلب...' : 'Submitting Order...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'إرسال وتأكيد الطلب الآن' : 'Submit & Confirm Order'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>
      </div>

      {/* Error Popup Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#11131a] border border-rose-200 dark:border-rose-900/60 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'تنبيه إتمام الطلب' : 'Notice'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'حسناً، فهمت' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
