import React from 'react';
import { X, Trash2, Plus, Minus, AlertCircle, ShoppingBag, Truck, Info, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatLKR } from '../../utils/formatters';
import { MATALE_AREAS } from '../../services/seedData';
import { SupportedLanguage, TRANSLATIONS } from '../../utils/i18n';
import { SubstitutionPreference, getProductDivision } from '../../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
  currentLang: SupportedLanguage;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  currentLang,
}) => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    itemCount,
    subtotal,
    selectedArea,
    setSelectedArea,
    deliveryFee,
    totalAmount,
    supplierCounts,
    orderNotes,
    setOrderNotes,
    substitutionPreference,
    setSubstitutionPreference,
  } = useCart();

  const t = TRANSLATIONS[currentLang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-300" />
            <h2 className="font-extrabold text-base tracking-tight">
              {t.cart} ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-emerald-200 hover:text-white flex items-center gap-1 transition-colors"
                title="Clear all items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Combined Supplier Badge Banner */}
        {items.length > 0 && (
          <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <span className="text-base">🧺</span>
            <div className="flex-1 leading-tight">
              {supplierCounts.hasBothSuppliers ? (
                <span>
                  <strong>Combined Order:</strong> {supplierCounts.vegetableShopCount} Market vegetable items + {supplierCounts.supermarketCount} Supermarket items packaged together!
                </span>
              ) : supplierCounts.vegetableShopCount > 0 ? (
                <span>Ordering fresh produce from Matale Central Market Pola.</span>
              ) : (
                <span>Ordering packaged grocery items from Matale Supermarket partner.</span>
              )}
            </div>
          </div>
        )}

        {/* Drawer Body - Scrollable Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 text-3xl">
                🛒
              </div>
              <p className="font-bold text-gray-800 text-lg mb-1">Your cart is empty</p>
              <p className="text-xs text-gray-500 max-w-xs mb-6">
                Add fresh vegetables from Matale Market or supermarket staples to get started.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Product List */}
              <div className="space-y-3">
                {items.map(({ product, quantity }) => {
                  const effectivePrice = product.isOffer && product.offerPrice ? product.offerPrice : product.price;
                  const itemTotal = effectivePrice * quantity;
                  const isVeg = product.supplierId === 'vegetable_shop';

                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 bg-gray-50/70 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      {/* Image Thumbnail */}
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover bg-gray-200 shrink-0"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const div = getProductDivision(product.category);
                            if (div === 'vegetables') {
                              return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">🥦 Vegetables</span>;
                            }
                            if (div === 'fruits') {
                              return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">🍎 Fruits</span>;
                            }
                            if (div === 'meat') {
                              return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">🍗 Chicken & Fish</span>;
                            }
                            return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">🛒 Groceries</span>;
                          })()}
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {formatLKR(effectivePrice)} / {product.unit}
                        </p>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-800">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 rounded-r"
                            aria-label="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-950">
                          {formatLKR(itemTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Area Selection */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    Delivery Area in Matale:
                  </span>
                  <span className="text-emerald-700 font-extrabold">{formatLKR(deliveryFee)}</span>
                </div>
                <select
                  value={selectedArea.name}
                  onChange={(e) => {
                    const found = MATALE_AREAS.find((a) => a.name === e.target.value);
                    if (found) setSelectedArea(found);
                  }}
                  className="w-full text-xs font-medium bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-emerald-600"
                >
                  {MATALE_AREAS.map((area) => (
                    <option key={area.name} value={area.name}>
                      {area.name} — {formatLKR(area.deliveryFee)} ({area.estMinutes})
                    </option>
                  ))}
                </select>
              </div>

              {/* Substitution Preferences */}
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Fresh Produce & Substitution Rule:</span>
                </div>
                <div className="space-y-1 text-xs text-amber-950">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subPref"
                      value="call_first"
                      checked={substitutionPreference === 'call_first'}
                      onChange={() => setSubstitutionPreference('call_first')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Call / WhatsApp me before substituting items</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subPref"
                      value="best_available"
                      checked={substitutionPreference === 'best_available'}
                      onChange={() => setSubstitutionPreference('best_available')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Pick closest best-quality alternative automatically</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="subPref"
                      value="omit_out_of_stock"
                      checked={substitutionPreference === 'omit_out_of_stock'}
                      onChange={() => setSubstitutionPreference('omit_out_of_stock')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Do not substitute; omit out-of-stock items</span>
                  </label>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Order notes or produce preferences (optional):
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g., Medium ripe tomatoes, fresh tender bonchi, gate code..."
                  rows={2}
                  maxLength={250}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:outline-emerald-600 bg-white"
                />
              </div>

              {/* Important Fresh Weight Notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-900 text-[11px] rounded-xl border border-blue-100">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Notice:</strong> Fresh vegetables are hand-weighed at the market. Your final bill will reflect the exact verified weight and will be agreed upon confirmation.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer - Calculations & Checkout */}
        {items.length > 0 && (
          <div className="p-5 border-t border-gray-200 bg-white space-y-3">
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{t.subtotal}:</span>
                <span className="font-semibold text-gray-900">{formatLKR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery to {selectedArea.name}:</span>
                <span className="font-semibold text-gray-900">{formatLKR(deliveryFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-extrabold text-gray-950">
                <span>{t.estimatedTotal}:</span>
                <span className="text-emerald-900 text-base">{formatLKR(totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[10px] text-gray-500">
              💵 Cash on Delivery & 🏦 Bank Transfer Accepted in Matale
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
