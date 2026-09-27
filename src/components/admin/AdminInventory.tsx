import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Minus, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  X, 
  Save, 
  ArrowUpRight, 
  ArrowDownRight,
  Send,
  RefreshCw,
  Search,
  SlidersHorizontal,
  PackageCheck,
  TrendingDown,
  ShoppingBag,
  Coins,
  DollarSign,
  AlertOctagon,
  FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ProductItem, InventoryTransaction, SiteSettings } from '../../types';
import { db, cleanFirestorePayload } from '../../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDocs, 
  orderBy, 
  query, 
  limit 
} from 'firebase/firestore';
import { formatPrice } from '../../utils/currencies';
import { sendBulkLowStockTelegramReport } from '../../utils/telegramService';

interface AdminInventoryProps {
  products: ProductItem[];
  settings?: SiteSettings;
  onRefresh: () => void;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  products,
  settings,
  onRefresh
}) => {
  const { language } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductIdForRestock, setSelectedProductIdForRestock] = useState<string>('');
  
  // Stock Adjustment Form State
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(10);
  const [adjustmentType, setAdjustmentType] = useState<'restock' | 'manual_adjustment' | 'damage' | 'return'>('restock');
  const [reason, setReason] = useState('توريد شحنة جديدة من المورد');
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  // Audit Logs
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [quickUpdatingId, setQuickUpdatingId] = useState<string | null>(null);

  // Unified Catalog: All products registered in the Store are managed in the Inventory!
  const trackedProducts = useMemo(() => {
    return (products || []).filter(p => p && !p.isArchived && p.status !== 'archived');
  }, [products]);

  // Overall catalog products for restock selection
  const catalogProducts = useMemo(() => {
    return (products || []).filter(p => p && !p.isArchived && p.status !== 'archived');
  }, [products]);

  // Derived Metrics
  const totalTrackedItems = trackedProducts.length;
  const totalInStockUnits = trackedProducts.reduce((acc, p) => acc + Math.max(0, p.stock || 0), 0);
  const lowStockItems = trackedProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.lowStockThreshold || 10));
  const outOfStockItems = trackedProducts.filter(p => (p.stock || 0) <= 0);
  const healthyStockItems = trackedProducts.filter(p => (p.stock || 0) > (p.lowStockThreshold || 10));
  
  const totalValuation = trackedProducts.reduce((acc, p) => {
    const units = Math.max(0, p.stock || 0);
    return acc + (units * (p.price || 0));
  }, 0);

  // Filtered list for the table
  const filteredProducts = useMemo(() => {
    return trackedProducts.filter(p => {
      const name = (language === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || sku.includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      const currentStock = p.stock || 0;
      if (statusFilter === 'out') return currentStock <= 0;
      if (statusFilter === 'low') return currentStock > 0 && currentStock <= (p.lowStockThreshold || 10);
      if (statusFilter === 'healthy') return currentStock > (p.lowStockThreshold || 10);
      return true;
    });
  }, [trackedProducts, searchTerm, statusFilter, language]);

  // Fetch Transaction logs
  const fetchTransactions = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'inventoryTransactions'),
        orderBy('createdAt', 'desc'),
        limit(35)
      );
      const snap = await getDocs(q);
      const list: InventoryTransaction[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as InventoryTransaction);
      });
      setTransactions(list);
    } catch (err) {
      console.warn('Transactions history fetch notice:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Quick 1-click inline stock addition
  const handleQuickAddStock = async (product: ProductItem, amountToAdd: number) => {
    if (quickUpdatingId) return;
    setQuickUpdatingId(product.id);

    const prevStock = product.stock || 0;
    const newStock = Math.max(0, prevStock + amountToAdd);

    try {
      // 1. Update product doc
      await setDoc(doc(db, 'products', product.id), {
        stock: newStock,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Add inventory transaction log
      const txPayload = cleanFirestorePayload({
        productId: product.id,
        productName: product.nameAr || product.nameEn || 'Product',
        type: 'restock',
        quantity: amountToAdd,
        previousStock: prevStock,
        newStock,
        reason: language === 'ar' ? `إضافة سريعة (+${amountToAdd} قطعة)` : `Quick inline restock (+${amountToAdd} units)`,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'inventoryTransactions'), txPayload);

      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تمت إضافة +${amountToAdd} قطعة بنجاح إلى "${product.nameAr || product.nameEn}" (الرصيد الآن: ${newStock})`
          : `Added +${amountToAdd} units to "${product.nameEn || product.nameAr}" (New stock: ${newStock})`
      });
      setTimeout(() => setFeedback(null), 4000);

      onRefresh();
      fetchTransactions();
    } catch (err: any) {
      console.error('Quick stock addition error:', err);
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'فشل تحديث المخزون' : 'Failed to update stock'
      });
    } finally {
      setQuickUpdatingId(null);
    }
  };

  // Dedicated Restock / Batch Inward Modal submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductIdForRestock) {
      setFeedback({
        type: 'error',
        message: language === 'ar' ? 'يرجى اختيار منتج من القائمة' : 'Please select a product'
      });
      return;
    }

    const targetProduct = catalogProducts.find(p => p.id === selectedProductIdForRestock);
    if (!targetProduct) return;

    setIsSubmitting(true);
    const prevStock = typeof targetProduct.stock === 'number' ? Math.max(0, targetProduct.stock) : 0;
    const addedUnits = Math.max(1, adjustmentAmount);
    const newStock = prevStock + addedUnits;

    try {
      // Update product doc in Firestore: maintain new stock and low stock threshold
      await setDoc(doc(db, 'products', targetProduct.id), {
        stock: newStock,
        lowStockThreshold: Number(newThreshold) || targetProduct.lowStockThreshold || 10,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Add audit log
      const txPayload = cleanFirestorePayload({
        productId: targetProduct.id,
        productName: targetProduct.nameAr || targetProduct.nameEn || 'Product',
        type: adjustmentType,
        quantity: addedUnits,
        previousStock: prevStock,
        newStock,
        reason: reason.trim() || (language === 'ar' ? 'توريد دفعة مخزون جديدة' : 'New batch receipt'),
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'inventoryTransactions'), txPayload);

      setIsRestockModalOpen(false);
      setSelectedProductIdForRestock('');
      setFeedback({
        type: 'success',
        message: language === 'ar'
          ? `تم توريد ${addedUnits} قطعة بنجاح إلى "${targetProduct.nameAr || targetProduct.nameEn}". الرصيد الجديد: ${newStock} قطعة.`
          : `Successfully restocked ${addedUnits} units for "${targetProduct.nameEn || targetProduct.nameAr}". New stock: ${newStock}.`
      });
      setTimeout(() => setFeedback(null), 5000);

      onRefresh();
      fetchTransactions();
    } catch (err: any) {
      console.error('Failed to restock product:', err);
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'حدث خطأ أثناء توريد المخزون' : 'Failed to restock')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detailed single product adjustment
  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSubmitting(true);

    const prevStock = selectedProduct.stock || 0;
    let delta = 0;
    if (adjustmentType === 'damage') {
      delta = -Math.abs(adjustmentAmount);
    } else if (adjustmentType === 'manual_adjustment') {
      // User can increase or decrease
      delta = adjustmentAmount;
    } else {
      delta = Math.abs(adjustmentAmount);
    }

    const newStock = Math.max(0, prevStock + delta);

    try {
      // 1. Update product doc
      await setDoc(doc(db, 'products', selectedProduct.id), {
        stock: newStock,
        lowStockThreshold: Number(newThreshold) || selectedProduct.lowStockThreshold || 10,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Add inventory transaction log
      const txPayload = cleanFirestorePayload({
        productId: selectedProduct.id,
        productName: selectedProduct.nameAr || selectedProduct.nameEn || 'Product',
        type: adjustmentType,
        quantity: delta,
        previousStock: prevStock,
        newStock,
        reason: reason.trim() || (language === 'ar' ? 'تعديل وتسوية رصيد المخزون' : 'Stock reconciliation'),
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'inventoryTransactions'), txPayload);

      setSelectedProduct(null);
      setFeedback({
        type: 'success',
        message: language === 'ar' 
          ? `تم تعديل رصيد "${selectedProduct.nameAr || selectedProduct.nameEn}" إلى ${newStock} قطعة بنجاح.`
          : `Stock adjusted to ${newStock} units for "${selectedProduct.nameEn || selectedProduct.nameAr}".`
      });
      setTimeout(() => setFeedback(null), 4500);

      onRefresh();
      fetchTransactions();
    } catch (err: any) {
      console.error('Failed to adjust stock:', err);
      setFeedback({
        type: 'error',
        message: err?.message || (language === 'ar' ? 'فشل تعديل المخزون' : 'Failed to adjust stock')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Telegram alert dispatch
  const handleSendTelegramReport = async () => {
    setIsSendingTelegram(true);
    try {
      const res = await sendBulkLowStockTelegramReport(products, settings);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: language === 'ar' ? 'تم إرسال تقرير حالة المخزون والنواقص إلى تيليجرام بنجاح! 🚀' : 'Inventory report sent to Telegram successfully!'
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || (language === 'ar' ? 'تعذر الإرسال. تأكد من إعدادات بوت تيليجرام' : 'Failed to send report')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Telegram alert failed'
      });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : feedback.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Core Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                {language === 'ar' ? 'إدارة المخزون والتوريد (المستودع)' : 'Warehouse & Stock Inventory Management'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {language === 'ar' 
                  ? 'إضافة شحنات وتوريد كميات جديدة، خصم تلقائي فوري عند البيع، وتنبيهات بالنواقص متزامنة مع المتجر والنظرة العامة.' 
                  : 'Add stock shipments, automatic sales deduction, low-stock alerts, fully synchronized with store & overview.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 pt-2 md:pt-0">
          <button
            onClick={() => {
              if (catalogProducts.length > 0) {
                setSelectedProductIdForRestock(catalogProducts[0].id);
                setNewThreshold(catalogProducts[0].lowStockThreshold || 10);
              }
              setAdjustmentAmount(25);
              setAdjustmentType('restock');
              setReason(language === 'ar' ? 'توريد شحنة جديدة من المورد' : 'Supplier restock batch receipt');
              setIsRestockModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'توريد وإضافة كميات للمخزن' : 'Add Stock Batch'}</span>
          </button>

          <button
            onClick={handleSendTelegramReport}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
            title={language === 'ar' ? 'إرسال تقرير النواقص الفوري لبوت تيليجرام' : 'Send Telegram stock alert report'}
          >
            <Send className={`w-3.5 h-3.5 ${isSendingTelegram ? 'animate-spin' : ''}`} />
            <span>{isSendingTelegram ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'تقرير تيليجرام' : 'Telegram Report')}</span>
          </button>

          <button
            onClick={() => {
              onRefresh();
              fetchTransactions();
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={language === 'ar' ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Total Tracked SKUs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'ar' ? 'المنتجات المتابعة' : 'Tracked SKUs'}</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-950 dark:text-white font-mono">
            {totalTrackedItems}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'ar' ? 'منتج مفعل به نظام التتبع' : 'Active inventory items'}
          </p>
        </div>

        {/* Card 2: Total Units In Stock */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'ar' ? 'إجمالي القطع المتوفرة' : 'Total Units'}</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalInStockUnits}
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            {language === 'ar' ? 'وحدة جاهزة للشحن والبيع' : 'Units ready for sale'}
          </p>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          lowStockItems.length > 0 
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{language === 'ar' ? 'قارب على النفاد' : 'Low Stock Alert'}</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {lowStockItems.length}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
            {language === 'ar' ? 'وصلت لحد الأمان الأدنى' : 'Needs replenishment'}
          </p>
        </div>

        {/* Card 4: Out of Stock */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          outOfStockItems.length > 0 
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">{language === 'ar' ? 'نفد تماماً (0)' : 'Out of Stock'}</span>
            <TrendingDown className={`w-4 h-4 ${outOfStockItems.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {outOfStockItems.length}
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
            {language === 'ar' ? 'متوقف بيعها بالموقع' : 'Disabled from purchase'}
          </p>
        </div>

        {/* Card 5: Inventory Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'ar' ? 'قيمة بضاعة المخزن' : 'Stock Value'}</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono truncate">
            {formatPrice(totalValuation, settings?.currency || 'USD', language)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {language === 'ar' ? 'إجمالي السعر للكميات' : 'Retail inventory valuation'}
          </p>
        </div>

      </div>

      {/* Critical Stock Alert Action Banner */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'تنبيه استباقي: منتجات تحتاج توريد عاجل لتفادي نفاد البيع' : 'Urgent Restock Action Needed'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  {lowStockItems.length + outOfStockItems.length} {language === 'ar' ? 'منتجات' : 'items'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {language === 'ar'
                  ? 'هناك منتجات انخفض رصيدها عن الحد الأدنى أو نفدت، يمكنك تزويد الكميات فوراً بضغطة واحدة من الجدول أدناه.'
                  : 'Stock is at or below the safety threshold. Replenish units immediately via the table below.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const firstUrgent = outOfStockItems[0] || lowStockItems[0];
              if (firstUrgent) {
                setSelectedProduct(firstUrgent);
                setAdjustmentAmount(50);
                setAdjustmentType('restock');
                setReason(language === 'ar' ? 'توريد دفعة سريعة لحل النقص' : 'Urgent replenishment batch');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            {language === 'ar' ? 'توريد النواقص الآن' : 'Replenish Urgent Items'}
          </button>
        </div>
      )}

      {/* Main Inventory Management Table & Filtering */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم، كود التخزين (SKU)...' : 'Search by product name or SKU...'}
              className="w-full ps-9 pe-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-emerald-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All', count: trackedProducts.length },
              { id: 'healthy', labelAr: 'متوفر', labelEn: 'Healthy', count: healthyStockItems.length },
              { id: 'low', labelAr: 'قارب على النفاد', labelEn: 'Low Stock', count: lowStockItems.length },
              { id: 'out', labelAr: 'نفد', labelEn: 'Out of Stock', count: outOfStockItems.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  statusFilter === tab.id 
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3 px-4 text-start">SKU</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'الكمية الحالية' : 'In-Stock'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'حد الإنذار' : 'Alert At'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'حالة التوفر' : 'Health'}</th>
                <th className="py-3 px-4 text-center">{language === 'ar' ? 'تزويد سريع (+)' : 'Quick Add'}</th>
                <th className="py-3 px-4 text-end">{language === 'ar' ? 'إجراءات الجرد' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold">{language === 'ar' ? 'لا توجد منتجات تطابق البحث' : 'No inventory items match criteria'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'ar' ? 'يمكنك توريد منتج جديد عبر زر (توريد وإضافة كميات للمخزن) بالأعلى.' : 'Click "Add Stock Batch" to register items in inventory.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 10);
                  const isUpdatingThis = quickUpdatingId === p.id;

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${
                        isOut 
                          ? 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20' 
                          : isLow 
                          ? 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Product Name & Image */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                        <div className="flex items-center gap-3">
                          {p.images && p.images[0] ? (
                            <img 
                              src={p.images[0]} 
                              alt={p.nameEn || p.nameAr} 
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-900 dark:text-white">
                              {language === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {p.category || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                          {p.sku || 'N/A'}
                        </span>
                      </td>

                      {/* Current In-Stock */}
                      <td className="py-3.5 px-4 font-mono font-black text-sm">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>0 {language === 'ar' ? 'قطعة' : 'units'}</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                            <span>{p.stock} {language === 'ar' ? 'قطعة' : 'units'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{p.stock} {language === 'ar' ? 'قطعة' : 'units'}</span>
                          </span>
                        )}
                      </td>

                      {/* Threshold */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">
                        {p.lowStockThreshold || 10} {language === 'ar' ? 'قطعة' : 'units'}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {formatPrice(p.price || 0, p.currency || settings?.currency || 'USD', language)}
                      </td>

                      {/* Health Status & Store Visibility */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>{language === 'ar' ? 'نفد من المخزن' : 'Out of Stock'}</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                                <span>{language === 'ar' ? 'قارب على النفاد' : 'Low Stock'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                <span>{language === 'ar' ? 'متوفر' : 'In Stock'}</span>
                              </span>
                            )}
                          </div>
                          <div>
                            {p.status === 'published' ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{language === 'ar' ? 'معروض بالمتجر' : 'Active in Store'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>{language === 'ar' ? 'مسودة / غير معروض' : 'Hidden / Draft'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quick Inline 1-Click Add (+5, +10, +25, +50) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[5, 10, 25, 50].map((amt) => (
                            <button
                              key={amt}
                              disabled={isUpdatingThis}
                              onClick={() => handleQuickAddStock(p, amt)}
                              className="px-2 py-1 text-[11px] font-mono font-bold rounded-md bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                              title={language === 'ar' ? `إضافة سريعة +${amt} قطعة` : `Quick add +${amt} units`}
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Action / Detailed Adjust */}
                      <td className="py-3.5 px-4 text-end">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustmentAmount(10);
                            setNewThreshold(p.lowStockThreshold || 10);
                            setAdjustmentType('restock');
                            setReason(language === 'ar' ? 'توريد شحنة جديدة' : 'Supplier restock batch receipt');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {language === 'ar' ? 'تعديل وتفصيل' : 'Adjust / Audit'}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Transaction History Audit Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'سجل حركات وتدقيق المخزون (Audit Trail)' : 'Inventory Transactions Audit Log'}
            </h3>
          </div>
          <button
            onClick={fetchTransactions}
            className="text-xs text-emerald-600 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تحديث السجل' : 'Refresh Logs'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'نوع الحركة' : 'Event'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'التغيير (الكمية)' : 'Delta'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'الرصيد بعد الحركة' : 'New Stock'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'البيان / الفاتورة / السبب' : 'Reason / Note'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    {language === 'ar' ? 'لا توجد حركات مسجلة بعد. سيتم تسجيل أي توريد أو بيع تلقائياً هنا.' : 'No transactions recorded yet.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {tx.productName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tx.type === 'restock' || tx.type === 'in'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : tx.type === 'sale'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : tx.type === 'damage'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {tx.type === 'restock' || tx.type === 'in' 
                          ? (language === 'ar' ? 'توريد +' : 'Restock') 
                          : tx.type === 'sale'
                          ? (language === 'ar' ? 'مبيعات -' : 'Sale')
                          : tx.type === 'damage'
                          ? (language === 'ar' ? 'تالف/هالك -' : 'Damage')
                          : tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {tx.quantity > 0 ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          +{tx.quantity}
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-0.5">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {tx.quantity}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {tx.newStock} {language === 'ar' ? 'قطعة' : 'units'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {tx.reason}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: ADD STOCK BATCH (توريد وإضافة كميات للمخزن) --- */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-[#111216] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10]">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-950 dark:text-white text-base">
                  {language === 'ar' ? 'توريد وإضافة كميات جديدة للمخزن' : 'Receive New Stock Batch'}
                </h3>
              </div>
              <button 
                onClick={() => setIsRestockModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              
              {/* Select Product */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'اختر المنتج من المتجر *' : 'Select Catalog Product *'}
                </label>
                <select
                  required
                  value={selectedProductIdForRestock}
                  onChange={(e) => {
                    setSelectedProductIdForRestock(e.target.value);
                    const found = catalogProducts.find(p => p.id === e.target.value);
                    if (found) {
                      setNewThreshold(found.lowStockThreshold || 10);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="">
                    {language === 'ar' ? '-- اختر منتجاً لتوريد وإضافة كمية له --' : '-- Choose a product to restock --'}
                  </option>
                  {catalogProducts.map((p) => {
                    const currentStock = p.stock || 0;
                    const isPublished = p.status === 'published';
                    const storeStatus = isPublished 
                      ? (language === 'ar' ? 'معروض بالمتجر' : 'Active in Store') 
                      : (language === 'ar' ? 'مسودة / غير معروض' : 'Hidden / Draft');
                    return (
                      <option key={p.id} value={p.id}>
                        {language === 'ar' ? p.nameAr || p.nameEn : p.nameEn || p.nameAr} 
                        {` • (المخزون الحالي: ${currentStock} قطعة | ${storeStatus})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity to add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الكمية المورّدة (عدد القطع المضافة) *' : 'Quantity to Add (Units) *'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {language === 'ar' ? 'ستضاف فوراً للرصيد الحالي' : 'Will be added to existing stock'}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 text-sm font-bold font-mono rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white"
                  placeholder="25"
                />
                
                {/* Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[10, 25, 50, 100, 250, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustmentAmount(amt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-neutral-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Threshold & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'حد إنذار النواقص' : 'Low Stock Threshold'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'نوع التوريد' : 'Receipt Type'}
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white"
                  >
                    <option value="restock">{language === 'ar' ? 'توريد شحنة جديدة من المورد' : 'Supplier Batch Receipt'}</option>
                    <option value="manual_adjustment">{language === 'ar' ? 'تسوية جرد دوري' : 'Reconciliation Batch'}</option>
                    <option value="return">{language === 'ar' ? 'مرتجع عميل للمخزن' : 'Customer Return'}</option>
                  </select>
                </div>
              </div>

              {/* Note / Invoice Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'رقم الفاتورة أو البيان المرجعي' : 'Invoice / PO Note'}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: فاتورة توريد رقم #INV-4921 من المطبعة' : 'E.g. Invoice #PO-981 from Printer'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#0e0f12] text-slate-900 dark:text-white"
                />
              </div>

              {/* Calculation Preview */}
              {(() => {
                const target = catalogProducts.find(p => p.id === selectedProductIdForRestock);
                const current = target && target.stock !== undefined && target.stock < 999900 ? target.stock : 0;
                const after = current + (Math.max(1, adjustmentAmount) || 0);

                return (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الرصيد الحالي:' : 'Current Stock:'} </span>
                      <strong className="font-mono text-slate-800 dark:text-white">{current}</strong>
                    </div>
                    <div className="text-emerald-600 font-bold font-mono">
                      +{adjustmentAmount}
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الرصيد بعد التوريد:' : 'Stock After:'} </span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-black">{after} {language === 'ar' ? 'قطعة' : 'units'}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'تأكيد التوريد وإضافة الكمية' : 'Confirm Stock Addition')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: DETAILED PRODUCT ADJUSTMENT (تعديل تفصيلي للمنتج) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#111216] text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0c0d10]">
              <div>
                <h3 className="font-bold text-slate-950 dark:text-white text-base">
                  {language === 'ar' ? 'تعديل وتسوية المخزون' : 'Adjust Stock'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ar' ? selectedProduct.nameAr || selectedProduct.nameEn : selectedProduct.nameEn || selectedProduct.nameAr}
                </p>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-6 space-y-4">
              
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{language === 'ar' ? 'الرصيد الفعلي الحالي:' : 'Current In-Stock:'}</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                  {selectedProduct.stock || 0} {language === 'ar' ? 'قطعة' : 'units'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'نوع الحركة / التعديل' : 'Adjustment Type'}
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="restock">{language === 'ar' ? 'توريد جديد (+ إضافة للرصيد)' : 'Restock (+ Add Units)'}</option>
                  <option value="manual_adjustment">{language === 'ar' ? 'تسوية جرد (+ أو - تعديل يدوي)' : 'Manual Reconciliation (+/-)'}</option>
                  <option value="damage">{language === 'ar' ? 'تالف أو هالك (- خصم من الرصيد)' : 'Damaged / Written-off (- Subtract Units)'}</option>
                  <option value="return">{language === 'ar' ? 'مرتجع عميل (+ إضافة للرصيد)' : 'Customer Return (+ Add)'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'الكمية (عدد الوحدات)' : 'Number of Units'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'حد الإنذار الأدنى (الأمان)' : 'Alert Threshold'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'السبب / رقم الإذن المرجعي' : 'Reason / Reference Note'}
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: تسوية جرد ربع سنوي' : 'E.g. Quarterly inventory count'}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Preview Result */}
              {(() => {
                const prev = selectedProduct.stock || 0;
                const delta = adjustmentType === 'damage' ? -Math.abs(adjustmentAmount) : Math.abs(adjustmentAmount);
                const next = Math.max(0, prev + delta);

                return (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between">
                    <span className="text-slate-500">{language === 'ar' ? 'النتيجة بعد التعديل:' : 'Result after adjustment:'}</span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {next} {language === 'ar' ? 'قطعة' : 'units'}
                    </span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Updating...') : (language === 'ar' ? 'حفظ التعديل' : 'Save Adjustment')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
