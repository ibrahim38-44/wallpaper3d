import { useMemo, useState } from 'react';
import { floorArea, roomSize } from '../core/geometry';
import { roomsOverlap, SIDE_LABELS, type Side } from '../core/house';
import { useEditor } from '../store/editorStore';
import { RangeField, Section } from './controls';
import { Icon } from './Icons';

/** Ev planı: odaları listele, aktif odayı seç, yanına oda ekle, konumlandır. */
export function RoomsPanel() {
  const project = useEditor((s) => s.project!);
  const { setActiveRoom, openRoomDialog, renameRoom, removeRoom, moveRoom, checkpoint, setView, duplicateRoom, renameProject } = useEditor.getState();
  const active = project.rooms.find((r) => r.id === project.activeRoomId) ?? project.rooms[0];
  const [dupSide, setDupSide] = useState<Side>('right');
  // Kaydırıcı aralığı oda seçildiği andaki konuma göre sabitlenir (sürüklerken kaymasın)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => ({ ...active.origin }), [active.id]);

  const overlaps = useMemo(() => {
    const out = new Set<string>();
    for (const a of project.rooms) for (const b of project.rooms) if (a !== b && roomsOverlap(a, b)) out.add(a.id);
    return out;
  }, [project.rooms]);

  const totalArea = project.rooms.reduce((a, r) => a + floorArea(r.room), 0) / 10000;

  return (
    <div className="panel">
      <Section title="Proje">
        <label className="input">
          <span>Ev / proje adı</span>
          <input value={project.name} onChange={(e) => renameProject(e.target.value)} />
        </label>
        <p className="muted small">{project.rooms.length} oda · toplam {totalArea.toFixed(1)} m²</p>
        <div className="row gap">
          <button className="btn btn--primary btn--sm" onClick={() => openRoomDialog('add')}><Icon.Plus /> Yanına oda ekle</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setView('house')}><Icon.Cube /> Tüm evi gör</button>
        </div>
      </Section>

      <Section title="Odalar">
        <div className="room-list">
          {project.rooms.map((r) => {
            const d = roomSize(r.room);
            const isActive = r.id === active.id;
            return (
              <div key={r.id} className={`room-row ${isActive ? 'is-active' : ''}`}>
                <button className="room-row__main" onClick={() => { setActiveRoom(r.id); setView('perspective'); }}>
                  <span className="room-row__plan" style={{ aspectRatio: `${d.width} / ${d.length}` }} />
                  <span className="room-row__txt">
                    <strong>{r.room.name}</strong>
                    <small>{d.width} × {d.length} cm · {r.items.length} eşya</small>
                    {overlaps.has(r.id) && <small className="warn">Başka bir odayla çakışıyor</small>}
                  </span>
                </button>
                {isActive && <span className="room-row__badge">Düzenleniyor</span>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={`Seçili oda: ${active.room.name}`}>
        <label className="input">
          <span>Oda adı</span>
          <input value={active.room.name} onChange={(e) => renameRoom(active.id, e.target.value)} />
        </label>
        <div className="row gap">
          <button className="btn btn--ghost btn--sm" onClick={() => openRoomDialog('edit')}><Icon.Ruler /> Ölçüleri düzenle</button>
          {project.rooms.length > 1 && (
            <button
              className="btn btn--ghost btn--sm danger"
              onClick={() => {
                if (window.confirm(`"${active.room.name}" odası ve içindekiler silinsin mi?`)) removeRoom(active.id);
              }}
            >
              <Icon.Trash /> Odayı sil
            </button>
          )}
        </div>
        {project.rooms.length > 1 && (
          <>
            <p className="muted small">Ev planındaki konum (odanın sol-arka köşesi):</p>
            <RangeField label="Yatay (X)" value={active.origin.x} min={Math.round(base.x - 1000)} max={Math.round(base.x + 1000)} step={1} onBegin={checkpoint}
              onChange={(v, t) => moveRoom(active.id, { x: v, z: active.origin.z }, t)} />
            <RangeField label="Derinlik (Z)" value={active.origin.z} min={Math.round(base.z - 1000)} max={Math.round(base.z + 1000)} step={1} onBegin={checkpoint}
              onChange={(v, t) => moveRoom(active.id, { x: active.origin.x, z: v }, t)} />
          </>
        )}
        <div className="row gap">
          <select className="select select--sm" value={dupSide} onChange={(e) => setDupSide(e.target.value as Side)} aria-label="Kopyanın yeri">
            {(Object.keys(SIDE_LABELS) as Side[]).map((s) => <option key={s} value={s}>{SIDE_LABELS[s]}</option>)}
          </select>
          <button className="btn btn--ghost btn--sm" onClick={() => duplicateRoom(active.id, dupSide)}><Icon.Copy /> Odayı kopyala</button>
        </div>
      </Section>
      <p className="muted small">İpucu: 3D sahnede herhangi bir odaya dokunarak onu düzenlemeye geçebilirsiniz. İki oda arasındaki ortak duvara eklenen kapı her iki odada da açıklık oluşturur.</p>
    </div>
  );
}
