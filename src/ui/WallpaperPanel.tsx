import { useEffect, useMemo, useRef, useState } from 'react';
import { createCustomWallpaper } from '../catalog/wallpapers';
import { computeWalls } from '../core/geometry';
import { uid } from '../core/project';
import type { OpeningItem, WallpaperDef } from '../core/types';
import { estimateRolls, openingsAreaOnWall } from '../core/wallpaperMath';
import { findWallpaper, useAllWallpapers, useCatalog, useVisibleWallpapers } from '../store/catalogStore';
import { useEditor, useRoom } from '../store/editorStore';
import { useLibrary } from '../store/libraryStore';
import { makeWallpaperThumbnail } from '../three/textures';
import { RangeField, Section, Swatches } from './controls';
import { Icon } from './Icons';

const PAINTS = ['#ece8e1', '#ffffff', '#e8e0d2', '#d9d4ca', '#c9d3cf', '#d6dde6', '#e9d8cf', '#b9b2a6', '#7d8a86', '#44505c'];

// Küçük resimler sırayla üretilir (ana iş parçacığını kilitlememek için)
const thumbCache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
function useThumbnail(def: WallpaperDef): string | undefined {
  const key = `${def.id}:${def.tileWidthCm}x${def.tileHeightCm}`;
  const [url, setUrl] = useState(thumbCache.get(key));
  useEffect(() => {
    if (thumbCache.has(key)) {
      setUrl(thumbCache.get(key));
      return;
    }
    let alive = true;
    queue = queue
      .then(() => new Promise((r) => setTimeout(r, 0)))
      .then(() => makeWallpaperThumbnail(def))
      .then((u) => {
        thumbCache.set(key, u);
        if (alive) setUrl(u);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [def, key]);
  return url;
}

function WallpaperCard({ def, active, onPick }: { def: WallpaperDef; active: boolean; onPick: () => void }) {
  const thumb = useThumbnail(def);
  return (
    <button className={`wp-card ${active ? 'is-active' : ''}`} onClick={onPick} title={`${def.name} – desen ${def.tileWidthCm}×${def.tileHeightCm} cm`}>
      <span className="wp-card__img" style={{ backgroundColor: def.swatch, backgroundImage: thumb ? `url(${thumb})` : undefined }} />
      <span className="wp-card__name">{def.name}</span>
      {(def.brand || def.sku) && <span className="wp-card__meta">{[def.brand, def.sku].filter(Boolean).join(' · ')}</span>}
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
    // Tüm evin teklifi: aynı desen tüm odalarda birleştirilir (artan şeritler diğer duvarlarda kullanılır)
    const perWp = new Map<string, { wp: WallpaperDef; labels: string[]; strips: number; stripsPerRoll: number; net: number }>();
    for (const r of project.rooms) {
      const walls = computeWalls(r.room);
      const openings = r.items.filter((i): i is OpeningItem => i.kind === 'opening');
      const assignments = r.walls
        .map((w, i) => ({ wallIndex: i, wallpaper: w.wallpaper ? findWallpaper(w.wallpaper.wallpaperId, all) : undefined }))
        .filter((a): a is { wallIndex: number; wallpaper: WallpaperDef } => !!a.wallpaper);
      for (const a of assignments) {
        const est = estimateRolls(
          { wallWidthCm: walls[a.wallIndex].length, wallHeightCm: r.room.height, openingsAreaCm2: openingsAreaOnWall(a.wallIndex, openings) },
          a.wallpaper,
        );
        const g = perWp.get(a.wallpaper.id) ?? { wp: a.wallpaper, labels: [], strips: 0, stripsPerRoll: est.stripsPerRoll, net: 0 };
        g.labels.push(project.rooms.length > 1 ? `${r.room.name}: ${walls[a.wallIndex].label}` : walls[a.wallIndex].label);
        g.strips += est.strips;
        g.stripsPerRoll = Math.min(g.stripsPerRoll, est.stripsPerRoll);
        g.net += est.netAreaM2;
        perWp.set(a.wallpaper.id, g);
      }
    }
    return [...perWp.values()].map((g) => {
      const rolls = g.strips === 0 ? 0 : Math.ceil(g.strips / g.stripsPerRoll);
      return { ...g, rolls, total: g.wp.pricePerRoll != null ? rolls * g.wp.pricePerRoll : undefined };
    });
  }, [project, all]);
  if (!lines.length) return <p className="muted small">Henüz duvar kağıdı uygulanmadı.</p>;
  const total = lines.reduce((a, l) => a + (l.total ?? 0), 0);
  return (
    <div className="quote">
      {lines.map((l) => (
        <div key={l.wp.id} className="quote__line">
          <div>
            <strong>{l.wp.name}</strong>
            <small>{[l.wp.brand, l.wp.sku].filter(Boolean).join(' · ')}</small>
            <small>{l.labels.join(', ')} · {l.net.toFixed(1)} m²</small>
          </div>
          <div className="quote__qty">
            <strong>{l.rolls} rulo</strong>
            {l.total != null && <small>{formatMoney(l.total, l.wp.currency)}</small>}
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
  const doc = useRoom();
  const selection = useEditor((s) => s.selection);
  const { select, setWallpaper, setWallpaperOffset, setWallPaint, setView, checkpoint, removeCustomWallpaper } = useEditor.getState();
  const all = useAllWallpapers();
  const visible = useVisibleWallpapers();
  const brands = useLibrary((s) => s.brands);
  const showDemo = useLibrary((s) => s.showDemo);
  const openManager = useLibrary((s) => s.setManagerOpen);
  const status = useCatalog((s) => s.status);
  const error = useCatalog((s) => s.error);
  const [source, setSource] = useState<string>('all'); // 'all' | brandId | 'demo' | 'custom'
  const [collection, setCollection] = useState('Tümü');
  const [q, setQ] = useState('');
  const [applyAll, setApplyAll] = useState(false);

  const walls = useMemo(() => computeWalls(doc.room), [doc.room]);
  const wallIndex = selection?.type === 'wall' ? selection.index : null;
  const finish = wallIndex != null ? doc.walls[wallIndex] : null;
  const currentDef = finish?.wallpaper ? findWallpaper(finish.wallpaper.wallpaperId, all) : undefined;

  const bySource = useMemo(
    () =>
      visible.filter((w) =>
        source === 'all' ? true : source === 'custom' ? w.collection === 'Yüklenenler' : source === 'demo' ? !w.brandId && w.source.type === 'procedural' : w.brandId === source,
      ),
    [visible, source],
  );
  const collections = useMemo(() => ['Tümü', ...Array.from(new Set(bySource.map((w) => w.collection)))], [bySource]);
  const needle = q.trim().toLocaleLowerCase('tr');
  const list = bySource.filter(
    (w) =>
      (collection === 'Tümü' || w.collection === collection) &&
      (!needle || `${w.name} ${w.sku ?? ''} ${w.brand ?? ''} ${w.collection}`.toLocaleLowerCase('tr').includes(needle)),
  );
  const hasCustom = visible.some((w) => w.collection === 'Yüklenenler');

  const estimate = useMemo(() => {
    if (wallIndex == null || !currentDef) return null;
    const openings = doc.items.filter((i): i is OpeningItem => i.kind === 'opening');
    return estimateRolls(
      { wallWidthCm: walls[wallIndex].length, wallHeightCm: doc.room.height, openingsAreaCm2: openingsAreaOnWall(wallIndex, openings) },
      currentDef,
    );
  }, [wallIndex, currentDef, doc.items, doc.room.height, walls]);

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
      <Section title={`Duvar seçimi · ${doc.room.name}`}>
        <div className="wall-chips">
          {walls.map((w) => {
            const f = doc.walls[w.index];
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
          <span>Seçilen deseni odanın tüm duvarlarına uygula</span>
        </label>
      </Section>

      {currentDef && finish?.wallpaper && wallIndex != null && (
        <Section title="Uygulanan desen">
          <div className="wp-info">
            <strong>{currentDef.name}</strong>
            <small>{[currentDef.brand, currentDef.collection, currentDef.sku].filter(Boolean).join(' · ')}</small>
            <dl>
              <dt>Desen</dt><dd>{currentDef.tileWidthCm} × {currentDef.tileHeightCm} cm</dd>
              <dt>Rulo</dt><dd>{currentDef.rollWidthCm} cm × {(currentDef.rollLengthCm / 100).toFixed(2)} m</dd>
              <dt>Rapor</dt><dd>{currentDef.match === 'free' ? 'Serbest' : `${currentDef.patternRepeatCm} cm (${currentDef.match === 'offset' ? 'kaydırmalı' : 'düz'})`}</dd>
              {currentDef.pricePerRoll != null && (<><dt>Fiyat</dt><dd>{formatMoney(currentDef.pricePerRoll, currentDef.currency)} / rulo</dd></>)}
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

      <Section
        title="Duvar kağıdı kataloğu"
        actions={<button className="btn btn--ghost btn--sm" onClick={() => openManager(true)}><Icon.Folder /> Firma katalogları</button>}
      >
        {brands.length === 0 && (
          <div className="callout">
            <strong>Kendi firmalarınızın ürünlerini ekleyin</strong>
            <p className="small">Firma kataloğundaki desen görsellerini (ve isterseniz fiyat/ölçü listesini) yükleyin; burada yalnızca o ürünler listelenir.</p>
            <button className="btn btn--primary btn--sm" onClick={() => openManager(true)}><Icon.Upload /> Katalog yükle</button>
          </div>
        )}
        <div className="chips">
          <button className={`chip ${source === 'all' ? 'is-active' : ''}`} onClick={() => { setSource('all'); setCollection('Tümü'); }}>Tümü</button>
          {brands.map((b) => (
            <button key={b.id} className={`chip ${source === b.id ? 'is-active' : ''}`} onClick={() => { setSource(b.id); setCollection('Tümü'); }}>{b.name}</button>
          ))}
          {showDemo && <button className={`chip ${source === 'demo' ? 'is-active' : ''}`} onClick={() => { setSource('demo'); setCollection('Tümü'); }}>Demo</button>}
          {hasCustom && <button className={`chip ${source === 'custom' ? 'is-active' : ''}`} onClick={() => { setSource('custom'); setCollection('Tümü'); }}>Yüklenenler</button>}
        </div>
        {collections.length > 2 && (
          <select className="select" value={collection} onChange={(e) => setCollection(e.target.value)} aria-label="Koleksiyon">
            {collections.map((c) => <option key={c} value={c}>{c === 'Tümü' ? 'Tüm koleksiyonlar' : c}</option>)}
          </select>
        )}
        <div className="search">
          <Icon.Search />
          <input placeholder="Desen ara (ad, kod)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Desen ara" />
        </div>
        {status === 'loading' && <p className="muted">Katalog yükleniyor…</p>}
        {status === 'error' && <p className="errors">Katalog alınamadı: {error}</p>}
        {list.length === 0 && <p className="muted small">Bu filtrede desen yok.</p>}
        <div className="wp-grid">
          {list.map((d) => (
            <div key={d.id} className="wp-cell">
              <WallpaperCard def={d} active={currentDef?.id === d.id} onPick={() => pick(d)} />
              {d.collection === 'Yüklenenler' && (
                <button className="wp-cell__del" title="Deseni sil" onClick={() => removeCustomWallpaper(d.id)} aria-label="Deseni sil"><Icon.Close size={12} /></button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tek desen yükle (bu projeye)">
        <CustomUpload />
      </Section>

      {wallIndex != null && (
        <Section title="Boya rengi (kağıtsız duvar)">
          <Swatches colors={PAINTS} value={finish?.paintColor} onChange={(c) => setWallPaint(applyAll ? 'all' : wallIndex, c)} />
        </Section>
      )}

      <Section title="Teklif özeti (tüm ev)">
        <Quote />
      </Section>
    </div>
  );
}
