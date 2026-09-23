import { useEffect, useMemo, useRef, useState } from 'react';
import { templateCsv } from '../catalog/library/csv';
import type { ProductRecord } from '../catalog/library/db';
import {
  buildProducts,
  collectFiles,
  DEFAULT_IMPORT,
  exportBrandZip,
  planImport,
  type ImportDefaults,
  type ImportPlan,
} from '../catalog/library/importers';
import { useEditor } from '../store/editorStore';
import { useLibrary } from '../store/libraryStore';
import { slug } from '../store/persistence';
import { Icon } from './Icons';
import { formatMoney } from './WallpaperPanel';

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

function NumInput({ label, value, onChange, step = 1, suffix }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; suffix?: string }) {
  return (
    <label className="input">
      <span>{label}{suffix ? ` (${suffix})` : ''}</span>
      <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    </label>
  );
}

/** İçe aktarma: dosya seç → önizleme + varsayılanlar → kaydet */
function Importer({ brandId, onDone }: { brandId: string; onDone: () => void }) {
  const addProducts = useLibrary((s) => s.addProducts);
  const notify = useEditor((s) => s.notify);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [hasCsv, setHasCsv] = useState(false);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<ImportDefaults>(DEFAULT_IMPORT);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy('Dosyalar okunuyor…');
    try {
      const col = await collectFiles(Array.from(files));
      if (!col.images.length) throw new Error('Seçilen dosyalarda görsel bulunamadı (JPG/PNG/WebP veya içinde görsel olan ZIP seçin).');
      setHasCsv(!!col.rows?.length);
      setUnknown(col.unknownHeaders);
      setPlan(planImport(col.images, col.rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosyalar okunamadı');
    } finally {
      setBusy(null);
    }
  };

  const run = async () => {
    if (!plan) return;
    setBusy('Görseller işleniyor…');
    try {
      const { products, failed } = await buildProducts(plan, brandId, defaults, undefined, (d, t) => setBusy(`Görseller işleniyor… ${d}/${t}`));
      setBusy('Kaydediliyor…');
      await addProducts(products);
      notify(`${products.length} ürün eklendi${failed.length ? `, ${failed.length} görsel okunamadı` : ''}`);
      setPlan(null);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İçe aktarma başarısız');
    } finally {
      setBusy(null);
    }
  };

  const set = <K extends keyof ImportDefaults>(k: K, v: ImportDefaults[K]) => setDefaults((d) => ({ ...d, [k]: v }));

  return (
    <div className="importer">
      {!plan && (
        <>
          <button className="btn btn--primary btn--block" onClick={() => inputRef.current?.click()} disabled={!!busy}>
            <Icon.Upload /> Katalog dosyalarını seç
          </button>
          <p className="muted small">
            Desen görsellerini (JPG/PNG) toplu seçebilir, bunlara bir <strong>CSV</strong> ekleyebilir ya da hepsini tek bir <strong>ZIP</strong> olarak
            yükleyebilirsiniz. CSV'deki <code>gorsel</code> sütunu (veya ürün kodu) görsel dosya adıyla eşleştirilir.
          </p>
          <button className="btn btn--ghost btn--sm" onClick={() => download(new Blob([templateCsv()], { type: 'text/csv' }), 'katalog-sablonu.csv')}>
            <Icon.Download /> Şablon CSV indir
          </button>
        </>
      )}
      <input ref={inputRef} type="file" multiple hidden accept="image/*,.csv,.txt,.json,.zip,application/zip" onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />

      {plan && (
        <div className="import-plan">
          <div className="import-summary">
            <strong>{plan.items.length} ürün içe aktarılacak</strong>
            <small>{hasCsv ? 'CSV bilgileri kullanılacak; boş alanlarda aşağıdaki varsayılanlar geçerli.' : 'CSV yok: ürün adları dosya adlarından alınacak.'}</small>
            {plan.missingImages.length > 0 && <small className="warn">Görseli bulunamayan {plan.missingImages.length} satır atlanacak: {plan.missingImages.slice(0, 5).join(', ')}{plan.missingImages.length > 5 ? '…' : ''}</small>}
            {plan.unusedImages.length > 0 && <small className="warn">CSV'de karşılığı olmayan {plan.unusedImages.length} görsel atlanacak.</small>}
            {unknown.length > 0 && <small className="muted">Tanınmayan sütunlar yok sayıldı: {unknown.join(', ')}</small>}
          </div>
          <div className="plan-thumbs">
            {plan.items.slice(0, 12).map((it, i) => (
              <PlanThumb key={i} blob={it.image.blob} label={it.row.name ?? ''} />
            ))}
            {plan.items.length > 12 && <span className="muted small">+{plan.items.length - 12}</span>}
          </div>
          <h4>Varsayılanlar</h4>
          <div className="grid2">
            <label className="input">
              <span>Koleksiyon</span>
              <input value={defaults.collection} onChange={(e) => set('collection', e.target.value)} placeholder="Örn. 2026 Yaz" />
            </label>
            <NumInput label="Desen genişliği" suffix="cm" value={defaults.tileWidthCm} onChange={(v) => set('tileWidthCm', v ?? 53)} />
            <NumInput label="Rulo eni" suffix="cm" value={defaults.rollWidthCm} onChange={(v) => set('rollWidthCm', v ?? 53)} />
            <NumInput label="Rulo boyu" suffix="m" step={0.01} value={defaults.rollLengthCm / 100} onChange={(v) => set('rollLengthCm', Math.round((v ?? 10.05) * 100))} />
            <NumInput label="Desen raporu (0 = otomatik)" suffix="cm" value={defaults.patternRepeatCm} onChange={(v) => set('patternRepeatCm', v ?? 0)} />
            <label className="input">
              <span>Eşleşme</span>
              <select value={defaults.match} onChange={(e) => set('match', e.target.value as ImportDefaults['match'])}>
                <option value="straight">Düz</option>
                <option value="offset">Kaydırmalı</option>
                <option value="free">Serbest</option>
              </select>
            </label>
            <label className="input">
              <span>Yüzey</span>
              <select value={defaults.finish} onChange={(e) => set('finish', e.target.value as ImportDefaults['finish'])}>
                <option value="matte">Mat</option>
                <option value="satin">Saten</option>
                <option value="textured">Dokulu</option>
              </select>
            </label>
            <NumInput label="Rulo fiyatı" suffix={defaults.currency} value={defaults.price} onChange={(v) => set('price', v)} />
          </div>
          <p className="muted small">
            <strong>Desen genişliği</strong>, yüklenen görselin duvarda kapladığı gerçek genişliktir (genelde rulo eni, 53 cm). Yükseklik görsel oranından hesaplanır.
          </p>
          <div className="row gap">
            <button className="btn btn--ghost" onClick={() => setPlan(null)} disabled={!!busy}>Vazgeç</button>
            <button className="btn btn--primary" onClick={() => void run()} disabled={!!busy || plan.items.length === 0}>
              <Icon.Check /> İçe aktar
            </button>
          </div>
        </div>
      )}
      {busy && <div className="busy" role="status"><span className="spinner" /> {busy}</div>}
      {error && <div className="errors" role="alert">{error}</div>}
    </div>
  );
}

function PlanThumb({ blob, label }: { blob: Blob; label: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img className="plan-thumb" src={url} alt={label} title={label} />;
}

function ProductRow({ rec, url }: { rec: ProductRecord; url?: string }) {
  const update = useLibrary((s) => s.updateProduct);
  const remove = useLibrary((s) => s.removeProduct);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(rec.def);
  useEffect(() => setD(rec.def), [rec.def]);
  const save = () => {
    void update(rec.id, d);
    setOpen(false);
  };
  return (
    <div className={`prod ${open ? 'is-open' : ''}`}>
      <button className="prod__main" onClick={() => setOpen(!open)}>
        <span className="prod__img" style={{ backgroundImage: url ? `url(${url})` : undefined, backgroundColor: rec.def.swatch }} />
        <span className="prod__txt">
          <strong>{rec.def.name}</strong>
          <small>{[rec.def.sku, rec.def.collection, `${rec.def.tileWidthCm}×${rec.def.tileHeightCm} cm`].filter(Boolean).join(' · ')}</small>
        </span>
        {rec.def.pricePerRoll != null && <span className="prod__price">{formatMoney(rec.def.pricePerRoll, rec.def.currency)}</span>}
      </button>
      {open && (
        <div className="prod__edit">
          <div className="grid2">
            <label className="input"><span>Ad</span><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
            <label className="input"><span>Kod</span><input value={d.sku ?? ''} onChange={(e) => setD({ ...d, sku: e.target.value })} /></label>
            <label className="input"><span>Koleksiyon</span><input value={d.collection} onChange={(e) => setD({ ...d, collection: e.target.value })} /></label>
            <NumInput label="Fiyat" suffix={d.currency ?? 'TRY'} value={d.pricePerRoll} onChange={(v) => setD({ ...d, pricePerRoll: v })} />
            <NumInput label="Desen genişliği" suffix="cm" step={0.1} value={d.tileWidthCm} onChange={(v) => v && setD({ ...d, tileWidthCm: v })} />
            <NumInput label="Desen yüksekliği" suffix="cm" step={0.1} value={d.tileHeightCm} onChange={(v) => v && setD({ ...d, tileHeightCm: v })} />
            <NumInput label="Rulo eni" suffix="cm" value={d.rollWidthCm} onChange={(v) => v && setD({ ...d, rollWidthCm: v })} />
            <NumInput label="Rapor" suffix="cm" value={d.patternRepeatCm} onChange={(v) => setD({ ...d, patternRepeatCm: v ?? 0 })} />
          </div>
          <div className="row gap">
            <button className="btn btn--ghost btn--sm danger" onClick={() => void remove(rec.id)}><Icon.Trash /> Sil</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Kapat</button>
            <button className="btn btn--primary btn--sm" onClick={save}>Kaydet</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CatalogManager() {
  const open = useLibrary((s) => s.managerOpen);
  const setOpen = useLibrary((s) => s.setManagerOpen);
  const brands = useLibrary((s) => s.brands);
  const records = useLibrary((s) => s.records);
  const wallpapers = useLibrary((s) => s.wallpapers);
  const status = useLibrary((s) => s.status);
  const error = useLibrary((s) => s.error);
  const showDemo = useLibrary((s) => s.showDemo);
  const { addBrand, renameBrand, removeBrand, setShowDemo } = useLibrary.getState();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!brandId && brands.length) setBrandId(brands[0].id);
    if (brandId && !brands.some((b) => b.id === brandId)) setBrandId(brands[0]?.id ?? null);
  }, [brands, brandId]);

  const brand = brands.find((b) => b.id === brandId);
  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return records
      .filter((r) => r.brandId === brandId)
      .filter((r) => !needle || `${r.def.name} ${r.def.sku ?? ''} ${r.def.collection}`.toLocaleLowerCase('tr').includes(needle));
  }, [records, brandId, q]);
  const urls = useMemo(() => new Map(wallpapers.map((w) => [w.id, w.source.type === 'image' ? w.source.url : ''])), [wallpapers]);

  if (!open) return null;

  const create = async () => {
    const b = await addBrand(newName);
    setNewName('');
    setBrandId(b.id);
    setImporting(true);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal__card modal__card--wide">
        <div className="modal__head">
          <h2 id="cm-title">Firma katalogları</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Kapat"><Icon.Close /></button>
        </div>
        <p className="muted small">
          Çalıştığınız firmaların duvar kağıtlarını buraya ekleyin; duvar kağıdı panelinde yalnızca bu ürünler listelenir.
          Kataloglar bu tarayıcıda saklanır, ZIP olarak dışa aktarıp başka cihaza taşıyabilirsiniz.
        </p>
        {status === 'error' && <div className="errors">{error}</div>}

        <div className="cm">
          <aside className="cm__brands">
            {brands.map((b) => (
              <button key={b.id} className={`cm__brand ${b.id === brandId ? 'is-active' : ''}`} onClick={() => { setBrandId(b.id); setImporting(false); }}>
                <span>{b.name}</span>
                <small>{records.filter((r) => r.brandId === b.id).length}</small>
              </button>
            ))}
            <div className="cm__new">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Firma adı" onKeyDown={(e) => e.key === 'Enter' && newName.trim() && void create()} />
              <button className="btn btn--sm btn--primary" disabled={!newName.trim()} onClick={() => void create()}><Icon.Plus /> Ekle</button>
            </div>
            <label className="check small">
              <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} />
              <span>Demo desenleri de göster</span>
            </label>
          </aside>

          <section className="cm__body">
            {!brand && <p className="muted">Başlamak için soldan bir firma ekleyin.</p>}
            {brand && (
              <>
                <div className="cm__head">
                  <input className="cm__title" value={brand.name} onChange={(e) => void renameBrand(brand.id, e.target.value)} aria-label="Firma adı" />
                  <div className="row gap">
                    <button className="btn btn--sm btn--primary" onClick={() => setImporting(!importing)}><Icon.Upload /> Ürün ekle</button>
                    <button
                      className="btn btn--sm btn--ghost"
                      disabled={!list.length}
                      onClick={async () => download(await exportBrandZip(records.filter((r) => r.brandId === brand.id)), `${slug(brand.name)}-katalog.zip`)}
                    >
                      <Icon.Download /> ZIP
                    </button>
                    <button
                      className="btn btn--sm btn--ghost danger"
                      onClick={() => {
                        if (window.confirm(`"${brand.name}" ve tüm ürünleri silinsin mi?`)) void removeBrand(brand.id);
                      }}
                    >
                      <Icon.Trash />
                    </button>
                  </div>
                </div>
                {importing && <Importer brandId={brand.id} onDone={() => setImporting(false)} />}
                {!importing && records.some((r) => r.brandId === brand.id) && (
                  <div className="search">
                    <Icon.Search />
                    <input placeholder="Ürün ara (ad, kod, koleksiyon)" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                )}
                {!importing && list.length === 0 && !q && <p className="muted">Bu firmada henüz ürün yok. "Ürün ekle" ile görselleri veya katalog dosyasını yükleyin.</p>}
                <div className="prod-list">
                  {list.map((r) => (
                    <ProductRow key={r.id} rec={r} url={urls.get(r.id)} />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
