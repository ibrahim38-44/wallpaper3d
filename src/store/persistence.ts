import { parseProject, serializeProject } from '../core/project';
import type { Project } from '../core/types';
import { useEditor } from './editorStore';

const KEY = 'wallpaper3d.project.v1';

/**
 * Yerel otomatik kayıt. Gerçek üründe bu modül bir ProjectRepository arayüzünün
 * yerel uygulamasıdır; aynı arayüzle bir REST/Supabase/Firebase deposu eklenebilir.
 */
export function loadSavedProject(): Project | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return parseProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: Project | null = null;
  return useEditor.subscribe((state) => {
    if (!state.project || state.project === last || state.interacting) return;
    last = state.project;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, serializeProject(state.project!));
      } catch {
        // kota dolu / gizli pencere – sessizce geç, dışa aktarma her zaman mümkün
      }
    }, 400);
  });
}

export function downloadProject(project: Project) {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(project.name)}.wallpaper3d.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function readProjectFile(file: File): Promise<Project> {
  const text = await file.text();
  return parseProject(JSON.parse(text));
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function slug(s: string) {
  return (
    s
      .toLocaleLowerCase('tr')
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'oda'
  );
}
