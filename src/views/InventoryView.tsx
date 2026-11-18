import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { formatNaira } from '../utils/formatters';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  TrendingUp,
  Tag,
  ArrowUpDown,
} from 'lucide-react';

interface InventoryViewProps {
  onOpenAddProduct: (productToEdit?: Product) => void;
  onOpenAdjustStock: (product: Product) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onOpenAddProduct,
  onOpenAdjustStock,
}) => {
  const { products, deleteProduct, lowStockProducts } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      const matchLowStock = !filterLowStockOnly || p.stockQuantity <= p.minStockLevel;

      return matchCat && matchSearch && matchLowStock;
    });
  }, [products, selectedCategory, searchQuery, filterLowStockOnly]);

  // Aggregate Inventory Valuation
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalCostValuation = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.costPrice,
    0
  );
  const totalRetailValuation = products.reduce(
    (sum, p) => sum + p.stockQuantity * p.sellingPrice,
    0
  );
  const potentialProfit = totalRetailValuation - totalCostValuation;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Inventory & Stock Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor stock levels, track purchase costs, selling prices and restock thresholds
          </p>
        </div>

        <button
          onClick={() => onOpenAddProduct()}
          className="self-start sm:self-auto flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* KPI Valuation Cards */}
      <div className="compact-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Products
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {products.length} Items
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{totalStockUnits.toLocaleString()} units in shop</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Inventory Cost Value
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {formatNaira(totalCostValuation)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Capital invested in stock</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Potential Retail Value
          </span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1 font-mono-num">
            {formatNaira(totalRetailValuation)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Expected sales revenue</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Potential Profit
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {formatNaira(potentialProfit)}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {totalRetailValuation > 0
              ? `${((potentialProfit / totalRetailValuation) * 100).toFixed(1)}% margin`
              : '0% margin'}
          </p>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockProducts.length > 0 && !filterLowStockOnly && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              {lowStockProducts.length} product{lowStockProducts.length === 1 ? ' is' : 's are'} at or below minimum stock level.
            </span>
          </div>
          <button
            onClick={() => setFilterLowStockOnly(true)}
            className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Show Low Stock Only
          </button>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition ${
                filterLowStockOnly
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Filter</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`py-1.5 px-3 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <h4 className="font-semibold text-slate-700 text-sm">No products found</h4>
            <p className="text-xs text-slate-400 mt-1">Try adjusting search or add a new product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Margin / Unit</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const unitMargin = p.sellingPrice - p.costPrice;
                  const marginPct = ((unitMargin / p.sellingPrice) * 100).toFixed(0);
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLow = p.stockQuantity <= p.minStockLevel && !isOutOfStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>
                          <span>{p.name}</span>
                          {p.barcode && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              SKU: {p.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                        {formatNaira(p.costPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {formatNaira(p.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono-num font-semibold text-emerald-700">
                          +{formatNaira(unitMargin)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({marginPct}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-mono-num font-extrabold text-sm px-2.5 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {p.stockQuantity} {p.unit}
                          </span>
                        </div>
                        {isLow && (
                          <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
                            Min: {p.minStockLevel}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenAdjustStock(p)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition"
                            title="Adjust Stock (+ / -)"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenAddProduct(p)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-base text-slate-900">Delete Product?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong>"{productToDelete.name}"</strong> from your inventory catalog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setProductToDelete(null)}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
