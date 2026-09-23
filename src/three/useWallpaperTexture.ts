import { useEffect, useState } from 'react';
import type * as THREE from 'three';
import type { WallpaperDef } from '../core/types';
import { getWallpaperBaseTexture, makeWallTexture } from './textures';

/**
 * Duvar için gerçek ölçekli duvar kağıdı dokusu döndürür. Karo üretimi/yüklemesi
 * asenkron olduğundan ilk karede null dönebilir; bu sürede boya rengi görünür.
 */
export function useWallpaperTexture(
  def: WallpaperDef | undefined,
  wallHeight: number,
  offsetU: number,
  offsetV: number,
): THREE.Texture | null {
  const [base, setBase] = useState<{ id: string; tex: THREE.Texture } | null>(null);
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!def) {
      setBase(null);
      return;
    }
    let alive = true;
    getWallpaperBaseTexture(def)
      .then((t) => alive && setBase({ id: def.id, tex: t }))
      .catch((e) => console.warn('[Wallpaper3D] desen yüklenemedi', e));
    return () => {
      alive = false;
    };
  }, [def]);

  useEffect(() => {
    if (!def || !base || base.id !== def.id) {
      setTex(null);
      return;
    }
    const t = makeWallTexture(base.tex, def, wallHeight, offsetU, offsetV);
    setTex(t);
    return () => t.dispose();
  }, [def, base, wallHeight, offsetU, offsetV]);

  return tex;
}
