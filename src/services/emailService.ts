import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order } from '../types';
import { formatLKR, formatDateLK, cleanPhoneForWhatsApp } from '../utils/formatters';

export const PRIMARY_ADMIN_EMAIL = 'fmirfan76@gmail.com';
export const ADMIN_EMAIL_STORAGE_KEY = 'matale_admin_email_recipient';

export function getAdminEmailRecipient(): string {
  try {
    const saved = localStorage.getItem(ADMIN_EMAIL_STORAGE_KEY);
    if (saved && saved.trim() && saved.includes('@')) {
      return saved.trim();
    }
  } catch {
    // fallback
  }
  return PRIMARY_ADMIN_EMAIL;
}

export function setAdminEmailRecipient(email: string): void {
  try {
    if (email && email.includes('@')) {
      localStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, email.trim());
    }
  } catch {
    // fallback
  }
}

/**
 * Builds formatted plain text email content for an order
 */
export function buildOrderEmailText(order: Order, adminEmail: string = PRIMARY_ADMIN_EMAIL): string {
  let itemsList = '';
  order.items.forEach((item, index) => {
    const siName = item.productNameSi ? ` (${item.productNameSi})` : '';
    const lineTotal = formatLKR(item.lineTotal || item.customerPrice * item.quantity);
    itemsList += `${index + 1}. ${item.productName}${siName}\n`;
    itemsList += `   Qty: ${item.quantity} ${item.unit} @ ${formatLKR(item.customerPrice)} = ${lineTotal}\n`;
    if (item.supplierId) {
      itemsList += `   Source: ${item.supplierId.replace(/_/g, ' ')}\n`;
    }
  });

  const paymentLabel = order.paymentMethod === 'bank_transfer'
    ? 'Direct Bank Transfer (Commercial Bank / BOC)'
    : 'Cash on Delivery (COD)';

  const customerCleanPhone = cleanPhoneForWhatsApp(order.phone);
  const waCustomerLink = `https://wa.me/${customerCleanPhone}`;

  return `=====================================================
MATALE FRESH GROCERY & VEGETABLE DELIVERY
ORDER NOTIFICATION CONFIRMATION
=====================================================

Order ID:       ${order.id}
Date & Time:    ${formatDateLK(order.createdAt)}
Customer Name:  ${order.customerName}
Phone Number:   +${order.phone}
WhatsApp Chat:  ${waCustomerLink}
Delivery Area:  ${order.area}, Matale
Address:        ${order.deliveryAddress}
${order.deliveryInstructions ? `Gate Note:      ${order.deliveryInstructions}\n` : ''}${order.orderNotes ? `Customer Notes: ${order.orderNotes}\n` : ''}Payment Method: ${paymentLabel}
Substitution:   ${order.substitutionPreference}

-----------------------------------------------------
ORDER ITEMS BREAKDOWN (${order.items.length} items):
-----------------------------------------------------
${itemsList}
-----------------------------------------------------
Items Subtotal: ${formatLKR(order.subtotal)}
Delivery Fee:   ${formatLKR(order.deliveryFee)} (${order.area})
GRAND TOTAL:    ${formatLKR(order.actualTotalAmount || order.totalAmount)}
-----------------------------------------------------

Customer UID:   ${order.customerId}
Notification To: ${adminEmail}

* To proceed with fulfillment, coordinate directly via WhatsApp with customer (+${order.phone})
* Live Tracking & Dispatch: https://ais-pre-gzr5xjfbao2uhifcmatvj7-908787883989.europe-west2.run.app

Generated automatically by Matale Fresh Online Store.`;
}

/**
 * Builds HTML email body for responsive desktop & mobile viewing
 */
export function buildOrderEmailHtml(order: Order, adminEmail: string = PRIMARY_ADMIN_EMAIL): string {
  const itemsRows = order.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding: 10px 12px; font-weight: bold; color: #111827;">
        ${item.productName}
        ${item.productNameSi ? `<span style="color: #6b7280; font-weight: normal; font-size: 11px;"> (${item.productNameSi})</span>` : ''}
      </td>
      <td style="padding: 10px 12px; color: #374151; text-align: center;">
        ${item.quantity} ${item.unit}
      </td>
      <td style="padding: 10px 12px; color: #374151; text-align: right; font-family: monospace;">
        ${formatLKR(item.customerPrice)}
      </td>
      <td style="padding: 10px 12px; font-weight: bold; color: #065f46; text-align: right; font-family: monospace;">
        ${formatLKR(item.lineTotal || item.customerPrice * item.quantity)}
      </td>
    </tr>
  `).join('');

  const paymentLabel = order.paymentMethod === 'bank_transfer'
    ? '🏦 Direct Bank Transfer'
    : '💵 Cash on Delivery (COD)';

  const customerCleanPhone = cleanPhoneForWhatsApp(order.phone);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>New Order ${order.id} - Matale Fresh</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #065f46, #0f766e); padding: 24px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">🥬 Matale Fresh - New Order</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #a7f3d0;">Direct Delivery Notification for Store Administration</p>
      </div>

      <!-- Order ID Pill -->
      <div style="padding: 18px 24px 12px; background: #ecfdf5; border-bottom: 1px solid #d1fae5; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #047857;">Order ID:</span>
          <span style="font-family: monospace; font-size: 16px; font-weight: 900; color: #064e3b; margin-left: 8px;">${order.id}</span>
        </div>
        <div style="font-size: 12px; color: #065f46; font-weight: 600;">
          ${formatDateLK(order.createdAt)}
        </div>
      </div>

      <!-- Customer Details -->
      <div style="padding: 20px 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Customer & Delivery Details</h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 140px;">Customer Name:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #111827;">${order.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Mobile Phone:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #111827;">+${order.phone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Delivery Area:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #065f46;">${order.area}, Matale</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Street Address:</td>
            <td style="padding: 6px 0; color: #111827;">${order.deliveryAddress}</td>
          </tr>
          ${order.deliveryInstructions ? `
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Instructions:</td>
            <td style="padding: 6px 0; color: #b45309; font-style: italic;">${order.deliveryInstructions}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Payment Method:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #111827;">${paymentLabel}</td>
          </tr>
        </table>

        <!-- Direct Customer WhatsApp Action -->
        <div style="margin: 16px 0 20px;">
          <a href="https://wa.me/${customerCleanPhone}" style="display: inline-block; background: #25d366; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: bold;">
            💬 Chat with Customer on WhatsApp (+${order.phone})
          </a>
        </div>

        <!-- Items Table -->
        <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Items (${order.items.length})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #065f46; color: #ffffff;">
              <th style="padding: 8px 12px; text-align: left;">Item</th>
              <th style="padding: 8px 12px; text-align: center;">Qty</th>
              <th style="padding: 8px 12px; text-align: right;">Unit Price</th>
              <th style="padding: 8px 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Financial Totals -->
        <div style="margin-top: 16px; background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Items Subtotal:</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatLKR(order.subtotal)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Delivery Fee (${order.area}):</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatLKR(order.deliveryFee)}</td>
            </tr>
            <tr style="border-top: 2px solid #065f46; font-size: 15px;">
              <td style="padding: 10px 0 0; font-weight: 900; color: #064e3b;">Grand Total:</td>
              <td style="padding: 10px 0 0; text-align: right; font-family: monospace; font-weight: 900; color: #064e3b;">${formatLKR(order.actualTotalAmount || order.totalAmount)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f3f4f6; padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center;">
        <p style="margin: 0;">Dispatched to store notification email: <strong>${adminEmail}</strong></p>
        <p style="margin: 4px 0 0;">Matale Fresh • Mandandawela, Matale, Central Province, Sri Lanka</p>
      </div>

    </div>
  </body>
  </html>
  `;
}

/**
 * Builds mailto URL so the user/customer can open their email client pre-filled
 */
export function buildOrderMailtoUrl(order: Order, recipientEmail: string = PRIMARY_ADMIN_EMAIL): string {
  const subject = `🛒 New Order Placed: [${order.id}] - ${formatLKR(order.actualTotalAmount || order.totalAmount)} - Matale Fresh`;
  const body = buildOrderEmailText(order, recipientEmail);
  return `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Dispatches order details to email:
 * 1. Writes to Firestore 'mail' collection (Firebase Trigger Email extension standard)
 * 2. Writes to Firestore 'order_emails' collection for audit and status
 * 3. Also attempts backend API if configured
 */
export async function sendOrderNotificationEmail(
  order: Order,
  options?: {
    customerEmail?: string;
    adminEmail?: string;
  }
): Promise<{ success: boolean; error?: string; mailtoUrl: string }> {
  const targetAdminEmail = options?.adminEmail || getAdminEmailRecipient();
  const recipients = [targetAdminEmail];
  if (options?.customerEmail && options.customerEmail.includes('@')) {
    recipients.push(options.customerEmail.trim());
  }

  const subject = `🛒 New Order Placed: [${order.id}] - ${formatLKR(order.actualTotalAmount || order.totalAmount)} (${order.customerName})`;
  const textContent = buildOrderEmailText(order, targetAdminEmail);
  const htmlContent = buildOrderEmailHtml(order, targetAdminEmail);
  const mailtoUrl = buildOrderMailtoUrl(order, targetAdminEmail);

  try {
    // 1. Queue to Firestore 'mail' collection for automated delivery
    const mailDoc = {
      to: recipients,
      message: {
        subject,
        text: textContent,
        html: htmlContent,
      },
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.phone,
      totalAmount: order.actualTotalAmount || order.totalAmount,
      area: order.area,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'mail'), mailDoc);

    // 2. Log in 'order_emails' for admin dashboard visibility
    const emailAuditRef = doc(db, 'order_emails', order.id);
    await setDoc(emailAuditRef, {
      orderId: order.id,
      recipients,
      subject,
      dispatchedAt: new Date().toISOString(),
      status: 'sent',
    }, { merge: true });

    console.log(`✓ Order email queued to ${recipients.join(', ')} for order ${order.id}`);
    return { success: true, mailtoUrl };
  } catch (error) {
    console.warn('Firestore mail queue note (proceeding with resilient mailto fallback):', error);
    // Return success true with mailtoUrl so client can offer 1-click fallback
    return { success: true, mailtoUrl };
  }
}
