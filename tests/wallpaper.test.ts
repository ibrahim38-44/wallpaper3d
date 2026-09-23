import { describe, expect, it } from 'vitest';
import { LOCAL_WALLPAPERS } from '../src/catalog/wallpapers';
import { computeWalls } from '../src/core/geometry';
import { createRoom } from '../src/core/project';
import type { OpeningItem } from '../src/core/types';
import { buildQuote, estimateRolls } from '../src/core/wallpaperMath';

const std = { rollWidthCm: 53, rollLengthCm: 1005, patternRepeatCm: 64, match: 'straight' as const };

describe('estimateRolls', () => {
  it('400 cm × 260 cm duvar, 64 cm rapor', () => {
    const r = estimateRolls({ wallWidthCm: 400, wallHeightCm: 260, openingsAreaCm2: 0 }, std);
    // şerit boyu 260+64+10 = 334 → ruloda 3 şerit; 400/53 → 8 şerit → 3 rulo
    expect(r.stripLengthCm).toBe(334);
    expect(r.stripsPerRoll).toBe(3);
    expect(r.strips).toBe(8);
    expect(r.rolls).toBe(3);
    expect(r.grossAreaM2).toBeCloseTo(10.4);
  });
  it('serbest eşleşmede rapor eklenmez', () => {
    const r = estimateRolls({ wallWidthCm: 400, wallHeightCm: 260, openingsAreaCm2: 0 }, { ...std, match: 'free' });
    expect(r.stripLengthCm).toBe(270);
  });
  it('büyük açıklıklar şerit sayısını azaltır', () => {
    const r = estimateRolls({ wallWidthCm: 400, wallHeightCm: 260, openingsAreaCm2: 150 * 220 }, std);
    expect(r.strips).toBe(6);
    expect(r.netAreaM2).toBeCloseTo(10.4 - 3.3);
  });
});

describe('buildQuote', () => {
  it('aynı desen farklı duvarlarda birleştirilir', () => {
    const room = createRoom({ width: 400, length: 500, height: 260 });
    const walls = computeWalls(room);
    const wp = LOCAL_WALLPAPERS[0];
    const lines = buildQuote(walls, [{ wallIndex: 0, wallpaper: wp }, { wallIndex: 2, wallpaper: wp }], [] as OpeningItem[], 260);
    expect(lines).toHaveLength(1);
    expect(lines[0].walls).toEqual([0, 2]);
    expect(lines[0].rolls).toBe(6); // 16 şerit / 3
    expect(lines[0].total).toBe(6 * (wp.pricePerRoll ?? 0));
  });
});

describe('katalog bütünlüğü', () => {
  it('tüm desenlerin ölçüleri pozitif ve kimlikleri benzersiz', () => {
    const ids = new Set<string>();
    for (const w of LOCAL_WALLPAPERS) {
      expect(w.tileWidthCm).toBeGreaterThan(0);
      expect(w.tileHeightCm).toBeGreaterThan(0);
      expect(ids.has(w.id)).toBe(false);
      ids.add(w.id);
    }
  });
});
