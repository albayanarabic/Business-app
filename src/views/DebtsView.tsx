import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerDebt } from '../types';
import { formatNaira, formatDate } from '../utils/formatters';
import {
  CreditCard,
  Plus,
  Search,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Calendar,
  History,
  Trash2,
  DollarSign,
  Send,
  UserCheck,
} from 'lucide-react';

interface DebtsViewProps {
  onOpenAddDebt: () => void;
  onOpenRepayment: (debt: CustomerDebt) => void;
  onOpenWhatsAppReminder: (debt: CustomerDebt) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  onOpenAddDebt,
  onOpenRepayment,
  onOpenWhatsAppReminder,
}) => {
  const { debts, totalOutstandingDebts, deleteCustomerDebt } = useApp();

  const [tab, setTab] = useState<'active' | 'cleared'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDebtHistory, setSelectedDebtHistory] = useState<CustomerDebt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<CustomerDebt | null>(null);

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchTab = tab === 'active' ? d.status === 'active' : d.status === 'cleared';
      const q = searchQuery.toLowerCase();
      const matchSearch =
        d.customerName.toLowerCase().includes(q) ||
        d.customerPhone.includes(q) ||
        (d.customerAddress && d.customerAddress.toLowerCase().includes(q));

      return matchTab && matchSearch;
    });
  }, [debts, tab, searchQuery]);

  // Aggregate stats
  const activeDebtsCount = debts.filter((d) => d.status === 'active').length;
  const clearedDebtsCount = debts.filter((d) => d.status === 'cleared').length;
  const totalRepaymentsEver = debts.reduce((sum, d) => sum + d.amountPaid, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Customer Credit & Debt Tracker
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track credit given to customers, record partial repayments and send polite WhatsApp reminders
          </p>
        </div>

        <button
          onClick={onOpenAddDebt}
          className="self-start sm:self-auto flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer Debt</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="compact-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Outstanding Debts
          </span>
          <p className="text-xl font-extrabold text-rose-600 mt-1 font-mono-num">
            {formatNaira(totalOutstandingDebts)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {activeDebtsCount} debtor{activeDebtsCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Debtors
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {activeDebtsCount} Customers
          </p>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">Follow up on pending balances</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Repayments Collected
          </span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1 font-mono-num">
            {formatNaira(totalRepaymentsEver)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Recovered credit payments</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Cleared Customers
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {clearedDebtsCount} Settled
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">100% fully paid accounts</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search debtor name, phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setTab('active')}
            className={`py-1.5 px-4 rounded-lg font-medium transition ${
              tab === 'active'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Owing Money ({activeDebtsCount})
          </button>
          <button
            onClick={() => setTab('cleared')}
            className={`py-1.5 px-4 rounded-lg font-medium transition ${
              tab === 'cleared'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cleared Accounts ({clearedDebtsCount})
          </button>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-3">
        {filteredDebts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <h4 className="font-semibold text-slate-700 text-sm">
              {tab === 'active'
                ? 'No active customer debts!'
                : 'No cleared customer accounts found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {tab === 'active'
                ? 'All customers are currently up to date on their payments.'
                : 'Cleared debts will appear here once customers complete payments.'}
            </p>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const percentPaid = Math.min(
              100,
              Math.round((debt.amountPaid / debt.totalDebt) * 100)
            );

            return (
              <div
                key={debt.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900">{debt.customerName}</h4>
                      {debt.status === 'cleared' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Fully Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Owing Balance
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      {debt.customerPhone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {debt.customerPhone}
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Credit taken: {formatDate(debt.initialDate)}
                      </span>
                      {debt.dueDate && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">
                            Due: {formatDate(debt.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Balance Due
                    </span>
                    <span className="text-2xl font-extrabold text-rose-600 font-mono-num block">
                      {formatNaira(debt.balanceDue)}
                    </span>
                  </div>
                </div>

                {/* Progress bar of repayment */}
                <div className="py-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>
                      Paid:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {formatNaira(debt.amountPaid)}
                      </strong>{' '}
                      of <strong className="font-mono">{formatNaira(debt.totalDebt)}</strong>
                    </span>
                    <span className="font-semibold text-slate-700">{percentPaid}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentPaid}%` }}
                      className={`h-full transition-all duration-500 ${
                        percentPaid === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                      }`}
                    />
                  </div>
                </div>

                {debt.notes && (
                  <p className="text-xs text-slate-500 italic mb-3">Note: {debt.notes}</p>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDebtHistory(debt)}
                      className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>History ({debt.repayments.length})</span>
                    </button>

                    <button
                      onClick={() => setDebtToDelete(debt)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Delete Customer Debt Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {debt.balanceDue > 0 && (
                    <div className="flex items-center gap-2">
                      {/* WhatsApp Reminder Button (Requirement 6) */}
                      <button
                        onClick={() => onOpenWhatsAppReminder(debt)}
                        className="py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span>WhatsApp Reminder</span>
                      </button>

                      {/* Record Repayment Button */}
                      <button
                        onClick={() => onOpenRepayment(debt)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Record Repayment</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Repayments History Modal */}
      {selectedDebtHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Repayment History
                </h3>
                <p className="text-xs text-slate-500">{selectedDebtHistory.customerName}</p>
              </div>
              <button
                onClick={() => setSelectedDebtHistory(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDebtHistory.repayments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No repayments recorded yet for this customer
                </p>
              ) : (
                selectedDebtHistory.repayments.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-emerald-700 font-mono text-sm">
                        +{formatNaira(rep.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(rep.date, true)} • {rep.paymentMethod}
                      </p>
                      {rep.notes && <p className="text-[10px] text-slate-500 mt-0.5">{rep.notes}</p>}
                    </div>
                    <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500">Remaining Balance:</span>
              <span className="font-bold text-rose-600 font-mono text-sm">
                {formatNaira(selectedDebtHistory.balanceDue)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Debt Record Modal */}
      {debtToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-base text-slate-900">Delete Debt Record?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete the debt record for <strong>"{debtToDelete.customerName}"</strong> (
              {formatNaira(debtToDelete.balanceDue)})?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDebtToDelete(null)}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCustomerDebt(debtToDelete.id);
                  setDebtToDelete(null);
                }}
                className="py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
