import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { X, Layers, Plus, Minus, CheckCircle2 } from 'lucide-react';

interface StockAdjustModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  onClose,
  onSuccess,
}) => {
  const { adjustStock } = useApp();

  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('New Shipment Received');
  const [error, setError] = useState('');

  if (!product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      setError('Please enter a quantity greater than 0');
      return;
    }

    const delta = mode === 'add' ? qty : -qty;

    if (mode === 'subtract' && qty > product.stockQuantity) {
      setError(`Cannot remove more than current stock (${product.stockQuantity} ${product.unit})`);
      return;
    }

    adjustStock(product.id, delta, reason);
    if (onSuccess) onSuccess();
    onClose();
  };

  const newProjectedStock =
    quantity === ''
      ? product.stockQuantity
      : mode === 'add'
      ? product.stockQuantity + Number(quantity)
      : Math.max(0, product.stockQuantity - Number(quantity));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Adjust Stock Level</h3>
              <p className="text-xs text-slate-300">Restock or record inventory loss</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 space-y-4">
            {/* Product Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Product</span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">{product.name}</h4>
              <p className="text-xs text-slate-500 mt-1">
                Current Stock:{' '}
                <strong className="text-slate-800">
                  {product.stockQuantity} {product.unit}
                </strong>
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Mode: Add or Remove */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Adjustment Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('add');
                    setReason('New Shipment Received');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                    mode === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Restock / Add Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('subtract');
                    setReason('Damaged / Spoilage');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition ${
                    mode === 'subtract'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span>Deduct Stock</span>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantity to {mode === 'add' ? 'Add' : 'Remove'} ({product.unit}) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="0"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value === '' ? '' : Number(e.target.value));
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Adjustment
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {mode === 'add' ? (
                  <>
                    <option value="New Shipment Received">New Shipment Received</option>
                    <option value="Customer Return">Customer Return / Exchange</option>
                    <option value="Stock Audit Correction">Stock Audit Correction</option>
                    <option value="Other Addition">Other Addition</option>
                  </>
                ) : (
                  <>
                    <option value="Damaged / Spoilage">Damaged / Spoilage</option>
                    <option value="Expired Product">Expired Product</option>
                    <option value="Personal / Family Use">Personal / Family Use</option>
                    <option value="Theft or Loss">Theft or Missing</option>
                    <option value="Other Deduction">Other Deduction</option>
                  </>
                )}
              </select>
            </div>

            {/* Projected Stock Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">New Available Stock:</span>
              <span className="font-bold text-slate-900 font-mono-num text-sm">
                {newProjectedStock} {product.unit}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
