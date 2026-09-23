import type { WallpaperDef } from '../../core/types';

/**
 * Firma kataloğu CSV biçimi (Excel'de "CSV UTF-8" olarak kaydedilebilir).
 * Ayırıcı otomatik algılanır (; , veya sekme). Başlıklar Türkçe/İngilizce olabilir:
 *
 *   kod; ad; koleksiyon; desen_genislik_cm; desen_yukseklik_cm; rulo_en_cm; rulo_boy_m;
 *   rapor_cm; eslesme; fiyat; para_birimi; yuzey; gorsel
 *
 * Yalnızca `gorsel` (veya görsel dosya adı = kod) ve `ad` zorunludur; diğerleri
 * boşsa varsayılanlar kullanılır.
 */

export interface CatalogRow {
  sku?: string;
  name?: string;
  collection?: string;
  tileWidthCm?: number;
  tileHeightCm?: number;
  rollWidthCm?: number;
  rollLengthCm?: number;
  patternRepeatCm?: number;
  match?: WallpaperDef['match'];
  price?: number;
  currency?: string;
  finish?: WallpaperDef['finish'];
  image?: string;
}

export function normalizeKey(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

const ALIASES: Record<keyof CatalogRow, string[]> = {
  sku: ['kod', 'urunkodu', 'stokkodu', 'sku', 'code', 'artikel', 'refno', 'referans'],
  name: ['ad', 'adi', 'isim', 'urunadi', 'urun', 'name', 'desenadi', 'model'],
  collection: ['koleksiyon', 'seri', 'katalog', 'collection', 'kategori'],
  tileWidthCm: ['desengenislikcm', 'desengenislik', 'desenen', 'desenencm', 'karoen', 'karogenislik', 'tilewidth', 'tilewidthcm', 'patternwidth'],
  tileHeightCm: ['desenyukseklikcm', 'desenyukseklik', 'desenboy', 'desenboycm', 'karoboy', 'karoyukseklik', 'tileheight', 'tileheightcm', 'patternheight'],
  rollWidthCm: ['ruloencm', 'ruloen', 'rulogenislik', 'rollwidth', 'rollwidthcm', 'en'],
  rollLengthCm: ['ruloboym', 'ruloboy', 'ruloboycm', 'rulouzunluk', 'rolllength', 'rolllengthm', 'boy'],
  patternRepeatCm: ['raporcm', 'rapor', 'desenraporu', 'repeat', 'patternrepeat', 'tekrar'],
  match: ['eslesme', 'eslesmetipi', 'match', 'matchtype'],
  price: ['fiyat', 'rulofiyati', 'satisfiyati', 'price', 'birimfiyat'],
  currency: ['parabirimi', 'doviz', 'currency', 'kur'],
  finish: ['yuzey', 'doku', 'finish', 'kaplama'],
  image: ['gorsel', 'resim', 'foto', 'dosya', 'dosyaadi', 'image', 'file', 'filename', 'img'],
};

const KEY_LOOKUP = new Map<string, keyof CatalogRow>();
for (const [k, list] of Object.entries(ALIASES)) for (const a of list) KEY_LOOKUP.set(a, k as keyof CatalogRow);

/** RFC 4180 uyumlu CSV ayrıştırma (tırnak içi ayırıcı/yeni satır desteklenir). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const counts = [';', ',', '\t'].map((d) => ({ d, n: firstLine.split(d).length }));
  const delim = counts.sort((a, b) => b.n - a.n)[0].d;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "1.450,50" / "1450.5" / "₺1.450" → 1450.5 */
export function parseNumber(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  let s = v.trim().replace(/[^\d.,-]/g, '');
  if (!s) return undefined;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // "1.450" → 1450 (Türkçe binlik ayırıcı)
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseMatch(v?: string): WallpaperDef['match'] | undefined {
  if (!v) return undefined;
  const k = normalizeKey(v);
  if (/^(duz|straight|dogrudan|yanyana)/.test(k)) return 'straight';
  if (/^(kaydir|offset|yarim|halfdrop|kayik|atlamali)/.test(k)) return 'offset';
  if (/^(serbest|free|random|yok)/.test(k)) return 'free';
  return undefined;
}

function parseFinish(v?: string): WallpaperDef['finish'] | undefined {
  if (!v) return undefined;
  const k = normalizeKey(v);
  if (k.startsWith('sat') || k.startsWith('parlak') || k.startsWith('ipek')) return 'satin';
  if (k.startsWith('dok') || k.startsWith('text') || k.startsWith('kabart') || k.startsWith('vinil')) return 'textured';
  if (k.startsWith('mat')) return 'matte';
  return undefined;
}

export function rowsToCatalog(rows: string[][]): { rows: CatalogRow[]; unknownHeaders: string[] } {
  if (rows.length < 2) return { rows: [], unknownHeaders: [] };
  const headers = rows[0].map((h) => KEY_LOOKUP.get(normalizeKey(h)));
  const unknownHeaders = rows[0].filter((_, i) => !headers[i]).map((h) => h.trim()).filter(Boolean);
  const out: CatalogRow[] = [];
  for (const r of rows.slice(1)) {
    const rec: Record<string, string> = {};
    headers.forEach((k, i) => {
      if (k && r[i] != null && r[i].trim() !== '') rec[k] = r[i].trim();
    });
    if (!rec.name && !rec.sku && !rec.image) continue;
    let rollLength = parseNumber(rec.rollLengthCm);
    if (rollLength != null && rollLength < 60) rollLength = Math.round(rollLength * 1000) / 10; // metre yazılmışsa
    out.push({
      sku: rec.sku,
      name: rec.name,
      collection: rec.collection,
      tileWidthCm: parseNumber(rec.tileWidthCm),
      tileHeightCm: parseNumber(rec.tileHeightCm),
      rollWidthCm: parseNumber(rec.rollWidthCm),
      rollLengthCm: rollLength,
      patternRepeatCm: parseNumber(rec.patternRepeatCm),
      match: parseMatch(rec.match),
      price: parseNumber(rec.price),
      currency: rec.currency?.toUpperCase().replace('TL', 'TRY').replace('₺', 'TRY'),
      finish: parseFinish(rec.finish),
      image: rec.image,
    });
  }
  return { rows: out, unknownHeaders };
}

const CSV_HEADERS = ['kod', 'ad', 'koleksiyon', 'desen_genislik_cm', 'desen_yukseklik_cm', 'rulo_en_cm', 'rulo_boy_m', 'rapor_cm', 'eslesme', 'fiyat', 'para_birimi', 'yuzey', 'gorsel'];
const MATCH_TR = { straight: 'düz', offset: 'kaydırmalı', free: 'serbest' } as const;
const FINISH_TR = { matte: 'mat', satin: 'saten', textured: 'dokulu' } as const;

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function catalogToCsv(items: { def: WallpaperDef; imageName: string }[]): string {
  const lines = [CSV_HEADERS.join(';')];
  for (const { def, imageName } of items) {
    lines.push(
      [
        def.sku, def.name, def.collection, def.tileWidthCm, def.tileHeightCm, def.rollWidthCm, (def.rollLengthCm / 100).toString().replace('.', ','),
        def.patternRepeatCm, MATCH_TR[def.match], def.pricePerRoll ?? '', def.currency ?? '', FINISH_TR[def.finish], imageName,
      ].map(esc).join(';'),
    );
  }
  return '﻿' + lines.join('\r\n');
}

/** Boş bir şablon CSV (kullanıcıya indirilir). */
export function templateCsv(): string {
  return (
    '﻿' +
    CSV_HEADERS.join(';') +
    '\r\n' +
    ['KL-1021', 'Versailles Damask', 'Klasik', '53', '64', '53', '10,05', '64', 'kaydırmalı', '1450', 'TRY', 'saten', 'KL-1021.jpg'].join(';') +
    '\r\n'
  );
}
