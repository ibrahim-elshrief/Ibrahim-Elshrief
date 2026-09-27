import React from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Archive, 
  RotateCcw, 
  X, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface AdminBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  currentTab: 'active' | 'archived';
  onMoveToArchive?: () => void;
  onRestoreSelected?: () => void;
  onPermanentDeleteSelected?: () => void;
  itemLabelAr: string;
  itemLabelEn: string;
  isProcessing?: boolean;
}

export const AdminBulkActionBar: React.FC<AdminBulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onDeselectAll,
  onSelectAll,
  isAllSelected,
  currentTab,
  onMoveToArchive,
  onRestoreSelected,
  onPermanentDeleteSelected,
  itemLabelAr,
  itemLabelEn,
  isProcessing = false
}) => {
  const { language } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-2xl w-full animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 dark:bg-[#15171e]/95 backdrop-blur-md text-white border border-slate-700/80 dark:border-slate-700 shadow-2xl rounded-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Selection Count and Select All */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
              {selectedCount}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              {language === 'ar' 
                ? `تم تحديد ${selectedCount} ${itemLabelAr}` 
                : `${selectedCount} ${itemLabelEn} selected`}
            </span>
          </div>

          <button
            type="button"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="text-xs text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
          >
            {isAllSelected 
              ? (language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect all') 
              : (language === 'ar' ? `تحديد الكل (${totalCount})` : `Select all (${totalCount})`)}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Move to Archive (Available when provided, typically in active view) */}
          {onMoveToArchive && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onMoveToArchive}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              title={language === 'ar' ? 'نقل العناصر المحددة إلى الأرشيف (حفظ آمن)' : 'Move selected to archive'}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>{language === 'ar' ? 'نقل للأرشيف' : 'Archive'}</span>
            </button>
          )}

          {/* Restore Selected (Available when provided, typically in archived view) */}
          {onRestoreSelected && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onRestoreSelected}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              title={language === 'ar' ? 'استرجاع العناصر المحددة للوضع النشط' : 'Restore selected'}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>{language === 'ar' ? 'استرجاع المحدد' : 'Restore'}</span>
            </button>
          )}

          {/* Permanently Delete Selected (Available in both active and archived views) */}
          {onPermanentDeleteSelected && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={onPermanentDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              title={language === 'ar' ? 'حذف نهائي للعناصر المحددة من قاعدة البيانات' : 'Permanently delete selected from database'}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{language === 'ar' ? 'حذف نهائي' : 'Permanently Delete'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDeselectAll}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title={language === 'ar' ? 'إلغاء التحديد' : 'Dismiss'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
