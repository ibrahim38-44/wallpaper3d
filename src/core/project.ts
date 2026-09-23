import { rectangleCorners } from './geometry';
import type { Project, RoomSpec, WallFinish } from './types';

export const DEFAULT_WALL_COLOR = '#ece8e1';

export function uid(prefix = 'id'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export interface NewRoomInput {
  name?: string;
  width: number;
  length: number;
  height: number;
  wallThickness?: number;
}

export const ROOM_LIMITS = {
  minSide: 100,
  maxSide: 3000,
  minHeight: 200,
  maxHeight: 600,
};

export function validateRoomInput(input: NewRoomInput): string[] {
  const errors: string[] = [];
  const { minSide, maxSide, minHeight, maxHeight } = ROOM_LIMITS;
  if (!(input.width >= minSide && input.width <= maxSide)) errors.push(`Genişlik ${minSide}–${maxSide} cm arasında olmalı.`);
  if (!(input.length >= minSide && input.length <= maxSide)) errors.push(`Uzunluk ${minSide}–${maxSide} cm arasında olmalı.`);
  if (!(input.height >= minHeight && input.height <= maxHeight)) errors.push(`Yükseklik ${minHeight}–${maxHeight} cm arasında olmalı.`);
  return errors;
}

export function createRoom(input: NewRoomInput): RoomSpec {
  return {
    name: input.name?.trim() || 'Odam',
    corners: rectangleCorners(input.width, input.length),
    height: input.height,
    wallThickness: input.wallThickness ?? 12,
  };
}

export function defaultWallFinishes(count: number): WallFinish[] {
  return Array.from({ length: count }, () => ({ paintColor: DEFAULT_WALL_COLOR, wallpaper: null }));
}

export function createProject(input: NewRoomInput): Project {
  const room = createRoom(input);
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: uid('prj'),
    name: room.name,
    room,
    items: [],
    walls: defaultWallFinishes(room.corners.length),
    floor: { materialId: 'oak-parquet' },
    customWallpapers: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Ölçüleri değişen odada mevcut içerik korunur; duvar sayısı değişirse kaplamalar uyarlanır. */
export function resizeRoom(project: Project, input: NewRoomInput): Project {
  const room = { ...createRoom({ ...input, name: input.name ?? project.room.name }), wallThickness: project.room.wallThickness };
  const walls =
    project.walls.length === room.corners.length ? project.walls : defaultWallFinishes(room.corners.length);
  return { ...project, room, walls, name: room.name };
}

/** JSON içeriğini doğrular ve (gelecekteki şema sürümleri için) taşır. */
export function parseProject(json: unknown): Project {
  if (!json || typeof json !== 'object') throw new Error('Geçersiz proje dosyası.');
  const p = json as Partial<Project> & { schemaVersion?: number };
  if (p.schemaVersion !== 1) throw new Error(`Desteklenmeyen proje sürümü: ${String(p.schemaVersion)}`);
  if (!p.room || !Array.isArray(p.room.corners) || p.room.corners.length < 3) throw new Error('Oda bilgisi eksik.');
  if (!Array.isArray(p.items)) throw new Error('Nesne listesi eksik.');
  const wallCount = p.room.corners.length;
  const walls = Array.isArray(p.walls) && p.walls.length === wallCount ? p.walls : defaultWallFinishes(wallCount);
  return {
    schemaVersion: 1,
    id: p.id ?? uid('prj'),
    name: p.name ?? p.room.name ?? 'Odam',
    room: p.room,
    items: p.items,
    walls,
    floor: p.floor ?? { materialId: 'oak-parquet' },
    customWallpapers: p.customWallpapers ?? [],
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}
