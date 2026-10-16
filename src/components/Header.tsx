import React from 'react';
import { ShoppingBag, ShieldCheck, MapPin, Globe, PackageCheck, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { SupportedLanguage, TRANSLATIONS } from '../utils/i18n';

interface HeaderProps {
  currentLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onToggleAdmin: () => void;
  isAdminView: boolean;
  pendingOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  onOpenCart,
  onOpenTracking,
  onToggleAdmin,
  isAdminView,
  pendingOrdersCount = 0,
}) => {
  const { itemCount, selectedArea } = useCart();
  const { isAdmin } = useAuth();
  const t = TRANSLATIONS[currentLang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Top Banner Notice for Matale Delivery */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white text-xs px-3 py-1.5 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="truncate">
              Matale Express Service: Serving {selectedArea.name} ({selectedArea.estMinutes})
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-block text-emerald-200">
              Cash on Delivery & Bank Transfer
            </span>
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-emerald-950/60 rounded px-1.5 py-0.5 text-[11px]">
              <Globe className="w-3 h-3 text-emerald-300" />
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-1 rounded ${currentLang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-200 hover:text-white'}`}
                title="English"
              >
                EN
              </button>
              <span className="text-emerald-400">|</span>
              <button
                onClick={() => onLanguageChange('si')}
                className={`px-1 rounded ${currentLang === 'si' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-200 hover:text-white'}`}
                title="සිංහල"
              >
                සිං
              </button>
              <span className="text-emerald-400">|</span>
              <button
                onClick={() => onLanguageChange('ta')}
                className={`px-1 rounded ${currentLang === 'ta' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-200 hover:text-white'}`}
                title="தமிழ்"
              >
                த
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div 
          onClick={() => { if (isAdminView) onToggleAdmin(); }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <span className="text-xl">🥬</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-gray-900 group-hover:text-emerald-700 transition-colors">
                Matale Fresh
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                SL
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-none -mt-0.5">
              මාතලේ එළවළු & සුපර්මාකට්
            </p>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Order Tracking Button */}
          <button
            onClick={onOpenTracking}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-3 py-2 rounded-xl transition-colors border border-gray-200 cursor-pointer"
            title="Track my order status"
          >
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">{t.trackOrder}</span>
          </button>

          {/* Admin Access Button - Secured for Admin Only */}
          {isAdmin ? (
            <button
              onClick={onToggleAdmin}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all border cursor-pointer ${
                isAdminView
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isAdminView ? 'Customer Shop' : 'Admin Hub'}</span>
              {pendingOrdersCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onToggleAdmin}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-2 rounded-xl transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
              title="Admin Portal (Restricted to fmirfan76@gmail.com)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Portal</span>
            </button>
          )}

          {/* Persistent Cart Trigger */}
          {!isAdminView && (
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{t.cart}</span>
              {itemCount > 0 && (
                <span className="bg-amber-400 text-emerald-950 font-black text-xs px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
