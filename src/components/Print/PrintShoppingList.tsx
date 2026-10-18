import React from 'react';
import { SupplierShoppingItemSummary } from '../../services/supplierService';
import { Supplier } from '../../types';
import { formatLKR } from '../../utils/formatters';
import { logoImage } from '../Logo';

interface PrintShoppingListProps {
  supplier: Supplier;
  items: SupplierShoppingItemSummary[];
  onClose: () => void;
}

export const PrintShoppingList: React.FC<PrintShoppingListProps> = ({
  supplier,
  items,
  onClose,
}) => {
  const isVegetable = supplier.id === 'vegetable_shop';
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalEstimatedCost = items.reduce((sum, item) => sum + item.estimatedTotalCost, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Screen Action Bar (hidden when printing) */}
        <div className="bg-emerald-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">{isVegetable ? '🥦' : '🛒'}</span>
            <span className="font-bold text-sm">
              Printable {isVegetable ? 'Vegetable Market' : 'Supermarket'} Shopping List (A4)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
            >
              Print List (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (A4 Standard Print View) */}
        <div className="p-8 font-sans text-gray-900 print:p-0">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <img
                src={logoImage}
                alt="Matale Fresh Logo"
                className="w-12 h-12 object-cover rounded-xl border border-gray-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-gray-900">
                    MATALE FRESH
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-800 font-bold uppercase rounded">
                    Shopping Dispatch Slip
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Central Administrator Purchase Order • Matale, Sri Lanka
                </p>
                <div className="mt-2 text-xs">
                  <p>
                    <strong>Partner Supplier:</strong> {supplier.name}
                  </p>
                  <p>
                    <strong>Collection Point:</strong> {supplier.location} | Phone: {supplier.contactPhone}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="font-mono font-bold text-gray-800">
                DATE: {currentDate}
              </p>
              <p className="text-gray-500 mt-1">
                Total Products: <strong>{items.length} lines</strong>
              </p>
              <p className="text-gray-500">
                Est. Procurement Budget: <strong>{formatLKR(totalEstimatedCost)}</strong>
              </p>
            </div>
          </div>

          {/* Supplier Special Notes */}
          <div className="mb-4 p-2.5 bg-gray-100 rounded text-xs border border-gray-300">
            <strong>Pickup Guidelines:</strong> {supplier.notes || 'Ensure fresh quality grading and verify item weights before dispatch.'}
          </div>

          {/* Items Checklist Table */}
          <table className="w-full text-xs border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-left">
                <th className="p-2 border border-gray-300 w-10 text-center">Done</th>
                <th className="p-2 border border-gray-300">Product & Specification</th>
                <th className="p-2 border border-gray-300 w-24 text-center">Unit / Pack</th>
                <th className="p-2 border border-gray-300 w-24 text-center">Total Req. Qty</th>
                <th className="p-2 border border-gray-300 w-28 text-center">
                  {isVegetable ? 'Actual Weighed (kg/g)' : 'Actual Cost (Rs.)'}
                </th>
                <th className="p-2 border border-gray-300">Allocated Orders</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-2 border border-gray-300 text-center">
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-sm mx-auto" />
                  </td>
                  <td className="p-2 border border-gray-300">
                    <div className="font-bold text-gray-900">{item.productName}</div>
                    {item.productNameSi && (
                      <div className="text-[10px] text-gray-600">{item.productNameSi}</div>
                    )}
                  </td>
                  <td className="p-2 border border-gray-300 text-center text-gray-700">
                    {item.unit}
                  </td>
                  <td className="p-2 border border-gray-300 text-center font-extrabold text-sm">
                    {item.totalQuantity}
                  </td>
                  <td className="p-2 border border-gray-300 text-center bg-gray-50 font-mono text-gray-400">
                    [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
                  </td>
                  <td className="p-2 border border-gray-300 text-[10px] text-gray-600 font-mono">
                    {item.orderIds.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Sign-off Section */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-300 text-xs text-gray-700">
            <div>
              <div className="border-b border-gray-400 pb-8 mb-1" />
              <p className="font-bold">Purchased / Collected By</p>
              <p className="text-[10px] text-gray-500">Matale Central Buyer Sign</p>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-8 mb-1" />
              <p className="font-bold">Supplier Store Sign-off</p>
              <p className="text-[10px] text-gray-500">Stamp & Verification</p>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-8 mb-1" />
              <p className="font-bold">Central Dispatch Check</p>
              <p className="text-[10px] text-gray-500">Combined Delivery Hub</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
