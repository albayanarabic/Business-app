import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
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
import { useAuth } from './AuthContext';
import { SyncStatus, syncEngine } from '../lib/syncEngine';
import { setIndexedDBScope } from '../lib/indexedDb';

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
  syncStatus: SyncStatus;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  lastSyncedAt: string | null;
  pendingCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'biztrack_profile_v1',
  PRODUCTS: 'biztrack_products_v1',
  SALES: 'biztrack_sales_v1',
  DEBTS: 'biztrack_debts_v1',
  EXPENSES: 'biztrack_expenses_v1',
};

const userStorageKey = (key: string, userId: string | null): string =>
  userId ? `biztrack_user_${userId}_${key}` : key;

const readStored = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  return saved === null ? fallback : JSON.parse(saved) as T;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, business, isLoading: authLoading, isConfigured } = useAuth();
  const storageUserId = user?.id ?? null;
  const storageScope = storageUserId ?? 'guest';
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() =>
    readStored(STORAGE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    readStored(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
  );
  const [sales, setSales] = useState<Sale[]>(() =>
    readStored(STORAGE_KEYS.SALES, INITIAL_SALES)
  );
  const [debts, setDebts] = useState<CustomerDebt[]>(() =>
    readStored(STORAGE_KEYS.DEBTS, INITIAL_DEBTS)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    readStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES)
  );
  const [hydratedScope, setHydratedScope] = useState('guest');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getStatus());
  const [pendingCount, setPendingCount] = useState(syncEngine.getPendingCount());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(syncEngine.getLastSyncedAt());
  const migrationRef = useRef<{
    userId: string;
    businessId: string;
    snapshot: { profile: BusinessProfile; products: Product[]; sales: Sale[]; debts: CustomerDebt[]; expenses: Expense[] };
  } | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const setSnapshot = useCallback((snapshot: {
    profile: BusinessProfile; products: Product[]; sales: Sale[]; debts: CustomerDebt[]; expenses: Expense[];
  }) => {
    setBusinessProfile(snapshot.profile);
    setProducts(snapshot.products);
    setSales(snapshot.sales);
    setDebts(snapshot.debts);
    setExpenses(snapshot.expenses);
  }, []);

  const runPendingMigration = useCallback(async () => {
    const pending = migrationRef.current;
    if (!pending) return;
    await syncEngine.migrateLocalDataToCloud(pending.userId, pending.businessId, pending.snapshot);
    localStorage.setItem(`biztrack_migrated_${pending.userId}_${pending.businessId}`, 'true');
    localStorage.removeItem(`biztrack_migration_pending_${pending.userId}_${pending.businessId}`);
    migrationRef.current = null;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setIndexedDBScope(storageUserId);
    if (!user || !business || !isConfigured) {
      migrationRef.current = null;
      if (hydratedScope !== 'guest') {
        setBusinessProfile(readStored(STORAGE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE));
        setProducts(readStored(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS));
        setSales(readStored(STORAGE_KEYS.SALES, INITIAL_SALES));
        setDebts(readStored(STORAGE_KEYS.DEBTS, INITIAL_DEBTS));
        setExpenses(readStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES));
      }
      setHydratedScope('guest');
      return;
    }

    const accountKeys = Object.values(STORAGE_KEYS).map((key) => userStorageKey(key, user.id));
    const accountHasData = accountKeys.some((key) => localStorage.getItem(key) !== null);
    const legacyHasData = Object.values(STORAGE_KEYS).some((key) => localStorage.getItem(key) !== null);
    const migrationKey = `biztrack_migrated_${user.id}_${business.id}`;
    const migrationPendingKey = `biztrack_migration_pending_${user.id}_${business.id}`;
    const migrationPending = localStorage.getItem(migrationPendingKey) === 'true';
    const accountFallback: BusinessProfile = {
      ...INITIAL_BUSINESS_PROFILE,
      businessName: business.name,
      ownerName: business.ownerName ?? INITIAL_BUSINESS_PROFILE.ownerName,
      tagline: business.tagline ?? INITIAL_BUSINESS_PROFILE.tagline,
      businessCategory: business.category ?? INITIAL_BUSINESS_PROFILE.businessCategory,
      phoneNumber: business.phoneNumber ?? '',
      address: business.address ?? '',
      bankName: business.bankName ?? '',
      accountNumber: business.accountNumber ?? '',
      accountName: business.accountName ?? '',
      logoUrl: business.logoUrl,
    };
    const snapshot = accountHasData
      ? {
          profile: readStored(userStorageKey(STORAGE_KEYS.PROFILE, user.id), accountFallback),
          products: readStored(userStorageKey(STORAGE_KEYS.PRODUCTS, user.id), [] as Product[]),
          sales: readStored(userStorageKey(STORAGE_KEYS.SALES, user.id), [] as Sale[]),
          debts: readStored(userStorageKey(STORAGE_KEYS.DEBTS, user.id), [] as CustomerDebt[]),
          expenses: readStored(userStorageKey(STORAGE_KEYS.EXPENSES, user.id), [] as Expense[]),
        }
      : legacyHasData
        ? {
            profile: readStored(STORAGE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE),
            products: readStored(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
            sales: readStored(STORAGE_KEYS.SALES, INITIAL_SALES),
            debts: readStored(STORAGE_KEYS.DEBTS, INITIAL_DEBTS),
            expenses: readStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES),
          }
        : {
            profile: accountFallback,
            products: [] as Product[],
            sales: [] as Sale[],
            debts: [] as CustomerDebt[],
            expenses: [] as Expense[],
          };

    setSnapshot(snapshot);
    setHydratedScope(user.id);
    if (localStorage.getItem(migrationKey) !== 'true' && (migrationPending || (!accountHasData && legacyHasData))) {
      migrationRef.current = { userId: user.id, businessId: business.id, snapshot };
      localStorage.setItem(migrationPendingKey, 'true');
      if (navigator.onLine) {
        void runPendingMigration().then(() => syncEngine.syncNow()).catch((error: unknown) => {
          setSyncStatus('failed');
          console.error('Local record migration failed; local records were kept:', error);
        });
      }
    } else {
      migrationRef.current = null;
      if (navigator.onLine) {
        void syncEngine.syncNow();
      } else if (!accountHasData) {
        void syncEngine.readCachedSnapshot(user.id).then((cached) => {
          if (cached && !migrationRef.current) setSnapshot(cached);
        }).catch((error: unknown) => {
          setSyncStatus('failed');
          console.error('Unable to restore the offline IndexedDB snapshot:', error);
        });
      }
    }
  }, [authLoading, user?.id, business?.id, isConfigured, setSnapshot, runPendingMigration]);

  useEffect(() => {
    syncEngine.setListeners({
      onStatusChange: (status, count) => {
        setSyncStatus(status);
        setPendingCount(count);
        setLastSyncedAt(syncEngine.getLastSyncedAt());
      },
      onDataUpdated: () => {
        void syncEngine.readLocalSnapshot().then((snapshot) => {
          setSnapshot(snapshot);
          setHydratedScope(storageScope);
        }).catch((error: unknown) => {
          setSyncStatus('failed');
          console.error('Unable to apply synced records locally:', error);
        });
      },
    });
    const handleOnline = () => {
      void runPendingMigration().then(() => syncEngine.syncNow()).catch((error: unknown) => {
        setSyncStatus('failed');
        console.error('Unable to resume local record migration:', error);
      });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      syncEngine.setListeners({});
    };
  }, [runPendingMigration, setSnapshot, storageScope]);

  const syncNow = useCallback(async () => {
    try {
      await runPendingMigration();
      return await syncEngine.syncNow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSyncStatus('failed');
      return { success: false, error: message };
    }
  }, [runPendingMigration]);

  const queueChange = (table: Parameters<typeof syncEngine.enqueue>[0], action: 'insert' | 'update' | 'delete', payload: unknown) => {
    void syncEngine.enqueue(table, action, payload).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      setSyncStatus(navigator.onLine ? 'failed' : 'offline');
      console.error(`Unable to queue ${table} change:`, message);
    });
  };

  // Persist only after the active account's records have been loaded, preventing account crossover.
  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    localStorage.setItem(userStorageKey(STORAGE_KEYS.PROFILE, storageUserId), JSON.stringify(businessProfile));
  }, [businessProfile, hydratedScope, storageScope, storageUserId]);

  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    localStorage.setItem(userStorageKey(STORAGE_KEYS.PRODUCTS, storageUserId), JSON.stringify(products));
  }, [products, hydratedScope, storageScope, storageUserId]);

  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    localStorage.setItem(userStorageKey(STORAGE_KEYS.SALES, storageUserId), JSON.stringify(sales));
  }, [sales, hydratedScope, storageScope, storageUserId]);

  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    localStorage.setItem(userStorageKey(STORAGE_KEYS.DEBTS, storageUserId), JSON.stringify(debts));
  }, [debts, hydratedScope, storageScope, storageUserId]);

  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    localStorage.setItem(userStorageKey(STORAGE_KEYS.EXPENSES, storageUserId), JSON.stringify(expenses));
  }, [expenses, hydratedScope, storageScope, storageUserId]);

  useEffect(() => {
    if (hydratedScope !== storageScope) return;
    void syncEngine.persistLocalSnapshot(
      { profile: businessProfile, products, sales, debts, expenses },
      storageUserId
    ).catch((error: unknown) => {
      setSyncStatus('failed');
      console.error('Unable to persist the local IndexedDB snapshot:', error);
    });
  }, [businessProfile, products, sales, debts, expenses, hydratedScope, storageScope, storageUserId]);

  // Profile actions
  const updateBusinessProfile = (updates: Partial<BusinessProfile>) => {
    const updated = { ...businessProfile, ...updates };
    setBusinessProfile(updated);
    queueChange('businesses', 'update', updated);
  };

  // Product actions
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...data,
      id: `prod-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    queueChange('products', 'insert', newProduct);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const existing = products.find((product) => product.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    setProducts((prev) => prev.map((product) => product.id === id ? updated : product));
    queueChange('products', 'update', updated);
  };

  const deleteProduct = (id: string) => {
    if (!products.some((product) => product.id === id)) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    queueChange('products', 'delete', { id });
  };

  const adjustStock = (id: string, delta: number) => {
    const product = products.find((entry) => entry.id === id);
    if (!product) return;
    updateProduct(id, { stockQuantity: Math.max(0, product.stockQuantity + delta) });
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
      id: `sale-${crypto.randomUUID()}`,
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
    const updatedProducts = products.map((product) => {
      const soldItem = data.items.find((item) => item.productId === product.id);
      return soldItem
        ? { ...product, stockQuantity: Math.max(0, product.stockQuantity - soldItem.quantity), updatedAt: new Date().toISOString() }
        : product;
    });
    setProducts(updatedProducts);
    updatedProducts.forEach((product, index) => {
      if (product !== products[index]) queueChange('products', 'update', product);
    });

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
        const updatedTotal = existingDebt.totalDebt + totalAmount;
        const updatedBalance = existingDebt.balanceDue + balanceDue;
        const updatedDebt: CustomerDebt = {
          ...existingDebt,
          totalDebt: updatedTotal,
          amountPaid: existingDebt.amountPaid + amountPaid,
          balanceDue: updatedBalance,
          repayments: amountPaid > 0
            ? [{
                id: `rep-${crypto.randomUUID()}`,
                debtId: existingDebt.id,
                amount: amountPaid,
                date: saleDate,
                paymentMethod: data.paymentMethod === 'Credit' ? 'Cash' : data.paymentMethod,
                notes: `Initial deposit for Sale #${saleNumber}`,
              }, ...existingDebt.repayments]
            : existingDebt.repayments,
          notes: `${existingDebt.notes ? existingDebt.notes + ' | ' : ''}Added ₦${balanceDue.toLocaleString()} from Sale #${saleNumber}`,
        };
        setDebts((prev) => prev.map((debt) => debt.id === updatedDebt.id ? updatedDebt : debt));
        queueChange('customer_debts', 'update', updatedDebt);
        newSale.customerId = existingDebt.id;
      } else {
        // Create new customer debt record
        const newDebtId = `debt-${crypto.randomUUID()}`;
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
                  id: `rep-${crypto.randomUUID()}`,
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
        queueChange('customer_debts', 'insert', newDebtRecord);
        newSale.customerId = newDebtId;
      }
    }

    // 3. Save new sale
    setSales((prev) => [newSale, ...prev]);
    queueChange('sales', 'insert', newSale);
    return newSale;
  };

  const deleteSale = (id: string, restoreStock: boolean = true) => {
    const saleToDelete = sales.find((s) => s.id === id);
    if (!saleToDelete) return;

    if (restoreStock) {
      const updatedProducts = products.map((product) => {
        const item = saleToDelete.items.find((saleItem) => saleItem.productId === product.id);
        return item
          ? { ...product, stockQuantity: product.stockQuantity + item.quantity, updatedAt: new Date().toISOString() }
          : product;
      });
      setProducts(updatedProducts);
      updatedProducts.forEach((product, index) => {
        if (product !== products[index]) queueChange('products', 'update', product);
      });
    }

    setSales((prev) => prev.filter((s) => s.id !== id));
    queueChange('sales', 'delete', { id });
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
    const newDebtId = `debt-${crypto.randomUUID()}`;

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
              id: `rep-${crypto.randomUUID()}`,
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
    queueChange('customer_debts', 'insert', newDebt);
    return newDebt;
  };

  const recordRepayment = (
    debtId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank Transfer' | 'POS',
    notes?: string
  ) => {
    const debt = debts.find((entry) => entry.id === debtId);
    if (!debt) return;
    const cleanAmount = Math.max(0, amount);
    const newAmountPaid = debt.amountPaid + cleanAmount;
    const newBalanceDue = Math.max(0, debt.totalDebt - newAmountPaid);
    const timestamp = new Date().toISOString();
    const newRepayment: Repayment = {
      id: `rep-${crypto.randomUUID()}`,
      debtId,
      amount: cleanAmount,
      date: timestamp,
      paymentMethod,
      notes: notes?.trim() || undefined,
    };
    const updatedDebt: CustomerDebt = {
      ...debt,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      lastPaymentDate: timestamp,
      status: newBalanceDue === 0 ? 'cleared' : 'active',
      repayments: [newRepayment, ...debt.repayments],
    };
    setDebts((prev) => prev.map((entry) => entry.id === debtId ? updatedDebt : entry));
    queueChange('customer_debts', 'update', updatedDebt);
  };

  const updateCustomerDebt = (id: string, updates: Partial<CustomerDebt>) => {
    const debt = debts.find((entry) => entry.id === id);
    if (!debt) return;
    const updated = { ...debt, ...updates };
    setDebts((prev) => prev.map((entry) => entry.id === id ? updated : entry));
    queueChange('customer_debts', 'update', updated);
  };

  const deleteCustomerDebt = (id: string) => {
    if (!debts.some((debt) => debt.id === id)) return;
    setDebts((prev) => prev.filter((d) => d.id !== id));
    queueChange('customer_debts', 'delete', { id });
  };

  // Expense Actions
  const addExpense = (data: Omit<Expense, 'id'>): Expense => {
    const newExpense: Expense = {
      ...data,
      id: `exp-${crypto.randomUUID()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    queueChange('expenses', 'insert', newExpense);
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const expense = expenses.find((entry) => entry.id === id);
    if (!expense) return;
    const updated = { ...expense, ...updates };
    setExpenses((prev) => prev.map((entry) => entry.id === id ? updated : entry));
    queueChange('expenses', 'update', updated);
  };

  const deleteExpense = (id: string) => {
    if (!expenses.some((expense) => expense.id === id)) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    queueChange('expenses', 'delete', { id });
  };

  // Reset / Clear handlers
  const resetToSampleData = () => {
    products.forEach((product) => queueChange('products', 'delete', { id: product.id }));
    sales.forEach((sale) => queueChange('sales', 'delete', { id: sale.id }));
    debts.forEach((debt) => queueChange('customer_debts', 'delete', { id: debt.id }));
    expenses.forEach((expense) => queueChange('expenses', 'delete', { id: expense.id }));
    setBusinessProfile(INITIAL_BUSINESS_PROFILE);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setDebts(INITIAL_DEBTS);
    setExpenses(INITIAL_EXPENSES);
    INITIAL_PRODUCTS.forEach((product) => queueChange('products', 'insert', product));
    INITIAL_DEBTS.forEach((debt) => queueChange('customer_debts', 'insert', debt));
    INITIAL_SALES.forEach((sale) => queueChange('sales', 'insert', sale));
    INITIAL_EXPENSES.forEach((expense) => queueChange('expenses', 'insert', expense));
    queueChange('businesses', 'update', INITIAL_BUSINESS_PROFILE);
  };

  const clearAllData = () => {
    products.forEach((product) => queueChange('products', 'delete', { id: product.id }));
    sales.forEach((sale) => queueChange('sales', 'delete', { id: sale.id }));
    debts.forEach((debt) => queueChange('customer_debts', 'delete', { id: debt.id }));
    expenses.forEach((expense) => queueChange('expenses', 'delete', { id: expense.id }));
    setProducts([]);
    setSales([]);
    setDebts([]);
    setExpenses([]);
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
        syncStatus,
        syncNow,
        lastSyncedAt,
        pendingCount,
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
