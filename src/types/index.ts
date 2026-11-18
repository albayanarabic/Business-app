export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number; // Purchase cost in ₦
  sellingPrice: number; // Selling price in ₦
  stockQuantity: number;
  minStockLevel: number; // Threshold for low stock warning
  unit: string; // e.g., 'bags', 'cartons', 'tins', 'bottles', 'pieces', 'packs'
  barcode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number; // COGS tracking at sale time
  unitPrice: number;
  total: number;
  unit: string;
}

export interface Sale {
  id: string;
  saleNumber: string; // e.g. "REC-2026-001"
  date: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  discount: number; // Flat ₦ discount
  totalAmount: number; // subtotal - discount
  totalCost: number; // Total COGS for items
  grossProfit: number; // totalAmount - totalCost
  paymentStatus: 'paid' | 'partial' | 'credit';
  amountPaid: number;
  balanceDue: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'POS' | 'Credit';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

export interface CustomerDebt {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  totalDebt: number; // Total amount owed
  amountPaid: number; // Cumulative repayments
  balanceDue: number; // Remaining balance
  initialDate: string;
  dueDate?: string;
  lastPaymentDate?: string;
  status: 'active' | 'cleared';
  linkedSaleId?: string;
  notes?: string;
  repayments: Repayment[];
}

export interface Repayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'POS';
  notes?: string;
  receiptNumber?: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity & NEPA'
  | 'Generator Fuel'
  | 'Transportation & Logistics'
  | 'Staff Salaries'
  | 'Internet & Airtime'
  | 'Maintenance'
  | 'Shop Supplies'
  | 'Security & LGA Levy'
  | 'Other Expenses';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  description?: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'POS';
  receiptNumber?: string;
}

export interface BusinessProfile {
  businessName: string;
  tagline: string;
  ownerName: string;
  businessCategory: string;
  phoneNumber: string;
  email: string;
  address: string;
  state: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  logoUrl?: string;
}

export type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';
