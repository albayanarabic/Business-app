import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerDebt } from '../types';
import {
  formatNaira,
  formatDate,
  generateReminderMessage,
  buildWhatsAppLink,
  copyToClipboard,
  ReminderTone,
} from '../utils/formatters';
import {
  MessageSquare,
  Send,
  Copy,
  Phone,
  Check,
  Calendar,
  AlertTriangle,
  UserCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { debts, businessProfile } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTone, setSelectedTone] = useState<ReminderTone>('gentle');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Only active debtors
  const activeDebtors = debts.filter((d) => d.status === 'active' && d.balanceDue > 0);

  const filteredDebtors = activeDebtors.filter(
    (d) =>
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customerPhone.includes(searchQuery)
  );

  const handleCopy = async (debt: CustomerDebt) => {
    const msg = generateReminderMessage(
      debt.customerName,
      debt.balanceDue,
      businessProfile,
      debt.initialDate,
      selectedTone
    );
    const success = await copyToClipboard(msg);
    if (success) {
      setCopiedId(debt.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSendWhatsApp = (debt: CustomerDebt) => {
    const msg = generateReminderMessage(
      debt.customerName,
      debt.balanceDue,
      businessProfile,
      debt.initialDate,
      selectedTone
    );
    const link = buildWhatsAppLink(debt.customerPhone, msg);
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            WhatsApp Payment Reminders
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Send polite, customized WhatsApp payment reminders to customers with outstanding balances
          </p>
        </div>
      </div>

      {/* Tone Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search debtor name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Global Tone Selector */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Tone:</span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSelectedTone('gentle')}
              className={`py-1.5 px-3 rounded-lg font-medium transition ${
                selectedTone === 'gentle'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              😊 Gentle
            </button>
            <button
              onClick={() => setSelectedTone('standard')}
              className={`py-1.5 px-3 rounded-lg font-medium transition ${
                selectedTone === 'standard'
                  ? 'bg-white text-blue-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Standard
            </button>
            <button
              onClick={() => setSelectedTone('urgent')}
              className={`py-1.5 px-3 rounded-lg font-medium transition ${
                selectedTone === 'urgent'
                  ? 'bg-white text-amber-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Urgent
            </button>
          </div>
        </div>
      </div>

      {/* Debtors List */}
      <div className="space-y-4">
        {filteredDebtors.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-600" />
            <h4 className="font-semibold text-slate-700 text-sm">
              No outstanding customer balances found
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              When customers take goods on credit, they will appear here for follow up.
            </p>
          </div>
        ) : (
          filteredDebtors.map((debt) => {
            const previewMsg = generateReminderMessage(
              debt.customerName,
              debt.balanceDue,
              businessProfile,
              debt.initialDate,
              selectedTone
            );

            return (
              <div
                key={debt.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-base text-slate-900">{debt.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {debt.customerPhone || 'No phone recorded'}
                      </span>
                      <span>•</span>
                      <span>Since {formatDate(debt.initialDate)}</span>
                      {debt.dueDate && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">
                            Due: {formatDate(debt.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Balance Due
                    </span>
                    <span className="text-xl font-extrabold text-rose-600 font-mono-num">
                      {formatNaira(debt.balanceDue)}
                    </span>
                  </div>
                </div>

                {/* Message Preview Box */}
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                  {previewMsg}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(debt)}
                      className="py-2 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      {copiedId === debt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>

                    {debt.customerPhone && (
                      <a
                        href={`tel:${debt.customerPhone}`}
                        className="py-2 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Direct Call</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleSendWhatsApp(debt)}
                    disabled={!debt.customerPhone}
                    className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                      debt.customerPhone
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Send on WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
