import type { FloorItem, OpeningItem, RoomSpec, Size3, Vec2, WallInfo } from './types';

export const WALL_LABELS_4 = ['Arka duvar', 'Sağ duvar', 'Ön duvar', 'Sol duvar'];

export const DEG = Math.PI / 180;

export function rectangleCorners(width: number, length: number): Vec2[] {
  return [
    { x: 0, z: 0 },
    { x: width, z: 0 },
    { x: width, z: length },
    { x: 0, z: length },
  ];
}

export function computeWalls(room: RoomSpec): WallInfo[] {
  const n = room.corners.length;
  return room.corners.map((start, i) => {
    const end = room.corners[(i + 1) % n];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const dir = { x: dx / length, z: dz / length };
    const normal = { x: -dir.z, z: dir.x };
    return {
      index: i,
      label: n === 4 ? WALL_LABELS_4[i] : `Duvar ${i + 1}`,
      start,
      end,
      length,
      dir,
      normal,
      rotationY: Math.atan2(-dir.z, dir.x),
    };
  });
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function roomBounds(room: RoomSpec): Bounds {
  const xs = room.corners.map((c) => c.x);
  const zs = room.corners.map((c) => c.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

export function roomSize(room: RoomSpec): { width: number; length: number } {
  const b = roomBounds(room);
  return { width: b.maxX - b.minX, length: b.maxZ - b.minZ };
}

export function roomCenter(room: RoomSpec): Vec2 {
  const b = roomBounds(room);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

export function floorArea(room: RoomSpec): number {
  // Shoelace – cm² döner
  let a = 0;
  const c = room.corners;
  for (let i = 0; i < c.length; i++) {
    const p = c[i];
    const q = c[(i + 1) % c.length];
    a += p.x * q.z - q.x * p.z;
  }
  return Math.abs(a) / 2;
}

/** Döndürülmüş dikdörtgen ayak izinin eksen hizalı yarı-genişlikleri. */
export function footprintHalfExtents(size: Pick<Size3, 'w' | 'd'>, rotationDeg: number): { hx: number; hz: number } {
  const r = rotationDeg * DEG;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return {
    hx: (size.w / 2) * c + (size.d / 2) * s,
    hz: (size.w / 2) * s + (size.d / 2) * c,
  };
}

/** Ayak izinin 4 köşesi (plan koordinatları). */
export function footprintCorners(item: Pick<FloorItem, 'position' | 'size' | 'rotation'>): Vec2[] {
  const r = item.rotation * DEG;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const hw = item.size.w / 2;
  const hd = item.size.d / 2;
  const local: Vec2[] = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];
  // three.js Y dönüşü: x' = x cos + z sin ; z' = -x sin + z cos
  return local.map((p) => ({
    x: item.position.x + p.x * cos + p.z * sin,
    z: item.position.z - p.x * sin + p.z * cos,
  }));
}

/** Nesneyi oda sınırları içinde tutar (dikdörtgen/konveks odalar için sınır kutusu). */
export function clampToRoom(position: Vec2, size: Size3, rotationDeg: number, room: RoomSpec): Vec2 {
  const b = roomBounds(room);
  const { hx, hz } = footprintHalfExtents(size, rotationDeg);
  const clampAxis = (v: number, min: number, max: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v)));
  return {
    x: clampAxis(position.x, b.minX + hx, b.maxX - hx),
    z: clampAxis(position.z, b.minZ + hz, b.maxZ - hz),
  };
}

/**
 * Duvara yapışma: ayak izi bir duvara `threshold` cm'den yakınsa tam duvara dayar.
 * Dönen `wallIndex` ile arayüz "duvara yaslandı" ipucu verebilir.
 */
export function snapToWalls(
  position: Vec2,
  size: Size3,
  rotationDeg: number,
  walls: WallInfo[],
  threshold = 12,
): { position: Vec2; snappedWalls: number[] } {
  let pos = { ...position };
  const snapped: number[] = [];
  for (const wall of walls) {
    const corners = footprintCorners({ position: pos, size, rotation: rotationDeg });
    // duvar çizgisine iç normal yönünde işaretli uzaklık (içeride pozitif)
    let minDist = Infinity;
    for (const c of corners) {
      const d = (c.x - wall.start.x) * wall.normal.x + (c.z - wall.start.z) * wall.normal.z;
      minDist = Math.min(minDist, d);
    }
    // nesne duvarın uzunluğu boyunca duvar üzerinde mi?
    const along = (pos.x - wall.start.x) * wall.dir.x + (pos.z - wall.start.z) * wall.dir.z;
    if (along < -size.w || along > wall.length + size.w) continue;
    if (minDist < threshold && minDist > -threshold) {
      pos = { x: pos.x - wall.normal.x * minDist, z: pos.z - wall.normal.z * minDist };
      snapped.push(wall.index);
    }
  }
  return { position: pos, snappedWalls: snapped };
}

export function snapValue(v: number, step: number): number {
  if (step <= 0) return v;
  return Math.round(v / step) * step;
}

/** Açılı yakalama: 90°'nin katlarına ±tolerans içinde mıknatıslanır, aksi hâlde `step`e yuvarlanır. */
export function snapAngle(deg: number, step = 5, magnet = 4): number {
  const norm = ((deg % 360) + 360) % 360;
  const nearestRight = Math.round(norm / 90) * 90;
  if (Math.abs(norm - nearestRight) <= magnet) return nearestRight % 360;
  return (Math.round(norm / step) * step) % 360;
}

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Açıklığı duvar içinde tutar (köşelerden `margin` cm pay bırakır). */
export function clampOpening(
  opening: Pick<OpeningItem, 'offset' | 'elevation' | 'size'>,
  wall: WallInfo,
  roomHeight: number,
  margin = 5,
): { offset: number; elevation: number } {
  const half = opening.size.w / 2;
  const minO = half + margin;
  const maxO = wall.length - half - margin;
  const offset = minO > maxO ? wall.length / 2 : Math.min(maxO, Math.max(minO, opening.offset));
  const maxE = Math.max(0, roomHeight - opening.size.h - 2);
  const elevation = Math.min(maxE, Math.max(0, opening.elevation));
  return { offset, elevation };
}

/** Duvar üzerindeki (u = duvar boyunca, v = yükseklik) noktayı plan/3D koordinata çevirir. */
export function wallPointToPlan(wall: WallInfo, u: number): Vec2 {
  return { x: wall.start.x + wall.dir.x * u, z: wall.start.z + wall.dir.z * u };
}

/** Plan noktasının duvar boyunca izdüşümü (u). */
export function planPointToWallU(wall: WallInfo, p: Vec2): number {
  return (p.x - wall.start.x) * wall.dir.x + (p.z - wall.start.z) * wall.dir.z;
}

/**
 * Işını (origin + t*dir, 3D) duvarların iç yüzeyiyle keser. Yalnızca içeriden
 * bakılan (ışın yönü iç normale karşı) duvarlar dikkate alınır; böylece kamera
 * tarafında gizlenen duvarlar atlanır.
 */
export function rayToWall(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  walls: WallInfo[],
  roomHeight: number,
): { wallIndex: number; u: number; v: number; t: number } | null {
  let best: { wallIndex: number; u: number; v: number; t: number } | null = null;
  for (const w of walls) {
    const denom = dir.x * w.normal.x + dir.z * w.normal.z;
    if (denom >= -1e-6) continue; // duvara içeriden bakmıyor
    const t = ((w.start.x - origin.x) * w.normal.x + (w.start.z - origin.z) * w.normal.z) / denom;
    if (t <= 0) continue;
    const hx = origin.x + dir.x * t;
    const hz = origin.z + dir.z * t;
    const hy = origin.y + dir.y * t;
    const u = (hx - w.start.x) * w.dir.x + (hz - w.start.z) * w.dir.z;
    if (u < -20 || u > w.length + 20 || hy < -50 || hy > roomHeight + 50) continue;
    if (!best || t < best.t) best = { wallIndex: w.index, u, v: hy, t };
  }
  return best;
}

/** Düzlem y = h ile ışın kesişimi. */
export function rayToFloor(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  h = 0,
): Vec2 | null {
  if (Math.abs(dir.y) < 1e-6) return null;
  const t = (h - origin.y) / dir.y;
  if (t <= 0) return null;
  return { x: origin.x + dir.x * t, z: origin.z + dir.z * t };
}

/** Nesneden en yakın duvarlara uzaklıklar (ölçü etiketi için). */
export function distancesToWalls(item: FloorItem, walls: WallInfo[]): { wallIndex: number; distance: number }[] {
  const corners = footprintCorners(item);
  return walls.map((w) => {
    let min = Infinity;
    for (const c of corners) {
      min = Math.min(min, (c.x - w.start.x) * w.normal.x + (c.z - w.start.z) * w.normal.z);
    }
    return { wallIndex: w.index, distance: min };
  });
}
