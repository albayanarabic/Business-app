import React, { useState } from 'react';
import { CustomerDebt } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira, formatDate } from '../utils/formatters';
import { X, CheckCircle2, DollarSign, Wallet, Phone } from 'lucide-react';

interface RepaymentModalProps {
  debt: CustomerDebt | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  debt,
  onClose,
  onSuccess,
}) => {
  const { recordRepayment } = useApp();

  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'POS'>('Cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!debt) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amount);

    if (!cleanAmount || cleanAmount <= 0) {
      setError('Please enter a valid repayment amount greater than ₦0');
      return;
    }

    if (cleanAmount > debt.balanceDue) {
      setError(`Amount cannot exceed the outstanding balance of ${formatNaira(debt.balanceDue)}`);
      return;
    }

    recordRepayment(debt.id, cleanAmount, paymentMethod, notes);
    if (onSuccess) onSuccess();
    onClose();
  };

  const setFullRepayment = () => {
    setAmount(debt.balanceDue);
    setError('');
  };

  const setPartial = (percent: number) => {
    setAmount(Math.round(debt.balanceDue * percent));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Repayment</h3>
              <p className="text-xs text-slate-300">Customer Credit Settlement</p>
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
          <div className="p-6 space-y-4">
            {/* Customer Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{debt.customerName}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {debt.customerPhone || 'No phone'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Balance Due</span>
                  <p className="text-xl font-extrabold text-rose-600 font-mono-num">
                    {formatNaira(debt.balanceDue)}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 text-xs text-slate-500">
                <div>
                  <span>Total Debt: </span>
                  <span className="font-medium text-slate-700">{formatNaira(debt.totalDebt)}</span>
                </div>
                <div className="text-right">
                  <span>Already Paid: </span>
                  <span className="font-medium text-emerald-700">{formatNaira(debt.amountPaid)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Repayment Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Repayment Amount (₦) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₦
                </span>
                <input
                  type="number"
                  min="1"
                  max={debt.balanceDue}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value === '' ? '' : Number(e.target.value));
                    setError('');
                  }}
                  placeholder="0"
                  required
                  autoFocus
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl font-mono-num font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={setFullRepayment}
                  className="text-xs py-1.5 px-3 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  Pay Full ({formatNaira(debt.balanceDue)})
                </button>
                <button
                  type="button"
                  onClick={() => setPartial(0.5)}
                  className="text-xs py-1.5 px-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                >
                  50% ({formatNaira(debt.balanceDue * 0.5)})
                </button>
                <button
                  type="button"
                  onClick={() => setPartial(0.25)}
                  className="text-xs py-1.5 px-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                >
                  25%
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Channel *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Bank Transfer', 'POS'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Note / Description (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid in cash at shop"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Remaining Balance Preview */}
            {amount !== '' && Number(amount) > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Remaining Balance After Payment:</span>
                <span className="font-bold text-slate-900 font-mono-num">
                  {formatNaira(Math.max(0, debt.balanceDue - Number(amount)))}
                </span>
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
              <span>Save Repayment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
