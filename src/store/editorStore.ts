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
import { createProject, resizeRoom, uid, type NewRoomInput } from '../core/project';
import type {
  FloorItem,
  OpeningItem,
  Project,
  SceneItem,
  Selection,
  Vec2,
  WallpaperAssignment,
  WallpaperDef,
} from '../core/types';

export type ViewMode = 'perspective' | 'top' | 'wall';
export type SidePanel = 'library' | 'wallpaper' | 'ai' | 'room';

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
  roomDialog: null | 'new' | 'edit';
  toast: { id: number; text: string } | null;

  // ---- proje
  newProject(input: NewRoomInput): void;
  resizeRoom(input: NewRoomInput): void;
  loadProject(p: Project): void;
  renameProject(name: string): void;

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
  openRoomDialog(mode: null | 'new' | 'edit'): void;
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

  const mapItem = (p: Project, id: string, fn: (it: SceneItem) => SceneItem): Project => ({
    ...p,
    items: p.items.map((it) => (it.id === id ? fn(it) : it)),
  });

  const placeFloor = (p: Project, item: FloorItem, pos: Vec2): Vec2 => {
    let next = clampToRoom(pos, item.size, item.rotation, p.room);
    if (get().snapToWall) {
      next = snapToWalls(next, item.size, item.rotation, computeWalls(p.room)).position;
      next = clampToRoom(next, item.size, item.rotation, p.room);
    }
    return next;
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
      commit((p) => {
        const resized = resizeRoom(p, input);
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
      commit((p) => ({ ...p, name, room: { ...p.room, name } }));
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
      const project = get().project;
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
        const base: OpeningItem = { id, kind: 'opening', catalogId, wallIndex, offset, elevation: def.defaultElevation ?? 0, size, color: def.colors[0] };
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
      commit((p) => ({ ...p, items: [...p.items, item] }));
      set({ selection: { type: 'item', id } });
      return id;
    },
    addItems(items, opts) {
      if (!items.length) return;
      commit((p) => {
        const kept = p.items.filter(
          (i) => !(opts?.replaceFurniture && i.kind === 'floor') && !(opts?.replaceOpenings && i.kind === 'opening'),
        );
        return { ...p, items: [...kept, ...items] };
      });
    },
    updateItem(id, patch, transient) {
      apply(transient, (p) =>
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
      apply(transient, (p) =>
        mapItem(p, id, (it) => (it.kind === 'floor' && !it.locked ? { ...it, position: placeFloor(p, it, pos) } : it)),
      );
    },
    moveOpening(id, wallIndex, offset, transient) {
      apply(transient, (p) =>
        mapItem(p, id, (it) => {
          if (it.kind !== 'opening' || it.locked) return it;
          const wall = computeWalls(p.room)[wallIndex];
          if (!wall) return it;
          return { ...it, wallIndex, ...clampOpening({ ...it, offset }, wall, p.room.height) };
        }),
      );
    },
    rotateItem(id, deltaDeg) {
      commit((p) =>
        mapItem(p, id, (it) => {
          if (it.kind !== 'floor') return { ...it, flip: !it.flip };
          const rotation = normalizeAngle(it.rotation + deltaDeg);
          const rotated = { ...it, rotation };
          return { ...rotated, position: placeFloor(p, rotated, it.position) };
        }),
      );
    },
    removeItem(id) {
      commit((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
      const sel = get().selection;
      if (sel?.type === 'item' && sel.id === id) set({ selection: null });
    },
    duplicateItem(id) {
      const p = get().project;
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
      commit((pp) => ({ ...pp, items: [...pp.items, copy] }));
      set({ selection: { type: 'item', id: nid } });
    },

    setWallpaper(target, assignment) {
      commit((p) => ({
        ...p,
        walls: p.walls.map((w, i) => (target === 'all' || target === i ? { ...w, wallpaper: assignment ? { ...assignment } : null } : w)),
      }));
    },
    setWallpaperOffset(wallIndex, offsetU, offsetV, transient) {
      apply(transient, (p) => ({
        ...p,
        walls: p.walls.map((w, i) => (i === wallIndex && w.wallpaper ? { ...w, wallpaper: { ...w.wallpaper, offsetU, offsetV } } : w)),
      }));
    },
    setWallPaint(target, color) {
      commit((p) => ({ ...p, walls: p.walls.map((w, i) => (target === 'all' || target === i ? { ...w, paintColor: color } : w)) }));
    },
    setFloorMaterial(id) {
      commit((p) => ({ ...p, floor: { materialId: id } }));
    },
    addCustomWallpaper(def) {
      commit((p) => ({ ...p, customWallpapers: [...p.customWallpapers.filter((c) => c.id !== def.id), def] }));
    },
    removeCustomWallpaper(id) {
      commit((p) => ({
        ...p,
        customWallpapers: p.customWallpapers.filter((c) => c.id !== id),
        walls: p.walls.map((w) => (w.wallpaper?.wallpaperId === id ? { ...w, wallpaper: null } : w)),
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
  if (sel?.type === 'item' && !p.items.some((i) => i.id === sel.id)) return null;
  if (sel?.type === 'wall' && sel.index >= p.walls.length) return null;
  return sel;
}

/** Seçili nesne (türetilmiş). */
export function useSelectedItem(): SceneItem | undefined {
  return useEditor((s) => (s.selection?.type === 'item' ? s.project?.items.find((i) => i.id === (s.selection as { id: string }).id) : undefined));
}
