import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, FURNITURE, type FurnitureCategory } from '../catalog/furniture';
import { useEditor } from '../store/editorStore';
import { FurnitureGlyph, Icon } from './Icons';

const ORDER: FurnitureCategory[] = ['yapi', 'yatak', 'oturma', 'sandalye', 'yemek-calisma', 'mutfak', 'banyo', 'dekor'];

export function LibraryPanel() {
  const addItem = useEditor((s) => s.addItem);
  const setSheetOpen = useEditor((s) => s.setSheetOpen);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<FurnitureCategory | 'all'>('all');

  const groups = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    const list = FURNITURE.filter(
      (f) =>
        (cat === 'all' || f.category === cat) &&
        (!needle || f.name.toLocaleLowerCase('tr').includes(needle) || f.keywords?.some((k) => k.includes(needle))),
    );
    return ORDER.map((c) => ({ cat: c, items: list.filter((f) => f.category === c) })).filter((g) => g.items.length);
  }, [q, cat]);

  const add = (id: string) => {
    addItem(id);
    // mobilde eklendikten sonra sahneyi göster
    if (window.matchMedia('(max-width: 900px)').matches) setSheetOpen(false);
  };

  return (
    <div className="panel">
      <div className="search">
        <Icon.Search />
        <input placeholder="Eşya ara (yatak, dolap…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Eşya ara" />
      </div>
      <div className="chips">
        <button className={`chip ${cat === 'all' ? 'is-active' : ''}`} onClick={() => setCat('all')}>Tümü</button>
        {ORDER.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'is-active' : ''}`} onClick={() => setCat(c)}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>
      <p className="hint">Karta tıklayın ya da sahneye sürükleyip bırakın.</p>
      {groups.map((g) => (
        <div key={g.cat} className="lib-group">
          <h4>{CATEGORY_LABELS[g.cat]}</h4>
          <div className="lib-grid">
            {g.items.map((f) => (
              <button
                key={f.id}
                className="lib-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-wallpaper3d-item', f.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => add(f.id)}
                title={`${f.name} – ${f.defaultSize.w}×${f.defaultSize.d}×${f.defaultSize.h} cm`}
              >
                <span className="lib-card__glyph"><FurnitureGlyph model={f.model} /></span>
                <span className="lib-card__name">{f.name}</span>
                <span className="lib-card__dim">{f.defaultSize.w}×{f.placement === 'opening' ? f.defaultSize.h : f.defaultSize.d}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!groups.length && <p className="muted">Sonuç bulunamadı.</p>}
    </div>
  );
}
