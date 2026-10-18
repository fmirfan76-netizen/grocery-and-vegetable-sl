import React from 'react';
import { Order } from '../../types';
import { formatLKR, formatDateLK } from '../../utils/formatters';
import { logoImage } from '../Logo';

interface PrintCustomerInvoiceProps {
  order: Order;
  onClose: () => void;
}

export const PrintCustomerInvoice: React.FC<PrintCustomerInvoiceProps> = ({
  order,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Screen Action Bar */}
        <div className="bg-emerald-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
          <span className="font-bold text-sm">Customer Delivery Receipt • {order.id}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Paper Layout */}
        <div className="p-8 font-sans text-gray-900 print:p-0">
          <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start">
            <div className="flex items-start gap-3">
              <img
                src={logoImage}
                alt="Matale Fresh Logo"
                className="w-14 h-14 object-cover rounded-xl border border-gray-200"
              />
              <div>
                <h1 className="text-xl font-black tracking-tight text-emerald-950">
                  MATALE FRESH GROCERY
                </h1>
                <p className="text-xs text-gray-500">මාතලේ එළවළු & සුපර්මාකට් බෙදාහැරීම</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Central Pola & Supermarket Delivery • Matale, Sri Lanka
                </p>
                <p className="text-[11px] text-gray-600">Hotline: 066 222 3481 / 077 123 4567</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-2 py-0.5 text-xs font-extrabold rounded ${
                order.paymentMethod === 'bank_transfer'
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {order.paymentMethod === 'bank_transfer' ? 'DIRECT BANK TRANSFER' : 'CASH ON DELIVERY'}
              </span>
              <p className="font-mono font-bold text-sm text-gray-900 mt-1">{order.id}</p>
              <p className="text-[11px] text-gray-500">{formatDateLK(order.createdAt)}</p>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs mb-4 grid grid-cols-2 gap-2">
            <div>
              <p className="font-bold text-gray-800">Delivered To:</p>
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-gray-600">{order.phone}</p>
            </div>
            <div>
              <p className="font-bold text-gray-800">Destination:</p>
              <p className="text-gray-700">{order.deliveryAddress}</p>
              <p className="font-semibold text-emerald-800">{order.area}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs border-collapse border border-gray-200 mb-4">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-left">
                <th className="p-2 border border-gray-200">Item Description</th>
                <th className="p-2 border border-gray-200 text-center">Unit</th>
                <th className="p-2 border border-gray-200 text-center">Qty</th>
                <th className="p-2 border border-gray-200 text-right">Price (Rs.)</th>
                <th className="p-2 border border-gray-200 text-right">Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="p-2 border border-gray-200">
                    <span className="font-medium text-gray-900">{item.productName}</span>
                    <span className="block text-[10px] text-gray-500">
                      [{item.supplierId === 'vegetable_shop' ? 'Market Vegetable' : 'Supermarket'}]
                    </span>
                  </td>
                  <td className="p-2 border border-gray-200 text-center">{item.unit}</td>
                  <td className="p-2 border border-gray-200 text-center font-bold">
                    {item.confirmedQuantity !== undefined ? item.confirmedQuantity : item.quantity}
                  </td>
                  <td className="p-2 border border-gray-200 text-right font-mono">
                    {formatLKR(item.customerPrice)}
                  </td>
                  <td className="p-2 border border-gray-200 text-right font-mono font-bold">
                    {formatLKR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary / Final Amount */}
          <div className="w-64 ml-auto text-xs space-y-1.5 border-t border-gray-300 pt-2 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-gray-900">
                {formatLKR(order.actualSubtotal || order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee ({order.area}):</span>
              <span className="font-semibold text-gray-900">{formatLKR(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-emerald-950 pt-1 border-t-2 border-gray-900">
              <span>Amount Due (COD):</span>
              <span>{formatLKR(order.actualTotalAmount || order.totalAmount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-4 text-center text-[10px] text-gray-500">
            <p>Thank you for shopping with Matale Fresh!</p>
            <p>Fresh vegetables directly from Matale Pola and daily supermarket items combined.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
