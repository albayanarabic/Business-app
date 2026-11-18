import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Product,
  Sale,
  SaleItem,
  CustomerDebt,
  Repayment,
  Expense,
  BusinessProfile,
  DateFilter,
} from '../types';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_DEBTS,
  INITIAL_EXPENSES,
} from '../data/sampleData';
import { isWithinFilter } from '../utils/formatters';

interface AppContextType {
  businessProfile: BusinessProfile;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number, reason?: string) => void;
  sales: Sale[];
  recordSale: (data: {
    items: { productId: string; quantity: number }[];
    discount?: number;
    paymentStatus: 'paid' | 'partial' | 'credit';
    amountPaid: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'POS' | 'Credit';
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    date?: string;
  }) => Sale;
  deleteSale: (id: string, restoreStock?: boolean) => void;
  debts: CustomerDebt[];
  addCustomerDebt: (debt: {
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    totalDebt: number;
    initialDate?: string;
    dueDate?: string;
    notes?: string;
    initialDeposit?: number;
  }) => CustomerDebt;
  recordRepayment: (
    debtId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank Transfer' | 'POS',
    notes?: string
  ) => void;
  updateCustomerDebt: (id: string, updates: Partial<CustomerDebt>) => void;
  deleteCustomerDebt: (id: string) => void;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  // Dashboard Metrics & Reports
  todayMetrics: {
    totalSales: number;
    totalExpenses: number;
    cogs: number;
    grossProfit: number;
    netProfit: number;
    transactionsCount: number;
    cashCollected: number;
  };
  totalOutstandingDebts: number;
  lowStockProducts: Product[];
  periodMetrics: {
    totalSales: number;
    totalExpenses: number;
    cogs: number;
    grossProfit: number;
    netProfit: number;
    transactionsCount: number;
    cashReceived: number;
    creditSales: number;
    repaymentsCollected: number;
  };
  // Reset / persistence controls
  resetToSampleData: () => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'biztrack_profile_v1',
  PRODUCTS: 'biztrack_products_v1',
  SALES: 'biztrack_sales_v1',
  DEBTS: 'biztrack_debts_v1',
  EXPENSES: 'biztrack_expenses_v1',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with localStorage or default sample data
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return saved ? JSON.parse(saved) : INITIAL_BUSINESS_PROFILE;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [debts, setDebts] = useState<CustomerDebt[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEBTS);
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(businessProfile));
  }, [businessProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  // Profile actions
  const updateBusinessProfile = (updates: Partial<BusinessProfile>) => {
    setBusinessProfile((prev) => ({ ...prev, ...updates }));
  };

  // Product actions
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustStock = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQty = Math.max(0, p.stockQuantity + delta);
          return { ...p, stockQuantity: newQty, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
  };

  // Record Sale Action with automatic stock deduction and debt creation
  const recordSale = (data: {
    items: { productId: string; quantity: number }[];
    discount?: number;
    paymentStatus: 'paid' | 'partial' | 'credit';
    amountPaid: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'POS' | 'Credit';
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    date?: string;
  }): Sale => {
    const saleDate = data.date || new Date().toISOString();
    const discount = Math.max(0, data.discount || 0);

    // Build SaleItem list with locked unitPrice and costPrice
    let subtotal = 0;
    let totalCost = 0;
    const saleItems: SaleItem[] = [];

    data.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const itemTotal = prod.sellingPrice * item.quantity;
        const itemCost = prod.costPrice * item.quantity;
        subtotal += itemTotal;
        totalCost += itemCost;

        saleItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: item.quantity,
          costPrice: prod.costPrice,
          unitPrice: prod.sellingPrice,
          total: itemTotal,
          unit: prod.unit,
        });
      }
    });

    const totalAmount = Math.max(0, subtotal - discount);
    const amountPaid = data.paymentStatus === 'paid' ? totalAmount : Math.min(totalAmount, Math.max(0, data.amountPaid));
    const balanceDue = totalAmount - amountPaid;
    const grossProfit = totalAmount - totalCost;

    const saleNumber = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      saleNumber,
      date: saleDate,
      items: saleItems,
      subtotal,
      discount,
      totalAmount,
      totalCost,
      grossProfit,
      paymentStatus: balanceDue <= 0 ? 'paid' : data.paymentStatus,
      amountPaid,
      balanceDue,
      paymentMethod: data.paymentMethod,
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };

    // 1. Deduct stock from products
    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = data.items.find((item) => item.productId === prod.id);
        if (soldItem) {
          return {
            ...prod,
            stockQuantity: Math.max(0, prod.stockQuantity - soldItem.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      })
    );

    // 2. If there is a balance due (partial or credit), create / update customer debt
    if (balanceDue > 0 && (data.customerName || data.customerPhone)) {
      const custName = data.customerName?.trim() || 'Credit Customer';
      const custPhone = data.customerPhone?.trim() || '';

      // Check if this customer already has an active debt record
      const existingDebt = debts.find(
        (d) =>
          d.status === 'active' &&
          ((custPhone && d.customerPhone === custPhone) ||
            d.customerName.toLowerCase() === custName.toLowerCase())
      );

      if (existingDebt) {
        // Append to existing debt
        const updatedTotal = existingDebt.totalDebt + balanceDue;
        const updatedBalance = existingDebt.balanceDue + balanceDue;

        setDebts((prev) =>
          prev.map((d) =>
            d.id === existingDebt.id
              ? {
                  ...d,
                  totalDebt: updatedTotal,
                  balanceDue: updatedBalance,
                  notes: `${d.notes ? d.notes + ' | ' : ''}Added ₦${balanceDue.toLocaleString()} from Sale #${saleNumber}`,
                }
              : d
          )
        );
        newSale.customerId = existingDebt.id;
      } else {
        // Create new customer debt record
        const newDebtId = `debt-${Date.now()}`;
        const newDebtRecord: CustomerDebt = {
          id: newDebtId,
          customerName: custName,
          customerPhone: custPhone,
          totalDebt: totalAmount,
          amountPaid: amountPaid,
          balanceDue: balanceDue,
          initialDate: saleDate,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), // Default 7 days credit
          status: 'active',
          linkedSaleId: newSale.id,
          notes: `Credit purchase for Sale #${saleNumber}`,
          repayments: amountPaid > 0
            ? [
                {
                  id: `rep-${Date.now()}`,
                  debtId: newDebtId,
                  amount: amountPaid,
                  date: saleDate,
                  paymentMethod: data.paymentMethod === 'Credit' ? 'Cash' : data.paymentMethod,
                  notes: 'Initial deposit paid at time of purchase',
                },
              ]
            : [],
        };

        setDebts((prev) => [newDebtRecord, ...prev]);
        newSale.customerId = newDebtId;
      }
    }

    // 3. Save new sale
    setSales((prev) => [newSale, ...prev]);
    return newSale;
  };

  const deleteSale = (id: string, restoreStock: boolean = true) => {
    const saleToDelete = sales.find((s) => s.id === id);
    if (!saleToDelete) return;

    if (restoreStock) {
      setProducts((prev) =>
        prev.map((prod) => {
          const item = saleToDelete.items.find((si) => si.productId === prod.id);
          if (item) {
            return {
              ...prod,
              stockQuantity: prod.stockQuantity + item.quantity,
              updatedAt: new Date().toISOString(),
            };
          }
          return prod;
        })
      );
    }

    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  // Customer Debt Actions
  const addCustomerDebt = (debtData: {
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    totalDebt: number;
    initialDate?: string;
    dueDate?: string;
    notes?: string;
    initialDeposit?: number;
  }): CustomerDebt => {
    const deposit = Math.max(0, debtData.initialDeposit || 0);
    const balance = Math.max(0, debtData.totalDebt - deposit);
    const dateStr = debtData.initialDate || new Date().toISOString();
    const newDebtId = `debt-${Date.now()}`;

    const newDebt: CustomerDebt = {
      id: newDebtId,
      customerName: debtData.customerName,
      customerPhone: debtData.customerPhone,
      customerAddress: debtData.customerAddress,
      totalDebt: debtData.totalDebt,
      amountPaid: deposit,
      balanceDue: balance,
      initialDate: dateStr,
      dueDate: debtData.dueDate,
      status: balance <= 0 ? 'cleared' : 'active',
      notes: debtData.notes,
      repayments: deposit > 0
        ? [
            {
              id: `rep-${Date.now()}`,
              debtId: newDebtId,
              amount: deposit,
              date: dateStr,
              paymentMethod: 'Cash',
              notes: 'Initial deposit received',
            },
          ]
        : [],
    };

    setDebts((prev) => [newDebt, ...prev]);
    return newDebt;
  };

  const recordRepayment = (
    debtId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank Transfer' | 'POS',
    notes?: string
  ) => {
    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id !== debtId) return debt;

        const cleanAmount = Math.max(0, amount);
        const newAmountPaid = debt.amountPaid + cleanAmount;
        const newBalanceDue = Math.max(0, debt.totalDebt - newAmountPaid);
        const isFullyCleared = newBalanceDue === 0;

        const newRepayment: Repayment = {
          id: `rep-${Date.now()}`,
          debtId,
          amount: cleanAmount,
          date: new Date().toISOString(),
          paymentMethod,
          notes: notes?.trim() || undefined,
        };

        return {
          ...debt,
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          lastPaymentDate: new Date().toISOString(),
          status: isFullyCleared ? 'cleared' : 'active',
          repayments: [newRepayment, ...debt.repayments],
        };
      })
    );
  };

  const updateCustomerDebt = (id: string, updates: Partial<CustomerDebt>) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const deleteCustomerDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  // Expense Actions
  const addExpense = (data: Omit<Expense, 'id'>): Expense => {
    const newExpense: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Reset / Clear handlers
  const resetToSampleData = () => {
    setBusinessProfile(INITIAL_BUSINESS_PROFILE);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setDebts(INITIAL_DEBTS);
    setExpenses(INITIAL_EXPENSES);
    localStorage.clear();
  };

  const clearAllData = () => {
    setProducts([]);
    setSales([]);
    setDebts([]);
    setExpenses([]);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.DEBTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  };

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockLevel);
  }, [products]);

  // Total Outstanding Customer Debts
  const totalOutstandingDebts = useMemo(() => {
    return debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + d.balanceDue, 0);
  }, [debts]);

  // Today's metrics (Calculations adhering strictly to: Gross Profit = Sales - COGS, Net Profit = Gross Profit - Expenses)
  const todayMetrics = useMemo(() => {
    const todaySales = sales.filter((s) => isWithinFilter(s.date, 'today'));
    const todayExpenses = expenses.filter((e) => isWithinFilter(e.date, 'today'));

    const totalSales = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cogs = todaySales.reduce((acc, s) => acc + s.totalCost, 0);
    const grossProfit = totalSales - cogs;
    const totalExpenses = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const cashCollected = todaySales.reduce((acc, s) => acc + s.amountPaid, 0);

    return {
      totalSales,
      totalExpenses,
      cogs,
      grossProfit,
      netProfit,
      transactionsCount: todaySales.length,
      cashCollected,
    };
  }, [sales, expenses]);

  // Period metrics based on dateFilter
  const periodMetrics = useMemo(() => {
    const filteredSales = sales.filter((s) => isWithinFilter(s.date, dateFilter));
    const filteredExpenses = expenses.filter((e) => isWithinFilter(e.date, dateFilter));

    // Repayments collected in this period
    let repaymentsCollected = 0;
    debts.forEach((debt) => {
      debt.repayments.forEach((rep) => {
        if (isWithinFilter(rep.date, dateFilter)) {
          repaymentsCollected += rep.amount;
        }
      });
    });

    const totalSales = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cogs = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
    const grossProfit = totalSales - cogs;
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    const cashReceived = filteredSales.reduce((acc, s) => acc + s.amountPaid, 0);
    const creditSales = filteredSales.reduce((acc, s) => acc + s.balanceDue, 0);

    return {
      totalSales,
      totalExpenses,
      cogs,
      grossProfit,
      netProfit,
      transactionsCount: filteredSales.length,
      cashReceived,
      creditSales,
      repaymentsCollected,
    };
  }, [sales, expenses, debts, dateFilter]);

  return (
    <AppContext.Provider
      value={{
        businessProfile,
        updateBusinessProfile,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        sales,
        recordSale,
        deleteSale,
        debts,
        addCustomerDebt,
        recordRepayment,
        updateCustomerDebt,
        deleteCustomerDebt,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        dateFilter,
        setDateFilter,
        todayMetrics,
        totalOutstandingDebts,
        lowStockProducts,
        periodMetrics,
        resetToSampleData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
