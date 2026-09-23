import { clampSize, getFurniture } from '../catalog/furniture';
import { clampOpening, clampToRoom, computeWalls, normalizeAngle, roomBounds, snapToWalls } from '../core/geometry';
import { uid } from '../core/project';
import type { FloorItem, OpeningItem, RoomSpec, SceneItem } from '../core/types';
import type { DetectedItem, RelWall } from './types';

const REL_INDEX: Record<RelWall, number> = { back: 0, right: 1, front: 2, left: 3 };

/**
 * Fotoğrafa göre (göreli) koordinatları oda koordinatlarına çevirir.
 * `facingWall`: ilk fotoğrafın baktığı gerçek duvar indeksi (0=arka,1=sağ,2=ön,3=sol).
 */
export function relToRoom(x: number, z: number, facingWall: number, W: number, L: number): { x: number; z: number } {
  switch (((facingWall % 4) + 4) % 4) {
    case 1:
      return { x: (1 - z) * W, z: x * L };
    case 2:
      return { x: (1 - x) * W, z: (1 - z) * L };
    case 3:
      return { x: z * W, z: (1 - x) * L };
    default:
      return { x: x * W, z: z * L };
  }
}

export function relWallToIndex(wall: RelWall, facingWall: number): number {
  return (REL_INDEX[wall] + facingWall) % 4;
}

/** Duvara yaslanan eşyanın ön yüzü odanın içine baksın. */
const FACING_ROTATION = [0, 270, 180, 90];

export function detectionsToItems(dets: DetectedItem[], room: RoomSpec, facingWall = 0): SceneItem[] {
  const walls = computeWalls(room);
  const isRect = walls.length === 4;
  const b = roomBounds(room);
  const W = b.maxX - b.minX;
  const L = b.maxZ - b.minZ;
  const out: SceneItem[] = [];

  for (const d of dets) {
    const def = getFurniture(d.catalogId);
    if (!def) continue;
    const size = clampSize(def, d.sizeCm ? { ...d.sizeCm } : { ...def.defaultSize });
    if (def.placement === 'opening') {
      const wallIndex = d.wall && isRect ? relWallToIndex(d.wall, facingWall) : 0;
      const wall = walls[wallIndex];
      const base: OpeningItem = {
        id: uid('it'),
        kind: 'opening',
        catalogId: def.id,
        name: d.label !== def.name ? d.label : undefined,
        wallIndex,
        offset: (d.alongWall ?? 0.5) * wall.length,
        elevation: d.elevationCm ?? def.defaultElevation ?? 0,
        size: { ...size, d: def.defaultSize.d },
        color: def.colors[0],
        color2: def.colors2?.[0],
      };
      out.push({ ...base, ...clampOpening(base, wall, room.height) });
      continue;
    }
    const p = isRect ? relToRoom(d.x, d.z, facingWall, W, L) : { x: d.x * W, z: d.z * L };
    let rotation: number;
    if (d.wall && isRect) rotation = FACING_ROTATION[relWallToIndex(d.wall, facingWall)];
    else rotation = normalizeAngle((d.rotationDeg ?? 0) - 90 * facingWall);
    const item: FloorItem = {
      id: uid('it'),
      kind: 'floor',
      catalogId: def.id,
      name: d.label !== def.name ? d.label : undefined,
      position: { x: b.minX + p.x, z: b.minZ + p.z },
      elevation: d.elevationCm ?? def.defaultElevation ?? 0,
      rotation,
      size,
      color: def.colors[0],
      color2: def.colors2?.[0],
    };
    let pos = clampToRoom(item.position, item.size, item.rotation, room);
    if (d.wall) pos = snapToWalls(pos, item.size, item.rotation, walls, 60).position;
    item.position = clampToRoom(pos, item.size, item.rotation, room);
    out.push(item);
  }
  return out;
}
