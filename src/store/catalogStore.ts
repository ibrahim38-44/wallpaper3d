import { useMemo } from 'react';
import { create } from 'zustand';
import { createCatalogProvider } from '../catalog/wallpapers';
import type { WallpaperDef } from '../core/types';
import { useEditor } from './editorStore';
import { useLibrary } from './libraryStore';

interface CatalogState {
  wallpapers: WallpaperDef[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  load(): Promise<void>;
}

/** Yerleşik (demo) veya uzak (VITE_WALLPAPER_CATALOG_URL) katalog. */
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

/**
 * Kullanılabilir tüm desenler: projeye özel yüklenenler + firma katalogları
 * (+ ayar açıksa demo katalog). Sahnede kaplama çözümlemesi için demo katalog
 * her zaman dahildir (daha önce uygulanmış demo desenler kaybolmasın diye);
 * katalog listesinde gösterim `useVisibleWallpapers` ile filtrelenir.
 */
export function useAllWallpapers(): WallpaperDef[] {
  const catalog = useCatalog((s) => s.wallpapers);
  const library = useLibrary((s) => s.wallpapers);
  const custom = useEditor((s) => s.project?.customWallpapers);
  return useMemo(() => [...(custom ?? []), ...library, ...catalog], [custom, library, catalog]);
}

/** Katalog panelinde listelenecek desenler. */
export function useVisibleWallpapers(): WallpaperDef[] {
  const catalog = useCatalog((s) => s.wallpapers);
  const library = useLibrary((s) => s.wallpapers);
  const showDemo = useLibrary((s) => s.showDemo);
  const custom = useEditor((s) => s.project?.customWallpapers);
  return useMemo(() => [...(custom ?? []), ...library, ...(showDemo ? catalog : [])], [custom, library, catalog, showDemo]);
}

export function findWallpaper(id: string, all: WallpaperDef[]): WallpaperDef | undefined {
  return all.find((w) => w.id === id);
}
