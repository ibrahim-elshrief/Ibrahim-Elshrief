import React, { useState, useRef } from 'react';
import { Bold, Italic, Heading3, List, Quote, Code, Eye, Edit3 } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface RichTextMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  dir?: 'rtl' | 'ltr';
  language?: 'ar' | 'en';
}

export const RichTextMarkdownEditor: React.FC<RichTextMarkdownEditorProps> = ({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  dir = 'rtl',
  language = 'ar'
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || (language === 'ar' ? 'نص منسق' : 'formatted text');
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{language === 'ar' ? 'تحرير' : 'Write'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>{language === 'ar' ? 'معاينة' : 'Preview'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => applyFormat('**', '**')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
            title={language === 'ar' ? 'عريض (Bold)' : 'Bold'}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('*', '*')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            title={language === 'ar' ? 'مائل (Italic)' : 'Italic'}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('### ')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            title={language === 'ar' ? 'عنوان فرعي (H3)' : 'Heading 3'}
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('- ')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            title={language === 'ar' ? 'قائمة نقطية (List)' : 'Bullet List'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('> ')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            title={language === 'ar' ? 'اقتباس فكري (Quote)' : 'Blockquote'}
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('`', '`')}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            title={language === 'ar' ? 'تمييز / كود (Highlight)' : 'Code / Highlight'}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] text-slate-400 ms-auto pe-2">
            Markdown
          </span>
        </div>

        {/* Editor or Preview Pane */}
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            dir={dir}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 text-xs text-slate-900 dark:text-white bg-transparent focus:outline-none resize-y leading-relaxed font-sans"
          />
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white min-h-[90px] rounded-b-xl overflow-y-auto max-h-60" dir={dir}>
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-xs text-slate-500 italic">
                {language === 'ar' ? 'لا يوجد نص للمعاينة بعد...' : 'No content to preview yet...'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
