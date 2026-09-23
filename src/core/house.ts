import { computeWalls, roomBounds, type Bounds } from './geometry';
import type { OpeningItem, RoomDoc, Vec2 } from './types';

/**
 * Ev (çok odalı plan) hesapları. Her oda kendi yerel koordinatında tutulur;
 * `origin` odanın (0,0) köşesinin ev planındaki yeridir.
 */

export type Side = 'right' | 'left' | 'back' | 'front';

export const SIDE_LABELS: Record<Side, string> = {
  right: 'Sağına',
  left: 'Soluna',
  back: 'Arkasına',
  front: 'Önüne',
};

/** Tüm evin sınır kutusu (duvar kalınlıkları dahil). */
export function houseBounds(rooms: RoomDoc[]): Bounds {
  const b: Bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const r of rooms) {
    const rb = roomBounds(r.room);
    const t = r.room.wallThickness;
    b.minX = Math.min(b.minX, r.origin.x + rb.minX - t);
    b.maxX = Math.max(b.maxX, r.origin.x + rb.maxX + t);
    b.minZ = Math.min(b.minZ, r.origin.z + rb.minZ - t);
    b.maxZ = Math.max(b.maxZ, r.origin.z + rb.maxZ + t);
  }
  if (!Number.isFinite(b.minX)) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  return b;
}

/**
 * Referans odanın yanına eklenecek odanın konumu. Ortak duvar tek bir duvar
 * kalınlığı olacak şekilde yerleştirilir (iki odanın duvar gövdeleri üst üste biner).
 * `align`: yan yana dizilen eksende hizalama ('start' = sol/arka köşeler hizalı).
 */
export function adjacentOrigin(ref: RoomDoc, size: { width: number; length: number }, side: Side, align: 'start' | 'center' | 'end' = 'start'): Vec2 {
  const rb = roomBounds(ref.room);
  const W = rb.maxX - rb.minX;
  const L = rb.maxZ - rb.minZ;
  const t = ref.room.wallThickness;
  const alignOffset = (refLen: number, newLen: number) => (align === 'start' ? 0 : align === 'center' ? (refLen - newLen) / 2 : refLen - newLen);
  switch (side) {
    case 'right':
      return { x: ref.origin.x + W + t, z: ref.origin.z + alignOffset(L, size.length) };
    case 'left':
      return { x: ref.origin.x - size.width - t, z: ref.origin.z + alignOffset(L, size.length) };
    case 'back':
      return { x: ref.origin.x + alignOffset(W, size.width), z: ref.origin.z - size.length - t };
    case 'front':
      return { x: ref.origin.x + alignOffset(W, size.width), z: ref.origin.z + L + t };
  }
}

/** İki odanın iç alanları çakışıyor mu? (yerleşim uyarısı için) */
export function roomsOverlap(a: RoomDoc, b: RoomDoc): boolean {
  const A = roomBounds(a.room);
  const B = roomBounds(b.room);
  const eps = 1;
  return (
    a.origin.x + A.minX < b.origin.x + B.maxX - eps &&
    b.origin.x + B.minX < a.origin.x + A.maxX - eps &&
    a.origin.z + A.minZ < b.origin.z + B.maxZ - eps &&
    b.origin.z + B.minZ < a.origin.z + A.maxZ - eps
  );
}

export interface ForeignHole {
  key: string;
  offset: number;
  elevation: number;
  size: { w: number; h: number; d: number };
}

/**
 * Komşu odanın bu duvarla sırt sırta duran duvarındaki kapı/pencereleri, bu duvar
 * üzerinde delik olarak döndürür. Böylece iki oda arasındaki kapı iki duvarı da deler.
 */
export function foreignHolesForWall(rooms: RoomDoc[], roomIndex: number, wallIndex: number): ForeignHole[] {
  const me = rooms[roomIndex];
  const myWall = computeWalls(me.room)[wallIndex];
  if (!myWall) return [];
  const t = me.room.wallThickness;
  const ms = { x: me.origin.x + myWall.start.x, z: me.origin.z + myWall.start.z };
  const out: ForeignHole[] = [];
  rooms.forEach((other, oi) => {
    if (oi === roomIndex) return;
    const walls = computeWalls(other.room);
    for (const ow of walls) {
      // zıt yönlü normal
      const dot = ow.normal.x * myWall.normal.x + ow.normal.z * myWall.normal.z;
      if (dot > -0.999) continue;
      const os = { x: other.origin.x + ow.start.x, z: other.origin.z + ow.start.z };
      // iki iç yüz arası mesafe ≈ duvar kalınlığı (sırt sırta)
      const gap = (os.x - ms.x) * -myWall.normal.x + (os.z - ms.z) * -myWall.normal.z;
      if (Math.abs(gap - Math.max(t, other.room.wallThickness)) > 3 && Math.abs(gap - t) > 3) continue;
      const openings = other.items.filter((i): i is OpeningItem => i.kind === 'opening' && i.wallIndex === ow.index);
      for (const o of openings) {
        const px = os.x + ow.dir.x * o.offset;
        const pz = os.z + ow.dir.z * o.offset;
        const u = (px - ms.x) * myWall.dir.x + (pz - ms.z) * myWall.dir.z;
        if (u + o.size.w / 2 < 0 || u - o.size.w / 2 > myWall.length) continue;
        out.push({ key: `${other.id}:${o.id}`, offset: u, elevation: o.elevation, size: o.size });
      }
    }
  });
  return out;
}
