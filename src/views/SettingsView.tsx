import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BizTrackLogo } from '../components/BizTrackLogo';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Landmark,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    businessProfile,
    updateBusinessProfile,
    resetToSampleData,
    clearAllData,
    products,
    sales,
    debts,
    expenses,
  } = useApp();

  const [formData, setFormData] = useState(businessProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Reset application to default Nigerian sample provision store data? This will restore realistic demo products, sales, debts and expenses.'
      )
    ) {
      resetToSampleData();
      setFormData(businessProfile);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const handleClearData = () => {
    if (
      window.confirm(
        'Are you sure you want to delete ALL business records? This cannot be undone.'
      )
    ) {
      clearAllData();
      alert('All business records cleared successfully.');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      profile: businessProfile,
      products,
      sales,
      debts,
      expenses,
      exportedAt: new Date().toISOString(),
      appName: 'BizTrack Nigeria',
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `BizTrack_Backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Business Profile & Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure your business registration, contact information, settlement bank details and data management
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Business Profile successfully updated! Changes are reflected across receipts and dashboard.</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          <span>Application restored to realistic Nigerian provision store sample data!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Business Information</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            This name and address will appear on customer receipts and WhatsApp reminders
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Business Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Owner's Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Business Category
            </label>
            <input
              type="text"
              value={formData.businessCategory}
              onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number (WhatsApp Enabled) *
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Business Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Physical Shop Address & State
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Shop 14, Balogun Business Complex, Lagos Island, Lagos"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Bank Settlement Details */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 mb-1">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>Bank Account Details (For Customer Payment Reminders)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Included automatically in customer WhatsApp reminder messages and receipts
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. Zenith Bank, Access Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Number
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digit NUBAN"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. Chinedu Enterprises"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
          >
            Save Business Profile
          </button>
        </div>
      </form>

      {/* Demo Controls & Data Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Demonstration & Data Tools</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset or backup your local database for demonstrations with stakeholders and investors
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleResetData}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2 transition"
          >
            <RotateCcw className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="font-bold text-xs text-slate-900 block">Reset Sample Data</span>
              <span className="text-[11px] text-slate-500">Restore Nigerian provision store items</span>
            </div>
          </button>

          <button
            onClick={handleExportBackup}
            className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2 transition"
          >
            <Download className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-bold text-xs text-slate-900 block">Export JSON Backup</span>
              <span className="text-[11px] text-slate-500">Download complete store records</span>
            </div>
          </button>

          <button
            onClick={handleClearData}
            className="p-4 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-200 flex flex-col items-center justify-center text-center gap-2 transition"
          >
            <Trash2 className="w-5 h-5 text-rose-600" />
            <div>
              <span className="font-bold text-xs text-rose-900 block">Clear All Records</span>
              <span className="text-[11px] text-rose-600">Start from a blank slate</span>
            </div>
          </button>
        </div>
      </div>

      {/* About Box */}
      <div className="p-4 bg-navy-950 text-slate-300 rounded-2xl text-xs flex items-center justify-between border border-slate-800">
        <div className="flex items-center space-x-3">
          <BizTrackLogo size="md" />
          <div>
            <h4 className="font-bold text-white text-sm">BizTrack Nigeria v1.0 Prototype</h4>
            <p className="text-slate-400 text-[11px]">
              Digital Nigeria Business Management Infrastructure for Small & Medium Businesses
            </p>
          </div>
        </div>
        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-mono border border-emerald-500/30">
          PROTOTYPE READY
        </span>
      </div>
    </div>
  );
};
