import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CustomerUser, SavedLocation, Order } from '../types';
import { cleanPhoneForWhatsApp } from '../utils/formatters';

const USERS_COLLECTION = 'users';
const ORDERS_COLLECTION = 'orders';
const CUSTOMER_STORAGE_KEY = 'matale_customer_user';

export function getCleanPhoneId(phone: string): string {
  const clean = cleanPhoneForWhatsApp(phone.trim());
  return `usr_${clean}`;
}

/**
 * Gets currently logged-in customer from local storage
 */
export function getStoredCustomer(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sets currently logged-in customer to local storage
 */
export function setStoredCustomer(user: CustomerUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Storage set error:', e);
  }
}

/**
 * Saves customer profile to Firestore and syncs local storage
 */
export async function saveCustomerUser(user: CustomerUser): Promise<CustomerUser> {
  const updatedUser: CustomerUser = {
    ...user,
    updatedAt: new Date().toISOString(),
  };

  // Keep local storage synchronized
  setStoredCustomer(updatedUser);

  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(updatedUser)), { merge: true });
  } catch (error) {
    console.warn('Firestore user save warning, saved locally:', error);
  }

  return updatedUser;
}

/**
 * Looks up customer by phone number from Firestore or local cache
 */
export async function getCustomerUserByPhone(phone: string): Promise<CustomerUser | null> {
  const cleanPhone = cleanPhoneForWhatsApp(phone.trim());
  const userId = getCleanPhoneId(phone);

  // 1. Try direct doc lookup
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CustomerUser;
    }
  } catch (e) {
    console.warn('Error fetching user by ID:', e);
  }

  // 2. Try query by phone field
  try {
    const q = query(collection(db, USERS_COLLECTION), where('phone', '==', cleanPhone));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CustomerUser;
    }
  } catch (e) {
    console.warn('Query by phone warning:', e);
  }

  // 3. Fallback to local storage
  const stored = getStoredCustomer();
  if (stored && cleanPhoneForWhatsApp(stored.phone) === cleanPhone) {
    return stored;
  }

  return null;
}

/**
 * Sign up a new customer with mobile number and full name
 */
export async function signupCustomer(params: {
  fullName: string;
  phone: string;
  pin?: string;
  initialLocation?: {
    area: string;
    streetAddress: string;
    label?: string;
    deliveryInstructions?: string;
  };
}): Promise<CustomerUser> {
  const cleanPhone = cleanPhoneForWhatsApp(params.phone.trim());
  const userId = getCleanPhoneId(params.phone);
  const now = new Date().toISOString();

  // Check if user already exists
  const existing = await getCustomerUserByPhone(cleanPhone);
  if (existing) {
    // Update existing user with latest info
    const updatedUser: CustomerUser = {
      ...existing,
      fullName: params.fullName.trim() || existing.fullName,
      pin: params.pin || existing.pin,
      updatedAt: now,
    };

    if (params.initialLocation && params.initialLocation.streetAddress.trim()) {
      const loc: SavedLocation = {
        id: `loc_${Date.now()}`,
        label: params.initialLocation.label || 'Home',
        area: params.initialLocation.area,
        streetAddress: params.initialLocation.streetAddress.trim(),
        deliveryInstructions: params.initialLocation.deliveryInstructions?.trim() || '',
        isDefault: (existing.savedLocations || []).length === 0,
      };
      updatedUser.savedLocations = [...(existing.savedLocations || []), loc];
      updatedUser.currentLocation = loc;
    }

    return await saveCustomerUser(updatedUser);
  }

  // Create new customer profile
  const savedLocations: SavedLocation[] = [];
  let currentLocation: SavedLocation | undefined = undefined;

  if (params.initialLocation && params.initialLocation.streetAddress.trim()) {
    const loc: SavedLocation = {
      id: `loc_${Date.now()}`,
      label: params.initialLocation.label || 'Home',
      area: params.initialLocation.area,
      streetAddress: params.initialLocation.streetAddress.trim(),
      deliveryInstructions: params.initialLocation.deliveryInstructions?.trim() || '',
      isDefault: true,
    };
    savedLocations.push(loc);
    currentLocation = loc;
  }

  const newUser: CustomerUser = {
    id: userId,
    fullName: params.fullName.trim(),
    phone: cleanPhone,
    pin: params.pin?.trim() || '1234',
    savedLocations,
    currentLocation,
    createdAt: now,
    updatedAt: now,
  };

  return await saveCustomerUser(newUser);
}

/**
 * Log in an existing customer using phone number and PIN
 */
export async function loginCustomer(
  phone: string,
  pin?: string
): Promise<{ success: boolean; user?: CustomerUser; error?: string }> {
  const cleanPhone = cleanPhoneForWhatsApp(phone.trim());
  const user = await getCustomerUserByPhone(cleanPhone);

  if (!user) {
    return {
      success: false,
      error: 'Account not found with this mobile number. Please Sign Up to create your account.',
    };
  }

  // If PIN check is specified and user has a PIN
  if (pin && user.pin && user.pin !== pin.trim()) {
    return {
      success: false,
      error: 'Incorrect PIN. Please re-enter your 4-digit PIN.',
    };
  }

  setStoredCustomer(user);
  return {
    success: true,
    user,
  };
}

/**
 * Adds a new delivery location for the customer
 */
export async function addCustomerLocation(
  user: CustomerUser,
  locationData: {
    label: string;
    area: string;
    streetAddress: string;
    deliveryInstructions?: string;
    setAsCurrent?: boolean;
  }
): Promise<CustomerUser> {
  const newLocation: SavedLocation = {
    id: `loc_${Date.now()}`,
    label: locationData.label.trim() || 'Home',
    area: locationData.area,
    streetAddress: locationData.streetAddress.trim(),
    deliveryInstructions: locationData.deliveryInstructions?.trim() || '',
    isDefault: locationData.setAsCurrent || (user.savedLocations || []).length === 0,
  };

  let updatedLocations = user.savedLocations || [];
  if (newLocation.isDefault) {
    updatedLocations = updatedLocations.map((l) => ({ ...l, isDefault: false }));
  }
  updatedLocations.push(newLocation);

  const updatedUser: CustomerUser = {
    ...user,
    savedLocations: updatedLocations,
    currentLocation: newLocation.isDefault ? newLocation : user.currentLocation || newLocation,
  };

  return await saveCustomerUser(updatedUser);
}

/**
 * Sets one of the saved locations as the active current delivery location
 */
export async function setCurrentLocation(
  user: CustomerUser,
  locationId: string
): Promise<CustomerUser> {
  const target = (user.savedLocations || []).find((l) => l.id === locationId);
  if (!target) return user;

  const updatedLocations = (user.savedLocations || []).map((l) => ({
    ...l,
    isDefault: l.id === locationId,
  }));

  const updatedUser: CustomerUser = {
    ...user,
    savedLocations: updatedLocations,
    currentLocation: { ...target, isDefault: true },
  };

  return await saveCustomerUser(updatedUser);
}

/**
 * Removes a saved location
 */
export async function deleteCustomerLocation(
  user: CustomerUser,
  locationId: string
): Promise<CustomerUser> {
  const updatedLocations = (user.savedLocations || []).filter((l) => l.id !== locationId);
  let nextCurrent = user.currentLocation;
  if (user.currentLocation?.id === locationId) {
    nextCurrent = updatedLocations[0] || undefined;
  }

  const updatedUser: CustomerUser = {
    ...user,
    savedLocations: updatedLocations,
    currentLocation: nextCurrent,
  };

  return await saveCustomerUser(updatedUser);
}

/**
 * Fetches all orders for a specific customer (matching by phone or customerId)
 */
export async function getCustomerOrders(phone: string, customerId?: string): Promise<Order[]> {
  const cleanPhone = cleanPhoneForWhatsApp(phone.trim());
  const foundOrders: Order[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch from Firestore by phone
  try {
    const q1 = query(
      collection(db, ORDERS_COLLECTION),
      where('phone', '==', cleanPhone),
      orderBy('createdAt', 'desc')
    );
    const snap1 = await getDocs(q1);
    snap1.forEach((d) => {
      const ord = d.data() as Order;
      if (!seenIds.has(ord.id)) {
        seenIds.add(ord.id);
        foundOrders.push(ord);
      }
    });
  } catch (e) {
    console.warn('Orders query by cleanPhone warning:', e);
  }

  // 2. Fetch from Firestore by customerId if available
  if (customerId) {
    try {
      const q2 = query(
        collection(db, ORDERS_COLLECTION),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );
      const snap2 = await getDocs(q2);
      snap2.forEach((d) => {
        const ord = d.data() as Order;
        if (!seenIds.has(ord.id)) {
          seenIds.add(ord.id);
          foundOrders.push(ord);
        }
      });
    } catch (e) {
      console.warn('Orders query by customerId warning:', e);
    }
  }

  // 3. Fallback: check local storage orders
  try {
    const localRaw = localStorage.getItem('matale_local_orders');
    if (localRaw) {
      const localList: Order[] = JSON.parse(localRaw);
      for (const ord of localList) {
        if (!seenIds.has(ord.id)) {
          if (
            cleanPhoneForWhatsApp(ord.phone) === cleanPhone ||
            (customerId && ord.customerId === customerId)
          ) {
            seenIds.add(ord.id);
            foundOrders.push(ord);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Local orders lookup warning:', e);
  }

  return foundOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
