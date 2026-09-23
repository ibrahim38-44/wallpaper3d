import { create } from 'zustand';
import { createCatalogProvider } from '../catalog/wallpapers';
import type { WallpaperDef } from '../core/types';
import { useEditor } from './editorStore';

interface CatalogState {
  wallpapers: WallpaperDef[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  load(): Promise<void>;
}

export const useCatalog = create<CatalogState>()((set, get) => ({
  wallpapers: [],
  status: 'idle',
  async load() {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading' });
    try {
      const list = await createCatalogProvider().list();
      set({ wallpapers: list, status: 'ready' });
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },
}));

/** Katalog + projeye özel yüklenen desenler. */
export function useAllWallpapers(): WallpaperDef[] {
  const catalog = useCatalog((s) => s.wallpapers);
  const custom = useEditor((s) => s.project?.customWallpapers);
  return custom && custom.length ? [...custom, ...catalog] : catalog;
}

export function findWallpaper(id: string, all: WallpaperDef[]): WallpaperDef | undefined {
  return all.find((w) => w.id === id);
}
