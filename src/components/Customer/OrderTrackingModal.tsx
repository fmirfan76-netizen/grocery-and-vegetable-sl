import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  Package, 
  Truck, 
  Home, 
  XCircle, 
  Phone, 
  MessageSquare, 
  AlertCircle,
  Copy, 
  Check, 
  Building2 
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Order, OrderStatus } from '../../types';
import { formatLKR, formatDateLK, getStatusColor, cleanPhoneForWhatsApp } from '../../utils/formatters';
import { 
  BankAccountDetails, 
  DEFAULT_BANK_ACCOUNTS, 
  subscribeToBankAccounts, 
  subscribeToAdminWhatsApp, 
  getAdminWhatsAppNumber 
} from '../../utils/bankAndWhatsApp';
import { logoImage } from '../Logo';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: 'Pending', label: 'Order Received', icon: Clock },
  { status: 'Confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { status: 'Shopping', label: 'Shopping at Pola & Supermarket', icon: ShoppingBag },
  { status: 'Packed', label: 'Weighed & Packed', icon: Package },
  { status: 'Out for Delivery', label: 'Rider Out for Delivery', icon: Truck },
  { status: 'Delivered', label: 'Delivered', icon: Home },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderId = '',
}) => {
  const [searchId, setSearchId] = useState(initialOrderId);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccountDetails[]>(DEFAULT_BANK_ACCOUNTS);
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>(getAdminWhatsAppNumber());

  useEffect(() => {
    let unsubBanks: (() => void) | undefined;
    let unsubWhatsApp: (() => void) | undefined;

    try {
      unsubBanks = subscribeToBankAccounts((accounts) => {
        if (accounts && accounts.length > 0) setBankAccounts(accounts);
      });
      unsubWhatsApp = subscribeToAdminWhatsApp((num) => {
        if (num) setAdminWhatsApp(num);
      });
    } catch (e) {
      console.warn('Real-time tracking settings listener note:', e);
    }

    return () => {
      if (unsubBanks) unsubBanks();
      if (unsubWhatsApp) unsubWhatsApp();
    };
  }, []);

  useEffect(() => {
    if (initialOrderId) {
      setSearchId(initialOrderId);
      loadOrder(initialOrderId);
    }
  }, [initialOrderId]);

  const loadOrder = (orderIdToFetch: string) => {
    const id = orderIdToFetch.trim();
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const orderRef = doc(db, 'orders', id);
      const unsub = onSnapshot(
        orderRef,
        (snap) => {
          setLoading(false);
          if (snap.exists()) {
            setActiveOrder(snap.data() as Order);
          } else {
            setError(`No order found with ID "${id}". Please check your order code.`);
            setActiveOrder(null);
          }
        },
        (err) => {
          setLoading(false);
          setError('Unable to load order. Please verify your connection.');
          console.warn('Order snapshot error:', err);
        }
      );

      return () => unsub();
    } catch (e) {
      setLoading(false);
      setError('Failed to initiate order search.');
    }
  };

  if (!isOpen) return null;

  const currentStepIndex = activeOrder
    ? STATUS_STEPS.findIndex((s) => s.status === activeOrder.status)
    : -1;

  const isCancelled = activeOrder?.status === 'Cancelled';

  const handleCopyId = () => {
    if (activeOrder) {
      navigator.clipboard.writeText(activeOrder.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBankAcc = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedBankAcc(true);
    setTimeout(() => setCopiedBankAcc(false), 2000);
  };

  const activeBankList = bankAccounts.filter((b) => b.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shrink-0 overflow-hidden shadow-xs">
              <img src={logoImage} alt="Matale Fresh" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">Track Your Delivery</h2>
              <p className="text-xs text-emerald-200">
                Live updates from Matale Pola and Supermarket dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadOrder(searchId);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                placeholder="Enter Order Code (e.g. MTL-2026-4821)"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-white uppercase font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              {loading ? 'Finding...' : 'Track'}
            </button>
          </form>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Order Not Found</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!activeOrder && !error && !loading && (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                📦
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Track Your Grocery & Vegetable Order
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Enter the Order ID you received during checkout to see the real-time preparation and delivery progress in Matale.
                </p>
              </div>
            </div>
          )}

          {activeOrder && (
            <div className="space-y-6">
              {/* Order Status Badge & ID Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-gray-950">
                      {activeOrder.id}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="text-gray-400 hover:text-emerald-700 transition-colors p-1"
                      title="Copy Order ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Placed {formatDateLK(activeOrder.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black px-3.5 py-1 rounded-full border ${
                      getStatusColor(activeOrder.status).badge
                    }`}
                  >
                    {activeOrder.status}
                  </span>
                </div>
              </div>

              {/* Progress Timeline Stepper */}
              {!isCancelled ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                  {STATUS_STEPS.map((step, idx) => {
                    const isPassed = currentStepIndex >= idx;
                    const isCurrent = currentStepIndex === idx;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.status} className="relative flex items-start gap-3">
                        <div
                          className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center -ml-6 transition-all ${
                            isCurrent
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border-2 border-gray-300 text-transparent'
                          }`}
                        >
                          {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent
                                ? 'text-emerald-900 font-black'
                                : isPassed
                                ? 'text-gray-900'
                                : 'text-gray-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5 animate-pulse">
                              Current status • Updated by Matale dispatch coordinator
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>This Order was Cancelled</span>
                  </div>
                  {activeOrder.cancelReason && (
                    <p className="text-[11px]">Reason: {activeOrder.cancelReason}</p>
                  )}
                </div>
              )}

              {/* Fresh Produce Price Confirmation Notice */}
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fresh Produce Confirmation Notice:</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Fresh market vegetable weights & daily wholesale prices are confirmed when our buyer collects from Matale Pola. Your final payable total will reflect agreed weights.
                  </p>
                </div>
              </div>

              {/* Items Breakdown with Supplier Assignment */}
              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Order Items ({activeOrder.items.length})
                </h4>
                <div className="space-y-2">
                  {activeOrder.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-100"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              item.supplierId === 'vegetable_shop'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.supplierId === 'vegetable_shop' ? '🥦 Market Pola' : '🛒 Supermarket'}
                          </span>
                          <span className="font-bold text-gray-900">{item.productName}</span>
                        </div>
                        <span className="text-[11px] text-gray-500">
                          Qty: {item.quantity} × {formatLKR(item.customerPrice)} ({item.unit})
                        </span>
                        {item.status === 'out_of_stock' && (
                          <span className="block text-[10px] text-rose-600 font-semibold">
                            ⚠️ Out of stock at market
                          </span>
                        )}
                        {item.status === 'substituted' && (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            🔄 Substituted: {item.substitutionNote}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-emerald-950">
                        {formatLKR(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="pt-2 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatLKR(activeOrder.actualSubtotal || activeOrder.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee ({activeOrder.area}):</span>
                    <span className="font-semibold text-gray-900">{formatLKR(activeOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-black text-emerald-950 border-t border-gray-200">
                    <span>
                      Total Due ({activeOrder.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery'}):
                    </span>
                    <span className="text-emerald-900">
                      {formatLKR(activeOrder.actualTotalAmount || activeOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Notice & Bank Details */}
              {activeOrder.paymentMethod === 'bank_transfer' ? (
                <div className="p-4 bg-blue-50/90 rounded-2xl border border-blue-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-black text-blue-950">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Payment Mode: Direct Bank Transfer</span>
                  </div>
                  
                  {activeBankList.length > 0 ? (
                    <div className="space-y-2">
                      {activeBankList.map((b) => (
                        <div key={b.id} className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                          <p className="font-bold text-gray-900">{b.bankName} — {b.branch}</p>
                          <p className="text-gray-600 text-[11px]">Account Name: <strong>{b.accountName}</strong></p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono font-black text-sm text-blue-900">
                              {b.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyBankAcc(b.accountNumber)}
                              className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              {copiedBankAcc ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedBankAcc ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-[11px] text-blue-800">
                    Please WhatsApp your deposit receipt or transfer slip quoting Order ID <strong>{activeOrder.id}</strong> to our coordinator.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2 font-medium">
                  <span>💵</span>
                  <span>
                    <strong>Payment Mode: Cash on Delivery (COD).</strong> Please pay cash to our delivery rider upon doorstep handover.
                  </span>
                </div>
              )}

              {/* Delivery Details */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
                <div className="font-bold text-emerald-900">Delivery Address:</div>
                <p>{activeOrder.customerName} • {activeOrder.phone}</p>
                <p>{activeOrder.deliveryAddress}, {activeOrder.area}</p>
                {activeOrder.deliveryInstructions && (
                  <p className="text-[11px] text-emerald-800 italic">
                    Note: {activeOrder.deliveryInstructions}
                  </p>
                )}
              </div>

              {/* Quick Actions WhatsApp Support */}
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={`https://wa.me/${cleanPhoneForWhatsApp(adminWhatsApp)}?text=${encodeURIComponent(
                    `Hello Matale Fresh coordinator, I am sending details regarding Order ${activeOrder.id} (${activeOrder.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery'}). Customer: ${activeOrder.customerName}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {activeOrder.paymentMethod === 'bank_transfer'
                      ? 'WhatsApp Bank Slip to Admin'
                      : 'WhatsApp Admin Coordinator'}
                  </span>
                </a>
                <a
                  href="tel:0662223481"
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-700" />
                  <span>Call 066 222 3481</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
