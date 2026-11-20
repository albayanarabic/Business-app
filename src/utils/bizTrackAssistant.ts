// ============================================================
// BIZTRACK NIGERIA — INTELLIGENT OFFLINE AI ENGINE
// Zero Paid APIs · 100% Offline · Local Knowledge Base & Analysis
// ============================================================

import { CustomerDebt, Expense, ExpenseCategory, Product, Sale } from '../types';
import { formatNaira, isWithinFilter } from './formatters';

export type AssistantQuestion =
  | 'todaySummary'
  | 'yesterdaySummary'
  | 'thisWeekSummary'
  | 'thisMonthSummary'
  | 'profitExplanation'
  | 'productCount'
  | 'lowStock'
  | 'outOfStock'
  | 'stockValue'
  | 'topProfitableProducts'
  | 'topSellingProducts'
  | 'outstandingDebts'
  | 'topDebtor'
  | 'overdueDebts'
  | 'debtAdvice'
  | 'expenseSummary'
  | 'topExpenseCategory'
  | 'cashVsCredit'
  | 'businessHealth'
  | 'helpGuide'
  | 'howToRecordSale'
  | 'howToTrackDebt'
  | 'howToWhatsAppReminder'
  | 'howToSync'
  | 'howToBackup'
  | 'howToInstallPwa';

export type AssistantIntent =
  | { type: 'question'; question: AssistantQuestion; query?: string }
  | { type: 'navigate'; tab: string; label: string; actionDescription: string }
  | {
      type: 'addProduct';
      quantity: number;
      name: string;
      unit: string;
      costPrice?: number;
      sellingPrice?: number;
      ambiguousCost?: boolean;
    }
  | {
      type: 'expense';
      amount?: number;
      title: string;
      category: ExpenseCategory;
    }
  | {
      type: 'sale';
      quantity: number;
      productName: string;
      customerName?: string;
      paymentStatus?: 'paid' | 'credit';
      unitPrice?: number;
    }
  | { type: 'repayment'; amount?: number; customerName: string }
  | { type: 'unsupportedCreditSale' }
  | { type: 'offTopic'; topic?: string }
  | { type: 'unknown' };

export interface BusinessAnalysisContext {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  debts: CustomerDebt[];
  todayMetrics: {
    totalSales: number;
    totalExpenses: number;
    cogs: number;
    grossProfit: number;
    netProfit: number;
    transactionsCount: number;
    cashCollected: number;
  };
  businessProfile?: {
    businessName: string;
    businessCategory?: string;
    bankName?: string;
    accountNumber?: string;
  };
}

const UNIT_NAMES: Record<string, string> = {
  bag: 'bags',
  bags: 'bags',
  bottle: 'bottles',
  bottles: 'bottles',
  carton: 'cartons',
  cartons: 'cartons',
  pack: 'packs',
  packs: 'packs',
  piece: 'pieces',
  pieces: 'pieces',
  pair: 'pairs',
  pairs: 'pairs',
  tin: 'tins',
  tins: 'tins',
  kg: 'kg',
  roll: 'rolls',
  rolls: 'rolls',
  jerrycan: 'jerrycans',
  jerrycans: 'jerrycans',
  crate: 'crates',
  crates: 'crates',
  sachet: 'sachets',
  sachets: 'sachets',
};

function amountValue(value: string, suffix = ''): number {
  const amount = Number(value.replace(/,/g, ''));
  const multiplier =
    suffix.toLowerCase() === 'm' ? 1_000_000 : suffix.toLowerCase() === 'k' ? 1_000 : 1;
  return amount * multiplier;
}

function findLabeledAmount(
  text: string,
  label: RegExp
): { amount: number; perUnit: boolean } | undefined {
  const match = text.match(
    new RegExp(
      `(${label.source})[^\\d₦]*₦?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*([km])?\\s*(each|per\\s+\\w+)?`,
      'i'
    )
  );
  const labelIndex = text.search(label);
  const nearbyContext = labelIndex >= 0 ? text.slice(Math.max(0, labelIndex - 80), labelIndex) : '';
  return match
    ? {
        amount: amountValue(match[2], match[3]),
        perUnit: /\b(?:each|per\s+\w+)\b/i.test(`${nearbyContext} ${match[1]} ${match[4] || ''}`),
      }
    : undefined;
}

function findAmount(text: string, after: RegExp): number | undefined {
  const explicit = text.match(/(?:₦|NGN)\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?/i);
  if (explicit) return amountValue(explicit[1], explicit[2]);

  const compact = text.match(/\b(\d+(?:\.\d+)?)\s*([km])\b/i);
  if (compact) return amountValue(compact[1], compact[2]);

  const labeled = text.match(new RegExp(`${after.source}[^\\d]*(\\d[\\d,]*(?:\\.\\d+)?)`, 'i'));
  return labeled ? amountValue(labeled[1]) : undefined;
}

function findUnitPrice(text: string): number | undefined {
  const match = text.match(
    /\b(?:at|for)\s+₦?\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?\s*(?:each|per\s+unit)?/i
  );
  return match ? amountValue(match[1], match[2]) : undefined;
}

function extractItem(text: string): { quantity: number; name: string; unit: string } | undefined {
  const match = text.match(
    /\b(\d+)\s+(?:(bags?|bottles?|cartons?|packs?|pieces?|pairs?|tins?|kg|rolls?|jerrycans?|crates?|sachets?)\s+(?:of\s+)?)?([a-z][a-z0-9' -]*?)(?=\s*[.,;]|\s+(?:each|cost|costs|for|at|sell|selling|and|on|to my inventory|into inventory)\b|$)/i
  );
  if (!match) return undefined;

  const quantity = Number(match[1]);
  const name = match[3]
    .trim()
    .replace(/^(?:of\s+)/i, '')
    .replace(/\s+/g, ' ');
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !name) return undefined;

  const unit = match[2] ? UNIT_NAMES[match[2].toLowerCase()] : 'pieces';
  return { quantity, name, unit };
}

function extractCustomerName(text: string): string | undefined {
  const explicit = text.match(
    /\b(?:to|for customer)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}?)(?=\s+(?:on credit|for|using|with)\b|[.!?,]|$)/i
  );
  if (explicit) {
    const name = explicit[1].replace(/\s+(?:on|with|using|who|that|and)$/i, '').trim();
    if (name && !/^(?:the|my|a|an|credit|cash)$/i.test(name)) return name;
  }
  return undefined;
}

export function expenseCategory(text: string): ExpenseCategory {
  if (/transport|logistics|fuel fare|bus fare|keke/i.test(text)) return 'Transportation & Logistics';
  if (/generator|petrol|fuel|diesel/i.test(text)) return 'Generator Fuel';
  if (/rent|shop lease/i.test(text)) return 'Rent';
  if (/electricity|nepa|power bill|phcn|disco/i.test(text)) return 'Electricity & NEPA';
  if (/salary|salaries|wage|staff|worker/i.test(text)) return 'Staff Salaries';
  if (/airtime|internet|data subscription|recharge card|mtn|glo|airtel/i.test(text))
    return 'Internet & Airtime';
  if (/repair|maintenance|fixing|plumber|electrician/i.test(text)) return 'Maintenance';
  if (/security|lga|levy|tax|council|market fee/i.test(text)) return 'Security & LGA Levy';
  if (/packaging|nylon|bags|supplies|tape/i.test(text)) return 'Shop Supplies';
  return 'Other Expenses';
}

// -------------------------------------------------------------
// INTENT RECOGNITION (OFFLINE NLP)
// -------------------------------------------------------------

export function parseAssistantRequest(input: string): AssistantIntent {
  const text = input.trim();
  const normalized = text.toLowerCase();

  // 1. Off-topic guards: Prevent non-BizTrack conversations
  if (
    /\b(weather|football|premier league|politics|election|presidential|recipe|joke|poem|story|movie|crypto|bitcoin|forex)\b/i.test(
      normalized
    )
  ) {
    return { type: 'offTopic' };
  }

  // 2. Navigation & Feature requests
  if (/\b(go to|open|show me|take me to|navigate to)\s+(dashboard|home)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'dashboard', label: 'Dashboard', actionDescription: 'Navigating to Dashboard' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(sales|pos|cashier)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'sales', label: 'Sales & POS', actionDescription: 'Opening Sales page' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(inventory|stock|products)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'inventory', label: 'Inventory', actionDescription: 'Opening Inventory' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(debts|debtors|customers|owing)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'debts', label: 'Customers & Debts', actionDescription: 'Opening Customers & Debts' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(reminders?|whatsapp)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'reminders', label: 'WhatsApp Reminders', actionDescription: 'Opening WhatsApp Reminders' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(expenses?|spending)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'expenses', label: 'Expenses', actionDescription: 'Opening Expenses' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(reports?|profit|analytics)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'reports', label: 'Reports & Profit', actionDescription: 'Opening Reports' };
  }
  if (/\b(go to|open|show me|take me to|navigate to)\s+(settings|profile|account)\b/i.test(normalized)) {
    return { type: 'navigate', tab: 'settings', label: 'Settings', actionDescription: 'Opening Settings' };
  }

  // 3. BizTrack Knowledge & How-to guides
  if (/\b(how do i|how to)\s+(record|make|enter)\s+(a\s+)?sale\b/i.test(normalized)) {
    return { type: 'question', question: 'howToRecordSale' };
  }
  if (/\b(how do i|how to)\s+(track|record|manage)\s+(debt|debtor|credit)\b/i.test(normalized)) {
    return { type: 'question', question: 'howToTrackDebt' };
  }
  if (/\b(how do i|how to|what is)\s+(whatsapp|reminder|send reminder)\b/i.test(normalized)) {
    return { type: 'question', question: 'howToWhatsAppReminder' };
  }
  if (/\b(how do i|how to)\s+(sync|multi[- ]device|cloud|backup)\b/i.test(normalized)) {
    return { type: 'question', question: 'howToSync' };
  }
  if (/\b(how do i|how to)\s+(install|download|pwa|home screen)\b/i.test(normalized)) {
    return { type: 'question', question: 'howToInstallPwa' };
  }
  if (/\b(what can you do|help me|how does biztrack work|biztrack guide|features)\b/i.test(normalized)) {
    return { type: 'question', question: 'helpGuide' };
  }
  if (/\b(how is profit calculated|explain profit|gross profit vs net profit|how do you calculate profit)\b/i.test(normalized)) {
    return { type: 'question', question: 'profitExplanation' };
  }

  // 4. Financial & Inventory Analytical Queries
  if (/\b(health|performance|summary|overview|status|advice|tips)\b/i.test(normalized) && /\b(business|shop|store)\b/i.test(normalized)) {
    return { type: 'question', question: 'businessHealth' };
  }
  if (/\b(cash vs credit|cash collected|credit sales)\b/i.test(normalized)) {
    return { type: 'question', question: 'cashVsCredit' };
  }
  if (/\b(yesterday|yesterday's)\b/i.test(normalized) && /\b(sales?|profit|revenue|make|made)\b/i.test(normalized)) {
    return { type: 'question', question: 'yesterdaySummary' };
  }
  if (/\b(this week|weekly)\b/i.test(normalized) && /\b(sales?|profit|revenue|performance|report)\b/i.test(normalized)) {
    return { type: 'question', question: 'thisWeekSummary' };
  }
  if (/\b(this month|monthly)\b/i.test(normalized) && /\b(sales?|profit|revenue|performance|report)\b/i.test(normalized)) {
    return { type: 'question', question: 'thisMonthSummary' };
  }
  if (/\b(how many products|number of products|products do i have|count my products|inventory count)\b/i.test(normalized)) {
    return { type: 'question', question: 'productCount' };
  }
  if (/\b(out of stock|finished|zero stock)\b/i.test(normalized)) {
    return { type: 'question', question: 'outOfStock' };
  }
  if (/\b(low stock|running low|almost out of stock|items to reorder|reorder)\b/i.test(normalized)) {
    return { type: 'question', question: 'lowStock' };
  }
  if (/\b(who owes me the most|owes me the most|biggest debtor|top debtor|highest debtor)\b/i.test(normalized)) {
    return { type: 'question', question: 'topDebtor' };
  }
  if (/\b(overdue|late payment|due debt)\b/i.test(normalized)) {
    return { type: 'question', question: 'overdueDebts' };
  }
  if (/\b(debt advice|how to collect|debt collection|recover money|customers owe)\b/i.test(normalized) && /\b(debt|credit|money)\b/i.test(normalized)) {
    return { type: 'question', question: 'debtAdvice' };
  }
  if (/\b(highest gross profit|most gross profit|most profitable product|products? (?:generated|made) (?:the )?most profit|best margin)\b/i.test(normalized)) {
    return { type: 'question', question: 'topProfitableProducts' };
  }
  if (/\b(top selling|best seller|most sold|popular product|fastest moving)\b/i.test(normalized)) {
    return { type: 'question', question: 'topSellingProducts' };
  }
  if (/\b(customers owe|outstanding debt|total debt|how much.*owe me|owed to me|debt balance)\b/i.test(normalized)) {
    return { type: 'question', question: 'outstandingDebts' };
  }
  if (/\b(stock value|value of my stock|inventory value|worth of goods)\b/i.test(normalized)) {
    return { type: 'question', question: 'stockValue' };
  }
  if (/\b(expense summary|top expense|expenses|spending|breakdown of expenses)\b/i.test(normalized)) {
    return { type: 'question', question: 'expenseSummary' };
  }
  if (/\b(today|today's)\b/i.test(normalized) && /\b(make|made|sales?|profit|earn|earned|revenue)\b/i.test(normalized)) {
    return { type: 'question', question: 'todaySummary' };
  }

  // 5. Actions: Record Expense
  const item = extractItem(text);
  if (/\b(spent|expense|record an expense|log an expense|paid for|bought fuel|fuel for generator)\b/i.test(normalized)) {
    const amount = findAmount(text, /\b(?:spent|paid|cost|amount(?: of)?)\b/);
    const titleMatch = text.match(
      /\b(?:on|for)\s+(.+?)(?:\s+(?:today|yesterday|this week|for shop|for generator)\b|[.!?]|$)/i
    );
    return {
      type: 'expense',
      amount,
      title: titleMatch?.[1]?.trim() || 'Business expense',
      category: expenseCategory(text),
    };
  }

  // 6. Actions: Record Repayment
  if (
    !/\b(?:sold|record (?:a )?sale|make a sale)\b/i.test(normalized) &&
    /\b(repayment|repaid|paid|has paid|have paid|paid back|settled|cleared debt)\b/i.test(normalized)
  ) {
    const customer = text.match(
      /^(.+?)\s+(?:(?:has\s+|have\s+)?(?:paid|repaid|settled)|made (?:a )?repayment)\b/i
    );
    const customerName = customer?.[1]
      ?.replace(/^(?:customer\s+)?/i, '')
      .replace(/^(?:i|we|they)\s+/i, '')
      .trim();
    return {
      type: 'repayment',
      amount: findAmount(text, /\b(?:paid|repaid|settled|repayment)\b/),
      customerName: customerName || '',
    };
  }

  // 7. Actions: Record Sale
  if (/\b(?:sold|record (?:a )?sale|make a sale|sell)\b/i.test(normalized)) {
    if (!item) return { type: 'unknown' };
    const paymentStatus = /\b(on credit|credit|owing|pay later)\b/i.test(normalized)
      ? 'credit'
      : /\b(cash|paid|bank transfer|pos)\b/i.test(normalized)
        ? 'paid'
        : undefined;
    return {
      type: 'sale',
      quantity: item.quantity,
      productName: item.name,
      customerName: extractCustomerName(text),
      paymentStatus,
      unitPrice: findUnitPrice(text),
    };
  }

  if (
    /\b(credit|on credit|owing)\b/i.test(normalized) &&
    /\b(bought|purchase|purchased|goods)\b/i.test(normalized)
  ) {
    return { type: 'unsupportedCreditSale' };
  }

  // 8. Actions: Add Product / Restock
  if (/\b(bought|purchase|purchased|add|restock|stock up|increase stock)\b/i.test(normalized)) {
    if (!item) return { type: 'unknown' };
    const sellingStart = text.search(/\b(?:want\s+to\s+sell|sell(?:ing)?|sale\s+price)\b/i);
    const purchaseText = sellingStart >= 0 ? text.slice(0, sellingStart) : text;
    const costPrice = findLabeledAmount(
      purchaseText,
      /(?:(?:each|unit)\s+)?cost(?:s)?(?:\s+price)?|purchase(?:d)?\s+for|bought\s+for|\bfor\b/
    );
    const sellingPrice = findLabeledAmount(
      text,
      /(?:want\s+to\s+)?sell(?:ing)?(?:\s+each)?(?:\s+for|\s+price)?|sale\s+price/
    );
    const costWasTotal = costPrice && /\b(?:total|altogether|all\s+\d+)\b/i.test(purchaseText);
    const unitCost = costWasTotal ? costPrice.amount / item.quantity : costPrice?.amount;

    return {
      type: 'addProduct',
      ...item,
      costPrice: unitCost,
      sellingPrice: sellingPrice?.amount,
      ambiguousCost: costPrice !== undefined && !costPrice.perUnit && !costWasTotal,
    };
  }

  return { type: 'unknown' };
}

// -------------------------------------------------------------
// LOCAL KNOWLEDGE BASE & CALCULATION ENGINE
// -------------------------------------------------------------

export function generateAssistantAnswer(
  question: AssistantQuestion,
  ctx: BusinessAnalysisContext
): string {
  const { products, sales, expenses, debts, todayMetrics } = ctx;

  switch (question) {
    case 'todaySummary': {
      const margin =
        todayMetrics.totalSales > 0
          ? ((todayMetrics.grossProfit / todayMetrics.totalSales) * 100).toFixed(1)
          : '0.0';
      return [
        `📊 Today's Business Performance:`,
        `• Sales Revenue: ${formatNaira(todayMetrics.totalSales)} across ${todayMetrics.transactionsCount} transaction${todayMetrics.transactionsCount === 1 ? '' : 's'}.`,
        `• Cash Collected: ${formatNaira(todayMetrics.cashCollected)}${todayMetrics.totalSales > todayMetrics.cashCollected ? ` (₦${(todayMetrics.totalSales - todayMetrics.cashCollected).toLocaleString()} given out on credit)` : ''}.`,
        `• Cost of Goods Sold (COGS): ${formatNaira(todayMetrics.cogs)}.`,
        `• Gross Profit: ${formatNaira(todayMetrics.grossProfit)} (Gross Margin: ${margin}%).`,
        `• Operating Expenses: ${formatNaira(todayMetrics.totalExpenses)}.`,
        `• Estimated Net Profit: ${formatNaira(todayMetrics.netProfit)}.`,
        `\nNote: Net profit = Gross profit minus operating expenses. Stock purchases are not counted as operating expenses.`,
      ].join('\n');
    }

    case 'yesterdaySummary': {
      const yesterdaySales = sales.filter((s) => isWithinFilter(s.date, 'yesterday'));
      const yesterdayExpenses = expenses.filter((e) => isWithinFilter(e.date, 'yesterday'));
      const totalSales = yesterdaySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const cogs = yesterdaySales.reduce((sum, s) => sum + s.totalCost, 0);
      const grossProfit = totalSales - cogs;
      const totalExpenses = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;

      if (yesterdaySales.length === 0 && yesterdayExpenses.length === 0) {
        return `No sales or expenses were recorded for yesterday in your saved records.`;
      }

      return [
        `📅 Yesterday's Business Summary:`,
        `• Sales: ${formatNaira(totalSales)} (${yesterdaySales.length} transaction${yesterdaySales.length === 1 ? '' : 's'}).`,
        `• Gross Profit: ${formatNaira(grossProfit)}.`,
        `• Expenses: ${formatNaira(totalExpenses)}.`,
        `• Net Profit: ${formatNaira(netProfit)}.`,
      ].join('\n');
    }

    case 'thisWeekSummary': {
      const weekSales = sales.filter((s) => isWithinFilter(s.date, 'week'));
      const weekExpenses = expenses.filter((e) => isWithinFilter(e.date, 'week'));
      const totalSales = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const cogs = weekSales.reduce((sum, s) => sum + s.totalCost, 0);
      const grossProfit = totalSales - cogs;
      const totalExpenses = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;

      return [
        `📈 This Week's Performance:`,
        `• Total Sales: ${formatNaira(totalSales)} across ${weekSales.length} transaction${weekSales.length === 1 ? '' : 's'}.`,
        `• Gross Profit: ${formatNaira(grossProfit)}.`,
        `• Operating Expenses: ${formatNaira(totalExpenses)}.`,
        `• Net Profit: ${formatNaira(netProfit)}.`,
      ].join('\n');
    }

    case 'thisMonthSummary': {
      const monthSales = sales.filter((s) => isWithinFilter(s.date, 'month'));
      const monthExpenses = expenses.filter((e) => isWithinFilter(e.date, 'month'));
      const totalSales = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const cogs = monthSales.reduce((sum, s) => sum + s.totalCost, 0);
      const grossProfit = totalSales - cogs;
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = grossProfit - totalExpenses;

      return [
        `🗓️ This Month's Performance:`,
        `• Total Revenue: ${formatNaira(totalSales)} (${monthSales.length} sales).`,
        `• Gross Profit: ${formatNaira(grossProfit)}.`,
        `• Recorded Expenses: ${formatNaira(totalExpenses)}.`,
        `• Estimated Net Profit: ${formatNaira(netProfit)}.`,
      ].join('\n');
    }

    case 'profitExplanation': {
      return [
        `💡 How BizTrack Calculates Your Profits:`,
        `1. Cost of Goods Sold (COGS) = Sum of (Unit Cost Price × Quantity Sold) for each item sold.`,
        `2. Gross Profit = Sales Revenue - Cost of Goods Sold. (This is what you make before shop operating expenses).`,
        `3. Net Profit = Gross Profit - Operating Expenses (such as generator fuel, rent, staff salaries, transportation, and bills).`,
        `\nTip: Buying new stock is an inventory asset, not an operating expense!`,
      ].join('\n');
    }

    case 'productCount': {
      return `📦 Inventory Count: You have ${products.length} product${products.length === 1 ? '' : 's'} registered in your BizTrack database.`;
    }

    case 'outOfStock': {
      const outOfStock = products.filter((p) => p.stockQuantity === 0);
      if (outOfStock.length === 0) {
        return `✅ Great news! None of your products are completely out of stock.`;
      }
      return [
        `⚠️ Out of Stock Alert (${outOfStock.length} item${outOfStock.length === 1 ? '' : 's'}):`,
        ...outOfStock.map((p) => `• ${p.name}: 0 ${p.unit} remaining! (Reorder urgently)`),
      ].join('\n');
    }

    case 'lowStock': {
      const lowStock = products.filter((p) => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0);
      const outOfStock = products.filter((p) => p.stockQuantity === 0);
      if (lowStock.length === 0 && outOfStock.length === 0) {
        return `✅ All your inventory levels are healthy! No items are at or below their low-stock alert thresholds.`;
      }
      const lines = [`⚠️ Low Stock Notice:`];
      if (outOfStock.length > 0) {
        lines.push(`Out of Stock (${outOfStock.length}):`);
        outOfStock.forEach((p) => lines.push(`• ${p.name}: 0 ${p.unit}`));
      }
      if (lowStock.length > 0) {
        lines.push(`Running Low (${lowStock.length}):`);
        lowStock.forEach(
          (p) => lines.push(`• ${p.name}: ${p.stockQuantity} ${p.unit} left (Alert at ${p.minStockLevel})`)
        );
      }
      lines.push(`\nTip: Tap the '+' button or ask me to restock these items.`);
      return lines.join('\n');
    }

    case 'stockValue': {
      const costValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
      const retailValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);
      const potentialProfit = retailValue - costValue;
      return [
        `💎 Total Inventory Valuation:`,
        `• Cost Value (What you paid): ${formatNaira(costValue)}.`,
        `• Retail Value (Potential revenue if all sold): ${formatNaira(retailValue)}.`,
        `• Potential Gross Profit: ${formatNaira(potentialProfit)}.`,
      ].join('\n');
    }

    case 'topProfitableProducts': {
      const profitByProduct = new Map<string, { name: string; profit: number }>();
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          const discountShare =
            sale.subtotal > 0 ? sale.discount * (item.total / sale.subtotal) : 0;
          const grossProfit = item.total - discountShare - item.costPrice * item.quantity;
          const current = profitByProduct.get(item.productId);
          profitByProduct.set(item.productId, {
            name: current?.name || item.productName,
            profit: (current?.profit || 0) + grossProfit,
          });
        });
      });
      const top = [...profitByProduct.values()].sort((a, b) => b.profit - a.profit).slice(0, 5);
      if (top.length === 0) {
        return `No sales recorded yet to calculate product profitability.`;
      }
      return [
        `🏆 Top Products by Gross Profit Generated:`,
        ...top.map((item, i) => `${i + 1}. ${item.name}: ${formatNaira(item.profit)} gross profit`),
      ].join('\n');
    }

    case 'topSellingProducts': {
      const quantityMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      sales.forEach((s) => {
        s.items.forEach((item) => {
          const current = quantityMap.get(item.productId);
          quantityMap.set(item.productId, {
            name: current?.name || item.productName,
            quantity: (current?.quantity || 0) + item.quantity,
            revenue: (current?.revenue || 0) + item.total,
          });
        });
      });
      const top = [...quantityMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      if (top.length === 0) {
        return `No recorded sales yet.`;
      }
      return [
        `🔥 Most Sold Products by Volume:`,
        ...top.map(
          (item, i) => `${i + 1}. ${item.name}: ${item.quantity} units sold (${formatNaira(item.revenue)} revenue)`
        ),
      ].join('\n');
    }

    case 'outstandingDebts': {
      const activeDebts = debts.filter((d) => d.status === 'active' && d.balanceDue > 0);
      const total = activeDebts.reduce((sum, d) => sum + d.balanceDue, 0);
      if (activeDebts.length === 0) {
        return `🎉 Fantastic! None of your customers owe you money. All balances are fully cleared.`;
      }
      return [
        `💳 Outstanding Customer Debts:`,
        `• Total Amount Owed: ${formatNaira(total)}.`,
        `• Total Active Debtors: ${activeDebts.length} customer${activeDebts.length === 1 ? '' : 's'}.`,
        `\nRemember: Debt is uncollected revenue. Use BizTrack WhatsApp Reminders to politely follow up and recover your money.`,
      ].join('\n');
    }

    case 'topDebtor': {
      const totals = new Map<string, { name: string; balance: number; phone: string }>();
      debts
        .filter((d) => d.status === 'active' && d.balanceDue > 0)
        .forEach((d) => {
          const key = d.customerName.toLowerCase().trim();
          const current = totals.get(key);
          totals.set(key, {
            name: current?.name || d.customerName,
            balance: (current?.balance || 0) + d.balanceDue,
            phone: current?.phone || d.customerPhone || '',
          });
        });
      const top = [...totals.values()].sort((a, b) => b.balance - a.balance)[0];
      if (!top) {
        return `There are currently no active customer debt balances.`;
      }
      return `👤 Top Debtor: ${top.name} owes the highest balance of ${formatNaira(top.balance)}${top.phone ? ` (Phone: ${top.phone})` : ''}. You can generate a WhatsApp reminder for them in the Debts tab.`;
    }

    case 'overdueDebts': {
      const now = new Date();
      const overdue = debts.filter(
        (d) => d.status === 'active' && d.balanceDue > 0 && d.dueDate && new Date(d.dueDate) < now
      );
      if (overdue.length === 0) {
        return `✅ No customer debts are currently past their due dates.`;
      }
      const totalOverdue = overdue.reduce((sum, d) => sum + d.balanceDue, 0);
      return [
        `⏰ Overdue Debts (${overdue.length} debtor${overdue.length === 1 ? '' : 's'}):`,
        `Total Overdue Amount: ${formatNaira(totalOverdue)}.`,
        ...overdue.map(
          (d) =>
            `• ${d.customerName}: ${formatNaira(d.balanceDue)} (Due: ${new Date(d.dueDate!).toLocaleDateString()})`
        ),
      ].join('\n');
    }

    case 'debtAdvice': {
      return [
        `💡 BizTrack Tips for Recovering Customer Debts:`,
        `1. Send Reminders Promptly: Tap "Debts" ➔ tap the WhatsApp icon next to the debtor's name to send an auto-formatted reminder.`,
        `2. Request Partial Deposits: Even small repayments of ₦1,000–₦5,000 help keep cash flow moving.`,
        `3. Agree on Fixed Due Dates: When selling on credit, always set an explicit repayment date.`,
        `4. Set a Credit Ceiling: Limit any single customer to an amount you can safely afford while waiting for payment.`,
      ].join('\n');
    }

    case 'expenseSummary': {
      const currentMonthExpenses = expenses.filter((e) => isWithinFilter(e.date, 'month'));
      const total = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const categoryTotals = new Map<string, number>();
      currentMonthExpenses.forEach((e) => {
        categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
      });
      const sorted = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        return `No expenses recorded for this month.`;
      }

      return [
        `🧾 Monthly Expense Breakdown (Total: ${formatNaira(total)}):`,
        ...sorted.map(([cat, amt]) => {
          const pct = ((amt / total) * 100).toFixed(0);
          return `• ${cat}: ${formatNaira(amt)} (${pct}%)`;
        }),
      ].join('\n');
    }

    case 'cashVsCredit': {
      const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalCash = sales.reduce((sum, s) => sum + s.amountPaid, 0);
      const totalCredit = sales.reduce((sum, s) => sum + s.balanceDue, 0);
      const cashPct = totalSales > 0 ? ((totalCash / totalSales) * 100).toFixed(0) : '0';
      const creditPct = totalSales > 0 ? ((totalCredit / totalSales) * 100).toFixed(0) : '0';

      return [
        `💰 Cash vs. Credit Sales (All Time):`,
        `• Total Sales: ${formatNaira(totalSales)}.`,
        `• Cash/Bank Received: ${formatNaira(totalCash)} (${cashPct}%).`,
        `• Credit Sales: ${formatNaira(totalCredit)} (${creditPct}%).`,
        `\nHealthy retail guideline: Keep credit sales below 20% of your total sales volume to avoid liquidity shortages.`,
      ].join('\n');
    }

    case 'businessHealth': {
      const totalSales = todayMetrics.totalSales;
      const grossMargin =
        totalSales > 0 ? ((todayMetrics.grossProfit / totalSales) * 100).toFixed(1) : '0.0';
      const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockLevel).length;
      const activeDebtsTotal = debts
        .filter((d) => d.status === 'active')
        .reduce((sum, d) => sum + d.balanceDue, 0);

      return [
        `🩺 BizTrack Shop Health Assessment:`,
        `• Gross Profit Margin: ${grossMargin}% (Target: 20%–35% for retail).`,
        `• Stock Health: ${lowStockCount === 0 ? 'Optimal (No low-stock alerts)' : `Needs attention (${lowStockCount} items low/out of stock)`}.`,
        `• Uncollected Debts: ${formatNaira(activeDebtsTotal)}.`,
        `• Operational Expenses Today: ${formatNaira(todayMetrics.totalExpenses)}.`,
        `\nAction Recommendation: ${lowStockCount > 0 ? 'Restock critical items to prevent lost sales.' : activeDebtsTotal > 50000 ? 'Follow up with your top debtors on WhatsApp.' : 'Maintain strong sales momentum!'}`,
      ].join('\n');
    }

    case 'howToRecordSale': {
      return [
        `🛍️ How to Record a Sale in BizTrack:`,
        `1. Tap the green '+' button in the bottom navigation (or click "Record Sale" in top header).`,
        `2. Select your products and quantities.`,
        `3. Choose payment status: Paid in Full (Cash/Bank/POS) or Credit Sale.`,
        `4. If on credit, enter the customer's name and phone number. BizTrack automatically tracks the debt.`,
        `5. Click "Complete Sale". You can print, download, or share an electronic receipt immediately.`,
      ].join('\n');
    }

    case 'howToTrackDebt': {
      return [
        `💳 Tracking Customer Debts & Repayments:`,
        `1. When recording a sale, select "On Credit" or "Partial Payment". BizTrack automatically creates a debtor record.`,
        `2. Go to the "Debts" tab to see all customers owing your business.`,
        `3. When a customer pays, tap "Repayment" next to their name, enter the amount, and choose Cash or Bank Transfer.`,
        `4. BizTrack updates their balance instantly and records repayment history.`,
      ].join('\n');
    }

    case 'howToWhatsAppReminder': {
      return [
        `📱 WhatsApp Payment Reminders:`,
        `1. Go to the "Debts" tab or "Reminders" tab.`,
        `2. Find the debtor and tap "WhatsApp Reminder".`,
        `3. BizTrack generates a polite, professional payment reminder including their balance and your saved bank details.`,
        `4. Tap "Send via WhatsApp" to open WhatsApp directly with the message ready to send!`,
      ].join('\n');
    }

    case 'howToSync': {
      return [
        `☁️ Multi-Device Cloud Synchronisation:`,
        `1. BizTrack works 100% offline using your device's IndexedDB.`,
        `2. When you sign in (Account button in header), records automatically sync to Supabase cloud.`,
        `3. You can log into the same account on your phone, tablet, and laptop.`,
        `4. If you make sales while offline, BizTrack saves them locally and syncs automatically the moment you reconnect!`,
      ].join('\n');
    }

    case 'howToInstallPwa': {
      return [
        `📲 Installing BizTrack on Your Phone:`,
        `• On Android Chrome: Tap the "Install App" button in the header, or tap the three dots (⋮) in Chrome and tap "Install app" / "Add to Home screen".`,
        `• On iPhone Safari: Tap the Share button (square with arrow) and tap "Add to Home Screen".`,
        `• Once installed, BizTrack opens like a native app with zero address bar and full offline support!`,
      ].join('\n');
    }

    case 'helpGuide':
    default: {
      return [
        `👋 I am BizTrack AI, your offline business assistant.`,
        `Here is what you can ask me:`,
        `• 📊 "How much did I make today?" or "Show yesterday's profit"`,
        `• 📦 "Which products are running low?" or "Count my products"`,
        `• 💳 "How much do customers owe me?" or "Who owes me the most?"`,
        `• 💎 "What is my stock value?" or "Best selling products"`,
        `• 🧾 "Show this month's expenses" or "Explain profit calculation"`,
        `• 🛍️ "Sold 2 bags of rice for ₦70,000" (I'll prepare a sale for confirmation)`,
        `• 💰 "Spent ₦5,000 on generator fuel" (I'll prepare an expense for confirmation)`,
        `• 🧭 "Take me to Sales" or "Open Debts"`,
      ].join('\n');
    }
  }
}

export function completeProductPricing(
  intent: Extract<AssistantIntent, { type: 'addProduct' }>,
  clarification: string
): Extract<AssistantIntent, { type: 'addProduct' }> {
  const cost = findLabeledAmount(
    clarification,
    /(?:unit\s+)?cost(?:\s+price)?|purchase\s+price/
  );
  const selling = findLabeledAmount(
    clarification,
    /(?:unit\s+)?selling\s+price|(?:want\s+to\s+)?sell(?:ing)?(?:\s+each)?(?:\s+for|\s+price)?|sale\s+price/
  );
  const saysTotal = /\b(?:total|altogether|all\s+(?:of\s+)?(?:them|the\s+units|the\s+items))\b/i.test(
    clarification
  );
  const beforeSellingPrice = clarification.split(
    /(?:selling price|sell(?:ing)?(?:\s+each)?(?:\s+for|\s+price)?|sale price)/i
  )[0];
  const saysPerUnit =
    Boolean(cost?.perUnit) ||
    /\bunit\s+cost\b/i.test(clarification) ||
    /\b(?:each|per\s+\w+)\b/i.test(beforeSellingPrice);
  const costPrice =
    cost?.amount ??
    (intent.ambiguousCost && saysTotal && intent.costPrice !== undefined
      ? intent.costPrice / intent.quantity
      : intent.costPrice);

  return {
    ...intent,
    costPrice,
    sellingPrice: selling?.amount ?? intent.sellingPrice,
    ambiguousCost: intent.ambiguousCost && !saysTotal && !saysPerUnit,
  };
}
