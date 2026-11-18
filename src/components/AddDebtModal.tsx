import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatNaira, toInputDate } from '../utils/formatters';
import { X, UserPlus, Calendar, Phone, MapPin, CheckCircle2 } from 'lucide-react';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addCustomerDebt } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [totalDebt, setTotalDebt] = useState<number | ''>('');
  const [initialDeposit, setInitialDeposit] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000); // 7 days from now
    return toInputDate(d.toISOString());
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    const cleanDebt = Number(totalDebt);
    if (!cleanDebt || cleanDebt <= 0) {
      setError('Please enter a debt amount greater than ₦0');
      return;
    }

    const cleanDeposit = Number(initialDeposit) || 0;
    if (cleanDeposit > cleanDebt) {
      setError('Initial deposit cannot be greater than total debt');
      return;
    }

    addCustomerDebt({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim() || undefined,
      totalDebt: cleanDebt,
      initialDeposit: cleanDeposit,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const calculatedBalance =
    totalDebt !== '' ? Math.max(0, Number(totalDebt) - (Number(initialDeposit) || 0)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add Customer Debt</h3>
              <p className="text-xs text-slate-300">Record credit given to customer</p>
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

            {/* Customer Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alhaja Kudirat Balogun"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Phone Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0802 345 6789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> Address / Shop Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, Balogun Market"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Total Debt Amount (₦) *
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
                    value={totalDebt}
                    onChange={(e) => {
                      setTotalDebt(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Deposit / Paid (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={initialDeposit}
                    onChange={(e) => {
                      setInitialDeposit(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono-num font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Expected Settlement Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Notes / Goods taken on credit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Items Taken on Credit / Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 1 bag Mama Gold Rice, promised balance next Friday"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Balance Preview Card */}
            {totalDebt !== '' && Number(totalDebt) > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-900 uppercase tracking-wide">
                    Net Outstanding Debt
                  </span>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Will reflect on dashboard debt figures
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-rose-600 font-mono-num">
                    {formatNaira(calculatedBalance)}
                  </span>
                </div>
              </div>
            )}
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
              <span>Save Customer Debt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
