import * as THREE from 'three';
import { getFabricTexture, getWoodGrainTexture } from './textures';

/**
 * Paylaşılan PBR malzeme fabrikası. Aynı (tür, renk) çifti tek malzeme örneği
 * kullanır → draw call ve GPU belleği tasarrufu.
 */
export type MatKind =
  | 'wood'
  | 'fabric'
  | 'lacquer'
  | 'matte'
  | 'metal'
  | 'chrome'
  | 'glass'
  | 'ceramic'
  | 'stone'
  | 'plastic'
  | 'screen'
  | 'leaf'
  | 'emissive'
  | 'mirror';

const cache = new Map<string, THREE.Material>();

export function mat(kind: MatKind, color = '#ffffff'): THREE.Material {
  const key = `${kind}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let m: THREE.Material;
  switch (kind) {
    case 'wood':
      m = new THREE.MeshStandardMaterial({ color, map: getWoodGrainTexture(), roughness: 0.55, metalness: 0 });
      break;
    case 'fabric':
      m = new THREE.MeshStandardMaterial({ color, map: getFabricTexture(), roughness: 0.95, metalness: 0 });
      break;
    case 'lacquer':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 });
      break;
    case 'matte':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      break;
    case 'metal':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.85 });
      break;
    case 'chrome':
      m = new THREE.MeshStandardMaterial({ color: '#e6e8ea', roughness: 0.08, metalness: 1 });
      break;
    case 'glass':
      m = new THREE.MeshPhysicalMaterial({
        color: '#dfeff5', roughness: 0.02, metalness: 0, transmission: 0.9, transparent: true, opacity: 0.25, ior: 1.5, thickness: 0.5,
      });
      break;
    case 'ceramic':
      m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
      break;
    case 'stone':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.05 });
      break;
    case 'plastic':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
      break;
    case 'screen':
      m = new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.1, metalness: 0.2, emissive: '#101826', emissiveIntensity: 0.6 });
      break;
    case 'leaf':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide });
      break;
    case 'emissive':
      m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide });
      break;
    case 'mirror':
      m = new THREE.MeshStandardMaterial({ color: '#cfd6da', roughness: 0.02, metalness: 1 });
      break;
  }
  cache.set(key, m);
  return m;
}

/** Rengi koyulaştır/açık yap (-1..1). */
export function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amount)));
  return `#${c.getHexString()}`;
}
