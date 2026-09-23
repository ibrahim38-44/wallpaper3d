import * as THREE from 'three';
import { getFloorMaterial } from '../catalog/floors';
import { mulberry32, PATTERN_GENERATORS } from '../catalog/patterns';
import type { WallpaperDef } from '../core/types';

/**
 * Doku önbelleği. Desen karoları bir kez üretilir; her duvar kendi tekrar/kaydırma
 * değerleri için dokunun hafif bir klonunu kullanır (görsel veri paylaşılır).
 */

const MAX_TILE_PX = 1024;
const MAX_PX_PER_CM = 10;

let maxAnisotropy = 8;
export function setMaxAnisotropy(v: number) {
  maxAnisotropy = Math.max(1, Math.min(16, v));
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Karo piksel boyutu – gerçek cm ölçüsüyle orantılı. */
export function tilePixelSize(tileWidthCm: number, tileHeightCm: number) {
  const ppc = Math.min(MAX_PX_PER_CM, MAX_TILE_PX / tileWidthCm, MAX_TILE_PX / tileHeightCm);
  return { w: Math.max(8, Math.round(tileWidthCm * ppc)), h: Math.max(8, Math.round(tileHeightCm * ppc)) };
}

type TileSource = HTMLCanvasElement | HTMLImageElement;
const tileCache = new Map<string, Promise<TileSource>>();

/** Duvar kağıdı karosunu (canvas veya görsel) üretir/yükler. */
export function getWallpaperTile(def: WallpaperDef): Promise<TileSource> {
  const key = def.source.type === 'image' ? `img:${def.id}:${def.source.url.length}` : `proc:${def.id}`;
  let p = tileCache.get(key);
  if (!p) {
    p = new Promise<TileSource>((resolve, reject) => {
      if (def.source.type === 'procedural') {
        const gen = PATTERN_GENERATORS[def.source.generator];
        if (!gen) return reject(new Error(`Bilinmeyen desen: ${def.source.generator}`));
        const { w, h } = tilePixelSize(def.tileWidthCm, def.tileHeightCm);
        const c = makeCanvas(w, h);
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        gen(ctx, w, h, def.source.params);
        resolve(c);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Desen görseli yüklenemedi'));
        img.src = def.source.url;
      }
    });
    tileCache.set(key, p);
  }
  return p;
}

const baseTextureCache = new Map<string, Promise<THREE.Texture>>();

function configure(tex: THREE.Texture) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function getWallpaperBaseTexture(def: WallpaperDef): Promise<THREE.Texture> {
  let p = baseTextureCache.get(def.id);
  if (!p) {
    p = getWallpaperTile(def).then((src) => configure(src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src)));
    baseTextureCache.set(def.id, p);
  }
  return p;
}

/**
 * Duvara özel doku: UV'ler santimetre cinsinden olduğundan tekrar = 1 / karo ölçüsü.
 * Desen, geleneksel uygulamadaki gibi tavandan başlar (üst kenara hizalı).
 */
export function makeWallTexture(base: THREE.Texture, def: WallpaperDef, wallHeight: number, offsetU: number, offsetV: number) {
  const t = base.clone();
  configure(t);
  t.repeat.set(1 / def.tileWidthCm, 1 / def.tileHeightCm);
  const topAlign = (wallHeight % def.tileHeightCm) / def.tileHeightCm;
  t.offset.set(-offsetU / def.tileWidthCm, -topAlign + offsetV / def.tileHeightCm);
  return t;
}

/** Katalog küçük resmi: karo, ~`showCm` genişliğinde bir duvar parçası gibi tekrarlanır. */
export async function makeWallpaperThumbnail(def: WallpaperDef, sizePx = 112, showCm = 80): Promise<string> {
  const tile = await getWallpaperTile(def);
  const c = makeCanvas(sizePx, sizePx);
  const ctx = c.getContext('2d')!;
  const scale = sizePx / showCm; // px/cm
  const tw = def.tileWidthCm * scale;
  const th = def.tileHeightCm * scale;
  for (let y = 0; y < sizePx; y += th) for (let x = 0; x < sizePx; x += tw) ctx.drawImage(tile, x, y, tw, th);
  return c.toDataURL('image/png');
}

// ---------------------------------------------------------------------------------------------
// Zemin

const floorCache = new Map<string, THREE.Texture>();
export function getFloorTexture(materialId: string): { texture: THREE.Texture; tileW: number; tileH: number; roughness: number } {
  const def = getFloorMaterial(materialId);
  let t = floorCache.get(def.id);
  if (!t) {
    const ppc = Math.min(4, 1024 / def.tileWidthCm, 1024 / def.tileHeightCm);
    const c = makeCanvas(Math.round(def.tileWidthCm * ppc), Math.round(def.tileHeightCm * ppc));
    def.generator(c.getContext('2d', { willReadFrequently: true })!, c.width, c.height, def.params);
    t = configure(new THREE.CanvasTexture(c));
    floorCache.set(def.id, t);
  }
  return { texture: t, tileW: def.tileWidthCm, tileH: def.tileHeightCm, roughness: def.roughness };
}

// ---------------------------------------------------------------------------------------------
// Mobilya yüzey dokuları (renk-nötr; malzeme rengiyle çarpılır)

let woodGrain: THREE.Texture | null = null;
export function getWoodGrainTexture(): THREE.Texture {
  if (woodGrain) return woodGrain;
  const w = 256;
  const h = 1024;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const rnd = mulberry32(99);
  const phase = Array.from({ length: 8 }, () => rnd() * 10);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const wob = Math.sin(y / 90 + phase[0]) * 6 + Math.sin(y / 23 + phase[1]) * 2;
      const ring = Math.sin((x + wob) / 3.2 + Math.sin(x / 40 + phase[2]) * 2);
      const v = 222 + ring * 16 + (rnd() - 0.5) * 10;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  woodGrain = configure(new THREE.CanvasTexture(c));
  return woodGrain;
}

let fabric: THREE.Texture | null = null;
export function getFabricTexture(): THREE.Texture {
  if (fabric) return fabric;
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  const rnd = mulberry32(5);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const weave = ((x >> 1) + (y >> 1)) % 2 ? 8 : -8;
      const v = 225 + weave + (rnd() - 0.5) * 22;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  fabric = configure(new THREE.CanvasTexture(c));
  fabric.repeat.set(6, 6);
  return fabric;
}

let sky: THREE.Texture | null = null;
/** Pencerelerin arkasındaki dış mekân (gökyüzü + uzak bina silueti) */
export function getSkyTexture(): THREE.Texture {
  if (sky) return sky;
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#9cc3e6');
  g.addColorStop(0.65, '#d8e7f2');
  g.addColorStop(1, '#eef2f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const rnd = mulberry32(4);
  ctx.fillStyle = 'rgba(160,172,180,0.55)';
  let x = 0;
  while (x < 512) {
    const bw = 30 + rnd() * 70;
    const bh = 60 + rnd() * 140;
    ctx.fillRect(x, 512 - bh, bw, bh);
    x += bw + rnd() * 20;
  }
  ctx.fillStyle = 'rgba(110,140,100,0.6)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * 512, 470 + rnd() * 50, 15 + rnd() * 25, 0, Math.PI * 2);
    ctx.fill();
  }
  sky = configure(new THREE.CanvasTexture(c));
  sky.wrapS = sky.wrapT = THREE.ClampToEdgeWrapping;
  return sky;
}
