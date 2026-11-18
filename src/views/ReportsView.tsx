import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DateFilter } from '../types';
import { formatNaira, formatDate, isWithinFilter } from '../utils/formatters';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Printer,
  Calendar,
  AlertCircle,
  HelpCircle,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { businessProfile, sales, expenses, debts, dateFilter, setDateFilter } = useApp();

  // Filtered sales and expenses
  const filteredSales = useMemo(() => {
    return sales.filter((s) => isWithinFilter(s.date, dateFilter));
  }, [sales, dateFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isWithinFilter(e.date, dateFilter));
  }, [expenses, dateFilter]);

  // Financial Calculations (Strict adherence to Section 3)
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const costOfGoodsSold = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = totalSalesRevenue - costOfGoodsSold;
  const grossProfitMargin =
    totalSalesRevenue > 0 ? ((grossProfit / totalSalesRevenue) * 100).toFixed(1) : '0';

  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const estimatedNetProfit = grossProfit - totalOperatingExpenses;
  const netProfitMargin =
    totalSalesRevenue > 0 ? ((estimatedNetProfit / totalSalesRevenue) * 100).toFixed(1) : '0';

  // Cash vs Credit breakdown
  const cashReceivedFromSales = filteredSales.reduce((acc, s) => acc + s.amountPaid, 0);
  const creditSalesIssued = filteredSales.reduce((acc, s) => acc + s.balanceDue, 0);

  // Repayments collected in this period
  let debtRepaymentsCollected = 0;
  debts.forEach((debt) => {
    debt.repayments.forEach((rep) => {
      if (isWithinFilter(rep.date, dateFilter)) {
        debtRepaymentsCollected += rep.amount;
      }
    });
  });

  const totalActualCashInflow = cashReceivedFromSales + debtRepaymentsCollected;

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: totalOperatingExpenses > 0 ? (amount / totalOperatingExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalOperatingExpenses]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Performance & Profit Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Accurate profit calculations distinguishing Sales, COGS, Gross Profit and Operating Overheads
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" /> Reporting Period:
        </span>

        <div className="flex items-center gap-1 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Records' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id)}
              className={`py-1.5 px-3.5 rounded-lg font-medium whitespace-nowrap transition ${
                dateFilter === item.id
                  ? 'bg-navy-900 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* PROFIT & LOSS BREAKDOWN STATEMENT (Printable) */}
      <div id="printable-receipt" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{businessProfile.businessName}</h3>
              <p className="text-xs text-slate-500">{businessProfile.address}</p>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mt-1">
                Income & Profit Statement ({dateFilter.toUpperCase()})
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Generated: {formatDate(new Date().toISOString(), true)}</p>
              <p>Currency: Nigerian Naira (₦)</p>
            </div>
          </div>
        </div>

        {/* Financial Flow Cascade */}
        <div className="space-y-4 text-sm">
          {/* 1. Sales Revenue */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-slate-900">1. Total Sales Revenue</h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-4">
                Total value of goods sold ({filteredSales.length} transactions)
              </p>
            </div>
            <span className="text-lg font-extrabold text-slate-900 font-mono-num">
              {formatNaira(totalSalesRevenue)}
            </span>
          </div>

          {/* 2. Less Cost of Goods Sold (COGS) */}
          <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100 flex items-center justify-between ml-4">
            <div>
              <div className="flex items-center gap-2 text-rose-800">
                <span className="font-bold">LESS:</span>
                <h4 className="font-bold">2. Cost of Goods Sold (COGS)</h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 ml-14">
                Direct wholesale purchase cost of inventory items sold
              </p>
            </div>
            <span className="text-base font-bold text-rose-600 font-mono-num">
              - {formatNaira(costOfGoodsSold)}
            </span>
          </div>

          {/* 3. Gross Profit */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="font-bold text-xs uppercase px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                  EQUALS
                </span>
                <h4 className="font-bold text-base">3. Gross Profit (Trading Profit)</h4>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Sales Revenue minus COGS (Margin: {grossProfitMargin}%)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-emerald-800 font-mono-num block">
                {formatNaira(grossProfit)}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                {grossProfitMargin}% of sales
              </span>
            </div>
          </div>

          {/* 4. Less Operating Expenses */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="font-bold text-rose-700">LESS:</span>
                  <h4 className="font-bold">4. Operating Expenses & Overheads</h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-14">
                  Shop rent, generator fuel, NEPA light, transport, staff salaries ({filteredExpenses.length} entries)
                </p>
              </div>
              <span className="text-base font-bold text-rose-600 font-mono-num">
                - {formatNaira(totalOperatingExpenses)}
              </span>
            </div>

            {/* Sub-itemization of expenses */}
            {expensesByCategory.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                {expensesByCategory.map((exp) => (
                  <div
                    key={exp.category}
                    className="flex justify-between py-1 px-2.5 rounded bg-white border border-slate-100"
                  >
                    <span className="text-slate-600">{exp.category}</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {formatNaira(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Estimated Net Profit */}
          <div
            className={`p-5 rounded-2xl border-2 flex items-center justify-between ${
              estimatedNetProfit >= 0
                ? 'bg-navy-900 border-emerald-500 text-white shadow-lg'
                : 'bg-rose-900 border-rose-500 text-white shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase px-2 py-0.5 bg-white/20 rounded">
                  FINAL RESULT
                </span>
                <h4 className="font-extrabold text-lg text-white">5. Estimated Net Profit</h4>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                True profit remaining after paying for goods and operational expenses
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono-num block">
                {formatNaira(estimatedNetProfit)}
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                Net Margin: {netProfitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* CASH RECEIVED VS CREDIT SALES DISTINCTION (Requirement 3) */}
        <div className="pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Cash Flow & Credit Breakdown
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Box 1: Cash from Sales */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-slate-600 font-medium block">Cash Received from Sales</span>
              <p className="text-lg font-bold text-emerald-800 font-mono-num mt-1">
                {formatNaira(cashReceivedFromSales)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Paid immediately via cash, transfer or POS
              </p>
            </div>

            {/* Box 2: Credit Sales (Unpaid) */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="text-slate-600 font-medium block">Credit Sales (Customer Debts)</span>
              <p className="text-lg font-bold text-rose-700 font-mono-num mt-1">
                {formatNaira(creditSalesIssued)}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Revenue not yet in your bank or till
              </p>
            </div>

            {/* Box 3: Repayments Collected */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-slate-600 font-medium block">Debt Repayments Collected</span>
              <p className="text-lg font-bold text-blue-800 font-mono-num mt-1">
                {formatNaira(debtRepaymentsCollected)}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Cash recovered from previous debtors
              </p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Total Actual Cash Inflow This Period:
            </span>
            <span className="font-bold text-sm text-emerald-800 font-mono-num">
              {formatNaira(totalActualCashInflow)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
