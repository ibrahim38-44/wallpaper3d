import { fbm, hexToRgb, makePeriodicNoise, mulberry32, type PatternGenerator } from './patterns';

export interface FloorMaterialDef {
  id: string;
  name: string;
  swatch: string;
  tileWidthCm: number;
  tileHeightCm: number;
  roughness: number;
  generator: PatternGenerator;
  params: Record<string, unknown>;
}

/** Parke: şaşırtmalı tahtalar, her tahtada ahşap damarı. */
const parquet: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb((p.color as string) ?? '#b58b5e');
  const rows = (p.rows as number) ?? 8; // karo içinde tahta sırası
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const n = makePeriodicNoise(4, 64);
  const rnd = mulberry32(21);
  const rh = h / rows;
  const offsets = Array.from({ length: rows }, () => rnd());
  const tones = Array.from({ length: rows * 3 }, () => (rnd() - 0.5) * 34);
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / rh);
    const ly = y - row * rh;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sx = (x / w + offsets[row]) % 1;
      const plank = Math.floor(sx * 2); // karo başına 2 tahta boyu
      const lx = sx * 2 - plank;
      const tone = tones[row * 3 + plank];
      const grain = Math.sin(ly / rh * 9 + fbm(n, (x / w) * 64, (y / h) * 8, 4) * 10) * 9;
      const joint = ly < 1.2 || lx < 0.004 ? -60 : 0;
      const v = tone + grain + joint;
      d[i] = r + v;
      d[i + 1] = g + v * 0.85;
      d[i + 2] = b + v * 0.65;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const tiles: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb((p.color as string) ?? '#d8d6d2');
  const grout = (p.grout as string) ?? '#b3b0aa';
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const n = makePeriodicNoise(9, 32);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = (fbm(n, (x / w) * 32, (y / h) * 32, 4) - 0.5) * 22;
      d[i] = r + v;
      d[i + 1] = g + v;
      d[i + 2] = b + v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = grout;
  const gw = Math.max(2, w * 0.005);
  ctx.fillRect(0, 0, w, gw);
  ctx.fillRect(0, 0, gw, h);
};

const carpet: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb((p.color as string) ?? '#b8ad9c');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const n = makePeriodicNoise(13, 64);
  const rnd = mulberry32(2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = (fbm(n, (x / w) * 64, (y / h) * 64, 3) - 0.5) * 18 + (rnd() - 0.5) * 26;
      d[i] = r + v;
      d[i + 1] = g + v;
      d[i + 2] = b + v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

export const FLOOR_MATERIALS: FloorMaterialDef[] = [
  { id: 'oak-parquet', name: 'Meşe parke', swatch: '#b58b5e', tileWidthCm: 240, tileHeightCm: 144, roughness: 0.55, generator: parquet, params: { color: '#b58b5e', rows: 8 } },
  { id: 'light-laminate', name: 'Açık laminat', swatch: '#d2b894', tileWidthCm: 260, tileHeightCm: 160, roughness: 0.6, generator: parquet, params: { color: '#d2b894', rows: 8 } },
  { id: 'walnut-parquet', name: 'Ceviz parke', swatch: '#6f4e37', tileWidthCm: 240, tileHeightCm: 144, roughness: 0.5, generator: parquet, params: { color: '#6f4e37', rows: 8 } },
  { id: 'grey-tile', name: 'Gri seramik 60×60', swatch: '#c9c7c2', tileWidthCm: 60, tileHeightCm: 60, roughness: 0.35, generator: tiles, params: { color: '#c9c7c2', grout: '#a7a39c' } },
  { id: 'white-tile', name: 'Beyaz seramik 60×60', swatch: '#ecebe7', tileWidthCm: 60, tileHeightCm: 60, roughness: 0.25, generator: tiles, params: { color: '#ecebe7', grout: '#c9c6c0' } },
  { id: 'carpet-beige', name: 'Bej halıfleks', swatch: '#b8ad9c', tileWidthCm: 100, tileHeightCm: 100, roughness: 0.95, generator: carpet, params: { color: '#b8ad9c' } },
];

export function getFloorMaterial(id: string): FloorMaterialDef {
  return FLOOR_MATERIALS.find((f) => f.id === id) ?? FLOOR_MATERIALS[0];
}
