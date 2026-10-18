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
      const p = docSnap.data() as Product;
      // Proactively purge any unwanted item or offending pig image
      if (p.id === 'meat-beef-curry' || (p.imageUrl && p.imageUrl.includes('1588168333986'))) {
        try {
          await deleteDoc(doc(db, PRODUCTS_COLLECTION, p.id));
        } catch {
          // ignore
        }
      } else {
        products.push(p);
      }
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
