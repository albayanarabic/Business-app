import { BusinessProfile, CustomerDebt, Expense, Product, Sale } from '../types';

const DB_VERSION = 1;
const STORE_NAMES = ['products', 'sales', 'debts', 'expenses', 'profile', 'sync_queue', 'offline_images'];
const databases = new Map<string, IDBDatabase>();
let activeScope = 'guest';

export interface SyncQueueItem {
  id: string;
  table: 'products' | 'sales' | 'customer_debts' | 'debt_repayments' | 'expenses' | 'businesses';
  action: 'insert' | 'update' | 'delete';
  payload: unknown;
  businessId: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

export interface LocalSnapshot {
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  debts: CustomerDebt[];
  expenses: Expense[];
}

export const setIndexedDBScope = (scope: string | null): void => {
  activeScope = scope || 'guest';
};

export const openBizTrackDB = (scope: string = activeScope): Promise<IDBDatabase> => {
  const cached = databases.get(scope);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(`biztrack_offline_db_${scope}`, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: 'id' });
        if (name === 'sync_queue') {
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databases.delete(scope);
      };
      databases.set(scope, db);
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline database'));
  });
};

export const idbGetAll = async <T>(storeName: string, scope?: string): Promise<T[]> => {
  const db = await openBizTrackDB(scope);
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error(`Failed to read ${storeName}`));
  });
};

export const idbPut = async <T>(storeName: string, item: T): Promise<void> => {
  const db = await openBizTrackDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to save ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Saving ${storeName} was aborted`));
  });
};

export const idbPutBulk = async <T>(storeName: string, items: T[], scope?: string): Promise<void> => {
  const db = await openBizTrackDB(scope);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to save ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Saving ${storeName} was aborted`));
  });
};

export const idbDelete = async (storeName: string, key: string): Promise<void> => {
  const db = await openBizTrackDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to delete from ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Deleting from ${storeName} was aborted`));
  });
};

export const idbClear = async (storeName: string, scope?: string): Promise<void> => {
  const db = await openBizTrackDB(scope);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to clear ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Clearing ${storeName} was aborted`));
  });
};

export const idbReplaceAll = async <T>(storeName: string, items: T[], scope?: string): Promise<void> => {
  const db = await openBizTrackDB(scope);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to replace ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Replacing ${storeName} was aborted`));
  });
};

export const enqueueOfflineAction = async (
  table: SyncQueueItem['table'],
  action: SyncQueueItem['action'],
  payload: unknown,
  businessId: string
): Promise<SyncQueueItem> => {
  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    table,
    action,
    payload,
    businessId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };
  await idbPut('sync_queue', queueItem);
  return queueItem;
};

export const getPendingSyncQueue = async (): Promise<SyncQueueItem[]> =>
  (await idbGetAll<SyncQueueItem>('sync_queue'))
    .filter((item) => item.status === 'pending' || item.status === 'failed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const removeSyncQueueItem = (id: string): Promise<void> => idbDelete('sync_queue', id);

export const markSyncQueueItemFailed = async (id: string, errorMessage: string): Promise<void> => {
  const all = await idbGetAll<SyncQueueItem>('sync_queue');
  const item = all.find((entry) => entry.id === id);
  if (!item) return;
  item.status = 'failed';
  item.retryCount += 1;
  item.errorMessage = errorMessage;
  await idbPut('sync_queue', item);
};
