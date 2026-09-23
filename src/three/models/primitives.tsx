import { RoundedBox } from '@react-three/drei';
import type * as THREE from 'three';
import type { Size3 } from '../../core/types';

export type V3 = [number, number, number];

export interface ModelProps {
  size: Size3;
  /** ana malzeme rengi */
  color: string;
  /** ikincil malzeme rengi (ayak, tezgâh, çerçeve…); yoksa modelin varsayılanı */
  color2?: string;
}

export interface OpeningModelProps extends ModelProps {
  wallThickness: number;
  flip?: boolean;
}

/** Kutu: p = merkez, s = [genişlik, yükseklik, derinlik] */
export function B({ p, s, m, r }: { p: V3; s: V3; m: THREE.Material; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Yuvarlatılmış kutu (döşeme, minder vb.) */
export function RB({ p, s, m, radius = 3, r }: { p: V3; s: V3; m: THREE.Material; radius?: number; r?: V3 }) {
  const rad = Math.max(0.1, Math.min(radius, s[0] / 2 - 0.01, s[1] / 2 - 0.01, s[2] / 2 - 0.01));
  return <RoundedBox args={s} radius={rad} smoothness={3} position={p} rotation={r} material={m} castShadow receiveShadow />;
}

/** Silindir: p = merkez, yarıçaplar ve yükseklik */
export function Cyl({
  p, rt, rb, h, m, seg = 20, r,
}: { p: V3; rt: number; rb?: number; h: number; m: THREE.Material; seg?: number; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb ?? rt, h, seg]} />
    </mesh>
  );
}

/** Dikdörtgen ayakların 4 köşe konumu (inset kadar içeride). */
export function legPositions(w: number, d: number, inset: number): [number, number][] {
  const x = w / 2 - inset;
  const z = d / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [x, z],
    [-x, z],
  ];
}

/** Eşit bölmeler (kapak/çekmece sayısı için). */
export function divisions(total: number, target: number, min = 1): number {
  return Math.max(min, Math.round(total / target));
}
