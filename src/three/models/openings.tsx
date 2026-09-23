import { mat, shade } from '../materials';
import { getSkyTexture } from '../textures';
import { B, Cyl, type OpeningModelProps } from './primitives';

/**
 * Açıklık modelleri yerel koordinatta çizilir:
 *   x: duvar boyunca (0 = açıklık merkezi), y: açıklık alt kenarından yukarı,
 *   z: 0 = duvarın İÇ yüzü, duvar gövdesi z ∈ [-T, 0].
 */

function Casing({ w, h, color, bottom = false }: { w: number; h: number; color: string; bottom?: boolean }) {
  const m = mat('lacquer', color);
  const cw = 7;
  return (
    <group>
      <B p={[-w / 2 - cw / 2, (h + cw) / 2 - (bottom ? cw : 0) / 2, 0.8]} s={[cw, h + cw + (bottom ? cw : 0), 1.6]} m={m} />
      <B p={[w / 2 + cw / 2, (h + cw) / 2 - (bottom ? cw : 0) / 2, 0.8]} s={[cw, h + cw + (bottom ? cw : 0), 1.6]} m={m} />
      <B p={[0, h + cw / 2, 0.8]} s={[w + cw * 2, cw, 1.6]} m={m} />
    </group>
  );
}

function Backdrop({ w, h, T }: { w: number; h: number; T: number }) {
  return (
    <mesh position={[0, h / 2, -T - 25]}>
      <planeGeometry args={[w + 60, h + 30]} />
      <meshBasicMaterial map={getSkyTexture()} toneMapped={false} />
    </mesh>
  );
}

export function Door({ size, color, color2, wallThickness: T, flip }: OpeningModelProps) {
  const { w, h } = size;
  const leaf = mat('lacquer', color);
  const panel = mat('lacquer', shade(color, -0.04));
  const frame = color2 ?? color;
  const jamb = mat('lacquer', frame);
  const chrome = mat('chrome');
  const lw = w - 4;
  const lh = h - 2;
  const hx = (flip ? -1 : 1) * (lw / 2 - 7);
  const zc = -T / 2;
  return (
    <group>
      <Casing w={w} h={h} color={frame} />
      <B p={[-w / 2 + 1, h / 2, zc]} s={[2, h, T + 1]} m={jamb} />
      <B p={[w / 2 - 1, h / 2, zc]} s={[2, h, T + 1]} m={jamb} />
      <B p={[0, h - 1, zc]} s={[w, 2, T + 1]} m={jamb} />
      <B p={[0, lh / 2, zc + T / 2 - 3]} s={[lw, lh, 4]} m={leaf} />
      {[0.28, 0.72].map((f, i) => (
        <B key={i} p={[0, lh * f, zc + T / 2 - 0.8]} s={[lw - 22, lh * 0.36, 0.6]} m={panel} />
      ))}
      <Cyl p={[hx, 100, zc + T / 2 - 0.4]} rt={2.6} h={1.2} m={chrome} r={[Math.PI / 2, 0, 0]} />
      <B p={[hx - (flip ? -1 : 1) * 6, 100, zc + T / 2 + 1.2]} s={[13, 1.8, 1.8]} m={chrome} />
    </group>
  );
}

function Sash({ x, w, h, y0, z, frame }: { x: number; w: number; h: number; y0: number; z: number; frame: string }) {
  const f = mat('lacquer', frame);
  const fw = 5.5;
  return (
    <group position={[x, y0, z]}>
      <B p={[-w / 2 + fw / 2, h / 2, 0]} s={[fw, h, 6]} m={f} />
      <B p={[w / 2 - fw / 2, h / 2, 0]} s={[fw, h, 6]} m={f} />
      <B p={[0, fw / 2, 0]} s={[w, fw, 6]} m={f} />
      <B p={[0, h - fw / 2, 0]} s={[w, fw, 6]} m={f} />
      <mesh position={[0, h / 2, 0]} material={mat('glass')}>
        <planeGeometry args={[w - fw * 2, h - fw * 2]} />
      </mesh>
      <B p={[w / 2 - fw - 2, h / 2, 3.8]} s={[1.5, 12, 1.8]} m={mat('chrome')} />
    </group>
  );
}

export function Window({ size, color, color2 = '#ebe8e2', wallThickness: T }: OpeningModelProps) {
  const { w, h } = size;
  const frame = mat('lacquer', color);
  const n = w > 90 ? 2 : 1;
  const sw = (w - 8) / n;
  const zc = -T / 2;
  return (
    <group>
      <Backdrop w={w} h={h} T={T} />
      <B p={[-w / 2 + 2, h / 2, zc]} s={[4, h, 7]} m={frame} />
      <B p={[w / 2 - 2, h / 2, zc]} s={[4, h, 7]} m={frame} />
      <B p={[0, h - 2, zc]} s={[w, 4, 7]} m={frame} />
      <B p={[0, 2, zc]} s={[w, 4, 7]} m={frame} />
      {Array.from({ length: n }, (_, i) => (
        <Sash key={i} x={-w / 2 + 4 + sw * i + sw / 2} w={sw} h={h - 8} y0={4} z={zc + 1} frame={color} />
      ))}
      {/* iç denizlik (mermer) */}
      <B p={[0, -1.2, (zc + 6) / 2]} s={[w + 10, 2.4, T / 2 + 6]} m={mat('stone', color2)} />
    </group>
  );
}

export function BalconyDoor({ size, color, color2 = '#9a9a9a', wallThickness: T }: OpeningModelProps) {
  const { w, h } = size;
  const frame = mat('lacquer', color);
  const n = w > 110 ? 2 : 1;
  const sw = (w - 8) / n;
  const zc = -T / 2;
  return (
    <group>
      <Backdrop w={w} h={h} T={T} />
      <Casing w={w} h={h} color={color} />
      <B p={[-w / 2 + 2, h / 2, zc]} s={[4, h, 7]} m={frame} />
      <B p={[w / 2 - 2, h / 2, zc]} s={[4, h, 7]} m={frame} />
      <B p={[0, h - 2, zc]} s={[w, 4, 7]} m={frame} />
      <B p={[0, 1, zc]} s={[w, 2, T]} m={mat('metal', color2)} />
      {Array.from({ length: n }, (_, i) => (
        <Sash key={i} x={-w / 2 + 4 + sw * i + sw / 2} w={sw} h={h - 6} y0={2} z={zc + 1} frame={color} />
      ))}
    </group>
  );
}
