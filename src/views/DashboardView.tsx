import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Sale } from '../types';
import { formatNaira, formatDate, isWithinFilter } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Clock,
  Sparkles,
  Store,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenRecordSale: () => void;
  onOpenAddExpense: () => void;
  onOpenAddDebt: () => void;
  onOpenAddProduct: () => void;
  onViewReceipt: (sale: Sale) => void;
  onNavigateToTab: (tab: string) => void;
  onAdjustStockProduct: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenRecordSale,
  onOpenAddExpense,
  onOpenAddDebt,
  onOpenAddProduct,
  onViewReceipt,
  onNavigateToTab,
  onAdjustStockProduct,
}) => {
  const {
    businessProfile,
    todayMetrics,
    totalOutstandingDebts,
    lowStockProducts,
    sales,
    expenses,
    dateFilter,
    setDateFilter,
    periodMetrics,
  } = useApp();

  // Recent 5 sales
  const recentSales = sales.slice(0, 5);

  // 7-day mini bar chart data
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const daySales = sales
      .filter((s) => {
        const sd = new Date(s.date);
        return (
          new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()).getTime() === dMidnight
        );
      })
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const dayExpenses = expenses
      .filter((e) => {
        const ed = new Date(e.date);
        return (
          new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()).getTime() === dMidnight
        );
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const isToday = i === 6;

    return {
      dayName,
      sales: daySales,
      expenses: dayExpenses,
      isToday,
      dateFormatted: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
  });

  const maxChartVal = Math.max(
    1,
    ...last7DaysData.map((d) => Math.max(d.sales, d.expenses))
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Business Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 font-extrabold text-xl shrink-0">
              {businessProfile.businessName ? businessProfile.businessName.charAt(0) : 'B'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white break-words">
                  {businessProfile.businessName}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active Shop
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                <span>{businessProfile.tagline}</span>
              </p>
            </div>
          </div>

          {/* Date Selector Filter */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto max-w-full overflow-x-auto no-scrollbar bg-navy-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setDateFilter(item.id)}
                className={`py-1.5 px-3 rounded-lg font-medium transition ${
                  dateFilter === item.id
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 PROMINENT QUICK-ACTION BUTTONS (Requirement 2) */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Record Sale */}
          <button
            onClick={onOpenRecordSale}
            className="flex items-center gap-3 p-3.5 sm:p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md shadow-emerald-900/10 hover:shadow-lg transition transform active:scale-98 group text-left"
          >
            <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-105 transition">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider block">
                Point of Sale
              </span>
              <span className="text-sm font-bold text-white block mt-0.5">
                Record a Sale
              </span>
            </div>
          </button>

          {/* 2. Add an Expense */}
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-3 p-3.5 sm:p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-md hover:shadow-lg transition transform active:scale-98 group text-left border border-slate-800"
          >
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl group-hover:scale-105 transition">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Business Cost
              </span>
              <span className="text-sm font-bold text-white block mt-0.5">
                Add an Expense
              </span>
            </div>
          </button>

          {/* 3. Add Customer Debt */}
          <button
            onClick={onOpenAddDebt}
            className="flex items-center gap-3 p-3.5 sm:p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl shadow-sm hover:shadow border border-slate-200 transition transform active:scale-98 group text-left"
          >
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl group-hover:scale-105 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Give Credit
              </span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                Add Customer Debt
              </span>
            </div>
          </button>

          {/* 4. Add New Product */}
          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-3 p-3.5 sm:p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl shadow-sm hover:shadow border border-slate-200 transition transform active:scale-98 group text-left"
          >
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl group-hover:scale-105 transition">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Inventory
              </span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                Add New Product
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Low-stock Warning Banner (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                Low Stock Alert ({lowStockProducts.length} items low)
              </h4>
              <p className="text-xs text-amber-800/80 mt-0.5">
                {lowStockProducts.map((p) => `${p.name} (${p.stockQuantity} ${p.unit})`).slice(0, 2).join(', ')}
                {lowStockProducts.length > 2 ? ` and ${lowStockProducts.length - 2} more...` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="self-end sm:self-auto py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shrink-0"
          >
            Review & Restock
          </button>
        </div>
      )}

      {/* MAIN METRIC CARDS (Requirement 2 & Requirement 3) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {dateFilter === 'today'
              ? "Today's Performance Overview"
              : `Performance Overview (${dateFilter.toUpperCase()})`}
          </p>
          <span className="text-xs text-slate-400 font-medium">
            {periodMetrics.transactionsCount} transaction{periodMetrics.transactionsCount === 1 ? '' : 's'} recorded
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Sales
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-num">
              {formatNaira(periodMetrics.totalSales)}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Cash in Hand:</span>
              <span className="font-semibold text-emerald-700">
                {formatNaira(periodMetrics.cashReceived)}
              </span>
            </div>
          </div>

          {/* Card 2: Operating Expenses */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Expenses
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-num">
              {formatNaira(periodMetrics.totalExpenses)}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>COGS (Goods Sold):</span>
              <span className="font-semibold text-slate-700">
                {formatNaira(periodMetrics.cogs)}
              </span>
            </div>
          </div>

          {/* Card 3: Estimated Net Profit (Gross Profit - Expenses) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Estimated Net Profit
                </span>
                <span className="text-[10px] text-slate-400">Gross Profit - Expenses</span>
              </div>
              <div
                className={`p-2 rounded-xl ${
                  periodMetrics.netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {periodMetrics.netProfit >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <p
              className={`text-2xl font-extrabold mt-2 font-mono-num ${
                periodMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatNaira(periodMetrics.netProfit)}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Gross Profit:</span>
              <span className="font-semibold text-slate-800">
                {formatNaira(periodMetrics.grossProfit)}
              </span>
            </div>
          </div>

          {/* Card 4: Outstanding Customer Debts */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Debts
                </span>
                <span className="text-[10px] text-slate-400">Total Unpaid Balances</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-rose-600 mt-2 font-mono-num">
              {formatNaira(totalOutstandingDebts)}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Overdue Reminders</span>
              <button
                onClick={() => onNavigateToTab('debts')}
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>View Debts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SECTION: 7-Day Visual Trend + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-Day Performance Bar Chart (7 cols) */}
        <div className="lg:col-span-7 min-w-0 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                7-Day Sales & Expense Trend
              </h3>
              <p className="text-xs text-slate-400">Visual comparison of daily revenue vs spending</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span className="text-slate-600 font-medium">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span className="text-slate-600 font-medium">Expenses</span>
              </div>
            </div>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="flex-1 min-w-0 min-h-[200px] max-w-full overflow-hidden flex items-end justify-between gap-1 pt-6 pb-2 px-1 border-b border-slate-100">
            {last7DaysData.map((d, index) => {
              const salesHeightPercent = (d.sales / maxChartVal) * 100;
              const expensesHeightPercent = (d.expenses / maxChartVal) * 100;

              return (
                <div key={index} className="relative flex-1 min-w-0 flex flex-col items-center gap-2 group">
                  {/* Tooltip on hover */}
                  <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition duration-150 absolute -top-8 bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20">
                    {d.dayName}: Sales {formatNaira(d.sales)} | Exp {formatNaira(d.expenses)}
                  </div>

                  {/* Bars */}
                  <div className="w-full flex items-end justify-center gap-0.5 h-36">
                    <div
                      style={{ height: `${Math.max(4, salesHeightPercent)}%` }}
                      className={`w-2.5 sm:w-5 rounded-t transition-all duration-300 ${
                        d.isToday
                          ? 'bg-emerald-600 shadow-sm'
                          : 'bg-emerald-500/80 hover:bg-emerald-600'
                      }`}
                    />
                    <div
                      style={{ height: `${Math.max(4, expensesHeightPercent)}%` }}
                      className="w-2.5 sm:w-5 rounded-t bg-slate-300 hover:bg-slate-400 transition-all duration-300"
                    />
                  </div>

                  {/* Day Label */}
                  <div className="text-center">
                    <span
                      className={`text-[11px] block ${
                        d.isToday ? 'font-bold text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {d.dayName}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{d.dateFormatted}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Calculated automatically from recorded transactions</span>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>Detailed Financial Reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Recent Transactions List (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Recent Transactions
            </h3>
            <button
              onClick={() => onNavigateToTab('sales')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>See All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[300px]">
            {recentSales.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No transactions recorded yet</p>
              </div>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => onViewReceipt(sale)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-1 rounded-lg cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        sale.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : sale.paymentStatus === 'partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {sale.customerName || 'Walk-in Customer'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(sale.date, true)} • {sale.items.length} item{sale.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono-num">
                      {formatNaira(sale.totalAmount)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                        sale.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.paymentStatus === 'paid'
                        ? 'Paid'
                        : sale.paymentStatus === 'partial'
                        ? 'Part Paid'
                        : 'Credit'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100">
            <button
              onClick={onOpenRecordSale}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Another Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
