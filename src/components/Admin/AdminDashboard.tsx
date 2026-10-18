import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Printer, 
  Phone, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  ShieldAlert, 
  LogOut, 
  Lock, 
  Truck, 
  Package, 
  Check, 
  X,
  Volume2,
  ExternalLink,
  Building2,
  CreditCard,
  Flame,
  Tag,
  Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo, logoImage } from '../Logo';
import { Order, OrderStatus, Product, Supplier, SupplierId, getProductDivision } from '../../types';
import { 
  subscribeToOrders, 
  updateOrderStatus, 
  updateOrderAdminAdjustments 
} from '../../services/orderService';
import { 
  fetchProducts, 
  saveProduct, 
  toggleProductStock, 
  deleteProduct, 
  seedDefaultProducts 
} from '../../services/productService';
import { 
  fetchSuppliers, 
  generateSupplierShoppingList, 
  SupplierShoppingItemSummary 
} from '../../services/supplierService';
import { 
  formatLKR, 
  formatDateLK, 
  getStatusColor, 
  playNewOrderSound, 
  cleanPhoneForWhatsApp 
} from '../../utils/formatters';
import { 
  getAdminWhatsAppNumber, 
  setAdminWhatsAppNumber, 
  getAdminWhatsAppUrl, 
  buildAdminOrderWhatsAppMessage,
  BankAccountDetails,
  fetchBankAccounts,
  saveBankAccounts,
  subscribeToBankAccounts,
  DEFAULT_BANK_ACCOUNTS
} from '../../utils/bankAndWhatsApp';
import { PrintShoppingList } from '../Print/PrintShoppingList';
import { PrintCustomerInvoice } from '../Print/PrintCustomerInvoice';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, adminEmail, authError, clearAuthError, signInWithGoogle, signInWithPasskey, signOut } = useAuth();

  // Navigation tab: 'orders' | 'suppliers' | 'products' | 'banks' | 'analytics'
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers' | 'products' | 'banks' | 'analytics'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin WhatsApp Settings State
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>(getAdminWhatsAppNumber());
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);

  // Passkey Login State for Strict Admin Access
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Suppliers & Lists State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeSupplierId, setActiveSupplierId] = useState<SupplierId>('vegetable_shop');
  const [printableSupplier, setPrintableSupplier] = useState<{
    supplier: Supplier;
    items: SupplierShoppingItemSummary[];
  } | null>(null);
  const [printableOrderInvoice, setPrintableOrderInvoice] = useState<Order | null>(null);
  const [supplierPrivacyMode, setSupplierPrivacyMode] = useState(false);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');

  // Cancel order modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');

  // Bank Accounts Management State
  const [bankAccounts, setBankAccounts] = useState<BankAccountDetails[]>(DEFAULT_BANK_ACCOUNTS);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccountDetails | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Real-time Firestore sync for orders & bank accounts
  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeBanks: (() => void) | undefined;

    try {
      unsubscribeOrders = subscribeToOrders((newOrders) => {
        // Check if a new order was added
        if (previousOrderCount > 0 && newOrders.length > previousOrderCount) {
          if (soundEnabled) {
            playNewOrderSound();
          }
        }
        setPreviousOrderCount(newOrders.length);
        setOrders(newOrders);
        setLoading(false);

        // Keep selected order updated in real time if open
        if (selectedOrder) {
          const updated = newOrders.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      });

      // Subscribe to bank accounts
      unsubscribeBanks = subscribeToBankAccounts((accounts) => {
        setBankAccounts(accounts);
      });
    } catch (err) {
      console.warn('Real-time listener setup note:', err);
      setLoading(false);
    }

    loadSuppliersAndProducts();

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeBanks) unsubscribeBanks();
    };
  }, [previousOrderCount, soundEnabled]);

  const loadSuppliersAndProducts = async () => {
    try {
      const [sups, prods] = await Promise.all([fetchSuppliers(), fetchProducts()]);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading catalogues:', err);
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Status update handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      showNotification(`Order ${orderId} marked as ${newStatus}`);
    } catch (err) {
      alert('Failed to update status. Check connection.');
    }
  };

  // Cancel order handler
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      await updateOrderStatus(
        cancelModalOrder.id,
        'Cancelled',
        `Cancelled: ${cancelReason}`,
        cancelReason
      );
      setCancelModalOrder(null);
      showNotification(`Order ${cancelModalOrder.id} cancelled.`);
    } catch (err) {
      alert('Failed to cancel order.');
    }
  };

  // Adjust item quantities or actual purchase costs
  const handleItemAdjustment = async (
    order: Order,
    itemIndex: number,
    field: 'confirmedQuantity' | 'actualPurchaseCost' | 'status' | 'substitutionNote',
    val: unknown
  ) => {
    const updatedItems = [...order.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: val,
    };

    // Recalculate actual subtotal if confirmed quantities changed
    const newActualSubtotal = updatedItems.reduce((sum, it) => {
      if (it.status === 'out_of_stock') return sum;
      const qty = it.confirmedQuantity !== undefined ? it.confirmedQuantity : it.quantity;
      return sum + it.customerPrice * qty;
    }, 0);

    const actualTotalAmount = newActualSubtotal + (order.deliveryFee || 0);

    // Calculate total procurement purchase cost
    const totalPurchaseCost = updatedItems.reduce((sum, it) => {
      if (it.status === 'out_of_stock') return sum;
      const qty = it.confirmedQuantity !== undefined ? it.confirmedQuantity : it.quantity;
      const cost = it.actualPurchaseCost || (it.customerPrice * 0.8);
      return sum + cost * qty;
    }, 0);

    try {
      await updateOrderAdminAdjustments(order.id, {
        items: updatedItems,
        actualSubtotal: newActualSubtotal,
        actualTotalAmount,
        totalPurchaseCost,
      });
      showNotification('Item record updated in database.');
    } catch (err) {
      alert('Error updating item adjustment.');
    }
  };

  // Adjust delivery fee or delivery expense
  const handleFeeAdjustment = async (
    order: Order,
    deliveryFee: number,
    deliveryExpense?: number
  ) => {
    const actualSubtotal = order.actualSubtotal || order.subtotal;
    const actualTotalAmount = actualSubtotal + deliveryFee;

    try {
      await updateOrderAdminAdjustments(order.id, {
        deliveryFee,
        actualTotalAmount,
        deliveryExpense: deliveryExpense !== undefined ? deliveryExpense : order.deliveryExpense,
      });
      showNotification('Delivery fees updated.');
    } catch (err) {
      alert('Error saving delivery fee.');
    }
  };

  // Product Save / Edit
  const handleSaveProduct = async (productToSave: Product) => {
    try {
      await saveProduct(productToSave);
      setEditingProduct(null);
      setIsAddingProduct(false);
      const prods = await fetchProducts();
      setProducts(prods);
      showNotification(`Product "${productToSave.name}" saved.`);
    } catch (err) {
      alert('Error saving product.');
    }
  };

  // Product Delete
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      showNotification('Product removed.');
    } catch (err) {
      alert('Error deleting product.');
    }
  };

  // Bank Account CRUD
  const handleSaveBankAccount = async (bankToSave: BankAccountDetails) => {
    try {
      let updated: BankAccountDetails[];
      if (isAddingBank) {
        updated = [...bankAccounts, bankToSave];
      } else {
        updated = bankAccounts.map((b) => (b.id === bankToSave.id ? bankToSave : b));
      }
      setBankAccounts(updated);
      await saveBankAccounts(updated);
      setEditingBankAccount(null);
      setIsAddingBank(false);
      showNotification(`Bank account "${bankToSave.bankName}" saved.`);
    } catch (err) {
      alert('Error saving bank account.');
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;
    try {
      const updated = bankAccounts.filter((b) => b.id !== id);
      setBankAccounts(updated);
      await saveBankAccounts(updated);
      showNotification('Bank account removed.');
    } catch (err) {
      alert('Error deleting bank account.');
    }
  };

  const handleToggleBankActive = async (id: string) => {
    try {
      const updated = bankAccounts.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
      setBankAccounts(updated);
      await saveBankAccounts(updated);
      showNotification('Bank account status updated.');
    } catch (err) {
      alert('Error updating bank status.');
    }
  };

  // CSV Export for Orders & Financials
  const exportToCSV = () => {
    if (orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Date (SL)',
      'Customer Name',
      'Phone',
      'Matale Area',
      'Address',
      'Status',
      'Items Count',
      'Estimated Subtotal',
      'Actual Subtotal',
      'Delivery Fee',
      'Final Total',
      'Purchase Cost',
      'Delivery Expense',
      'Gross Profit',
      'Items Summary',
    ];

    const rows = orders.map((o) => {
      const actualSub = o.actualSubtotal || o.subtotal;
      const actualTot = o.actualTotalAmount || o.totalAmount;
      const cost = o.totalPurchaseCost || actualSub * 0.8;
      const delExp = o.deliveryExpense || 120;
      const profit = actualTot - cost - delExp;
      const itemsList = o.items
        .map((i) => `${i.productName} (${i.quantity} ${i.unit})`)
        .join('; ');

      return [
        o.id,
        `"${formatDateLK(o.createdAt)}"`,
        `"${o.customerName}"`,
        `"${o.phone}"`,
        `"${o.area}"`,
        `"${o.deliveryAddress.replace(/"/g, '""')}"`,
        o.status,
        o.itemCount,
        o.subtotal,
        actualSub,
        o.deliveryFee,
        actualTot,
        cost.toFixed(2),
        delExp.toFixed(2),
        profit.toFixed(2),
        `"${itemsList}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `matale_fresh_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial calculations
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.actualTotalAmount || o.totalAmount), 0);

  const totalProcurementCost = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalPurchaseCost || (o.actualSubtotal || o.subtotal) * 0.8), 0);

  const totalDeliveryExpenses = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.deliveryExpense || 120), 0);

  const estimatedGrossProfit = totalRevenue - totalProcurementCost - totalDeliveryExpenses;

  // Filtered orders
  const pendingOrders = orders.filter((o) => o.status === 'Pending');
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.area.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameSi && p.nameSi.toLowerCase().includes(q)) ||
      (p.nameTa && p.nameTa.toLowerCase().includes(q)) ||
      (p.offerLabel && p.offerLabel.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q));

    const matchesCategory =
      productCategoryFilter === 'all' ||
      (productCategoryFilter === 'offers' && p.isOffer && p.offerPrice && p.offerPrice < p.price) ||
      (productCategoryFilter === 'vegetables' && getProductDivision(p.category) === 'vegetables') ||
      (productCategoryFilter === 'fruits' && getProductDivision(p.category) === 'fruits') ||
      (productCategoryFilter === 'meat' && getProductDivision(p.category) === 'meat') ||
      (productCategoryFilter === 'groceries' && getProductDivision(p.category) === 'groceries') ||
      p.supplierId === productCategoryFilter ||
      p.category === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Selected supplier object
  const currentSupplierObj =
    suppliers.find((s) => s.id === activeSupplierId) || suppliers[0];
  const activeSupplierShoppingList = currentSupplierObj
    ? generateSupplierShoppingList(orders, currentSupplierObj.id)
    : [];

  // ==========================================
  // AUTHENTICATION VIEW IF NOT ADMIN
  // ==========================================
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200/80 p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-950">Store Operations Portal</h2>
            <p className="text-xs text-rose-600 font-bold mt-1">
              Access Restricted — Authorized Administrator Only
            </p>
          </div>

          {/* Auth Error Display */}
          {(authError || passkeyError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs text-left flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{authError || passkeyError}</span>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-800 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-gray-700">
              <Lock className="w-4 h-4 text-emerald-600" />
              Designated Super Admin Account:
            </p>
            <p className="font-mono text-[11px] text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-gray-200 font-bold">
              {adminEmail}
            </p>
          </div>

          <div className="space-y-4">
            {/* Primary Google Auth for fmirfan76@gmail.com */}
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-xs flex items-center justify-center gap-2 transition-all hover:border-gray-400"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4"
              />
              <span>Sign In with Admin Google Account</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="shrink mx-3 text-[10px] text-gray-400 font-bold uppercase">
                or admin security passkey
              </span>
              <div className="flex-grow border-t border-gray-200" />
            </div>

            {/* Secure Admin Passkey Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasskeyError(null);
                if (!passkeyInput.trim()) {
                  setPasskeyError('Please enter the Administrator Passkey.');
                  return;
                }
                const ok = signInWithPasskey(passkeyInput.trim());
                if (!ok) {
                  setPasskeyError('Access Denied: Incorrect Admin Security Passkey.');
                }
              }}
              className="space-y-2 text-left"
            >
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Master Admin Passkey:
                </label>
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Enter administrator passkey..."
                  className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify & Unlock Admin Panel</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN ADMIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100/70 pb-16">
      {/* Top Admin Sub-bar */}
      <div className="bg-emerald-950 text-white px-4 py-2 text-xs border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Matale Central Operations Hub</span>
            <span className="text-emerald-400">|</span>
            <span className="text-emerald-300">
              Admin: {user?.email || adminEmail}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                soundEnabled ? 'bg-emerald-800 text-emerald-200' : 'bg-gray-800 text-gray-400'
              }`}
              title="Toggle audio alert on incoming orders"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Chime {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-emerald-300 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Success Alert Banner */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-between animate-in fade-in">
            <span>✓ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="p-0.5 hover:bg-emerald-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard Top Title & Metric Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-gray-200 shadow-xs shrink-0 overflow-hidden">
              <img src={logoImage} alt="Matale Fresh" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                Central Order & Supplier Manager
              </h1>
              <p className="text-xs text-gray-500">
                Collect from Matale Pola & Supermarket • Combined Delivery Logistics
              </p>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
              {pendingOrders.length > 0 && (
                <span className="bg-amber-400 text-emerald-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {pendingOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'suppliers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Shopping Lists</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'products'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Catalogue</span>
            </button>

            <button
              onClick={() => setActiveTab('banks')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'banks'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Bank Accounts</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Financials</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ORDERS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Admin WhatsApp Alert Config Bar */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-emerald-950 text-sm">
                    Admin WhatsApp for Order Notifications
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Incoming order notifications, grocery lists, and slips will be sent to this WhatsApp number.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={adminWhatsApp}
                  onChange={(e) => setAdminWhatsApp(e.target.value)}
                  placeholder="e.g. 0771234567 or 94771234567"
                  className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-emerald-600 w-44"
                />
                <button
                  type="button"
                  disabled={isSavingWhatsApp}
                  onClick={async () => {
                    setIsSavingWhatsApp(true);
                    try {
                      await setAdminWhatsAppNumber(adminWhatsApp);
                      showNotification(`Admin WhatsApp updated to: +${cleanPhoneForWhatsApp(adminWhatsApp)}`);
                    } catch (e) {
                      alert('Failed to save WhatsApp number to database.');
                    } finally {
                      setIsSavingWhatsApp(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSavingWhatsApp ? 'Saving...' : 'Save Number'}
                </button>
                <a
                  href={`https://wa.me/${cleanPhoneForWhatsApp(adminWhatsApp)}?text=${encodeURIComponent(
                    `*Matale Fresh Test Alert*\nYour WhatsApp notification number is active and connected to the Matale Fresh Ordering System!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                  title="Test WhatsApp connection"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Alert</span>
                </a>
              </div>
            </div>

            {/* Prominent New Orders Banner */}
            {pendingOrders.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0">
                    🔔
                  </div>
                  <div>
                    <h3 className="font-black text-sm">
                      {pendingOrders.length} New Customer {pendingOrders.length === 1 ? 'Order' : 'Orders'} Awaiting Confirmation!
                    </h3>
                    <p className="text-xs text-amber-100">
                      Verify items, coordinate with suppliers, and confirm order to start shopping.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStatusFilter('Pending')}
                  className="px-3.5 py-2 bg-white text-orange-900 rounded-xl text-xs font-extrabold hover:bg-amber-50 transition-colors shadow-xs shrink-0"
                >
                  View Pending
                </button>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Order ID, Customer, Phone, or Area..."
                  className="w-full text-xs pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {[
                  { id: 'all', label: 'All Orders' },
                  { id: 'Pending', label: 'Pending' },
                  { id: 'Confirmed', label: 'Confirmed' },
                  { id: 'Shopping', label: 'Shopping' },
                  { id: 'Packed', label: 'Packed' },
                  { id: 'Out for Delivery', label: 'Out for Delivery' },
                  { id: 'Delivered', label: 'Delivered' },
                  { id: 'Cancelled', label: 'Cancelled' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      statusFilter === s.id
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* CSV Export Button */}
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors shrink-0"
                title="Download CSV report of orders"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-500">
                <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-gray-800">No orders found matching filter</p>
                <p className="text-xs text-gray-400 mt-1">Orders placed on customer mobile phones appear here instantly.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const style = getStatusColor(order.status);
                  const vegItems = order.items.filter((i) => i.supplierId === 'vegetable_shop');
                  const smItems = order.items.filter((i) => i.supplierId === 'supermarket');
                  const isBank = order.paymentMethod === 'bank_transfer';

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-200/90 hover:border-emerald-300 hover:shadow-lg transition-all p-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: ID, Status, Placed Time */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {order.id}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDateLK(order.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${style.badge}`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Customer & Location */}
                        <div className="space-y-1 mb-2 text-xs">
                          <p className="font-extrabold text-gray-900 truncate">
                            {order.customerName}
                          </p>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-900 truncate">
                              {order.area}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[11px] line-clamp-1">
                            {order.deliveryAddress}
                          </p>
                        </div>

                        {/* Payment Method Badge */}
                        <div className="mb-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isBank
                                ? 'bg-blue-50 text-blue-900 border-blue-200'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            <span>{isBank ? '🏦' : '💵'}</span>
                            <span>{isBank ? 'Bank Transfer' : 'Cash on Delivery'}</span>
                          </span>
                        </div>

                        {/* Supplier Breakdown Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                          {vegItems.length > 0 && (
                            <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-100">
                              🥦 {vegItems.length} Vegetable items (Pola)
                            </span>
                          )}
                          {smItems.length > 0 && (
                            <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-100">
                              🛒 {smItems.length} Supermarket items
                            </span>
                          )}
                        </div>

                        {/* Items list preview */}
                        <div className="bg-gray-50 p-2 rounded-xl text-[11px] text-gray-700 space-y-0.5 mb-3 max-h-24 overflow-y-auto">
                          {order.items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="truncate">{it.productName}</span>
                              <span className="font-bold text-gray-900">
                                {it.quantity} {it.unit}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-[10px] text-gray-400 italic">
                              + {order.items.length - 3} more items...
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions & Status Stepper Buttons */}
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {isBank ? 'Total (Bank):' : 'Bill (COD):'}
                          </span>
                          <span className="font-black text-emerald-950 text-sm">
                            {formatLKR(order.actualTotalAmount || order.totalAmount)}
                          </span>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </button>

                          <a
                            href={getAdminWhatsAppUrl(order, adminWhatsApp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            title="Send order notification alert to your Admin WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Alert WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SUPPLIER SHOPPING LISTS */}
        {/* ======================================================== */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    Centralized Supplier Shopping Lists
                  </h2>
                  <p className="text-xs text-gray-500">
                    Aggregates items from active customer orders by supplier. Prepare dispatch lists for market buyers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Supplier Privacy Mode Switch */}
                  <button
                    onClick={() => setSupplierPrivacyMode(!supplierPrivacyMode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      supplierPrivacyMode
                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                    title="Supplier privacy filter restricts view to only permitted supplier data"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privacy Mode {supplierPrivacyMode ? 'Active' : 'Off'}</span>
                  </button>

                  {/* Print A4 List Button */}
                  <button
                    onClick={() => {
                      if (currentSupplierObj) {
                        setPrintableSupplier({
                          supplier: currentSupplierObj,
                          items: activeSupplierShoppingList,
                        });
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print A4 Shopping List</span>
                  </button>
                </div>
              </div>

              {/* Supplier Selection Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                {suppliers.map((sup) => (
                  <button
                    key={sup.id}
                    onClick={() => setActiveSupplierId(sup.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeSupplierId === sup.id
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{sup.id === 'vegetable_shop' ? '🥦' : sup.id === 'fruit_stall' ? '🍎' : sup.id === 'meat_shop' ? '🍗' : '🛒'}</span>
                    <span>{sup.name}</span>
                  </button>
                ))}
              </div>

              {/* Current Supplier Profile Banner */}
              {currentSupplierObj && (
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-gray-900">
                      Collection Point: {currentSupplierObj.location}
                    </span>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Contact: {currentSupplierObj.contactPhone} • Note: {currentSupplierObj.notes}
                    </p>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="text-gray-500">Items Needed:</span>{' '}
                    <strong className="text-emerald-950 font-bold">{activeSupplierShoppingList.length} products</strong>
                  </div>
                </div>
              )}

              {/* Aggregated List Table */}
              {activeSupplierShoppingList.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-700">No pending shopping items for this supplier.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    When customers place orders with {currentSupplierObj?.name}, items will automatically compile here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200">
                        <th className="p-3 font-bold">Product Name</th>
                        <th className="p-3 font-bold text-center">Unit</th>
                        <th className="p-3 font-bold text-center">Total Required Qty</th>
                        {!supplierPrivacyMode && (
                          <th className="p-3 font-bold text-right">Est. Procurement Budget</th>
                        )}
                        <th className="p-3 font-bold">Allocated Order Numbers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeSupplierShoppingList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80">
                          <td className="p-3 font-extrabold text-gray-900">
                            {item.productName}
                            {item.productNameSi && (
                              <span className="block text-[10px] text-gray-500 font-normal">
                                {item.productNameSi}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-gray-600">{item.unit}</td>
                          <td className="p-3 text-center">
                            <span className="font-black text-sm text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {item.totalQuantity}
                            </span>
                          </td>
                          {!supplierPrivacyMode && (
                            <td className="p-3 text-right font-mono font-bold text-gray-800">
                              {formatLKR(item.estimatedTotalCost)}
                            </td>
                          )}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {item.orderIds.map((oId) => (
                                <span
                                  key={oId}
                                  className="font-mono text-[10px] bg-white text-gray-700 px-1.5 py-0.5 rounded border border-gray-200"
                                >
                                  {oId}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRODUCT CATALOGUE MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search catalogue items..."
                  className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
                />
              </div>

              {/* Category Filter */}
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="text-xs py-2 px-3 border border-gray-200 rounded-xl bg-gray-50/50 font-medium"
              >
                <option value="all">All Departments ({products.length})</option>
                <option value="offers">
                  🔥 Special & Weekly Offers ({products.filter((p) => p.isOffer && p.offerPrice && p.offerPrice < p.price).length})
                </option>
                <option value="vegetables">🥦 Vegetables ({products.filter((p) => getProductDivision(p.category) === 'vegetables').length})</option>
                <option value="fruits">🍎 Fruits ({products.filter((p) => getProductDivision(p.category) === 'fruits').length})</option>
                <option value="meat">🍗 Chicken & Fish ({products.filter((p) => getProductDivision(p.category) === 'meat').length})</option>
                <option value="groceries">🛒 Groceries ({products.filter((p) => getProductDivision(p.category) === 'groceries').length})</option>
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (confirm('Reset catalogue to authentic Matale fresh produce defaults?')) {
                      await seedDefaultProducts();
                      const prods = await fetchProducts();
                      setProducts(prods);
                      showNotification('Catalogue re-seeded with defaults.');
                    }
                  }}
                  className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                  title="Reset to default seed catalogue"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingProduct({
                      id: `prod-${Date.now()}`,
                      name: '',
                      nameSi: '',
                      nameTa: '',
                      category: 'vegetables',
                      supplierId: 'vegetable_shop',
                      price: 200,
                      costPrice: 150,
                      unit: '500g',
                      minQuantity: 1,
                      step: 1,
                      inStock: true,
                      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
                      badge: 'Weekly Offer',
                      isOffer: false,
                      offerPrice: 0,
                      offerLabel: 'Weekly Offer',
                    });
                    setIsAddingProduct(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200">
                      <th className="p-3 font-bold">Image</th>
                      <th className="p-3 font-bold">Product Name</th>
                      <th className="p-3 font-bold">Supplier</th>
                      <th className="p-3 font-bold">Unit</th>
                      <th className="p-3 font-bold text-right">Selling Price</th>
                      <th className="p-3 font-bold text-center">Weekly / Special Offer</th>
                      <th className="p-3 font-bold text-right">Purchase Cost</th>
                      <th className="p-3 font-bold text-center">In Stock</th>
                      <th className="p-3 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/80">
                        <td className="p-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                          />
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          <div>{p.name}</div>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {p.nameSi} • {p.nameTa}
                          </div>
                        </td>
                        <td className="p-3">
                          {(() => {
                            const div = getProductDivision(p.category);
                            if (div === 'vegetables') {
                              return (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  🥦 Vegetables
                                </span>
                              );
                            }
                            if (div === 'fruits') {
                              return (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                                  🍎 Fruits
                                </span>
                              );
                            }
                            if (div === 'meat') {
                              return (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                  🍗 Chicken & Fish
                                </span>
                              );
                            }
                            return (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                🛒 Groceries
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-gray-600">{p.unit}</td>
                        <td className="p-3 text-right">
                          {p.isOffer && p.offerPrice && p.offerPrice < p.price ? (
                            <div>
                              <span className="font-extrabold text-rose-700 text-xs block">
                                {formatLKR(p.offerPrice)}
                              </span>
                              <span className="text-[10px] text-gray-400 line-through">
                                {formatLKR(p.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-emerald-950">
                              {formatLKR(p.price)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.isOffer && p.offerPrice && p.offerPrice < p.price ? (
                            <div className="inline-flex flex-col items-center">
                              <button
                                onClick={async () => {
                                  const updated = { ...p, isOffer: false };
                                  await saveProduct(updated);
                                  setProducts(products.map((item) => (item.id === p.id ? updated : item)));
                                  showNotification(`Offer deactivated for ${p.name}`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white text-[10px] font-black shadow-xs hover:opacity-90 transition-opacity"
                                title="Click to disable offer"
                              >
                                <Flame className="w-3 h-3 fill-amber-200 text-amber-200" />
                                <span>{p.offerLabel || 'Weekly Offer'}</span>
                              </button>
                              <span className="text-[9px] text-emerald-700 font-bold mt-0.5">
                                Save {formatLKR(p.price - p.offerPrice)} (-{Math.round(((p.price - p.offerPrice) / p.price) * 100)}%)
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                const defaultOffer = Math.round(p.price * 0.85); // 15% discount default
                                const updated = {
                                  ...p,
                                  isOffer: true,
                                  offerPrice: defaultOffer,
                                  offerLabel: 'Weekly Offer',
                                  badge: 'Weekly Offer'
                                };
                                await saveProduct(updated);
                                setProducts(products.map((item) => (item.id === p.id ? updated : item)));
                                showNotification(`Weekly Offer activated at ${formatLKR(defaultOffer)} for ${p.name}`);
                              }}
                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-900 border border-gray-200 text-[10px] font-bold transition-colors"
                              title="1-tap enable weekly offer"
                            >
                              + Set Offer
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {formatLKR(p.costPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={async () => {
                              await toggleProductStock(p.id, !p.inStock);
                              setProducts(
                                products.map((item) =>
                                  item.id === p.id ? { ...item, inStock: !item.inStock } : item
                                )
                              );
                              showNotification(`Stock state updated for ${p.name}`);
                            }}
                            className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${
                              p.inStock
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {p.inStock ? 'Available' : 'Deactivated'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsAddingProduct(false);
                              }}
                              className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: BANK ACCOUNTS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'banks' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                  <span>Direct Bank Transfer Accounts</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage official bank accounts for customer direct deposits. These accounts appear instantly on customer checkout & tracking.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingBankAccount({
                    id: `bank-${Date.now()}`,
                    bankName: '',
                    branch: 'Matale Branch',
                    accountName: 'Matale Fresh Grocery',
                    accountNumber: '',
                    swiftCode: '',
                    instructions: 'Use your Order ID as the deposit / transfer reference and WhatsApp the bank slip to our coordinator.',
                    isActive: true,
                  });
                  setIsAddingBank(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bank Account</span>
              </button>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={`bg-white rounded-3xl border p-5 shadow-2xs transition-all flex flex-col justify-between ${
                    bank.isActive
                      ? 'border-blue-200/80 hover:border-blue-400'
                      : 'border-gray-200 opacity-60 bg-gray-50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-100">
                          🏦
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-950">
                            {bank.bankName}
                          </h3>
                          <p className="text-xs text-gray-500">{bank.branch}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleBankActive(bank.id)}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full transition-colors ${
                          bank.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Toggle customer visibility"
                      >
                        {bank.isActive ? 'Active on Checkout' : 'Deactivated'}
                      </button>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Name:</span>
                        <span className="font-bold text-gray-900">{bank.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Account Number:</span>
                        <span className="font-mono font-black text-sm text-blue-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {bank.accountNumber}
                        </span>
                      </div>
                      {bank.swiftCode && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">SWIFT / Code:</span>
                          <span className="font-mono text-gray-700">{bank.swiftCode}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/60 leading-relaxed">
                      <strong>Customer Note:</strong> {bank.instructions}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
                    <button
                      onClick={() => {
                        setEditingBankAccount(bank);
                        setIsAddingBank(false);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Account</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBankAccount(bank.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: FINANCIALS & OPERATIONS ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Orders Placed
                </span>
                <div className="text-2xl font-black text-gray-950 mt-1">{orders.length}</div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Active in delivery pipeline: {orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length}
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Gross Revenue (LKR)
                </span>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {formatLKR(totalRevenue)}
                </div>
                <p className="text-[11px] text-emerald-600 mt-1">Cash on Delivery collections</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Supplier Purchase Cost
                </span>
                <div className="text-2xl font-black text-gray-800 mt-1">
                  {formatLKR(totalProcurementCost)}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Paid to Pola & Supermarket partners
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Estimated Gross Profit
                </span>
                <div className="text-2xl font-black text-teal-900 mt-1">
                  {formatLKR(estimatedGrossProfit)}
                </div>
                <p className="text-[11px] text-teal-700 font-semibold mt-1">
                  Net margin: {totalRevenue > 0 ? ((estimatedGrossProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            {/* Financial Log Table */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-950">Daily Sales & Settlement Records</h3>
                  <p className="text-xs text-gray-500">Breakdown of customer payments, supplier procurement costs, and delivery expenses.</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Financials CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                      <th className="p-3 font-bold">Order ID</th>
                      <th className="p-3 font-bold">Customer & Area</th>
                      <th className="p-3 font-bold text-right">Customer Total</th>
                      <th className="p-3 font-bold text-right">Wholesale Cost</th>
                      <th className="p-3 font-bold text-right">Rider / Fuel Exp.</th>
                      <th className="p-3 font-bold text-right">Gross Profit</th>
                      <th className="p-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => {
                      const actualTot = o.actualTotalAmount || o.totalAmount;
                      const cost = o.totalPurchaseCost || (o.actualSubtotal || o.subtotal) * 0.8;
                      const riderExp = o.deliveryExpense || 120;
                      const profit = actualTot - cost - riderExp;

                      return (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono font-bold text-emerald-950">{o.id}</td>
                          <td className="p-3">
                            <span className="font-bold text-gray-900">{o.customerName}</span>
                            <span className="block text-[10px] text-gray-500">{o.area}</span>
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-950">
                            {formatLKR(actualTot)}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-600">
                            {formatLKR(cost)}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-600">
                            {formatLKR(riderExp)}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${
                            profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {formatLKR(profit)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                getStatusColor(o.status).badge
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ORDER DETAILS MODAL / DRAWER */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black bg-emerald-800 px-2.5 py-0.5 rounded border border-emerald-700">
                    {selectedOrder.id}
                  </span>
                  <span
                    className={`text-xs font-extrabold px-3 py-0.5 rounded-full border ${
                      getStatusColor(selectedOrder.status).badge
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  Placed {formatDateLK(selectedOrder.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintableOrderInvoice(selectedOrder)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Contact & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Customer Information
                  </h4>
                  <p className="text-sm font-extrabold text-gray-900">{selectedOrder.customerName}</p>
                  <p className="text-gray-700 mt-0.5">Phone: {selectedOrder.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`tel:${selectedOrder.phone}`}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-bold text-xs flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp(selectedOrder.phone)}?text=${encodeURIComponent(
                        `Hello ${selectedOrder.customerName}, regarding your Matale Fresh Order ${selectedOrder.id}...`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Delivery Address & Area
                  </h4>
                  <p className="text-gray-800 font-semibold">{selectedOrder.deliveryAddress}</p>
                  <p className="text-emerald-800 font-extrabold mt-0.5">
                    Area: {selectedOrder.area}
                  </p>
                  {selectedOrder.deliveryInstructions && (
                    <p className="text-gray-500 italic mt-1 text-[11px]">
                      Directions: {selectedOrder.deliveryInstructions}
                    </p>
                  )}
                  {selectedOrder.orderNotes && (
                    <p className="text-amber-800 font-medium mt-1 text-[11px]">
                      Customer Produce Notes: {selectedOrder.orderNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Mode & Admin WhatsApp Notification */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-600">Payment Mode:</span>
                  <span className={`px-2.5 py-1 rounded-lg font-extrabold text-xs border ${
                    selectedOrder.paymentMethod === 'bank_transfer'
                      ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  }`}>
                    {selectedOrder.paymentMethod === 'bank_transfer' ? '🏦 Direct Bank Transfer' : '💵 Cash on Delivery (COD)'}
                  </span>
                </div>

                <a
                  href={getAdminWhatsAppUrl(selectedOrder, adminWhatsApp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Full Order Alert to Admin WhatsApp</span>
                </a>
              </div>

              {/* Status Update Actions */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Update Order Lifecycle Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Pending',
                      'Confirmed',
                      'Shopping',
                      'Packed',
                      'Out for Delivery',
                      'Delivered',
                    ] as OrderStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedOrder.status === st
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    onClick={() => setCancelModalOrder(selectedOrder)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 ml-auto"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

              {/* Items Table with Quantity & Cost Adjustments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Order Items Breakdown & Supplier Reconciliation
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    Adjust confirmed weight/price below
                  </span>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                        <th className="p-2.5 font-bold">Product</th>
                        <th className="p-2.5 font-bold">Supplier</th>
                        <th className="p-2.5 font-bold text-center">Req. Qty</th>
                        <th className="p-2.5 font-bold text-center">Confirmed Qty</th>
                        <th className="p-2.5 font-bold text-right">Selling Price</th>
                        <th className="p-2.5 font-bold text-right">Actual Cost (Wholesale)</th>
                        <th className="p-2.5 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70">
                          <td className="p-2.5 font-bold text-gray-900">
                            <div>{item.productName}</div>
                            <span className="text-[10px] text-gray-500 font-normal">
                              Unit: {item.unit}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                item.supplierId === 'vegetable_shop'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.supplierId === 'vegetable_shop' ? 'Market Pola' : 'Supermarket'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                item.confirmedQuantity !== undefined
                                  ? item.confirmedQuantity
                                  : item.quantity
                              }
                              onChange={(e) =>
                                handleItemAdjustment(
                                  selectedOrder,
                                  idx,
                                  'confirmedQuantity',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-16 text-center text-xs p-1 border border-gray-300 rounded font-bold"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                            {formatLKR(item.customerPrice)}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={item.actualPurchaseCost || (item.customerPrice * 0.8)}
                              onChange={(e) =>
                                handleItemAdjustment(
                                  selectedOrder,
                                  idx,
                                  'actualPurchaseCost',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 text-right text-xs p-1 border border-gray-300 rounded font-mono font-bold text-gray-700"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <select
                              value={item.status || 'available'}
                              onChange={(e) =>
                                handleItemAdjustment(
                                  selectedOrder,
                                  idx,
                                  'status',
                                  e.target.value
                                )
                              }
                              className="text-[11px] p-1 border border-gray-200 rounded font-medium"
                            >
                              <option value="available">Available</option>
                              <option value="substituted">Substituted</option>
                              <option value="out_of_stock">Out of Stock</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Fee Adjustment & Settlement Totals */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">Delivery Fee (LKR):</span>
                    <input
                      type="number"
                      step="10"
                      value={selectedOrder.deliveryFee}
                      onChange={(e) =>
                        handleFeeAdjustment(
                          selectedOrder,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-20 p-1 border border-gray-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">Rider / Fuel Cost (LKR):</span>
                    <input
                      type="number"
                      step="10"
                      value={selectedOrder.deliveryExpense || 120}
                      onChange={(e) =>
                        handleFeeAdjustment(
                          selectedOrder,
                          selectedOrder.deliveryFee,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-20 p-1 border border-gray-300 rounded text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-gray-500">
                    Adjusted Subtotal:{' '}
                    <strong className="text-gray-900 font-bold">
                      {formatLKR(selectedOrder.actualSubtotal || selectedOrder.subtotal)}
                    </strong>
                  </div>
                  <div className="text-base font-black text-emerald-950">
                    Final Agreed Bill:{' '}
                    <span>
                      {formatLKR(selectedOrder.actualTotalAmount || selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CANCEL ORDER MODAL */}
      {/* ======================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-rose-950">
              Cancel Order {cancelModalOrder.id}
            </h3>
            <p className="text-xs text-gray-600">
              Please enter the recorded cancellation reason. This will be visible on the customer tracking timeline.
            </p>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-300 rounded-xl"
            >
              <option value="Customer requested cancellation">Customer requested cancellation</option>
              <option value="Customer unreachable by phone">Customer unreachable by phone</option>
              <option value="Address outside active delivery area">Address outside active delivery area</option>
              <option value="Fresh produce unavailable at Pola today">Fresh produce unavailable at Pola today</option>
              <option value="Duplicate order submitted">Duplicate order submitted</option>
            </select>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRODUCT EDIT / ADD MODAL */}
      {/* ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-sm">
                {isAddingProduct ? 'Add New Product' : `Edit: ${editingProduct.name}`}
              </h3>
              <button onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Name (English)</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Sinhala Name</label>
                  <input
                    type="text"
                    value={editingProduct.nameSi}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nameSi: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tamil Name</label>
                  <input
                    type="text"
                    value={editingProduct.nameTa}
                    onChange={(e) => setEditingProduct({ ...editingProduct, nameTa: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Department / Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      let recommendedSup = editingProduct.supplierId;
                      if (newCat === 'vegetables' || newCat === 'greens') recommendedSup = 'vegetable_shop';
                      else if (newCat === 'fruits') recommendedSup = 'fruit_stall';
                      else if (newCat === 'meat') recommendedSup = 'meat_shop';
                      else recommendedSup = 'supermarket';
                      setEditingProduct({
                        ...editingProduct,
                        category: newCat,
                        supplierId: recommendedSup,
                      });
                    }}
                    className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white"
                  >
                    <option value="vegetables">🥦 Vegetables (Pola Harvest)</option>
                    <option value="fruits">🍎 Fruits (Tropical & Highland)</option>
                    <option value="meat">🍗 Chicken, Fish & Eggs (Halal)</option>
                    <option value="supermarket_staples">🛒 Groceries (Rice, Dhal, Staples)</option>
                    <option value="dairy_beverages">🥛 Dairy & Beverages (Milk, Tea)</option>
                    <option value="spices_condiments">🌶️ Spices (Curry & Chili Powder)</option>
                    <option value="greens">🌿 Leafy Greens & Herbs</option>
                    <option value="snacks_bakery">🍪 Biscuits & Instant Noodles</option>
                    <option value="household">🧼 Household Essentials</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Supplier Assignment</label>
                  <select
                    value={editingProduct.supplierId}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        supplierId: e.target.value as SupplierId,
                      })
                    }
                    className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white"
                  >
                    <option value="vegetable_shop">🥦 Pola Vegetable Stall #14</option>
                    <option value="fruit_stall">🍎 Fruit Market Stall #22</option>
                    <option value="meat_shop">🍗 Fresh Poultry, Eggs & Seafood Stall #08</option>
                    <option value="supermarket">🛒 Supermarket Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={editingProduct.unit}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                  placeholder="e.g. 500g, 1 kg, 1 piece, 1 bunch"
                  className="w-full p-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Estimated Cost (Rs.)</label>
                  <input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Special Price & Weekly Offer Setup */}
              <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span className="font-extrabold text-gray-900 text-xs">
                      Special Price / Weekly Offer
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.isOffer)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const defaultOffer = (!editingProduct.offerPrice || editingProduct.offerPrice === 0)
                          ? Math.round(editingProduct.price * 0.85)
                          : editingProduct.offerPrice;
                        setEditingProduct({
                          ...editingProduct,
                          isOffer: isChecked,
                          offerPrice: isChecked ? defaultOffer : editingProduct.offerPrice,
                          offerLabel: editingProduct.offerLabel || 'Weekly Offer',
                          badge: isChecked ? (editingProduct.offerLabel || 'Weekly Offer') : editingProduct.badge
                        });
                      }}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span>Activate Offer</span>
                  </label>
                </div>

                {editingProduct.isOffer && (
                  <div className="space-y-2.5 pt-2 border-t border-amber-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">
                          Offer Badge / Type
                        </label>
                        <select
                          value={editingProduct.offerLabel || 'Weekly Offer'}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              offerLabel: e.target.value,
                              badge: e.target.value,
                            })
                          }
                          className="w-full p-2 border border-amber-300 rounded-xl bg-white font-medium text-xs focus:border-amber-500 focus:outline-hidden"
                        >
                          <option value="Weekly Offer">🔥 Weekly Offer</option>
                          <option value="Special Price">⚡ Special Price</option>
                          <option value="Weekend Deal">🎉 Weekend Deal</option>
                          <option value="Pola Fresh Deal">🥦 Pola Fresh Deal</option>
                          <option value="Super Saver">🛒 Super Saver</option>
                          <option value="Flash Sale">💥 Flash Sale</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">
                          Offer Price (Rs.) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={editingProduct.offerPrice || ''}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              offerPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="e.g. 280"
                          className="w-full p-2 border border-amber-400 rounded-xl font-bold bg-white text-xs focus:border-amber-600 focus:outline-hidden text-rose-700"
                        />
                      </div>
                    </div>

                    {/* Instant Savings Feedback */}
                    {editingProduct.offerPrice && editingProduct.offerPrice > 0 ? (
                      editingProduct.offerPrice < editingProduct.price ? (
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                          <span className="font-medium">
                            Regular: <strong>{formatLKR(editingProduct.price)}</strong> → Offer: <strong>{formatLKR(editingProduct.offerPrice)}</strong>
                          </span>
                          <span className="font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                            Customer saves {formatLKR(editingProduct.price - editingProduct.offerPrice)} (-{Math.round(((editingProduct.price - editingProduct.offerPrice) / editingProduct.price) * 100)}%)
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 font-bold">
                          ⚠️ Offer price ({formatLKR(editingProduct.offerPrice)}) should be lower than regular price ({formatLKR(editingProduct.price)}) to show savings.
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] text-amber-800">
                        Enter the discounted price customers will pay for this item during the offer period.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingProduct.imageUrl}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                  }
                  className="w-full p-2 border border-gray-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stockCheck"
                  checked={editingProduct.inStock}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, inStock: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="stockCheck" className="font-bold text-gray-800">
                  Item is In-Stock & Active for Shoppers
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveProduct(editingProduct)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BANK ACCOUNT EDIT / ADD MODAL */}
      {/* ======================================================== */}
      {editingBankAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-gray-900 text-sm">
                  {isAddingBank ? 'Add Bank Transfer Account' : `Edit: ${editingBankAccount.bankName}`}
                </h3>
              </div>
              <button onClick={() => setEditingBankAccount(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveBankAccount(editingBankAccount);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Bank Name (e.g. Commercial Bank of Ceylon, Bank of Ceylon, Sampath Bank) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingBankAccount.bankName}
                  onChange={(e) => setEditingBankAccount({ ...editingBankAccount, bankName: e.target.value })}
                  placeholder="e.g. Commercial Bank of Ceylon"
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBankAccount.branch}
                    onChange={(e) => setEditingBankAccount({ ...editingBankAccount, branch: e.target.value })}
                    placeholder="e.g. Matale Branch"
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    SWIFT / Branch Code
                  </label>
                  <input
                    type="text"
                    value={editingBankAccount.swiftCode || ''}
                    onChange={(e) => setEditingBankAccount({ ...editingBankAccount, swiftCode: e.target.value })}
                    placeholder="e.g. CCEYLKX or 042"
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-mono focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Account Holder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingBankAccount.accountName}
                  onChange={(e) => setEditingBankAccount({ ...editingBankAccount, accountName: e.target.value })}
                  placeholder="e.g. Matale Fresh Grocery & Logistics"
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Bank Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingBankAccount.accountNumber}
                  onChange={(e) => setEditingBankAccount({ ...editingBankAccount, accountNumber: e.target.value })}
                  placeholder="e.g. 8004 9210 4452"
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-mono font-bold text-blue-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Deposit / WhatsApp Instructions for Customers:
                </label>
                <textarea
                  rows={2}
                  value={editingBankAccount.instructions}
                  onChange={(e) => setEditingBankAccount({ ...editingBankAccount, instructions: e.target.value })}
                  placeholder="e.g. Use Order ID as reference and WhatsApp the bank slip..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bankActiveCheck"
                  checked={editingBankAccount.isActive}
                  onChange={(e) =>
                    setEditingBankAccount({ ...editingBankAccount, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="bankActiveCheck" className="font-bold text-gray-800">
                  Account is Active & Visible to Customers on Checkout
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingBankAccount(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRINT DIALOG OVERLAYS */}
      {/* ======================================================== */}
      {printableSupplier && (
        <PrintShoppingList
          supplier={printableSupplier.supplier}
          items={printableSupplier.items}
          onClose={() => setPrintableSupplier(null)}
        />
      )}

      {printableOrderInvoice && (
        <PrintCustomerInvoice
          order={printableOrderInvoice}
          onClose={() => setPrintableOrderInvoice(null)}
        />
      )}
    </div>
  );
};
