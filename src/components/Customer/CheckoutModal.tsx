import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Phone, 
  User, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare, 
  CreditCard, 
  Building2, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';
import { formatLKR, isValidSriLankanPhone } from '../../utils/formatters';
import { MATALE_AREAS } from '../../services/seedData';
import { 
  BankAccountDetails, 
  DEFAULT_BANK_ACCOUNTS, 
  fetchBankAccounts, 
  subscribeToBankAccounts, 
  subscribeToAdminWhatsApp, 
  getAdminWhatsAppNumber, 
  getAdminWhatsAppUrl 
} from '../../utils/bankAndWhatsApp';
import { Order } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const {
    items,
    subtotal,
    selectedArea,
    setSelectedArea,
    deliveryFee,
    totalAmount,
    toOrderItems,
    orderNotes,
    substitutionPreference,
    paymentMethod,
    setPaymentMethod,
    clearCart,
  } = useCart();

  const { user } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountDetails[]>(DEFAULT_BANK_ACCOUNTS);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>(getAdminWhatsAppNumber());

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Sync bank accounts and WhatsApp number in real time from Firestore
  useEffect(() => {
    let unsubBanks: (() => void) | undefined;
    let unsubWhatsApp: (() => void) | undefined;

    try {
      unsubBanks = subscribeToBankAccounts((accounts) => {
        if (accounts && accounts.length > 0) {
          setBankAccounts(accounts);
        }
      });

      unsubWhatsApp = subscribeToAdminWhatsApp((num) => {
        if (num) setAdminWhatsApp(num);
      });
    } catch (e) {
      console.warn('Real-time checkout listener note:', e);
    }

    return () => {
      if (unsubBanks) unsubBanks();
      if (unsubWhatsApp) unsubWhatsApp();
    };
  }, []);

  if (!isOpen) return null;

  const activeBankAccounts = bankAccounts.filter((b) => b.isActive);
  const currentBankAccounts = activeBankAccounts.length > 0 ? activeBankAccounts : DEFAULT_BANK_ACCOUNTS;
  const activeBank = currentBankAccounts[selectedBankIndex] || currentBankAccounts[0];

  const handleCopyAcc = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedBankAcc(true);
    setTimeout(() => setCopiedBankAcc(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!phone.trim() || !isValidSriLankanPhone(phone)) {
      setErrorMessage('Please enter a valid Sri Lankan mobile number (e.g. 077 123 4567 or +94 77 123 4567).');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please enter your delivery street address in Matale.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Add products before placing an order.');
      return;
    }

    try {
      setSubmitting(true);

      const orderItems = toOrderItems();
      const customerId = user ? user.uid : `guest_${Date.now()}`;

      const created = await createOrder({
        customerId,
        customerName: customerName.trim(),
        phone: phone.trim(),
        deliveryAddress: address.trim(),
        area: selectedArea.name,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        orderNotes: orderNotes.trim() || undefined,
        substitutionPreference,
        paymentMethod,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        subtotal,
        deliveryFee,
        totalAmount,
        items: orderItems,
      });

      // Clear the local cart after successful database write
      clearCart();
      setConfirmedOrder(created);

      // Instantly open WhatsApp notification for the Administrator
      const waUrl = getAdminWhatsAppUrl(created, adminWhatsApp);
      try {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Window open notice:', err);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(
        'Failed to save your order to the server. Please check your internet connection or try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (confirmedOrder) {
            onOrderSuccess(confirmedOrder);
          } else {
            onClose();
          }
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">
              {confirmedOrder ? 'Order Confirmed!' : 'Checkout & Delivery Details'}
            </h2>
            <p className="text-xs text-emerald-200">
              {confirmedOrder
                ? 'Your order has been recorded in the central system'
                : 'Matale Delivery • Cash on Delivery & Bank Transfer'}
            </p>
          </div>
          <button
            onClick={() => {
              if (confirmedOrder) {
                onOrderSuccess(confirmedOrder);
              } else {
                onClose();
              }
            }}
            className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* SUCCESS SCREEN WITH DIRECT WHATSAPP NOTIFICATION TRIGGER */}
        {/* ======================================================== */}
        {confirmedOrder ? (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                ✓
              </div>
              <h3 className="text-xl font-black text-gray-950">
                Order Placed Successfully!
              </h3>
              <p className="font-mono text-base font-extrabold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-200">
                {confirmedOrder.id}
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Thank you, <strong>{confirmedOrder.customerName}</strong>. Your order is registered in our Matale central dispatch system.
              </p>
            </div>

            {/* WhatsApp Notification Card */}
            <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-emerald-950 text-sm">
                    Instant WhatsApp Dispatch to Admin
                  </h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Click the button below to send your complete order notification directly to the Matale store administrator's WhatsApp:
                  </p>
                </div>
              </div>

              <a
                href={getAdminWhatsAppUrl(confirmedOrder, adminWhatsApp)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>📱 Notify Admin on WhatsApp Now</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className="text-[10px] text-gray-500 text-center">
                Destination: +{adminWhatsApp}
              </p>
            </div>

            {/* Bank Transfer Instructions if Bank Transfer chosen */}
            {confirmedOrder.paymentMethod === 'bank_transfer' && activeBank && (
              <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-blue-950">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Bank Transfer Details for Order #{confirmedOrder.id}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                  <p className="font-bold text-gray-900">{activeBank.bankName}</p>
                  <p className="text-gray-600">{activeBank.branch}</p>
                  <p className="text-gray-600">Account Name: <strong>{activeBank.accountName}</strong></p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-black text-sm text-blue-900">
                      {activeBank.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAcc(activeBank.accountNumber)}
                      className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      {copiedBankAcc ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedBankAcc ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-blue-800">
                  <strong>Total to Transfer:</strong> {formatLKR(confirmedOrder.totalAmount)}. Please WhatsApp your deposit receipt/screenshot quoting Order ID <strong>{confirmedOrder.id}</strong>.
                </p>
              </div>
            )}

            {/* Order Summary & Tracking Action */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => onOrderSuccess(confirmedOrder)}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Track Order Live on Timeline</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CHECKOUT FORM */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Your Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Nuwan Senanayake"
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
                />
              </div>
            </div>

            {/* Sri Lankan Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Sri Lankan Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077 123 4567 or 071 987 6543"
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50 font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Our Matale coordinator will WhatsApp/call you to verify produce weights and delivery ETA.
              </p>
            </div>

            {/* Matale Area Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Delivery Area in Matale <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <select
                  value={selectedArea.name}
                  onChange={(e) => {
                    const a = MATALE_AREAS.find((x) => x.name === e.target.value);
                    if (a) setSelectedArea(a);
                  }}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
                >
                  {MATALE_AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name} (Delivery: {formatLKR(a.deliveryFee)} • {a.estMinutes})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Street Address & Landmarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., No. 42, Mandandawela Road, Near St. Thomas' College ground..."
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
              />
            </div>

            {/* Optional Delivery Instructions */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Optional Gate / Driver Instructions:
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g., Ring doorbell twice, leave at front porch..."
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-hidden bg-gray-50/50"
              />
            </div>

            {/* ======================================================== */}
            {/* PAYMENT METHOD SELECTOR: CASH ON DELIVERY VS BANK TRANSFER */}
            {/* ======================================================== */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-black text-gray-900">
                Select Payment Method <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'cod'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💵</span>
                    <span className="font-extrabold text-xs text-gray-900">
                      Cash on Delivery
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Pay in cash when our rider delivers to your doorstep.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🏦</span>
                    <span className="font-extrabold text-xs text-gray-900">
                      Bank Transfer
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Direct transfer to verified bank accounts.
                  </p>
                </button>
              </div>

              {/* Bank Details Display if Bank Transfer chosen */}
              {paymentMethod === 'bank_transfer' && activeBank && (
                <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 space-y-2 animate-in fade-in duration-150 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                    <span>Select Bank Account:</span>
                    <div className="flex flex-wrap gap-1">
                      {currentBankAccounts.map((b, idx) => (
                        <button
                          key={b.id || idx}
                          type="button"
                          onClick={() => setSelectedBankIndex(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedBankIndex === idx
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-blue-800 border border-blue-200'
                          }`}
                        >
                          {b.bankName.length > 15 ? b.bankName.slice(0, 14) + '...' : b.bankName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 space-y-1">
                    <p className="font-bold text-gray-900">{activeBank.bankName}</p>
                    <p className="text-[11px] text-gray-600">{activeBank.branch}</p>
                    <p className="text-[11px] text-gray-600">
                      Account Name: <strong>{activeBank.accountName}</strong>
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-black text-sm text-blue-900">
                        {activeBank.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAcc(activeBank.accountNumber)}
                        className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded text-[10px] font-bold flex items-center gap-1"
                      >
                        {copiedBankAcc ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedBankAcc ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-blue-800">
                    ℹ️ {activeBank.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Order Summary Box */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Total ({items.length} products):</span>
                <span className="font-semibold text-gray-900">{formatLKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee ({selectedArea.name}):</span>
                <span className="font-semibold text-gray-900">{formatLKR(deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-emerald-200 text-sm font-extrabold text-emerald-950">
                <span>Total Amount to Pay:</span>
                <span className="text-emerald-900 text-base">{formatLKR(totalAmount)}</span>
              </div>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Payment Mode:{' '}
                  <strong>
                    {paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Direct Bank Transfer'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Placing Order in Matale...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {paymentMethod === 'cod'
                        ? 'Confirm Order (Cash on Delivery)'
                        : 'Confirm Order (Bank Transfer)'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-2">
                📲 Upon placing, this order will be automatically sent to the administrator on WhatsApp.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
