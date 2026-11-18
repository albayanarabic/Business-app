import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Product, Sale, CustomerDebt } from './types';
import { DashboardView } from './views/DashboardView';
import { SalesView } from './views/SalesView';
import { InventoryView } from './views/InventoryView';
import { DebtsView } from './views/DebtsView';
import { RemindersView } from './views/RemindersView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

// Modals
import { RecordSaleModal } from './components/RecordSaleModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddDebtModal } from './components/AddDebtModal';
import { AddProductModal } from './components/AddProductModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { RepaymentModal } from './components/RepaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';

import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  CreditCard,
  Receipt,
  FileText,
  Settings,
  MessageSquare,
  Plus,
  Bell,
  Menu,
  X,
  Download,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

type Tab =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'debts'
  | 'reminders'
  | 'expenses'
  | 'reports'
  | 'settings';

const AppContent: React.FC = () => {
  const { businessProfile, lowStockProducts, debts } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Modal states
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [repaymentDebt, setRepaymentDebt] = useState<CustomerDebt | null>(null);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [whatsappDebt, setWhatsappDebt] = useState<CustomerDebt | null>(null);

  const activeDebtsCount = debts.filter((d) => d.status === 'active' && d.balanceDue > 0).length;

  // Listen for PWA beforeinstallprompt on Chrome / Android
  useEffect(() => {
    // Check if already in standalone display mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Handle initial URL parameters (PWA shortcuts)
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const tab = urlParams.get('tab');

    if (action === 'new-sale') {
      setIsRecordSaleOpen(true);
    } else if (action === 'new-expense') {
      setIsAddExpenseOpen(true);
    } else if (tab && ['dashboard', 'sales', 'inventory', 'debts', 'reminders', 'expenses', 'reports', 'settings'].includes(tab)) {
      setActiveTab(tab as Tab);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Fallback instruction for Android Chrome if prompt isn't directly triggerable
      alert(
        'To install BizTrack on your phone:\n1. Tap the three dots (⋮) in the top-right corner of Chrome.\n2. Tap "Install app" or "Add to Home screen".'
      );
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    }
  };

  const handleOpenAddProduct = (product?: Product) => {
    setProductToEdit(product || null);
    setIsAddProductOpen(true);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      badge: lowStockProducts.length > 0 ? lowStockProducts.length : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'debts',
      label: 'Customers & Debts',
      icon: CreditCard,
      badge: activeDebtsCount > 0 ? activeDebtsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'reminders', label: 'WhatsApp Reminders', icon: MessageSquare },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Reports & Profit', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-navy-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center space-x-2.5 cursor-pointer group min-w-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md font-extrabold text-base tracking-wider group-hover:scale-105 transition">
                BT
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
                  BizTrack<span className="text-emerald-400">.ng</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:block leading-tight font-medium">
                  Digital Nigeria Business Manager
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Install App Button if not installed */}
            {!isAppInstalled && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-sm"
                title="Install app to your home screen"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {/* Quick Record Sale button always prominent in header */}
            <button
              onClick={() => setIsRecordSaleOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3 sm:px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span className="max-[359px]:hidden">Record Sale</span>
            </button>

            {/* Notifications Pill for Low Stock or Active Debts */}
            {(lowStockProducts.length > 0 || activeDebtsCount > 0) && (
              <button
                onClick={() =>
                  setActiveTab(lowStockProducts.length > 0 ? 'inventory' : 'debts')
                }
                className="max-[359px]:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 relative transition min-w-[40px] min-h-[40px] flex items-center justify-center"
                title={`${lowStockProducts.length} low stock items, ${activeDebtsCount} debtors`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </button>
            )}

            {/* Profile Avatar / Quick Switch */}
            <div
              onClick={() => setActiveTab('settings')}
              className="max-[359px]:hidden flex items-center space-x-2 p-1 pl-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl cursor-pointer border border-slate-700/50 transition"
            >
              <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[140px]">
                {businessProfile.businessName}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                {businessProfile.ownerName ? businessProfile.ownerName.charAt(0) : 'C'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Install App Banner (dismissible) */}
      {!isAppInstalled && showInstallBanner && (
        <div className="sm:hidden bg-gradient-to-r from-navy-950 to-slate-900 border-b border-emerald-500/30 px-3 py-2 text-white flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-bold text-white text-[11px] truncate">Use BizTrack as Mobile App</p>
              <p className="text-[10px] text-slate-400 truncate">Install to phone home screen for 1-tap access</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="py-1 px-2.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-sm active:scale-95"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1 text-slate-400 hover:text-white"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body Layout: Sidebar + Main View Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex-1 flex pt-3 sm:pt-6 gap-6 min-w-0 overflow-x-hidden">
        {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* PWA Install Button in Desktop Sidebar */}
            {!isAppInstalled && (
              <div className="pt-3 border-t border-slate-100 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold transition text-left"
                >
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-bold">Install BizTrack App</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Add to desktop or phone</span>
                  </div>
                </button>
              </div>
            )}

            {/* Quick Helper in Sidebar */}
            <div className="mt-4 pt-3 border-t border-slate-100 px-3 pb-2 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-600">BizTrack Support</p>
              <p className="mt-0.5">Need help or training? Contact: +234 800-BIZTRACK</p>
            </div>
          </div>
        </aside>

        {/* Mobile Dropdown Menu (when hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-start p-4 pt-16 overflow-y-auto">
            <div className="bg-white rounded-2xl p-4 shadow-2xl space-y-1 max-w-sm w-full mx-auto animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Menu Navigation
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as Tab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {!isAppInstalled && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleInstallClick();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App on Phone</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Main View Content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenRecordSale={() => setIsRecordSaleOpen(true)}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onOpenAddDebt={() => setIsAddDebtOpen(true)}
              onOpenAddProduct={() => handleOpenAddProduct()}
              onViewReceipt={(sale) => setActiveReceiptSale(sale)}
              onNavigateToTab={(t) => setActiveTab(t as Tab)}
              onAdjustStockProduct={(prod) => setStockAdjustProduct(prod)}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              onOpenRecordSale={() => setIsRecordSaleOpen(true)}
              onViewReceipt={(sale) => setActiveReceiptSale(sale)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              onOpenAddProduct={(p) => handleOpenAddProduct(p)}
              onOpenAdjustStock={(p) => setStockAdjustProduct(p)}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              onOpenAddDebt={() => setIsAddDebtOpen(true)}
              onOpenRepayment={(debt) => setRepaymentDebt(debt)}
              onOpenWhatsAppReminder={(debt) => setWhatsappDebt(debt)}
            />
          )}

          {activeTab === 'reminders' && <RemindersView />}

          {activeTab === 'expenses' && (
            <ExpensesView onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          )}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* MOBILE-FIRST BOTTOM NAVIGATION BAR (Android & iOS Safe Area) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around safe-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition min-w-[50px] min-h-[44px] justify-center ${
            activeTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition min-w-[50px] min-h-[44px] justify-center ${
            activeTab === 'sales' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Sales</span>
        </button>

        {/* Center Prominent Record Sale Floating Action */}
        <button
          onClick={() => setIsRecordSaleOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 active:scale-95 transition"
          aria-label="Record Sale"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl relative transition min-w-[50px] min-h-[44px] justify-center ${
            activeTab === 'inventory' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Stock</span>
          {lowStockProducts.length > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl relative transition min-w-[50px] min-h-[44px] justify-center ${
            activeTab === 'debts' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Debts</span>
          {activeDebtsCount > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition min-w-[50px] min-h-[44px] justify-center ${
            activeTab === 'reports' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Reports</span>
        </button>
      </nav>

      {/* MODALS */}
      {/* 1. Record Sale Modal */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCompleted={(sale) => setActiveReceiptSale(sale)}
      />

      {/* 2. Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      {/* 3. Add Customer Debt Modal */}
      <AddDebtModal
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
      />

      {/* 4. Add/Edit Product Modal */}
      <AddProductModal
        isOpen={isAddProductOpen}
        productToEdit={productToEdit}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
      />

      {/* 5. Adjust Stock Modal */}
      <StockAdjustModal
        product={stockAdjustProduct}
        onClose={() => setStockAdjustProduct(null)}
      />

      {/* 6. Repayment Modal */}
      <RepaymentModal
        debt={repaymentDebt}
        onClose={() => setRepaymentDebt(null)}
      />

      {/* 7. Receipt Modal */}
      <ReceiptModal
        sale={activeReceiptSale}
        onClose={() => setActiveReceiptSale(null)}
      />

      {/* 8. WhatsApp Payment Reminder Modal */}
      <WhatsAppReminderModal
        debt={whatsappDebt}
        onClose={() => setWhatsappDebt(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
