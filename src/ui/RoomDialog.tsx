import { useState, type ChangeEvent, type FormEvent } from 'react';
import { roomSize } from '../core/geometry';
import { SIDE_LABELS, type Side } from '../core/house';
import { activeRoom, ROOM_LIMITS, validateRoomInput } from '../core/project';
import { useEditor } from '../store/editorStore';

const PRESETS = [
  { name: 'Yatak odası', width: 350, length: 400, height: 260 },
  { name: 'Salon', width: 450, length: 560, height: 260 },
  { name: 'Mutfak', width: 300, length: 350, height: 260 },
  { name: 'Çocuk odası', width: 300, length: 320, height: 260 },
  { name: 'Banyo', width: 200, length: 250, height: 250 },
];

/** Yeni ev/oda oluşturma, mevcut odanın ölçülerini değiştirme veya yanına oda ekleme. */
export function RoomDialog({ mode }: { mode: 'new' | 'edit' | 'add' }) {
  const project = useEditor((s) => s.project);
  const newProject = useEditor((s) => s.newProject);
  const resize = useEditor((s) => s.resizeRoom);
  const addRoom = useEditor((s) => s.addRoom);
  const openDialog = useEditor((s) => s.openRoomDialog);
  const ref = project ? activeRoom(project) : null;
  const initial =
    mode === 'edit' && ref
      ? { name: ref.room.name, ...roomSize(ref.room), height: ref.room.height }
      : mode === 'add' && ref
        ? { name: `Oda ${(project?.rooms.length ?? 0) + 1}`, width: 350, length: roomSize(ref.room).length, height: ref.room.height }
        : { name: 'Salon', width: 400, length: 450, height: 260 };
  const [form, setForm] = useState(initial);
  const [side, setSide] = useState<Side>('right');
  const [align, setAlign] = useState<'start' | 'center' | 'end'>('start');
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateRoomInput(form);
    setErrors(errs);
    if (errs.length) return;
    if (mode === 'edit') resize(form);
    else if (mode === 'add') addRoom(form, side, align);
    else newProject(form);
  };

  const num = (k: 'width' | 'length' | 'height') => ({
    value: Number.isFinite(form[k]) ? form[k] : '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) }),
  });

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="room-dlg-title">
      <form className="modal__card" onSubmit={submit}>
        <h2 id="room-dlg-title">{mode === 'edit' ? 'Oda ölçülerini düzenle' : mode === 'add' ? `"${ref?.room.name}" odasının yanına oda ekle` : 'Yeni proje: ilk oda'}</h2>
        <p className="muted">
          {mode === 'add'
            ? 'Yeni oda seçtiğiniz tarafa, ortak duvar paylaşılacak şekilde yerleştirilir. Sonra "Odalar" sekmesinden konumunu ince ayarlayabilirsiniz.'
            : 'Odanın iç ölçülerini santimetre olarak girin. Sahne bu ölçülerde gerçek ölçekli oluşturulur. Diğer odaları sonra yanına ekleyebilirsiniz.'}
        </p>
        {mode === 'add' && (
          <>
            <div className="side-picker" role="radiogroup" aria-label="Yerleşim">
              {(['back', 'left', 'right', 'front'] as Side[]).map((sd) => (
                <button type="button" key={sd} role="radio" aria-checked={side === sd} className={`side-picker__btn side-picker__btn--${sd} ${side === sd ? 'is-active' : ''}`} onClick={() => setSide(sd)}>
                  {SIDE_LABELS[sd]}
                </button>
              ))}
              <span className="side-picker__ref">{ref?.room.name}</span>
            </div>
            <label className="input">
              <span>Hizalama</span>
              <select value={align} onChange={(e) => setAlign(e.target.value as typeof align)}>
                <option value="start">{side === 'left' || side === 'right' ? 'Arka duvarlar hizalı' : 'Sol duvarlar hizalı'}</option>
                <option value="center">Ortalı</option>
                <option value="end">{side === 'left' || side === 'right' ? 'Ön duvarlar hizalı' : 'Sağ duvarlar hizalı'}</option>
              </select>
            </label>
          </>
        )}
        {mode !== 'edit' && (
          <div className="chips">
            {PRESETS.map((p) => (
              <button type="button" key={p.name} className="chip" onClick={() => setForm({ ...p })}>
                {p.name} <small>{p.width}×{p.length}</small>
              </button>
            ))}
          </div>
        )}
        <label className="input">
          <span>Oda adı</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} />
        </label>
        <div className="grid3">
          <label className="input">
            <span>Genişlik (cm)</span>
            <input type="number" min={ROOM_LIMITS.minSide} max={ROOM_LIMITS.maxSide} {...num('width')} required />
          </label>
          <label className="input">
            <span>Uzunluk (cm)</span>
            <input type="number" min={ROOM_LIMITS.minSide} max={ROOM_LIMITS.maxSide} {...num('length')} required />
          </label>
          <label className="input">
            <span>Yükseklik (cm)</span>
            <input type="number" min={ROOM_LIMITS.minHeight} max={ROOM_LIMITS.maxHeight} {...num('height')} required />
          </label>
        </div>
        <div className="room-preview" aria-hidden="true">
          <div style={{ aspectRatio: `${Math.max(1, form.width)} / ${Math.max(1, form.length)}` }}>
            <span className="rp-w">{form.width || 0} cm</span>
            <span className="rp-l">{form.length || 0} cm</span>
          </div>
        </div>
        {errors.length > 0 && (
          <ul className="errors">
            {errors.map((er) => (
              <li key={er}>{er}</li>
            ))}
          </ul>
        )}
        <div className="modal__actions">
          {project && (
            <button type="button" className="btn btn--ghost" onClick={() => openDialog(null)}>
              Vazgeç
            </button>
          )}
          <button type="submit" className="btn btn--primary">
            {mode === 'edit' ? 'Uygula' : mode === 'add' ? 'Odayı ekle' : 'Odayı oluştur'}
          </button>
        </div>
        {mode === 'edit' && <p className="muted small">Mevcut eşyalar ve duvar kağıtları korunur; oda dışına taşan eşyalar içeri alınır.</p>}
      </form>
    </div>
  );
}
