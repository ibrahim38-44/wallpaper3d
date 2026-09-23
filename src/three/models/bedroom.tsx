import type { ReactElement } from 'react';
import { mat, shade } from '../materials';
import { B, Cyl, RB, divisions, legPositions, type ModelProps } from './primitives';

export function Bed({ size, color, color2 = '#ebe5da' }: ModelProps) {
  const { w, d, h } = size;
  const up = mat('fabric', color);
  const sheet = mat('fabric', '#f5f2ed');
  const duvet = mat('fabric', color2);
  const throwM = mat('fabric', shade(color, -0.12));
  const leg = mat('wood', '#5a3e2b');
  const legH = 8;
  const baseH = 32;
  const mattressH = 22;
  const hbT = 8;
  const baseD = d - hbT;
  const zc = -d / 2 + hbT + baseD / 2;
  const top = baseH + mattressH;
  const pillows = w >= 130 ? 2 : 1;
  const pw = (w - 16) / pillows - 4;
  const duvD = baseD * 0.68;
  return (
    <group>
      {legPositions(w - 6, baseD - 6, 4).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z + zc]} rt={2.2} rb={1.8} h={legH} m={leg} />
      ))}
      <RB p={[0, legH + (baseH - legH) / 2, zc]} s={[w, baseH - legH, baseD]} m={up} radius={2} />
      <RB p={[0, baseH + mattressH / 2, zc]} s={[w - 4, mattressH, baseD - 4]} m={sheet} radius={5} />
      <RB p={[0, top + 2, zc + baseD / 2 - duvD / 2 + 1]} s={[w + 1, 5, duvD]} m={duvet} radius={2.4} />
      <RB p={[0, top + 5, d / 2 - 32]} s={[w + 3, 3, 42]} m={throwM} radius={1.4} />
      {Array.from({ length: pillows }, (_, i) => {
        const x = -w / 2 + 8 + pw / 2 + 2 + i * (pw + 4);
        return <RB key={i} p={[x, top + 7, -d / 2 + hbT + 24]} s={[pw, 13, 38]} m={sheet} radius={6} r={[-0.25, 0, 0]} />;
      })}
      <RB p={[0, h / 2, -d / 2 + hbT / 2]} s={[w + 6, h, hbT]} m={up} radius={3} />
    </group>
  );
}

export function Wardrobe({ size, color, color2 = '#b8b2a7' }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('wood', color);
  const plinth = mat('matte', shade(color, -0.3));
  const handle = mat('metal', color2);
  const gap = mat('matte', '#1d1d1d');
  const pl = 8;
  const n = divisions(w, 50);
  const dw = w / n;
  const doorH = h - pl - 1;
  return (
    <group>
      <B p={[0, pl / 2, -1]} s={[w - 2, pl, d - 4]} m={plinth} />
      <B p={[0, pl + (h - pl) / 2, -1]} s={[w, h - pl, d - 2]} m={body} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + dw * i + dw / 2;
        const handleX = i % 2 === 0 ? x + dw / 2 - 5 : x - dw / 2 + 5;
        return (
          <group key={i}>
            <B p={[x, pl + 0.5 + doorH / 2, d / 2 - 1]} s={[dw - 0.4, doorH, 1.8]} m={body} />
            {i > 0 && <B p={[x - dw / 2, pl + doorH / 2, d / 2 - 0.5]} s={[0.35, doorH, 0.5]} m={gap} />}
            <B p={[n === 1 ? x + dw / 2 - 5 : handleX, pl + doorH * 0.52, d / 2 + 1]} s={[1.2, Math.min(40, doorH * 0.25), 1.8]} m={handle} />
          </group>
        );
      })}
    </group>
  );
}

function Drawers({ w, d, y0, y1, rows, cols, color }: { w: number; d: number; y0: number; y1: number; rows: number; cols: number; color: string }) {
  const front = mat('wood', shade(color, 0.03));
  const knob = mat('metal', '#a89f90');
  const rh = (y1 - y0) / rows;
  const cw = w / cols;
  const out: ReactElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + cw * c + cw / 2;
      const y = y0 + rh * r + rh / 2;
      out.push(
        <group key={`${r}-${c}`}>
          <B p={[x, y, d / 2 + 0.6]} s={[cw - 0.6, rh - 0.6, 1.4]} m={front} />
          <B p={[x, y + rh * 0.18, d / 2 + 1.8]} s={[Math.min(14, cw * 0.35), 1, 1.2]} m={knob} />
        </group>,
      );
    }
  }
  return <>{out}</>;
}

export function Nightstand({ size, color, color2 = '#2c2c2c' }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('wood', color);
  const leg = mat('metal', color2);
  const legH = 12;
  return (
    <group>
      {legPositions(w, d, 3).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z]} rt={1} h={legH} m={leg} seg={10} />
      ))}
      <B p={[0, legH + (h - legH) / 2, 0]} s={[w, h - legH, d]} m={body} />
      <Drawers w={w - 2} d={d} y0={legH + 1} y1={h - 2} rows={2} cols={1} color={color} />
    </group>
  );
}

export function Dresser({ size, color, color2 }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('wood', color);
  const leg = mat('wood', color2 ?? shade(color, -0.2));
  const legH = 10;
  return (
    <group>
      {legPositions(w, d, 4).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z]} rt={1.8} rb={1.2} h={legH} m={leg} seg={10} />
      ))}
      <B p={[0, legH + (h - legH) / 2, 0]} s={[w, h - legH, d]} m={body} />
      <Drawers w={w - 2} d={d} y0={legH + 1} y1={h - 2} rows={3} cols={w > 100 ? 2 : 1} color={color} />
    </group>
  );
}
