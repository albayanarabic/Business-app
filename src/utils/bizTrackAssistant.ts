import { ExpenseCategory } from '../types';

export type AssistantQuestion =
  | 'productCount'
  | 'lowStock'
  | 'outstandingDebts'
  | 'topDebtor'
  | 'todaySummary'
  | 'todayItems'
  | 'weeklyExpenses'
  | 'stockValue'
  | 'monthlySales'
  | 'topProductProfit';

export type AssistantIntent =
  | { type: 'question'; question: AssistantQuestion }
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
  | { type: 'unknown' };

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
};

function amountValue(value: string, suffix = ''): number {
  const amount = Number(value.replace(/,/g, ''));
  const multiplier = suffix.toLowerCase() === 'm' ? 1_000_000 : suffix.toLowerCase() === 'k' ? 1_000 : 1;
  return amount * multiplier;
}

function findLabeledAmount(
  text: string,
  label: RegExp
): { amount: number; perUnit: boolean } | undefined {
  const match = text.match(
    new RegExp(`(${label.source})[^\\d₦]*₦?\\s*(\\d[\\d,]*(?:\\.\\d+)?)\\s*([km])?\\s*(each|per\\s+\\w+)?`, 'i')
  );
  const labelIndex = text.search(label);
  const nearbyContext = labelIndex >= 0 ? text.slice(Math.max(0, labelIndex - 80), labelIndex) : '';
  return match
    ? {
        amount: amountValue(match[2], match[3]),
        perUnit: /\b(?:each|per\s+\w+)\b/i.test(
          `${nearbyContext} ${match[1]} ${match[4] || ''}`
        ),
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
    /\b(\d+)\s+(?:(bags?|bottles?|cartons?|packs?|pieces?|pairs?|tins?|kg|rolls?|jerrycans?|crates?)\s+(?:of\s+)?)?([a-z][a-z0-9' -]*?)(?=\s*[.,;]|\s+(?:each|cost|costs|for|at|sell|selling|and|on|to my inventory|into inventory)\b|$)/i
  );
  if (!match) return undefined;

  const quantity = Number(match[1]);
  const name = match[3].trim().replace(/^(?:of\s+)/i, '').replace(/\s+/g, ' ');
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

function expenseCategory(text: string): ExpenseCategory {
  if (/transport|logistics|fuel fare/i.test(text)) return 'Transportation & Logistics';
  if (/generator|petrol|diesel/i.test(text)) return 'Generator Fuel';
  if (/rent|shop lease/i.test(text)) return 'Rent';
  if (/electricity|nepa|power bill/i.test(text)) return 'Electricity & NEPA';
  if (/salary|wage|staff/i.test(text)) return 'Staff Salaries';
  if (/airtime|internet|data subscription/i.test(text)) return 'Internet & Airtime';
  if (/repair|maintenance/i.test(text)) return 'Maintenance';
  if (/security|lga|levy/i.test(text)) return 'Security & LGA Levy';
  if (/shop supplies|supplies/i.test(text)) return 'Shop Supplies';
  return 'Other Expenses';
}

export function parseAssistantRequest(input: string): AssistantIntent {
  const text = input.trim();
  const normalized = text.toLowerCase();

  if (/\b(unrelated|weather|football|politics|write me|translate|general knowledge)\b/i.test(normalized)) {
    return { type: 'unknown' };
  }

  if (/\b(how many products|number of products|products do i have|count my products)\b/i.test(normalized)) {
    return { type: 'question', question: 'productCount' };
  }
  if (/\b(low stock|running low|almost out of stock)\b/i.test(normalized)) {
    return { type: 'question', question: 'lowStock' };
  }
  if (/\b(who owes me the most|owes me the most|biggest debtor|top debtor)\b/i.test(normalized)) {
    return { type: 'question', question: 'topDebtor' };
  }
  if (/\b(highest gross profit|most gross profit|most profitable product|products? (?:generated|made) (?:the )?most profit)\b/i.test(normalized)) {
    return { type: 'question', question: 'topProductProfit' };
  }
  if (/\b(customers owe|outstanding debt|total debt|how much.*owe me|owed to me)\b/i.test(normalized)) {
    return { type: 'question', question: 'outstandingDebts' };
  }
  if (/\b(stock value|value of my stock|inventory value)\b/i.test(normalized)) {
    return { type: 'question', question: 'stockValue' };
  }
  if (/\b(expenses?.*(?:this|the) week|(?:this|the) week.*expenses?)\b/i.test(normalized)) {
    return { type: 'question', question: 'weeklyExpenses' };
  }
  if (/\b(sales?.*(?:this|the) month|(?:this|the) month.*sales?|revenue.*month)\b/i.test(normalized)) {
    return { type: 'question', question: 'monthlySales' };
  }
  if (/\b(what did i sell today|list (?:my )?sales today|which products did i sell today)\b/i.test(normalized)) {
    return { type: 'question', question: 'todayItems' };
  }
  if (/\b(today|today's)\b/i.test(normalized) && /\b(make|made|sales?|profit|earn|earned)\b/i.test(normalized)) {
    return { type: 'question', question: 'todaySummary' };
  }

  const item = extractItem(text);
  if (/\b(spent|expense|record an expense|log an expense|paid for)\b/i.test(normalized)) {
    const amount = findAmount(text, /\b(?:spent|paid|cost|amount(?: of)?)\b/);
    const titleMatch = text.match(/\b(?:on|for)\s+(.+?)(?:\s+(?:today|yesterday|this week)\b|[.!?]|$)/i);
    return {
      type: 'expense',
      amount,
      title: titleMatch?.[1]?.trim() || 'Business expense',
      category: expenseCategory(text),
    };
  }

  if (
    !/\b(?:sold|record (?:a )?sale|make a sale)\b/i.test(normalized) &&
    /\b(repayment|repaid|paid|has paid|have paid|paid back|settled)\b/i.test(normalized)
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

  if (/\b(?:sold|record (?:a )?sale|make a sale)\b/i.test(normalized)) {
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

  if (/\b(credit|on credit|owing)\b/i.test(normalized) && /\b(bought|purchase|purchased|goods)\b/i.test(normalized)) {
    return { type: 'unsupportedCreditSale' };
  }

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
    const unitCost = costWasTotal
      ? costPrice.amount / item.quantity
      : costPrice?.amount;

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
  const costPrice = cost?.amount ?? (
    intent.ambiguousCost && saysTotal && intent.costPrice !== undefined
      ? intent.costPrice / intent.quantity
      : intent.costPrice
  );

  return {
    ...intent,
    costPrice,
    sellingPrice: selling?.amount ?? intent.sellingPrice,
    ambiguousCost: intent.ambiguousCost && !saysTotal && !saysPerUnit,
  };
}
