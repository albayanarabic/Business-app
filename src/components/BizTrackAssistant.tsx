import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Mic,
  Minimize2,
  Package,
  Send,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { CustomerDebt, ExpenseCategory, Product } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira, isWithinFilter } from '../utils/formatters';
import {
  AssistantIntent,
  completeProductPricing,
  parseAssistantRequest,
} from '../utils/bizTrackAssistant';

type ChatOption = { label: string; value: string };
type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  options?: ChatOption[];
};

type Preview =
  | {
      kind: 'newProduct';
      name: string;
      quantity: number;
      unit: string;
      costPrice: number;
      sellingPrice: number;
    }
  | {
      kind: 'restock';
      product: Product;
      quantity: number;
    }
  | {
      kind: 'expense';
      title: string;
      amount: number;
      category: ExpenseCategory;
    }
  | {
      kind: 'sale';
      product: Product;
      quantity: number;
      paymentStatus: 'paid' | 'credit';
      customerName?: string;
      requestedUnitPrice?: number;
    }
  | {
      kind: 'repayment';
      debt: CustomerDebt;
      amount: number;
    };

type Pending =
  | {
      kind: 'chooseProduct';
      query: string;
      action: 'sale' | 'restock';
      quantity: number;
      paymentStatus?: 'paid' | 'credit';
      customerName?: string;
      unitPrice?: number;
      products: Product[];
    }
  | { kind: 'salePayment'; product: Product; quantity: number; unitPrice?: number }
  | { kind: 'saleCustomer'; product: Product; quantity: number; unitPrice?: number }
  | { kind: 'repaymentChoice'; amount: number; debts: CustomerDebt[] }
  | {
      kind: 'productClarification';
      intent: Extract<AssistantIntent, { type: 'addProduct' }>;
    };

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: "Hello! I'm BizTrack AI. I can help you check your stock, understand your saved sales and expenses, and prepare records for your confirmation. I only read records stored in this browser. BizTrack starts with sample records, so verify they have been replaced before relying on figures. Online AI and cross-device sync aren't configured.",
};

const SUGGESTIONS = [
  'Which products are running low?',
  'How much did I make today?',
  'How much do customers owe me?',
];

function normalizedName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findProducts(products: Product[], query: string): Product[] {
  const search = normalizedName(query);
  if (!search) return [];
  return products.filter((product) => {
    const name = normalizedName(product.name);
    return name === search || name.includes(search) || search.includes(name);
  });
}

function findDebts(debts: CustomerDebt[], name: string): CustomerDebt[] {
  const search = normalizedName(name);
  return debts.filter(
    (debt) => debt.status === 'active' && debt.balanceDue > 0 && normalizedName(debt.customerName) === search
  );
}

function localDateIso(): string {
  return new Date().toISOString();
}

export const BizTrackAssistant = () => {
  const {
    products,
    sales,
    expenses,
    debts,
    todayMetrics,
    addProduct,
    adjustStock,
    addExpense,
    recordSale,
    recordRepayment,
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nextId = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, preview]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const addMessage = (
    role: ChatMessage['role'],
    text: string,
    options?: ChatOption[]
  ) => {
    setMessages((current) => [...current, { id: nextId.current++, role, text, options }]);
  };

  const answerQuestion = (question: Extract<AssistantIntent, { type: 'question' }>['question']) => {
    switch (question) {
      case 'productCount':
        return `There ${products.length === 1 ? 'is' : 'are'} ${products.length} product${products.length === 1 ? '' : 's'} in the inventory saved in this browser.`;
      case 'lowStock': {
        const lowStock = products.filter((product) => product.stockQuantity <= product.minStockLevel);
        return lowStock.length
          ? lowStock.map((product) => `• ${product.name}: ${product.stockQuantity} ${product.unit} (alert at ${product.minStockLevel})`).join('\n')
          : 'No products are currently at or below their low-stock alert level.';
      }
      case 'outstandingDebts': {
        const total = debts
          .filter((debt) => debt.status === 'active')
          .reduce((sum, debt) => sum + debt.balanceDue, 0);
        return `Outstanding customer balances total ${formatNaira(total)}. This is money owed, not cash received.`;
      }
      case 'topDebtor': {
        const totals = new Map<string, { name: string; balance: number }>();
        debts
          .filter((debt) => debt.status === 'active' && debt.balanceDue > 0)
          .forEach((debt) => {
            const key = normalizedName(debt.customerName);
            const current = totals.get(key);
            totals.set(key, {
              name: current?.name || debt.customerName,
              balance: (current?.balance || 0) + debt.balanceDue,
            });
          });
        const top = [...totals.values()].sort((a, b) => b.balance - a.balance)[0];
        return top
          ? `${top.name} has the largest combined active balance at ${formatNaira(top.balance)}.`
          : 'There are no active customer balances in the saved records.';
      }
      case 'todaySummary':
        return [
          `Today's sales revenue: ${formatNaira(todayMetrics.totalSales)} (including credit sales).`,
          `Cash received from those sales: ${formatNaira(todayMetrics.cashCollected)}.`,
          `Cost of goods sold: ${formatNaira(todayMetrics.cogs)}; gross profit: ${formatNaira(todayMetrics.grossProfit)}.`,
          `Operating expenses: ${formatNaira(todayMetrics.totalExpenses)}; estimated net profit: ${formatNaira(todayMetrics.netProfit)}.`,
          'Net profit here is gross profit minus recorded operating expenses; stock purchases are not counted as operating expenses.',
        ].join('\n');
      case 'todayItems': {
        const todaySales = sales.filter((sale) => isWithinFilter(sale.date, 'today'));
        const soldItems = new Map<string, { name: string; quantity: number }>();
        todaySales.forEach((sale) => {
          sale.items.forEach((item) => {
            const current = soldItems.get(item.productId);
            soldItems.set(item.productId, {
              name: current?.name || item.productName,
              quantity: (current?.quantity || 0) + item.quantity,
            });
          });
        });
        return soldItems.size
          ? `Products sold today:\n${[...soldItems.values()].map((item) => `• ${item.name}: ${item.quantity}`).join('\n')}`
          : 'No sales are recorded for today in the saved records.';
      }
      case 'weeklyExpenses': {
        const total = expenses
          .filter((expense) => isWithinFilter(expense.date, 'week'))
          .reduce((sum, expense) => sum + expense.amount, 0);
        return `Recorded expenses this week total ${formatNaira(total)}.`;
      }
      case 'stockValue': {
        const value = products.reduce(
          (sum, product) => sum + product.costPrice * product.stockQuantity,
          0
        );
        return `Current stock value at saved unit cost is ${formatNaira(value)}. This is an inventory valuation, not cash or profit.`;
      }
      case 'monthlySales': {
        const total = sales
          .filter((sale) => isWithinFilter(sale.date, 'month'))
          .reduce((sum, sale) => sum + sale.totalAmount, 0);
        return `Sales revenue recorded this month is ${formatNaira(total)}. It includes credit sales and is not the same as cash received.`;
      }
      case 'topProductProfit': {
        const profitByProduct = new Map<string, { name: string; profit: number }>();
        sales.forEach((sale) => {
          sale.items.forEach((item) => {
            const discountShare = sale.subtotal > 0
              ? sale.discount * (item.total / sale.subtotal)
              : 0;
            const grossProfit = item.total - discountShare - item.costPrice * item.quantity;
            const current = profitByProduct.get(item.productId);
            profitByProduct.set(item.productId, {
              name: current?.name || item.productName,
              profit: (current?.profit || 0) + grossProfit,
            });
          });
        });
        const top = [...profitByProduct.values()]
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 3);
        return top.length
          ? `Top products by recorded gross profit to date (sales less cost of goods sold, with sale discounts allocated proportionally):\n${top.map((item) => `• ${item.name}: ${formatNaira(item.profit)}`).join('\n')}`
          : 'There are no recorded sales to calculate product gross profit yet.';
      }
    }
  };

  const prepareSale = (
    product: Product,
    quantity: number,
    paymentStatus: 'paid' | 'credit',
    customerName?: string,
    requestedUnitPrice?: number
  ) => {
    if (requestedUnitPrice !== undefined && requestedUnitPrice !== product.sellingPrice) {
      setPending(null);
      addMessage(
        'assistant',
        `You specified ${formatNaira(requestedUnitPrice)} each, but ${product.name} is saved at ${formatNaira(product.sellingPrice)} each. I can't override the catalog price in a sale. Update the product price in Inventory first, or send a new request using the saved price.`
      );
      return;
    }
    if (quantity > product.stockQuantity) {
      setPending(null);
      addMessage(
        'assistant',
        `I can't prepare this sale: only ${product.stockQuantity} ${product.unit} of ${product.name} are in stock. No changes were made.`
      );
      return;
    }
    if (paymentStatus === 'credit' && !customerName?.trim()) {
      setPending({ kind: 'saleCustomer', product, quantity, unitPrice: requestedUnitPrice });
      addMessage('assistant', 'Who is the customer for this credit sale? Please provide the customer name.');
      return;
    }
    const duplicateActiveDebts = debts.filter(
      (debt) =>
        debt.status === 'active' &&
        normalizedName(debt.customerName) === normalizedName(customerName || '')
    );
    if (paymentStatus === 'credit' && duplicateActiveDebts.length > 1) {
      addMessage(
        'assistant',
        `There are multiple active debt records for ${customerName}. I can't safely choose which balance to update. Please resolve the duplicate customer records in Customers & Debts first.`
      );
      return;
    }

    setPending(null);
    setPreview({
      kind: 'sale',
      product,
      quantity,
      paymentStatus,
      customerName,
      requestedUnitPrice,
    });
    const total = product.sellingPrice * quantity;
    addMessage(
      'assistant',
      `Sale preview ready: ${quantity} ${product.unit} of ${product.name} at the saved price of ${formatNaira(product.sellingPrice)} each. Total: ${formatNaira(total)}.${paymentStatus === 'credit' ? ` This will create or update ${customerName}'s customer balance.` : ' Marked as fully paid.'} Confirm below to record it.`
    );
  };

  const processPending = (value: string): boolean => {
    if (!pending) return false;
    setMessages((current) => current.map((message) => ({ ...message, options: undefined })));
    const answer = value.trim();
    const lower = answer.toLowerCase();

    if (/^(cancel|never mind|nevermind|no)$/i.test(answer)) {
      setPending(null);
      addMessage('assistant', 'Okay, I cancelled that request. No records were changed.');
      return true;
    }

    if (pending.kind === 'salePayment') {
      if (/\b(credit|owing|later)\b/i.test(lower)) {
        prepareSale(pending.product, pending.quantity, 'credit', undefined, pending.unitPrice);
      } else if (/\b(paid|cash|transfer|pos)\b/i.test(lower)) {
        prepareSale(pending.product, pending.quantity, 'paid', undefined, pending.unitPrice);
      } else {
        addMessage('assistant', 'Please say whether the customer paid in full or bought on credit.', [
          { label: 'Paid in full', value: 'paid' },
          { label: 'On credit', value: 'on credit' },
        ]);
      }
      return true;
    }

    if (pending.kind === 'saleCustomer') {
      prepareSale(pending.product, pending.quantity, 'credit', answer, pending.unitPrice);
      return true;
    }

    if (pending.kind === 'repaymentChoice') {
      const debt = pending.debts.find((candidate) => candidate.id === answer);
      if (!debt) {
        addMessage('assistant', 'Choose one of the listed customer balances, or type cancel.');
        return true;
      }
      setPending(null);
      if (pending.amount > debt.balanceDue) {
        addMessage(
          'assistant',
          `That repayment is greater than ${debt.customerName}'s outstanding balance of ${formatNaira(debt.balanceDue)}. No changes were made.`
        );
      } else {
        setPreview({ kind: 'repayment', debt, amount: pending.amount });
        addMessage(
          'assistant',
          `Repayment preview ready for ${debt.customerName}: ${formatNaira(pending.amount)} against an outstanding balance of ${formatNaira(debt.balanceDue)}. Confirm below to record it.`
        );
      }
      return true;
    }

    if (pending.kind !== 'chooseProduct') return false;

    const product = pending.products.find((candidate) => candidate.id === answer);
    if (!product) {
      addMessage('assistant', 'Choose one of the listed products, or type cancel.');
      return true;
    }
    const request = pending;
    setPending(null);
    if (request.action === 'sale') {
      if (request.paymentStatus) {
        prepareSale(
          product,
          request.quantity,
          request.paymentStatus,
          request.customerName,
          request.unitPrice
        );
      } else {
        setPending({
          kind: 'salePayment',
          product,
          quantity: request.quantity,
          unitPrice: request.unitPrice,
        });
        addMessage('assistant', `Should the sale of ${product.name} be marked paid in full or on credit?`, [
          { label: 'Paid in full', value: 'paid' },
          { label: 'On credit', value: 'on credit' },
        ]);
      }
    } else {
      setPreview({ kind: 'restock', product, quantity: request.quantity });
      addMessage(
        'assistant',
        `Restock preview ready: add ${request.quantity} ${product.unit} to ${product.name}. Its saved cost and selling prices will stay unchanged. Confirm below to update the stock.`
      );
    }
    return true;
  };

  const handleIntent = (intent: AssistantIntent) => {
    if (intent.type === 'question') {
      addMessage('assistant', answerQuestion(intent.question));
      return;
    }

    if (intent.type === 'unsupportedCreditSale') {
      addMessage(
        'assistant',
        'To record a credit sale accurately, I need the product name and quantity so BizTrack can check stock and calculate cost of goods sold. Please describe the items, for example: “Sold 2 bags of rice to John on credit.”'
      );
      return;
    }

    if (intent.type === 'addProduct') {
      if (intent.ambiguousCost) {
        setPending({ kind: 'productClarification', intent });
        addMessage(
          'assistant',
          `Is ${formatNaira(intent.costPrice || 0)} the cost per ${intent.unit}, or the total cost for all ${intent.quantity}? Please clarify and include the selling price per ${intent.unit}.`
        );
        return;
      }
      if (!intent.costPrice || !intent.sellingPrice) {
        setPending({ kind: 'productClarification', intent });
        addMessage(
          'assistant',
          `To add ${intent.quantity} ${intent.unit} of ${intent.name}, please provide both the unit purchase cost and the unit selling price. I won't guess missing prices.`
        );
        return;
      }
      if (intent.sellingPrice < intent.costPrice) {
        addMessage(
          'assistant',
          'The selling price is below the purchase cost. Please check both prices in your request; I have not prepared a product.'
        );
        return;
      }

      const matches = findProducts(products, intent.name);
      if (matches.length > 1) {
        setPending({
          kind: 'chooseProduct',
          query: intent.name,
          action: 'restock',
          quantity: intent.quantity,
          products: matches,
        });
        addMessage(
          'assistant',
          `I found several similar products for “${intent.name}”. Which one should receive the additional stock?`,
          matches.map((product) => ({
            label: `${product.name} (${product.stockQuantity} ${product.unit})`,
            value: product.id,
          }))
        );
        return;
      }
      const existing = matches[0];
      if (existing) {
        if (existing.costPrice !== intent.costPrice || existing.sellingPrice !== intent.sellingPrice) {
          addMessage(
            'assistant',
            `I found the existing product “${existing.name}”, but its saved prices differ from this delivery. I can't safely apply a new cost to all existing stock. Update the product's prices in Inventory first, then ask me to restock it.`
          );
          return;
        }
        setPreview({ kind: 'restock', product: existing, quantity: intent.quantity });
        addMessage(
          'assistant',
          `“${existing.name}” already exists with ${existing.stockQuantity} ${existing.unit} in stock. This preview adds ${intent.quantity} to that product (rather than creating a duplicate). Confirm below to continue.`
        );
        return;
      }

      setPreview({
        kind: 'newProduct',
        name: intent.name,
        quantity: intent.quantity,
        unit: intent.unit,
        costPrice: intent.costPrice,
        sellingPrice: intent.sellingPrice,
      });
      addMessage(
        'assistant',
        `Product preview ready for ${intent.quantity} ${intent.unit} of ${intent.name}. Confirm below to add it to inventory.`
      );
      return;
    }

    if (intent.type === 'expense') {
      if (!intent.amount || intent.amount <= 0) {
        addMessage('assistant', 'How much was the expense? Include the amount, for example “I spent ₦8,000 on transport today.”');
        return;
      }
      setPreview({
        kind: 'expense',
        title: intent.title,
        amount: intent.amount,
        category: intent.category,
      });
      addMessage(
        'assistant',
        `Expense preview ready: ${formatNaira(intent.amount)} for ${intent.title} (${intent.category}), dated today. Confirm below to save it.`
      );
      return;
    }

    if (intent.type === 'sale') {
      const matches = findProducts(products, intent.productName);
      if (matches.length === 0) {
        addMessage(
          'assistant',
          `I couldn't match “${intent.productName}” to a product in your saved inventory. Please use its inventory name so I can check the available stock.`
        );
        return;
      }
      if (matches.length > 1) {
        setPending({
          kind: 'chooseProduct',
          query: intent.productName,
          action: 'sale',
          quantity: intent.quantity,
          paymentStatus: intent.paymentStatus,
          customerName: intent.customerName,
          unitPrice: intent.unitPrice,
          products: matches,
        });
        addMessage(
          'assistant',
          `I found several similar products for “${intent.productName}”. Which one was sold?`,
          matches.map((product) => ({
            label: `${product.name} (${product.stockQuantity} ${product.unit} available)`,
            value: product.id,
          }))
        );
        return;
      }
      const product = matches[0];
      if (intent.quantity > product.stockQuantity) {
        addMessage(
          'assistant',
          `There isn't enough stock for this sale. ${product.name} has ${product.stockQuantity} ${product.unit}, but the request is for ${intent.quantity}. No changes were made.`
        );
        return;
      }
      if (!intent.paymentStatus) {
        setPending({
          kind: 'salePayment',
          product,
          quantity: intent.quantity,
          unitPrice: intent.unitPrice,
        });
        addMessage('assistant', 'Was this sale paid in full, or was it on credit?', [
          { label: 'Paid in full', value: 'paid' },
          { label: 'On credit', value: 'on credit' },
        ]);
        return;
      }
      prepareSale(
        product,
        intent.quantity,
        intent.paymentStatus,
        intent.customerName,
        intent.unitPrice
      );
      return;
    }

    if (intent.type === 'repayment') {
      if (!intent.customerName) {
        addMessage('assistant', 'Whose repayment was received? Include the customer name and amount, for example “John has paid ₦10,000.”');
        return;
      }
      if (!intent.amount || intent.amount <= 0) {
        addMessage('assistant', `How much did ${intent.customerName} pay?`);
        return;
      }
      const customerDebts = findDebts(debts, intent.customerName);
      if (customerDebts.length === 0) {
        addMessage('assistant', `I couldn't find an active balance for ${intent.customerName}. No repayment was recorded.`);
        return;
      }
      if (customerDebts.length > 1) {
        setPending({ kind: 'repaymentChoice', amount: intent.amount, debts: customerDebts });
        addMessage(
          'assistant',
          `I found multiple active balances for ${intent.customerName}. Which one received the payment?`,
          customerDebts.map((debt) => ({
            label: `${debt.customerName} — ${formatNaira(debt.balanceDue)} outstanding`,
            value: debt.id,
          }))
        );
        return;
      }
      const debt = customerDebts[0];
      if (intent.amount > debt.balanceDue) {
        addMessage(
          'assistant',
          `${intent.customerName}'s outstanding balance is ${formatNaira(debt.balanceDue)}, less than the repayment of ${formatNaira(intent.amount)}. Please check the amount. No changes were made.`
        );
        return;
      }
      setPreview({ kind: 'repayment', debt, amount: intent.amount });
      addMessage(
        'assistant',
        `Repayment preview ready: ${formatNaira(intent.amount)} from ${debt.customerName} against an outstanding balance of ${formatNaira(debt.balanceDue)}. Confirm below to record it.`
      );
      return;
    }

    addMessage(
      'assistant',
      "I'm designed to help with BizTrack and your business records. Try asking about stock, sales, customer balances, expenses, or today's results. I only know the records saved in this browser."
    );
  };

  const sendMessage = (value: string, displayText?: string) => {
    const text = value.trim();
    if (!text || isSending) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
    setDraft('');
    addMessage('user', displayText || text);
    setIsSending(true);
    try {
      if (preview) {
        if (/^(cancel|nevermind|never mind)$/i.test(text)) {
          setPreview(null);
          addMessage('assistant', 'Cancelled. No records were changed.');
        } else {
          addMessage('assistant', 'Please confirm or cancel the pending preview before starting another request.');
        }
      } else if (pending?.kind === 'productClarification') {
        const clarified = completeProductPricing(pending.intent, text);
        setPending(null);
        handleIntent(clarified);
      } else if (!processPending(text)) {
        handleIntent(parseAssistantRequest(text));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(draft);
    }
  };

  const toggleVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }

    const speechWindow = window as WindowWithSpeechRecognition;
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      addMessage(
        'assistant',
        'Voice input is not supported by this browser. Try a current version of Chrome or Edge, or type your message instead.'
      );
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-NG';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || '';
      }
      if (transcript.trim()) setDraft(transcript.trim());
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === 'aborted') return;
      const errorMessage =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow microphone access in your browser settings, then try again.'
          : event.error === 'no-speech'
            ? 'I didn’t hear anything. Tap the microphone and try speaking again.'
            : event.error === 'network'
              ? 'The browser speech service could not be reached. Check your connection or type your message instead.'
              : `Voice input stopped (${event.error}). You can try again or type your message.`;
      addMessage('assistant', errorMessage);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      addMessage(
        'assistant',
        error instanceof Error
          ? `Could not start voice input: ${error.message}`
          : 'Could not start voice input. Check microphone permissions and try again.'
      );
    }
  };

  const confirmPreview = () => {
    if (!preview) return;
    const action = preview;

    if (action.kind === 'restock') {
      const product = products.find((candidate) => candidate.id === action.product.id);
      if (!product) {
        setPreview(null);
        addMessage('assistant', 'This product is no longer in inventory, so I cancelled the restock. No changes were made.');
        return;
      }
      setPreview(null);
      adjustStock(product.id, action.quantity, 'BizTrack AI confirmed restock');
      addMessage('assistant', `Done. Added ${action.quantity} ${product.unit} to ${product.name}. The update is saved in this browser.`);
      return;
    }

    if (action.kind === 'newProduct') {
      setPreview(null);
      addProduct({
        name: action.name,
        category: 'Other Categories',
        costPrice: action.costPrice,
        sellingPrice: action.sellingPrice,
        stockQuantity: action.quantity,
        minStockLevel: 5,
        unit: action.unit,
      });
      addMessage('assistant', `${action.name} was added to inventory and saved in this browser.`);
      return;
    }

    if (action.kind === 'expense') {
      setPreview(null);
      addExpense({
        title: action.title,
        amount: action.amount,
        category: action.category,
        date: localDateIso(),
        paymentMethod: 'Cash',
        description: 'Recorded with BizTrack AI',
      });
      addMessage('assistant', `${formatNaira(action.amount)} for ${action.title} was saved as a cash expense in this browser.`);
      return;
    }

    if (action.kind === 'sale') {
      const product = products.find((candidate) => candidate.id === action.product.id);
      if (!product || product.stockQuantity < action.quantity) {
        setPreview(null);
        addMessage('assistant', 'Stock changed after the preview, so I cancelled the sale. Check the current inventory and try again.');
        return;
      }
      setPreview(null);
      const total = product.sellingPrice * action.quantity;
      recordSale({
        items: [{ productId: product.id, quantity: action.quantity }],
        paymentStatus: action.paymentStatus,
        amountPaid: action.paymentStatus === 'paid' ? total : 0,
        paymentMethod: action.paymentStatus === 'paid' ? 'Cash' : 'Credit',
        customerName: action.customerName,
        notes: 'Recorded with BizTrack AI',
      });
      addMessage(
        'assistant',
        `${action.paymentStatus === 'credit' ? 'Credit sale' : 'Sale'} of ${formatNaira(total)} for ${product.name} was recorded. Stock and the sale record were updated in this browser.`
      );
      return;
    }

    const debt = debts.find((candidate) => candidate.id === action.debt.id);
    if (!debt || debt.status !== 'active' || debt.balanceDue < action.amount) {
      setPreview(null);
      addMessage('assistant', 'That customer balance changed after the preview, so I cancelled the repayment. Check the current balance and try again.');
      return;
    }
    setPreview(null);
    recordRepayment(debt.id, action.amount, 'Cash', 'Recorded with BizTrack AI');
    addMessage('assistant', `${formatNaira(action.amount)} repayment from ${debt.customerName} was recorded as cash in this browser.`);
  };

  const renderPreview = () => {
    if (!preview) return null;
    let rows: Array<[string, string]> = [];
    let title = 'Confirm this action';

    if (preview.kind === 'newProduct') {
      const totalCost = preview.quantity * preview.costPrice;
      const revenue = preview.quantity * preview.sellingPrice;
      title = 'Add product to inventory';
      rows = [
        ['Product', preview.name],
        ['Quantity', `${preview.quantity} ${preview.unit}`],
        ['Unit cost', formatNaira(preview.costPrice)],
        ['Unit selling price', formatNaira(preview.sellingPrice)],
        ['Total purchase cost', formatNaira(totalCost)],
        ['Potential sales revenue', formatNaira(revenue)],
        ['Potential gross profit', formatNaira(revenue - totalCost)],
      ];
    } else if (preview.kind === 'restock') {
      title = 'Increase existing stock';
      rows = [
        ['Product', preview.product.name],
        ['Current stock', `${preview.product.stockQuantity} ${preview.product.unit}`],
        ['Add quantity', `${preview.quantity} ${preview.product.unit}`],
        ['New stock', `${preview.product.stockQuantity + preview.quantity} ${preview.product.unit}`],
        ['Saved unit cost', formatNaira(preview.product.costPrice)],
      ];
    } else if (preview.kind === 'expense') {
      title = 'Record expense';
      rows = [
        ['Expense', preview.title],
        ['Amount', formatNaira(preview.amount)],
        ['Category', preview.category],
        ['Payment method', 'Cash'],
        ['Date', 'Today'],
      ];
    } else if (preview.kind === 'sale') {
      const total = preview.product.sellingPrice * preview.quantity;
      title = 'Record sale';
      rows = [
        ['Product', preview.product.name],
        ['Quantity', `${preview.quantity} ${preview.product.unit}`],
        ['Unit selling price', formatNaira(preview.product.sellingPrice)],
        ['Sales total', formatNaira(total)],
        ['Payment', preview.paymentStatus === 'credit' ? `Credit — ${preview.customerName}` : 'Paid in full (cash)'],
        ['Stock after sale', `${preview.product.stockQuantity - preview.quantity} ${preview.product.unit}`],
      ];
    } else {
      title = 'Record customer repayment';
      rows = [
        ['Customer', preview.debt.customerName],
        ['Outstanding before payment', formatNaira(preview.debt.balanceDue)],
        ['Repayment', formatNaira(preview.amount)],
        ['Balance after payment', formatNaira(preview.debt.balanceDue - preview.amount)],
        ['Payment method', 'Cash'],
      ];
    }

    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-emerald-950">
          <Check className="h-4 w-4" />
          {title}
        </h3>
        <dl className="space-y-1.5">
          {rows.map(([label, value]) => (
            <div className="flex items-start justify-between gap-3" key={label}>
              <dt className="text-emerald-900/70">{label}</dt>
              <dd className="text-right font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={confirmPreview}
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 font-semibold text-white hover:bg-emerald-800"
          >
            <Check className="h-4 w-4" />
            Confirm
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              addMessage('assistant', 'Cancelled. No records were changed.');
            }}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const closeAssistant = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open BizTrack AI assistant"
          title="BizTrack AI"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[45] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-navy-900 text-white shadow-lg shadow-navy-950/20 transition hover:-translate-y-0.5 hover:bg-navy-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 lg:bottom-6 lg:right-6"
        >
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <span className="sr-only">BizTrack AI</span>
        </button>
      )}

      {isOpen && isMinimized && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg lg:bottom-6 lg:right-6">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="Reopen BizTrack AI"
            aria-label="Reopen BizTrack AI"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-white hover:bg-navy-800"
          >
            <Bot className="h-4 w-4 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close BizTrack AI"
            title="Close BizTrack AI"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isOpen && !isMinimized && (
        <section
          aria-label="BizTrack AI chat"
          className="fixed inset-x-0 bottom-0 top-0 z-[60] flex flex-col overflow-hidden bg-slate-50 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(680px,calc(100dvh-8rem))] sm:w-[min(410px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-slate-200 sm:pt-0 sm:pb-0 sm:shadow-2xl">
          <header className="flex shrink-0 items-center justify-between bg-navy-950 px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold">BizTrack AI</h2>
                <p className="truncate text-[11px] text-slate-300">Your intelligent business assistant</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Minimize BizTrack AI"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeAssistant}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Close BizTrack AI"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-900">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-semibold">{isOnline ? 'Local-only mode' : 'Offline · local-only mode'}</span>
            <span className="truncate text-amber-800">Sample data may be present · online AI and device sync are not configured.</span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-emerald-700 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      <Bot className="h-3.5 w-3.5" />
                      BizTrack AI
                    </div>
                  )}
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.options && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => sendMessage(option.value, option.label)}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pl-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {renderPreview()}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex min-h-12 flex-1 items-end rounded-2xl border border-slate-300 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={1000}
                  placeholder="Ask about your business..."
                  aria-label="Message BizTrack AI"
                  className="max-h-24 min-h-12 flex-1 resize-none border-0 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                />
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? 'Stop voice input' : 'Speak your message'}
                  aria-label={isListening ? 'Stop voice input' : 'Speak your message'}
                  aria-pressed={isListening}
                  className={`mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                    isListening
                      ? 'animate-pulse bg-rose-100 text-rose-700'
                      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                aria-label="Send message"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSending ? <ChevronDown className="h-5 w-5 animate-pulse" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
            <p aria-live="polite" className="mt-1 h-4 text-center text-[10px] text-emerald-700">
              {isListening ? 'Listening… Tap the microphone when you are done.' : ''}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Package className="h-3 w-3" />
              Local records (may include samples) · voice recognition may use your browser’s online service
              <CircleHelp className="h-3 w-3" />
            </p>
          </div>
        </section>
      )}
    </>
  );
};
