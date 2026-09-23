import { useMemo, useRef, useState } from 'react';
import { detectionsToItems } from '../ai/mapDetections';
import { extractVideoFrames, imageFileToAnalysisImage } from '../ai/media';
import { AnalysisError, catalogForAnalysis, HttpAnalysisProvider } from '../ai/provider';
import type { AnalysisImage, AnalysisResult } from '../ai/types';
import { getFurniture } from '../catalog/furniture';
import { computeWalls, roomSize } from '../core/geometry';
import { useEditor } from '../store/editorStore';
import { Section } from './controls';
import { FurnitureGlyph, Icon } from './Icons';

const MAX_IMAGES = 8;
const provider = new HttpAnalysisProvider();
const REL_LABEL = { back: 'arka duvar', right: 'sağ duvar', front: 'ön duvar', left: 'sol duvar' } as const;

export function AIPanel() {
  const project = useEditor((s) => s.project!);
  const { addItems, resizeRoom, notify } = useEditor.getState();
  const [images, setImages] = useState<AnalysisImage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [facing, setFacing] = useState(0);
  const [estimateRoom, setEstimateRoom] = useState(false);
  const [replace, setReplace] = useState(false);
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const walls = useMemo(() => computeWalls(project.room), [project.room]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    try {
      const out: AnalysisImage[] = [];
      for (const f of Array.from(files)) {
        if (f.type.startsWith('video/')) {
          setBusy('Videodan kareler çıkarılıyor…');
          out.push(...(await extractVideoFrames(f, 6, (d, t) => setBusy(`Videodan kareler çıkarılıyor… ${d}/${t}`))));
        } else if (f.type.startsWith('image/')) {
          setBusy('Fotoğraflar hazırlanıyor…');
          out.push(await imageFileToAnalysisImage(f));
        }
      }
      setImages((prev) => [...prev, ...out].slice(0, MAX_IMAGES));
      if (images.length + out.length > MAX_IMAGES) notify(`En fazla ${MAX_IMAGES} görsel kullanılır`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı');
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    if (!images.length) return;
    setError(null);
    setResult(null);
    setBusy('Yapay zekâ odayı analiz ediyor… (20–60 sn)');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const dims = roomSize(project.room);
    try {
      const res = await provider.analyze(
        {
          images: images.map(({ mediaType, data }) => ({ mediaType, data })),
          room: { widthCm: dims.width, lengthCm: dims.length, heightCm: project.room.height },
          estimateRoom,
          catalog: catalogForAnalysis(),
          notes: notes.trim() || undefined,
        },
        ctrl.signal,
      );
      setResult(res);
      setChecked(new Set(res.items.map((it, i) => (it.confidence >= 0.45 ? i : -1)).filter((i) => i >= 0)));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof AnalysisError || e instanceof Error ? e.message : 'Analiz başarısız');
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  };

  const apply = () => {
    if (!result) return;
    const room = useEditor.getState().project!.room;
    const selected = result.items.filter((_, i) => checked.has(i));
    const items = detectionsToItems(selected, room, facing);
    addItems(items, replace ? { replaceFurniture: true, replaceOpenings: items.some((n) => n.kind === 'opening') } : undefined);
    notify(`${items.length} eşya eklendi – hepsini sürükleyerek düzeltebilirsiniz`);
  };

  const applyRoom = () => {
    const r = result?.roomEstimate;
    if (!r) return;
    const sideways = facing % 2 === 1; // ilk foto yan duvara bakıyorsa genişlik/uzunluk yer değiştirir
    resizeRoom({
      width: Math.round(sideways ? r.lengthCm : r.widthCm),
      length: Math.round(sideways ? r.widthCm : r.lengthCm),
      height: Math.round(r.heightCm),
    });
    notify('Oda ölçüleri güncellendi');
  };

  return (
    <div className="panel">
      <Section title="Fotoğraf / video ile eşya tespiti">
        <p className="muted small">
          Odanın birkaç fotoğrafını veya kısa bir videosunu yükleyin. Yapay zekâ eşyaları ve yaklaşık konumlarını önerir;
          siz onayladıklarınız eklenir ve her şeyi elle düzeltebilirsiniz.
        </p>
        <button className="btn btn--ghost btn--block" onClick={() => inputRef.current?.click()} disabled={!!busy}>
          <Icon.Upload /> Fotoğraf veya video seç
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
        {images.length > 0 && (
          <div className="thumbs">
            {images.map((im, i) => (
              <div key={i} className="thumb">
                <img src={im.preview} alt={im.label ?? `Görsel ${i + 1}`} />
                {i === 0 && <span className="thumb__tag">1.</span>}
                <button aria-label="Kaldır" onClick={() => setImages(images.filter((_, j) => j !== i))}><Icon.Close size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {images.length > 0 && (
        <Section title="Yön bilgisi">
          <p className="muted small">İlk görselde kameranın tam karşısında hangi duvar var?</p>
          <div className="wall-chips">
            {walls.map((w) => (
              <button key={w.index} className={`wall-chip ${facing === w.index ? 'is-active' : ''}`} onClick={() => setFacing(w.index)}>
                <span>{w.label}</span>
              </button>
            ))}
          </div>
          <label className="check"><input type="checkbox" checked={estimateRoom} onChange={(e) => setEstimateRoom(e.target.checked)} /><span>Oda ölçülerini de tahmin et</span></label>
          <label className="input">
            <span>Not (isteğe bağlı)</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Örn. pencere sol duvarda, yatak 160 cm" />
          </label>
          {busy ? (
            <button className="btn btn--ghost btn--block" onClick={() => abortRef.current?.abort()}>İptal</button>
          ) : (
            <button className="btn btn--primary btn--block" onClick={() => void analyze()}><Icon.Sparkle /> Analiz et</button>
          )}
        </Section>
      )}

      {busy && <div className="busy" role="status"><span className="spinner" /> {busy}</div>}
      {error && <div className="errors" role="alert">{error}</div>}

      {result && (
        <Section title="Öneriler">
          {result.summary && <p className="small">{result.summary}</p>}
          {result.warnings?.map((w) => <p key={w} className="muted small">⚠ {w}</p>)}
          {result.roomEstimate && (
            <div className="ai-room">
              <div>
                <strong>Tahmini oda</strong>
                <small>{Math.round(result.roomEstimate.widthCm)} × {Math.round(result.roomEstimate.lengthCm)} × {Math.round(result.roomEstimate.heightCm)} cm · %{Math.round(result.roomEstimate.confidence * 100)} güven</small>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={applyRoom}>Uygula</button>
            </div>
          )}
          {result.items.length === 0 && <p className="muted">Eşya tespit edilemedi. Daha geniş açılı, aydınlık fotoğraflar deneyin.</p>}
          <ul className="ai-list">
            {result.items.map((it, i) => {
              const def = getFurniture(it.catalogId);
              if (!def) return null;
              const on = checked.has(i);
              return (
                <li key={i} className={on ? 'is-on' : ''}>
                  <label>
                    <input type="checkbox" checked={on} onChange={() => {
                      const n = new Set(checked);
                      if (on) n.delete(i); else n.add(i);
                      setChecked(n);
                    }} />
                    <FurnitureGlyph model={def.model} size={26} />
                    <span className="ai-list__txt">
                      <strong>{it.label || def.name}</strong>
                      <small>
                        {def.name}
                        {it.wall ? ` · ${REL_LABEL[it.wall]}` : ''}
                        {it.sizeCm ? ` · ${Math.round(it.sizeCm.w)}×${Math.round(it.sizeCm.d)}` : ''}
                      </small>
                    </span>
                    <span className={`conf ${it.confidence >= 0.7 ? 'hi' : it.confidence >= 0.45 ? 'mid' : 'lo'}`}>%{Math.round(it.confidence * 100)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {result.items.length > 0 && (
            <>
              <label className="check"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /><span>Önce mevcut eşyaları kaldır</span></label>
              <button className="btn btn--primary btn--block" disabled={!checked.size} onClick={apply}>
                <Icon.Plus /> Seçilenleri odaya ekle ({checked.size})
              </button>
            </>
          )}
        </Section>
      )}
    </div>
  );
}
