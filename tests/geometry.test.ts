import { describe, expect, it } from 'vitest';
import {
  clampOpening,
  clampToRoom,
  computeWalls,
  footprintCorners,
  footprintHalfExtents,
  rayToFloor,
  rayToWall,
  rectangleCorners,
  snapAngle,
  snapToWalls,
} from '../src/core/geometry';
import { createRoom } from '../src/core/project';

const room = createRoom({ width: 400, length: 500, height: 260 });

describe('computeWalls', () => {
  const walls = computeWalls(room);
  it('dikdörtgen oda için 4 duvar üretir', () => {
    expect(walls).toHaveLength(4);
    expect(walls.map((w) => Math.round(w.length))).toEqual([400, 500, 400, 500]);
  });
  it('normaller odanın içine bakar', () => {
    expect(walls[0].normal).toEqual({ x: -0, z: 1 });
    expect(walls[1].normal.x).toBeCloseTo(-1);
    expect(walls[2].normal.z).toBeCloseTo(-1);
    expect(walls[3].normal.x).toBeCloseTo(1);
  });
  it('rotationY yerel +x eksenini duvar yönüne çevirir', () => {
    for (const w of walls) {
      // three.js: (1,0,0) Y ekseni etrafında θ döndürülünce (cosθ, 0, -sinθ)
      expect(Math.cos(w.rotationY)).toBeCloseTo(w.dir.x);
      expect(-Math.sin(w.rotationY)).toBeCloseTo(w.dir.z);
    }
  });
});

describe('ayak izi', () => {
  it('90° dönüşte genişlik/derinlik yer değiştirir', () => {
    const e = footprintHalfExtents({ w: 200, d: 100 }, 90);
    expect(e.hx).toBeCloseTo(50);
    expect(e.hz).toBeCloseTo(100);
  });
  it('köşe noktaları merkez etrafında simetriktir', () => {
    const c = footprintCorners({ position: { x: 100, z: 100 }, size: { w: 40, d: 20, h: 10 }, rotation: 30 });
    const cx = c.reduce((a, p) => a + p.x, 0) / 4;
    const cz = c.reduce((a, p) => a + p.z, 0) / 4;
    expect(cx).toBeCloseTo(100);
    expect(cz).toBeCloseTo(100);
  });
});

describe('clampToRoom', () => {
  it('oda dışına taşan nesneyi içeri alır', () => {
    const p = clampToRoom({ x: -50, z: 900 }, { w: 100, d: 60, h: 80 }, 0, room);
    expect(p).toEqual({ x: 50, z: 470 });
  });
  it('döndürülmüş ölçüyü hesaba katar', () => {
    const p = clampToRoom({ x: 0, z: 0 }, { w: 200, d: 60, h: 80 }, 90, room);
    expect(p.x).toBeCloseTo(30);
    expect(p.z).toBeCloseTo(100);
  });
});

describe('snapToWalls', () => {
  it('eşik içindeki nesneyi duvara yaslar', () => {
    const walls = computeWalls(room);
    const r = snapToWalls({ x: 200, z: 38 }, { w: 100, d: 60, h: 80 }, 0, walls, 12);
    expect(r.position.z).toBeCloseTo(30);
    expect(r.snappedWalls).toContain(0);
  });
  it('uzaktaki nesneye dokunmaz', () => {
    const walls = computeWalls(room);
    const r = snapToWalls({ x: 200, z: 250 }, { w: 100, d: 60, h: 80 }, 0, walls, 12);
    expect(r.position).toEqual({ x: 200, z: 250 });
  });
});

describe('açıklıklar', () => {
  it('kapıyı duvar sınırları içinde tutar', () => {
    const w = computeWalls(room)[0];
    const r = clampOpening({ offset: 5, elevation: 0, size: { w: 90, d: 12, h: 210 } }, w, 260);
    expect(r.offset).toBe(50);
    const r2 = clampOpening({ offset: 500, elevation: 200, size: { w: 120, d: 12, h: 140 } }, w, 260);
    expect(r2.offset).toBe(335);
    expect(r2.elevation).toBe(118);
  });
});

describe('ışın testleri', () => {
  it('zemin kesişimi', () => {
    expect(rayToFloor({ x: 0, y: 100, z: 0 }, { x: 0, y: -1, z: 0 })).toEqual({ x: 0, z: 0 });
    expect(rayToFloor({ x: 0, y: 100, z: 0 }, { x: 0, y: 1, z: 0 })).toBeNull();
  });
  it('içeriden arka duvara bakan ışın arka duvarı bulur', () => {
    const walls = computeWalls(room);
    const hit = rayToWall({ x: 150, y: 120, z: 400 }, { x: 0, y: 0, z: -1 }, walls, 260);
    expect(hit?.wallIndex).toBe(0);
    expect(hit?.u).toBeCloseTo(150);
  });
  it('dışarıdan gelen ışın ön duvarı atlar (kesit görünüm)', () => {
    const walls = computeWalls(room);
    const hit = rayToWall({ x: 200, y: 150, z: 900 }, { x: 0, y: 0, z: -1 }, walls, 260);
    expect(hit?.wallIndex).toBe(0);
  });
});

describe('açı yakalama', () => {
  it('90° katlarına mıknatıslanır', () => {
    expect(snapAngle(88)).toBe(90);
    expect(snapAngle(-2)).toBe(0);
    expect(snapAngle(47)).toBe(45);
    expect(snapAngle(362)).toBe(0);
  });
});

describe('rectangleCorners', () => {
  it('saat yönünde 4 köşe', () => {
    expect(rectangleCorners(3, 4)).toEqual([
      { x: 0, z: 0 },
      { x: 3, z: 0 },
      { x: 3, z: 4 },
      { x: 0, z: 4 },
    ]);
  });
});
