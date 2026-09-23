import { useEffect, useMemo, useRef, useState } from 'react';
import { createCustomWallpaper } from '../catalog/wallpapers';
import { computeWalls } from '../core/geometry';
import { uid } from '../core/project';
import type { OpeningItem, WallpaperDef } from '../core/types';
import { buildQuote, estimateRolls, openingsAreaOnWall } from '../core/wallpaperMath';
import { findWallpaper, useAllWallpapers, useCatalog } from '../store/catalogStore';
import { useEditor } from '../store/editorStore';
import { makeWallpaperThumbnail } from '../three/textures';
import { RangeField, Section, Swatches } from './controls';
import { Icon } from './Icons';

const PAINTS = ['#ece8e1', '#ffffff', '#e8e0d2', '#d9d4ca', '#c9d3cf', '#d6dde6', '#e9d8cf', '#b9b2a6', '#7d8a86', '#44505c'];

// Küçük resimler sırayla üretilir (ana iş parçacığını kilitlememek için)
const thumbCache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
function useThumbnail(def: WallpaperDef): string | undefined {
  const [url, setUrl] = useState(thumbCache.get(def.id));
  useEffect(() => {
    if (thumbCache.has(def.id)) {
      setUrl(thumbCache.get(def.id));
      return;
    }
    let alive = true;
    queue = queue
      .then(() => new Promise((r) => setTimeout(r, 0)))
      .then(() => makeWallpaperThumbnail(def))
      .then((u) => {
        thumbCache.set(def.id, u);
        if (alive) setUrl(u);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [def]);
  return url;
}

function WallpaperCard({ def, active, onPick }: { def: WallpaperDef; active: boolean; onPick: () => void }) {
  const thumb = useThumbnail(def);
  return (
    <button className={`wp-card ${active ? 'is-active' : ''}`} onClick={onPick} title={`${def.name} – desen ${def.tileWidthCm}×${def.tileHeightCm} cm`}>
      <span className="wp-card__img" style={{ backgroundColor: def.swatch, backgroundImage: thumb ? `url(${thumb})` : undefined }} />
      <span className="wp-card__name">{def.name}</span>
      {def.pricePerRoll != null && <span className="wp-card__price">{formatMoney(def.pricePerRoll, def.currency)}/rulo</span>}
      {active && <span className="wp-card__check"><Icon.Check size={14} /></span>}
    </button>
  );
}

export function formatMoney(v: number, currency = 'TRY') {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

function CustomUpload() {
  const add = useEditor((s) => s.addCustomWallpaper);
  const notify = useEditor((s) => s.notify);
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(53);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    try {
      const { dataUrl, aspect } = await downscaleImage(file, 1024);
      const def = createCustomWallpaper({ id: uid('wpc'), name: name.trim() || file.name.replace(/\.[^.]+$/, ''), dataUrl, tileWidthCm: width, aspect });
      add(def);
      notify('Desen kataloğa eklendi');
      setFile(null);
      setName('');
    } catch {
      notify('Görsel okunamadı');
    }
  };

  return (
    <div className="upload">
      <p className="muted small">Kendi desen görselinizi (tek tekrar karosu) yükleyin ve gerçek genişliğini girin; yükseklik oranla hesaplanır.</p>
      <button className="btn btn--ghost btn--block" onClick={() => inputRef.current?.click()}>
        <Icon.Upload /> {file ? file.name : 'Görsel seç (JPG/PNG)'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      {file && (
        <>
          <label className="input">
            <span>Desen adı</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Mavi Çiçek" />
          </label>
          <label className="input">
            <span>Karo genişliği (cm)</span>
            <input type="number" min={5} max={300} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <button className="btn btn--primary btn--block" onClick={() => void submit()} disabled={!(width >= 5)}>Ekle</button>
        </>
      )}
    </div>
  );
}

async function downscaleImage(file: File, maxDim: number): Promise<{ dataUrl: string; aspect: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL('image/jpeg', 0.9), aspect: bmp.width / bmp.height };
}

function Quote() {
  const project = useEditor((s) => s.project!);
  const all = useAllWallpapers();
  const lines = useMemo(() => {
    const walls = computeWalls(project.room);
    const assignments = project.walls
      .map((w, i) => ({ wallIndex: i, wallpaper: w.wallpaper ? findWallpaper(w.wallpaper.wallpaperId, all) : undefined }))
      .filter((a): a is { wallIndex: number; wallpaper: WallpaperDef } => !!a.wallpaper);
    const openings = project.items.filter((i): i is OpeningItem => i.kind === 'opening');
    return { walls, list: buildQuote(walls, assignments, openings, project.room.height) };
  }, [project, all]);
  if (!lines.list.length) return <p className="muted small">Henüz duvar kağıdı uygulanmadı.</p>;
  const total = lines.list.reduce((a, l) => a + (l.total ?? 0), 0);
  return (
    <div className="quote">
      {lines.list.map((l) => (
        <div key={l.wallpaper.id} className="quote__line">
          <div>
            <strong>{l.wallpaper.name}</strong>
            <small>{l.walls.map((i) => lines.walls[i].label).join(', ')} · {l.netAreaM2.toFixed(1)} m²</small>
          </div>
          <div className="quote__qty">
            <strong>{l.rolls} rulo</strong>
            {l.total != null && <small>{formatMoney(l.total, l.wallpaper.currency)}</small>}
          </div>
        </div>
      ))}
      {total > 0 && (
        <div className="quote__total">
          <span>Tahmini toplam</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      )}
      <p className="muted small">Hesap; şerit yöntemi, desen raporu ve 10 cm kesim payı ile yapılır. Uygulama öncesi yerinde ölçü alınmalıdır.</p>
    </div>
  );
}

export function WallpaperPanel() {
  const project = useEditor((s) => s.project!);
  const selection = useEditor((s) => s.selection);
  const { select, setWallpaper, setWallpaperOffset, setWallPaint, setView, checkpoint, removeCustomWallpaper } = useEditor.getState();
  const all = useAllWallpapers();
  const status = useCatalog((s) => s.status);
  const error = useCatalog((s) => s.error);
  const [collection, setCollection] = useState('Tümü');
  const [applyAll, setApplyAll] = useState(false);

  const walls = useMemo(() => computeWalls(project.room), [project.room]);
  const wallIndex = selection?.type === 'wall' ? selection.index : null;
  const finish = wallIndex != null ? project.walls[wallIndex] : null;
  const currentDef = finish?.wallpaper ? findWallpaper(finish.wallpaper.wallpaperId, all) : undefined;

  const collections = useMemo(() => ['Tümü', ...Array.from(new Set(all.map((w) => w.collection)))], [all]);
  const visible = collection === 'Tümü' ? all : all.filter((w) => w.collection === collection);

  const estimate = useMemo(() => {
    if (wallIndex == null || !currentDef) return null;
    const openings = project.items.filter((i): i is OpeningItem => i.kind === 'opening');
    return estimateRolls(
      { wallWidthCm: walls[wallIndex].length, wallHeightCm: project.room.height, openingsAreaCm2: openingsAreaOnWall(wallIndex, openings) },
      currentDef,
    );
  }, [wallIndex, currentDef, project.items, project.room.height, walls]);

  const pick = (def: WallpaperDef) => {
    if (wallIndex == null && !applyAll) {
      select({ type: 'wall', index: 0 });
      setWallpaper(0, { wallpaperId: def.id, offsetU: 0, offsetV: 0 });
      return;
    }
    setWallpaper(applyAll ? 'all' : wallIndex!, { wallpaperId: def.id, offsetU: 0, offsetV: 0 });
  };

  return (
    <div className="panel">
      <Section title="Duvar seçimi">
        <div className="wall-chips">
          {walls.map((w) => {
            const f = project.walls[w.index];
            const d = f.wallpaper ? findWallpaper(f.wallpaper.wallpaperId, all) : undefined;
            return (
              <button key={w.index} className={`wall-chip ${wallIndex === w.index ? 'is-active' : ''}`} onClick={() => select({ type: 'wall', index: w.index })}>
                <span className="wall-chip__sw" style={{ background: d?.swatch ?? f.paintColor }} />
                <span>{w.label}</span>
                <small>{Math.round(w.length)} cm</small>
              </button>
            );
          })}
        </div>
        {wallIndex == null ? (
          <p className="hint">3D sahnede bir duvara dokunun veya yukarıdan seçin.</p>
        ) : (
          <div className="row gap">
            <button className="btn btn--ghost btn--sm" onClick={() => setView('wall')}><Icon.Focus /> Duvara odaklan</button>
            {finish?.wallpaper && (
              <button className="btn btn--ghost btn--sm danger" onClick={() => setWallpaper(wallIndex, null)}><Icon.Trash /> Kağıdı kaldır</button>
            )}
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
          <span>Seçilen deseni tüm duvarlara uygula</span>
        </label>
      </Section>

      {currentDef && finish?.wallpaper && wallIndex != null && (
        <Section title="Uygulanan desen">
          <div className="wp-info">
            <strong>{currentDef.name}</strong>
            <small>{currentDef.collection}{currentDef.sku ? ` · ${currentDef.sku}` : ''}</small>
            <dl>
              <dt>Desen</dt><dd>{currentDef.tileWidthCm} × {currentDef.tileHeightCm} cm</dd>
              <dt>Rulo</dt><dd>{currentDef.rollWidthCm} cm × {(currentDef.rollLengthCm / 100).toFixed(2)} m</dd>
              <dt>Rapor</dt><dd>{currentDef.match === 'free' ? 'Serbest' : `${currentDef.patternRepeatCm} cm (${currentDef.match === 'offset' ? 'kaydırmalı' : 'düz'})`}</dd>
              {estimate && (
                <>
                  <dt>Net alan</dt><dd>{estimate.netAreaM2.toFixed(2)} m²</dd>
                  <dt>İhtiyaç</dt><dd><strong>{estimate.rolls} rulo</strong> ({estimate.strips} şerit)</dd>
                </>
              )}
            </dl>
          </div>
          <RangeField label="Yatay hizalama" value={finish.wallpaper.offsetU} min={0} max={currentDef.tileWidthCm} step={0.5}
            onBegin={checkpoint} onChange={(v, t) => setWallpaperOffset(wallIndex, v, finish.wallpaper!.offsetV, t)} />
          <RangeField label="Dikey hizalama" value={finish.wallpaper.offsetV} min={0} max={currentDef.tileHeightCm} step={0.5}
            onBegin={checkpoint} onChange={(v, t) => setWallpaperOffset(wallIndex, finish.wallpaper!.offsetU, v, t)} />
        </Section>
      )}

      <Section title="Duvar kağıdı kataloğu">
        <div className="chips chips--scroll">
          {collections.map((c) => (
            <button key={c} className={`chip ${collection === c ? 'is-active' : ''}`} onClick={() => setCollection(c)}>{c}</button>
          ))}
        </div>
        {status === 'loading' && <p className="muted">Katalog yükleniyor…</p>}
        {status === 'error' && <p className="errors">Katalog alınamadı: {error}</p>}
        <div className="wp-grid">
          {visible.map((d) => (
            <div key={d.id} className="wp-cell">
              <WallpaperCard def={d} active={currentDef?.id === d.id} onPick={() => pick(d)} />
              {d.collection === 'Yüklenenler' && (
                <button className="wp-cell__del" title="Deseni sil" onClick={() => removeCustomWallpaper(d.id)} aria-label="Deseni sil"><Icon.Close size={12} /></button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Kendi deseninizi yükleyin">
        <CustomUpload />
      </Section>

      {wallIndex != null && (
        <Section title="Boya rengi (kağıtsız duvar)">
          <Swatches colors={PAINTS} value={finish?.paintColor} onChange={(c) => setWallPaint(applyAll ? 'all' : wallIndex, c)} />
        </Section>
      )}

      <Section title="Teklif özeti">
        <Quote />
      </Section>
    </div>
  );
}
