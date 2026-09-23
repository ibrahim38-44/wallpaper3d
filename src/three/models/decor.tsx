import { useMemo } from 'react';
import { mulberry32 } from '../../catalog/patterns';
import { mat, shade } from '../materials';
import { B, Cyl, type ModelProps } from './primitives';

export function Rug({ size, color, color2 }: ModelProps) {
  const { w, d, h } = size;
  const border = Math.min(14, w * 0.07, d * 0.07);
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={mat('fabric', color2 ?? shade(color, -0.14))} receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h / 2 + 0.05, 0]} material={mat('fabric', color)} receiveShadow>
        <boxGeometry args={[w - border * 2, h, d - border * 2]} />
      </mesh>
      <mesh position={[0, h / 2 + 0.1, 0]} material={mat('fabric', shade(color, 0.08))} receiveShadow>
        <boxGeometry args={[(w - border * 2) * 0.55, h, (d - border * 2) * 0.55]} />
      </mesh>
    </group>
  );
}

export function Plant({ size, color, color2 }: ModelProps) {
  const { w, d, h } = size;
  const r = Math.min(w, d) * 0.3;
  const potH = Math.min(h * 0.32, 45);
  const leaves = useMemo(() => {
    const rnd = mulberry32(Math.round(w * 13 + h));
    const foliageH = h - potH;
    const n = 16;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const t = 0.25 + rnd() * 0.75; // yükseklik oranı
      const len = Math.min(w, d) * (0.28 + rnd() * 0.18);
      return {
        a,
        y: potH + foliageH * t,
        stemY: potH + (foliageH * t) / 2,
        stemH: foliageH * t,
        len,
        tilt: 0.5 + rnd() * 0.5,
        c: color2 ? (rnd() > 0.5 ? color2 : shade(color2, -0.08)) : rnd() > 0.5 ? '#4f7a45' : '#3e6538',
      };
    });
  }, [w, d, h, potH, color2]);
  const stem = mat('matte', '#5d6b3b');
  return (
    <group>
      <Cyl p={[0, potH / 2, 0]} rt={r} rb={r * 0.78} h={potH} m={mat('ceramic', color)} seg={28} />
      <Cyl p={[0, potH - 1.5, 0]} rt={r * 0.94} h={1} m={mat('matte', '#3b2c21')} seg={24} />
      {leaves.map((l, i) => (
        <group key={i} rotation={[0, l.a, 0]}>
          <Cyl p={[l.len * 0.18, l.stemY, 0]} rt={0.5} h={l.stemH} m={stem} seg={5} r={[0, 0, -0.12]} />
          <mesh position={[l.len * 0.55, l.y, 0]} rotation={[0, 0, -l.tilt]} scale={[l.len / 2, 0.8, l.len / 5]} material={mat('leaf', l.c)} castShadow>
            <sphereGeometry args={[1, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function FloorLamp({ size, color, color2 = '#2a2a2a' }: ModelProps) {
  const { w, h } = size;
  const metal = mat('metal', color2);
  const shadeH = Math.min(32, h * 0.2);
  return (
    <group>
      <Cyl p={[0, 1.5, 0]} rt={w * 0.32} h={3} m={metal} seg={32} />
      <Cyl p={[0, (h - shadeH) / 2 + 1.5, 0]} rt={1.1} h={h - shadeH - 3} m={metal} seg={10} />
      <mesh position={[0, h - shadeH / 2, 0]} material={mat('emissive', color)}>
        <cylinderGeometry args={[w * 0.36, w * 0.5, shadeH, 32, 1, true]} />
      </mesh>
      <pointLight position={[0, h - shadeH / 2, 0]} intensity={14000} distance={600} decay={2} color="#ffe2b8" />
      <B p={[0, h - shadeH / 2, 0]} s={[3, 5, 3]} m={mat('emissive', '#fff6e0')} />
    </group>
  );
}
