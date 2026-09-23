import { rectangleCorners, roomSize } from './geometry';
import type { Project, RoomDoc, RoomSpec, WallFinish, WallpaperDef } from './types';

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

export function createRoomDoc(input: NewRoomInput, origin = { x: 0, z: 0 }): RoomDoc {
  const room = createRoom(input);
  return {
    id: uid('room'),
    origin,
    room,
    items: [],
    walls: defaultWallFinishes(room.corners.length),
    floor: { materialId: 'oak-parquet' },
  };
}

export function createProject(input: NewRoomInput & { projectName?: string }): Project {
  const first = createRoomDoc(input);
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: uid('prj'),
    name: input.projectName?.trim() || first.room.name,
    rooms: [first],
    activeRoomId: first.id,
    customWallpapers: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Aktif oda (her zaman bir oda döner). */
export function activeRoom(p: Project): RoomDoc {
  return p.rooms.find((r) => r.id === p.activeRoomId) ?? p.rooms[0];
}

/** Ölçüleri değişen odada mevcut içerik korunur; duvar sayısı değişirse kaplamalar uyarlanır. */
export function resizeRoomDoc(doc: RoomDoc, input: NewRoomInput): RoomDoc {
  const room = { ...createRoom({ ...input, name: input.name ?? doc.room.name }), wallThickness: doc.room.wallThickness };
  const walls = doc.walls.length === room.corners.length ? doc.walls : defaultWallFinishes(room.corners.length);
  return { ...doc, room, walls };
}

export function roomDimensions(doc: RoomDoc) {
  return { ...roomSize(doc.room), height: doc.room.height };
}

type V1Project = {
  schemaVersion: 1;
  id?: string;
  name?: string;
  room: RoomSpec;
  items: RoomDoc['items'];
  walls?: WallFinish[];
  floor?: RoomDoc['floor'];
  customWallpapers?: WallpaperDef[];
  createdAt?: string;
  updatedAt?: string;
};

function validRoom(room: RoomSpec | undefined): room is RoomSpec {
  return !!room && Array.isArray(room.corners) && room.corners.length >= 3 && room.height > 0;
}

/** JSON içeriğini doğrular ve eski şema sürümlerini taşır (v1: tek oda → v2: ev). */
export function parseProject(json: unknown): Project {
  if (!json || typeof json !== 'object') throw new Error('Geçersiz proje dosyası.');
  const raw = json as { schemaVersion?: number };
  const now = new Date().toISOString();

  if (raw.schemaVersion === 1) {
    const p = json as V1Project;
    if (!validRoom(p.room)) throw new Error('Oda bilgisi eksik.');
    if (!Array.isArray(p.items)) throw new Error('Nesne listesi eksik.');
    const n = p.room.corners.length;
    const doc: RoomDoc = {
      id: uid('room'),
      origin: { x: 0, z: 0 },
      room: p.room,
      items: p.items,
      walls: Array.isArray(p.walls) && p.walls.length === n ? p.walls : defaultWallFinishes(n),
      floor: p.floor ?? { materialId: 'oak-parquet' },
    };
    return {
      schemaVersion: 2,
      id: p.id ?? uid('prj'),
      name: p.name ?? p.room.name ?? 'Evim',
      rooms: [doc],
      activeRoomId: doc.id,
      customWallpapers: p.customWallpapers ?? [],
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    };
  }

  if (raw.schemaVersion !== 2) throw new Error(`Desteklenmeyen proje sürümü: ${String(raw.schemaVersion)}`);
  const p = json as Partial<Project>;
  if (!Array.isArray(p.rooms) || p.rooms.length === 0) throw new Error('Projede oda yok.');
  const rooms: RoomDoc[] = p.rooms.map((r) => {
    if (!validRoom(r.room)) throw new Error('Oda bilgisi eksik.');
    const n = r.room.corners.length;
    return {
      id: r.id ?? uid('room'),
      origin: r.origin ?? { x: 0, z: 0 },
      room: r.room,
      items: Array.isArray(r.items) ? r.items : [],
      walls: Array.isArray(r.walls) && r.walls.length === n ? r.walls : defaultWallFinishes(n),
      floor: r.floor ?? { materialId: 'oak-parquet' },
    };
  });
  const activeRoomId = rooms.some((r) => r.id === p.activeRoomId) ? p.activeRoomId! : rooms[0].id;
  return {
    schemaVersion: 2,
    id: p.id ?? uid('prj'),
    name: p.name ?? 'Evim',
    rooms,
    activeRoomId,
    customWallpapers: p.customWallpapers ?? [],
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
  };
}

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}
