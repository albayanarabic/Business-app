import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory } from '../types';
import { formatNaira, toInputDate } from '../utils/formatters';
import { X, Receipt, CheckCircle2, Calendar, Tag } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Generator Fuel',
  'Electricity & NEPA',
  'Rent',
  'Staff Salaries',
  'Transportation & Logistics',
  'Internet & Airtime',
  'Maintenance',
  'Shop Supplies',
  'Security & LGA Levy',
  'Other Expenses',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addExpense } = useApp();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('Generator Fuel');
  const [date, setDate] = useState(() => toInputDate());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'POS'>('Cash');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please provide an expense title/item name');
      return;
    }

    const cleanAmount = Number(amount);
    if (!cleanAmount || cleanAmount <= 0) {
      setError('Please enter a valid expense amount greater than ₦0');
      return;
    }

    addExpense({
      title: title.trim(),
      amount: cleanAmount,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      paymentMethod,
      description: description.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add an Expense</h3>
              <p className="text-xs text-slate-300">Record shop and operational costs</p>
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
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Expense Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expense Title / Purpose *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Generator Fuel 25L, Market Refuse Ticket"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Amount (₦) *
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
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value === '' ? '' : Number(e.target.value));
                    setError('');
                  }}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Expense Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-left transition truncate ${
                      category === cat
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Payment Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Expense Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'Cash' | 'Bank Transfer' | 'POS')
                  }
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="POS">POS / Debit Card</option>
                </select>
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description / Memo (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Optional details or vendor info..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
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
              <span>Save Expense</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
