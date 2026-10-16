import React, { useState } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Truck, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  ShieldCheck,
  Package,
  Flame,
  Tag,
  Percent
} from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';
import { useCart } from '../../context/CartContext';
import { formatLKR } from '../../utils/formatters';
import { SupportedLanguage, TRANSLATIONS } from '../../utils/i18n';

interface CustomerHomeProps {
  products: Product[];
  currentLang: SupportedLanguage;
  onOpenCart: () => void;
  onOpenTracking: () => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  products,
  currentLang,
  onOpenCart,
  onOpenTracking,
}) => {
  const { itemCount, subtotal, selectedArea, supplierCounts } = useCart();
  const t = TRANSLATIONS[currentLang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<'all' | 'offers' | 'vegetable_shop' | 'supermarket' | 'greens'>('all');

  // Filtered offer items
  const offerProducts = products.filter(
    (p) => p.isOffer && p.offerPrice && p.offerPrice < p.price && p.inStock
  );

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameSi && p.nameSi.toLowerCase().includes(q)) ||
      (p.nameTa && p.nameTa.toLowerCase().includes(q)) ||
      (p.offerLabel && p.offerLabel.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedSupplierFilter === 'offers') {
      return p.isOffer && p.offerPrice && p.offerPrice < p.price;
    }
    if (selectedSupplierFilter === 'vegetable_shop') {
      return p.supplierId === 'vegetable_shop';
    }
    if (selectedSupplierFilter === 'supermarket') {
      return p.supplierId === 'supermarket';
    }
    if (selectedSupplierFilter === 'greens') {
      return p.category === 'greens';
    }
    return true;
  });

  return (
    <div className="pb-24">
      {/* Hero Banner for Matale Grocery Service */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-emerald-950 text-white py-8 px-4 sm:px-6 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-500/30 text-emerald-200 text-xs font-bold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Matale Central Market & Supermarket Combined</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Fresh Vegetables from Matale Pola + Supermarket Essentials
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-xl">
              We collect fresh produce from market stalls, combine with your grocery items, and deliver directly to your doorstep in Matale.
            </p>

            {/* Quick Benefits Chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs">
              <button
                onClick={() => setSelectedSupplierFilter('offers')}
                className="bg-gradient-to-r from-amber-500/30 to-rose-500/30 hover:from-amber-500/40 hover:to-rose-500/40 px-2.5 py-1 rounded-lg border border-amber-400/50 text-amber-200 font-bold flex items-center gap-1 transition-all"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Weekly Offers Available</span>
                {offerProducts.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1 rounded-full font-black ml-0.5">
                    {offerProducts.length}
                  </span>
                )}
              </button>
              <span className="bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                Delivery across Matale
              </span>
              <span className="bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Same-Day Dispatch
              </span>
              <span className="bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700/50 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Cash on Delivery & Bank Transfer
              </span>
            </div>
          </div>

          {/* Quick Track & Info Card */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-xs space-y-3 shrink-0 text-white">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-300" />
              <span className="font-extrabold text-sm">Already have an order?</span>
            </div>
            <p className="text-emerald-100 text-[11px] max-w-xs">
              Track live market shopping and delivery progress using your order ID.
            </p>
            <button
              onClick={onOpenTracking}
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Track My Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fresh Produce Weight Disclaimer Notification Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950">
        <div className="max-w-7xl mx-auto flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1">
            <strong>Fresh Market Guarantee:</strong> Fresh produce weight is weighed directly at the market stall. The final bill is agreed upon confirmation before delivery.
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Search & Supplier Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full text-xs pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-xs focus:border-emerald-600 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Supplier & Offer Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSupplierFilter('all')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSupplierFilter === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {t.allProducts}
            </button>

            {/* Weekly Offers & Specials Tab */}
            <button
              onClick={() => setSelectedSupplierFilter('offers')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSupplierFilter === 'offers'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 text-white shadow-md shadow-rose-900/20'
                  : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${selectedSupplierFilter === 'offers' ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
              <span>{t.weeklyOffersTab || 'Weekly Offers'}</span>
              {offerProducts.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  selectedSupplierFilter === 'offers' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}>
                  {offerProducts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedSupplierFilter('vegetable_shop')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSupplierFilter === 'vegetable_shop'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🥦</span>
              <span>{t.vegetablesTab}</span>
            </button>

            <button
              onClick={() => setSelectedSupplierFilter('supermarket')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSupplierFilter === 'supermarket'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🛒</span>
              <span>{t.supermarketTab}</span>
            </button>

            <button
              onClick={() => setSelectedSupplierFilter('greens')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSupplierFilter === 'greens'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🌿</span>
              <span>{t.fruitsGreensTab}</span>
            </button>
          </div>
        </div>

        {/* Combined Order Value Proposition Notice */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🤝</span>
            <div>
              <h4 className="font-extrabold text-emerald-950">
                Single Order • Two Partner Sources
              </h4>
              <p className="text-emerald-800 text-[11px]">
                Add your weekly vegetables from Matale Market and pantry goods from the supermarket. Pay a single combined delivery fee!
              </p>
            </div>
          </div>
          <div className="shrink-0 font-bold text-emerald-900 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200">
            Delivering to: {selectedArea.name} ({formatLKR(selectedArea.deliveryFee)})
          </div>
        </div>

        {/* Weekly Offers Spotlight Banner & Showcase (When viewing 'all' and active offers exist) */}
        {selectedSupplierFilter === 'all' && !searchQuery && offerProducts.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500 via-rose-500 to-red-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-rose-900/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Limited Weekly Offers & Special Prices</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  This Week's Best Deals from Matale Pola & Supermarket
                </h3>
                <p className="text-xs text-amber-100 max-w-xl">
                  Enjoy discounted rates on market fresh produce and household staples. Save more on your family basket!
                </p>
              </div>

              <button
                onClick={() => setSelectedSupplierFilter('offers')}
                className="self-start sm:self-auto px-4 py-2.5 bg-white hover:bg-amber-50 text-rose-700 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>View All {offerProducts.length} Deals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal preview of top offers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {offerProducts.slice(0, 4).map((offerProd) => {
                const regular = offerProd.price;
                const offer = offerProd.offerPrice || regular;
                const savings = regular - offer;
                const pct = Math.round((savings / regular) * 100);

                return (
                  <div 
                    key={offerProd.id}
                    className="bg-white rounded-2xl p-3 text-gray-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-gray-100 mb-2">
                        <img 
                          src={offerProd.imageUrl} 
                          alt={offerProd.name} 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                          {pct}% OFF
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide block">
                        {offerProd.offerLabel || 'Weekly Offer'}
                      </span>
                      <h4 className="font-extrabold text-xs text-gray-900 line-clamp-1">
                        {offerProd.name}
                      </h4>
                      <p className="text-[11px] text-gray-500">{offerProd.unit}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-rose-700 block">
                          {formatLKR(offer)}
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          {formatLKR(regular)}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedSupplierFilter('offers')}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold"
                        title="View item"
                      >
                        Shop
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              {selectedSupplierFilter === 'offers' ? (
                <>
                  <Flame className="w-5 h-5 text-rose-600 fill-rose-600" />
                  <span>Special Prices & Weekly Offers</span>
                </>
              ) : selectedSupplierFilter === 'vegetable_shop' ? (
                <span>Fresh Produce from Matale Market Pola</span>
              ) : selectedSupplierFilter === 'supermarket' ? (
                <span>City Supermarket Groceries & Household</span>
              ) : selectedSupplierFilter === 'greens' ? (
                <span>Fresh Leafy Greens & Herbs</span>
              ) : (
                <span>Available Today in Matale</span>
              )}
              <span className="text-xs font-normal text-gray-500 ml-1">
                ({filteredProducts.length} items)
              </span>
            </h2>

            {selectedSupplierFilter === 'offers' && (
              <span className="text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Weekly Discount Active
              </span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-500 space-y-3">
              <p className="text-3xl">
                {selectedSupplierFilter === 'offers' ? '🏷️' : '🔍'}
              </p>
              <p className="font-bold text-gray-800">
                {selectedSupplierFilter === 'offers' 
                  ? 'No special weekly offers currently match this filter.' 
                  : `No products found matching "${searchQuery}"`}
              </p>
              <p className="text-xs text-gray-400">
                {selectedSupplierFilter === 'offers'
                  ? 'Check back soon! New weekly offers are added every market day.'
                  : 'Try searching for carrots, tomatoes, red onions, milk powder, or crackers.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSupplierFilter('all');
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currentLang={currentLang}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Cart Bar (Appears when items are in cart) */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-30 animate-in slide-in-from-bottom-4 duration-200">
          <div
            onClick={onOpenCart}
            className="cursor-pointer bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 rounded-2xl shadow-xl shadow-emerald-950/30 flex items-center justify-between gap-3 border border-emerald-700/50 hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow-xs">
                {itemCount}
              </div>
              <div>
                <p className="text-xs font-extrabold leading-tight">
                  View Shopping Cart
                </p>
                <p className="text-[11px] text-emerald-200 leading-tight">
                  {supplierCounts.hasBothSuppliers
                    ? 'Pola Veg + Supermarket combined'
                    : supplierCounts.vegetableShopCount > 0
                    ? 'Market Vegetables'
                    : 'Supermarket Groceries'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-xs text-emerald-300 block leading-tight">Estimated Total:</span>
                <span className="text-sm font-black text-amber-300 leading-tight">
                  {formatLKR(subtotal)}
                </span>
              </div>
              <div className="p-1.5 bg-white/20 rounded-xl">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
