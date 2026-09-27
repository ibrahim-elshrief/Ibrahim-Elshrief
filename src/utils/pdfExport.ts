import { jsPDF } from 'jspdf';
import { Order } from '../types';

/**
 * Formats date cleanly for documents
 */
const formatDate = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleDateString('en-US');
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

/**
 * Exports a single order invoice as a high-quality formatted PDF document
 */
export const exportOrderInvoicePDF = (order: Order, language: 'ar' | 'en' = 'en') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isAr = language === 'ar';
  const currency = order.currency || 'USD';

  // --- Document Styles & Theme ---
  const primaryColor = [5, 150, 105]; // Emerald-600
  const darkTextColor = [30, 41, 59]; // Slate-800
  const lightTextColor = [100, 116, 139]; // Slate-500
  const borderColor = [226, 232, 240]; // Slate-200

  // Top Header Banner
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, 210, 24, 'F');

  // Title in Banner
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER INVOICE / RECEIPT', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`REF: ${order.orderNumber}`, 196, 15, { align: 'right' });

  // Reset text color
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  // Two columns: Order Info and Customer Info
  let y = 36;

  // Order Details Box (Left)
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 88, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Order Details', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Order Number:', 20, y + 16);
  doc.text('Date:', 20, y + 23);
  doc.text('Payment Status:', 20, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(order.orderNumber, 52, y + 16);
  doc.text(formatDate(order.createdAt), 52, y + 23);
  doc.text(order.paymentStatus?.toUpperCase() || 'PAID', 52, y + 30);

  // Customer Details Box (Right)
  doc.roundedRect(108, y, 88, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Customer Information', 114, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Name:', 114, y + 16);
  doc.text('Email:', 114, y + 23);
  doc.text('Payment Method:', 114, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(order.customerName || 'Customer', 146, y + 16);
  
  // Truncate email if too long
  const cleanEmail = order.customerEmail.length > 24 ? order.customerEmail.slice(0, 22) + '...' : order.customerEmail;
  doc.text(cleanEmail, 146, y + 23);
  doc.text(order.paymentMethodTitle || order.paymentMethod || 'E-Payment', 146, y + 30);

  y += 46;

  // Items Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 9, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);
  doc.line(14, y + 9, 196, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('#', 18, y + 6);
  doc.text('Item Description', 28, y + 6);
  doc.text('Type', 118, y + 6);
  doc.text('Qty', 146, y + 6);
  doc.text('Price', 166, y + 6);
  doc.text('Total', 192, y + 6, { align: 'right' });

  y += 10;

  // Item Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  let rowIndex = 1;
  const items = order.items || [];
  
  items.forEach((item) => {
    // Check if new page is needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Row alternating background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, 182, 8, 'F');
    }

    doc.text(String(rowIndex), 18, y + 5);
    
    // Product Name (fallback to English if Latin characters needed for jsPDF)
    const pName = item.productNameEn || item.productNameAr || 'Product Item';
    const cleanName = pName.length > 40 ? pName.slice(0, 38) + '...' : pName;
    doc.text(cleanName, 28, y + 5);

    doc.text(item.type || 'standard', 118, y + 5);
    doc.text(String(item.quantity || 1), 146, y + 5);
    doc.text(`${currency} ${(item.price || 0).toFixed(2)}`, 166, y + 5);
    doc.text(`${currency} ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`, 192, y + 5, { align: 'right' });

    y += 8;
    rowIndex++;
  });

  // Table bottom border
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);

  y += 6;

  // Financial Breakdown Summary Box (Right Aligned)
  const summaryBoxX = 118;
  const summaryBoxWidth = 78;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);

  doc.text('Subtotal:', summaryBoxX + 6, y + 8);
  doc.text(`${currency} ${(order.subtotal || order.total || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, y + 8, { align: 'right' });

  if (order.discount && order.discount > 0) {
    doc.text('Discount:', summaryBoxX + 6, y + 15);
    doc.text(`-${currency} ${order.discount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, y + 15, { align: 'right' });
  } else {
    doc.text('Shipping / Delivery:', summaryBoxX + 6, y + 15);
    doc.text(order.shipping && order.shipping > 0 ? `${currency} ${order.shipping.toFixed(2)}` : 'FREE', summaryBoxX + summaryBoxWidth - 6, y + 15, { align: 'right' });
  }

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(summaryBoxX + 4, y + 20, summaryBoxX + summaryBoxWidth - 4, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Total Paid:', summaryBoxX + 6, y + 28);
  doc.text(`${currency} ${(order.total || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth - 6, y + 28, { align: 'right' });

  y += 42;

  // Additional Delivery Notes or Instructions
  if (order.shippingAddress || order.notes || order.transferFrom) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, y, 182, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text('Delivery & Fulfillment Notes:', 18, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    
    let noteText = '';
    if (order.shippingAddress) noteText += `Address: ${order.shippingAddress}. `;
    if (order.transferFrom) noteText += `Account: ${order.transferFrom}. `;
    if (order.notes) noteText += `Note: ${order.notes}`;
    if (!noteText) noteText = 'Digital and physical delivery will be verified and dispatched within 24 hours.';
    
    doc.text(noteText.slice(0, 110), 18, y + 14);
    y += 28;
  }

  // Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('This is an electronically generated receipt for your records.', 105, 284, { align: 'center' });
  doc.text('Thank you for your purchase and trust.', 105, 289, { align: 'center' });

  // Save the PDF
  const filename = `Invoice_${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
  doc.save(filename);
};

/**
 * Exports complete order history summary as a formatted PDF table
 */
export const exportOrderHistoryPDF = (
  orders: Order[], 
  customerEmail: string,
  language: 'ar' | 'en' = 'en'
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [5, 150, 105]; // Emerald-600
  const darkTextColor = [30, 41, 59];
  const lightTextColor = [100, 116, 139];
  const borderColor = [226, 232, 240];

  // Top Header Banner
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER ORDER HISTORY REPORT', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 196, 15, { align: 'right' });

  // Customer Summary Banner
  let y = 34;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, y, 182, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Customer Account Summary', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`Email: ${customerEmail}`, 20, y + 14);

  const totalSpent = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
  const currency = orders[0]?.currency || 'USD';
  doc.text(`Total Orders: ${orders.length} orders`, 120, y + 14);
  doc.text(`Total Purchases: ${currency} ${totalSpent.toFixed(2)}`, 155, y + 14);

  y += 28;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);
  doc.line(14, y + 8, 196, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Order ID', 18, y + 5.5);
  doc.text('Date', 52, y + 5.5);
  doc.text('Items', 92, y + 5.5);
  doc.text('Status', 124, y + 5.5);
  doc.text('Method', 152, y + 5.5);
  doc.text('Total', 192, y + 5.5, { align: 'right' });

  y += 9;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  orders.forEach((order, index) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, 182, 7.5, 'F');
    }

    doc.text(order.orderNumber, 18, y + 4.5);
    doc.text(formatDate(order.createdAt).slice(0, 16), 52, y + 4.5);
    
    const itemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    doc.text(`${itemsCount} item(s)`, 92, y + 4.5);

    doc.text(order.orderStatus?.toUpperCase() || 'COMPLETED', 124, y + 4.5);
    
    const methodStr = (order.paymentMethodTitle || order.paymentMethod || 'Online').slice(0, 14);
    doc.text(methodStr, 152, y + 4.5);

    doc.text(`${order.currency || currency} ${(order.total || 0).toFixed(2)}`, 192, y + 4.5, { align: 'right' });

    y += 7.5;
  });

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('This is a summary report of your customer purchases record.', 105, 285, { align: 'center' });

  const cleanFileEmail = customerEmail.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`OrderHistory_${cleanFileEmail}.pdf`);
};
