import { Order, SiteSettings } from '../types';

/**
 * Generates a clean, standalone, high-resolution HTML document for printing and PDF export.
 * Includes complete responsive typography, clean borders, and print media rules.
 */
export function generateInvoiceHTML(
  order: Order,
  settings?: SiteSettings,
  language: 'ar' | 'en' = 'ar'
): string {
  const isAr = language === 'ar';
  const siteTitle = isAr 
    ? (settings?.brandNameAr || settings?.titleAr || 'المتجر الإلكتروني') 
    : (settings?.brandNameEn || settings?.titleEn || 'E-Commerce Store');
  const currency = order.currency || settings?.currency || 'USD';
  const dir = isAr ? 'rtl' : 'ltr';
  const font = isAr 
    ? 'system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const orderDate = new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return isAr ? 'قيد المراجعة' : 'Pending Review';
      case 'paid': return isAr ? 'تم السداد' : 'Paid';
      case 'processing': return isAr ? 'جارٍ التجهيز' : 'Processing';
      case 'shipped': return isAr ? 'تم الشحن' : 'Shipped';
      case 'completed': return isAr ? 'تم التسليم (مكتمل)' : 'Delivered / Completed';
      case 'cancelled': return isAr ? 'ملغى' : 'Cancelled';
      case 'refunded': return isAr ? 'مسترجع' : 'Refunded';
      default: return status;
    }
  };

  const statusText = getStatusLabel(order.orderStatus);

  const itemsRows = (order.items || []).map((item, idx) => {
    const name = isAr ? (item.productNameAr || item.productNameEn) : (item.productNameEn || item.productNameAr);
    const unitPrice = (item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const subtotal = ((item.price || 0) * (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 16px; font-weight: 500; color: #64748b; text-align: center; width: 40px;">${idx + 1}</td>
        <td style="padding: 12px 16px; font-weight: 600; color: #0f172a;">${name}</td>
        <td style="padding: 12px 16px; text-align: center; color: #334155; font-weight: 600;">${item.quantity}</td>
        <td style="padding: 12px 16px; text-align: ${isAr ? 'left' : 'right'}; color: #334155; font-family: monospace;">${unitPrice} ${currency}</td>
        <td style="padding: 12px 16px; text-align: ${isAr ? 'left' : 'right'}; color: #0f172a; font-weight: 700; font-family: monospace;">${subtotal} ${currency}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isAr ? 'فاتورة طلب' : 'Invoice'} #${order.orderNumber} - ${siteTitle}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${font};
      background: #f8fafc;
      color: #0f172a;
      padding: 30px 15px;
      line-height: 1.5;
      font-size: 14px;
    }
    .invoice-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .action-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: gap: 12px;
    }
    .action-btn {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }
    .action-btn:hover {
      background: #047857;
    }
    .action-btn-secondary {
      background: #334155;
    }
    .action-btn-secondary:hover {
      background: #475569;
    }
    .invoice-body {
      padding: 40px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-col h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .info-col p {
      font-size: 13px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #f1f5f9;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 2px solid #cbd5e1;
    }
    .summary-card {
      margin-left: ${isAr ? '0' : 'auto'};
      margin-right: ${isAr ? 'auto' : '0'};
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .summary-row.total {
      border-top: 2px solid #cbd5e1;
      margin-top: 8px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .footer-note {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
      .invoice-container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .invoice-body {
        padding: 15px !important;
      }
    }
  </style>
</head>
<body>

<div class="invoice-container">
  <!-- Top Action bar (hidden on print) -->
  <div class="action-bar">
    <div>
      <strong>${isAr ? 'معاينة الفاتورة الرسمية' : 'Official Invoice Preview'}</strong>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="action-btn" onclick="window.print()">
        🖨️ ${isAr ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}
      </button>
      <button class="action-btn action-btn-secondary" onclick="window.close()">
        ✕ ${isAr ? 'إغلاق' : 'Close'}
      </button>
    </div>
  </div>

  <!-- Printable Body -->
  <div class="invoice-body">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">${siteTitle}</h1>
          <p style="color: #64748b; font-size: 13px;">${isAr ? 'فاتورة شراء وتأكيد طلب رسمي' : 'Official Sales & Fulfillment Invoice'}</p>
          <div style="margin-top: 10px;">
            <span class="badge">${statusText}</span>
          </div>
        </td>
        <td style="vertical-align: top; text-align: ${isAr ? 'left' : 'right'};">
          <p style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">${isAr ? 'رقم الفاتورة' : 'Invoice #'}</p>
          <h2 style="font-size: 20px; font-weight: 800; font-family: monospace; color: #059669; margin-bottom: 8px;">#${order.orderNumber}</h2>
          <p style="font-size: 12px; color: #64748b;">${isAr ? 'تاريخ الإصدار' : 'Issue Date'}:</p>
          <p style="font-weight: 600; color: #1e293b; font-size: 13px;">${orderDate}</p>
        </td>
      </tr>
    </table>

    <div class="info-grid">
      <div class="info-col">
        <h4>${isAr ? 'بيانات المشتري (العميل)' : 'Customer Details'}</h4>
        <p style="font-weight: 700; font-size: 14px; color: #0f172a;">${order.customerName || (isAr ? 'عميل غير مسجل' : 'Anonymous Customer')}</p>
        <p>📧 ${order.customerEmail || '—'}</p>
        ${order.customerPhone ? `<p>📞 <span style="font-family: monospace;">${order.customerPhone}</span></p>` : ''}
      </div>

      <div class="info-col">
        <h4>${isAr ? 'تفاصيل السداد والشحن' : 'Payment & Shipping'}</h4>
        <p><strong>${isAr ? 'طريقة الدفع:' : 'Payment Method:'}</strong> ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH'}</p>
        ${order.shippingCity ? `<p><strong>${isAr ? 'المدينة:' : 'City:'}</strong> ${order.shippingCity}</p>` : ''}
        ${order.shippingAddress ? `<p><strong>${isAr ? 'عنوان الشحن:' : 'Address:'}</strong> ${order.shippingAddress}</p>` : `<p style="color: #059669; font-weight: 600;">${isAr ? 'تسليم منتج رقمي / بدون شحن فيزيائي' : 'Digital Delivery'}</p>`}
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'البند / المنتج' : 'Item Description'}</th>
          <th style="text-align: center; width: 80px;">${isAr ? 'الكمية' : 'Qty'}</th>
          <th style="text-align: ${isAr ? 'left' : 'right'}; width: 130px;">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
          <th style="text-align: ${isAr ? 'left' : 'right'}; width: 140px;">${isAr ? 'المجموع' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Financial Summary -->
    <div style="display: flex; justify-content: ${isAr ? 'flex-start' : 'flex-end'};">
      <div class="summary-card">
        <div class="summary-row">
          <span>${isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
          <span style="font-family: monospace;">${(order.subtotal || order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}</span>
        </div>
        ${order.discount ? `
        <div class="summary-row" style="color: #059669;">
          <span>${isAr ? 'الخصم:' : 'Discount:'}</span>
          <span style="font-family: monospace;">-${order.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}</span>
        </div>` : ''}
        ${order.shipping ? `
        <div class="summary-row">
          <span>${isAr ? 'رسوم الشحن:' : 'Shipping:'}</span>
          <span style="font-family: monospace;">+${order.shipping.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}</span>
        </div>` : ''}
        <div class="summary-row total">
          <span>${isAr ? 'الإجمالي الكلي:' : 'Grand Total:'}</span>
          <span style="color: #059669; font-family: monospace;">${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}</span>
        </div>
        ${order.convertedAmount ? `
        <div class="summary-row" style="margin-top: 6px; font-size: 11px; color: #64748b;">
          <span>${isAr ? 'المقابل بالمحلي:' : 'Converted Amount:'}</span>
          <span style="font-family: monospace; font-weight: 700;">${order.convertedAmount}</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Footer Note & Stamp -->
    <div class="footer-note">
      <p>${isAr ? 'شكراً لتعاملكم معنا. هذه الفاتورة تم توليدها إلكترونياً وتعتبر مستنداً رسمياً صالحاً.' : 'Thank you for your business. This invoice is electronically generated.'}</p>
      <p style="margin-top: 4px; font-family: monospace; font-size: 11px;">Verification ID: ${order.id}</p>
    </div>
  </div>
</div>

<script>
  // Auto trigger print when opened directly
  window.onload = function() {
    try {
      setTimeout(function() {
        window.print();
      }, 350);
    } catch(e) {}
  };
</script>

</body>
</html>`;
}

/**
 * Triggers reliable invoice printing or opens a clean standalone printable invoice.
 * Works inside and outside iframes!
 */
export function printInvoiceDirect(
  order: Order,
  language: 'ar' | 'en' = 'ar',
  settings?: SiteSettings
): void {
  const invoiceHtml = generateInvoiceHTML(order, settings, language);

  // Method 1: Try opening clean popup/tab (works 100% cleanly without iframe sandbox blocks)
  try {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(invoiceHtml);
      printWin.document.close();
      printWin.focus();
      return;
    }
  } catch (winErr) {
    console.warn('Popup blocked, attempting iframe print fallback:', winErr);
  }

  // Method 2: Hidden iframe printing fallback
  try {
    const frameId = 'applet-invoice-print-frame';
    const oldFrame = document.getElementById(frameId);
    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(invoiceHtml);
    iframe.contentDocument?.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr) {
        console.warn('Iframe print error, falling back to window.print():', printErr);
        window.print();
      }
    }, 450);
  } catch (err) {
    console.error('All printing attempts encountered an error:', err);
    window.print();
  }
}

/**
 * Direct file download of the printable HTML invoice
 */
export function downloadInvoiceHtml(
  order: Order,
  language: 'ar' | 'en' = 'ar',
  settings?: SiteSettings
): void {
  const invoiceHtml = generateInvoiceHTML(order, settings, language);
  const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice-${order.orderNumber || order.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
