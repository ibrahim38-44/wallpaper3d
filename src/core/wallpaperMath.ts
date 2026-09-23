import type { OpeningItem, WallInfo, WallpaperDef } from './types';

export interface WallCoverageInput {
  wallWidthCm: number;
  wallHeightCm: number;
  /** duvardaki açıklıkların toplam alanı (cm²) */
  openingsAreaCm2: number;
}

export interface RollEstimate {
  grossAreaM2: number;
  netAreaM2: number;
  strips: number;
  stripLengthCm: number;
  stripsPerRoll: number;
  rolls: number;
}

/**
 * Sektörde yaygın "şerit yöntemi" ile rulo hesabı:
 *  - Şerit boyu = duvar yüksekliği + desen raporu + 10 cm kesim payı
 *  - Ruloda çıkan şerit = floor(rulo boyu / şerit boyu)
 *  - Gereken şerit = ceil(duvar genişliği / rulo eni)
 *  - Açıklıklar (kapı/pencere) şerit sayısından yalnızca tam şerit genişliğini
 *    aşan kısmıyla düşülür (güvenli taraf).
 */
export function estimateRolls(input: WallCoverageInput, wp: Pick<WallpaperDef, 'rollWidthCm' | 'rollLengthCm' | 'patternRepeatCm' | 'match'>): RollEstimate {
  const repeat = wp.match === 'free' ? 0 : wp.patternRepeatCm;
  const trim = 10;
  const stripLength = input.wallHeightCm + repeat + trim;
  const stripsPerRoll = Math.max(1, Math.floor(wp.rollLengthCm / stripLength));
  const grossStrips = Math.ceil(input.wallWidthCm / wp.rollWidthCm);
  // Açıklık kaynaklı tasarruf: açıklık alanının karşılığı tam şerit sayısı
  const stripArea = wp.rollWidthCm * input.wallHeightCm;
  const savedStrips = stripArea > 0 ? Math.floor(input.openingsAreaCm2 / stripArea) : 0;
  const strips = Math.max(0, grossStrips - savedStrips);
  const grossArea = input.wallWidthCm * input.wallHeightCm;
  return {
    grossAreaM2: grossArea / 10000,
    netAreaM2: Math.max(0, grossArea - input.openingsAreaCm2) / 10000,
    strips,
    stripLengthCm: stripLength,
    stripsPerRoll,
    rolls: strips === 0 ? 0 : Math.ceil(strips / stripsPerRoll),
  };
}

export function openingsAreaOnWall(wallIndex: number, openings: OpeningItem[]): number {
  return openings.filter((o) => o.wallIndex === wallIndex).reduce((a, o) => a + o.size.w * o.size.h, 0);
}

export interface QuoteLine {
  wallpaper: WallpaperDef;
  walls: number[];
  rolls: number;
  netAreaM2: number;
  total?: number;
}

/**
 * Proje geneli teklif: aynı duvar kağıdı birden çok duvarda kullanılıyorsa
 * şeritler birleştirilir (ruloda artan şeritler diğer duvarda kullanılabilir).
 */
export function buildQuote(
  walls: WallInfo[],
  assignments: { wallIndex: number; wallpaper: WallpaperDef }[],
  openings: OpeningItem[],
  roomHeight: number,
): QuoteLine[] {
  const groups = new Map<string, { wp: WallpaperDef; walls: number[] }>();
  for (const a of assignments) {
    const g = groups.get(a.wallpaper.id) ?? { wp: a.wallpaper, walls: [] };
    g.walls.push(a.wallIndex);
    groups.set(a.wallpaper.id, g);
  }
  const lines: QuoteLine[] = [];
  for (const { wp, walls: idxs } of groups.values()) {
    let strips = 0;
    let net = 0;
    let stripsPerRoll = 1;
    for (const i of idxs) {
      const w = walls[i];
      const est = estimateRolls(
        { wallWidthCm: w.length, wallHeightCm: roomHeight, openingsAreaCm2: openingsAreaOnWall(i, openings) },
        wp,
      );
      strips += est.strips;
      net += est.netAreaM2;
      stripsPerRoll = est.stripsPerRoll;
    }
    const rolls = strips === 0 ? 0 : Math.ceil(strips / stripsPerRoll);
    lines.push({
      wallpaper: wp,
      walls: idxs.sort((a, b) => a - b),
      rolls,
      netAreaM2: net,
      total: wp.pricePerRoll != null ? rolls * wp.pricePerRoll : undefined,
    });
  }
  return lines;
}
