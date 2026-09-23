import { create } from 'zustand';
import { catalogDb, type BrandRecord, type ProductDef, type ProductRecord } from '../catalog/library/db';
import { uid } from '../core/project';
import type { WallpaperDef } from '../core/types';

/**
 * Firma katalog kütüphanesi (tüm projelerde ortak). Ürün görselleri IndexedDB'de
 * Blob olarak durur; oturum boyunca object URL ile dokuya dönüştürülür.
 */
interface LibraryState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  brands: BrandRecord[];
  records: ProductRecord[];
  /** Sahnede/katalogda kullanılacak tanımlar (kaynak = object URL) */
  wallpapers: WallpaperDef[];
  /** Yerleşik demo desenleri göster */
  showDemo: boolean;
  load(): Promise<void>;
  addBrand(name: string): Promise<BrandRecord>;
  renameBrand(id: string, name: string): Promise<void>;
  removeBrand(id: string): Promise<void>;
  addProducts(list: ProductRecord[]): Promise<void>;
  updateProduct(id: string, patch: Partial<ProductDef>): Promise<void>;
  removeProduct(id: string): Promise<void>;
  setShowDemo(v: boolean): void;
  /** katalog yönetimi penceresi */
  managerOpen: boolean;
  setManagerOpen(v: boolean): void;
}

const SHOW_DEMO_KEY = 'wallpaper3d.showDemo';
function readShowDemo(): boolean | null {
  try {
    const v = localStorage.getItem(SHOW_DEMO_KEY);
    return v == null ? null : v === '1';
  } catch {
    return null;
  }
}

const urlCache = new Map<string, string>();
function toDef(r: ProductRecord, brands: BrandRecord[]): WallpaperDef {
  let url = urlCache.get(r.id);
  if (!url) {
    url = URL.createObjectURL(r.image);
    urlCache.set(r.id, url);
  }
  const brand = brands.find((b) => b.id === r.brandId);
  return { ...r.def, swatch: r.def.swatch ?? '#cccccc', brand: brand?.name, brandId: r.brandId, source: { type: 'image', url } };
}

export const useLibrary = create<LibraryState>()((set, get) => {
  const rebuild = (brands: BrandRecord[], records: ProductRecord[]) =>
    set({ brands, records, wallpapers: records.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((r) => toDef(r, brands)) });

  return {
    status: 'idle',
    brands: [],
    records: [],
    wallpapers: [],
    showDemo: readShowDemo() ?? true,
    managerOpen: false,
    setManagerOpen(v) {
      set({ managerOpen: v });
    },

    async load() {
      if (get().status === 'loading' || get().status === 'ready') return;
      set({ status: 'loading' });
      try {
        const [brands, records] = await Promise.all([catalogDb.listBrands(), catalogDb.listProducts()]);
        rebuild(brands.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), records);
        // Firma kataloğu varsa ve kullanıcı henüz seçim yapmadıysa demo desenleri gizle
        if (readShowDemo() == null && records.length > 0) set({ showDemo: false });
        set({ status: 'ready' });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },
    async addBrand(name) {
      const b: BrandRecord = { id: uid('brand'), name: name.trim() || 'Yeni firma', createdAt: new Date().toISOString() };
      await catalogDb.putBrand(b);
      rebuild([...get().brands, b], get().records);
      return b;
    },
    async renameBrand(id, name) {
      const b = get().brands.find((x) => x.id === id);
      if (!b) return;
      const nb = { ...b, name };
      await catalogDb.putBrand(nb);
      rebuild(get().brands.map((x) => (x.id === id ? nb : x)), get().records);
    },
    async removeBrand(id) {
      await catalogDb.deleteBrand(id);
      rebuild(get().brands.filter((b) => b.id !== id), get().records.filter((r) => r.brandId !== id));
    },
    async addProducts(list) {
      if (!list.length) return;
      await catalogDb.putProducts(list);
      rebuild(get().brands, [...get().records, ...list]);
      if (readShowDemo() == null) set({ showDemo: false });
    },
    async updateProduct(id, patch) {
      const r = get().records.find((x) => x.id === id);
      if (!r) return;
      const nr = { ...r, def: { ...r.def, ...patch } };
      await catalogDb.putProducts([nr]);
      rebuild(get().brands, get().records.map((x) => (x.id === id ? nr : x)));
    },
    async removeProduct(id) {
      await catalogDb.deleteProduct(id);
      const url = urlCache.get(id);
      if (url) URL.revokeObjectURL(url);
      urlCache.delete(id);
      rebuild(get().brands, get().records.filter((r) => r.id !== id));
    },
    setShowDemo(v) {
      try {
        localStorage.setItem(SHOW_DEMO_KEY, v ? '1' : '0');
      } catch {
        /* yoksay */
      }
      set({ showDemo: v });
    },
  };
});
