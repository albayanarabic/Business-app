import { supabase, isSupabaseConfigured } from './supabase';
import {
  enqueueOfflineAction,
  getPendingSyncQueue,
  idbGetAll,
  idbReplaceAll,
  markSyncQueueItemFailed,
  removeSyncQueueItem,
  setIndexedDBScope,
  SyncQueueItem,
} from './indexedDb';
import { BusinessProfile, CustomerDebt, Expense, Product, Sale } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'failed';

export interface SyncEngineListeners {
  onStatusChange?: (status: SyncStatus, pendingCount: number) => void;
  onDataUpdated?: () => void;
}

export interface LocalSnapshot {
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  debts: CustomerDebt[];
  expenses: Expense[];
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

class SyncEngine {
  private status: SyncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  private pendingCount = 0;
  private lastSyncedAt: string | null = null;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private listeners: SyncEngineListeners = {};
  private activeBusinessId: string | null = null;
  private activeUserId: string | null = null;
  private isSyncing = false;
  private syncRequested = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => this.updateStatus('offline'));
    }
  }

  public setListeners(listeners: SyncEngineListeners): void {
    this.listeners = listeners;
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getPendingCount(): number {
    return this.pendingCount;
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  public setActiveAccount(userId: string | null, businessId: string | null): void {
    this.activeUserId = userId;
    this.activeBusinessId = businessId;
    setIndexedDBScope(userId);
    if (this.realtimeChannel) {
      void supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    if (userId && businessId && isSupabaseConfigured() && navigator.onLine) {
      this.setupRealtimeSubscription(businessId);
      void this.refreshPendingCount().catch((error: unknown) => {
        console.error('Unable to count pending offline changes:', errorMessage(error));
      });
    } else {
      this.pendingCount = 0;
      this.updateStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
    }
  }

  private updateStatus(status: SyncStatus): void {
    this.status = status;
    this.listeners.onStatusChange?.(status, this.pendingCount);
  }

  public async enqueue(
    table: SyncQueueItem['table'],
    action: SyncQueueItem['action'],
    payload: unknown
  ): Promise<void> {
    if (!this.activeBusinessId || !this.activeUserId) return;
    await enqueueOfflineAction(table, action, payload, this.activeBusinessId);
    this.pendingCount += 1;
    this.updateStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'pending');
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const result = await this.syncNow();
      if (!result.success) throw new Error(result.error || 'Cloud sync failed');
    }
  }

  public async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (!this.activeUserId || !this.activeBusinessId) {
      return { success: false, error: 'Sign in to sync this business' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus('offline');
      return { success: false, error: 'Device is offline' };
    }
    if (!isSupabaseConfigured()) {
      this.updateStatus('failed');
      return { success: false, error: 'Supabase credentials are not configured' };
    }
    if (this.isSyncing) {
      this.syncRequested = true;
      return { success: true };
    }

    this.isSyncing = true;
    this.updateStatus('syncing');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id !== this.activeUserId) {
        throw new Error('The active Supabase session does not match the selected account');
      }

      const queueError = await this.flushQueue(authData.user.id);
      const remaining = await getPendingSyncQueue();
      this.pendingCount = remaining.length;

      if (queueError) {
        this.updateStatus('failed');
        return { success: false, error: queueError };
      }
      if (remaining.length) {
        this.updateStatus('pending');
        this.syncRequested = true;
        return { success: true };
      }

      await this.pullCloudData(this.activeBusinessId);
      this.lastSyncedAt = new Date().toISOString();
      this.listeners.onDataUpdated?.();
      this.updateStatus('synced');
      return { success: true };
    } catch (error) {
      this.updateStatus('failed');
      const message = errorMessage(error);
      console.error('BizTrack sync failed:', message);
      return { success: false, error: message };
    } finally {
      this.isSyncing = false;
      if (this.syncRequested) {
        this.syncRequested = false;
        window.setTimeout(() => {
          void this.syncNow();
        }, 0);
      }
    }
  }

  private async flushQueue(userId: string): Promise<string | null> {
    const queue = await getPendingSyncQueue();
    this.pendingCount = queue.length;
    let firstFailure: string | null = null;

    for (const item of queue) {
      try {
        if (item.businessId !== this.activeBusinessId) {
          throw new Error('Queued record belongs to a different business');
        }
        if (item.action === 'delete') {
          const { error } = await supabase
            .from(item.table)
            .delete()
            .eq('id', String((item.payload as { id: string }).id))
            .eq('business_id', item.businessId);
          if (error) throw error;
        } else {
          await this.upsertQueueItem(item, userId);
        }
        await removeSyncQueueItem(item.id);
        this.pendingCount = Math.max(0, this.pendingCount - 1);
      } catch (error) {
        const message = errorMessage(error);
        firstFailure ??= message;
        await markSyncQueueItemFailed(item.id, message);
        console.error(`BizTrack queue item ${item.id} failed:`, message);
        break;
      }
    }
    return firstFailure;
  }

  private async upsertQueueItem(item: SyncQueueItem, userId: string): Promise<void> {
    const payload = item.payload as Record<string, unknown>;
    const common = { id: String(payload.id), user_id: userId, business_id: item.businessId };
    const upsert = async (table: string, rows: Record<string, unknown> | Record<string, unknown>[]) => {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    };

    if (item.table === 'products') {
      await upsert('products', {
        ...common,
        name: payload.name,
        category: payload.category,
        cost_price: payload.costPrice,
        selling_price: payload.sellingPrice,
        stock_quantity: payload.stockQuantity,
        min_stock_level: payload.minStockLevel,
        unit: payload.unit,
        barcode: payload.barcode ?? null,
        image_url: payload.imageUrl ?? null,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt ?? new Date().toISOString(),
      });
      return;
    }
    if (item.table === 'sales') {
      const sale = payload as unknown as Sale;
      await upsert('sales', {
        ...common,
        sale_number: sale.saleNumber,
        date: sale.date,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total_amount: sale.totalAmount,
        total_cost: sale.totalCost,
        gross_profit: sale.grossProfit,
        payment_status: sale.paymentStatus,
        amount_paid: sale.amountPaid,
        balance_due: sale.balanceDue,
        payment_method: sale.paymentMethod,
        customer_name: sale.customerName ?? null,
        customer_phone: sale.customerPhone ?? null,
        customer_id: sale.customerId ?? null,
        notes: sale.notes ?? null,
      });
      const items = sale.items.map((row, index) => ({
        id: `${sale.id}-item-${index}`,
        user_id: userId,
        business_id: item.businessId,
        sale_id: sale.id,
        product_id: row.productId,
        product_name: row.productName,
        quantity: row.quantity,
        cost_price: row.costPrice,
        unit_price: row.unitPrice,
        total: row.total,
        unit: row.unit,
      }));
      if (items.length) await upsert('sale_items', items);
      return;
    }
    if (item.table === 'customer_debts') {
      const debt = payload as unknown as CustomerDebt;
      await upsert('customer_debts', {
        ...common,
        customer_name: debt.customerName,
        customer_phone: debt.customerPhone,
        customer_address: debt.customerAddress ?? null,
        total_debt: debt.totalDebt,
        amount_paid: debt.amountPaid,
        balance_due: debt.balanceDue,
        initial_date: debt.initialDate,
        due_date: debt.dueDate ?? null,
        status: debt.status,
        linked_sale_id: debt.linkedSaleId ?? null,
        notes: debt.notes ?? null,
      });
      const repayments = debt.repayments.map((repayment) => ({
        id: repayment.id,
        user_id: userId,
        business_id: item.businessId,
        debt_id: debt.id,
        amount: repayment.amount,
        date: repayment.date,
        payment_method: repayment.paymentMethod,
        notes: repayment.notes ?? null,
      }));
      if (repayments.length) await upsert('debt_repayments', repayments);
      return;
    }
    if (item.table === 'debt_repayments') {
      const repayment = payload as {
        id: string; debtId: string; amount: number; date: string;
        paymentMethod: string; notes?: string;
      };
      await upsert('debt_repayments', {
        ...common,
        debt_id: repayment.debtId,
        amount: repayment.amount,
        date: repayment.date,
        payment_method: repayment.paymentMethod,
        notes: repayment.notes ?? null,
      });
      return;
    }
    if (item.table === 'expenses') {
      const expense = payload as unknown as Expense;
      await upsert('expenses', {
        ...common,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        payment_method: expense.paymentMethod,
        description: expense.description ?? null,
        receipt_number: expense.receiptNumber ?? null,
      });
      return;
    }
    if (item.table === 'businesses') {
      const profile = payload as unknown as BusinessProfile;
      const { error } = await supabase
        .from('businesses')
        .update({
          name: profile.businessName,
          owner_name: profile.ownerName,
          tagline: profile.tagline,
          category: profile.businessCategory,
          phone_number: profile.phoneNumber,
          email: profile.email || null,
          address: profile.address,
          state: profile.state,
          bank_name: profile.bankName,
          account_number: profile.accountNumber,
          account_name: profile.accountName,
          currency: profile.currency,
          logo_url: profile.logoUrl ?? null,
        })
        .eq('id', item.businessId);
      if (error) throw error;
    }
  }

  public async pullCloudData(businessId: string): Promise<void> {
    const storageScope = this.activeUserId;
    if (!storageScope) throw new Error('Cannot apply cloud records without an active account');
    const [businessResult, productsResult, salesResult, debtsResult, expensesResult] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('products').select('*').eq('business_id', businessId).order('name'),
      supabase.from('sales').select('*, sale_items(*)').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('customer_debts').select('*, debt_repayments(*)').eq('business_id', businessId).order('initial_date', { ascending: false }),
      supabase.from('expenses').select('*').eq('business_id', businessId).order('date', { ascending: false }),
    ]);
    for (const result of [businessResult, productsResult, salesResult, debtsResult, expensesResult]) {
      if (result.error) throw result.error;
    }
    const business = businessResult.data;
    if (!business || !productsResult.data || !salesResult.data || !debtsResult.data || !expensesResult.data) {
      throw new Error('Supabase returned an incomplete business snapshot');
    }
    const profile: BusinessProfile = {
      businessName: business.name,
      tagline: business.tagline ?? 'Your Business. Your Records. Your Growth.',
      ownerName: business.owner_name ?? '',
      businessCategory: business.category ?? 'General Retail & Provisions',
      phoneNumber: business.phone_number ?? '',
      email: business.email ?? '',
      address: business.address ?? '',
      state: business.state ?? '',
      bankName: business.bank_name ?? '',
      accountNumber: business.account_number ?? '',
      accountName: business.account_name ?? '',
      currency: business.currency ?? 'NGN',
      logoUrl: business.logo_url ?? undefined,
    };
    const products: Product[] = productsResult.data.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      costPrice: Number(product.cost_price),
      sellingPrice: Number(product.selling_price),
      stockQuantity: Number(product.stock_quantity),
      minStockLevel: Number(product.min_stock_level),
      unit: product.unit,
      barcode: product.barcode ?? undefined,
      imageUrl: product.image_url ?? undefined,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));
    const sales: Sale[] = salesResult.data.map((sale) => ({
      id: sale.id,
      saleNumber: sale.sale_number,
      date: sale.date,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      totalAmount: Number(sale.total_amount),
      totalCost: Number(sale.total_cost),
      grossProfit: Number(sale.gross_profit),
      paymentStatus: sale.payment_status,
      amountPaid: Number(sale.amount_paid),
      balanceDue: Number(sale.balance_due),
      paymentMethod: sale.payment_method,
      customerName: sale.customer_name ?? undefined,
      customerPhone: sale.customer_phone ?? undefined,
      customerId: sale.customer_id ?? undefined,
      notes: sale.notes ?? undefined,
      items: (sale.sale_items ?? []).map((row: Record<string, unknown>) => ({
        productId: String(row.product_id ?? ''),
        productName: String(row.product_name),
        quantity: Number(row.quantity),
        costPrice: Number(row.cost_price),
        unitPrice: Number(row.unit_price),
        total: Number(row.total),
        unit: String(row.unit),
      })),
    }));
    const debts: CustomerDebt[] = debtsResult.data.map((debt) => ({
      id: debt.id,
      customerName: debt.customer_name,
      customerPhone: debt.customer_phone ?? '',
      customerAddress: debt.customer_address ?? undefined,
      totalDebt: Number(debt.total_debt),
      amountPaid: Number(debt.amount_paid),
      balanceDue: Number(debt.balance_due),
      initialDate: debt.initial_date,
      dueDate: debt.due_date ?? undefined,
      status: debt.status,
      linkedSaleId: debt.linked_sale_id ?? undefined,
      notes: debt.notes ?? undefined,
      repayments: (debt.debt_repayments ?? []).map((repayment: Record<string, unknown>) => ({
        id: String(repayment.id),
        debtId: String(repayment.debt_id),
        amount: Number(repayment.amount),
        date: String(repayment.date),
        paymentMethod: repayment.payment_method as 'Cash' | 'Bank Transfer' | 'POS',
        notes: repayment.notes ? String(repayment.notes) : undefined,
      })),
    }));
    const expenses: Expense[] = expensesResult.data.map((expense) => ({
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.payment_method,
      description: expense.description ?? undefined,
      receiptNumber: expense.receipt_number ?? undefined,
    }));

    await Promise.all([
      idbReplaceAll('profile', [{ id: 'current_profile', ...profile }], storageScope),
      idbReplaceAll('products', products, storageScope),
      idbReplaceAll('sales', sales, storageScope),
      idbReplaceAll('debts', debts, storageScope),
      idbReplaceAll('expenses', expenses, storageScope),
    ]);
  }

  private setupRealtimeSubscription(businessId: string): void {
    this.realtimeChannel = supabase
      .channel(`biztrack-business-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, () => void this.handleRealtimeUpdate(businessId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `business_id=eq.${businessId}` }, () => void this.handleRealtimeUpdate(businessId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_debts', filter: `business_id=eq.${businessId}` }, () => void this.handleRealtimeUpdate(businessId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${businessId}` }, () => void this.handleRealtimeUpdate(businessId))
      .subscribe();
  }

  private async handleRealtimeUpdate(businessId: string): Promise<void> {
    try {
      if (this.activeBusinessId !== businessId) return;
      if (this.pendingCount || this.isSyncing) return;
      await this.pullCloudData(businessId);
      this.listeners.onDataUpdated?.();
    } catch (error) {
      this.updateStatus('failed');
      console.error('BizTrack realtime refresh failed:', errorMessage(error));
    }
  }

  public async migrateLocalDataToCloud(
    userId: string,
    businessId: string,
    localData: LocalSnapshot
  ): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase credentials are not configured');
    if (!navigator.onLine) throw new Error('Connect to the internet to migrate local records');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (authData.user?.id !== userId) throw new Error('Cannot migrate records for a different signed-in user');

    const businessProfile = localData.profile;
    const { data: currentBusiness, error: businessError } = await supabase
      .from('businesses').select('*').eq('id', businessId).single();
    if (businessError) throw businessError;
    if (!currentBusiness) throw new Error('Business profile was not found during local migration');
    const localProfileFields: Record<string, unknown> = {
      name: businessProfile.businessName,
      owner_name: businessProfile.ownerName,
      tagline: businessProfile.tagline,
      category: businessProfile.businessCategory,
      phone_number: businessProfile.phoneNumber,
      email: businessProfile.email,
      address: businessProfile.address,
      state: businessProfile.state,
      bank_name: businessProfile.bankName,
      account_number: businessProfile.accountNumber,
      account_name: businessProfile.accountName,
      currency: businessProfile.currency,
      logo_url: businessProfile.logoUrl,
    };
    const profileUpdates: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(localProfileFields)) {
      const currentValue = currentBusiness[field];
      if ((currentValue === null || currentValue === undefined || currentValue === '') && value) {
        profileUpdates[field] = value;
      }
    }
    if (currentBusiness.name === 'My Business' && businessProfile.businessName) {
      profileUpdates.name = businessProfile.businessName;
    }
    if (Object.keys(profileUpdates).length) {
      const { error: profileError } = await supabase.from('businesses').update(profileUpdates).eq('id', businessId);
      if (profileError) throw profileError;
    }

    const upsertIgnoringExisting = async (table: string, rows: Record<string, unknown>[]) => {
      if (!rows.length) return;
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    };
    await upsertIgnoringExisting('products', localData.products.map((product) => ({
      id: product.id, user_id: userId, business_id: businessId, name: product.name,
      category: product.category, cost_price: product.costPrice, selling_price: product.sellingPrice,
      stock_quantity: product.stockQuantity, min_stock_level: product.minStockLevel,
      unit: product.unit, barcode: product.barcode ?? null, image_url: product.imageUrl ?? null,
      created_at: product.createdAt, updated_at: product.updatedAt ?? product.createdAt,
    })));

    const saleRows = localData.sales.map((sale) => ({
      id: sale.id, user_id: userId, business_id: businessId, sale_number: sale.saleNumber,
      date: sale.date, subtotal: sale.subtotal, discount: sale.discount, total_amount: sale.totalAmount,
      total_cost: sale.totalCost, gross_profit: sale.grossProfit, payment_status: sale.paymentStatus,
      amount_paid: sale.amountPaid, balance_due: sale.balanceDue, payment_method: sale.paymentMethod,
      customer_name: sale.customerName ?? null, customer_phone: sale.customerPhone ?? null,
      customer_id: sale.customerId ?? null, notes: sale.notes ?? null,
    }));
    await upsertIgnoringExisting('sales', saleRows);
    const saleItemRows = localData.sales.flatMap((sale) => sale.items.map((row, index) => ({
      id: `${sale.id}-item-${index}`, user_id: userId, business_id: businessId, sale_id: sale.id,
      product_id: row.productId, product_name: row.productName, quantity: row.quantity,
      cost_price: row.costPrice, unit_price: row.unitPrice, total: row.total, unit: row.unit,
    })));
    await upsertIgnoringExisting('sale_items', saleItemRows);

    await upsertIgnoringExisting('customer_debts', localData.debts.map((debt) => ({
      id: debt.id, user_id: userId, business_id: businessId, customer_name: debt.customerName,
      customer_phone: debt.customerPhone, customer_address: debt.customerAddress ?? null,
      total_debt: debt.totalDebt, amount_paid: debt.amountPaid, balance_due: debt.balanceDue,
      initial_date: debt.initialDate, due_date: debt.dueDate ?? null, status: debt.status,
      linked_sale_id: debt.linkedSaleId ?? null, notes: debt.notes ?? null,
    })));
    const repaymentRows = localData.debts.flatMap((debt) => debt.repayments.map((repayment) => ({
      id: repayment.id, user_id: userId, business_id: businessId, debt_id: debt.id,
      amount: repayment.amount, date: repayment.date, payment_method: repayment.paymentMethod,
      notes: repayment.notes ?? null,
    })));
    await upsertIgnoringExisting('debt_repayments', repaymentRows);
    await upsertIgnoringExisting('expenses', localData.expenses.map((expense) => ({
      id: expense.id, user_id: userId, business_id: businessId, title: expense.title,
      amount: expense.amount, category: expense.category, date: expense.date,
      payment_method: expense.paymentMethod, description: expense.description ?? null,
      receipt_number: expense.receiptNumber ?? null,
    })));
  }

  public async readLocalSnapshot(userId: string | null = this.activeUserId): Promise<LocalSnapshot> {
    const scope = userId ?? 'guest';
    const [profileRows, products, sales, debts, expenses] = await Promise.all([
      idbGetAll<BusinessProfile & { id: string }>('profile', scope),
      idbGetAll<Product>('products', scope),
      idbGetAll<Sale>('sales', scope),
      idbGetAll<CustomerDebt>('debts', scope),
      idbGetAll<Expense>('expenses', scope),
    ]);
    const { id: _id, ...profile } = profileRows[0] ?? { id: '', businessName: '', tagline: '', ownerName: '', businessCategory: '', phoneNumber: '', email: '', address: '', state: '', bankName: '', accountNumber: '', accountName: '', currency: 'NGN' };
    return { profile, products, sales, debts, expenses };
  }

  public async readCachedSnapshot(userId: string): Promise<LocalSnapshot | null> {
    const scope = userId;
    const [profileRows, products, sales, debts, expenses] = await Promise.all([
      idbGetAll<BusinessProfile & { id: string }>('profile', scope),
      idbGetAll<Product>('products', scope),
      idbGetAll<Sale>('sales', scope),
      idbGetAll<CustomerDebt>('debts', scope),
      idbGetAll<Expense>('expenses', scope),
    ]);
    if (!profileRows.length && !products.length && !sales.length && !debts.length && !expenses.length) return null;
    const { id: _id, ...profile } = profileRows[0] ?? {
      id: '',
      businessName: '',
      tagline: '',
      ownerName: '',
      businessCategory: '',
      phoneNumber: '',
      email: '',
      address: '',
      state: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      currency: 'NGN',
    };
    return { profile, products, sales, debts, expenses };
  }

  public async persistLocalSnapshot(snapshot: LocalSnapshot, userId: string | null): Promise<void> {
    const scope = userId ?? 'guest';
    await Promise.all([
      idbReplaceAll('profile', [{ id: 'current_profile', ...snapshot.profile }], scope),
      idbReplaceAll('products', snapshot.products, scope),
      idbReplaceAll('sales', snapshot.sales, scope),
      idbReplaceAll('debts', snapshot.debts, scope),
      idbReplaceAll('expenses', snapshot.expenses, scope),
    ]);
  }

  public async refreshPendingCount(): Promise<void> {
    try {
      this.pendingCount = (await getPendingSyncQueue()).length;
      this.updateStatus(this.pendingCount ? 'pending' : 'synced');
    } catch (error) {
      this.updateStatus('failed');
      throw error;
    }
  }
}

export const syncEngine = new SyncEngine();
