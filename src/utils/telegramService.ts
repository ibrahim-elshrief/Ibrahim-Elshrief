import { Order, ContactMessage, ProductItem, SiteSettings } from '../types';
import { formatPrice } from './currencies';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface TelegramDigestData {
  orders?: Order[];
  messages?: ContactMessage[];
  products?: ProductItem[];
  subscribersCount?: number;
  newSubscribersToday?: number;
  siteSettings?: SiteSettings;
  isInstantManual?: boolean;
}

/**
 * Escapes special HTML characters so Telegram HTML parse_mode doesn't fail
 */
export const escapeTelegramHtml = (text: string = ''): string => {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Retrieves stored Telegram bot token & chat ID across settings, systemConfig, or localStorage
 */
export const getStoredTelegramCredentials = async (
  settings?: SiteSettings
): Promise<{ botToken: string; chatId: string }> => {
  let botToken = settings?.telegramBotToken?.trim() || '';
  let chatId = settings?.telegramChatId?.trim() || '';

  // 1. Check local storage cache
  if (!botToken || !chatId) {
    try {
      const cachedToken = localStorage.getItem('cached_telegram_bot_token');
      const cachedChat = localStorage.getItem('cached_telegram_chat_id');
      if (cachedToken && !botToken) botToken = cachedToken.trim();
      if (cachedChat && !chatId) chatId = cachedChat.trim();
    } catch {}
  }

  // 2. Check systemConfig/ownerSecurityChannels
  if (!botToken || !chatId) {
    try {
      const secSnap = await getDoc(doc(db, 'systemConfig', 'ownerSecurityChannels'));
      if (secSnap.exists()) {
        const secData = secSnap.data();
        if (secData.telegramBotToken && !botToken) botToken = secData.telegramBotToken.trim();
        if (secData.telegramChatId && !chatId) chatId = secData.telegramChatId.trim();
      }
    } catch {}
  }

  // 3. Check siteSettings/global
  if (!botToken || !chatId) {
    try {
      const sSnap = await getDoc(doc(db, 'siteSettings', 'global'));
      if (sSnap.exists()) {
        const sData = sSnap.data();
        if (sData.telegramBotToken && !botToken) botToken = sData.telegramBotToken.trim();
        if (sData.telegramChatId && !chatId) chatId = sData.telegramChatId.trim();
      }
    } catch {}
  }

  return { botToken, chatId };
};

/**
 * Sends a message via Telegram Bot API
 */
export const sendTelegramMessage = async (
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'رمز البوت (Bot Token) ومعرّف المحادثة (Chat ID) مطلوبان للربط مع تيليجرام.'
    };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();

    if (result.ok) {
      return {
        success: true,
        message: 'تم إرسال التنبيه بنجاح إلى حساب التيليجرام الخاص بك!'
      };
    } else {
      return {
        success: false,
        message: result.description || 'فشل إرسال الرسالة عبر تيليجرام. تحقق من صحة الرمز والمعرف.'
      };
    }
  } catch (error: any) {
    console.error('Telegram send error:', error);
    return {
      success: false,
      message: error?.message || 'تعذر الاتصال بخوادم تيليجرام. يرجى التحقق من اتصال الإنترنت.'
    };
  }
};

/**
 * Converts a base64 data URL into a binary Blob for Telegram multipart/form-data upload
 */
export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch (err) {
    console.error('Error converting dataUrl to Blob:', err);
    return null;
  }
};

/**
 * Sends a photo to Telegram Bot API with optional caption (Base64 data URL or external URL)
 */
export const sendTelegramPhoto = async (
  botToken: string,
  chatId: string,
  photoSource: string,
  caption?: string,
  fileName: string = 'receipt.jpg'
): Promise<{ success: boolean; message: string; data?: any }> => {
  if (!botToken || !chatId || !photoSource) {
    return {
      success: false,
      message: 'بيانات غير كافية لإرسال الصورة عبر تيليجرام.'
    };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendPhoto`;

    const formData = new FormData();
    formData.append('chat_id', cleanChatId);

    if (caption) {
      // Telegram sendPhoto caption has a hard limit of 1024 characters
      const trimmedCaption = caption.length > 1024 ? caption.slice(0, 1020) + '...' : caption;
      formData.append('caption', trimmedCaption);
      formData.append('parse_mode', 'HTML');
    }

    if (photoSource.startsWith('data:')) {
      const blob = dataUrlToBlob(photoSource);
      if (!blob) {
        throw new Error('فشل معالجة بيانات صورة الإيصال (Base64).');
      }
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const cleanFileName = fileName.endsWith(ext) ? fileName : `${fileName}.${ext}`;
      formData.append('photo', blob, cleanFileName);
    } else {
      formData.append('photo', photoSource.trim());
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.ok) {
      return {
        success: true,
        message: 'تم إرسال صورة الإيصال بنجاح عبر تيليجرام.',
        data: result
      };
    } else {
      return {
        success: false,
        message: result.description || 'فشل إرسال الصورة عبر تيليجرام.'
      };
    }
  } catch (error: any) {
    console.error('Telegram sendPhoto error:', error);
    return {
      success: false,
      message: error?.message || 'تعذر إرسال الصورة إلى تيليجرام.'
    };
  }
};

/**
 * Builds an explicit, high-clarity purchase notification for Telegram
 */
export const buildOrderTelegramMessage = (
  order: Order,
  settings?: SiteSettings
): string => {
  const brandName = settings?.brandNameAr || 'منصة المتجر والمنشورات';
  const currency = order.currency || settings?.currency || 'USD';
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('ar-EG', {
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const safeCustomerName = escapeTelegramHtml(order.customerName || 'عميل المتجر');
  const safeCustomerEmail = escapeTelegramHtml(order.customerEmail || '');
  const safeCustomerPhone = escapeTelegramHtml(order.customerPhone || 'غير مسجل');
  const safeOrderNumber = escapeTelegramHtml(order.orderNumber || '');
  const safeMethod = escapeTelegramHtml(order.paymentMethodTitle || order.paymentMethod || 'محافظ إلكترونية');

  let text = `🎉 <b>إشعار عملية شراء ودفع جديدة مؤكدة!</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏛️ <b>${escapeTelegramHtml(brandName)}</b>\n`;
  text += `⏱️ <b>التوقيت:</b> <i>${dateStr}</i>\n\n`;

  text += `📋 <b>رقم الطلب:</b> <code>#${safeOrderNumber}</code>\n`;
  text += `💰 <b>المبلغ الإجمالي:</b> <b>${formatPrice(order.total, currency, 'ar')}</b>`;
  if (order.convertedAmount) {
    text += ` <i>(${escapeTelegramHtml(order.convertedAmount)})</i>`;
  }
  text += `\n`;

  text += `💳 <b>طريقة السداد:</b> <b>${safeMethod}</b>\n`;
  text += `🟢 <b>حالة الدفع:</b> <b>تم الدفع والتحويل بنجاح (Paid) ✅</b>\n`;

  if (order.transferFrom) {
    text += `📱 <b>المحول منه / المحفظة:</b> <code>${escapeTelegramHtml(order.transferFrom)}</code>\n`;
  }
  if (order.transferDate) {
    text += `🕒 <b>تاريخ ووقت التحويل:</b> <code>${escapeTelegramHtml(order.transferDate)}</code>\n`;
  }
  if (order.receiptUrl) {
    text += `📎 <b>إيصال التحويل:</b> <i>مرفق في تفاصيل الطلب باللوحة</i>\n`;
  }

  text += `\n👤 <b>بيانات المشتري:</b>\n`;
  text += `• الاسم: <b>${safeCustomerName}</b>\n`;
  text += `• البريد: <code>${safeCustomerEmail}</code>\n`;
  text += `• الهاتف / واتساب: <code>${safeCustomerPhone}</code>\n`;

  if (order.shippingAddress) {
    text += `📍 <b>عنوان الشحن:</b> ${escapeTelegramHtml(order.shippingAddress)}\n`;
  }

  text += `\n📦 <b>قائمة المنتجات المشتراة (${order.items?.length || 0}):</b>\n`;
  (order.items || []).forEach((item, idx) => {
    const itemName = escapeTelegramHtml(item.productNameAr || item.productNameEn || 'منتج');
    const itemType = item.type === 'digital' ? 'ملف رقمي 📥' : 'كتاب مطبوع / مادي 📚';
    const itemPrice = formatPrice(item.price * item.quantity, currency, 'ar');
    text += ` ${idx + 1}. <b>${itemName}</b> × ${item.quantity} [${itemPrice}] (${itemType})\n`;
  });

  if (order.notes) {
    text += `\n📝 <b>ملاحظات العميل:</b>\n<i>${escapeTelegramHtml(order.notes)}</i>\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚙️ <i>تم خصم الكميات من المخزن وتسجيل الطلب في إشعارات الموقع ولوحة التحكم آلياً.</i>`;

  return text;
};

/**
 * Sends real-time purchase notification to the configured Telegram bot, including transfer receipt photo if attached
 */
export const sendOrderTelegramNotification = async (
  order: Order,
  settings?: SiteSettings
): Promise<{ success: boolean; message: string }> => {
  try {
    const { botToken, chatId } = await getStoredTelegramCredentials(settings);

    if (!botToken || !chatId) {
      console.warn('Telegram bot credentials not configured. Order placed but Telegram notification skipped.');
      return {
        success: false,
        message: 'لم يتم ربط بوت تيليجرام بعد في الإعدادات.'
      };
    }

    const text = buildOrderTelegramMessage(order, settings);

    // If order has a receipt image (screenshot / camera capture / uploaded base64 data URL or image link)
    if (order.receiptUrl && order.receiptUrl.trim()) {
      try {
        const canFitFullCaption = text.length <= 1020;

        if (canFitFullCaption) {
          const photoRes = await sendTelegramPhoto(
            botToken,
            chatId,
            order.receiptUrl,
            text,
            `receipt_order_${order.orderNumber}.jpg`
          );
          if (photoRes.success) {
            return {
              success: true,
              message: 'تم إرسال إشعار الشراء مع صورة إيصال التحويل بنجاح إلى تيليجرام!'
            };
          }
        } else {
          // Send photo with clear header summary caption, followed by the complete order message
          const photoCaption = `📎 <b>صورة إيصال التحويل المرفق للطلب #${escapeTelegramHtml(order.orderNumber)}</b>\n` +
            `💰 <b>المبلغ الإجمالي:</b> <b>${formatPrice(order.total, order.currency || settings?.currency || 'USD', 'ar')}</b>\n` +
            `👤 <b>العميل:</b> <b>${escapeTelegramHtml(order.customerName)}</b>\n` +
            (order.transferFrom ? `📱 <b>المحول منه:</b> <code>${escapeTelegramHtml(order.transferFrom)}</code>\n` : '') +
            (order.transferDate ? `🕒 <b>التوقيت:</b> <code>${escapeTelegramHtml(order.transferDate)}</code>\n` : '') +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>تفاصيل المنتجات والعنوان الكامل في الرسالة التالية 👇</i>`;

          const photoRes = await sendTelegramPhoto(
            botToken,
            chatId,
            order.receiptUrl,
            photoCaption,
            `receipt_order_${order.orderNumber}.jpg`
          );

          // Follow with the full detailed message
          const msgRes = await sendTelegramMessage(botToken, chatId, text);
          if (photoRes.success || msgRes.success) {
            return {
              success: true,
              message: 'تم إرسال إشعار الشراء مع صورة إيصال التحويل بنجاح إلى تيليجرام!'
            };
          }
        }
      } catch (photoErr) {
        console.warn('Could not send receipt photo to Telegram, falling back to text message:', photoErr);
      }
    }

    // Standard text message for orders without receipt image or fallback
    return await sendTelegramMessage(botToken, chatId, text);
  } catch (err: any) {
    console.error('Failed to send order telegram alert:', err);
    return {
      success: false,
      message: err?.message || 'حدث خطأ أثناء إرسال إشعار تيليجرام'
    };
  }
};

/**
 * Sends real-time contact inquiry notification to the configured Telegram bot
 */
export const sendContactMessageTelegramNotification = async (
  contactMsg: { name: string; email: string; subject: string; message: string; createdAt: string },
  settings?: SiteSettings
): Promise<{ success: boolean; message: string }> => {
  try {
    const { botToken, chatId } = await getStoredTelegramCredentials(settings);

    if (!botToken || !chatId) {
      return {
        success: false,
        message: 'لم يتم ربط بوت تيليجرام بعد في الإعدادات.'
      };
    }

    let text = `📬 <b>رسالة تواصل واستفسار جديدة!</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>المرسل:</b> ${escapeTelegramHtml(contactMsg.name)}\n`;
    text += `📧 <b>البريد الإلكتروني:</b> ${escapeTelegramHtml(contactMsg.email)}\n`;
    text += `📌 <b>الموضوع:</b> ${escapeTelegramHtml(contactMsg.subject || 'استفسار عام')}\n`;
    text += `🕒 <b>تاريخ الإرسال:</b> ${new Date(contactMsg.createdAt).toLocaleString('ar-EG')}\n\n`;
    text += `💬 <b>نص الرسالة:</b>\n<i>${escapeTelegramHtml(contactMsg.message)}</i>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚙️ <i>تم تسجيل الرسالة في صندوق الوارد وإشعارات لوحة التحكم فوراً.</i>`;

    return await sendTelegramMessage(botToken, chatId, text);
  } catch (err: any) {
    console.warn('Failed to send contact inquiry telegram alert:', err);
    return {
      success: false,
      message: err?.message || 'حدث خطأ أثناء إرسال إشعار تيليجرام'
    };
  }
};

/**
 * Builds an elegant, structured message for Telegram with icons and sections
 */
export const buildTelegramSummaryText = (data: TelegramDigestData): string => {
  const {
    orders = [],
    messages = [],
    products = [],
    subscribersCount = 0,
    newSubscribersToday = 0,
    siteSettings,
    isInstantManual = true
  } = data;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const currency = siteSettings?.currency || 'USD';
  const brandName = siteSettings?.brandNameAr || 'منصة المؤلف والباحث';

  // Calculate today's orders & revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => {
    if (!o || !o.createdAt) return false;
    const orderDate = new Date(o.createdAt);
    return orderDate >= todayStart;
  });

  const todayRevenue = todayOrders
    .filter(o => o.orderStatus === 'paid' || o.orderStatus === 'completed')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const totalRevenueAllTime = orders
    .filter(o => o && (o.orderStatus === 'paid' || o.orderStatus === 'completed'))
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Messages received today
  const todayMessages = messages.filter(m => {
    if (!m || !m.createdAt) return false;
    const msgDate = new Date(m.createdAt);
    return msgDate >= todayStart;
  });

  const unreadMessages = messages.filter(m => m && m.status === 'unread');

  // Low stock check
  const lowStock = products.filter(
    p => p && p.type === 'physical' && p.stock <= (p.lowStockThreshold || 5)
  );

  const headerTitle = isInstantManual
    ? '⚡ <b>ملخص فوري لأحداث المنصة حتى هذه اللحظة</b>'
    : '🌙 <b>التقرير المسائي اليومي الشامل للمنصة</b>';

  let message = `${headerTitle}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏛️ <b>${brandName}</b>\n`;
  message += `📅 <i>${dateStr} - ${timeStr}</i>\n\n`;

  // 1. Sales & Orders Section
  message += `🛒 <b>المتجر والمبيعات:</b>\n`;
  message += `• إجمالي مبيعات اليوم: <b>${formatPrice(todayRevenue, currency, 'ar')}</b>\n`;
  message += `• عدد طلبات اليوم: <b>${todayOrders.length} طلب</b>\n`;
  message += `• إجمالي الطلبات الكلي: <b>${orders.length} طلب</b> (بقيمة: ${formatPrice(totalRevenueAllTime, currency, 'ar')})\n`;

  if (todayOrders.length > 0) {
    const latestOrder = todayOrders[0];
    const customerName = latestOrder.customerName || latestOrder.customerEmail || 'عميل';
    message += `  └ <i>أحدث طلب: ${customerName} (${formatPrice(latestOrder.total, currency, 'ar')})</i>\n`;
  }
  message += `\n`;

  // 2. Inquiries & Messages Section
  message += `💬 <b>رسائل واستفسارات التواصل:</b>\n`;
  message += `• رسائل جديدة واردة اليوم: <b>${todayMessages.length} رسالة</b>\n`;
  message += `• إجمالي الرسائل غير المقروءة: <b>${unreadMessages.length} رسالة</b>\n`;
  if (todayMessages.length > 0) {
    const latestMsg = todayMessages[0];
    message += `  └ <i>من: ${latestMsg.name} (${latestMsg.subject || 'بدون موضوع'})</i>\n`;
  }
  message += `\n`;

  // 3. Subscribers
  message += `📬 <b>النشرة البريدية والمتابعون:</b>\n`;
  message += `• مشتركون جدد اليوم: <b>${newSubscribersToday} مشترِك</b>\n`;
  if (subscribersCount > 0) {
    message += `• إجمالي قاعدة المشتركين: <b>${subscribersCount} مشترك</b>\n`;
  }
  message += `\n`;

  // 4. Inventory Alerts
  if (lowStock.length > 0) {
    message += `⚠️ <b>تنبيهات المخزون للكتب والمؤلفات:</b>\n`;
    lowStock.slice(0, 3).forEach(p => {
      message += `• ${p.nameAr}: متبقي <b>${p.stock} نسخة فقط</b>\n`;
    });
    message += `\n`;
  } else {
    message += `📦 <b>المخزون:</b> جميع الكتب والمطبوعات بمستويات كافية ومستقرة.\n\n`;
  }

  // Footer note
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ <i>تم إرسال هذا التقرير آلياً من لوحة تحكم المنصة.</i>`;

  return message;
};

/**
 * Sends a real-time instant alert when a product stock drops to or below threshold, or reaches 0
 */
export const sendLowStockTelegramAlert = async (
  product: { id: string; nameAr?: string; nameEn?: string; stock: number; lowStockThreshold?: number; sku?: string; type?: string },
  previousStock: number,
  orderNumber?: string,
  settings?: SiteSettings
): Promise<{ success: boolean; message: string }> => {
  try {
    const { botToken, chatId } = await getStoredTelegramCredentials(settings);
    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram credentials not configured' };
    }

    const isOut = product.stock <= 0;
    const prodName = escapeTelegramHtml(product.nameAr || product.nameEn || 'منتج');
    const skuText = product.sku ? ` <code>[${escapeTelegramHtml(product.sku)}]</code>` : '';
    const threshold = product.lowStockThreshold || 5;

    let text = isOut
      ? `🚨 <b>تنبيه عاجل: نفاذ كمية المخزون بالكامل! (Out of Stock)</b>\n`
      : `⚠️ <b>تنبيه استباقي: انخفاض كمية المخزون (قارب على النفاد)</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 <b>المنتج / الكتاب:</b> <b>${prodName}</b>${skuText}\n`;
    text += `📊 <b>الرصيد المتبقي الحالي:</b> <b>${product.stock} نسخة فقط</b>\n`;
    text += `📉 <b>الرصيد السابق قبل البيع:</b> ${previousStock} نسخة\n`;
    text += `🎯 <b>حد الإنذار الأدنى:</b> ${threshold} نسخة\n`;
    if (orderNumber) {
      text += `🛒 <b>سبب الخصم:</b> عملية شراء ناجحة للطلب <code>#${escapeTelegramHtml(orderNumber)}</code>\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += isOut 
      ? `❗ <i>المنتج تم تعليق بيعه مؤقتاً في المتجر كونه نفد. يرجى توريد كميات جديدة من لوحة إدارة المخزون.</i>`
      : `💡 <i>يرجى التنسيق مع جهة الطباعة/التوريد لتزويد المخزن بدفعة جديدة قبل نفاذ الكمية أمام العملاء.</i>`;

    return await sendTelegramMessage(botToken, chatId, text);
  } catch (err: any) {
    console.warn('Low stock telegram alert error:', err);
    return { success: false, message: err?.message || 'Failed to dispatch low stock telegram alert' };
  }
};

/**
 * Sends a consolidated low-stock & out-of-stock report to Telegram
 */
export const sendBulkLowStockTelegramReport = async (
  products: ProductItem[],
  settings?: SiteSettings
): Promise<{ success: boolean; message: string }> => {
  try {
    const { botToken, chatId } = await getStoredTelegramCredentials(settings);
    if (!botToken || !chatId) {
      return { 
        success: false, 
        message: 'يرجى ربط بوت تيليجرام أولاً من إعدادات الأمان أو النظام.' 
      };
    }

    const trackedProducts = (products || []).filter(
      p => p && (p.type === 'physical' || (p.stock !== undefined && p.stock < 999900))
    );
    const outOfStock = trackedProducts.filter(p => p.stock <= 0);
    const lowStock = trackedProducts.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));

    if (outOfStock.length === 0 && lowStock.length === 0) {
      const text = `📦 <b>تقرير المخزون والمستودع:</b>\n\n✅ <b>جميع الكتب والمنتجات بمستويات آمنة وكافية!</b>\nلا توجد أي نواقص أو منتجات قاربت على النفاد حالياً.`;
      return await sendTelegramMessage(botToken, chatId, text);
    }

    let text = `📋 <b>تقرير النواقص ومتابعة المخزن:</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⏱️ <b>تاريخ التقرير:</b> <i>${new Date().toLocaleString('ar-EG')}</i>\n\n`;

    if (outOfStock.length > 0) {
      text += `🚨 <b>منتجات نفدت بالكامل (${outOfStock.length}):</b>\n`;
      outOfStock.forEach((p, idx) => {
        const name = escapeTelegramHtml(p.nameAr || p.nameEn);
        text += ` ${idx + 1}. <b>${name}</b> (الرصيد: <code>0</code> | SKU: <code>${p.sku || '-'}</code>)\n`;
      });
      text += `\n`;
    }

    if (lowStock.length > 0) {
      text += `⚠️ <b>منتجات قاربت على النفاد (${lowStock.length}):</b>\n`;
      lowStock.forEach((p, idx) => {
        const name = escapeTelegramHtml(p.nameAr || p.nameEn);
        text += ` ${idx + 1}. <b>${name}</b> (متبقي: <b>${p.stock}</b> | الحد الأدنى: ${p.lowStockThreshold || 5})\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 <i>يمكنك توريد شحنات جديدة بضغطة زر من تبويب (المخزون) في لوحة التحكم.</i>`;

    return await sendTelegramMessage(botToken, chatId, text);
  } catch (err: any) {
    console.warn('Bulk low stock telegram report error:', err);
    return { success: false, message: err?.message || 'Failed to dispatch report' };
  }
};
