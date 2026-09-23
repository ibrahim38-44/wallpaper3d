import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../catalog/patterns';
import { mat, shade } from '../materials';
import { B, Cyl, RB, divisions, legPositions, type ModelProps } from './primitives';

const LEG_H = 10;
const SEAT_BASE = 25;
const CUSHION_H = 13;
const SEAT_TOP = LEG_H + SEAT_BASE + CUSHION_H;
const ARM_W = 18;
const ARM_H = 62;
const BACK_T = 20;

/** Dikdörtgen alan içine eşit oturma minderleri. axis: minderlerin dizildiği eksen */
function SeatCushions({ x0, x1, z0, z1, axis, target, m }: { x0: number; x1: number; z0: number; z1: number; axis: 'x' | 'z'; target: number; m: THREE.Material }) {
  const len = axis === 'x' ? x1 - x0 : z1 - z0;
  if (len <= 5) return null;
  const n = divisions(len, target);
  const step = len / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const cx = axis === 'x' ? x0 + step * i + step / 2 : (x0 + x1) / 2;
        const cz = axis === 'z' ? z0 + step * i + step / 2 : (z0 + z1) / 2;
        const sx = axis === 'x' ? step - 1 : x1 - x0;
        const sz = axis === 'z' ? step - 1 : z1 - z0;
        return <RB key={i} p={[cx, LEG_H + SEAT_BASE + CUSHION_H / 2, cz]} s={[sx, CUSHION_H, sz]} m={m} radius={5} />;
      })}
    </>
  );
}

function BackCushions({ from, to, fixed, axis, h, target, m, facing }: { from: number; to: number; fixed: number; axis: 'x' | 'z'; h: number; target: number; m: THREE.Material; facing: 1 | -1 }) {
  const len = to - from;
  const ch = Math.max(10, h - SEAT_TOP - 4);
  if (len <= 5) return null;
  const n = divisions(len, target);
  const step = len / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const c = from + step * i + step / 2;
        const p: [number, number, number] = axis === 'x' ? [c, SEAT_TOP + ch / 2 - 2, fixed] : [fixed, SEAT_TOP + ch / 2 - 2, c];
        const s: [number, number, number] = axis === 'x' ? [step - 2, ch, 16] : [16, ch, step - 2];
        const r: [number, number, number] = axis === 'x' ? [-0.12 * facing, 0, 0] : [0, 0, 0.12 * facing];
        return <RB key={i} p={p} s={s} m={m} radius={6} r={r} />;
      })}
    </>
  );
}

function SofaLegs({ pts }: { pts: [number, number][] }) {
  const leg = mat('metal', '#2a2a2a');
  return (
    <>
      {pts.map(([x, z], i) => (
        <Cyl key={i} p={[x, LEG_H / 2, z]} rt={1.8} rb={1.3} h={LEG_H} m={leg} seg={10} />
      ))}
    </>
  );
}

export function Sofa({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const up = mat('fabric', color);
  const cush = mat('fabric', shade(color, 0.03));
  const innerW = w - ARM_W * 2;
  return (
    <group>
      <SofaLegs pts={legPositions(w, d, 6)} />
      <RB p={[0, LEG_H + SEAT_BASE / 2, 0]} s={[w, SEAT_BASE, d]} m={up} radius={2} />
      <RB p={[0, LEG_H + (h - LEG_H) / 2, -d / 2 + BACK_T / 2]} s={[w, h - LEG_H, BACK_T]} m={up} radius={4} />
      {[-1, 1].map((sgn) => (
        <RB key={sgn} p={[sgn * (w / 2 - ARM_W / 2), LEG_H + (ARM_H - LEG_H) / 2, 0]} s={[ARM_W, ARM_H - LEG_H, d]} m={up} radius={5} />
      ))}
      <SeatCushions x0={-innerW / 2} x1={innerW / 2} z0={-d / 2 + BACK_T} z1={d / 2 - 1} axis="x" target={innerW > 170 ? innerW / 3 : innerW / 2} m={cush} />
      <BackCushions from={-innerW / 2} to={innerW / 2} fixed={-d / 2 + BACK_T + 7} axis="x" h={h} target={innerW > 170 ? innerW / 3 : innerW / 2} m={cush} facing={1} />
    </group>
  );
}

/** L koltuk: arka kenar boyunca ana gövde + sol kenar boyunca kanat (köşe takımı). */
export function SofaL({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const up = mat('fabric', color);
  const cush = mat('fabric', shade(color, 0.03));
  const sd = Math.min(95, d * 0.6, w * 0.45);
  const x0 = -w / 2;
  const z0 = -d / 2;
  const legs: [number, number][] = [
    [x0 + 6, z0 + 6], [w / 2 - 6, z0 + 6], [w / 2 - 6, z0 + sd - 6], [x0 + sd - 6, z0 + sd - 6], [x0 + 6, d / 2 - 6], [x0 + sd - 6, d / 2 - 6],
  ];
  const baseY = LEG_H + SEAT_BASE / 2;
  const backY = LEG_H + (h - LEG_H) / 2;
  const armY = LEG_H + (ARM_H - LEG_H) / 2;
  return (
    <group>
      <SofaLegs pts={legs} />
      <RB p={[0, baseY, z0 + sd / 2]} s={[w, SEAT_BASE, sd]} m={up} radius={2} />
      <RB p={[x0 + sd / 2, baseY, (z0 + sd + d / 2) / 2]} s={[sd, SEAT_BASE, d - sd]} m={up} radius={2} />
      <RB p={[0, backY, z0 + BACK_T / 2]} s={[w, h - LEG_H, BACK_T]} m={up} radius={4} />
      <RB p={[x0 + BACK_T / 2, backY, (z0 + BACK_T + d / 2) / 2]} s={[BACK_T, h - LEG_H, d - BACK_T]} m={up} radius={4} />
      <RB p={[w / 2 - ARM_W / 2, armY, z0 + sd / 2]} s={[ARM_W, ARM_H - LEG_H, sd]} m={up} radius={5} />
      <RB p={[x0 + sd / 2, armY, d / 2 - ARM_W / 2]} s={[sd, ARM_H - LEG_H, ARM_W]} m={up} radius={5} />
      {/* köşe + ana gövde minderleri */}
      <SeatCushions x0={x0 + BACK_T} x1={x0 + sd} z0={z0 + BACK_T} z1={z0 + sd - 1} axis="x" target={sd} m={cush} />
      <SeatCushions x0={x0 + sd} x1={w / 2 - ARM_W} z0={z0 + BACK_T} z1={z0 + sd - 1} axis="x" target={70} m={cush} />
      <SeatCushions x0={x0 + BACK_T} x1={x0 + sd - 1} z0={z0 + sd} z1={d / 2 - ARM_W} axis="z" target={70} m={cush} />
      <BackCushions from={x0 + BACK_T + 16} to={w / 2 - ARM_W} fixed={z0 + BACK_T + 7} axis="x" h={h} target={70} m={cush} facing={1} />
      <BackCushions from={z0 + BACK_T} to={d / 2 - ARM_W} fixed={x0 + BACK_T + 7} axis="z" h={h} target={70} m={cush} facing={1} />
    </group>
  );
}

export function Armchair({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const up = mat('fabric', color);
  const cush = mat('fabric', shade(color, 0.03));
  const leg = mat('wood', '#6b4a33');
  const armW = Math.min(14, w * 0.18);
  const legH = 14;
  const innerW = w - armW * 2;
  return (
    <group>
      {legPositions(w, d, 5).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z]} rt={2} rb={1.2} h={legH} m={leg} seg={10} />
      ))}
      <RB p={[0, legH + 10, 0]} s={[w, 20, d]} m={up} radius={3} />
      <RB p={[0, legH + (h - legH) / 2, -d / 2 + 9]} s={[w, h - legH, 18]} m={up} radius={5} />
      {[-1, 1].map((s) => (
        <RB key={s} p={[s * (w / 2 - armW / 2), legH + (ARM_H - legH) / 2, 0]} s={[armW, ARM_H - legH, d]} m={up} radius={5} />
      ))}
      <RB p={[0, legH + 20 + 6, 9]} s={[innerW - 1, 12, d - 20]} m={cush} radius={5} />
    </group>
  );
}

export function CoffeeTable({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const top = mat('wood', color);
  const metal = mat('metal', '#262626');
  return (
    <group>
      <RB p={[0, h - 2, 0]} s={[w, 4, d]} m={top} radius={1.2} />
      {legPositions(w, d, 6).map(([x, z], i) => (
        <Cyl key={i} p={[x, (h - 4) / 2, z]} rt={1.4} h={h - 4} m={metal} seg={10} />
      ))}
      {d > 45 && <B p={[0, 12, 0]} s={[w - 14, 1.8, d - 14]} m={top} />}
    </group>
  );
}

export function TvUnit({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('wood', color);
  const front = mat('lacquer', shade(color, 0.02));
  const inner = mat('matte', shade(color, -0.35));
  const leg = mat('metal', '#262626');
  const legH = 8;
  const n = Math.max(2, divisions(w, 60));
  const fw = w / n;
  const bodyH = h - legH;
  const mid = n >= 3 ? Math.floor(n / 2) : -1;
  return (
    <group>
      {legPositions(w, d, 5).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z]} rt={1.2} h={legH} m={leg} seg={8} />
      ))}
      <B p={[0, legH + bodyH / 2, 0]} s={[w, bodyH, d]} m={body} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + fw * i + fw / 2;
        return i === mid ? (
          <B key={i} p={[x, legH + bodyH / 2, d / 2 - 1]} s={[fw - 4, bodyH - 4, 2.2]} m={inner} />
        ) : (
          <B key={i} p={[x, legH + bodyH / 2, d / 2 + 0.6]} s={[fw - 0.6, bodyH - 1.5, 1.4]} m={front} />
        );
      })}
    </group>
  );
}

export function Tv({ size }: ModelProps) {
  const { w, d, h } = size;
  const frame = mat('plastic', '#141414');
  const screen = mat('screen');
  return (
    <group>
      <B p={[0, h / 2, -d / 2 + 1]} s={[20, 20, 2]} m={frame} />
      <B p={[0, h / 2, 0]} s={[w, h, Math.max(2, d - 2)]} m={frame} />
      <B p={[0, h / 2, d / 2 - 0.9]} s={[w - 1.6, h - 1.6, 0.4]} m={screen} />
    </group>
  );
}

function Books({ w, d, shelfYs, gapH, seed }: { w: number; d: number; shelfYs: number[]; gapH: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    const palette = ['#7a4f3a', '#2f4a5f', '#c9b48a', '#6b7b5e', '#a55d4a', '#e3ddd3', '#3a3a3a', '#8c6d4f', '#b9a58f'];
    const out: { x: number; y: number; z: number; bw: number; bh: number; bd: number; c: string; tilt: number }[] = [];
    shelfYs.forEach((sy) => {
      let x = -w / 2 + 3;
      while (x < w / 2 - 6) {
        if (rnd() < 0.12) {
          x += 6 + rnd() * 14; // boşluk
          continue;
        }
        const bw = 1.8 + rnd() * 3.5;
        const bh = Math.min(gapH - 3, gapH * (0.55 + rnd() * 0.35));
        const bd = Math.min(d - 6, 15 + rnd() * 8);
        out.push({ x: x + bw / 2, y: sy + bh / 2, z: -d / 2 + 2 + bd / 2, bw, bh, bd, c: palette[Math.floor(rnd() * palette.length)], tilt: 0 });
        x += bw + 0.2;
      }
    });
    return out;
  }, [w, d, shelfYs, gapH, seed]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    data.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.bw, b.bh, b.bd);
      o.rotation.set(0, 0, b.tilt);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(b.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  if (!data.length) return null;
  return (
    <instancedMesh key={data.length} ref={ref} args={[undefined, undefined, data.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  );
}

export function Bookshelf({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const m = mat('wood', color);
  const t = 2;
  const shelves = Math.max(2, Math.round(h / 38));
  const gap = (h - t) / shelves;
  const shelfYs = Array.from({ length: shelves }, (_, i) => t + gap * i);
  return (
    <group>
      <B p={[-w / 2 + t / 2, h / 2, 0]} s={[t, h, d]} m={m} />
      <B p={[w / 2 - t / 2, h / 2, 0]} s={[t, h, d]} m={m} />
      <B p={[0, h / 2, -d / 2 + 0.5]} s={[w - 2 * t, h, 1]} m={mat('wood', shade(color, -0.08))} />
      {[...shelfYs, h].map((y, i) => (
        <B key={i} p={[0, y - t / 2, 0]} s={[w - 2 * t, t, d]} m={m} />
      ))}
      <Books w={w - 2 * t} d={d} shelfYs={shelfYs} gapH={gap - t} seed={Math.round(w * 7 + h)} />
    </group>
  );
}

export function Table({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const m = mat('wood', color);
  const legM = mat('wood', shade(color, -0.06));
  return (
    <group>
      <RB p={[0, h - 2, 0]} s={[w, 4, d]} m={m} radius={1} />
      <B p={[0, h - 7, 0]} s={[w - 20, 6, d - 20]} m={legM} />
      {legPositions(w, d, 9).map(([x, z], i) => (
        <B key={i} p={[x, (h - 4) / 2, z]} s={[6, h - 4, 6]} m={legM} />
      ))}
    </group>
  );
}

export function Desk({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const m = mat('wood', color);
  const side = mat('wood', shade(color, -0.05));
  const knob = mat('metal', '#a89f90');
  const pedW = Math.min(42, w * 0.35);
  const pedX = w / 2 - pedW / 2 - 1;
  const top = h - 3;
  return (
    <group>
      <B p={[0, h - 1.5, 0]} s={[w, 3, d]} m={m} />
      <B p={[-w / 2 + 1.5, top / 2, 0]} s={[3, top, d - 4]} m={side} />
      <B p={[pedX, top / 2, 0]} s={[pedW, top, d - 4]} m={side} />
      <B p={[(-w / 2 + 3 + pedX - pedW / 2) / 2, top - 20, -d / 2 + 4]} s={[pedX - pedW / 2 + w / 2 - 3, 36, 1.6]} m={side} />
      {[0, 1, 2].map((i) => {
        const dh = (top - 6) / 3;
        const y = 4 + dh * i + dh / 2;
        return (
          <group key={i}>
            <B p={[pedX, y, (d - 4) / 2 + 0.7]} s={[pedW - 1, dh - 0.8, 1.4]} m={m} />
            <B p={[pedX, y + dh * 0.25, (d - 4) / 2 + 1.8]} s={[12, 1, 1.2]} m={knob} />
          </group>
        );
      })}
    </group>
  );
}

export function Chair({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const m = mat('wood', color);
  const seatH = 45;
  const legTop = seatH - 3;
  const pts = legPositions(w, d, 3);
  return (
    <group>
      {pts.map(([x, z], i) => (
        <Cyl key={i} p={[x, legTop / 2, z]} rt={1.6} rb={1.2} h={legTop} m={m} seg={10} />
      ))}
      <RB p={[0, seatH - 2, 0]} s={[w, 4, d]} m={m} radius={1.5} />
      {[-1, 1].map((s) => (
        <Cyl key={s} p={[s * (w / 2 - 3), seatH + (h - seatH) / 2, -d / 2 + 3]} rt={1.4} h={h - seatH} m={m} seg={10} r={[-0.08, 0, 0]} />
      ))}
      <RB p={[0, h - 11, -d / 2 + 2]} s={[w - 4, 18, 2.5]} m={m} radius={1} r={[-0.08, 0, 0]} />
    </group>
  );
}
