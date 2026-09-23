import { mat, shade } from '../materials';
import { B, Cyl, RB, legPositions, type ModelProps } from './primitives';

/** Döşemeli yemek sandalyesi: kumaş oturak/sırt, ahşap konik ayaklar. */
export function UpholsteredChair({ size, color, color2 = '#6b4a33' }: ModelProps) {
  const { w, d, h } = size;
  const fab = mat('fabric', color);
  const leg = mat('wood', color2);
  const seatH = 47;
  const legTop = seatH - 7;
  return (
    <group>
      {legPositions(w, d, 4).map(([x, z], i) => (
        <Cyl key={i} p={[x, legTop / 2, z]} rt={1.8} rb={1.2} h={legTop} m={leg} seg={10} r={[z < 0 ? 0.05 : -0.05, 0, 0]} />
      ))}
      <RB p={[0, seatH - 4, 1]} s={[w, 8, d - 2]} m={fab} radius={3} />
      <RB p={[0, seatH + (h - seatH) / 2, -d / 2 + 4]} s={[w - 2, h - seatH, 6]} m={fab} radius={3} r={[-0.1, 0, 0]} />
    </group>
  );
}

/** Ofis sandalyesi: 5 kollu tekerlekli ayak, amortisör, oturak, sırt ve kolçaklar. */
export function OfficeChair({ size, color, color2 = '#2a2a2a' }: ModelProps) {
  const { w, d, h } = size;
  const fab = mat('fabric', color);
  const base = mat('metal', color2);
  const wheel = mat('plastic', '#1b1b1b');
  const r = Math.min(w, d) / 2 - 3;
  const seatH = 48;
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <B p={[r / 2, 7, 0]} s={[r, 2.5, 4]} m={base} />
            <Cyl p={[r - 1, 3, 0]} rt={3} h={3.5} m={wheel} seg={12} r={[Math.PI / 2, 0, 0]} />
          </group>
        );
      })}
      <Cyl p={[0, 7, 0]} rt={5} h={4} m={base} seg={16} />
      <Cyl p={[0, (seatH - 6) / 2 + 6, 0]} rt={2.2} h={seatH - 12} m={mat('chrome')} seg={12} />
      <RB p={[0, seatH, 2]} s={[w - 10, 9, d - 12]} m={fab} radius={3.5} />
      <RB p={[0, seatH + 8 + (h - seatH - 8) / 2, -d / 2 + 8]} s={[w - 14, h - seatH - 8, 7]} m={fab} radius={3.5} r={[-0.12, 0, 0]} />
      <B p={[0, seatH + 10, -d / 2 + 10]} s={[4, 16, 3]} m={base} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <B p={[s * (w / 2 - 5), seatH + 11, 4]} s={[2.5, 18, 3]} m={base} />
          <RB p={[s * (w / 2 - 5), seatH + 20, 4]} s={[6, 3, 24]} m={mat('plastic', shade(color2, 0.05))} radius={1.2} />
        </group>
      ))}
    </group>
  );
}

/** Bar taburesi: yuvarlak döşemeli oturak, 4 ince ayak ve ayak desteği halkası. */
export function BarStool({ size, color, color2 = '#2a2a2a' }: ModelProps) {
  const { w, d, h } = size;
  const seat = mat('fabric', color);
  const metal = mat('metal', color2);
  const r = Math.min(w, d) / 2;
  const seatT = 7;
  const legH = h - seatT;
  const foot = legH * 0.32;
  return (
    <group>
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const bx = Math.cos(a) * (r - 2);
        const bz = Math.sin(a) * (r - 2);
        const tx = Math.cos(a) * (r * 0.55);
        const tz = Math.sin(a) * (r * 0.55);
        const len = Math.hypot(legH, Math.hypot(bx - tx, bz - tz));
        const tilt = Math.atan2(Math.hypot(bx - tx, bz - tz), legH);
        return (
          <group key={i} position={[(bx + tx) / 2, legH / 2, (bz + tz) / 2]} rotation={[0, -a, 0]}>
            <Cyl p={[0, 0, 0]} rt={1.2} h={len} m={metal} seg={10} r={[0, 0, tilt]} />
          </group>
        );
      })}
      <mesh position={[0, foot, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal} castShadow>
        <torusGeometry args={[r * 0.82, 0.9, 8, 40]} />
      </mesh>
      <Cyl p={[0, legH + seatT / 2, 0]} rt={r * 0.95} rb={r * 0.85} h={seatT} m={seat} seg={36} />
    </group>
  );
}

/** Puf: yumuşak silindir, dikişli üst yüzey, kısa ahşap ayaklar. */
export function Pouf({ size, color, color2 = '#6b4a33' }: ModelProps) {
  const { w, d, h } = size;
  const fab = mat('fabric', color);
  const leg = mat('wood', color2);
  const legH = 6;
  return (
    <group>
      {legPositions(w * 0.75, d * 0.75, 2).map(([x, z], i) => (
        <Cyl key={i} p={[x, legH / 2, z]} rt={1.6} rb={1.2} h={legH} m={leg} seg={8} />
      ))}
      <group scale={[1, 1, d / w]}>
        <Cyl p={[0, legH + (h - legH) / 2, 0]} rt={w / 2 - 1} rb={w / 2 - 2} h={h - legH} m={fab} seg={40} />
        <mesh position={[0, h + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('fabric', shade(color, -0.08))}>
          <ringGeometry args={[w / 2 - 5, w / 2 - 4, 48]} />
        </mesh>
      </group>
    </group>
  );
}
