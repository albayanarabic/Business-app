import React from 'react';
import { Sale } from '../types';
import { useApp } from '../context/AppContext';
import { formatNaira, formatDate, buildWhatsAppLink } from '../utils/formatters';
import { X, Printer, Share2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { businessProfile } = useApp();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const itemsList = sale.items
      .map(
        (item) =>
          `• ${item.quantity} ${item.unit} x ${item.productName} = ${formatNaira(item.total)}`
      )
      .join('\n');

    const paymentInfo =
      sale.balanceDue > 0
        ? `\n*Paid:* ${formatNaira(sale.amountPaid)}\n*Balance Due:* ${formatNaira(sale.balanceDue)}\n\n📌 *Payment Details:*\nBank: ${businessProfile.bankName}\nAccount: *${businessProfile.accountNumber}*\nName: ${businessProfile.accountName}`
        : `\n*Paid in Full:* ${formatNaira(sale.totalAmount)} (${sale.paymentMethod})`;

    const message = `🧾 *RECEIPT: ${businessProfile.businessName}*\n*Receipt No:* ${sale.saleNumber}\n*Date:* ${formatDate(sale.date, true)}\n*Customer:* ${sale.customerName || 'Valued Customer'}\n\n*Items Purchased:*\n${itemsList}\n\n*Total Amount:* *${formatNaira(sale.totalAmount)}*${paymentInfo}\n\nThank you for your patronage! 🙏`;

    const phone = sale.customerPhone || '';
    const link = buildWhatsAppLink(phone, message);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-xs sm:text-sm tracking-wide uppercase text-slate-300">Transaction Receipt</span>
            <span className="text-[11px] sm:text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              {sale.saleNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" className="p-4 sm:p-6 bg-white text-slate-800">
          {/* Header */}
          <div className="text-center pb-5 border-b border-dashed border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">{businessProfile.businessName}</h2>
            <p className="text-xs text-slate-500 mt-1">{businessProfile.address}</p>
            <p className="text-xs text-slate-500 font-medium">Tel: {businessProfile.phoneNumber}</p>
            {businessProfile.tagline && (
              <p className="text-[11px] text-emerald-700 italic mt-1 font-medium">"{businessProfile.tagline}"</p>
            )}
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs py-4 border-b border-dashed border-slate-200 text-slate-600">
            <div>
              <span className="text-slate-400 block">Date & Time</span>
              <span className="font-medium text-slate-800">{formatDate(sale.date, true)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Payment Method</span>
              <span className="font-medium text-slate-800">{sale.paymentMethod}</span>
            </div>
            {sale.customerName && (
              <div className="col-span-2 pt-1">
                <span className="text-slate-400 block">Customer</span>
                <span className="font-medium text-slate-800">
                  {sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Items Purchased */}
          <div className="py-4 border-b border-dashed border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider text-[10px] pb-2 border-b border-slate-100">
                  <th className="text-left font-semibold pb-1">Item</th>
                  <th className="text-center font-semibold pb-1">Qty</th>
                  <th className="text-right font-semibold pb-1">Price</th>
                  <th className="text-right font-semibold pb-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-1.5 text-slate-800 font-medium">{item.productName}</td>
                    <td className="py-1.5 text-center text-slate-600">{item.quantity} {item.unit}</td>
                    <td className="py-1.5 text-right text-slate-600">{formatNaira(item.unitPrice)}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-800">{formatNaira(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="py-3 space-y-1.5 text-xs border-b border-dashed border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatNaira(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied</span>
                <span>-{formatNaira(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
              <span>Total Amount</span>
              <span className="text-base text-slate-900 font-mono-num">{formatNaira(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>Amount Paid</span>
              <span className="font-semibold text-emerald-700">{formatNaira(sale.amountPaid)}</span>
            </div>
            {sale.balanceDue > 0 ? (
              <div className="flex justify-between text-rose-600 font-bold bg-rose-50 p-2 rounded-lg">
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Balance Due (Credit)
                </span>
                <span className="font-mono-num">{formatNaira(sale.balanceDue)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded">
                <span className="flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                </span>
                <span className="text-[11px]">₦0.00 Balance</span>
              </div>
            )}
          </div>

          {/* Bank details for credit or customer reference */}
          {sale.balanceDue > 0 && businessProfile.bankName && (
            <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs">
              <p className="font-semibold text-slate-700">Bank Details for Balance Settlement:</p>
              <p className="text-slate-900 font-bold mt-0.5">
                {businessProfile.bankName} — <span className="font-mono">{businessProfile.accountNumber}</span>
              </p>
              <p className="text-slate-500 text-[11px]">{businessProfile.accountName}</p>
            </div>
          )}

          {sale.notes && (
            <div className="pt-2 text-[11px] text-slate-500 italic">
              Note: {sale.notes}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 text-[11px] text-slate-400">
            <p className="font-medium text-slate-600">Thank you for your business!</p>
            <p className="mt-1">Powered by BizTrack Nigeria</p>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium text-sm transition shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Send WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
