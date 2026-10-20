import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerUser, SavedLocation, Order } from '../types';
import { 
  getStoredCustomer, 
  setStoredCustomer, 
  signupCustomer, 
  loginCustomer, 
  addCustomerLocation, 
  setCurrentLocation, 
  deleteCustomerLocation, 
  getCustomerOrders 
} from '../services/userService';

interface CustomerContextType {
  customer: CustomerUser | null;
  isLoading: boolean;
  customerOrders: Order[];
  ordersLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup' | 'orders' | 'locations';
  openAuthModal: (tab?: 'login' | 'signup' | 'orders' | 'locations') => void;
  closeAuthModal: () => void;
  signup: (params: {
    fullName: string;
    phone: string;
    pin?: string;
    initialLocation?: {
      area: string;
      streetAddress: string;
      label?: string;
      deliveryInstructions?: string;
    };
  }) => Promise<{ success: boolean; error?: string; user?: CustomerUser }>;
  login: (phone: string, pin?: string) => Promise<{ success: boolean; error?: string; user?: CustomerUser }>;
  logout: () => void;
  addNewLocation: (locationData: {
    label: string;
    area: string;
    streetAddress: string;
    deliveryInstructions?: string;
    setAsCurrent?: boolean;
  }) => Promise<void>;
  selectLocation: (locationId: string) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerUser | null>(() => getStoredCustomer());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'orders' | 'locations'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'signup' | 'orders' | 'locations' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Fetch orders for customer
  const refreshOrders = useCallback(async () => {
    if (!customer?.phone) {
      setCustomerOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const orders = await getCustomerOrders(customer.phone, customer.id);
      setCustomerOrders(orders);
    } catch (err) {
      console.warn('Error refreshing customer orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [customer]);

  // Load orders when customer changes
  useEffect(() => {
    if (customer?.phone) {
      refreshOrders();
    } else {
      setCustomerOrders([]);
    }
  }, [customer?.phone, refreshOrders]);

  // Signup
  const signup = async (params: {
    fullName: string;
    phone: string;
    pin?: string;
    initialLocation?: {
      area: string;
      streetAddress: string;
      label?: string;
      deliveryInstructions?: string;
    };
  }) => {
    setIsLoading(true);
    try {
      const newUser = await signupCustomer(params);
      setCustomer(newUser);
      setStoredCustomer(newUser);
      return { success: true, user: newUser };
    } catch (err: any) {
      console.error('Customer signup error:', err);
      return { success: false, error: err?.message || 'Failed to create account. Please check your connection.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (phone: string, pin?: string) => {
    setIsLoading(true);
    try {
      const result = await loginCustomer(phone, pin);
      if (result.success && result.user) {
        setCustomer(result.user);
        setStoredCustomer(result.user);
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || 'Login failed. Please check your phone number.' };
      }
    } catch (err: any) {
      console.error('Customer login error:', err);
      return { success: false, error: err?.message || 'Unable to log in. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    setCustomer(null);
    setStoredCustomer(null);
    setCustomerOrders([]);
  };

  // Add location
  const addNewLocation = async (locationData: {
    label: string;
    area: string;
    streetAddress: string;
    deliveryInstructions?: string;
    setAsCurrent?: boolean;
  }) => {
    if (!customer) return;
    setIsLoading(true);
    try {
      const updated = await addCustomerLocation(customer, locationData);
      setCustomer(updated);
      setStoredCustomer(updated);
    } catch (err) {
      console.error('Error adding location:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select current location
  const selectLocation = async (locationId: string) => {
    if (!customer) return;
    try {
      const updated = await setCurrentLocation(customer, locationId);
      setCustomer(updated);
      setStoredCustomer(updated);
    } catch (err) {
      console.error('Error selecting location:', err);
    }
  };

  // Delete location
  const deleteLocation = async (locationId: string) => {
    if (!customer) return;
    try {
      const updated = await deleteCustomerLocation(customer, locationId);
      setCustomer(updated);
      setStoredCustomer(updated);
    } catch (err) {
      console.error('Error deleting location:', err);
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        customerOrders,
        ordersLoading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signup,
        login,
        logout,
        addNewLocation,
        selectLocation,
        deleteLocation,
        refreshOrders,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
