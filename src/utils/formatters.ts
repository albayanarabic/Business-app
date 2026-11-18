import { BusinessProfile, DateFilter } from '../types';

/**
 * Format numbers to Nigerian Naira currency format
 * e.g., 85000 -> "₦85,000"
 */
export function formatNaira(amount: number, showDecimals: boolean = false): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);

  // Replace NGN with the authentic ₦ symbol
  const nairaStr = formatted.replace('NGN', '₦').trim();
  return amount < 0 ? `-${nairaStr}` : nairaStr;
}

/**
 * Format date for human readability in Nigerian business context
 */
export function formatDate(dateString: string, includeTime: boolean = false): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return includeTime ? `Today at ${timeStr}` : 'Today';
  }
  if (isYesterday) {
    return includeTime ? `Yesterday at ${timeStr}` : 'Yesterday';
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  const formattedDate = date.toLocaleDateString('en-GB', dateOptions);
  return includeTime ? `${formattedDate}, ${timeStr}` : formattedDate;
}

/**
 * Format date for input elements (YYYY-MM-DD)
 */
export function toInputDate(dateString?: string): string {
  const d = dateString ? new Date(dateString) : new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Clean Nigerian phone number to international WhatsApp format
 * e.g. "0803 123 4567" -> "2348031234567"
 * e.g. "+234 803 123 4567" -> "2348031234567"
 */
export function sanitizeNigerianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return '234' + digits.substring(1);
  }
  if (digits.length === 10) {
    return '234' + digits;
  }
  return digits;
}

export type ReminderTone = 'gentle' | 'standard' | 'urgent';

/**
 * Generate polite WhatsApp payment reminder messages customized for Nigerian commerce
 */
export function generateReminderMessage(
  customerName: string,
  balanceDue: number,
  business: BusinessProfile,
  initialDate?: string,
  tone: ReminderTone = 'gentle'
): string {
  const amountStr = formatNaira(balanceDue);
  const dateStr = initialDate ? formatDate(initialDate) : 'recently';
  const bankInfo = business.bankName && business.accountNumber
    ? `\n\n📌 *Payment Details:*\nBank: ${business.bankName}\nAccount No: *${business.accountNumber}*\nAccount Name: ${business.accountName || business.businessName}`
    : '';

  switch (tone) {
    case 'gentle':
      return `Hello ${customerName}, Good day! 😊\n\nTrust business and family are doing great. This is a gentle reminder from *${business.businessName}* regarding your outstanding balance of *${amountStr}* for your purchase made on ${dateStr}.\n\nWhenever it is convenient, kindly assist with settling this.${bankInfo}\n\nThank you very much for your valued patronage! 🙏`;

    case 'standard':
      return `Good day ${customerName},\n\nThis is an official payment notice from *${business.businessName}*.\n\nYour pending balance for goods supplied on ${dateStr} is *${amountStr}*.\n\nKindly arrange to clear this balance at your earliest convenience.${bankInfo}\n\nFor any inquiries or confirmation, please reply directly. Thank you!`;

    case 'urgent':
      return `Dear ${customerName},\n\nImportant notification from *${business.businessName}*:\n\nYour credit balance of *${amountStr}* is currently overdue. We kindly request that you settle this account today to keep your credit line active and our supplier records up to date.${bankInfo}\n\nThank you for your prompt cooperation.`;
  }
}

/**
 * Build WhatsApp web / app link with prefilled text
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = sanitizeNigerianPhone(phone);
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}

/**
 * Filter data by selected date range
 */
export function isWithinFilter(dateString: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;

  const itemDate = new Date(dateString);
  const now = new Date();

  // Reset time portions for day comparisons
  const itemMidnight = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 86400000;

  switch (filter) {
    case 'today':
      return itemMidnight === todayMidnight;
    case 'yesterday':
      return itemMidnight === todayMidnight - oneDayMs;
    case 'week': {
      // Last 7 days
      return itemMidnight >= todayMidnight - 6 * oneDayMs && itemMidnight <= todayMidnight;
    }
    case 'month': {
      // Current calendar month
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    }
    default:
      return true;
  }
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
