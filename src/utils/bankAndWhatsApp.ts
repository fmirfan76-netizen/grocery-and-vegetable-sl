import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order } from '../types';
import { formatLKR, formatDateLK, cleanPhoneForWhatsApp } from './formatters';

export interface BankAccountDetails {
  id: string;
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  instructions: string;
  isActive: boolean;
}

export const DEFAULT_BANK_ACCOUNTS: BankAccountDetails[] = [
  {
    id: 'bank-comboc-01',
    bankName: 'Commercial Bank of Ceylon',
    branch: 'Matale Branch (Branch Code: 042)',
    accountName: 'Matale Fresh Grocery & Logistics',
    accountNumber: '8004 9210 4452',
    swiftCode: 'CCEYLKX',
    instructions: 'Use your Order ID as the deposit / transfer reference and WhatsApp the bank receipt slip to our coordinator.',
    isActive: true,
  },
  {
    id: 'bank-boc-02',
    bankName: 'Bank of Ceylon (BOC)',
    branch: 'Matale City Branch',
    accountName: 'Matale Fresh Delivery',
    accountNumber: '0078 3491 8820',
    instructions: 'Transfers via BOC SmartPay, CEFTS or online banking accepted. Please mention your Order ID.',
    isActive: true,
  },
];

// Alias for backwards compatibility
export const MATALE_BANK_ACCOUNTS = DEFAULT_BANK_ACCOUNTS;

const BANK_STORAGE_KEY = 'matale_bank_accounts_data';
const SETTINGS_DOC_PATH = 'settings/bank_accounts';
const BUSINESS_SETTINGS_DOC = 'settings/business_settings';

export async function fetchBankAccounts(): Promise<BankAccountDetails[]> {
  try {
    const docRef = doc(db, 'settings', 'bank_accounts');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.accounts) {
      const accounts = snap.data().accounts as BankAccountDetails[];
      localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(accounts));
      return accounts;
    }
    // Try localStorage
    const saved = localStorage.getItem(BANK_STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    // Initial seed to Firestore
    try {
      await setDoc(docRef, { accounts: DEFAULT_BANK_ACCOUNTS }, { merge: true });
    } catch (e) {
      console.warn('Initial bank account seed note:', e);
    }
    return DEFAULT_BANK_ACCOUNTS;
  } catch (error) {
    console.warn('Falling back to local bank accounts:', error);
    const saved = localStorage.getItem(BANK_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_BANK_ACCOUNTS;
  }
}

export async function saveBankAccounts(accounts: BankAccountDetails[]): Promise<void> {
  try {
    localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(accounts));
    const docRef = doc(db, 'settings', 'bank_accounts');
    await setDoc(
      docRef,
      {
        accounts,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving bank accounts to Firestore:', error);
    throw error;
  }
}

export function subscribeToBankAccounts(
  callback: (accounts: BankAccountDetails[]) => void
): () => void {
  try {
    const docRef = doc(db, 'settings', 'bank_accounts');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists() && docSnap.data()?.accounts) {
          const accounts = docSnap.data().accounts as BankAccountDetails[];
          localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(accounts));
          callback(accounts);
        } else {
          callback(DEFAULT_BANK_ACCOUNTS);
        }
      },
      (err) => {
        console.warn('Bank accounts real-time subscription note:', err.message);
      }
    );
  } catch (e) {
    console.warn('Error starting bank accounts listener:', e);
    return () => {};
  }
}

export const DEFAULT_ADMIN_WHATSAPP = '94771234567'; // Sri Lankan coordinator WhatsApp format (947XXXXXXXX)
export const ADMIN_WHATSAPP_STORAGE_KEY = 'matale_admin_whatsapp_number';

export function getAdminWhatsAppNumber(): string {
  try {
    const saved = localStorage.getItem(ADMIN_WHATSAPP_STORAGE_KEY);
    if (saved && saved.trim()) {
      return cleanPhoneForWhatsApp(saved);
    }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_WHATSAPP;
}

export async function setAdminWhatsAppNumber(phone: string): Promise<void> {
  try {
    const cleanPhone = cleanPhoneForWhatsApp(phone.trim());
    localStorage.setItem(ADMIN_WHATSAPP_STORAGE_KEY, cleanPhone);
    const docRef = doc(db, 'settings', 'business_settings');
    await setDoc(
      docRef,
      {
        adminWhatsApp: cleanPhone,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Error syncing admin WhatsApp number to Firestore:', e);
  }
}

export function subscribeToAdminWhatsApp(callback: (phone: string) => void): () => void {
  try {
    const docRef = doc(db, 'settings', 'business_settings');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists() && docSnap.data()?.adminWhatsApp) {
          const phone = docSnap.data().adminWhatsApp;
          localStorage.setItem(ADMIN_WHATSAPP_STORAGE_KEY, phone);
          callback(phone);
        } else {
          callback(getAdminWhatsAppNumber());
        }
      },
      (err) => {
        console.warn('Admin WhatsApp subscription note:', err.message);
      }
    );
  } catch (e) {
    console.warn('Error starting WhatsApp listener:', e);
    return () => {};
  }
}

/**
 * Builds a formatted WhatsApp notification message for the Administrator
 */
export function buildAdminOrderWhatsAppMessage(order: Order): string {
  const vegItems = order.items.filter((i) => i.supplierId === 'vegetable_shop' || i.productCategory === 'vegetables' || i.productCategory === 'greens');
  const fruitItems = order.items.filter((i) => i.supplierId === 'fruit_stall' || i.productCategory === 'fruits');
  const meatItems = order.items.filter((i) => i.supplierId === 'meat_shop' || i.productCategory === 'meat');
  const grocItems = order.items.filter((i) => !vegItems.includes(i) && !fruitItems.includes(i) && !meatItems.includes(i));

  let itemsText = '';

  if (vegItems.length > 0) {
    itemsText += '\n*🥦 FRESH VEGETABLES (Matale Pola):*\n';
    vegItems.forEach((i) => {
      itemsText += `• ${i.productName} (${i.unit}) × ${i.quantity} = ${formatLKR(i.lineTotal)}\n`;
    });
  }

  if (fruitItems.length > 0) {
    itemsText += '\n*🍎 FRESH FRUITS (Central Fruit Market):*\n';
    fruitItems.forEach((i) => {
      itemsText += `• ${i.productName} (${i.unit}) × ${i.quantity} = ${formatLKR(i.lineTotal)}\n`;
    });
  }

  if (meatItems.length > 0) {
    itemsText += '\n*🍗 100% HALAL MEAT, EGGS & SEAFOOD:*\n';
    meatItems.forEach((i) => {
      itemsText += `• ${i.productName} (${i.unit}) × ${i.quantity} = ${formatLKR(i.lineTotal)}\n`;
    });
  }

  if (grocItems.length > 0) {
    itemsText += '\n*🛒 GROCERY & SUPERMARKET ITEMS:*\n';
    grocItems.forEach((i) => {
      itemsText += `• ${i.productName} (${i.unit}) × ${i.quantity} = ${formatLKR(i.lineTotal)}\n`;
    });
  }

  const paymentLabel =
    order.paymentMethod === 'bank_transfer'
      ? '🏦 Direct Bank Transfer (Slip to be verified)'
      : '💵 Cash on Delivery (COD)';

  return `*🥬 NEW ORDER RECEIVED - MATALE FRESH*
---------------------------------------
*Order ID:* ${order.id}
*Customer:* ${order.customerName}
*Phone:* ${order.phone}
*Area:* ${order.area}
*Address:* ${order.deliveryAddress}
${order.deliveryInstructions ? `*Instructions:* ${order.deliveryInstructions}\n` : ''}*Payment Mode:* ${paymentLabel}
${itemsText}
---------------------------------------
*Items Subtotal:* ${formatLKR(order.subtotal)}
*Delivery Fee:* ${formatLKR(order.deliveryFee)}
*Total Amount:* ${formatLKR(order.totalAmount)}
*Substitution Rule:* ${
    order.substitutionPreference === 'call_first'
      ? 'Call customer before substitute'
      : order.substitutionPreference === 'best_available'
      ? 'Pick closest best quality'
      : 'Do not substitute (omit)'
  }
${order.orderNotes ? `*Order Notes:* ${order.orderNotes}\n` : ''}
*Placed at:* ${formatDateLK(order.createdAt)}
*Status:* Pending Confirmation`;
}

/**
 * Creates direct WhatsApp click-to-chat URL targeting the Admin's phone
 */
export function getAdminWhatsAppUrl(order: Order, customAdminPhone?: string): string {
  const targetPhone = customAdminPhone
    ? cleanPhoneForWhatsApp(customAdminPhone)
    : getAdminWhatsAppNumber();
  const text = buildAdminOrderWhatsAppMessage(order);
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Creates generic WhatsApp share URL to share the order invoice with any recipient or group
 */
export function getWhatsAppShareUrl(order: Order): string {
  const text = buildAdminOrderWhatsAppMessage(order);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

