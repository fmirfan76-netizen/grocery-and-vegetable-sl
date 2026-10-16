import React from 'react';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { formatLKR } from '../../utils/formatters';
import { SupportedLanguage } from '../../utils/i18n';

interface ProductCardProps {
  product: Product;
  currentLang: SupportedLanguage;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, currentLang }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const isVegetable = product.supplierId === 'vegetable_shop';
  const effectivePrice = product.isOffer && product.offerPrice ? product.offerPrice : product.price;

  return (
    <div className={`group flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
      !product.inStock 
        ? 'opacity-60 border-gray-200' 
        : 'border-emerald-100/80 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5'
    }`}>
      {/* Product Image & Badges Container */}
      <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // High-reliability SVG produce fallback
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Supplier Category Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
            isVegetable 
              ? 'bg-emerald-600 text-white' 
              : 'bg-blue-600 text-white'
          }`}>
            {isVegetable ? '🥦 Market Pola' : '🛒 Supermarket'}
          </span>
          {product.badge && (
            <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-400 text-emerald-950 shadow-xs">
              {product.badge}
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-900/80 text-white text-xs font-bold rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info Section */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          {/* Sinhala / Tamil native subtitle */}
          <div className="text-[11px] font-medium text-emerald-800 line-clamp-1 mb-0.5">
            {currentLang === 'si' ? product.nameSi || product.name : currentLang === 'ta' ? product.nameTa || product.name : `${product.nameSi} • ${product.nameTa}`}
          </div>

          {/* Primary Name */}
          <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>

          {/* Origin or Unit hint */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
              {product.unit}
            </span>
            {product.origin && (
              <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                {product.origin}
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Cart Buttons */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold text-emerald-900">
                {formatLKR(effectivePrice)}
              </span>
            </div>
            {product.isOffer && product.price > effectivePrice && (
              <span className="text-[10px] text-gray-400 line-through">
                {formatLKR(product.price)}
              </span>
            )}
          </div>

          {/* Quantity Controls */}
          {product.inStock ? (
            currentQuantity > 0 ? (
              <div className="flex items-center bg-emerald-50 border border-emerald-200 rounded-xl p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, currentQuantity - (product.step || 1))}
                  className="w-7 h-7 rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-2xs font-bold"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center font-bold text-xs text-emerald-950">
                  {currentQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, currentQuantity + (product.step || 1))}
                  className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition-colors shadow-2xs font-bold"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addToCart(product, product.minQuantity || 1)}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 hover:shadow-md hover:shadow-emerald-700/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )
          ) : (
            <span className="text-[11px] font-medium text-gray-400">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
};
