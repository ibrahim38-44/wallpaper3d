import { useEffect, type ComponentType } from 'react';
import { activeRoom } from './core/project';
import { useCatalog } from './store/catalogStore';
import { useEditor, useSelectedItem, type SidePanel } from './store/editorStore';
import { loadSavedProject, startAutosave } from './store/persistence';
import { Scene } from './three/Scene';
import { AIPanel } from './ui/AIPanel';
import { Icon } from './ui/Icons';
import { LibraryPanel } from './ui/LibraryPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { RoomDialog } from './ui/RoomDialog';
import { RoomsPanel } from './ui/RoomsPanel';
import { CatalogManager } from './ui/CatalogManager';
import { useLibrary } from './store/libraryStore';
import { Toast } from './ui/Toast';
import { TopBar } from './ui/TopBar';
import { WallpaperPanel } from './ui/WallpaperPanel';

type Tab = SidePanel;

const LEFT_TABS: { id: Tab; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'library', label: 'Eşyalar', icon: Icon.Sofa },
  { id: 'wallpaper', label: 'Duvar kağıdı', icon: Icon.Paint },
  { id: 'rooms', label: 'Odalar', icon: Icon.Home },
  { id: 'ai', label: 'AI analiz', icon: Icon.Sparkle },
];

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const s = useEditor.getState();
      if (!s.project) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      const sel = s.selection;
      if (e.key === 'Escape') s.select(null);
      if (sel?.type !== 'item') return;
      const item = activeRoom(s.project).items.find((i) => i.id === sel.id);
      if (!item) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        s.removeItem(item.id);
      } else if (e.key.toLowerCase() === 'r' && !mod) {
        s.rotateItem(item.id, e.shiftKey ? -90 : 90);
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.duplicateItem(item.id);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (item.kind === 'floor') {
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dz = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          s.updateItem(item.id, { position: { x: item.position.x + dx, z: item.position.z + dz } });
        } else {
          const du = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dv = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
          if (du) s.moveOpening(item.id, item.wallIndex, item.offset + du);
          if (dv) s.updateItem(item.id, { elevation: item.elevation + dv });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Mobilde seçili eşya için hızlı işlem çubuğu. */
function QuickBar() {
  const item = useSelectedItem();
  const { rotateItem, duplicateItem, removeItem, setPanel } = useEditor.getState();
  if (!item) return null;
  return (
    <div className="quickbar" role="toolbar" aria-label="Seçili eşya">
      <button onClick={() => rotateItem(item.id, 90)} aria-label="Döndür">{item.kind === 'opening' ? <Icon.Flip /> : <Icon.Rotate />}</button>
      <button onClick={() => duplicateItem(item.id)} aria-label="Çoğalt"><Icon.Copy /></button>
      <button onClick={() => setPanel('room', true)} aria-label="Özellikler"><Icon.Sliders /></button>
      <button className="danger" onClick={() => removeItem(item.id)} aria-label="Sil"><Icon.Trash /></button>
    </div>
  );
}

function PanelContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'library':
      return <LibraryPanel />;
    case 'wallpaper':
      return <WallpaperPanel />;
    case 'ai':
      return <AIPanel />;
    case 'rooms':
      return <RoomsPanel />;
    default:
      return <PropertiesPanel />;
  }
}

export default function App() {
  const hasProject = useEditor((s) => !!s.project);
  const roomDialog = useEditor((s) => s.roomDialog);
  const panel = useEditor((s) => s.panel);
  const sheetOpen = useEditor((s) => s.sheetOpen);
  const interacting = useEditor((s) => s.interacting);
  const { setPanel, setSheetOpen, loadProject, openRoomDialog } = useEditor.getState();

  useEffect(() => {
    void useCatalog.getState().load();
    void useLibrary.getState().load();
    const saved = loadSavedProject();
    if (saved) loadProject(saved);
    else openRoomDialog('new');
    return startAutosave();
  }, [loadProject, openRoomDialog]);

  useKeyboardShortcuts();

  const leftTab: Tab = panel === 'room' ? 'library' : panel;
  const mobileTabs: { id: Tab; label: string; icon: ComponentType<{ size?: number }> }[] = [
    ...LEFT_TABS,
    { id: 'room', label: 'Özellikler', icon: Icon.Sliders },
  ];

  return (
    <div className={`app ${interacting ? 'is-interacting' : ''}`}>
      <TopBar />
      <div className="workspace">
        {hasProject && (
          <aside className="sidebar sidebar--left" aria-label="Kütüphane">
            <nav className="tabs" role="tablist">
              {LEFT_TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={leftTab === t.id} className={leftTab === t.id ? 'is-active' : ''} onClick={() => setPanel(t.id)}>
                  <t.icon size={18} />
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar__body">
              <PanelContent tab={leftTab} />
            </div>
          </aside>
        )}
        <main className="stage">
          <Scene />
          {hasProject && (
            <div className="stage__hint" aria-hidden="true">
              Sürükle: taşı · Halka: döndür · Duvara dokun: duvar kağıdı · Başka odaya dokun: o odayı düzenle
            </div>
          )}
          {hasProject && <QuickBar />}
        </main>
        {hasProject && (
          <aside className="sidebar sidebar--right" aria-label="Özellikler">
            <div className="sidebar__body">
              <PropertiesPanel />
            </div>
          </aside>
        )}
      </div>

      {/* Mobil alt gezinme + çekmece */}
      {hasProject && (
        <>
          <div className={`sheet ${sheetOpen ? 'is-open' : ''}`} aria-hidden={!sheetOpen}>
            <div className="sheet__handle" onClick={() => setSheetOpen(false)}>
              <span />
              <button className="icon-btn" aria-label="Kapat"><Icon.Close /></button>
            </div>
            <div className="sheet__body">{sheetOpen && <PanelContent tab={panel} />}</div>
          </div>
          <nav className="bottombar" role="tablist">
            {mobileTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={sheetOpen && panel === t.id}
                className={sheetOpen && panel === t.id ? 'is-active' : ''}
                onClick={() => (sheetOpen && panel === t.id ? setSheetOpen(false) : setPanel(t.id, true))}
              >
                <t.icon size={20} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {roomDialog && <RoomDialog key={roomDialog} mode={roomDialog} />}
      <CatalogManager />
      <Toast />
    </div>
  );
}
