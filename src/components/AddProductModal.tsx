import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/formatters';
import { X, PackagePlus, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSuccess?: () => void;
}

const COMMON_CATEGORIES = [
  'Grains & Flours',
  'Cooking Oils',
  'Noodles & Pasta',
  'Dairy & Beverages',
  'Sugar & Sweeteners',
  'Packaged Foods',
  'Beverages & Water',
  'Toiletries & Household',
  'Snacks & Confectionery',
  'Other Categories',
];

const COMMON_UNITS = [
  'bags',
  'cartons',
  'tins',
  'bottles',
  'packs',
  'pieces',
  'rolls',
  'kg',
  'jerrycans',
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}) => {
  const { addProduct, updateProduct } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grains & Flours');
  const [customCategory, setCustomCategory] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [minStockLevel, setMinStockLevel] = useState<number | ''>(5);
  const [unit, setUnit] = useState('bags');
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      if (COMMON_CATEGORIES.includes(productToEdit.category)) {
        setCategory(productToEdit.category);
      } else {
        setCategory('Other Categories');
        setCustomCategory(productToEdit.category);
      }
      setCostPrice(productToEdit.costPrice);
      setSellingPrice(productToEdit.sellingPrice);
      setStockQuantity(productToEdit.stockQuantity);
      setMinStockLevel(productToEdit.minStockLevel);
      setUnit(productToEdit.unit || 'pieces');
      setBarcode(productToEdit.barcode || '');
    } else {
      setName('');
      setCategory('Grains & Flours');
      setCustomCategory('');
      setCostPrice('');
      setSellingPrice('');
      setStockQuantity('');
      setMinStockLevel(5);
      setUnit('bags');
      setBarcode('');
      setError('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Margin calculation
  const numCost = Number(costPrice) || 0;
  const numSelling = Number(sellingPrice) || 0;
  const unitProfit = numSelling - numCost;
  const marginPercent = numSelling > 0 ? ((unitProfit / numSelling) * 100).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    if (numCost <= 0) {
      setError('Purchase cost price must be greater than ₦0');
      return;
    }

    if (numSelling <= 0) {
      setError('Selling price must be greater than ₦0');
      return;
    }

    if (numSelling < numCost) {
      setError('Selling price is lower than purchase cost. Please verify prices.');
      return;
    }

    const finalCategory =
      category === 'Other Categories' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const qty = stockQuantity === '' ? 0 : Number(stockQuantity);
    const minThreshold = minStockLevel === '' ? 5 : Number(minStockLevel);

    if (productToEdit) {
      updateProduct(productToEdit.id, {
        name: name.trim(),
        category: finalCategory,
        costPrice: numCost,
        sellingPrice: numSelling,
        stockQuantity: qty,
        minStockLevel: minThreshold,
        unit,
        barcode: barcode.trim() || undefined,
      });
    } else {
      addProduct({
        name: name.trim(),
        category: finalCategory,
        costPrice: numCost,
        sellingPrice: numSelling,
        stockQuantity: qty,
        minStockLevel: minThreshold,
        unit,
        barcode: barcode.trim() || undefined,
      });
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {productToEdit ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-xs text-slate-300">Inventory Catalog & Pricing</p>
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
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mama Gold Rice (50kg Bag)"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Category and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {COMMON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {category === 'Other Categories' && (
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unit of Measurement *
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing: Purchase Cost & Selling Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Cost (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0"
                    value={costPrice}
                    onChange={(e) => {
                      setCostPrice(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">What you bought it for (COGS)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Selling Price (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0"
                    value={sellingPrice}
                    onChange={(e) => {
                      setSellingPrice(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Price to sell to customers</p>
              </div>
            </div>

            {/* Live Profit Preview */}
            {numCost > 0 && numSelling > 0 && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  unitProfit >= 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold block">Estimated Margin per Unit:</span>
                    <span className="text-[11px] text-slate-500">
                      Markup: {marginPercent}% on selling price
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm font-mono-num block">
                    {formatNaira(unitProfit)} / {unit}
                  </span>
                </div>
              </div>
            )}

            {/* Inventory Quantities & Low Stock Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Current Available Stock ({unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Alert Level ({unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Alert when quantity reaches this</p>
              </div>
            </div>

            {/* Optional Barcode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Barcode / SKU Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 600123456789"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
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
              <span>{productToEdit ? 'Save Changes' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
