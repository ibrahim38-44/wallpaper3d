import { useRef, useState, type ReactNode } from 'react';
import { useEditor, type ViewMode } from '../store/editorStore';
import { downloadDataUrl, downloadProject, readProjectFile, slug } from '../store/persistence';
import { sceneBridge } from '../three/sceneBridge';
import { Segmented } from './controls';
import { Icon } from './Icons';

export function TopBar() {
  const project = useEditor((s) => s.project);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const view = useEditor((s) => s.view);
  const { undo, redo, setView, openRoomDialog, loadProject, notify } = useEditor.getState();
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const capture = async () => {
    const url = await sceneBridge.current.capture();
    if (!url) return;
    downloadDataUrl(url, `${slug(project?.name ?? 'oda')}-onizleme.png`);
    notify('Görüntü indirildi');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      loadProject(await readProjectFile(f));
      notify('Proje açıldı');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Dosya okunamadı');
    }
  };

  const views: { value: ViewMode; label: ReactNode; title: string }[] = [
    { value: 'perspective', label: <><Icon.Cube /> <span className="hide-sm">3D</span></>, title: '3D perspektif' },
    { value: 'top', label: <><Icon.Top /> <span className="hide-sm">Üstten</span></>, title: 'Üstten plan görünümü' },
    { value: 'wall', label: <><Icon.Wall /> <span className="hide-sm">Duvar</span></>, title: 'Seçili duvara karşıdan bak' },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">Wallpaper3D</span>
        {project && <span className="brand__project" title={project.name}>{project.name}</span>}
      </div>
      {project && (
        <div className="topbar__center">
          <div className="btn-group">
            <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Geri al (Ctrl+Z)" aria-label="Geri al"><Icon.Undo /></button>
            <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Yinele (Ctrl+Y)" aria-label="Yinele"><Icon.Redo /></button>
          </div>
          <Segmented label="Görünüm" options={views} value={view} onChange={setView} />
        </div>
      )}
      <div className="topbar__right">
        {project && (
          <button className="btn btn--primary btn--sm" onClick={capture} title="Müşteriye göndermek için yüksek çözünürlüklü görüntü indir">
            <Icon.Camera /> <span className="hide-sm">Görüntü al</span>
          </button>
        )}
        <div className="menu-wrap">
          <button className="icon-btn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Menü"><Icon.Menu /></button>
          {menu && (
            <div className="menu" role="menu" onClick={() => setMenu(false)}>
              <button role="menuitem" onClick={() => openRoomDialog('new')}><Icon.Plus /> Yeni oda</button>
              {project && <button role="menuitem" onClick={() => openRoomDialog('edit')}><Icon.Ruler /> Oda ölçülerini düzenle</button>}
              {project && <button role="menuitem" onClick={() => downloadProject(project)}><Icon.Download /> Projeyi kaydet (.json)</button>}
              <button role="menuitem" onClick={() => fileRef.current?.click()}><Icon.Folder /> Proje aç…</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
    </header>
  );
}
