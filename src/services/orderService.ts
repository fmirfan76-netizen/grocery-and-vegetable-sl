import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Order, OrderStatus } from '../types';

const ORDERS_COLLECTION = 'orders';

export function generateOrderId(): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MTL-2026-${randomPart}`;
}

export async function createOrder(
  orderData: Omit<Order, 'id' | 'createdAt' | 'status'>
): Promise<Order> {
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  // Validate server-authoritative calculations
  const calculatedSubtotal = orderData.items.reduce(
    (sum, item) => sum + item.customerPrice * item.quantity, 
    0
  );
  const deliveryFee = Number(orderData.deliveryFee) || 200;
  const totalAmount = calculatedSubtotal + deliveryFee;

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    status: 'Pending',
    subtotal: calculatedSubtotal,
    deliveryFee,
    totalAmount,
    actualSubtotal: calculatedSubtotal,
    actualTotalAmount: totalAmount,
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

  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderRef, newOrder);
    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId.trim());
    const snap = await getDoc(orderRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as Order;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ORDERS_COLLECTION}/${orderId}`);
  }
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
        onOrdersChange(orders);
      },
      (error) => {
        console.warn('Orders real-time feed notice:', error.message);
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
      note: note || `Status updated to ${newStatus}`,
    });

    const updates: Record<string, unknown> = {
      status: newStatus,
      statusHistory: history,
      updatedAt: timestamp,
    };

    if (newStatus === 'Cancelled' && cancellationReason) {
      updates.cancellationReason = cancellationReason;
    }

    await updateDoc(orderRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrderAdminAdjustments(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
