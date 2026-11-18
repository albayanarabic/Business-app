import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Expense, ExpenseCategory } from '../types';
import { formatNaira, formatDate, isWithinFilter } from '../utils/formatters';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
  Tag,
  TrendingDown,
  PieChart,
} from 'lucide-react';

interface ExpensesViewProps {
  onOpenAddExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenAddExpense }) => {
  const { expenses, deleteExpense, dateFilter, setDateFilter } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category));
    return ['all', ...Array.from(set)];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchPeriod = isWithinFilter(e.date, dateFilter);
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q);

      return matchPeriod && matchCat && matchSearch;
    });
  }, [expenses, dateFilter, selectedCategory, searchQuery]);

  // Aggregate stats
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });

    return Array.from(map.entries())
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpenseAmount > 0 ? (amt / totalExpenseAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenseAmount]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Operating Expense Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record shop overheads, fuel, electricity, salaries and logistics to keep accurate net profit figures
          </p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="self-start sm:self-auto flex items-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add an Expense</span>
        </button>
      </div>

      {/* KPI Cards & Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Expenses Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Expenses ({dateFilter.toUpperCase()})
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono-num">
              {formatNaira(totalExpenseAmount)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{filteredExpenses.length} entries recorded</span>
            <span className="font-medium text-slate-700">Deducted from gross profit</span>
          </div>
        </div>

        {/* Top Expense Category Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" /> Spending Breakdown by Category
            </span>
            <span className="text-xs text-slate-400">
              {categoryBreakdown.length} active categories
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No expense categories in this period</p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.slice(0, 3).map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-xs text-slate-700 mb-1">
                    <span className="font-semibold">{item.category}</span>
                    <span className="font-mono-num font-bold">
                      {formatNaira(item.amount)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({item.percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.percentage}%` }}
                      className="h-full bg-slate-700 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expense title, memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 self-stretch sm:self-auto bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`py-1.5 px-3 rounded-lg font-medium whitespace-nowrap transition ${
                  dateFilter === f.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pill Filters */}
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

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <h4 className="font-semibold text-slate-700 text-sm">No expenses recorded</h4>
            <p className="text-xs text-slate-400 mt-1">Record rent, NEPA token, generator fuel or salaries</p>
            <button
              onClick={onOpenAddExpense}
              className="mt-4 inline-flex items-center gap-1.5 py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add an Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <span>{exp.title}</span>
                        {exp.description && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {exp.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap text-sm">
                      {formatNaira(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setExpenseToDelete(exp)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-base text-slate-900">Delete Expense?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete <strong>"{expenseToDelete.title}"</strong> (
              {formatNaira(expenseToDelete.amount)})?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
