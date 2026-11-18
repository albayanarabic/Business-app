import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { formatNaira, formatDate, isWithinFilter } from '../utils/formatters';
import {
  ShoppingBag,
  Search,
  Plus,
  Receipt,
  Filter,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Eye,
  Trash2,
} from 'lucide-react';

interface SalesViewProps {
  onOpenRecordSale: () => void;
  onViewReceipt: (sale: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  onOpenRecordSale,
  onViewReceipt,
}) => {
  const { sales, deleteSale } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'credit'>('all');
  const [selectedSaleToDelete, setSelectedSaleToDelete] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.paymentStatus === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        s.saleNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [sales, statusFilter, searchQuery]);

  // Aggregate stats
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCashCollected = filteredSales.reduce((acc, s) => acc + s.amountPaid, 0);
  const totalBalanceDue = filteredSales.reduce((acc, s) => acc + s.balanceDue, 0);
  const totalGrossProfit = filteredSales.reduce((acc, s) => acc + s.grossProfit, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Transactions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record sales, manage customer payments, and generate digital receipts
          </p>
        </div>

        <button
          onClick={onOpenRecordSale}
          className="self-start sm:self-auto flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record a Sale</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="compact-kpi-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Revenue
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {formatNaira(totalSalesRevenue)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{filteredSales.length} total sales</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Cash Received
          </span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1 font-mono-num">
            {formatNaira(totalCashCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Paid in cash / transfer / POS</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Credit Outstanding
          </span>
          <p className="text-xl font-extrabold text-rose-600 mt-1 font-mono-num">
            {formatNaira(totalBalanceDue)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Unsettled credit sales</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Gross Profit
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono-num">
            {formatNaira(totalGrossProfit)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Sales revenue minus COGS</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt #, customer, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Sales' },
              { id: 'paid', label: 'Fully Paid' },
              { id: 'partial', label: 'Part Paid' },
              { id: 'credit', label: 'On Credit' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`py-1.5 px-3 rounded-lg font-medium whitespace-nowrap transition ${
                statusFilter === t.id
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Transactions List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <h4 className="font-semibold text-slate-700 text-sm">No sales found</h4>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
            <button
              onClick={onOpenRecordSale}
              className="mt-4 inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record a Sale</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => onViewReceipt(sale)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.saleNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(sale.date, true)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div>
                        <span>{sale.customerName || 'Walk-in Customer'}</span>
                        {sale.customerPhone && (
                          <span className="block text-[11px] text-slate-400 font-mono">
                            {sale.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                      {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                      {formatNaira(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          sale.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.paymentStatus === 'paid'
                          ? 'Paid in Full'
                          : sale.paymentStatus === 'partial'
                          ? `Part Paid (${formatNaira(sale.amountPaid)})`
                          : 'Credit (Unpaid)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewReceipt(sale)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSaleToDelete(sale)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {selectedSaleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-base text-slate-900">Delete Sale Record?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete transaction #{selectedSaleToDelete.saleNumber} (
              {formatNaira(selectedSaleToDelete.totalAmount)})? The sold products will be restored to inventory stock.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setSelectedSaleToDelete(null)}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteSale(selectedSaleToDelete.id, true);
                  setSelectedSaleToDelete(null);
                }}
                className="py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
