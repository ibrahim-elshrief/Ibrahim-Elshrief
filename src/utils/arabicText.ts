/**
 * Arabic Text Formatting & Classical Orthography Utilities
 * 
 * Implements standard Classical Arabic orthographic rules:
 * 1. Tanween al-Fath on Alif: In standard Arabic rules, Tanween (ً)
 *    is placed on the letter BEFORE the Alif (e.g., كتابًا, not كتاباً).
 * 2. Purifying text from colloquial phrasing (e.g., 'شغال' -> 'مُفَعَّل' / 'نَشِط',
 *    'علطول' -> 'مباشرةً', 'جاري' -> 'جارٍ').
 */

/**
 * Ensures Tanween al-Fath followed by Alif is rendered on the letter preceding the Alif.
 * Example: كتاباً -> كتابًا, تلقائياً -> تلقائيًّا, يدوياً -> يدويًّا
 */
export function fixArabicTanween(text: string): string {
  if (!text || typeof text !== 'string') return text || '';

  // 1. Move tanween from Alif to the preceding letter:
  // Matches any Arabic letter (\u0621-\u064A) followed by optional Shaddah (\u0651), then Alif (\u0627), then Tanween Fath (\u064B)
  const tanweenOnAlifRegex = /([\u0621-\u064A])([\u0651]?)\u0627\u064B/gu;
  let formatted = text.replace(tanweenOnAlifRegex, '$1$2\u064B\u0627');

  // 2. Common adverbs where Tanween may have been omitted or spelled colloquially
  const dictionaryFixes: [RegExp, string][] = [
    [/\bتلقائيا\b/gu, 'تلقائيًّا'],
    [/\bيدويا\b/gu, 'يدويًّا'],
    [/\bنهائيا\b/gu, 'نهائيًّا'],
    [/\bحاليا\b/gu, 'حاليًّا'],
    [/\bكاملا\b/gu, 'كاملًا'],
    [/\bدائما\b/gu, 'دائمًا'],
    [/\bأيضا\b/gu, 'أيضًا'],
    [/\bفورا\b/gu, 'فورًا'],
    [/\bشكرا\b/gu, 'شكرًا'],
    [/\bمرحبا\b/gu, 'مرحبًا'],
    [/\bأهلا\b/gu, 'أهلًا'],
    [/\bسهلا\b/gu, 'سهلًا'],
    [/\bسابقا\b/gu, 'سابقًا'],
    [/\bلاحقا\b/gu, 'لاحقًا'],
    [/\bجزءا\b/gu, 'جزءًا']
  ];

  for (const [pattern, replacement] of dictionaryFixes) {
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted;
}

/**
 * Replaces colloquial terms with elegant, precise Classical Arabic
 */
export function toClassicalArabic(text: string): string {
  if (!text || typeof text !== 'string') return text || '';

  const vocabularyReplacements: [RegExp, string][] = [
    // Dialectal status words
    [/\bشغال ونشط\b/gu, 'مُفَعَّل ونَشِط'],
    [/\bشغال\b/gu, 'مُفَعَّل'],
    [/\bمش شغال\b/gu, 'مُعَطَّل'],
    [/\bمعطّل حالياً\b/gu, 'مُعَطَّل حاليًّا'],
    [/\bمعطل حاليا\b/gu, 'مُعَطَّل حاليًّا'],
    [/\bعلطول\b/gu, 'مباشرةً'],
    [/\bجاري الحفظ\b/gu, 'جارٍ الحفظ'],
    [/\bجاري التحميل\b/gu, 'جارٍ التحميل'],
    [/\bجاري المعالجة\b/gu, 'جارٍ المعالجة'],
    [/\bجاري الإرسال\b/gu, 'جارٍ الإرسال'],
    [/\bجاري\b/gu, 'جارٍ']
  ];

  let result = text;
  for (const [pattern, replacement] of vocabularyReplacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Formats Arabic text to strict Classical Arabic standards with proper Tanween
 */
export function formatArabicText(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return fixArabicTanween(toClassicalArabic(text));
}

/**
 * Returns classical Arabic ordinal label for sequencing items (0 = First, 1 = Second, etc.)
 */
export function getArabicOrdinal(index: number): { titleAr: string; descAr: string } {
  switch (index) {
    case 0:
      return {
        titleAr: 'الأول (الأحدث نشرًا)',
        descAr: 'يجلب أحدث إصدار أو محتوى تم نشره مباشرةً'
      };
    case 1:
      return {
        titleAr: 'الثاني (السابق للأحدث مباشرةً)',
        descAr: 'يجلب الإصدار الذي يسبق أحدث عنصر فورًا'
      };
    case 2:
      return {
        titleAr: 'الثالث (السابق للثاني)',
        descAr: 'يجلب الإصدار الثالث في ترتيب تاريخ النشر'
      };
    case 3:
      return {
        titleAr: 'الرابع في التسلسل',
        descAr: 'يجلب الإصدار الرابع في الترتيب الزمني'
      };
    case 4:
      return {
        titleAr: 'الخامس في التسلسل',
        descAr: 'يجلب الإصدار الخامس في الترتيب الزمني'
      };
    default:
      return {
        titleAr: `الرقم #${index + 1} في التسلسل`,
        descAr: `يجلب العنصر رقم ${index + 1} وفق تاريخ النشر`
      };
  }
}
