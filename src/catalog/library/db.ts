import type { WallpaperDef } from '../../core/types';

/**
 * Firma katalogları IndexedDB'de saklanır (görseller Blob olarak). Veriler bu
 * tarayıcıya aittir; başka cihaza taşımak için katalog ZIP olarak dışa aktarılır.
 * Gerçek üründe aynı arayüz bir sunucu API'siyle değiştirilebilir.
 */

export interface BrandRecord {
  id: string;
  name: string;
  note?: string;
  createdAt: string;
}

export type ProductDef = Omit<WallpaperDef, 'source' | 'brand' | 'brandId' | 'swatch'> & { swatch?: string };

export interface ProductRecord {
  id: string;
  brandId: string;
  def: ProductDef;
  image: Blob;
  createdAt: string;
}

const DB_NAME = 'wallpaper3d-catalog';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Bu tarayıcı yerel katalog depolamayı desteklemiyor.'));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('brands')) db.createObjectStore('brands', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('products')) {
        const s = db.createObjectStore('products', { keyPath: 'id' });
        s.createIndex('brandId', 'brandId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Katalog veritabanı açılamadı.'));
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req ? (req.result as T) : (undefined as T));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error('İşlem iptal edildi (depolama kotası dolmuş olabilir).'));
      }),
  );
}

export const catalogDb = {
  listBrands: () => tx<BrandRecord[]>('brands', 'readonly', (s) => s.getAll()),
  listProducts: () => tx<ProductRecord[]>('products', 'readonly', (s) => s.getAll()),
  putBrand: (b: BrandRecord) => tx<IDBValidKey>('brands', 'readwrite', (s) => s.put(b)),
  async putProducts(list: ProductRecord[]) {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('products', 'readwrite');
      const s = t.objectStore('products');
      for (const p of list) s.put(p);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error('Kayıt başarısız (depolama kotası dolmuş olabilir).'));
    });
  },
  deleteProduct: (id: string) => tx<undefined>('products', 'readwrite', (s) => s.delete(id)),
  async deleteBrand(id: string) {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(['brands', 'products'], 'readwrite');
      t.objectStore('brands').delete(id);
      const idx = t.objectStore('products').index('brandId');
      const req = idx.openCursor(IDBKeyRange.only(id));
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          c.delete();
          c.continue();
        }
      };
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },
};
