import { parseProject, serializeProject } from '../core/project';
import type { Project } from '../core/types';
import { useEditor } from './editorStore';
import { useLibrary } from './libraryStore';

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

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

/**
 * Projeyi dosyaya kaydeder. Kullanılan firma kataloğu desenleri (görselleriyle)
 * dosyaya gömülür; böylece proje başka bir cihazda katalog olmadan da açılır.
 */
export async function downloadProject(project: Project) {
  const used = new Set(project.rooms.flatMap((r) => r.walls.map((w) => w.wallpaper?.wallpaperId).filter((x): x is string => !!x)));
  const embedded = [...project.customWallpapers];
  for (const rec of useLibrary.getState().records) {
    if (!used.has(rec.id) || embedded.some((e) => e.id === rec.id)) continue;
    const brand = useLibrary.getState().brands.find((b) => b.id === rec.brandId);
    embedded.push({
      ...rec.def,
      swatch: rec.def.swatch ?? '#cccccc',
      brand: brand?.name,
      brandId: rec.brandId,
      collection: brand ? `${brand.name} · ${rec.def.collection}` : rec.def.collection,
      source: { type: 'image', url: await blobToDataUrl(rec.image) },
    });
  }
  const blob = new Blob([serializeProject({ ...project, customWallpapers: embedded })], { type: 'application/json' });
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
