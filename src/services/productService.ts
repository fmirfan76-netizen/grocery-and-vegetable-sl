import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from './seedData';

const PRODUCTS_COLLECTION = 'products';

export async function fetchProducts(): Promise<Product[]> {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    if (snapshot.empty) {
      try {
        await seedDefaultProducts();
      } catch (seedErr) {
        console.warn('First-boot seed notice:', seedErr);
      }
      return INITIAL_PRODUCTS;
    }
    const products: Product[] = [];
    for (const docSnap of snapshot.docs) {
      let p = docSnap.data() as Product;
      // Proactively purge any unwanted pig, pork, or unapproved meat items
      const isPigOrPork = 
        p.id === 'meat-beef-curry' ||
        p.id.toLowerCase().includes('pig') ||
        p.id.toLowerCase().includes('pork') ||
        (p.name && /pig|pork|swine|bacon|ham|ඌරු/i.test(p.name)) ||
        (p.nameSi && /ඌරු/i.test(p.nameSi)) ||
        (p.nameTa && /பன்றி/i.test(p.nameTa)) ||
        (p.imageUrl && (p.imageUrl.includes('1588168333986') || p.imageUrl.includes('pig') || p.imageUrl.includes('pork')));

      if (isPigOrPork) {
        try {
          await deleteDoc(doc(db, PRODUCTS_COLLECTION, p.id));
        } catch {
          // ignore
        }
        continue;
      }

      // Proactively ensure fresh farm brown eggs photo and 100% Halal label
      if (p.id === 'meat-eggs-10') {
        const needsEggUpdate = 
          !p.imageUrl || 
          p.imageUrl.includes('1516467508483') || 
          !p.imageUrl.includes('1582722872445') ||
          !p.name.includes('Halal') ||
          !p.badge?.includes('Halal');

        if (needsEggUpdate) {
          p = {
            ...p,
            name: 'Fresh Farm Brown Eggs (10-Pack) - 100% Halal',
            imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80',
            badge: '100% Halal Fresh Eggs',
            origin: 'Kurunegala Layer Farms (100% Halal)',
          };
          try {
            await setDoc(doc(db, PRODUCTS_COLLECTION, p.id), p, { merge: true });
          } catch {
            // ignore
          }
        }
      }

      // Ensure chicken items have prominent 100% Halal badges
      if (p.id === 'meat-chicken-curry' && !p.badge?.includes('Halal')) {
        p = {
          ...p,
          name: 'Fresh Whole Chicken (Skinless Curry Cut) - 100% Halal',
          badge: '100% Halal Certified',
        };
      }
      if (p.id === 'meat-chicken-breast' && !p.badge?.includes('Halal')) {
        p = {
          ...p,
          name: 'Fresh Boneless Chicken Breast Fillet - 100% Halal',
          badge: '100% Halal Certified',
        };
      }

      products.push(p);
    }

    // Check if new departments (meat, fruits, or new grocery staples) are missing in the existing DB
    const existingIds = new Set(products.map((p) => p.id));
    const missingProducts = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
    if (missingProducts.length > 0) {
      // Seed missing products in background
      for (const missing of missingProducts) {
        try {
          await setDoc(doc(db, PRODUCTS_COLLECTION, missing.id), missing, { merge: true });
          products.push(missing);
        } catch {
          // silently continue
        }
      }
    }

    return products.length > 0 ? products : INITIAL_PRODUCTS;
  } catch (error) {
    console.warn('Falling back to local product catalogue due to error:', error);
    return INITIAL_PRODUCTS;
  }
}

export async function seedDefaultProducts(): Promise<void> {
  for (const prod of INITIAL_PRODUCTS) {
    const prodRef = doc(db, PRODUCTS_COLLECTION, prod.id);
    await setDoc(prodRef, prod, { merge: true });
  }
}

export async function saveProduct(product: Product): Promise<void> {
  try {
    const prodRef = doc(db, PRODUCTS_COLLECTION, product.id);
    await setDoc(prodRef, {
      ...product,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COLLECTION}/${product.id}`);
  }
}

export async function toggleProductStock(productId: string, inStock: boolean): Promise<void> {
  try {
    const prodRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(prodRef, {
      inStock,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const prodRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(prodRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}
