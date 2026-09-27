import { useState, useEffect, useCallback } from 'react';

export interface CurrencyDefinition {
  code: string;
  symbolEn: string;
  symbolAr: string;
  nameEn: string;
  nameAr: string;
  countryEn: string;
  countryAr: string;
}

export const ARAB_AND_USD_CURRENCIES: CurrencyDefinition[] = [
  {
    code: 'USD',
    symbolEn: '$',
    symbolAr: '$',
    nameEn: 'US Dollar',
    nameAr: 'دولار أمريكي',
    countryEn: 'United States / Global',
    countryAr: 'عالمي / الولايات المتحدة'
  },
  {
    code: 'EGP',
    symbolEn: 'EGP',
    symbolAr: 'ج.م',
    nameEn: 'Egyptian Pound',
    nameAr: 'جنيه مصري',
    countryEn: 'Egypt',
    countryAr: 'مصر'
  },
  {
    code: 'SAR',
    symbolEn: 'SAR',
    symbolAr: 'ر.س',
    nameEn: 'Saudi Riyal',
    nameAr: 'ريال سعودي',
    countryEn: 'Saudi Arabia',
    countryAr: 'المملكة العربية السعودية'
  },
  {
    code: 'AED',
    symbolEn: 'AED',
    symbolAr: 'د.إ',
    nameEn: 'UAE Dirham',
    nameAr: 'درهم إماراتي',
    countryEn: 'United Arab Emirates',
    countryAr: 'الإمارات العربية المتحدة'
  },
  {
    code: 'KWD',
    symbolEn: 'KWD',
    symbolAr: 'د.ك',
    nameEn: 'Kuwaiti Dinar',
    nameAr: 'دينار كويتي',
    countryEn: 'Kuwait',
    countryAr: 'الكويت'
  },
  {
    code: 'QAR',
    symbolEn: 'QAR',
    symbolAr: 'ر.ق',
    nameEn: 'Qatari Riyal',
    nameAr: 'ريال قطري',
    countryEn: 'Qatar',
    countryAr: 'قطر'
  },
  {
    code: 'BHD',
    symbolEn: 'BHD',
    symbolAr: 'د.ب',
    nameEn: 'Bahraini Dinar',
    nameAr: 'دينار بحريني',
    countryEn: 'Bahrain',
    countryAr: 'البحرين'
  },
  {
    code: 'OMR',
    symbolEn: 'OMR',
    symbolAr: 'ر.ع',
    nameEn: 'Omani Rial',
    nameAr: 'ريال عماني',
    countryEn: 'Oman',
    countryAr: 'سلطنة عمان'
  },
  {
    code: 'JOD',
    symbolEn: 'JOD',
    symbolAr: 'د.أ',
    nameEn: 'Jordanian Dinar',
    nameAr: 'دينار أردني',
    countryEn: 'Jordan',
    countryAr: 'الأردن'
  },
  {
    code: 'IQD',
    symbolEn: 'IQD',
    symbolAr: 'د.ع',
    nameEn: 'Iraqi Dinar',
    nameAr: 'دينار عراقي',
    countryEn: 'Iraq',
    countryAr: 'العراق'
  },
  {
    code: 'MAD',
    symbolEn: 'MAD',
    symbolAr: 'د.م',
    nameEn: 'Moroccan Dirham',
    nameAr: 'درهم مغربي',
    countryEn: 'Morocco',
    countryAr: 'المغرب'
  },
  {
    code: 'DZD',
    symbolEn: 'DZD',
    symbolAr: 'د.ج',
    nameEn: 'Algerian Dinar',
    nameAr: 'دينار جزائري',
    countryEn: 'Algeria',
    countryAr: 'الجزائر'
  },
  {
    code: 'TND',
    symbolEn: 'TND',
    symbolAr: 'د.ت',
    nameEn: 'Tunisian Dinar',
    nameAr: 'دينار تونسي',
    countryEn: 'Tunisia',
    countryAr: 'تونس'
  },
  {
    code: 'LYD',
    symbolEn: 'LYD',
    symbolAr: 'د.ل',
    nameEn: 'Libyan Dinar',
    nameAr: 'دينار ليبي',
    countryEn: 'Libya',
    countryAr: 'ليبيا'
  },
  {
    code: 'LBP',
    symbolEn: 'LBP',
    symbolAr: 'ل.ل',
    nameEn: 'Lebanese Pound',
    nameAr: 'ليرة لبنانية',
    countryEn: 'Lebanon',
    countryAr: 'لبنان'
  },
  {
    code: 'SDG',
    symbolEn: 'SDG',
    symbolAr: 'ج.س',
    nameEn: 'Sudanese Pound',
    nameAr: 'جنيه سوداني',
    countryEn: 'Sudan',
    countryAr: 'السودان'
  },
  {
    code: 'YER',
    symbolEn: 'YER',
    symbolAr: 'ر.ي',
    nameEn: 'Yemeni Rial',
    nameAr: 'ريال يمني',
    countryEn: 'Yemen',
    countryAr: 'اليمن'
  },
  {
    code: 'SYP',
    symbolEn: 'SYP',
    symbolAr: 'ل.س',
    nameEn: 'Syrian Pound',
    nameAr: 'ليرة سورية',
    countryEn: 'Syria',
    countryAr: 'سوريا'
  },
  {
    code: 'MRU',
    symbolEn: 'MRU',
    symbolAr: 'أ.م',
    nameEn: 'Mauritanian Ouguiya',
    nameAr: 'أوقية موريتانية',
    countryEn: 'Mauritania',
    countryAr: 'موريتانيا'
  },
  {
    code: 'SOS',
    symbolEn: 'SOS',
    symbolAr: 'ش.ص',
    nameEn: 'Somali Shilling',
    nameAr: 'شلن صومالي',
    countryEn: 'Somalia',
    countryAr: 'الصومال'
  },
  {
    code: 'DJF',
    symbolEn: 'DJF',
    symbolAr: 'ف.ج',
    nameEn: 'Djiboutian Franc',
    nameAr: 'فرنك جيبوتي',
    countryEn: 'Djibouti',
    countryAr: 'جيبوتي'
  },
  {
    code: 'KMF',
    symbolEn: 'KMF',
    symbolAr: 'ف.ق',
    nameEn: 'Comorian Franc',
    nameAr: 'فرنك قمري',
    countryEn: 'Comoros',
    countryAr: 'جزر القمر'
  },
  {
    code: 'EUR',
    symbolEn: '€',
    symbolAr: '€',
    nameEn: 'Euro',
    nameAr: 'يورو أوروبي',
    countryEn: 'European Union',
    countryAr: 'الاتحاد الأوروبي'
  },
  {
    code: 'GBP',
    symbolEn: '£',
    symbolAr: '£',
    nameEn: 'British Pound',
    nameAr: 'جنيه إسترليني',
    countryEn: 'United Kingdom',
    countryAr: 'المملكة المتحدة'
  },
  {
    code: 'TRY',
    symbolEn: '₺',
    symbolAr: '₺',
    nameEn: 'Turkish Lira',
    nameAr: 'ليرة تركية',
    countryEn: 'Turkey',
    countryAr: 'تركيا'
  }
];

export function getCurrencyInfo(code?: string): CurrencyDefinition {
  const cleanCode = (code || 'USD').toUpperCase().trim();
  const match = ARAB_AND_USD_CURRENCIES.find(c => c.code === cleanCode);
  if (match) return match;
  return {
    code: cleanCode,
    symbolEn: cleanCode,
    symbolAr: cleanCode,
    nameEn: cleanCode,
    nameAr: cleanCode,
    countryEn: 'Global',
    countryAr: 'دولي'
  };
}

export function formatPrice(
  amount: number,
  currencyCode: string = 'USD',
  language: 'ar' | 'en' = 'en'
): string {
  const info = getCurrencyInfo(currencyCode);
  const formattedAmount = Number(amount || 0).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  if (language === 'ar') {
    return `${formattedAmount} ${info.symbolAr}`;
  } else {
    if (info.symbolEn === '$') {
      return `$${formattedAmount}`;
    }
    return `${formattedAmount} ${info.symbolEn}`;
  }
}

/**
 * Baseline fallback approximate rates to 1 USD
 */
export const APPROXIMATE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EGP: 51.68,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.307,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.384,
  JOD: 0.709,
  IQD: 1310,
  DZD: 133.5,
  MAD: 9.85,
  TND: 3.12,
  LYD: 4.86,
  LBP: 89500,
  SDG: 601,
  YER: 250,
  SYP: 13000,
  MRU: 39.8,
  SOS: 571,
  DJF: 178,
  KMF: 453,
  EUR: 0.92,
  GBP: 0.79,
  TRY: 36.4
};

// Global in-memory cache for live rates
let inMemoryLiveRates: Record<string, number> = { ...APPROXIMATE_RATES_TO_USD };
let lastFetchedTimestamp: number = 0;
let isLiveActive: boolean = false;

// Storage keys
const STORAGE_RATES_KEY = 'app_live_exchange_rates_usd';
const STORAGE_TIME_KEY = 'app_live_exchange_rates_time';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

// Initialize from localStorage if available
try {
  const saved = localStorage.getItem(STORAGE_RATES_KEY);
  const savedTime = localStorage.getItem(STORAGE_TIME_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (typeof parsed === 'object' && parsed !== null) {
      inMemoryLiveRates = { ...APPROXIMATE_RATES_TO_USD, ...parsed };
      if (savedTime) {
        lastFetchedTimestamp = Number(savedTime) || 0;
        if (Date.now() - lastFetchedTimestamp < CACHE_TTL_MS) {
          isLiveActive = true;
        }
      }
    }
  }
} catch {}

type RateUpdateListener = (rates: Record<string, number>, isLive: boolean) => void;
const listeners = new Set<RateUpdateListener>();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn(inMemoryLiveRates, isLiveActive);
    } catch {}
  });
}

/**
 * Fetches real-time exchange rates against USD from fast, reliable open banking APIs
 */
export async function fetchLiveExchangeRates(forceRefresh: boolean = false): Promise<{
  rates: Record<string, number>;
  isLive: boolean;
  timestamp: number;
}> {
  const now = Date.now();
  // Return cached if fresh and not forced
  if (!forceRefresh && isLiveActive && (now - lastFetchedTimestamp < CACHE_TTL_MS)) {
    return {
      rates: inMemoryLiveRates,
      isLive: true,
      timestamp: lastFetchedTimestamp
    };
  }

  // 1. Try Primary Open API (open.er-api.com)
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.rates && typeof data.rates === 'object') {
        inMemoryLiveRates = { ...APPROXIMATE_RATES_TO_USD, ...data.rates };
        lastFetchedTimestamp = now;
        isLiveActive = true;
        try {
          localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(inMemoryLiveRates));
          localStorage.setItem(STORAGE_TIME_KEY, String(now));
        } catch {}
        notifyListeners();
        return { rates: inMemoryLiveRates, isLive: true, timestamp: now };
      }
    }
  } catch (primaryErr) {
    console.warn('Primary exchange rate API failed, trying fallback:', primaryErr);
  }

  // 2. Try Secondary Fallback API (api.exchangerate-api.com)
  try {
    const fallbackRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data && data.rates && typeof data.rates === 'object') {
        inMemoryLiveRates = { ...APPROXIMATE_RATES_TO_USD, ...data.rates };
        lastFetchedTimestamp = now;
        isLiveActive = true;
        try {
          localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(inMemoryLiveRates));
          localStorage.setItem(STORAGE_TIME_KEY, String(now));
        } catch {}
        notifyListeners();
        return { rates: inMemoryLiveRates, isLive: true, timestamp: now };
      }
    }
  } catch (secErr) {
    console.warn('Secondary exchange rate API failed:', secErr);
  }

  // 3. Fallback to cached or approximate rates
  notifyListeners();
  return {
    rates: inMemoryLiveRates,
    isLive: isLiveActive,
    timestamp: lastFetchedTimestamp || now
  };
}

// Automatically trigger live fetch in the background on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchLiveExchangeRates().catch(() => {});
  }, 100);
}

/**
 * Returns the current exchange rate from baseCurrency to targetCurrency
 */
export function getExchangeRate(
  targetCurrency: string = 'USD',
  baseCurrency: string = 'USD',
  customEgpRate?: number
): number {
  const target = targetCurrency.toUpperCase().trim();
  const base = baseCurrency.toUpperCase().trim();

  // If same currency
  if (target === base) return 1;

  const rates = inMemoryLiveRates;
  let targetRateToUsd = rates[target] || APPROXIMATE_RATES_TO_USD[target] || 1;
  let baseRateToUsd = rates[base] || APPROXIMATE_RATES_TO_USD[base] || 1;

  // Custom EGP override if provided
  if (customEgpRate && customEgpRate > 0) {
    if (target === 'EGP') targetRateToUsd = customEgpRate;
    if (base === 'EGP') baseRateToUsd = customEgpRate;
  }

  if (base === 'USD') {
    return targetRateToUsd;
  }

  return targetRateToUsd / baseRateToUsd;
}

/**
 * Converts an amount from one currency to another using real-time rates
 */
export function convertCurrency(
  amount: number,
  targetCurrency: string,
  customEgpRate?: number,
  baseCurrency: string = 'USD'
): number {
  if (isNaN(amount) || amount === 0) return 0;
  const rate = getExchangeRate(targetCurrency, baseCurrency, customEgpRate);
  return amount * rate;
}

/**
 * Calculates a cart item's converted total into targetCurrency
 */
export function calculateCartItemTotal(
  item: { product: { price: number; currency?: string }; quantity: number },
  targetCurrency: string,
  customEgpRate?: number
): number {
  const itemCurrency = item.product?.currency || 'USD';
  const itemTotal = (item.product?.price || 0) * (item.quantity || 1);
  return convertCurrency(itemTotal, targetCurrency, customEgpRate, itemCurrency);
}

/**
 * Calculates total across all items in cart accurately converted into targetCurrency
 */
export function calculateCartGrandTotal(
  cart: Array<{ product: { price: number; currency?: string }; quantity: number }>,
  targetCurrency: string,
  customEgpRate?: number
): number {
  if (!cart || cart.length === 0) return 0;
  return cart.reduce((sum, item) => {
    return sum + calculateCartItemTotal(item, targetCurrency, customEgpRate);
  }, 0);
}

/**
 * React Hook for components to access and react to live exchange rates
 */
export function useLiveExchangeRates() {
  const [rates, setRates] = useState<Record<string, number>>(() => inMemoryLiveRates);
  const [isLive, setIsLive] = useState<boolean>(() => isLiveActive);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() =>
    lastFetchedTimestamp ? new Date(lastFetchedTimestamp) : null
  );

  const refreshRates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLiveExchangeRates(true);
      setRates(result.rates);
      setIsLive(result.isLive);
      setLastUpdated(new Date(result.timestamp));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch if not fresh
    if (!isLiveActive || Date.now() - lastFetchedTimestamp > CACHE_TTL_MS) {
      refreshRates();
    }

    const listener: RateUpdateListener = (newRates, liveStatus) => {
      setRates({ ...newRates });
      setIsLive(liveStatus);
      setLastUpdated(lastFetchedTimestamp ? new Date(lastFetchedTimestamp) : new Date());
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [refreshRates]);

  const convert = useCallback(
    (amount: number, target: string, base: string = 'USD', customEgpRate?: number) => {
      if (isNaN(amount) || amount === 0) return 0;
      const t = target.toUpperCase().trim();
      const b = base.toUpperCase().trim();
      if (t === b) return amount;

      let tRate = rates[t] || APPROXIMATE_RATES_TO_USD[t] || 1;
      let bRate = rates[b] || APPROXIMATE_RATES_TO_USD[b] || 1;

      if (customEgpRate && customEgpRate > 0) {
        if (t === 'EGP') tRate = customEgpRate;
        if (b === 'EGP') bRate = customEgpRate;
      }

      const rate = b === 'USD' ? tRate : tRate / bRate;
      return amount * rate;
    },
    [rates]
  );

  const getRate = useCallback(
    (target: string, base: string = 'USD', customEgpRate?: number) => {
      return getExchangeRate(target, base, customEgpRate);
    },
    []
  );

  return {
    rates,
    isLive,
    loading,
    lastUpdated,
    refreshRates,
    convert,
    getRate,
    egpRate: rates['EGP'] || APPROXIMATE_RATES_TO_USD['EGP'] || 51.68
  };
}
