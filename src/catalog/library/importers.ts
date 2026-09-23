import { uid } from '../../core/project';
import type { WallpaperDef } from '../../core/types';
import { catalogToCsv, parseCsv, rowsToCatalog, type CatalogRow } from './csv';
import type { ProductRecord } from './db';
import { readZip, writeZip } from './zip';

export interface ImportFile {
  name: string;
  blob: Blob;
}

export interface ImportDefaults {
  collection: string;
  tileWidthCm: number;
  rollWidthCm: number;
  rollLengthCm: number;
  /** 0 = desen yüksekliği kadar (otomatik) */
  patternRepeatCm: number;
  match: WallpaperDef['match'];
  finish: WallpaperDef['finish'];
  price?: number;
  currency: string;
}

export const DEFAULT_IMPORT: ImportDefaults = {
  collection: '',
  tileWidthCm: 53,
  rollWidthCm: 53,
  rollLengthCm: 1005,
  patternRepeatCm: 0,
  match: 'straight',
  finish: 'matte',
  currency: 'TRY',
};

const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif' };

export const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;
export const stem = (path: string) => baseName(path).replace(/\.[^.]+$/, '');
const keyOf = (s: string) => stem(s).toLocaleLowerCase('tr').trim();

/** "KL-1021_versailles_damask.jpg" → "KL 1021 versailles damask" */
export function nameFromFile(file: string): string {
  return stem(file).replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface CollectedFiles {
  images: ImportFile[];
  rows: CatalogRow[] | null;
  unknownHeaders: string[];
}

/** Seçilen dosyaları (görseller, CSV, JSON, ZIP) tek listede toplar; ZIP'ler açılır. */
export async function collectFiles(files: File[] | ImportFile[]): Promise<CollectedFiles> {
  const images: ImportFile[] = [];
  let rows: CatalogRow[] | null = null;
  let unknownHeaders: string[] = [];
  const addText = async (name: string, text: string) => {
    if (/\.json$/i.test(name)) {
      const parsed = JSON.parse(text) as unknown;
      const list = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown[] }).items ?? [];
      rows = [...(rows ?? []), ...(await jsonToRows(list as Partial<WallpaperDef>[], images))];
    } else {
      const res = rowsToCatalog(parseCsv(text));
      rows = [...(rows ?? []), ...res.rows];
      unknownHeaders = res.unknownHeaders;
    }
  };
  for (const f of files) {
    const name = 'blob' in f ? f.name : f.name;
    const blob = 'blob' in f ? f.blob : f;
    if (/\.zip$/i.test(name)) {
      const entries = await readZip(await blob.arrayBuffer());
      for (const e of entries) {
        if (baseName(e.name).startsWith('.') || e.name.includes('__MACOSX')) continue;
        const ext = e.name.split('.').pop()?.toLowerCase() ?? '';
        if (IMAGE_RE.test(e.name)) images.push({ name: e.name, blob: new Blob([e.data as BlobPart], { type: MIME[ext] }) });
        else if (/\.(csv|txt|tsv|json)$/i.test(e.name)) await addText(e.name, new TextDecoder('utf-8').decode(e.data));
      }
    } else if (IMAGE_RE.test(name) || blob.type.startsWith('image/')) images.push({ name, blob });
    else if (/\.(csv|txt|tsv|json)$/i.test(name)) await addText(name, await blob.text());
  }
  return { images, rows, unknownHeaders };
}

/** JSON katalog (WallpaperDef[] biçimi) → satırlar; görsel URL'leri indirilir. */
async function jsonToRows(list: Partial<WallpaperDef>[], images: ImportFile[]): Promise<CatalogRow[]> {
  const out: CatalogRow[] = [];
  for (const d of list) {
    if (!d || !d.source || d.source.type !== 'image') continue;
    const imgName = `${d.id ?? uid('img')}.img`;
    try {
      const blob = await (await fetch(d.source.url)).blob();
      images.push({ name: imgName, blob });
    } catch {
      continue;
    }
    out.push({
      sku: d.sku, name: d.name, collection: d.collection, tileWidthCm: d.tileWidthCm, tileHeightCm: d.tileHeightCm,
      rollWidthCm: d.rollWidthCm, rollLengthCm: d.rollLengthCm, patternRepeatCm: d.patternRepeatCm, match: d.match,
      price: d.pricePerRoll, currency: d.currency, finish: d.finish, image: imgName,
    });
  }
  return out;
}

export interface ImportPlanItem {
  row: CatalogRow;
  image: ImportFile;
}

export interface ImportPlan {
  items: ImportPlanItem[];
  /** CSV'de olup görseli bulunamayan satırlar */
  missingImages: string[];
  /** CSV varken hiçbir satırla eşleşmeyen görseller */
  unusedImages: string[];
}

/** CSV satırlarını görsellerle eşleştirir; CSV yoksa her görsel bir ürün olur. */
export function planImport(images: ImportFile[], rows: CatalogRow[] | null): ImportPlan {
  if (!rows || rows.length === 0) {
    return { items: images.map((image) => ({ row: { name: nameFromFile(image.name), sku: stem(image.name) }, image })), missingImages: [], unusedImages: [] };
  }
  const byKey = new Map<string, ImportFile>();
  for (const im of images) byKey.set(keyOf(im.name), im);
  const used = new Set<ImportFile>();
  const items: ImportPlanItem[] = [];
  const missing: string[] = [];
  for (const row of rows) {
    const candidates = [row.image, row.sku, row.name].filter((x): x is string => !!x).map(keyOf);
    const image = candidates.map((k) => byKey.get(k)).find(Boolean);
    if (image) {
      items.push({ row, image });
      used.add(image);
    } else missing.push(row.name ?? row.sku ?? row.image ?? '?');
  }
  return { items, missingImages: missing, unusedImages: images.filter((i) => !used.has(i)).map((i) => baseName(i.name)) };
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  swatch: string;
}

/** Görseli küçültür (en fazla maxDim px, JPEG) ve baskın rengini çıkarır – tarayıcıda çalışır. */
export async function processImage(blob: Blob, maxDim = 1600): Promise<ProcessedImage> {
  const bmp = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const s = document.createElement('canvas');
    s.width = s.height = 1;
    const sctx = s.getContext('2d')!;
    sctx.drawImage(c, 0, 0, 1, 1);
    const [r, g, b] = sctx.getImageData(0, 0, 1, 1).data;
    const swatch = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    const out = await new Promise<Blob>((res, rej) => c.toBlob((bl) => (bl ? res(bl) : rej(new Error('Görsel dönüştürülemedi'))), 'image/jpeg', 0.9));
    return { blob: out, width: bmp.width, height: bmp.height, swatch };
  } finally {
    bmp.close();
  }
}

/** Plan + varsayılanlar → veritabanına yazılacak ürün kayıtları. */
export async function buildProducts(
  plan: ImportPlan,
  brandId: string,
  defaults: ImportDefaults,
  process: (b: Blob) => Promise<ProcessedImage> = processImage,
  onProgress?: (done: number, total: number) => void,
): Promise<{ products: ProductRecord[]; failed: string[] }> {
  const products: ProductRecord[] = [];
  const failed: string[] = [];
  let done = 0;
  for (const { row, image } of plan.items) {
    try {
      const img = await process(image.blob);
      const tileWidthCm = row.tileWidthCm ?? defaults.tileWidthCm;
      const tileHeightCm = row.tileHeightCm ?? Math.round((tileWidthCm * img.height) / img.width * 10) / 10;
      const match = row.match ?? defaults.match;
      const repeat = match === 'free' ? 0 : row.patternRepeatCm ?? (defaults.patternRepeatCm || tileHeightCm);
      const id = uid('wpf');
      products.push({
        id,
        brandId,
        createdAt: new Date().toISOString(),
        image: img.blob,
        def: {
          id,
          name: row.name || nameFromFile(image.name),
          collection: row.collection || defaults.collection || 'Genel',
          sku: row.sku,
          tileWidthCm,
          tileHeightCm,
          rollWidthCm: row.rollWidthCm ?? defaults.rollWidthCm,
          rollLengthCm: row.rollLengthCm ?? defaults.rollLengthCm,
          patternRepeatCm: repeat,
          match,
          finish: row.finish ?? defaults.finish,
          pricePerRoll: row.price ?? defaults.price,
          currency: row.currency ?? defaults.currency,
          swatch: img.swatch,
        },
      });
    } catch {
      failed.push(baseName(image.name));
    }
    onProgress?.(++done, plan.items.length);
  }
  return { products, failed };
}

/** Firma kataloğunu ZIP (katalog.csv + görseller) olarak paketler; tekrar içe aktarılabilir. */
export async function exportBrandZip(products: ProductRecord[]): Promise<Blob> {
  const entries: { name: string; data: Uint8Array }[] = [];
  const rows: { def: WallpaperDef; imageName: string }[] = [];
  const used = new Set<string>();
  for (const p of products) {
    let base = (p.def.sku || p.def.name || p.id).replace(/[^\p{L}\p{N}._-]+/gu, '_');
    while (used.has(base)) base += '_';
    used.add(base);
    const imageName = `gorseller/${base}.jpg`;
    entries.push({ name: imageName, data: new Uint8Array(await p.image.arrayBuffer()) });
    rows.push({ def: { ...p.def, swatch: p.def.swatch ?? '#cccccc', source: { type: 'image', url: '' } }, imageName: `${base}.jpg` });
  }
  entries.unshift({ name: 'katalog.csv', data: new TextEncoder().encode(catalogToCsv(rows)) });
  return writeZip(entries);
}
