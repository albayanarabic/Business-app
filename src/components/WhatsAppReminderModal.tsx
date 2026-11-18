import React, { useState, useEffect } from 'react';
import { CustomerDebt } from '../types';
import { useApp } from '../context/AppContext';
import {
  formatNaira,
  formatDate,
  generateReminderMessage,
  buildWhatsAppLink,
  copyToClipboard,
  ReminderTone,
} from '../utils/formatters';
import { X, Send, Copy, Phone, Check, MessageSquare, Sparkles } from 'lucide-react';

interface WhatsAppReminderModalProps {
  debt: CustomerDebt | null;
  onClose: () => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  debt,
  onClose,
}) => {
  const { businessProfile } = useApp();
  const [tone, setTone] = useState<ReminderTone>('gentle');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (debt) {
      const msg = generateReminderMessage(
        debt.customerName,
        debt.balanceDue,
        businessProfile,
        debt.initialDate,
        tone
      );
      setCustomMessage(msg);
    }
  }, [debt, tone, businessProfile]);

  if (!debt) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(customMessage);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    const link = buildWhatsAppLink(debt.customerPhone, customMessage);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Payment Reminder</h3>
              <p className="text-xs text-slate-300">WhatsApp & SMS Ready Message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Customer Debt Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Customer</p>
              <h4 className="text-base font-bold text-slate-900">{debt.customerName}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {debt.customerPhone || 'No phone recorded'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Outstanding Debt</p>
              <p className="text-xl font-extrabold text-rose-600 font-mono-num">
                {formatNaira(debt.balanceDue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Since {formatDate(debt.initialDate)}
              </p>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Reminder Tone
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTone('gentle')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  tone === 'gentle'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                😊 Gentle & Polite
              </button>
              <button
                type="button"
                onClick={() => setTone('standard')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  tone === 'standard'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📋 Standard Business
              </button>
              <button
                type="button"
                onClick={() => setTone('urgent')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                  tone === 'urgent'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⚠️ Overdue / Urgent
              </button>
            </div>
          </div>

          {/* Editable WhatsApp Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Message Preview (Editable)
              </label>
              <span className="text-[11px] text-slate-400">Includes Bank Details automatically</span>
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={7}
              className="w-full text-xs font-sans text-slate-800 bg-emerald-50/30 border border-emerald-200 rounded-xl p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium text-sm transition shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Message</span>
              </>
            )}
          </button>

          {debt.customerPhone && (
            <a
              href={`tel:${debt.customerPhone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium text-sm transition shadow-sm"
              title="Call customer directly"
            >
              <Phone className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!debt.customerPhone}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition shadow-sm ${
              debt.customerPhone
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
