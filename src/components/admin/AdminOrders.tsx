import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Eye, 
  CheckCircle2, 
  CheckCheck,
  PackageCheck,
  Clock, 
  Truck, 
  X, 
  Save, 
  Package, 
  FileCode,
  DollarSign,
  Printer,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Download
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Order, OrderStatus, SiteSettings } from '../../types';
import { db, cleanFirestorePayload } from '../../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { formatPrice } from '../../utils/currencies';
import { deleteDocumentRecursively } from '../../utils/recursiveDelete';
import { sendOrderTelegramNotification } from '../../utils/telegramService';
import { printInvoiceDirect, downloadInvoiceHtml } from '../../utils/invoicePrinter';
import { LazyImage } from '../LazyImage';

interface AdminOrdersProps {
  orders: Order[];
  onRefresh: () => void;
  settings?: SiteSettings;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  onRefresh,
  settings
}) => {
  const { language } = useLanguage();
  const [ordersList, setOrdersList] = useState<Order[]>(orders || []);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('paid');
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync internal state with props
  useEffect(() => {
    setOrdersList(orders || []);
  }, [orders]);

  // Telegram Alert States
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Send real test purchase alert to Telegram
  const handleSendTestTelegramAlert = async () => {
    setIsSendingTelegram(true);
    setTelegramFeedback(null);
    try {
      const testOrder: Order = {
        id: 'test-' + Date.now(),
        orderNumber: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
        customerName: 'أحمد محمود (تجربة اختبار)',
        customerEmail: 'test.customer@example.com',
        customerPhone: '+20 100 123 4567',
        items: [
          {
            productId: 'test-1',
            productNameAr: 'مؤلفات وبحوث المحتوى (النسخة الرقمية الكاملة)',
            productNameEn: 'Digital Research & Content Edition',
            price: 25,
            quantity: 1,
            type: 'digital',
            digitalFileUrl: 'https://example.com/download'
          },
          {
            productId: 'test-2',
            productNameAr: 'كتاب الدراسات الفكرية المطبوع الفاخر',
            productNameEn: 'Heritage & Intellectual Studies (Book)',
            price: 40,
            quantity: 2,
            type: 'physical'
          }
        ],
        subtotal: 105,
        discount: 0,
        shipping: 0,
        total: 105,
        currency: settings?.currency || 'USD',
        convertedAmount: '105 USD (حوالي 5,190 جنيه مصري / محفظة إلكترونية)',
        paymentMethod: 'vodafone_cash',
        paymentMethodTitle: 'فودافون كاش / إنستاباي (محفظة رقمية)',
        paymentStatus: 'paid',
        orderStatus: 'paid',
        transferFrom: '01012345678',
        transferDate: new Date().toLocaleString('ar-EG'),
        notes: 'هذه رسالة اختبار للتأكد من وصول تنبيهات الشراء فورياً إلى التيليجرام بنجاح وبصيغة البيع المعتمدة.',
        shippingAddress: 'جمهورية مصر العربية - القاهرة - شارع التحرير',
        createdAt: new Date().toISOString()
      };

      const res = await sendOrderTelegramNotification(testOrder, settings);

      if (res.success) {
        setTelegramFeedback({
          type: 'success',
          message: language === 'ar'
            ? 'تم إرسال تنبيه الشراء التجريبي بنجاح إلى حساب التيليجرام الخاص بك! تحقق من التطبيق الآن.'
            : 'Test purchase alert sent successfully to your Telegram chat!'
        });
      } else {
        setTelegramFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setTelegramFeedback({
        type: 'error',
        message: err?.message || 'فشل إرسال تنبيه تيليجرام'
      });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramFeedback(null), 8000);
    }
  };

  // Resend or dispatch specific order alert to Telegram
  const handleSendOrderTelegramAlert = async (order: Order) => {
    setIsSendingTelegram(true);
    setTelegramFeedback(null);
    try {
      const res = await sendOrderTelegramNotification(order, settings);
      if (res.success) {
        setTelegramFeedback({
          type: 'success',
          message: language === 'ar'
            ? `تم إرسال إشعار الطلب #${order.orderNumber} بنجاح إلى التيليجرام!`
            : `Order alert #${order.orderNumber} sent successfully to Telegram!`
        });
      } else {
        setTelegramFeedback({
          type: 'error',
          message: res.message
        });
      }
    } catch (err: any) {
      setTelegramFeedback({
        type: 'error',
        message: err?.message || 'فشل إرسال الإشعار'
      });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramFeedback(null), 8000);
    }
  };

  const handleOpenDetail = (o: Order) => {
    setSelectedOrder(o);
    setNewStatus(o.orderStatus);
  };

  const handlePrintOrder = (o: Order) => {
    setSelectedOrder(o);
    setNewStatus(o.orderStatus);
    // Reliable multi-target print (popup tab / hidden iframe / PDF generator)
    printInvoiceDirect(o, language, settings);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    const targetId = orderToDelete.id;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // 1. Direct parent document deletion from Firestore
      await deleteDoc(doc(db, 'orders', targetId));

      // 2. Immediate optimistic removal from local state
      setOrdersList(prev => prev.filter(o => o.id !== targetId));
      if (selectedOrder?.id === targetId) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);

      // 3. Background cleanup of subcollections or links without blocking UI
      try {
        await deleteDocumentRecursively('orders', targetId, {
          subcollections: ['items', 'logs', 'history', 'shipments'],
          linkedCollections: [
            { collectionName: 'comments', foreignKeyField: 'orderId' },
            { collectionName: 'notifications', foreignKeyField: 'orderId' }
          ]
        });
      } catch (cleanErr) {
        console.warn('Subcollections cleanup skipped or finished:', cleanErr);
      }

      // 4. Trigger parent reload
      onRefresh();
    } catch (err: any) {
      console.error('Failed to recursively delete order:', err);
      setDeleteError(err?.message || (language === 'ar' ? 'فشل حذف الطلب من قاعدة البيانات' : 'Failed to delete order from database'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const payload = cleanFirestorePayload({
        orderStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'orders', selectedOrder.id), payload, { merge: true });
      setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
      setOrdersList(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, orderStatus: newStatus } : o));
      onRefresh();
    } catch (err) {
      console.error('Failed to update order status in Firestore:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const exportOrdersToCSV = () => {
    if (!ordersList || ordersList.length === 0) return;
    
    const headers = language === 'ar'
      ? ['رقم الطلب', 'تاريخ الإنشاء', 'اسم العميل', 'البريد الإلكتروني', 'رقم الهاتف', 'طريقة الدفع', 'حالة الطلب', 'المجموع', 'العملة', 'العناصر', 'المدينة', 'عنوان الشحن']
      : ['Order Number', 'Date', 'Customer Name', 'Customer Email', 'Phone', 'Payment Method', 'Order Status', 'Total', 'Currency', 'Items Summary', 'City', 'Shipping Address'];

    const rows = ordersList.map(o => {
      const itemsSummary = (o.items || []).map(it => `${(language === 'ar' ? it.productNameAr : it.productNameEn) || it.productNameEn} (x${it.quantity})`).join('; ');
      return [
        `"${o.orderNumber}"`,
        `"${new Date(o.createdAt).toISOString()}"`,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        `"${(o.customerEmail || '').replace(/"/g, '""')}"`,
        `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
        `"${o.paymentMethod}"`,
        `"${o.orderStatus}"`,
        `"${o.total}"`,
        `"${o.currency || 'USD'}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        `"${(o.shippingCity || '').replace(/"/g, '""')}"`,
        `"${(o.shippingAddress || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleDirectStatusChange = async (orderId: string, targetStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const payload = cleanFirestorePayload({
        orderStatus: targetStatus,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'orders', orderId), payload, { merge: true });
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, orderStatus: targetStatus });
        setNewStatus(targetStatus);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to update order status in Firestore:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNextStepConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          nextStatus: 'processing' as OrderStatus,
          label: language === 'ar' ? 'تحقق وتجهيز' : 'Process',
          tooltip: language === 'ar' ? 'التحقق من التحويل والترقية إلى: جارٍ التجهيز' : 'Verify and advance to Processing',
          icon: PackageCheck,
          buttonClass: 'bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-300 dark:border-amber-700/60 shadow-xs',
          disabled: false,
          isCompleted: false
        };
      case 'paid':
        return {
          nextStatus: 'processing' as OrderStatus,
          label: language === 'ar' ? 'بدء التجهيز' : 'Process',
          tooltip: language === 'ar' ? 'ترقية حالة الطلب إلى: جارٍ التجهيز' : 'Advance to Processing',
          icon: PackageCheck,
          buttonClass: 'bg-indigo-500/10 hover:bg-indigo-500 text-indigo-700 dark:text-indigo-300 hover:text-white border border-indigo-300 dark:border-indigo-700/60 shadow-xs',
          disabled: false,
          isCompleted: false
        };
      case 'processing':
        return {
          nextStatus: 'shipped' as OrderStatus,
          label: language === 'ar' ? 'تم الشحن' : 'Mark Shipped',
          tooltip: language === 'ar' ? 'تسليم الشحنة للناقل والترقية إلى: تم الشحن' : 'Mark as Shipped with logistics',
          icon: Truck,
          buttonClass: 'bg-sky-500/10 hover:bg-sky-500 text-sky-700 dark:text-sky-300 hover:text-white border border-sky-300 dark:border-sky-700/60 shadow-xs',
          disabled: false,
          isCompleted: false
        };
      case 'shipped':
        return {
          nextStatus: 'completed' as OrderStatus,
          label: language === 'ar' ? 'تأكيد التسليم' : 'Mark Delivered',
          tooltip: language === 'ar' ? 'تأكيد وصول الطلب والترقية إلى: تم التسليم (مكتمل)' : 'Confirm delivery to customer',
          icon: CheckCircle2,
          buttonClass: 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-300 dark:border-emerald-700/60 shadow-xs',
          disabled: false,
          isCompleted: false
        };
      case 'completed':
        return {
          nextStatus: null,
          label: language === 'ar' ? 'تم التسليم' : 'Delivered',
          tooltip: language === 'ar' ? 'اكتملت دورة الطلب بنجاح (التحويل التلقائي مغلق - التعديل يدوي فقط)' : 'Order completed (Automatic flow finished - manual edits only)',
          icon: CheckCheck,
          buttonClass: 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75',
          disabled: true,
          isCompleted: true
        };
      default:
        return {
          nextStatus: null,
          label: getStatusLabel(status),
          tooltip: language === 'ar' ? 'حالة مخصصة (التحويل التلقائي مغلق - استخدم القائمة اليدوية)' : 'Custom status (Manual selector only)',
          icon: Clock,
          buttonClass: 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60',
          disabled: true,
          isCompleted: false
        };
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    if (language === 'ar') {
      switch (status) {
        case 'pending': return 'قيد المراجعة';
        case 'paid': return 'تم السداد';
        case 'processing': return 'جارٍ التجهيز';
        case 'shipped': return 'تم الشحن';
        case 'completed': return 'مكتمل ومسلّم';
        case 'cancelled': return 'ملغى';
        case 'refunded': return 'مسترجع';
        default: return status;
      }
    }
    return status.toUpperCase();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <ReceiptText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ar' ? 'إدارة الطلبات والمعاملات التجارية' : 'Customer Orders & Fulfillment'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === 'ar' 
              ? 'مراجعة المبيعات، تفاصيل عناوين الشحن، تسليم الملفات الرقمية، وتصدير التقارير المالية.' 
              : 'Track customer orders, fulfill physical shipments, audit transactions, and export CSV reports.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Send Test Telegram Purchase Alert Button */}
          <button
            type="button"
            onClick={handleSendTestTelegramAlert}
            disabled={isSendingTelegram}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title={language === 'ar' ? 'إرسال طلب تجريبي فوري بصيغة الشراء إلى التيليجرام لاختبار الربط' : 'Send test purchase alert to Telegram'}
          >
            <Bot className="w-4 h-4" />
            <span>
              {isSendingTelegram 
                ? (language === 'ar' ? 'جارٍ الإرسال إلى تيليجرام...' : 'Sending to Telegram...') 
                : (language === 'ar' ? 'تجربة إشعار شراء فوري (تيليجرام)' : 'Test Telegram Alert')}
            </span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={exportOrdersToCSV}
            disabled={ordersList.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title={language === 'ar' ? 'تصدير جدول الطلبات إلى ملف إكسل CSV' : 'Export Orders to CSV'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصدير سجل المبيعات (CSV)' : 'Export Orders CSV'}</span>
          </button>
        </div>
      </div>

      {/* Telegram Feedback Banner */}
      {telegramFeedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 border transition-all ${
          telegramFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : telegramFeedback.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 shrink-0" />
            <span>{telegramFeedback.message}</span>
          </div>
          <button 
            onClick={() => setTelegramFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-current cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'العناصر' : 'Items'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'القيمة' : 'Total'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'حالة الطلب' : 'Status'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ordersList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-mono">
                    {language === 'ar' ? 'لا توجد طلبات مسجلة حتى الآن في المتجر.' : 'No orders registered yet.'}
                  </td>
                </tr>
              ) : (
                ordersList.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      #{o.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{o.customerName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{o.customerEmail}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {o.items.length} {language === 'ar' ? 'عناصر' : 'items'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatPrice(o.total, o.currency || 'USD', language)}
                    </td>
                    <td className="py-3.5 px-4 uppercase text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      {o.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                        o.orderStatus === 'paid' || o.orderStatus === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400'
                          : o.orderStatus === 'shipped'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-400'
                          : o.orderStatus === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
                      }`}>
                        {getStatusLabel(o.orderStatus)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* 1. Automatic Next Step Progression Button */}
                        {(() => {
                          const nextCfg = getNextStepConfig(o.orderStatus);
                          const IconComp = nextCfg.icon;
                          const isThisUpdating = updatingOrderId === o.id;

                          return (
                            <button
                              type="button"
                              disabled={nextCfg.disabled || isThisUpdating}
                              onClick={() => {
                                if (nextCfg.nextStatus) {
                                  handleDirectStatusChange(o.id, nextCfg.nextStatus);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${nextCfg.buttonClass}`}
                              title={nextCfg.tooltip}
                            >
                              {isThisUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <IconComp className="w-3.5 h-3.5" />
                              )}
                              <span className="whitespace-nowrap">{nextCfg.label}</span>
                            </button>
                          );
                        })()}

                        {/* 2. Direct Status Dropdown Selector */}
                        <select
                          value={o.orderStatus}
                          disabled={updatingOrderId === o.id}
                          aria-label={language === 'ar' ? 'تغيير حالة الطلب مباشرة' : 'Change order status directly'}
                          onChange={(e) => handleDirectStatusChange(o.id, e.target.value as OrderStatus)}
                          className="h-7 text-[11px] font-semibold py-0.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
                          title={language === 'ar' ? 'تغيير حالة الطلب مباشرة' : 'Change status directly'}
                        >
                          <option value="pending">{language === 'ar' ? '⏳ قيد المراجعة' : 'Pending'}</option>
                          <option value="processing">{language === 'ar' ? '📦 جارٍ التجهيز' : 'Processing'}</option>
                          <option value="shipped">{language === 'ar' ? '🚚 تم الشحن' : 'Shipped'}</option>
                          <option value="completed">{language === 'ar' ? '✅ تم التسليم' : 'Delivered'}</option>
                          <option value="paid">{language === 'ar' ? '💳 تم السداد' : 'Paid'}</option>
                          <option value="cancelled">{language === 'ar' ? '❌ ملغى' : 'Cancelled'}</option>
                          <option value="refunded">{language === 'ar' ? '↩️ مسترجع' : 'Refunded'}</option>
                        </select>

                        {/* 3. Print Invoice Icon */}
                        <button
                          type="button"
                          onClick={() => handlePrintOrder(o)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title={language === 'ar' ? 'طباعة الفاتورة PDF' : 'Print Invoice PDF'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title={language === 'ar' ? 'عرض تفاصيل الطلب' : 'View Order Details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(o)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          title={language === 'ar' ? 'حذف الطلب نهائياً' : 'Delete Order'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 printable-modal-backdrop">
          <div 
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 printable-invoice"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 no-print">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}: #{selectedOrder.orderNumber}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(selectedOrder.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => printInvoiceDirect(selectedOrder, language, settings)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title={language === 'ar' ? 'طباعة الفاتورة في نافذة نظيفة ومستقلة' : 'Print Invoice in Clean Window'}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadInvoiceHtml(selectedOrder, language, settings)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title={language === 'ar' ? 'تنزيل الفاتورة كملف HTML للحفظ والطباعة' : 'Download Invoice HTML File'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تنزيل' : 'Download'}</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Header Visible ONLY during media print */}
            <div className="hidden print:block border-b-2 border-neutral-950 pb-4 mb-4 text-black">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight">{language === 'ar' ? 'فاتورة تجارية رسمية' : 'COMMERCIAL INVOICE'}</h1>
                  <p className="text-xs text-neutral-600">{language === 'ar' ? 'المنصة الرسمية للإصدارات والأعمال والمنتجات' : 'Official Platform for Publications, Works & Store'}</p>
                </div>
                <div className="text-end">
                  <p className="font-mono font-bold text-sm">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}: {selectedOrder.orderNumber}</p>
                  <p className="text-xs text-neutral-500">{language === 'ar' ? 'التاريخ' : 'Date'}: {new Date(selectedOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900">
              
              {/* Customer Info Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">{language === 'ar' ? 'العميل' : 'Customer'}</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedOrder.customerName}</p>
                  <p className="text-slate-500 dark:text-slate-400">{selectedOrder.customerEmail}</p>
                  {selectedOrder.customerPhone && <p className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">{selectedOrder.customerPhone}</p>}
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">{language === 'ar' ? 'بيانات الشحن والدفع' : 'Shipping & Payment'}</p>
                  <p className="font-bold text-slate-900 dark:text-white uppercase">{selectedOrder.paymentMethod} {language === 'ar' ? 'الدفع' : 'Payment'}</p>
                  {selectedOrder.shippingAddress ? (
                    <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{selectedOrder.shippingAddress}</p>
                  ) : (
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      {language === 'ar' ? 'تسليم رقمي فوري (لا يتطلب شحن فعلي)' : 'Instant Digital Delivery (No physical shipping required)'}
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  {language === 'ar' ? 'العناصر المشتراة' : 'Purchased Items'} ({selectedOrder.items.length})
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/50 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {language === 'ar' ? it.productNameAr : it.productNameEn}
                        </p>
                        <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 font-mono">
                          {it.type} • {language === 'ar' ? 'الكمية' : 'Quantity'}: {it.quantity}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatPrice(it.price * it.quantity, selectedOrder.currency || 'USD', language)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal / Shipping / Total */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                    <span className="font-mono font-semibold">{formatPrice(selectedOrder.subtotal, selectedOrder.currency || 'USD', language)}</span>
                  </div>
                  {selectedOrder.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>{language === 'ar' ? 'تكلفة الشحن:' : 'Shipping:'}</span>
                      <span className="font-mono font-semibold">{formatPrice(selectedOrder.shipping, selectedOrder.currency || 'USD', language)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-extrabold text-slate-900 dark:text-white">
                    <span>{language === 'ar' ? 'الإجمالي المدفوع:' : 'Total Paid:'}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatPrice(selectedOrder.total, selectedOrder.currency || 'USD', language)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Transfer Audit & Verification */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{language === 'ar' ? 'تدقيق عملية الدفع والتحويل' : 'Payment & Transfer Audit'}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {selectedOrder.paymentStatus === 'paid' ? (language === 'ar' ? 'مدفوع ومؤكد' : 'Paid') : selectedOrder.paymentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{language === 'ar' ? 'وسيلة الدفع المحددة:' : 'Method:'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.paymentMethodTitle || selectedOrder.paymentMethod}</span>
                  </div>
                  {selectedOrder.convertedAmount && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">{language === 'ar' ? 'القيمة المحولة المسجلة:' : 'Recorded Value:'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.convertedAmount}</span>
                    </div>
                  )}
                  {selectedOrder.transferFrom && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">{language === 'ar' ? 'المحول منه (المحفظة / الهاتف):' : 'Sender Account/Wallet:'}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                        {selectedOrder.transferFrom}
                      </span>
                    </div>
                  )}
                  {selectedOrder.transferDate && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">{language === 'ar' ? 'تاريخ وتوقيت التحويل:' : 'Transfer Timestamp:'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{selectedOrder.transferDate}</span>
                    </div>
                  )}
                </div>

                {/* Customer Notes */}
                {selectedOrder.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">{language === 'ar' ? 'ملاحظات العميل:' : 'Customer Notes:'}</span>
                    <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      "{selectedOrder.notes}"
                    </p>
                  </div>
                )}

                {/* Receipt Image Attachment */}
                {selectedOrder.receiptUrl && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                    <span className="text-slate-400 block text-[11px] font-semibold">{language === 'ar' ? 'إيصال التحويل المرفق:' : 'Transfer Receipt:'}</span>
                    <div className="relative inline-block group">
                      <div 
                        className="max-h-48 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(selectedOrder.receiptUrl, '_blank')}
                      >
                        <LazyImage 
                          src={selectedOrder.receiptUrl} 
                          alt="Receipt" 
                          className="max-h-48 w-auto object-contain"
                          containerClassName="max-h-48"
                        />
                      </div>
                      <a 
                        href={selectedOrder.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-sky-500 hover:text-sky-600"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{language === 'ar' ? 'فتح الإيصال بالحجم الكامل' : 'Open Full Image'}</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Telegram Re-send / Notification Trigger */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 no-print">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-sky-500" />
                      <span>{language === 'ar' ? 'إشعار التيليجرام الفوري' : 'Telegram Notification'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {language === 'ar' ? 'إرسال أو إعادة إرسال تفاصيل عملية الشراء هذه إلى بوت التيليجرام المسجل' : 'Send or resend this purchase alert to the registered Telegram bot'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendOrderTelegramAlert(selectedOrder)}
                    disabled={isSendingTelegram}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSendingTelegram ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال للتيليجرام' : 'Send to Telegram')}</span>
                  </button>
                </div>
              </div>

              {/* Status Update Form & Delete Action */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/60 space-y-3 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {language === 'ar' ? 'تحديث وتتبع مسار الطلب:' : 'Order Fulfillment Workflow:'}
                  </label>

                  {/* Next Step Progression Button inside Modal */}
                  {(() => {
                    const nextCfg = getNextStepConfig(selectedOrder.orderStatus);
                    const IconComp = nextCfg.icon;
                    const isThisUpdating = updatingOrderId === selectedOrder.id || isUpdating;

                    return (
                      <button
                        type="button"
                        disabled={nextCfg.disabled || isThisUpdating}
                        onClick={() => {
                          if (nextCfg.nextStatus) {
                            handleDirectStatusChange(selectedOrder.id, nextCfg.nextStatus);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${nextCfg.buttonClass}`}
                        title={nextCfg.tooltip}
                      >
                        {isThisUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <IconComp className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {language === 'ar' ? 'التحويل التلقائي:' : 'Auto Advance:'} {nextCfg.label}
                        </span>
                      </button>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="flex-1 min-w-[160px] px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pending">{language === 'ar' ? '⏳ قيد المراجعة' : 'Pending'}</option>
                    <option value="processing">{language === 'ar' ? '📦 جارٍ التجهيز' : 'Processing'}</option>
                    <option value="shipped">{language === 'ar' ? '🚚 تم الشحن' : 'Shipped'}</option>
                    <option value="completed">{language === 'ar' ? '✅ تم التسليم' : 'Completed / Delivered'}</option>
                    <option value="paid">{language === 'ar' ? '💳 تم السداد' : 'Paid'}</option>
                    <option value="cancelled">{language === 'ar' ? '❌ ملغى' : 'Cancelled'}</option>
                    <option value="refunded">{language === 'ar' ? '↩️ مسترجع' : 'Refunded'}</option>
                  </select>
                  <button
                    onClick={handleSaveStatus}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isUpdating ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (language === 'ar' ? 'تحديث الحالة' : 'Update Status')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderToDelete(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title={language === 'ar' ? 'حذف الطلب نهائياً' : 'Delete Order'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حذف الطلب' : 'Delete'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Recursive Deletion Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111216] border border-neutral-800 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تأكيد الحذف الجذري للطلب' : 'Confirm Recursive Order Deletion'}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  #{orderToDelete.orderNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? 'سيتم حذف هذا الطلب نهائياً مع كافة بنوده، سجلات المعالجة الفرعية، والتعليقات المرتبطة به بشكل جذري ولا يمكن التراجع عن هذه العملية.'
                : 'This order and all linked subcollections, shipment records, and logs will be permanently deleted.'}
            </p>

            {deleteError && (
              <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-lg border border-red-900/50">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setOrderToDelete(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
