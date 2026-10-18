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
  Percent,
  Layers
} from 'lucide-react';
import { Product, getProductDivision, ProductDivision } from '../../types';
import { ProductCard } from './ProductCard';
import { useCart } from '../../context/CartContext';
import { formatLKR } from '../../utils/formatters';
import { SupportedLanguage, TRANSLATIONS } from '../../utils/i18n';
import { Logo, logoImage } from '../Logo';

interface CustomerHomeProps {
  products: Product[];
  currentLang: SupportedLanguage;
  onOpenCart: () => void;
  onOpenTracking: () => void;
}

export type DepartmentFilter = 'all' | 'offers' | 'vegetables' | 'fruits' | 'meat' | 'groceries';

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  products,
  currentLang,
  onOpenCart,
  onOpenTracking,
}) => {
  const { itemCount, subtotal, selectedArea, supplierCounts } = useCart();
  const t = TRANSLATIONS[currentLang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DepartmentFilter>('all');

  // Filtered offer items
  const offerProducts = products.filter(
    (p) => p.isOffer && p.offerPrice && p.offerPrice < p.price && p.inStock
  );

  // Department counts
  const vegCount = products.filter((p) => getProductDivision(p.category) === 'vegetables' && p.inStock).length;
  const fruitCount = products.filter((p) => getProductDivision(p.category) === 'fruits' && p.inStock).length;
  const meatCount = products.filter((p) => getProductDivision(p.category) === 'meat' && p.inStock).length;
  const grocCount = products.filter((p) => getProductDivision(p.category) === 'groceries' && p.inStock).length;

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

    if (selectedFilter === 'offers') {
      return p.isOffer && p.offerPrice && p.offerPrice < p.price;
    }
    if (selectedFilter === 'vegetables') {
      return getProductDivision(p.category) === 'vegetables';
    }
    if (selectedFilter === 'fruits') {
      return getProductDivision(p.category) === 'fruits';
    }
    if (selectedFilter === 'meat') {
      return getProductDivision(p.category) === 'meat';
    }
    if (selectedFilter === 'groceries') {
      return getProductDivision(p.category) === 'groceries';
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
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 shrink-0">
                <img
                  src={logoImage}
                  alt="Matale Fresh Logo"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-500/30 text-emerald-200 text-xs font-bold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Matale Central Market & Supermarket Combined</span>
                </div>
                <p className="text-[11px] text-emerald-300 font-semibold hidden sm:block">
                  මාතලේ මධ්‍යම පොළ, පලතුරු, මස් මාළු සහ සුපිරි වෙළඳසැල් ජාලය
                </p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Vegetables, Fruits, Meat & Groceries Delivered Together
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-xl">
              Fresh produce from Matale Central Market stalls, farm fruits, meat & seafood, plus supermarket staples — all combined into 1 single delivery trip!
            </p>

            {/* Quick Benefits Chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs">
              <button
                onClick={() => setSelectedFilter('offers')}
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
            <strong>Fresh Market Guarantee:</strong> Fresh produce and meat are weighed directly at certified market stalls. Final bill is confirmed upon collection before delivery.
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* 4 Primary Department Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.browseDepartments || 'Shop by Department'}</span>
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">
              4 Fresh Divisions Available
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Vegetables Card */}
            <div
              onClick={() => setSelectedFilter('vegetables')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedFilter === 'vegetables'
                  ? 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white shadow-md shadow-emerald-900/20 ring-2 ring-emerald-500'
                  : 'bg-white hover:bg-emerald-50/50 border-emerald-100/90 text-gray-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-2 rounded-xl bg-emerald-100/80 group-hover:scale-110 transition-transform">
                  🥦
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedFilter === 'vegetables' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {vegCount} items
                </span>
              </div>
              <h4 className={`font-black text-sm ${selectedFilter === 'vegetables' ? 'text-white' : 'text-emerald-950'}`}>
                {t.vegetablesTab || 'Vegetables'}
              </h4>
              <p className={`text-[11px] mt-0.5 ${selectedFilter === 'vegetables' ? 'text-emerald-100' : 'text-gray-500'}`}>
                {t.deptVegDesc || 'Pola & farm fresh harvest'}
              </p>
            </div>

            {/* 2. Fruits Card */}
            <div
              onClick={() => setSelectedFilter('fruits')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedFilter === 'fruits'
                  ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md shadow-amber-900/20 ring-2 ring-amber-500'
                  : 'bg-white hover:bg-amber-50/50 border-amber-100/90 text-gray-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-2 rounded-xl bg-amber-100/80 group-hover:scale-110 transition-transform">
                  🍎
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedFilter === 'fruits' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {fruitCount} items
                </span>
              </div>
              <h4 className={`font-black text-sm ${selectedFilter === 'fruits' ? 'text-white' : 'text-gray-900'}`}>
                {t.fruitsTab || 'Fruits'}
              </h4>
              <p className={`text-[11px] mt-0.5 ${selectedFilter === 'fruits' ? 'text-amber-100' : 'text-gray-500'}`}>
                {t.deptFruitDesc || 'Sweet tropical & highland fruits'}
              </p>
            </div>

            {/* 3. Meat & Seafood Card */}
            <div
              onClick={() => setSelectedFilter('meat')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedFilter === 'meat'
                  ? 'bg-gradient-to-br from-rose-700 to-red-800 text-white shadow-md shadow-rose-900/20 ring-2 ring-rose-500'
                  : 'bg-white hover:bg-rose-50/50 border-rose-100/90 text-gray-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-2 rounded-xl bg-rose-100/80 group-hover:scale-110 transition-transform">
                  🍗
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedFilter === 'meat' ? 'bg-white text-rose-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {meatCount} items
                </span>
              </div>
              <h4 className={`font-black text-sm ${selectedFilter === 'meat' ? 'text-white' : 'text-gray-900'}`}>
                {t.meatTab || 'Chicken, Fish & Eggs'}
              </h4>
              <p className={`text-[11px] mt-0.5 ${selectedFilter === 'meat' ? 'text-rose-100' : 'text-gray-500'}`}>
                {t.deptMeatDesc || '100% Halal chicken, eggs & seafood'}
              </p>
            </div>

            {/* 4. Grocery Items Card */}
            <div
              onClick={() => setSelectedFilter('groceries')}
              className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedFilter === 'groceries'
                  ? 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-900/20 ring-2 ring-blue-500'
                  : 'bg-white hover:bg-blue-50/50 border-blue-100/90 text-gray-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-2 rounded-xl bg-blue-100/80 group-hover:scale-110 transition-transform">
                  🛒
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedFilter === 'groceries' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-900'
                }`}>
                  {grocCount} items
                </span>
              </div>
              <h4 className={`font-black text-sm ${selectedFilter === 'groceries' ? 'text-white' : 'text-gray-900'}`}>
                {t.groceryTab || 'Grocery Items'}
              </h4>
              <p className={`text-[11px] mt-0.5 ${selectedFilter === 'groceries' ? 'text-blue-100' : 'text-gray-500'}`}>
                {t.deptGrocDesc || 'Rice, spices & pantry goods'}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Department Tab Toolbar */}
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

          {/* Department & Offer Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* All Products */}
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {t.allProducts}
            </button>

            {/* Weekly Offers & Specials Tab */}
            <button
              onClick={() => setSelectedFilter('offers')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'offers'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-red-600 text-white shadow-md shadow-rose-900/20'
                  : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${selectedFilter === 'offers' ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
              <span>{t.weeklyOffersTab || 'Weekly Offers'}</span>
              {offerProducts.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  selectedFilter === 'offers' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}>
                  {offerProducts.length}
                </span>
              )}
            </button>

            {/* 1. Vegetables Tab */}
            <button
              onClick={() => setSelectedFilter('vegetables')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'vegetables'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🥦</span>
              <span>{t.vegetablesTab || 'Vegetables'}</span>
            </button>

            {/* 2. Fruits Tab */}
            <button
              onClick={() => setSelectedFilter('fruits')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'fruits'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🍎</span>
              <span>{t.fruitsTab || 'Fruits'}</span>
            </button>

            {/* 3. Meat & Seafood Tab */}
            <button
              onClick={() => setSelectedFilter('meat')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'meat'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🍗</span>
              <span>{t.meatTab || 'Chicken & Fish'}</span>
            </button>

            {/* 4. Grocery Items Tab */}
            <button
              onClick={() => setSelectedFilter('groceries')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedFilter === 'groceries'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>🛒</span>
              <span>{t.groceryTab || 'Groceries'}</span>
            </button>
          </div>
        </div>

        {/* Combined Order Value Proposition Notice */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🤝</span>
            <div>
              <h4 className="font-extrabold text-emerald-950">
                Single Order • All 4 Departments Delivered Together
              </h4>
              <p className="text-emerald-800 text-[11px]">
                Mix fresh vegetables, sweet fruits, meat & seafood, and supermarket groceries in one basket. Pay a single delivery fee!
              </p>
            </div>
          </div>
          <div className="shrink-0 font-bold text-emerald-900 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200">
            Delivering to: {selectedArea.name} ({formatLKR(selectedArea.deliveryFee)})
          </div>
        </div>

        {/* Weekly Offers Spotlight Banner (When viewing 'all' and active offers exist) */}
        {selectedFilter === 'all' && !searchQuery && offerProducts.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500 via-rose-500 to-red-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-rose-900/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Limited Weekly Offers & Special Prices</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  This Week's Best Deals Across All Departments
                </h3>
                <p className="text-xs text-amber-100 max-w-xl">
                  Enjoy discounted rates on market fresh produce, fruits, meat, and grocery staples. Save more on your family basket!
                </p>
              </div>

              <button
                onClick={() => setSelectedFilter('offers')}
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
                    onClick={() => setSelectedFilter('offers')}
                    className="cursor-pointer bg-white rounded-2xl p-2.5 text-gray-900 shadow-md hover:scale-[1.02] transition-transform flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-gray-100 mb-2">
                        <img 
                          src={offerProd.imageUrl} 
                          alt={offerProd.name} 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                          -{pct}%
                        </span>
                      </div>
                      <h4 className="font-bold text-xs line-clamp-1">
                        {currentLang === 'si' ? offerProd.nameSi || offerProd.name : currentLang === 'ta' ? offerProd.nameTa || offerProd.name : offerProd.name}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFilter('offers');
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold"
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
              {selectedFilter === 'offers' ? (
                <>
                  <Flame className="w-5 h-5 text-rose-600 fill-rose-600" />
                  <span>Special Prices & Weekly Offers</span>
                </>
              ) : selectedFilter === 'vegetables' ? (
                <>
                  <span>🥦</span>
                  <span>Fresh Vegetables & Pola Greens</span>
                </>
              ) : selectedFilter === 'fruits' ? (
                <>
                  <span>🍎</span>
                  <span>Fresh Tropical & Highland Fruits</span>
                </>
              ) : selectedFilter === 'meat' ? (
                <>
                  <span>🍗</span>
                  <span>Fresh Halal Chicken, Farm Eggs & Sea Fish</span>
                </>
              ) : selectedFilter === 'groceries' ? (
                <>
                  <span>🛒</span>
                  <span>Supermarket Groceries & Pantry Essentials</span>
                </>
              ) : (
                <span>All Departments in Matale</span>
              )}
              <span className="text-xs font-normal text-gray-500 ml-1">
                ({filteredProducts.length} items)
              </span>
            </h2>

            {selectedFilter === 'offers' && (
              <span className="text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Weekly Discount Active
              </span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-500 space-y-3">
              <p className="text-3xl">
                {selectedFilter === 'offers' ? '🏷️' : '🔍'}
              </p>
              <p className="font-bold text-gray-800">
                {selectedFilter === 'offers' 
                  ? 'No special weekly offers currently match this filter.' 
                  : `No products found matching "${searchQuery}"`}
              </p>
              <p className="text-xs text-gray-400">
                {selectedFilter === 'offers'
                  ? 'Check back soon! New weekly offers are added every market day.'
                  : 'Try searching for carrots, bananas, chicken, rice, tea, or milk powder.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
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
                <p className="text-[10px] text-emerald-200">
                  {Object.keys(supplierCounts).length} Departments Combined
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-emerald-200 block">Subtotal</span>
                <span className="text-sm font-black text-amber-300">
                  {formatLKR(subtotal)}
                </span>
              </div>
              <div className="p-2 bg-white/20 rounded-xl">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
