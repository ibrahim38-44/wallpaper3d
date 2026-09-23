import { describe, expect, it } from 'vitest';
import { parseCsv, parseNumber, rowsToCatalog, templateCsv } from '../src/catalog/library/csv';
import { buildProducts, collectFiles, DEFAULT_IMPORT, planImport } from '../src/catalog/library/importers';
import { readZip, writeZip } from '../src/catalog/library/zip';
import { adjacentOrigin, foreignHolesForWall, houseBounds, roomsOverlap } from '../src/core/house';
import { createRoomDoc } from '../src/core/project';
import type { OpeningItem } from '../src/core/types';

describe('ev geometrisi', () => {
  const a = createRoomDoc({ width: 400, length: 500, height: 260 });
  it('yan oda konumu (ortak duvar tek kalınlık)', () => {
    expect(adjacentOrigin(a, { width: 300, length: 350 }, 'right')).toEqual({ x: 412, z: 0 });
    expect(adjacentOrigin(a, { width: 300, length: 350 }, 'left')).toEqual({ x: -312, z: 0 });
    expect(adjacentOrigin(a, { width: 300, length: 350 }, 'back')).toEqual({ x: 0, z: -362 });
    expect(adjacentOrigin(a, { width: 300, length: 350 }, 'front')).toEqual({ x: 0, z: 512 });
    expect(adjacentOrigin(a, { width: 300, length: 350 }, 'right', 'center')).toEqual({ x: 412, z: 75 });
  });
  it('sınır kutusu ve çakışma', () => {
    const b = createRoomDoc({ width: 300, length: 350, height: 260 }, { x: 412, z: 0 });
    const hb = houseBounds([a, b]);
    expect(hb.minX).toBe(-12);
    expect(hb.maxX).toBe(724);
    expect(roomsOverlap(a, b)).toBe(false);
    const c = createRoomDoc({ width: 300, length: 350, height: 260 }, { x: 200, z: 100 });
    expect(roomsOverlap(a, c)).toBe(true);
  });
  it('ortak duvardaki kapı komşu duvarı da deler', () => {
    const b = createRoomDoc({ width: 300, length: 500, height: 260 }, { x: 412, z: 0 });
    const door: OpeningItem = { id: 'd1', kind: 'opening', catalogId: 'door', wallIndex: 1, offset: 100, elevation: 0, size: { w: 90, d: 12, h: 210 } };
    const a2 = { ...a, items: [door] };
    // B'nin sol duvarı (indeks 3) z=L→0 yönünde; A'da z=100 → B'de u = 500-100 = 400
    const holes = foreignHolesForWall([a2, b], 1, 3);
    expect(holes).toHaveLength(1);
    expect(holes[0].offset).toBeCloseTo(400);
    expect(holes[0].size.w).toBe(90);
    // alakasız duvarda delik yok
    expect(foreignHolesForWall([a2, b], 1, 0)).toHaveLength(0);
  });
});

describe('katalog CSV', () => {
  it('Türkçe başlıkları, ; ayırıcıyı ve ondalık virgülü okur', () => {
    const { rows, unknownHeaders } = rowsToCatalog(parseCsv(templateCsv()));
    expect(unknownHeaders).toEqual([]);
    expect(rows[0]).toMatchObject({ sku: 'KL-1021', name: 'Versailles Damask', tileWidthCm: 53, tileHeightCm: 64, rollLengthCm: 1005, match: 'offset', price: 1450, finish: 'satin', image: 'KL-1021.jpg' });
  });
  it('tırnak içi ayırıcı ve farklı başlık adları', () => {
    const csv = 'Ürün Kodu,Ürün Adı,Fiyat,Resim\nA1,"Çiçek, Mavi","1.250,50",a1.png\n';
    const { rows } = rowsToCatalog(parseCsv(csv));
    expect(rows[0]).toMatchObject({ sku: 'A1', name: 'Çiçek, Mavi', price: 1250.5, image: 'a1.png' });
  });
  it('sayı ayrıştırma', () => {
    expect(parseNumber('₺1.450')).toBe(1450);
    expect(parseNumber('10,05')).toBe(10.05);
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('')).toBeUndefined();
  });
});

describe('ZIP ve içe aktarma', () => {
  const img = (n: number) => new Uint8Array([0xff, 0xd8, n, 1, 2, 3]);
  it('yazılan ZIP geri okunur', async () => {
    const zip = writeZip([{ name: 'katalog.csv', data: new TextEncoder().encode('a;b') }, { name: 'gorseller/Ç-1.jpg', data: img(1) }]);
    const entries = await readZip(await zip.arrayBuffer());
    expect(entries.map((e) => e.name)).toEqual(['katalog.csv', 'gorseller/Ç-1.jpg']);
    expect(Array.from(entries[1].data)).toEqual(Array.from(img(1)));
  });
  it('ZIP içindeki CSV satırlarını görsellerle eşleştirir', async () => {
    const csv = 'kod;ad;desen_genislik_cm;gorsel\nK1;Bir;53;K1.jpg\nK2;İki;106;\nK3;Üç;53;yok.jpg\n';
    const zip = writeZip([
      { name: 'katalog.csv', data: new TextEncoder().encode(csv) },
      { name: 'g/K1.jpg', data: img(1) },
      { name: 'g/K2.JPG', data: img(2) },
      { name: 'g/fazla.png', data: img(3) },
    ]);
    const col = await collectFiles([{ name: 'firma.zip', blob: zip }]);
    expect(col.images).toHaveLength(3);
    const plan = planImport(col.images, col.rows);
    expect(plan.items.map((i) => i.row.sku)).toEqual(['K1', 'K2']);
    expect(plan.missingImages).toEqual(['Üç']);
    expect(plan.unusedImages).toEqual(['fazla.png']);
    const fake = async (b: Blob) => ({ blob: b, width: 530, height: 640, swatch: '#aabbcc' });
    const { products } = await buildProducts(plan, 'brand1', { ...DEFAULT_IMPORT, price: 999 }, fake);
    expect(products[0].def).toMatchObject({ name: 'Bir', tileWidthCm: 53, tileHeightCm: 64, patternRepeatCm: 64, pricePerRoll: 999 });
    expect(products[1].def.tileWidthCm).toBe(106);
    expect(products[1].def.tileHeightCm).toBeCloseTo(128);
  });
  it('CSV olmadan her görsel bir ürün olur', () => {
    const plan = planImport([{ name: 'KL-2040_riviera_cizgi.jpg', blob: new Blob([img(1)]) }], null);
    expect(plan.items[0].row).toEqual({ name: 'KL-2040 riviera cizgi', sku: 'KL-2040_riviera_cizgi' });
  });
});
