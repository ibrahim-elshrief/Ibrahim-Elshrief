import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Tag, 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminTaxonomyManagerProps {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categories: string[];
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  statuses: string[];
  onAddStatus: (status: string) => void;
  onRemoveStatus: (status: string) => void;
  defaultCategories?: string[];
  defaultStatuses?: string[];
  // Optional Product Types for Store
  types?: { value: string; labelAr: string; labelEn: string }[];
  onAddType?: (type: string) => void;
  onRemoveType?: (type: string) => void;
  categoryUsageCounts?: Record<string, number>;
}

export const AdminTaxonomyManager: React.FC<AdminTaxonomyManagerProps> = ({
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  categories,
  onAddCategory,
  onRemoveCategory,
  statuses,
  onAddStatus,
  onRemoveStatus,
  defaultCategories = [],
  defaultStatuses = ['published', 'draft', 'archived'],
  types,
  onAddType,
  onRemoveType,
  categoryUsageCounts = {}
}) => {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'category' | 'status' | 'type';
    value: string;
    label?: string;
    count?: number;
  } | null>(null);

  // Category input
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Status input
  const [newStatus, setNewStatus] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Type input
  const [newType, setNewType] = useState('');
  const [typeError, setTypeError] = useState<string | null>(null);

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategory.trim();
    if (!clean) return;
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      setCategoryError(language === 'ar' ? 'هذا التصنيف موجود بالفعل' : 'This category already exists');
      return;
    }
    onAddCategory(clean);
    setNewCategory('');
    setCategoryError(null);
  };

  const handleAddStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newStatus.trim();
    if (!clean) return;
    if (statuses.some(s => s.toLowerCase() === clean.toLowerCase())) {
      setStatusError(language === 'ar' ? 'هذه الحالة مضافة مسبقاً' : 'This status already exists');
      return;
    }
    onAddStatus(clean);
    setNewStatus('');
    setStatusError(null);
  };

  const handleAddTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newType.trim();
    if (!clean || !onAddType) return;
    if (types && types.some(t => t.value.toLowerCase() === clean.toLowerCase())) {
      setTypeError(language === 'ar' ? 'هذا النوع موجود بالفعل' : 'This type already exists');
      return;
    }
    onAddType(clean);
    setNewType('');
    setTypeError(null);
  };

  const getStatusLabel = (s: string) => {
    if (language === 'ar') {
      if (s === 'published') return 'منشور (published)';
      if (s === 'draft') return 'مسودة (draft)';
      if (s === 'archived') return 'مؤرشف (archived)';
    }
    return s;
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111216] border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden transition-all">
      {/* Header Bar with Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'ar' ? titleAr : titleEn}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                {categories.length} {language === 'ar' ? 'تصنيفات' : 'categories'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {statuses.length} {language === 'ar' ? 'حالات' : 'statuses'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ar' ? descriptionAr : descriptionEn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span className="text-xs hidden sm:inline-block font-medium">
            {isExpanded 
              ? (language === 'ar' ? 'إغلاق لوحة الإعدادات' : 'Collapse Settings') 
              : (language === 'ar' ? 'تخصيص التصنيفات والحالات' : 'Manage Taxonomies')}
          </span>
          <button 
            type="button" 
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c0d10]/60 space-y-6">
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'ar'
                ? 'التصنيفات والحالات المسجلة هنا تظهر فوراً وتلقائياً في القوائم المنسدلة عند إضافة أو تعديل أي عنصر جديد دون الحاجة لتكرار كتابتها يدوياً.'
                : 'Taxonomies and statuses registered here appear immediately in dropdown selectors whenever a new item is created or edited.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Categories Manager */}
            <div className="space-y-3 bg-white dark:bg-[#14151a] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'التصنيفات المعتمدة' : 'Managed Categories'}</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">({categories.length})</span>
              </div>

              {/* Add category form */}
              <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => {
                    setNewCategory(e.target.value);
                    if (categoryError) setCategoryError(null);
                  }}
                  placeholder={language === 'ar' ? 'أضف تصنيفاً جديداً...' : 'Add new category...'}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newCategory.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                </button>
              </form>

              {categoryError && (
                <p className="text-[11px] text-rose-500 font-medium">{categoryError}</p>
              )}

              {/* Category Badges List */}
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const count = categoryUsageCounts[cat] || 0;
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 group hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <span>{cat}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono" title={language === 'ar' ? `${count} عنصر مستخدم` : `${count} used items`}>
                          {count}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({
                          type: 'category',
                          value: cat,
                          label: cat,
                          count
                        })}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded p-1 cursor-pointer transition-colors"
                        title={language === 'ar' ? `حذف تصنيف "${cat}"` : `Delete category "${cat}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 2. Statuses Manager */}
            <div className="space-y-3 bg-white dark:bg-[#14151a] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'ar' ? 'حالات العناصر والعرض' : 'Available Statuses'}</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">({statuses.length})</span>
              </div>

              {/* Add status form */}
              <form onSubmit={handleAddStatusSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStatus}
                  onChange={(e) => {
                    setNewStatus(e.target.value);
                    if (statusError) setStatusError(null);
                  }}
                  placeholder={language === 'ar' ? 'أضف حالة مخصصة (مثلاً: قيد المراجعة)...' : 'Add custom status...'}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newStatus.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                </button>
              </form>

              {statusError && (
                <p className="text-[11px] text-rose-500 font-medium">{statusError}</p>
              )}

              {/* Status Badges List */}
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                {statuses.map((st) => {
                  const getStatusColor = (s: string) => {
                    if (s === 'published') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                    if (s === 'draft') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                    if (s === 'archived') return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
                    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                  };

                  const isLastStatus = statuses.length <= 1;

                  return (
                    <span
                      key={st}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(st)}`}
                    >
                      <span>{getStatusLabel(st)}</span>
                      {onRemoveStatus && (
                        <button
                          type="button"
                          disabled={isLastStatus}
                          onClick={() => setConfirmDelete({
                            type: 'status',
                            value: st,
                            label: getStatusLabel(st),
                            count: 0
                          })}
                          className={`rounded p-1 cursor-pointer transition-colors ${
                            isLastStatus
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title={isLastStatus
                            ? (language === 'ar' ? 'يجب الإبقاء على حالة واحدة على الأقل' : 'At least one status is required')
                            : (language === 'ar' ? `حذف حالة "${getStatusLabel(st)}"` : `Delete status "${getStatusLabel(st)}"`)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 3. Optional Product Types Manager (for Store) */}
            {types && onAddType && (
              <div className="space-y-3 bg-white dark:bg-[#14151a] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{language === 'ar' ? 'أنواع وتصنيفات المنتجات' : 'Product Modalities'}</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">({types.length})</span>
                </div>

                <form onSubmit={handleAddTypeSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value);
                      if (typeError) setTypeError(null);
                    }}
                    placeholder={language === 'ar' ? 'أضف نوعاً مخصصاً...' : 'Add product type...'}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!newType.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                  </button>
                </form>

                {typeError && (
                  <p className="text-[11px] text-rose-500 font-medium">{typeError}</p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                  {types.map((tp) => {
                    const isLastType = types.length <= 1;
                    return (
                      <span
                        key={tp.value}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      >
                        <span>{language === 'ar' ? tp.labelAr : tp.labelEn}</span>
                        {onRemoveType && (
                          <button
                            type="button"
                            disabled={isLastType}
                            onClick={() => setConfirmDelete({
                              type: 'type',
                              value: tp.value,
                              label: language === 'ar' ? tp.labelAr : tp.labelEn,
                              count: 0
                            })}
                            className={`rounded p-1 cursor-pointer transition-colors ${
                              isLastType
                                ? 'text-amber-300 dark:text-amber-700 cursor-not-allowed opacity-40'
                                : 'text-amber-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                            title={isLastType
                              ? (language === 'ar' ? 'يجب الإبقاء على نوع واحد على الأقل' : 'At least one type is required')
                              : (language === 'ar' ? `حذف نوع "${tp.labelAr}"` : `Delete type "${tp.labelEn}"`)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#15171e] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {confirmDelete.type === 'category' 
                    ? (language === 'ar' ? 'تأكيد مسح التصنيف' : 'Confirm Delete Category')
                    : confirmDelete.type === 'status'
                    ? (language === 'ar' ? 'تأكيد مسح الحالة' : 'Confirm Delete Status')
                    : (language === 'ar' ? 'تأكيد مسح النوع' : 'Confirm Delete Product Type')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {confirmDelete.label || confirmDelete.value}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {confirmDelete.type === 'category' && (
                <div>
                  <p>
                    {language === 'ar'
                      ? `هل أنت متأكد من مسح التصنيف "${confirmDelete.label || confirmDelete.value}" من قائمة التصنيفات المعتمدة؟`
                      : `Are you sure you want to delete category "${confirmDelete.label || confirmDelete.value}" from managed categories?`}
                  </p>
                  {(confirmDelete.count ?? 0) > 0 ? (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <p>
                        {language === 'ar'
                          ? `يوجد حالياً ${confirmDelete.count} عنصر مرتبط بهذا التصنيف. لن يتم حذف عناصرك، ولكن سيتم مسح هذا التصنيف ولن يظهر بعد ذلك في القوائم المنسدلة لاختياره.`
                          : `There are currently ${confirmDelete.count} items using this category. Your items will not be deleted, but this category will be removed from dropdown selectors.`}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
                      {language === 'ar' ? 'لا توجد عناصر تستخدم هذا التصنيف حالياً.' : 'No active items currently use this category.'}
                    </p>
                  )}
                </div>
              )}
              {confirmDelete.type === 'status' && (
                <p>
                  {language === 'ar'
                    ? `هل أنت متأكد من مسح الحالة "${confirmDelete.label || confirmDelete.value}" من خيارات الحالات المعتمدة؟ لن تظهر هذه الحالة في القوائم المنسدلة عند إنشاء أو تعديل العناصر.`
                    : `Are you sure you want to delete status "${confirmDelete.label || confirmDelete.value}"? It will no longer appear in creation dropdowns.`}
                </p>
              )}
              {confirmDelete.type === 'type' && (
                <p>
                  {language === 'ar'
                    ? `هل أنت متأكد من مسح نوع المنتج "${confirmDelete.label || confirmDelete.value}"؟ لن يظهر هذا النوع في القوائم المنسدلة.`
                    : `Are you sure you want to delete product type "${confirmDelete.label || confirmDelete.value}"?`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete.type === 'category') {
                    onRemoveCategory(confirmDelete.value);
                  } else if (confirmDelete.type === 'status') {
                    onRemoveStatus(confirmDelete.value);
                  } else if (confirmDelete.type === 'type' && onRemoveType) {
                    onRemoveType(confirmDelete.value);
                  }
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تأكيد المسح' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
