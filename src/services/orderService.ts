import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Order, OrderStatus } from '../types';
import { sendOrderNotificationEmail, PRIMARY_ADMIN_EMAIL } from './emailService';

const ORDERS_COLLECTION = 'orders';
const LOCAL_ORDERS_KEY = 'matale_local_orders';
const PENDING_SYNC_KEY = 'matale_pending_sync_orders';

export function generateOrderId(): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MTL-2026-${randomPart}`;
}

/**
 * Creates and records a customer order with instant local persistence and Firestore sync
 */
export async function createOrder(
  orderData: Omit<Order, 'id' | 'createdAt' | 'status'>
): Promise<Order> {
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  // Validate server-authoritative calculations
  const calculatedSubtotal = (orderData.items || []).reduce(
    (sum, item) => sum + (Number(item.customerPrice) || 0) * (Number(item.quantity) || 1), 
    0
  );
  const deliveryFee = Number(orderData.deliveryFee) || 200;
  const totalAmount = calculatedSubtotal + deliveryFee;

  // Clean items array to ensure no undefined values are sent to Firestore
  const sanitizedItems = (orderData.items || []).map((item) => ({
    productId: String(item.productId || ''),
    productName: String(item.productName || 'Fresh Item'),
    productNameSi: String(item.productNameSi || ''),
    productNameTa: String(item.productNameTa || ''),
    productCategory: String(item.productCategory || 'vegetables'),
    unit: String(item.unit || '1'),
    quantity: Number(item.quantity) || 1,
    customerPrice: Number(item.customerPrice) || 0,
    lineTotal: (Number(item.customerPrice) || 0) * (Number(item.quantity) || 1),
    supplierId: String(item.supplierId || 'vegetable_shop'),
    actualPurchaseCost: Number(item.actualPurchaseCost) || ((Number(item.customerPrice) || 0) * 0.8),
    status: item.status || 'available',
  }));

  const newOrder: Order = {
    id: orderId,
    customerId: String(orderData.customerId || `guest_${Date.now()}`),
    customerName: String(orderData.customerName || 'Customer'),
    phone: String(orderData.phone || ''),
    customerEmail: orderData.customerEmail ? String(orderData.customerEmail).trim() : undefined,
    deliveryAddress: String(orderData.deliveryAddress || ''),
    area: String(orderData.area || 'Matale'),
    deliveryInstructions: orderData.deliveryInstructions ? String(orderData.deliveryInstructions) : '',
    orderNotes: orderData.orderNotes ? String(orderData.orderNotes) : '',
    substitutionPreference: orderData.substitutionPreference || 'call_first',
    paymentMethod: orderData.paymentMethod || 'cash_on_delivery',
    itemCount: Number(orderData.itemCount) || sanitizedItems.reduce((s, i) => s + i.quantity, 0),
    subtotal: calculatedSubtotal,
    deliveryFee,
    totalAmount,
    actualSubtotal: calculatedSubtotal,
    actualTotalAmount: totalAmount,
    items: sanitizedItems,
    status: 'Pending',
    emailSent: true,
    emailSentTo: PRIMARY_ADMIN_EMAIL,
    statusHistory: [
      {
        status: 'Pending',
        timestamp: now,
        note: 'Order submitted by customer via mobile application.',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Convert to clean JSON object free of any undefined or prototype properties
  const cleanOrder = JSON.parse(JSON.stringify(newOrder)) as Order;

  // 1. Immediately cache locally so order is never lost under any network circumstance
  try {
    const existingRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const existingList: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updatedList = [cleanOrder, ...existingList.filter((o) => o.id !== cleanOrder.id)];
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedList.slice(0, 50)));
    localStorage.setItem('matale_last_order', JSON.stringify(cleanOrder));
  } catch (storageErr) {
    console.warn('Local storage order caching note:', storageErr);
  }

  // 2. Automatically dispatch order notification email to store admin (and customer if provided)
  sendOrderNotificationEmail(cleanOrder, { customerEmail: cleanOrder.customerEmail }).catch((err) => {
    console.warn('Background order email dispatch note:', err);
  });

  // 3. Persist to Firestore with automatic fallback for network latency/drop
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderRef, cleanOrder);
    return cleanOrder;
  } catch (error) {
    console.warn('Firestore direct write notice, queued for background sync:', error);
    try {
      const pendingRaw = localStorage.getItem(PENDING_SYNC_KEY);
      const pending: Order[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      pending.push(cleanOrder);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    } catch {
      // ignore
    }
    // Return cleanOrder so customer proceeds to success & WhatsApp without error
    return cleanOrder;
  }
}

/**
 * Synchronizes any pending offline orders to Firestore
 */
export async function syncPendingOrders(): Promise<void> {
  try {
    const pendingRaw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!pendingRaw) return;
    const pending: Order[] = JSON.parse(pendingRaw);
    if (!pending || pending.length === 0) return;

    const remaining: Order[] = [];
    for (const ord of pending) {
      try {
        const orderRef = doc(db, ORDERS_COLLECTION, ord.id);
        await setDoc(orderRef, ord, { merge: true });
      } catch {
        remaining.push(ord);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch (e) {
    console.warn('Background order sync note:', e);
  }
}

// Auto-trigger sync on network online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingOrders();
  });
  setTimeout(() => {
    syncPendingOrders();
  }, 3000);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const cleanId = orderId.trim();
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, cleanId);
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }
  } catch (error) {
    console.warn('Firestore getOrder error, checking local store:', error);
  }

  // Fallback to local storage cache if Firestore is offline
  try {
    const localRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (localRaw) {
      const list: Order[] = JSON.parse(localRaw);
      const match = list.find((o) => o.id === cleanId);
      if (match) return match;
    }
  } catch {
    // ignore
  }

  return null;
}

export function subscribeToOrders(
  onOrdersChange: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = ORDERS_COLLECTION;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((docSnap) => {
          orders.push(docSnap.data() as Order);
        });
        // Merge with local orders if any exist
        try {
          const localRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
          if (localRaw) {
            const localList: Order[] = JSON.parse(localRaw);
            const serverIds = new Set(orders.map((o) => o.id));
            for (const loc of localList) {
              if (!serverIds.has(loc.id)) {
                orders.push(loc);
              }
            }
            orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
        } catch {
          // ignore
        }
        onOrdersChange(orders);
      },
      (error) => {
        console.warn('Orders real-time feed notice:', error.message);
        // Fallback to local cached orders
        try {
          const localRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
          if (localRaw) {
            onOrdersChange(JSON.parse(localRaw));
          }
        } catch {
          // ignore
        }
        if (onError) onError(error as Error);
      }
    );
  } catch (error) {
    console.warn('Unable to initialize orders listener:', error);
    return () => {};
  }
}

export async function fetchAllOrders(): Promise<Order[]> {
  const path = ORDERS_COLLECTION;
  try {
    const snapshot = await getDocs(collection(db, path));
    const orders: Order[] = [];
    snapshot.forEach((docSnap) => {
      orders.push(docSnap.data() as Order);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    try {
      const localRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (localRaw) {
        return JSON.parse(localRaw);
      }
    } catch {
      // ignore
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateOrderStatus(
  orderId: string, 
  newStatus: OrderStatus, 
  note?: string,
  cancellationReason?: string
): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error(`Order ${orderId} does not exist`);
    }

    const currentOrder = orderSnap.data() as Order;
    const history = currentOrder.statusHistory || [];
    const timestamp = new Date().toISOString();

    history.push({
      status: newStatus,
      timestamp,
      note: note || `Order marked as ${newStatus}`,
    });

    const updatePayload: Record<string, any> = {
      status: newStatus,
      statusHistory: history,
      updatedAt: timestamp,
    };

    if (cancellationReason) {
      updatePayload.cancellationReason = cancellationReason;
    }

    await updateDoc(orderRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrderAdminAdjustments(
  orderId: string,
  adjustments: {
    actualSubtotal?: number;
    actualTotalAmount?: number;
    deliveryFee?: number;
    deliveryExpense?: number;
    totalPurchaseCost?: number;
    items?: Order['items'];
    notes?: string;
  }
): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      ...adjustments,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Fetches order history for a logged-in customer directly from Firestore based on their UID / customerId
 */
export async function fetchCustomerOrdersByUid(customerUid: string): Promise<Order[]> {
  const path = ORDERS_COLLECTION;
  const foundOrders: Order[] = [];
  const seenIds = new Set<string>();

  if (!customerUid || !customerUid.trim()) {
    return [];
  }

  const cleanUid = customerUid.trim();

  // 1. Query Firestore orders collection where customerId == customerUid
  try {
    const q = query(
      collection(db, path),
      where('customerId', '==', cleanUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const ord = d.data() as Order;
      if (!seenIds.has(ord.id)) {
        seenIds.add(ord.id);
        foundOrders.push(ord);
      }
    });
  } catch (error) {
    console.warn('Firestore query by customerId error, trying fallback without index:', error);
    try {
      const qFallback = query(
        collection(db, path),
        where('customerId', '==', cleanUid)
      );
      const snap2 = await getDocs(qFallback);
      snap2.forEach((d) => {
        const ord = d.data() as Order;
        if (!seenIds.has(ord.id)) {
          seenIds.add(ord.id);
          foundOrders.push(ord);
        }
      });
    } catch (e) {
      console.warn('Fallback Firestore query by UID warning:', e);
    }
  }

  // 2. Local storage fallback merge
  try {
    const localRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (localRaw) {
      const localList: Order[] = JSON.parse(localRaw);
      for (const ord of localList) {
        if (!seenIds.has(ord.id) && (ord.customerId === cleanUid || (ord.customerId && ord.customerId.includes(cleanUid)))) {
          seenIds.add(ord.id);
          foundOrders.push(ord);
        }
      }
    }
  } catch {
    // ignore
  }

  return foundOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Subscribes in real-time to a customer's order history from Firestore based on their customer UID
 */
export function subscribeToCustomerOrdersByUid(
  customerUid: string,
  onOrdersChange: (orders: Order[]) => void
): Unsubscribe {
  const path = ORDERS_COLLECTION;
  if (!customerUid || !customerUid.trim()) {
    return () => {};
  }
  const cleanUid = customerUid.trim();

  try {
    const q = query(
      collection(db, path),
      where('customerId', '==', cleanUid)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((docSnap) => {
          orders.push(docSnap.data() as Order);
        });
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onOrdersChange(orders);
      },
      (error) => {
        console.warn('Real-time customer orders query by UID notice:', error);
      }
    );
  } catch (e) {
    console.warn('Failed to subscribe to customer orders by UID:', e);
    return () => {};
  }
}

