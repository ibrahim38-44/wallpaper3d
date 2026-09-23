import type { WallpaperDef } from '../core/types';

/**
 * Katalog sağlayıcı arayüzü. Gerçek üründe katalog bir API'den (ürün/stok sistemi)
 * gelir: `VITE_WALLPAPER_CATALOG_URL` tanımlıysa RemoteCatalogProvider kullanılır.
 * Beklenen JSON: WallpaperDef[] (source.type = 'image', url = desen karosu görseli).
 */
export interface WallpaperCatalogProvider {
  list(): Promise<WallpaperDef[]>;
}

const ROLL = { rollWidthCm: 53, rollLengthCm: 1005 };
const WIDE = { rollWidthCm: 106, rollLengthCm: 1005 };

const proc = (generator: string, params: Record<string, unknown> = {}) => ({ type: 'procedural' as const, generator, params });

export const LOCAL_WALLPAPERS: WallpaperDef[] = [
  {
    id: 'wp-damask-navy', name: 'Versailles Damask', collection: 'Klasik', sku: 'KL-1021',
    tileWidthCm: 53, tileHeightCm: 64, ...ROLL, patternRepeatCm: 64, match: 'offset', finish: 'satin',
    pricePerRoll: 1450, currency: 'TRY', swatch: '#2f3b4a', source: proc('damask', { bg: '#2f3b4a', fg: '#c8b27d' }),
  },
  {
    id: 'wp-damask-cream', name: 'Versailles Damask – Krem', collection: 'Klasik', sku: 'KL-1022',
    tileWidthCm: 53, tileHeightCm: 64, ...ROLL, patternRepeatCm: 64, match: 'offset', finish: 'satin',
    pricePerRoll: 1450, currency: 'TRY', swatch: '#efe7d8', source: proc('damask', { bg: '#efe7d8', fg: '#d6c6a4' }),
  },
  {
    id: 'wp-stripe-sand', name: 'Riviera Çizgi', collection: 'Klasik', sku: 'KL-2040',
    tileWidthCm: 26.5, tileHeightCm: 26.5, ...ROLL, patternRepeatCm: 0, match: 'free', finish: 'matte',
    pricePerRoll: 990, currency: 'TRY', swatch: '#d5c8b0', source: proc('stripes', { colors: ['#ece5d7', '#d5c8b0'], widths: [0.6, 0.4], pinstripe: '#bfae8e' }),
  },
  {
    id: 'wp-stripe-sage', name: 'Riviera Çizgi – Adaçayı', collection: 'Klasik', sku: 'KL-2041',
    tileWidthCm: 17.6, tileHeightCm: 17.6, ...ROLL, patternRepeatCm: 0, match: 'free', finish: 'matte',
    pricePerRoll: 990, currency: 'TRY', swatch: '#9fb09a', source: proc('stripes', { colors: ['#e7ebe3', '#9fb09a'], widths: [0.5, 0.5] }),
  },
  {
    id: 'wp-botanical', name: 'Monstera Bahçe', collection: 'Doğa', sku: 'DG-3100',
    tileWidthCm: 53, tileHeightCm: 53, ...ROLL, patternRepeatCm: 53, match: 'straight', finish: 'matte',
    pricePerRoll: 1290, currency: 'TRY', swatch: '#5e7d5a', source: proc('botanical', { bg: '#e8efe6', count: 30, seed: 42 }),
  },
  {
    id: 'wp-botanical-dark', name: 'Gece Ormanı', collection: 'Doğa', sku: 'DG-3101',
    tileWidthCm: 53, tileHeightCm: 53, ...ROLL, patternRepeatCm: 53, match: 'straight', finish: 'matte',
    pricePerRoll: 1290, currency: 'TRY', swatch: '#1f2d27', source: proc('botanical', { bg: '#1f2d27', leaves: ['#3d6b52', '#5b8a66', '#2a4a3a', '#c9a55c'], count: 34, seed: 7 }),
  },
  {
    id: 'wp-hex-gold', name: 'Petek Altın', collection: 'Geometrik', sku: 'GM-4200',
    tileWidthCm: 30, tileHeightCm: 17.32, ...ROLL, patternRepeatCm: 17.32, match: 'straight', finish: 'satin',
    pricePerRoll: 1150, currency: 'TRY', swatch: '#b8a27a', source: proc('hexagon', { bg: '#f1ede6', line: '#b8a27a' }),
  },
  {
    id: 'wp-scallop', name: 'Art Deco Yelpaze', collection: 'Geometrik', sku: 'GM-4300',
    tileWidthCm: 24, tileHeightCm: 24, ...ROLL, patternRepeatCm: 24, match: 'straight', finish: 'satin',
    pricePerRoll: 1350, currency: 'TRY', swatch: '#1f3a3a', source: proc('scallop', { bg: '#1f3a3a', fg: '#d4b877' }),
  },
  {
    id: 'wp-trellis', name: 'Kafes Ogee', collection: 'Geometrik', sku: 'GM-4400',
    tileWidthCm: 26.5, tileHeightCm: 32, ...ROLL, patternRepeatCm: 32, match: 'straight', finish: 'matte',
    pricePerRoll: 1090, currency: 'TRY', swatch: '#8fa3a8', source: proc('trellis', { bg: '#f3efe8', fg: '#8fa3a8' }),
  },
  {
    id: 'wp-herringbone', name: 'Balıksırtı Keten', collection: 'Geometrik', sku: 'GM-4500',
    tileWidthCm: 20, tileHeightCm: 40, ...ROLL, patternRepeatCm: 40, match: 'straight', finish: 'textured',
    pricePerRoll: 1190, currency: 'TRY', swatch: '#d2cabb', source: proc('herringbone', { rows: 4 }),
  },
  {
    id: 'wp-polka', name: 'Pastel Puantiye', collection: 'Çocuk', sku: 'CC-5100',
    tileWidthCm: 12, tileHeightCm: 12, ...ROLL, patternRepeatCm: 12, match: 'offset', finish: 'matte',
    pricePerRoll: 890, currency: 'TRY', swatch: '#d19a8a', source: proc('polka', { bg: '#f6efe4', fg: '#d19a8a', radius: 0.12 }),
  },
  {
    id: 'wp-plaid', name: 'İskoç Ekose', collection: 'Klasik', sku: 'KL-2200',
    tileWidthCm: 26.5, tileHeightCm: 26.5, ...ROLL, patternRepeatCm: 26.5, match: 'straight', finish: 'textured',
    pricePerRoll: 1250, currency: 'TRY', swatch: '#27384a', source: proc('plaid'),
  },
  {
    id: 'wp-linen', name: 'Doğal Keten', collection: 'Doku', sku: 'DK-6000',
    tileWidthCm: 53, tileHeightCm: 53, ...ROLL, patternRepeatCm: 0, match: 'free', finish: 'textured',
    pricePerRoll: 1050, currency: 'TRY', swatch: '#cfc5b4', source: proc('linen', { color: '#cfc5b4' }),
  },
  {
    id: 'wp-linen-grey', name: 'Doğal Keten – Gri', collection: 'Doku', sku: 'DK-6001',
    tileWidthCm: 53, tileHeightCm: 53, ...ROLL, patternRepeatCm: 0, match: 'free', finish: 'textured',
    pricePerRoll: 1050, currency: 'TRY', swatch: '#9fa3a6', source: proc('linen', { color: '#a4a7aa' }),
  },
  {
    id: 'wp-concrete', name: 'Loft Beton', collection: 'Doku', sku: 'DK-6100',
    tileWidthCm: 106, tileHeightCm: 106, ...WIDE, patternRepeatCm: 0, match: 'free', finish: 'matte',
    pricePerRoll: 2100, currency: 'TRY', swatch: '#a9a6a0', source: proc('concrete', { color: '#a9a6a0' }),
  },
  {
    id: 'wp-marble', name: 'Carrara Mermer', collection: 'Doku', sku: 'DK-6200',
    tileWidthCm: 106, tileHeightCm: 106, ...WIDE, patternRepeatCm: 106, match: 'straight', finish: 'satin',
    pricePerRoll: 2350, currency: 'TRY', swatch: '#e9e7e3', source: proc('marble', { color: '#f0eeea', vein: '#8d8a86' }),
  },
  {
    id: 'wp-brick', name: 'Eskitme Tuğla', collection: 'Doku', sku: 'DK-6300',
    tileWidthCm: 50, tileHeightCm: 52, ...ROLL, patternRepeatCm: 52, match: 'straight', finish: 'textured',
    pricePerRoll: 1390, currency: 'TRY', swatch: '#9c5b44', source: proc('brick', { rows: 8, cols: 2 }),
  },
  {
    id: 'wp-wood', name: 'Ahşap Lambiri', collection: 'Doku', sku: 'DK-6400',
    tileWidthCm: 53, tileHeightCm: 100, ...ROLL, patternRepeatCm: 100, match: 'straight', finish: 'matte',
    pricePerRoll: 1490, currency: 'TRY', swatch: '#9b7653', source: proc('woodPanel', { color: '#9b7653', planks: 4 }),
  },
  {
    id: 'wp-terrazzo', name: 'Terrazzo', collection: 'Modern', sku: 'MD-7100',
    tileWidthCm: 53, tileHeightCm: 53, ...ROLL, patternRepeatCm: 53, match: 'straight', finish: 'matte',
    pricePerRoll: 1190, currency: 'TRY', swatch: '#efe9e1', source: proc('terrazzo'),
  },
];

export class LocalCatalogProvider implements WallpaperCatalogProvider {
  async list() {
    return LOCAL_WALLPAPERS;
  }
}

export class RemoteCatalogProvider implements WallpaperCatalogProvider {
  constructor(private url: string) {}
  async list(): Promise<WallpaperDef[]> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`Katalog alınamadı (${res.status})`);
    const data = (await res.json()) as WallpaperDef[];
    return data.filter((d) => d && d.id && d.tileWidthCm > 0 && d.tileHeightCm > 0 && d.source);
  }
}

export function createCatalogProvider(): WallpaperCatalogProvider {
  const url = import.meta.env.VITE_WALLPAPER_CATALOG_URL as string | undefined;
  return url ? new RemoteCatalogProvider(url) : new LocalCatalogProvider();
}

/** Özel yüklenen görselden katalog kaydı oluşturur. */
export function createCustomWallpaper(opts: { id: string; name: string; dataUrl: string; tileWidthCm: number; aspect: number }): WallpaperDef {
  const tileHeightCm = Math.round((opts.tileWidthCm / opts.aspect) * 10) / 10;
  return {
    id: opts.id,
    name: opts.name,
    collection: 'Yüklenenler',
    tileWidthCm: opts.tileWidthCm,
    tileHeightCm,
    ...ROLL,
    patternRepeatCm: tileHeightCm,
    match: 'straight',
    finish: 'matte',
    swatch: '#cccccc',
    source: { type: 'image', url: opts.dataUrl },
  };
}
