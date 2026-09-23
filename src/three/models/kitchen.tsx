import { mat, shade } from '../materials';
import { B, Cyl, divisions, type ModelProps } from './primitives';

const PLINTH = 10;
const TOP_T = 4;
const COUNTER = '#e4e1db';

function Handle({ x, y, z, len, vertical = false }: { x: number; y: number; z: number; len: number; vertical?: boolean }) {
  return <B p={[x, y, z]} s={vertical ? [1.2, len, 1.6] : [len, 1.2, 1.6]} m={mat('metal', '#b9b6b0')} />;
}

/** Alt dolap gövdesi + kapaklar (üstte çekmece sırası) */
function BaseCabinets({ w, d, h, color, hollow = 0 }: { w: number; d: number; h: number; color: string; hollow?: number }) {
  const carcass = mat('matte', shade(color, -0.05));
  const front = mat('lacquer', color);
  const plinth = mat('matte', '#2a2a2a');
  const n = divisions(w, 60);
  const fw = w / n;
  const bodyTop = h - TOP_T;
  const drawerH = 16;
  const doorH = bodyTop - PLINTH - drawerH - 1;
  const fz = d / 2 - 2;
  return (
    <group>
      <B p={[0, PLINTH / 2, -4]} s={[w, PLINTH, d - 10]} m={plinth} />
      <B p={[0, PLINTH + (bodyTop - hollow - PLINTH) / 2, -1.5]} s={[w, bodyTop - hollow - PLINTH, d - 5]} m={carcass} />
      {hollow > 0 && (
        <>
          <B p={[-w / 2 + 1, bodyTop - hollow / 2, -1.5]} s={[2, hollow, d - 5]} m={carcass} />
          <B p={[w / 2 - 1, bodyTop - hollow / 2, -1.5]} s={[2, hollow, d - 5]} m={carcass} />
          <B p={[0, bodyTop - hollow / 2, -d / 2 + 2]} s={[w, hollow, 1]} m={carcass} />
        </>
      )}
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + fw * i + fw / 2;
        return (
          <group key={i}>
            <B p={[x, bodyTop - drawerH / 2 - 0.3, fz]} s={[fw - 0.4, drawerH - 0.4, 1.8]} m={front} />
            <Handle x={x} y={bodyTop - 5} z={fz + 1.8} len={Math.min(30, fw * 0.5)} />
            <B p={[x, PLINTH + 0.5 + doorH / 2, fz]} s={[fw - 0.4, doorH, 1.8]} m={front} />
            <Handle x={x} y={PLINTH + doorH - 5} z={fz + 1.8} len={Math.min(30, fw * 0.5)} />
          </group>
        );
      })}
    </group>
  );
}

export function KitchenBase({ size, color }: ModelProps) {
  const { w, d, h } = size;
  return (
    <group>
      <BaseCabinets w={w} d={d} h={h} color={color} />
      <B p={[0, h - TOP_T / 2, 0.5]} s={[w, TOP_T, d + 1]} m={mat('stone', COUNTER)} />
    </group>
  );
}

export function KitchenSink({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const top = mat('stone', COUNTER);
  const steel = mat('metal', '#c9ccce');
  const chrome = mat('chrome');
  const bw = Math.min(78, w - 16);
  const bd = Math.min(42, d - 16);
  const bz = 1;
  const y = h - TOP_T / 2;
  const sideW = (w - bw) / 2;
  const backD = bz - bd / 2 + d / 2;
  const frontD = d / 2 + 1 - bz - bd / 2;
  return (
    <group>
      <BaseCabinets w={w} d={d} h={h} color={color} hollow={12} />
      {/* delikli tezgâh: evye çevresindeki 4 parça */}
      <B p={[-w / 2 + sideW / 2, y, 0.5]} s={[sideW, TOP_T, d + 1]} m={top} />
      <B p={[w / 2 - sideW / 2, y, 0.5]} s={[sideW, TOP_T, d + 1]} m={top} />
      <B p={[0, y, -d / 2 + backD / 2]} s={[bw, TOP_T, backD]} m={top} />
      <B p={[0, y, d / 2 + 1 - frontD / 2]} s={[bw, TOP_T, frontD]} m={top} />
      {/* çelik hazne */}
      <B p={[0, h - TOP_T - 9, bz]} s={[bw, 1, bd]} m={steel} />
      <B p={[0, h - TOP_T - 4.5, bz - bd / 2]} s={[bw, 9, 0.8]} m={steel} />
      <B p={[0, h - TOP_T - 4.5, bz + bd / 2]} s={[bw, 9, 0.8]} m={steel} />
      <B p={[-bw / 2, h - TOP_T - 4.5, bz]} s={[0.8, 9, bd]} m={steel} />
      <B p={[bw / 2, h - TOP_T - 4.5, bz]} s={[0.8, 9, bd]} m={steel} />
      {/* batarya */}
      <Cyl p={[0, h + 1, bz - bd / 2 - 5]} rt={2.5} h={2} m={chrome} />
      <Cyl p={[0, h + 15, bz - bd / 2 - 5]} rt={1.3} h={28} m={chrome} />
      <B p={[0, h + 28.5, bz - bd / 2 + 4]} s={[2, 2, 19]} m={chrome} />
      <B p={[0, h + 24, bz - bd / 2 + 12.5]} s={[1.8, 7, 1.8]} m={chrome} />
    </group>
  );
}

export function KitchenWall({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const carcass = mat('matte', shade(color, -0.05));
  const front = mat('lacquer', color);
  const n = divisions(w, 60);
  const fw = w / n;
  return (
    <group>
      <B p={[0, h / 2, -1]} s={[w, h, d - 2]} m={carcass} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + fw * i + fw / 2;
        return (
          <group key={i}>
            <B p={[x, h / 2, d / 2 - 1]} s={[fw - 0.4, h - 0.4, 1.8]} m={front} />
            <Handle x={x} y={5} z={d / 2 + 0.8} len={Math.min(30, fw * 0.5)} />
          </group>
        );
      })}
      {/* dolap altı LED */}
      <B p={[0, -0.3, -d / 2 + 8]} s={[w - 6, 0.6, 2]} m={mat('emissive', '#fff4dc')} />
    </group>
  );
}

export function Stove({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('metal', color);
  const glass = mat('plastic', '#101214');
  const ring = mat('matte', '#3a3d40');
  const chrome = mat('chrome');
  const doorH = h - 30;
  const bx = w / 4;
  const bz = d / 4;
  return (
    <group>
      <B p={[0, (h - 1) / 2, 0]} s={[w, h - 1, d]} m={body} />
      <B p={[0, h - 0.5, 0]} s={[w, 1, d]} m={glass} />
      {[
        [-bx, -bz, 9],
        [bx, -bz, 7],
        [-bx, bz, 7],
        [bx, bz, 9],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, h + 0.05, z]} rotation={[-Math.PI / 2, 0, 0]} material={ring}>
          <ringGeometry args={[r - 1.2, r, 32]} />
        </mesh>
      ))}
      <B p={[0, h - 9, d / 2 + 0.3]} s={[w - 2, 12, 0.6]} m={glass} />
      {[-0.3, -0.1, 0.1, 0.3].map((f, i) => (
        <Cyl key={i} p={[w * f, h - 9, d / 2 + 1.5]} rt={1.8} h={2.4} m={chrome} r={[Math.PI / 2, 0, 0]} />
      ))}
      <B p={[0, 6 + doorH / 2, d / 2 + 0.6]} s={[w - 3, doorH, 1.2]} m={glass} />
      <B p={[0, 6 + doorH - 4, d / 2 + 3]} s={[w - 12, 1.6, 1.6]} m={chrome} />
    </group>
  );
}

export function Fridge({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const body = mat('lacquer', color);
  const gap = mat('matte', '#2a2a2a');
  const chrome = mat('chrome');
  const split = h * 0.36;
  return (
    <group>
      <B p={[0, h / 2, -1]} s={[w, h, d - 2]} m={body} />
      <B p={[0, split / 2 + 1, d / 2 - 1]} s={[w - 0.6, split - 1, 2]} m={body} />
      <B p={[0, split + (h - split) / 2, d / 2 - 1]} s={[w - 0.6, h - split - 1, 2]} m={body} />
      <B p={[0, split, d / 2 - 0.2]} s={[w, 0.5, 0.6]} m={gap} />
      <B p={[w / 2 - 5, split + 30, d / 2 + 1.5]} s={[1.5, 40, 2]} m={chrome} />
      <B p={[w / 2 - 5, split - 20, d / 2 + 1.5]} s={[1.5, 30, 2]} m={chrome} />
    </group>
  );
}
