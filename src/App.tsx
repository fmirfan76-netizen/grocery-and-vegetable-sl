import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomerProvider, useCustomer } from './context/CustomerContext';
import { Header } from './components/Header';
import { CustomerHome } from './components/Customer/CustomerHome';
import { CartDrawer } from './components/Customer/CartDrawer';
import { CheckoutModal } from './components/Customer/CheckoutModal';
import { OrderTrackingModal } from './components/Customer/OrderTrackingModal';
import { CustomerAuthModal } from './components/Customer/CustomerAuthModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { testConnection } from './firebase/config';
import { fetchProducts } from './services/productService';
import { subscribeToOrders } from './services/orderService';
import { Product, Order } from './types';
import { SupportedLanguage } from './utils/i18n';
import { ArrowRight, Lock, Phone } from 'lucide-react';
import { subscribeToAdminWhatsApp, getAdminWhatsAppNumber } from './utils/bankAndWhatsApp';
import { Logo } from './components/Logo';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';

function AppContent() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [secretClickCount, setSecretClickCount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  const [products, setProducts] = useState<Product[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<Order | null>(null);
  const [adminPhone, setAdminPhone] = useState<string>(getAdminWhatsAppNumber());

  const { isAdmin } = useAuth();
  const { isAuthModalOpen, closeAuthModal, openAuthModal, customer } = useCustomer();
  const [pendingCheckout, setPendingCheckout] = useState<boolean>(false);

  // When customer logs in or signs up while checking out, automatically transition to checkout
  useEffect(() => {
    if (customer && pendingCheckout) {
      setPendingCheckout(false);
      closeAuthModal();
      setIsCheckoutOpen(true);
    }
  }, [customer, pendingCheckout, closeAuthModal]);

  // Initialize and verify connection on mount
  useEffect(() => {
    testConnection().then((connected) => {
      if (connected) {
        console.log('Firebase connection verified successfully.');
      }
    });

    // Fetch initial products catalogue
    fetchProducts().then((prods) => {
      setProducts(prods);
    });

    // Subscribe to admin WhatsApp settings
    const unsubWa = subscribeToAdminWhatsApp((phone) => {
      if (phone) setAdminPhone(phone);
    });

    return () => {
      if (unsubWa) unsubWa();
    };
  }, []);

  // Check for admin trigger via URL param (?admin or #admin) or key shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const checkUrl = () => {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (search.includes('admin') || hash.includes('admin')) {
        if (isAdmin) {
          setIsAdminView(true);
        } else {
          setIsAdminLoginModalOpen(true);
        }
      }
    };
    checkUrl();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A or Cmd+Shift+A secret admin shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdmin) {
          setIsAdminView((prev) => !prev);
        } else {
          setIsAdminLoginModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  // Keep admin view strictly in sync with auth state: non-admins cannot stay in admin view
  useEffect(() => {
    if (!isAdmin && isAdminView) {
      setIsAdminView(false);
    }
  }, [isAdmin, isAdminView]);

  // Only subscribe to orders if authenticated as admin to maintain pending count
  useEffect(() => {
    if (!isAdmin) {
      setPendingOrdersCount(0);
      return;
    }

    try {
      const unsub = subscribeToOrders((orders) => {
        const pending = orders.filter((o) => o.status === 'Pending').length;
        setPendingOrdersCount(pending);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Admin order subscription note:', e);
    }
  }, [isAdmin]);

  const handleOrderSuccess = (order: Order) => {
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setNewlyCreatedOrder(order);
    setTrackingOrderId(order.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Main App Navigation Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingOrderId(newlyCreatedOrder?.id || '');
          setIsTrackingOpen(true);
        }}
        onOpenCustomerAuth={openAuthModal}
        onToggleAdmin={() => {
          if (isAdmin) {
            setIsAdminView(!isAdminView);
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
        isAdminView={isAdminView}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Placed Order Notification Banner if customer just finished checkout */}
      {newlyCreatedOrder && !isAdminView && (
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-4 py-3.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black">
                ✓
              </div>
              <div>
                <p className="font-black text-sm">
                  Order Placed Successfully! Order #{newlyCreatedOrder.id}
                </p>
                <p className="text-emerald-100 text-[11px]">
                  Our Matale coordinator will phone/WhatsApp you to verify produce weights and dispatch your delivery.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setTrackingOrderId(newlyCreatedOrder.id);
                  setIsTrackingOpen(true);
                }}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Track Status Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setNewlyCreatedOrder(null)}
                className="text-emerald-200 hover:text-white p-1 text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Router: Customer Shop vs Administrator Dashboard */}
      <main className="flex-1">
        {isAdminView && isAdmin ? (
          <AdminDashboard />
        ) : (
          <CustomerHome
            products={products}
            currentLang={currentLang}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenTracking={() => {
              setTrackingOrderId('');
              setIsTrackingOpen(true);
            }}
          />
        )}
      </main>

      {/* Footer with Matale details */}
      <footer className="bg-emerald-950 text-white border-t border-emerald-900 mt-auto text-xs py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Logo size="sm" textColor="text-white" subtextColor="text-emerald-300" />
            <p className="text-emerald-300 text-[11px] pt-1">
              Central market fresh vegetable & supermarket grocery delivery service serving Matale, Sri Lanka.
            </p>
            <p className="text-[10px] text-emerald-400">
              මාතලේ මධ්‍යම පොළ සහ ප්‍රධාන සුපිරි වෙළඳසැල් ජාලය.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">
              Coverage Areas
            </h4>
            <p className="text-emerald-300 text-[11px]">Matale Town • Aluvihare</p>
            <p className="text-emerald-300 text-[11px]">Mandandawela • Hulangamuwa</p>
            <p className="text-emerald-300 text-[11px]">Palapathwela • Kohombiliwela</p>
            <p className="text-emerald-300 text-[11px]">Ukuwela Road • Rattota Road</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">
              Operating Hours
            </h4>
            <p className="text-emerald-300 text-[11px]">Daily: 7:00 AM – 8:30 PM</p>
            <p className="text-emerald-300 text-[11px]">Morning Pola Collection: 9:30 AM</p>
            <p className="text-emerald-300 text-[11px]">Evening Dispatch: 4:30 PM</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">
              Order Hotline & Support
            </h4>
            <p className="text-emerald-300 text-[11px]">Hotline: 066 222 3481</p>
            <p className="text-emerald-300 text-[11px]">Admin WhatsApp: +{adminPhone}</p>
            <p className="text-[10px] text-emerald-400 mt-2">
              Payment: Cash on Delivery & Direct Bank Transfer
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 mt-6 border-t border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-emerald-400">
          <div>
            <span
              onClick={() => {
                const newCount = secretClickCount + 1;
                setSecretClickCount(newCount);
                if (newCount >= 5) {
                  setSecretClickCount(0);
                  if (isAdmin) {
                    setIsAdminView((v) => !v);
                  } else {
                    setIsAdminLoginModalOpen(true);
                  }
                }
              }}
              className="cursor-default select-none"
              title=""
            >
              ©
            </span>{' '}
            {new Date().getFullYear()} Matale Fresh Delivery. Serving Matale, Central Province, Sri Lanka.
          </div>

          {/* Admin toggle ONLY rendered if authenticated as admin (hidden completely from customers) */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setIsAdminView(!isAdminView)}
                className="flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>{isAdminView ? 'Switch to Customer Shop' : 'Open Admin Hub'}</span>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Customer Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          if (!customer) {
            setPendingCheckout(true);
            openAuthModal('login');
          } else {
            setIsCheckoutOpen(true);
          }
        }}
        currentLang={currentLang}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrderId={trackingOrderId}
      />

      {/* Customer Account & Order Status Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setPendingCheckout(false);
          closeAuthModal();
        }}
        onTrackOrder={(orderId) => {
          setTrackingOrderId(orderId);
          setIsTrackingOpen(true);
        }}
        isCheckoutPending={pendingCheckout}
      />

      {/* Discrete Administrator Login Modal (Never linked visibly to customers) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminLoginModalOpen(false);
          setIsAdminView(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}
