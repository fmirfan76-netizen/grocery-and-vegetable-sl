import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, OrderItem, MataleArea, SubstitutionPreference } from '../types';
import { MATALE_AREAS } from '../services/seedData';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  selectedArea: MataleArea;
  setSelectedArea: (area: MataleArea) => void;
  deliveryFee: number;
  totalAmount: number;
  supplierCounts: {
    vegetableShopCount: number;
    supermarketCount: number;
    hasBothSuppliers: boolean;
  };
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  substitutionPreference: SubstitutionPreference;
  setSubstitutionPreference: (pref: SubstitutionPreference) => void;
  paymentMethod: 'cod' | 'bank_transfer';
  setPaymentMethod: (method: 'cod' | 'bank_transfer') => void;
  toOrderItems: () => OrderItem[];
}

const CART_STORAGE_KEY = 'matale_fresh_cart_items';
const AREA_STORAGE_KEY = 'matale_fresh_selected_area';

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedArea, setSelectedAreaState] = useState<MataleArea>(() => {
    try {
      const saved = localStorage.getItem(AREA_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return MATALE_AREAS[0];
  });

  const [orderNotes, setOrderNotes] = useState<string>('');
  const [substitutionPreference, setSubstitutionPreference] = useState<SubstitutionPreference>('call_first');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod');

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart to storage', e);
    }
  }, [items]);

  const setSelectedArea = (area: MataleArea) => {
    setSelectedAreaState(area);
    try {
      localStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(area));
    } catch (e) {
      console.warn(e);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity: Math.max(quantity, product.minQuantity || 1) }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setOrderNotes('');
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = item.product.isOffer && item.product.offerPrice ? item.product.offerPrice : item.product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  const deliveryFee = selectedArea.deliveryFee;
  const totalAmount = subtotal + deliveryFee;

  const vegetableShopCount = items.filter((i) => i.product.supplierId === 'vegetable_shop').length;
  const supermarketCount = items.filter((i) => i.product.supplierId === 'supermarket').length;
  const hasBothSuppliers = vegetableShopCount > 0 && supermarketCount > 0;

  const toOrderItems = (): OrderItem[] => {
    return items.map((i) => {
      const price = i.product.isOffer && i.product.offerPrice ? i.product.offerPrice : i.product.price;
      return {
        productId: i.product.id,
        productName: i.product.name,
        productNameSi: i.product.nameSi,
        unit: i.product.unit,
        quantity: i.quantity,
        customerPrice: price,
        lineTotal: price * i.quantity,
        supplierId: i.product.supplierId,
        actualPurchaseCost: i.product.costPrice,
        status: 'available',
      };
    });
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        selectedArea,
        setSelectedArea,
        deliveryFee,
        totalAmount,
        supplierCounts: {
          vegetableShopCount,
          supermarketCount,
          hasBothSuppliers,
        },
        orderNotes,
        setOrderNotes,
        substitutionPreference,
        setSubstitutionPreference,
        paymentMethod,
        setPaymentMethod,
        toOrderItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
