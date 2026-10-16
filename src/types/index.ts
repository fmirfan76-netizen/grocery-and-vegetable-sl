export type SupplierId = 'vegetable_shop' | 'supermarket' | string;

export interface Supplier {
  id: SupplierId;
  name: string;
  type: string;
  location: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
}

export type ProductCategory = 
  | 'vegetables' 
  | 'fruits' 
  | 'greens' 
  | 'supermarket_staples' 
  | 'dairy_beverages' 
  | 'snacks_bakery' 
  | 'spices_condiments'
  | 'household';

export interface Product {
  id: string;
  name: string;
  nameSi: string;
  nameTa: string;
  category: ProductCategory;
  supplierId: SupplierId;
  price: number; // in LKR
  costPrice: number; // wholesale purchase cost in LKR
  unit: string; // e.g. 500g, 1 kg, 250g, 1 bunch, 1 bottle, 1 piece
  minQuantity: number;
  step: number;
  inStock: boolean;
  imageUrl: string;
  badge?: string;
  isPopular?: boolean;
  isOffer?: boolean;
  offerPrice?: number;
  offerLabel?: string;
  origin?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productNameSi?: string;
  unit: string;
  quantity: number;
  customerPrice: number;
  lineTotal: number;
  supplierId: SupplierId;
  confirmedQuantity?: number;
  actualPurchaseCost?: number;
  status?: 'available' | 'substituted' | 'out_of_stock';
  substitutionNote?: string;
}

export type OrderStatus = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Shopping' 
  | 'Packed' 
  | 'Out for Delivery' 
  | 'Delivered' 
  | 'Cancelled';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export type SubstitutionPreference = 
  | 'call_first' 
  | 'best_available' 
  | 'omit_out_of_stock';

export interface Order {
  id: string; // e.g. MTL-2026-1042
  customerId: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  area: string;
  deliveryInstructions?: string;
  orderNotes?: string;
  substitutionPreference: SubstitutionPreference;
  paymentMethod: 'cod' | 'bank_transfer';
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  cancellationReason?: string;
  cancelReason?: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  actualSubtotal?: number;
  actualTotalAmount?: number;
  totalPurchaseCost?: number;
  deliveryExpense?: number;
  items: OrderItem[];
  deliveryRider?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  displayName?: string;
}

export interface MataleArea {
  name: string;
  deliveryFee: number;
  estMinutes: string;
}
