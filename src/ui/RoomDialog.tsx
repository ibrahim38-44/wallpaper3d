import { useState, type ChangeEvent, type FormEvent } from 'react';
import { roomSize } from '../core/geometry';
import { ROOM_LIMITS, validateRoomInput } from '../core/project';
import { useEditor } from '../store/editorStore';

const PRESETS = [
  { name: 'Yatak odası', width: 350, length: 400, height: 260 },
  { name: 'Salon', width: 450, length: 560, height: 260 },
  { name: 'Mutfak', width: 300, length: 350, height: 260 },
  { name: 'Çocuk odası', width: 300, length: 320, height: 260 },
  { name: 'Banyo', width: 200, length: 250, height: 250 },
];

/** Yeni oda oluşturma veya mevcut odanın ölçülerini değiştirme. */
export function RoomDialog({ mode }: { mode: 'new' | 'edit' }) {
  const project = useEditor((s) => s.project);
  const newProject = useEditor((s) => s.newProject);
  const resize = useEditor((s) => s.resizeRoom);
  const openDialog = useEditor((s) => s.openRoomDialog);
  const initial = mode === 'edit' && project
    ? { name: project.room.name, ...roomSize(project.room), height: project.room.height }
    : { name: 'Odam', width: 400, length: 450, height: 260 };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateRoomInput(form);
    setErrors(errs);
    if (errs.length) return;
    if (mode === 'edit') resize(form);
    else newProject(form);
  };

  const num = (k: 'width' | 'length' | 'height') => ({
    value: Number.isFinite(form[k]) ? form[k] : '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) }),
  });

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="room-dlg-title">
      <form className="modal__card" onSubmit={submit}>
        <h2 id="room-dlg-title">{mode === 'edit' ? 'Oda ölçülerini düzenle' : 'Yeni oda oluştur'}</h2>
        <p className="muted">Odanın iç ölçülerini santimetre olarak girin. Sahne bu ölçülerde gerçek ölçekli oluşturulur.</p>
        {mode === 'new' && (
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
            {mode === 'edit' ? 'Uygula' : 'Odayı oluştur'}
          </button>
        </div>
        {mode === 'edit' && <p className="muted small">Mevcut eşyalar ve duvar kağıtları korunur; oda dışına taşan eşyalar içeri alınır.</p>}
      </form>
    </div>
  );
}
