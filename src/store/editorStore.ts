import { create } from 'zustand';
import { clampSize, getFurniture } from '../catalog/furniture';
import {
  clampOpening,
  clampToRoom,
  computeWalls,
  normalizeAngle,
  roomCenter,
  snapToWalls,
} from '../core/geometry';
import { adjacentOrigin, type Side } from '../core/house';
import { activeRoom, createProject, createRoomDoc, resizeRoomDoc, uid, type NewRoomInput } from '../core/project';
import type {
  FloorItem,
  OpeningItem,
  Project,
  RoomDoc,
  SceneItem,
  Selection,
  Vec2,
  WallpaperAssignment,
  WallpaperDef,
} from '../core/types';

export type ViewMode = 'perspective' | 'house' | 'top' | 'wall';
export type SidePanel = 'library' | 'wallpaper' | 'rooms' | 'ai' | 'room';
export type RoomDialogMode = null | 'new' | 'edit' | 'add';

const HISTORY_LIMIT = 100;

export interface EditorState {
  project: Project | null;
  selection: Selection;
  past: Project[];
  future: Project[];
  /** sürükleme/döndürme sırasında kamera kontrolü kapatılır */
  interacting: boolean;
  snapToWall: boolean;
  showMeasurements: boolean;
  view: ViewMode;
  /** view değiştiğinde artar – kamera animasyonunu tetikler */
  viewNonce: number;
  panel: SidePanel;
  /** mobilde alt çekmece açık mı */
  sheetOpen: boolean;
  /** oda ölçü penceresi: null = kapalı */
  roomDialog: RoomDialogMode;
  toast: { id: number; text: string } | null;

  // ---- proje / ev
  newProject(input: NewRoomInput & { projectName?: string }): void;
  /** aktif odanın ölçülerini değiştirir */
  resizeRoom(input: NewRoomInput): void;
  loadProject(p: Project): void;
  renameProject(name: string): void;
  /** aktif odanın yanına yeni oda ekler */
  addRoom(input: NewRoomInput, side: Side, align?: 'start' | 'center' | 'end'): void;
  setActiveRoom(id: string): void;
  renameRoom(id: string, name: string): void;
  moveRoom(id: string, origin: Vec2, transient?: boolean): void;
  removeRoom(id: string): void;
  duplicateRoom(id: string, side: Side): void;

  // ---- geçmiş
  /** Değişiklik öncesi anlık görüntü alır (sürükleme başlangıcı vb.) */
  checkpoint(): void;
  undo(): void;
  redo(): void;

  // ---- nesneler
  addItem(catalogId: string, at?: Vec2 | { wallIndex: number; offset: number }): string | null;
  /** Toplu ekleme (AI önerileri). İsteğe bağlı olarak mevcut eşyaları/açıklıkları değiştirir – tek geri alma adımı. */
  addItems(items: SceneItem[], opts?: { replaceFurniture?: boolean; replaceOpenings?: boolean }): void;
  /** transient=true → geçmişe yazmaz (sürükleme sırasında) */
  updateItem(id: string, patch: Partial<FloorItem> | Partial<OpeningItem>, transient?: boolean): void;
  moveFloorItem(id: string, pos: Vec2, transient?: boolean): void;
  moveOpening(id: string, wallIndex: number, offset: number, transient?: boolean): void;
  rotateItem(id: string, deltaDeg: number): void;
  removeItem(id: string): void;
  duplicateItem(id: string): void;

  // ---- duvarlar
  setWallpaper(target: number | 'all', assignment: WallpaperAssignment | null): void;
  setWallpaperOffset(wallIndex: number, offsetU: number, offsetV: number, transient?: boolean): void;
  setWallPaint(target: number | 'all', color: string): void;
  setFloorMaterial(id: string): void;
  addCustomWallpaper(def: WallpaperDef): void;
  removeCustomWallpaper(id: string): void;

  // ---- arayüz
  select(sel: Selection): void;
  setInteracting(v: boolean): void;
  setView(v: ViewMode): void;
  setPanel(p: SidePanel, openSheet?: boolean): void;
  setSheetOpen(v: boolean): void;
  openRoomDialog(mode: RoomDialogMode): void;
  toggleSnap(): void;
  toggleMeasurements(): void;
  notify(text: string): void;
}

function touch(p: Project): Project {
  return { ...p, updatedAt: new Date().toISOString() };
}

export const useEditor = create<EditorState>()((set, get) => {
  /** Kalıcı değişiklik: geçmişe ekler, ileri geçmişi temizler. */
  const commit = (mutate: (p: Project) => Project) => {
    const { project, past } = get();
    if (!project) return;
    const next = touch(mutate(project));
    set({ project: next, past: [...past, project].slice(-HISTORY_LIMIT), future: [] });
  };
  /** Geçici değişiklik: geçmişe yazmaz (öncesinde checkpoint() çağrılmış olmalı). */
  const transientSet = (mutate: (p: Project) => Project) => {
    const { project } = get();
    if (!project) return;
    set({ project: mutate(project) });
  };
  const apply = (transient: boolean | undefined, m: (p: Project) => Project) => (transient ? transientSet(m) : commit(m));

  /** Aktif oda üzerinde değişiklik (oda-yerel koordinatlarda). */
  const onRoom = (m: (r: RoomDoc) => RoomDoc) => (p: Project): Project => {
    const activeId = activeRoom(p).id;
    return { ...p, rooms: p.rooms.map((r) => (r.id === activeId ? m(r) : r)) };
  };
  const commitRoom = (m: (r: RoomDoc) => RoomDoc) => commit(onRoom(m));
  const applyRoom = (transient: boolean | undefined, m: (r: RoomDoc) => RoomDoc) => apply(transient, onRoom(m));

  const mapItem = (p: RoomDoc, id: string, fn: (it: SceneItem) => SceneItem): RoomDoc => ({
    ...p,
    items: p.items.map((it) => (it.id === id ? fn(it) : it)),
  });

  const placeFloor = (p: RoomDoc, item: FloorItem, pos: Vec2): Vec2 => {
    let next = clampToRoom(pos, item.size, item.rotation, p.room);
    if (get().snapToWall) {
      next = snapToWalls(next, item.size, item.rotation, computeWalls(p.room)).position;
      next = clampToRoom(next, item.size, item.rotation, p.room);
    }
    return next;
  };

  const current = (): RoomDoc | null => {
    const p = get().project;
    return p ? activeRoom(p) : null;
  };

  return {
    project: null,
    selection: null,
    past: [],
    future: [],
    interacting: false,
    snapToWall: true,
    showMeasurements: true,
    view: 'perspective',
    viewNonce: 0,
    panel: 'library',
    sheetOpen: false,
    roomDialog: null,
    toast: null,

    newProject(input) {
      set({
        project: createProject(input),
        selection: null,
        past: [],
        future: [],
        roomDialog: null,
        view: 'perspective',
        viewNonce: get().viewNonce + 1,
      });
    },
    resizeRoom(input) {
      commitRoom((doc) => {
        const resized = resizeRoomDoc(doc, input);
        const walls = computeWalls(resized.room);
        // Mevcut nesneleri yeni sınırlara uydur
        const items = resized.items
          .filter((it) => it.kind === 'floor' || it.wallIndex < walls.length)
          .map((it) => {
            if (it.kind === 'floor') return { ...it, position: clampToRoom(it.position, it.size, it.rotation, resized.room) };
            const c = clampOpening(it, walls[it.wallIndex], resized.room.height);
            return { ...it, ...c };
          });
        return { ...resized, items };
      });
      set({ roomDialog: null, viewNonce: get().viewNonce + 1 });
    },
    loadProject(p) {
      set({ project: p, selection: null, past: [], future: [], viewNonce: get().viewNonce + 1 });
    },
    renameProject(name) {
      commit((p) => ({ ...p, name }));
    },
    addRoom(input, side, align = 'start') {
      const p = get().project;
      if (!p) return;
      const ref = activeRoom(p);
      const origin = adjacentOrigin(ref, { width: input.width, length: input.length }, side, align);
      const doc = createRoomDoc({ ...input, wallThickness: ref.room.wallThickness }, origin);
      commit((pp) => ({ ...pp, rooms: [...pp.rooms, doc], activeRoomId: doc.id }));
      set({ selection: null, roomDialog: null, view: 'house', viewNonce: get().viewNonce + 1 });
    },
    setActiveRoom(id) {
      const p = get().project;
      if (!p || p.activeRoomId === id || !p.rooms.some((r) => r.id === id)) return;
      // Oda değiştirmek geri alma geçmişine yazılmaz
      set({ project: { ...p, activeRoomId: id }, selection: null });
    },
    renameRoom(id, name) {
      commit((p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === id ? { ...r, room: { ...r.room, name } } : r)) }));
    },
    moveRoom(id, origin, transient) {
      apply(transient, (p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === id ? { ...r, origin: { ...origin } } : r)) }));
    },
    removeRoom(id) {
      const p = get().project;
      if (!p || p.rooms.length < 2) return;
      commit((pp) => {
        const rooms = pp.rooms.filter((r) => r.id !== id);
        return { ...pp, rooms, activeRoomId: pp.activeRoomId === id ? rooms[0].id : pp.activeRoomId };
      });
      set({ selection: null });
    },
    duplicateRoom(id, side) {
      const p = get().project;
      const src = p?.rooms.find((r) => r.id === id);
      if (!p || !src) return;
      const b = computeWalls(src.room);
      const size = { width: b[0].length, length: b[1]?.length ?? b[0].length };
      const copy: RoomDoc = {
        ...structuredClone(src),
        id: uid('room'),
        origin: adjacentOrigin(src, size, side),
        room: { ...src.room, name: `${src.room.name} (kopya)` },
      };
      copy.items = copy.items.map((it) => ({ ...it, id: uid('it') }));
      commit((pp) => ({ ...pp, rooms: [...pp.rooms, copy], activeRoomId: copy.id }));
      set({ selection: null, view: 'house', viewNonce: get().viewNonce + 1 });
    },

    checkpoint() {
      const { project, past } = get();
      if (!project) return;
      set({ past: [...past, project].slice(-HISTORY_LIMIT), future: [] });
    },
    undo() {
      const { past, project, future } = get();
      if (!past.length || !project) return;
      const prev = past[past.length - 1];
      set({ project: prev, past: past.slice(0, -1), future: [project, ...future], selection: keepSelection(get().selection, prev) });
    },
    redo() {
      const { past, project, future } = get();
      if (!future.length || !project) return;
      const next = future[0];
      set({ project: next, past: [...past, project], future: future.slice(1), selection: keepSelection(get().selection, next) });
    },

    addItem(catalogId, at) {
      const def = getFurniture(catalogId);
      const project = current();
      if (!def || !project) return null;
      const walls = computeWalls(project.room);
      const id = uid('it');
      let item: SceneItem;
      if (def.placement === 'opening') {
        // Varsayılan: noktasal konum verilmediyse, en az açıklığı olan duvarın ortası
        let wallIndex: number;
        let offset: number;
        if (at && 'wallIndex' in at) {
          wallIndex = at.wallIndex;
          offset = at.offset;
        } else {
          const counts = walls.map((w) => project.items.filter((i) => i.kind === 'opening' && i.wallIndex === w.index).length);
          wallIndex = counts.indexOf(Math.min(...counts));
          offset = walls[wallIndex].length / 2;
        }
        const size = { ...def.defaultSize };
        const base: OpeningItem = { id, kind: 'opening', catalogId, wallIndex, offset, elevation: def.defaultElevation ?? 0, size, color: def.colors[0], color2: def.colors2?.[0] };
        item = { ...base, ...clampOpening(base, walls[wallIndex], project.room.height) };
      } else {
        const center = roomCenter(project.room);
        const pos = at && !('wallIndex' in at) ? at : center;
        const base: FloorItem = {
          id,
          kind: 'floor',
          catalogId,
          position: pos,
          elevation: def.defaultElevation ?? 0,
          rotation: 0,
          size: { ...def.defaultSize },
          color: def.colors[0],
          color2: def.colors2?.[0],
        };
        if (def.placement === 'wall' && !(at && !('wallIndex' in at))) {
          // Duvara monte: arka duvara yasla
          const back = walls[0];
          base.position = {
            x: back.start.x + back.dir.x * (back.length / 2) + back.normal.x * (def.defaultSize.d / 2),
            z: back.start.z + back.dir.z * (back.length / 2) + back.normal.z * (def.defaultSize.d / 2),
          };
        }
        base.position = placeFloor(project, base, base.position);
        item = base;
      }
      commitRoom((p) => ({ ...p, items: [...p.items, item] }));
      set({ selection: { type: 'item', id } });
      return id;
    },
    addItems(items, opts) {
      if (!items.length) return;
      commitRoom((p) => {
        const kept = p.items.filter(
          (i) => !(opts?.replaceFurniture && i.kind === 'floor') && !(opts?.replaceOpenings && i.kind === 'opening'),
        );
        return { ...p, items: [...kept, ...items] };
      });
    },
    updateItem(id, patch, transient) {
      applyRoom(transient, (p) =>
        mapItem(p, id, (it) => {
          const def = getFurniture(it.catalogId);
          const merged = { ...it, ...patch } as SceneItem;
          if (patch.size && def) merged.size = clampSize(def, merged.size);
          if (merged.kind === 'floor') {
            merged.rotation = normalizeAngle(merged.rotation);
            merged.elevation = Math.max(0, Math.min(p.room.height - merged.size.h, merged.elevation));
            merged.position = clampToRoom(merged.position, merged.size, merged.rotation, p.room);
          } else {
            const wall = computeWalls(p.room)[merged.wallIndex];
            Object.assign(merged, clampOpening(merged, wall, p.room.height));
          }
          return merged;
        }),
      );
    },
    moveFloorItem(id, pos, transient) {
      applyRoom(transient, (p) =>
        mapItem(p, id, (it) => (it.kind === 'floor' && !it.locked ? { ...it, position: placeFloor(p, it, pos) } : it)),
      );
    },
    moveOpening(id, wallIndex, offset, transient) {
      applyRoom(transient, (p) =>
        mapItem(p, id, (it) => {
          if (it.kind !== 'opening' || it.locked) return it;
          const wall = computeWalls(p.room)[wallIndex];
          if (!wall) return it;
          return { ...it, wallIndex, ...clampOpening({ ...it, offset }, wall, p.room.height) };
        }),
      );
    },
    rotateItem(id, deltaDeg) {
      commitRoom((p) =>
        mapItem(p, id, (it) => {
          if (it.kind !== 'floor') return { ...it, flip: !it.flip };
          const rotation = normalizeAngle(it.rotation + deltaDeg);
          const rotated = { ...it, rotation };
          return { ...rotated, position: placeFloor(p, rotated, it.position) };
        }),
      );
    },
    removeItem(id) {
      commitRoom((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
      const sel = get().selection;
      if (sel?.type === 'item' && sel.id === id) set({ selection: null });
    },
    duplicateItem(id) {
      const p = current();
      const src = p?.items.find((i) => i.id === id);
      if (!p || !src) return;
      const nid = uid('it');
      let copy: SceneItem;
      if (src.kind === 'floor') {
        const moved = { ...src, id: nid, position: { x: src.position.x + 30, z: src.position.z + 30 } };
        copy = { ...moved, position: placeFloor(p, moved, moved.position) };
      } else {
        const wall = computeWalls(p.room)[src.wallIndex];
        copy = { ...src, id: nid, ...clampOpening({ ...src, offset: src.offset + src.size.w + 20 }, wall, p.room.height) };
      }
      commitRoom((pp) => ({ ...pp, items: [...pp.items, copy] }));
      set({ selection: { type: 'item', id: nid } });
    },

    setWallpaper(target, assignment) {
      commitRoom((p) => ({
        ...p,
        walls: p.walls.map((w, i) => (target === 'all' || target === i ? { ...w, wallpaper: assignment ? { ...assignment } : null } : w)),
      }));
    },
    setWallpaperOffset(wallIndex, offsetU, offsetV, transient) {
      applyRoom(transient, (p) => ({
        ...p,
        walls: p.walls.map((w, i) => (i === wallIndex && w.wallpaper ? { ...w, wallpaper: { ...w.wallpaper, offsetU, offsetV } } : w)),
      }));
    },
    setWallPaint(target, color) {
      commitRoom((p) => ({ ...p, walls: p.walls.map((w, i) => (target === 'all' || target === i ? { ...w, paintColor: color } : w)) }));
    },
    setFloorMaterial(id) {
      commitRoom((p) => ({ ...p, floor: { materialId: id } }));
    },
    addCustomWallpaper(def) {
      commit((p) => ({ ...p, customWallpapers: [...p.customWallpapers.filter((c) => c.id !== def.id), def] }));
    },
    removeCustomWallpaper(id) {
      commit((p) => ({
        ...p,
        customWallpapers: p.customWallpapers.filter((c) => c.id !== id),
        rooms: p.rooms.map((r) => ({ ...r, walls: r.walls.map((w) => (w.wallpaper?.wallpaperId === id ? { ...w, wallpaper: null } : w)) })),
      }));
    },

    select(sel) {
      set({ selection: sel });
    },
    setInteracting(v) {
      set({ interacting: v });
    },
    setView(v) {
      set({ view: v, viewNonce: get().viewNonce + 1 });
    },
    setPanel(panel, openSheet) {
      set({ panel, ...(openSheet ? { sheetOpen: true } : {}) });
    },
    setSheetOpen(v) {
      set({ sheetOpen: v });
    },
    openRoomDialog(mode) {
      set({ roomDialog: mode });
    },
    toggleSnap() {
      set({ snapToWall: !get().snapToWall });
    },
    toggleMeasurements() {
      set({ showMeasurements: !get().showMeasurements });
    },
    notify(text) {
      set({ toast: { id: Date.now(), text } });
    },
  };
});

function keepSelection(sel: Selection, p: Project): Selection {
  const r = activeRoom(p);
  if (sel?.type === 'item' && !r.items.some((i) => i.id === sel.id)) return null;
  if (sel?.type === 'wall' && sel.index >= r.walls.length) return null;
  return sel;
}

/** Aktif oda (türetilmiş, referansı sabit). */
export function useRoom(): RoomDoc {
  return useEditor((s) => activeRoom(s.project!));
}

/** Seçili nesne (türetilmiş). */
export function useSelectedItem(): SceneItem | undefined {
  return useEditor((s) =>
    s.selection?.type === 'item' && s.project ? activeRoom(s.project).items.find((i) => i.id === (s.selection as { id: string }).id) : undefined,
  );
}
