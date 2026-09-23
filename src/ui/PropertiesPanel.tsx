import { useMemo } from 'react';
import { getFurniture } from '../catalog/furniture';
import { FLOOR_MATERIALS } from '../catalog/floors';
import { computeWalls, floorArea, roomSize } from '../core/geometry';
import type { FloorItem, OpeningItem } from '../core/types';
import { useEditor, useRoom, useSelectedItem } from '../store/editorStore';
import { RangeField, Section, Swatches } from './controls';
import { FurnitureGlyph, Icon } from './Icons';

function ItemActions({ id, locked, isOpening }: { id: string; locked?: boolean; isOpening: boolean }) {
  const { rotateItem, duplicateItem, removeItem, updateItem } = useEditor.getState();
  return (
    <div className="action-row">
      <button className="btn btn--ghost btn--sm" onClick={() => rotateItem(id, 90)} title={isOpening ? 'Açılış yönünü çevir (R)' : '90° döndür (R)'}>
        {isOpening ? <Icon.Flip /> : <Icon.Rotate />} {isOpening ? 'Çevir' : '90°'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={() => duplicateItem(id)} title="Çoğalt (Ctrl+D)"><Icon.Copy /> Çoğalt</button>
      <button className="btn btn--ghost btn--sm" onClick={() => updateItem(id, { locked: !locked })} title="Kilitle / kilidi aç">
        {locked ? <Icon.Lock /> : <Icon.Unlock />} {locked ? 'Kilitli' : 'Kilitle'}
      </button>
      <button className="btn btn--ghost btn--sm danger" onClick={() => removeItem(id)} title="Sil (Delete)"><Icon.Trash /> Sil</button>
    </div>
  );
}

function FloorItemProps({ item }: { item: FloorItem }) {
  const def = getFurniture(item.catalogId)!;
  const { room } = useRoom();
  const { updateItem, checkpoint } = useEditor.getState();
  const size = (k: 'w' | 'd' | 'h') => (v: number, t: boolean) => updateItem(item.id, { size: { ...item.size, [k]: v } }, t);
  const dims = roomSize(room);
  return (
    <>
      <Section title="Ölçüler">
        <RangeField label="Genişlik" value={item.size.w} min={def.minSize.w} max={def.maxSize.w} onBegin={checkpoint} onChange={size('w')} disabled={item.locked} />
        <RangeField label="Derinlik" value={item.size.d} min={def.minSize.d} max={def.maxSize.d} onBegin={checkpoint} onChange={size('d')} disabled={item.locked} />
        <RangeField label="Yükseklik" value={item.size.h} min={def.minSize.h} max={Math.min(def.maxSize.h, room.height)} onBegin={checkpoint} onChange={size('h')} disabled={item.locked} />
      </Section>
      <Section title="Konum">
        <RangeField label="Döndürme" unit="°" value={item.rotation} min={0} max={359} onBegin={checkpoint} onChange={(v, t) => updateItem(item.id, { rotation: v }, t)} disabled={item.locked} />
        <RangeField label="Soldan (X)" value={item.position.x} min={0} max={dims.width} onBegin={checkpoint} onChange={(v, t) => updateItem(item.id, { position: { ...item.position, x: v } }, t)} disabled={item.locked} />
        <RangeField label="Arkadan (Z)" value={item.position.z} min={0} max={dims.length} onBegin={checkpoint} onChange={(v, t) => updateItem(item.id, { position: { ...item.position, z: v } }, t)} disabled={item.locked} />
        {(def.placement === 'wall' || item.elevation > 0) && (
          <RangeField label="Yerden yükseklik" value={item.elevation} min={0} max={room.height - item.size.h} onBegin={checkpoint} onChange={(v, t) => updateItem(item.id, { elevation: v }, t)} disabled={item.locked} />
        )}
      </Section>
    </>
  );
}

function OpeningProps({ item }: { item: OpeningItem }) {
  const def = getFurniture(item.catalogId)!;
  const { room } = useRoom();
  const walls = useMemo(() => computeWalls(room), [room]);
  const { updateItem, moveOpening, checkpoint } = useEditor.getState();
  const wall = walls[item.wallIndex];
  const size = (k: 'w' | 'h') => (v: number, t: boolean) => updateItem(item.id, { size: { ...item.size, [k]: v } }, t);
  return (
    <>
      <Section title="Duvar">
        <div className="wall-chips">
          {walls.map((w) => (
            <button key={w.index} className={`wall-chip ${w.index === item.wallIndex ? 'is-active' : ''}`} onClick={() => moveOpening(item.id, w.index, w.length / 2)} disabled={item.locked}>
              <span>{w.label}</span>
            </button>
          ))}
        </div>
        <RangeField label="Duvar başından" value={item.offset - item.size.w / 2} min={0} max={wall.length - item.size.w} onBegin={checkpoint}
          onChange={(v, t) => moveOpening(item.id, item.wallIndex, v + item.size.w / 2, t)} disabled={item.locked} />
        <RangeField label="Yerden yükseklik" value={item.elevation} min={0} max={room.height - item.size.h} onBegin={checkpoint}
          onChange={(v, t) => updateItem(item.id, { elevation: v }, t)} disabled={item.locked} />
      </Section>
      <Section title="Ölçüler">
        <RangeField label="Genişlik" value={item.size.w} min={def.minSize.w} max={Math.min(def.maxSize.w, wall.length - 10)} onBegin={checkpoint} onChange={size('w')} disabled={item.locked} />
        <RangeField label="Yükseklik" value={item.size.h} min={def.minSize.h} max={Math.min(def.maxSize.h, room.height - 2)} onBegin={checkpoint} onChange={size('h')} disabled={item.locked} />
      </Section>
    </>
  );
}

function RoomSettings() {
  const project = useRoom();
  const snap = useEditor((s) => s.snapToWall);
  const meas = useEditor((s) => s.showMeasurements);
  const { setFloorMaterial, openRoomDialog, toggleSnap, toggleMeasurements, setWallPaint } = useEditor.getState();
  const dims = roomSize(project.room);
  const walls = computeWalls(project.room);
  const wallArea = walls.reduce((a, w) => a + w.length * project.room.height, 0) / 10000;
  return (
    <>
      <Section title={`Oda · ${project.room.name}`} actions={<button className="btn btn--ghost btn--sm" onClick={() => openRoomDialog('edit')}><Icon.Ruler /> Düzenle</button>}>
        <dl className="stats">
          <dt>Ölçüler</dt><dd>{dims.width} × {dims.length} cm</dd>
          <dt>Tavan yüksekliği</dt><dd>{project.room.height} cm</dd>
          <dt>Zemin alanı</dt><dd>{(floorArea(project.room) / 10000).toFixed(2)} m²</dd>
          <dt>Brüt duvar alanı</dt><dd>{wallArea.toFixed(2)} m²</dd>
          <dt>Eşya sayısı</dt><dd>{project.items.length}</dd>
        </dl>
        <button className="btn btn--ghost btn--sm" onClick={() => openRoomDialog('add')}><Icon.Home /> Yanına oda ekle</button>
      </Section>
      <Section title="Zemin">
        <div className="floor-grid">
          {FLOOR_MATERIALS.map((f) => (
            <button key={f.id} className={`floor-opt ${project.floor.materialId === f.id ? 'is-active' : ''}`} onClick={() => setFloorMaterial(f.id)}>
              <span style={{ background: f.swatch }} />
              {f.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Tüm duvarların boyası">
        <Swatches colors={['#ece8e1', '#ffffff', '#e8e0d2', '#d9d4ca', '#c9d3cf', '#d6dde6', '#e9d8cf', '#7d8a86']} value={project.walls[0]?.paintColor} onChange={(c) => setWallPaint('all', c)} />
      </Section>
      <Section title="Düzenleme">
        <label className="check"><input type="checkbox" checked={snap} onChange={toggleSnap} /><span><Icon.Magnet size={14} /> Duvara yapıştır</span></label>
        <label className="check"><input type="checkbox" checked={meas} onChange={toggleMeasurements} /><span><Icon.Ruler size={14} /> Ölçüleri göster</span></label>
        <p className="muted small">Kısayollar: Delete sil · R döndür · Ctrl+D çoğalt · Ok tuşları 1 cm (Shift ile 10 cm) · Ctrl+Z / Ctrl+Y · Esc seçimi kaldır</p>
      </Section>
    </>
  );
}

export function PropertiesPanel() {
  const item = useSelectedItem();
  const selection = useEditor((s) => s.selection);
  const { updateItem, setPanel, select } = useEditor.getState();

  if (item) {
    const def = getFurniture(item.catalogId);
    if (!def) return null;
    return (
      <div className="panel">
        <div className="item-head">
          <span className="item-head__glyph"><FurnitureGlyph model={def.model} size={30} /></span>
          <div>
            <strong>{item.name || def.name}</strong>
            <small>{item.kind === 'opening' ? 'Duvar açıklığı' : def.placement === 'wall' ? 'Duvara monte' : 'Zemin eşyası'}</small>
          </div>
          <button className="icon-btn" onClick={() => select(null)} aria-label="Seçimi kaldır"><Icon.Close /></button>
        </div>
        <ItemActions id={item.id} locked={item.locked} isOpening={item.kind === 'opening'} />
        <Section title={def.colorSlots?.[0] ? `Renk – ${def.colorSlots[0]}` : 'Renk'}>
          <Swatches colors={def.colors} value={item.color ?? def.colors[0]} onChange={(c) => updateItem(item.id, { color: c })} label={def.colorSlots?.[0]} />
        </Section>
        {def.colorSlots?.[1] && (
          <Section title={`Renk – ${def.colorSlots[1]}`}>
            <Swatches colors={def.colors2 ?? []} value={item.color2 ?? def.colors2?.[0]} onChange={(c) => updateItem(item.id, { color2: c })} label={def.colorSlots[1]} />
          </Section>
        )}
        {item.kind === 'floor' ? <FloorItemProps item={item} /> : <OpeningProps item={item} />}
      </div>
    );
  }

  if (selection?.type === 'wall') {
    return (
      <div className="panel">
        <p className="hint">Duvar seçili. Duvar kağıdı uygulamak için:</p>
        <button className="btn btn--primary btn--block" onClick={() => setPanel('wallpaper', true)}><Icon.Paint /> Duvar kağıdı kataloğu</button>
        <RoomSettings />
      </div>
    );
  }

  return (
    <div className="panel">
      <RoomSettings />
    </div>
  );
}
