import { beforeEach, describe, expect, it } from 'vitest';
import { detectionsToItems, relToRoom, relWallToIndex } from '../src/ai/mapDetections';
import { sanitizeResult } from '../src/ai/provider';
import { FURNITURE } from '../src/catalog/furniture';
import { createRoom, parseProject, serializeProject } from '../src/core/project';
import type { FloorItem, OpeningItem } from '../src/core/types';
import { useEditor } from '../src/store/editorStore';

const room = createRoom({ width: 400, length: 500, height: 260 });

describe('AI eşleme', () => {
  it('fotoğraf yönüne göre koordinat dönüşümü', () => {
    expect(relToRoom(0.25, 0.1, 0, 400, 500)).toEqual({ x: 100, z: 50 });
    // ilk foto sağ duvara bakıyor: fotoğraftaki "sol" arka duvar tarafı
    const p = relToRoom(0, 0, 1, 400, 500);
    expect(p).toEqual({ x: 400, z: 0 });
    expect(relWallToIndex('back', 1)).toBe(1);
    expect(relWallToIndex('left', 1)).toBe(0);
  });
  it('duvara yaslı eşyayı içeri bakacak şekilde yerleştirir', () => {
    const [bed] = detectionsToItems(
      [{ catalogId: 'bed-double', label: 'Yatak', confidence: 0.9, wall: 'back', x: 0.5, z: 0.2, sizeCm: { w: 160, d: 200, h: 100 } }],
      room,
    ) as FloorItem[];
    expect(bed.rotation).toBe(0);
    expect(bed.position.z).toBeCloseTo(100); // arka duvara yaslı (d/2)
    expect(bed.size.w).toBe(160);
  });
  it('pencereyi doğru duvara ve konuma koyar', () => {
    const [win] = detectionsToItems(
      [{ catalogId: 'window', label: 'Pencere', confidence: 0.8, wall: 'right', x: 1, z: 0.5, alongWall: 0.5, elevationCm: 90 }],
      room,
    ) as OpeningItem[];
    expect(win.kind).toBe('opening');
    expect(win.wallIndex).toBe(1);
    expect(win.offset).toBeCloseTo(250);
    expect(win.elevation).toBe(90);
  });
  it('model çıktısını temizler: bilinmeyen kimlikleri atar, aralıkları sınırlar', () => {
    const ids = new Set(FURNITURE.map((f) => f.id));
    const r = sanitizeResult(
      { items: [{ catalogId: 'spaceship', x: 1 }, { catalogId: 'sofa', label: 'Kanepe', confidence: 3, wall: 'up', x: -1, z: 2 }], summary: 'ok' },
      ids,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ catalogId: 'sofa', confidence: 1, wall: null, x: 0, z: 1 });
    expect(r.roomEstimate).toBeNull();
  });
});

describe('editör deposu', () => {
  beforeEach(() => {
    useEditor.getState().newProject({ width: 400, length: 500, height: 260 });
  });

  it('eşya ekler, taşır, geri alır ve yineler', () => {
    const s = useEditor.getState();
    const id = s.addItem('sofa')!;
    expect(useEditor.getState().project!.items).toHaveLength(1);
    useEditor.getState().moveFloorItem(id, { x: 150, z: 250 });
    const moved = useEditor.getState().project!.items[0] as FloorItem;
    expect(moved.position.x).toBe(150);
    useEditor.getState().undo();
    expect((useEditor.getState().project!.items[0] as FloorItem).position.x).toBe(200);
    useEditor.getState().undo();
    expect(useEditor.getState().project!.items).toHaveLength(0);
    useEditor.getState().redo();
    useEditor.getState().redo();
    expect((useEditor.getState().project!.items[0] as FloorItem).position.x).toBe(150);
  });

  it('geçici güncellemeler geçmişe yazılmaz', () => {
    const id = useEditor.getState().addItem('chair')!;
    const before = useEditor.getState().past.length;
    useEditor.getState().checkpoint();
    for (let i = 0; i < 20; i++) useEditor.getState().moveFloorItem(id, { x: 100 + i, z: 200 }, true);
    expect(useEditor.getState().past.length).toBe(before + 1);
  });

  it('boyutu katalog sınırlarında tutar', () => {
    const id = useEditor.getState().addItem('wardrobe')!;
    useEditor.getState().updateItem(id, { size: { w: 9999, d: 1, h: 220 } });
    const it = useEditor.getState().project!.items[0] as FloorItem;
    expect(it.size.w).toBe(400);
    expect(it.size.d).toBe(40);
  });

  it('duvar kağıdı uygular ve kaldırır', () => {
    useEditor.getState().setWallpaper(1, { wallpaperId: 'wp-damask-navy', offsetU: 0, offsetV: 0 });
    expect(useEditor.getState().project!.walls[1].wallpaper?.wallpaperId).toBe('wp-damask-navy');
    useEditor.getState().setWallpaper('all', { wallpaperId: 'wp-linen', offsetU: 0, offsetV: 0 });
    expect(useEditor.getState().project!.walls.every((w) => w.wallpaper?.wallpaperId === 'wp-linen')).toBe(true);
    useEditor.getState().setWallpaper(1, null);
    expect(useEditor.getState().project!.walls[1].wallpaper).toBeNull();
  });

  it('kapıyı duvar üzerinde kaydırır ve duvar değiştirir', () => {
    const id = useEditor.getState().addItem('door', { wallIndex: 0, offset: 100 })!;
    useEditor.getState().moveOpening(id, 3, 5000);
    const d = useEditor.getState().project!.items[0] as OpeningItem;
    expect(d.wallIndex).toBe(3);
    expect(d.offset).toBe(500 - 45 - 5);
  });

  it('proje JSON olarak kaydedilip geri okunur', () => {
    useEditor.getState().addItem('bed-double');
    const p = useEditor.getState().project!;
    const back = parseProject(JSON.parse(serializeProject(p)));
    expect(back.items).toEqual(p.items);
    expect(back.room).toEqual(p.room);
  });
});
