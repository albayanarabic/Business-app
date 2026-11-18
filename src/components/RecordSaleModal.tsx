import React, { useState, useMemo } from 'react';
import { Product, Sale } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/formatters';
import {
  X,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Phone,
} from 'lucide-react';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: (sale: Sale) => void;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
}) => {
  const { products, recordSale } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'credit'>('paid');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'POS' | 'Credit'>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Extract distinct categories from inventory
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      setError(`Cannot add "${product.name}" because it is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          setError(`Cannot add more than available stock (${product.stockQuantity} ${product.unit})`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
    setError('');
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stockQuantity) {
      setError(`Only ${item.product.stockQuantity} ${item.product.unit} available in stock`);
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: newQty } : i))
    );
    setError('');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const discountVal = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountVal);

  // Set paid amount default based on status
  const effectiveAmountPaid = () => {
    if (paymentStatus === 'paid') return totalAmount;
    if (paymentStatus === 'credit') return 0;
    return amountPaid === '' ? 0 : Number(amountPaid);
  };

  const balanceDue = Math.max(0, totalAmount - effectiveAmountPaid());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Please add at least one product to the sale');
      return;
    }

    if (discountVal > subtotal) {
      setError('Discount cannot exceed the subtotal amount');
      return;
    }

    if (paymentStatus !== 'paid' && balanceDue > 0 && !customerName.trim()) {
      setError('Customer name is required for credit or part-payment sales');
      return;
    }

    const recordedPaid = effectiveAmountPaid();
    if (paymentStatus === 'partial' && (recordedPaid <= 0 || recordedPaid >= totalAmount)) {
      setError(`For part payment, amount paid must be between ₦1 and ${formatNaira(totalAmount - 1)}`);
      return;
    }

    const savedSale = recordSale({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount: discountVal,
      paymentStatus,
      amountPaid: recordedPaid,
      paymentMethod: paymentStatus === 'credit' ? 'Credit' : paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (onSaleCompleted) {
      onSaleCompleted(savedSale);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record New Sale</h3>
              <p className="text-xs text-slate-300">Point of Sale & Stock Deductions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two column layout on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Product Catalog & Search (7 cols) */}
          <div className="md:col-span-7 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/50">
            {/* Search and Category Filter */}
            <div className="space-y-3 mb-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Categories horizontally scrollable */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-1.5 px-3 rounded-lg font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'all' ? 'All Products' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List / Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No products found matching your search</p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const inCartItem = cart.find((i) => i.productId === prod.id);
                  const isOutOfStock = prod.stockQuantity <= 0;
                  const isLowStock = prod.stockQuantity <= prod.minStockLevel && !isOutOfStock;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          {isLowStock && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                              Low
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-700">
                            {formatNaira(prod.sellingPrice)}
                          </span>
                          <span>•</span>
                          <span>
                            Stock: <strong>{prod.stockQuantity}</strong> {prod.unit}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {inCartItem ? (
                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm">
                            {inCartItem.quantity} in cart
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            className="p-2 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-lg text-slate-600 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Cart, Customer & Checkout (5 cols) */}
          <div className="md:col-span-5 p-4 sm:p-6 flex flex-col overflow-y-auto bg-white">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Sale Items ({cart.length})</span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 font-medium hover:underline"
                >
                  Clear All
                </button>
              )}
            </h4>

            {error && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Cart Items list */}
            {cart.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl mb-4 text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Select items from catalog on the left</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-slate-500 font-mono">
                        {formatNaira(item.product.sellingPrice)} each
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs w-6 text-center font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 ml-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discount & Totals */}
            <div className="space-y-2 pt-3 border-t border-slate-200 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatNaira(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Discount (₦)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 text-right px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                <span>Grand Total:</span>
                <span className="text-base text-emerald-800 font-mono-num font-extrabold">
                  {formatNaira(totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Status Tabs */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Option *
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('paid')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('partial')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition ${
                    paymentStatus === 'partial'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Part Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('credit')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition ${
                    paymentStatus === 'credit'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Full Credit
                </button>
              </div>

              {/* If Part Payment, show amount paid input */}
              {paymentStatus === 'partial' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-3 space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-900">
                    Amount Paid Now (₦) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalAmount - 1}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Enter deposit paid"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-amber-800 pt-1">
                    <span>Remaining Balance:</span>
                    <span className="font-bold font-mono">{formatNaira(balanceDue)}</span>
                  </div>
                </div>
              )}

              {/* If Paid or Partial, select payment channel */}
              {paymentStatus !== 'credit' && (
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as 'Cash' | 'Bank Transfer' | 'POS')
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="POS">POS Terminal</option>
                  </select>
                </div>
              )}

              {/* Customer Info (Mandatory if Credit or Partial) */}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Customer Name {paymentStatus !== 'paid' && <strong className="text-rose-600">*</strong>}</span>
                    {paymentStatus !== 'paid' && (
                      <span className="text-[10px] text-rose-600 font-normal">Required for debt tracking</span>
                    )}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Alhaja Kudirat"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required={paymentStatus !== 'paid'}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Phone (WhatsApp Reminder)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="e.g. 0802 345 6789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Sale Button */}
            <div className="mt-auto pt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={cart.length === 0}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2 shadow-md ${
                  cart.length === 0
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Sale ({formatNaira(totalAmount)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
