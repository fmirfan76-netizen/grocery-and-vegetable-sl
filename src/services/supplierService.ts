import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Supplier, Order, SupplierId, OrderItem } from '../types';
import { INITIAL_SUPPLIERS } from './seedData';

const SUPPLIERS_COLLECTION = 'suppliers';

export async function fetchSuppliers(): Promise<Supplier[]> {
  try {
    const snapshot = await getDocs(collection(db, SUPPLIERS_COLLECTION));
    if (snapshot.empty) {
      for (const sup of INITIAL_SUPPLIERS) {
        await setDoc(doc(db, SUPPLIERS_COLLECTION, sup.id), sup);
      }
      return INITIAL_SUPPLIERS;
    }
    const suppliers: Supplier[] = [];
    snapshot.forEach((snap) => {
      suppliers.push(snap.data() as Supplier);
    });
    return suppliers;
  } catch (error) {
    console.warn('Falling back to local suppliers list:', error);
    return INITIAL_SUPPLIERS;
  }
}

export interface SupplierShoppingItemSummary {
  productId: string;
  productName: string;
  productNameSi?: string;
  unit: string;
  totalQuantity: number;
  orderIds: string[];
  estimatedTotalCost: number;
  items: {
    orderId: string;
    customerName: string;
    quantity: number;
    confirmedQuantity?: number;
    actualPurchaseCost?: number;
    substitutionNote?: string;
    status?: 'available' | 'substituted' | 'out_of_stock';
  }[];
}

/**
 * Extracts shopping list for a specific supplier across specified orders
 */
export function generateSupplierShoppingList(
  orders: Order[],
  supplierId: SupplierId
): SupplierShoppingItemSummary[] {
  const itemMap = new Map<string, SupplierShoppingItemSummary>();

  // Filter only active orders that need shopping or packing
  const activeOrders = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Shopping' || o.status === 'Pending'
  );

  for (const order of activeOrders) {
    for (const item of order.items) {
      if (item.supplierId === supplierId) {
        const existing = itemMap.get(item.productId);
        if (!existing) {
          itemMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            productNameSi: item.productNameSi,
            unit: item.unit,
            totalQuantity: item.quantity,
            orderIds: [order.id],
            estimatedTotalCost: (item.actualPurchaseCost || (item.customerPrice * 0.8)) * item.quantity,
            items: [
              {
                orderId: order.id,
                customerName: order.customerName,
                quantity: item.quantity,
                confirmedQuantity: item.confirmedQuantity,
                actualPurchaseCost: item.actualPurchaseCost,
                substitutionNote: item.substitutionNote,
                status: item.status,
              },
            ],
          });
        } else {
          existing.totalQuantity += item.quantity;
          if (!existing.orderIds.includes(order.id)) {
            existing.orderIds.push(order.id);
          }
          existing.estimatedTotalCost += (item.actualPurchaseCost || (item.customerPrice * 0.8)) * item.quantity;
          existing.items.push({
            orderId: order.id,
            customerName: order.customerName,
            quantity: item.quantity,
            confirmedQuantity: item.confirmedQuantity,
            actualPurchaseCost: item.actualPurchaseCost,
            substitutionNote: item.substitutionNote,
            status: item.status,
          });
        }
      }
    }
  }

  return Array.from(itemMap.values());
}
