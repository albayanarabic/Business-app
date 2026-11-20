// ============================================================
// BIZTRACK NIGERIA — SMART OFFLINE AI ASSISTANT & TWO-WAY VOICE
// Compact Bottom-Sheet UI · 100% Offline Core · Speech-to-Text & Spoken Audio
// ============================================================

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  CircleHelp,
  Compass,
  Mic,
  MicOff,
  Minimize2,
  Package,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import { CustomerDebt, ExpenseCategory, Product } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../utils/formatters';
import {
  AssistantIntent,
  completeProductPricing,
  generateAssistantAnswer,
  parseAssistantRequest,
} from '../utils/bizTrackAssistant';

export interface BizTrackAssistantProps {
  onNavigate?: (tab: string) => void;
  onOpenRecordSale?: () => void;
  onOpenAddProduct?: () => void;
  onOpenAddExpense?: () => void;
  onOpenAddDebt?: () => void;
}

type ChatOption = { label: string; value: string; isNavigation?: boolean };
type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  options?: ChatOption[];
  timestamp?: string;
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
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: "Hello! I'm BizTrack AI, your private offline business assistant. I can check your sales, inventory, profit, debts, and explain calculations using your actual shop records. Tap the mic to speak or type a question below.",
};

const SUGGESTIONS = [
  'How much did I make today?',
  'Which products are running low?',
  'How much do customers owe me?',
  'What is my stock value?',
  'Explain how profit is calculated',
];

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/₦\s*([\d,]+(?:\.\d+)?)/g, '$1 Naira')
    .replace(/•/g, '')
    .replace(/[📊📈🗓️💡📦⚠️💎🏆🔥💳👤⏰🧾💰🩺🛍️📱☁️📲👋✅❌]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

export const BizTrackAssistant: React.FC<BizTrackAssistantProps> = ({
  onNavigate,
  onOpenRecordSale,
  onOpenAddProduct,
  onOpenAddExpense,
  onOpenAddDebt,
}) => {
  const {
    products,
    sales,
    expenses,
    debts,
    todayMetrics,
    businessProfile,
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
  const [isSending, setIsSending] = useState(false);

  // Voice recognition & Speech state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const nextId = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, preview, isListening]);

  // Clean up speech recognition & synthesis on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-NG'; // Nigerian English accent if available, falls back to default

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const addMessage = (role: ChatMessage['role'], text: string, options?: ChatOption[]) => {
    setMessages((current) => [
      ...current,
      {
        id: nextId.current++,
        role,
        text,
        options,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (role === 'assistant' && isVoiceEnabled) {
      speakText(text);
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
        `You requested ${formatNaira(requestedUnitPrice)} each, but ${product.name} is saved at ${formatNaira(product.sellingPrice)} in your inventory. I cannot alter catalog prices. Please update the price in Inventory or continue at the saved price.`
      );
      return;
    }
    if (quantity > product.stockQuantity) {
      setPending(null);
      addMessage(
        'assistant',
        `Insufficient stock: Only ${product.stockQuantity} ${product.unit} of ${product.name} are available in your inventory. No record was created.`
      );
      return;
    }
    if (paymentStatus === 'credit' && !customerName?.trim()) {
      setPending({ kind: 'saleCustomer', product, quantity, unitPrice: requestedUnitPrice });
      addMessage('assistant', 'Who is the customer for this credit sale? Please provide their name:');
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
      `Sale preview ready: ${quantity} ${product.unit} of ${product.name} at ${formatNaira(product.sellingPrice)} each. Total: ${formatNaira(total)} (${paymentStatus === 'credit' ? `Credit to ${customerName}` : 'Paid in full'}). Confirm below to record it:`
    );
  };

  const processPending = (value: string): boolean => {
    if (!pending) return false;
    setMessages((current) => current.map((m) => ({ ...m, options: undefined })));
    const answer = value.trim();
    const lower = answer.toLowerCase();

    if (/^(cancel|never mind|nevermind|no|stop)$/i.test(answer)) {
      setPending(null);
      addMessage('assistant', 'Request cancelled. No changes were made to your business records.');
      return true;
    }

    if (pending.kind === 'salePayment') {
      if (/\b(credit|owing|later)\b/i.test(lower)) {
        prepareSale(pending.product, pending.quantity, 'credit', undefined, pending.unitPrice);
      } else if (/\b(paid|cash|transfer|pos)\b/i.test(lower)) {
        prepareSale(pending.product, pending.quantity, 'paid', undefined, pending.unitPrice);
      } else {
        addMessage('assistant', 'Was this sale paid in full or bought on credit?', [
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
        addMessage('assistant', 'Please select one of the customer balances listed above, or say cancel.');
        return true;
      }
      setPending(null);
      if (pending.amount > debt.balanceDue) {
        addMessage(
          'assistant',
          `That amount is higher than ${debt.customerName}'s outstanding balance of ${formatNaira(debt.balanceDue)}. No repayment was prepared.`
        );
      } else {
        setPreview({ kind: 'repayment', debt, amount: pending.amount });
        addMessage(
          'assistant',
          `Repayment preview: Record ${formatNaira(pending.amount)} from ${debt.customerName} (Balance remaining: ${formatNaira(debt.balanceDue - pending.amount)}). Confirm below to record:`
        );
      }
      return true;
    }

    if (pending.kind === 'chooseProduct') {
      const product = pending.products.find((candidate) => candidate.id === answer);
      if (!product) {
        addMessage('assistant', 'Please select one of the products above, or say cancel.');
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
          addMessage('assistant', `Was the sale of ${product.name} paid in full or on credit?`, [
            { label: 'Paid in full', value: 'paid' },
            { label: 'On credit', value: 'on credit' },
          ]);
        }
      } else {
        setPreview({ kind: 'restock', product, quantity: request.quantity });
        addMessage(
          'assistant',
          `Restock preview: Add ${request.quantity} ${product.unit} to ${product.name}. Confirm below to update inventory:`
        );
      }
      return true;
    }

    return false;
  };

  const handleIntent = (intent: AssistantIntent) => {
    // 1. Off-Topic Guard
    if (intent.type === 'offTopic') {
      addMessage(
        'assistant',
        "I am BizTrack's dedicated business assistant. I only provide answers about your business records, stock, sales, debts, expenses, and BizTrack features. How can I help with your shop today?"
      );
      return;
    }

    // 2. Navigation Actions
    if (intent.type === 'navigate') {
      if (onNavigate) {
        onNavigate(intent.tab);
        addMessage('assistant', `Switched to ${intent.label}. You can view and manage your ${intent.label.toLowerCase()} here.`);
      } else {
        addMessage('assistant', `You can access ${intent.label} directly from the navigation bar.`);
      }
      return;
    }

    // 3. Question answering from Local Knowledge & Context
    if (intent.type === 'question') {
      const answer = generateAssistantAnswer(intent.question, {
        products,
        sales,
        expenses,
        debts,
        todayMetrics,
        businessProfile,
      });

      // Provide helpful contextual navigation options
      const options: ChatOption[] = [];
      if (intent.question === 'lowStock' || intent.question === 'outOfStock' || intent.question === 'stockValue') {
        options.push({ label: 'Open Inventory', value: 'open inventory', isNavigation: true });
        if (onOpenAddProduct) options.push({ label: '+ Add Product', value: 'add product', isNavigation: true });
      } else if (intent.question === 'outstandingDebts' || intent.question === 'topDebtor' || intent.question === 'overdueDebts') {
        options.push({ label: 'Open Debts', value: 'open debts', isNavigation: true });
        options.push({ label: 'WhatsApp Reminders', value: 'open reminders', isNavigation: true });
      } else if (intent.question === 'todaySummary' || intent.question === 'thisMonthSummary' || intent.question === 'profitExplanation') {
        options.push({ label: 'View Full Reports', value: 'open reports', isNavigation: true });
        if (onOpenRecordSale) options.push({ label: '+ Record Sale', value: 'record sale', isNavigation: true });
      }

      addMessage('assistant', answer, options.length > 0 ? options : undefined);
      return;
    }

    // 4. Unsupported / Ambiguous credit sales
    if (intent.type === 'unsupportedCreditSale') {
      addMessage(
        'assistant',
        'To record a credit sale, please specify the product name and quantity so I can calculate your COGS and deduct inventory. Example: "Sold 3 bags of rice to Alhaji Musa on credit."'
      );
      return;
    }

    // 5. Add Product / Restock
    if (intent.type === 'addProduct') {
      if (intent.ambiguousCost) {
        setPending({ kind: 'productClarification', intent });
        addMessage(
          'assistant',
          `Is ${formatNaira(intent.costPrice || 0)} the cost per ${intent.unit}, or the total cost for all ${intent.quantity}? Please clarify and include your selling price per ${intent.unit}.`
        );
        return;
      }
      if (!intent.costPrice || !intent.sellingPrice) {
        setPending({ kind: 'productClarification', intent });
        addMessage(
          'assistant',
          `To add ${intent.quantity} ${intent.unit} of ${intent.name}, please provide both your unit cost price and your unit selling price.`
        );
        return;
      }
      if (intent.sellingPrice < intent.costPrice) {
        addMessage(
          'assistant',
          'Notice: Selling price is below cost price (negative margin). Please check your figures.'
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
          `Found several matching products for "${intent.name}". Which one should be restocked?`,
          matches.map((p) => ({
            label: `${p.name} (${p.stockQuantity} ${p.unit})`,
            value: p.id,
          }))
        );
        return;
      }

      const existing = matches[0];
      if (existing) {
        setPreview({ kind: 'restock', product: existing, quantity: intent.quantity });
        addMessage(
          'assistant',
          `"${existing.name}" already exists (${existing.stockQuantity} in stock). Preview ready to add ${intent.quantity} ${existing.unit}. Confirm below:`
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
        `New product preview: ${intent.quantity} ${intent.unit} of ${intent.name} (Cost: ${formatNaira(intent.costPrice)}, Selling: ${formatNaira(intent.sellingPrice)}). Confirm below to add to inventory:`
      );
      return;
    }

    // 6. Record Expense
    if (intent.type === 'expense') {
      if (!intent.amount || intent.amount <= 0) {
        addMessage('assistant', 'How much was spent? Example: "Spent ₦6,500 on generator petrol today."');
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
        `Expense preview: ${formatNaira(intent.amount)} for ${intent.title} (${intent.category}). Confirm below to save:`
      );
      return;
    }

    // 7. Record Sale
    if (intent.type === 'sale') {
      const matches = findProducts(products, intent.productName);
      if (matches.length === 0) {
        addMessage(
          'assistant',
          `I couldn't find "${intent.productName}" in your saved inventory. Please use the exact product name, or tap "Add Product" to create it first.`
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
          `Multiple products match "${intent.productName}". Which one was sold?`,
          matches.map((p) => ({
            label: `${p.name} (${p.stockQuantity} ${p.unit} in stock)`,
            value: p.id,
          }))
        );
        return;
      }

      const product = matches[0];
      if (intent.quantity > product.stockQuantity) {
        addMessage(
          'assistant',
          `Insufficient stock: ${product.name} only has ${product.stockQuantity} ${product.unit} left, but you requested ${intent.quantity}.`
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
        addMessage('assistant', `Was this sale of ${product.name} paid in full or bought on credit?`, [
          { label: 'Paid in full', value: 'paid' },
          { label: 'On credit', value: 'on credit' },
        ]);
        return;
      }

      prepareSale(product, intent.quantity, intent.paymentStatus, intent.customerName, intent.unitPrice);
      return;
    }

    // 8. Record Repayment
    if (intent.type === 'repayment') {
      if (!intent.customerName) {
        addMessage('assistant', 'Whose repayment was received? Example: "Alhaji Musa has paid ₦15,000."');
        return;
      }
      if (!intent.amount || intent.amount <= 0) {
        addMessage('assistant', `How much did ${intent.customerName} repay?`);
        return;
      }
      const customerDebts = findDebts(debts, intent.customerName);
      if (customerDebts.length === 0) {
        addMessage('assistant', `No active balance found for ${intent.customerName}.`);
        return;
      }
      if (customerDebts.length > 1) {
        setPending({ kind: 'repaymentChoice', amount: intent.amount, debts: customerDebts });
        addMessage(
          'assistant',
          `Multiple active debts found for ${intent.customerName}. Which debt received the repayment?`,
          customerDebts.map((d) => ({
            label: `${d.customerName} — ${formatNaira(d.balanceDue)} balance`,
            value: d.id,
          }))
        );
        return;
      }

      const debt = customerDebts[0];
      if (intent.amount > debt.balanceDue) {
        addMessage(
          'assistant',
          `${intent.customerName}'s balance is ${formatNaira(debt.balanceDue)}, which is less than the repayment of ${formatNaira(intent.amount)}. Please check the amount.`
        );
        return;
      }

      setPreview({ kind: 'repayment', debt, amount: intent.amount });
      addMessage(
        'assistant',
        `Repayment preview: Record ${formatNaira(intent.amount)} from ${debt.customerName} against ${formatNaira(debt.balanceDue)} balance. Confirm below to record:`
      );
      return;
    }

    // Fallback
    addMessage(
      'assistant',
      "I didn't quite catch that. Try asking about your sales, profits, stock, customer debts, or asking me to record a sale or expense."
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
    stopSpeaking();

    setDraft('');
    addMessage('user', displayText || text);
    setIsSending(true);

    try {
      // Check for quick navigation triggers
      const lower = text.toLowerCase();
      if (lower === 'open inventory' || lower === 'go to inventory') {
        onNavigate?.('inventory');
        addMessage('assistant', 'Opened Inventory.');
      } else if (lower === 'open sales' || lower === 'go to sales') {
        onNavigate?.('sales');
        addMessage('assistant', 'Opened Sales.');
      } else if (lower === 'open debts' || lower === 'go to debts') {
        onNavigate?.('debts');
        addMessage('assistant', 'Opened Customers & Debts.');
      } else if (lower === 'open reminders' || lower === 'go to reminders') {
        onNavigate?.('reminders');
        addMessage('assistant', 'Opened WhatsApp Reminders.');
      } else if (lower === 'open reports' || lower === 'go to reports') {
        onNavigate?.('reports');
        addMessage('assistant', 'Opened Reports & Profit.');
      } else if (lower === 'record sale' || lower === '+ record sale') {
        onOpenRecordSale?.();
        addMessage('assistant', 'Opened Record Sale form.');
      } else if (lower === 'add product' || lower === '+ add product') {
        onOpenAddProduct?.();
        addMessage('assistant', 'Opened Add Product form.');
      } else if (preview) {
        if (/^(cancel|nevermind|never mind|no)$/i.test(text)) {
          setPreview(null);
          addMessage('assistant', 'Cancelled. No records were changed.');
        } else {
          addMessage('assistant', 'Please confirm or cancel the preview card above first.');
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

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage(draft);
    }
  };

  // Two-way Voice: Speech Recognition (STT)
  const toggleVoiceInput = () => {
    stopSpeaking();

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      addMessage(
        'assistant',
        'Voice input is not supported in this browser. You can type your messages directly offline.'
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
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || '';
      }
      if (transcript.trim()) {
        setDraft(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        addMessage('assistant', 'Microphone permission was denied. Please allow microphone access in your browser.');
      } else if (event.error === 'network') {
        addMessage(
          'assistant',
          'Notice: Your browser’s speech recognition requires network connectivity. You can type your request directly offline.'
        );
      } else if (event.error !== 'no-speech') {
        addMessage('assistant', `Voice input ended (${event.error}). Please type your message or try again.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  // Confirm Preview Actions
  const confirmPreview = () => {
    if (!preview) return;
    const action = preview;

    if (action.kind === 'restock') {
      const product = products.find((p) => p.id === action.product.id);
      if (!product) {
        setPreview(null);
        addMessage('assistant', 'Product not found. Action cancelled.');
        return;
      }
      setPreview(null);
      adjustStock(product.id, action.quantity, 'BizTrack AI restock');
      addMessage(
        'assistant',
        `✅ Confirmed! Added ${action.quantity} ${product.unit} to ${product.name}. Stock updated to ${product.stockQuantity + action.quantity}.`
      );
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
      addMessage(
        'assistant',
        `✅ Confirmed! "${action.name}" (${action.quantity} ${action.unit}) has been saved to your inventory.`
      );
      return;
    }

    if (action.kind === 'expense') {
      setPreview(null);
      addExpense({
        title: action.title,
        amount: action.amount,
        category: action.category,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
        description: 'Recorded via BizTrack AI',
      });
      addMessage(
        'assistant',
        `✅ Confirmed! Recorded ${formatNaira(action.amount)} for ${action.title} under ${action.category}.`
      );
      return;
    }

    if (action.kind === 'sale') {
      const product = products.find((p) => p.id === action.product.id);
      if (!product || product.stockQuantity < action.quantity) {
        setPreview(null);
        addMessage('assistant', 'Inventory quantity changed. Sale cancelled.');
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
        notes: 'Recorded via BizTrack AI',
      });
      addMessage(
        'assistant',
        `✅ Confirmed! ${action.paymentStatus === 'credit' ? 'Credit sale' : 'Sale'} of ${formatNaira(total)} for ${product.name} recorded. Stock deducted automatically.`
      );
      return;
    }

    if (action.kind === 'repayment') {
      const debt = debts.find((d) => d.id === action.debt.id);
      if (!debt || debt.status !== 'active') {
        setPreview(null);
        addMessage('assistant', 'Customer debt record not found or already cleared.');
        return;
      }
      setPreview(null);
      recordRepayment(debt.id, action.amount, 'Cash', 'Recorded via BizTrack AI');
      addMessage(
        'assistant',
        `✅ Confirmed! Recorded ${formatNaira(action.amount)} repayment from ${debt.customerName}. New balance: ${formatNaira(Math.max(0, debt.balanceDue - action.amount))}.`
      );
      return;
    }
  };

  const renderPreview = () => {
    if (!preview) return null;
    let title = 'Confirm Financial Action';
    let rows: [string, string][] = [];

    if (preview.kind === 'newProduct') {
      title = 'Add Product to Inventory';
      rows = [
        ['Product Name', preview.name],
        ['Quantity', `${preview.quantity} ${preview.unit}`],
        ['Unit Cost', formatNaira(preview.costPrice)],
        ['Unit Selling Price', formatNaira(preview.sellingPrice)],
        ['Total Cost Value', formatNaira(preview.quantity * preview.costPrice)],
        ['Potential Profit', formatNaira(preview.quantity * (preview.sellingPrice - preview.costPrice))],
      ];
    } else if (preview.kind === 'restock') {
      title = 'Restock Product';
      rows = [
        ['Product', preview.product.name],
        ['Current Stock', `${preview.product.stockQuantity} ${preview.product.unit}`],
        ['Adding Quantity', `+${preview.quantity} ${preview.product.unit}`],
        ['New Total Stock', `${preview.product.stockQuantity + preview.quantity} ${preview.product.unit}`],
      ];
    } else if (preview.kind === 'expense') {
      title = 'Record Operating Expense';
      rows = [
        ['Expense Title', preview.title],
        ['Amount', formatNaira(preview.amount)],
        ['Category', preview.category],
        ['Payment Method', 'Cash'],
      ];
    } else if (preview.kind === 'sale') {
      const total = preview.product.sellingPrice * preview.quantity;
      title = preview.paymentStatus === 'credit' ? 'Record Credit Sale' : 'Record Paid Sale';
      rows = [
        ['Product', preview.product.name],
        ['Quantity', `${preview.quantity} ${preview.product.unit}`],
        ['Unit Price', formatNaira(preview.product.sellingPrice)],
        ['Total Amount', formatNaira(total)],
        ['Payment', preview.paymentStatus === 'credit' ? `On Credit (${preview.customerName})` : 'Paid in Full (Cash)'],
      ];
    } else if (preview.kind === 'repayment') {
      title = 'Record Debt Repayment';
      rows = [
        ['Customer', preview.debt.customerName],
        ['Current Balance', formatNaira(preview.debt.balanceDue)],
        ['Repayment Amount', formatNaira(preview.amount)],
        ['Remaining Balance', formatNaira(Math.max(0, preview.debt.balanceDue - preview.amount))],
      ];
    }

    return (
      <div className="mt-3 p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-2xl text-xs space-y-2 shadow-sm animate-in fade-in zoom-in duration-150">
        <div className="flex items-center gap-2 font-bold text-emerald-950 border-b border-emerald-200/80 pb-1.5">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{title}</span>
        </div>
        <dl className="space-y-1.5">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between items-center text-slate-700">
              <dt className="text-slate-500 font-medium">{label}</dt>
              <dd className="font-bold text-slate-900">{val}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={confirmPreview}
            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm & Record</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              addMessage('assistant', 'Action cancelled.');
            }}
            className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1 active:scale-95 transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    );
  };

  const closeAssistant = () => {
    stopSpeaking();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Trigger Button (Above Bottom Nav on mobile, bottom right on desktop) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open BizTrack AI Assistant"
          title="BizTrack AI Assistant"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-6 z-[45] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-navy-950 text-white shadow-xl shadow-navy-950/30 transition hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        >
          <Sparkles className="h-5 w-5 text-emerald-400" />
        </button>
      )}

      {/* Minimized Pill */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-6 z-[60] flex items-center gap-1.5 rounded-full border border-slate-300 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="Expand BizTrack AI"
            className="flex h-10 px-3 items-center gap-1.5 rounded-full bg-navy-950 text-white text-xs font-bold hover:bg-navy-900"
          >
            <Bot className="h-4 w-4 text-emerald-400" />
            <span>BizTrack AI</span>
          </button>
          <button
            type="button"
            onClick={closeAssistant}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* COMPACT BOTTOM SHEET ASSISTANT PANEL */}
      {isOpen && !isMinimized && (
        <>
          {/* Subtle translucent backdrop: Keeps dashboard clearly visible behind the sheet */}
          <div
            onClick={closeAssistant}
            className="fixed inset-0 z-[50] bg-black/25 backdrop-blur-[1px] transition-opacity"
            aria-hidden="true"
          />

          {/* Bottom Sheet Panel (Max Height 60-65% screen on mobile, floating compact window on desktop) */}
          <section
            aria-label="BizTrack AI Assistant Panel"
            className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col h-[64vh] max-h-[65vh] bg-white rounded-t-3xl border-t border-slate-200/90 shadow-[0_-10px_35px_rgba(0,0,0,0.18)] pb-[env(safe-area-inset-bottom,0px)] sm:bottom-6 sm:right-6 sm:left-auto sm:h-[580px] sm:max-h-[80vh] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-300 overflow-hidden animate-in slide-in-from-bottom duration-250"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between bg-navy-950 px-4 py-3 text-white border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-extrabold tracking-tight text-white truncate">
                      BizTrack <span className="text-emerald-400">AI</span>
                    </h2>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                      Offline
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 truncate">
                    {businessProfile.businessName} Assistant
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1">
                {/* Speaking Indicator & Stop Button */}
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    title="Stop speaking"
                    className="flex h-8 px-2 items-center gap-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-bold animate-pulse"
                  >
                    <VolumeX className="h-3.5 w-3.5" />
                    <span>Stop</span>
                  </button>
                )}

                {/* Voice Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setIsVoiceEnabled(!isVoiceEnabled);
                  }}
                  title={isVoiceEnabled ? 'Mute spoken audio' : 'Enable spoken audio'}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    isVoiceEnabled ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {/* Minimize */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Minimize Assistant"
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Close Assistant"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Conversation Area (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50 text-xs">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                      message.role === 'user'
                        ? 'bg-emerald-700 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-sm'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center justify-between gap-1 mb-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          BizTrack AI
                        </span>
                        {message.timestamp && (
                          <span className="text-slate-400 font-normal lowercase">{message.timestamp}</span>
                        )}
                      </div>
                    )}

                    <p className="whitespace-pre-line text-xs sm:text-sm font-normal">{message.text}</p>

                    {/* Interactive suggestions or navigation buttons */}
                    {message.options && message.options.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100">
                        {message.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => sendMessage(opt.value, opt.label)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold transition active:scale-95"
                          >
                            {opt.isNavigation && <Compass className="w-3 h-3 text-emerald-600" />}
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Starter Suggestions on clean launch */}
              {messages.length === 1 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5 px-1">
                    Quick suggestions from your records:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => sendMessage(sug)}
                        className="py-1.5 px-3 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-medium shadow-sm transition active:scale-95"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Confirmation Preview Card */}
              {renderPreview()}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="shrink-0 bg-white border-t border-slate-200 p-2.5 sm:p-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex flex-1 items-center bg-slate-100 focus-within:bg-white rounded-2xl border border-slate-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 transition px-3 py-1">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={500}
                    placeholder={isListening ? 'Listening to speech...' : 'Ask about sales, profit, stock, debts...'}
                    aria-label="Message BizTrack AI"
                    className="flex-1 bg-transparent py-1.5 text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400 min-h-[36px]"
                  />

                  {/* Two-Way Voice Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    title={isListening ? 'Stop listening' : 'Tap to speak'}
                    aria-label={isListening ? 'Stop listening' : 'Tap to speak'}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition shrink-0 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-500 hover:bg-emerald-100 hover:text-emerald-800'
                    }`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  aria-label="Send message"
                  className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center shadow-sm active:scale-95 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {/* Status Note */}
              <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-400" />
                  <span>100% Offline AI · Private on-device data</span>
                </span>
                {isListening ? (
                  <span className="text-emerald-600 font-bold animate-pulse">● Listening now...</span>
                ) : (
                  <span className="hidden sm:inline">Press Enter to send</span>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
};
