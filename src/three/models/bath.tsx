import { mat, shade } from '../materials';
import { B, Cyl, RB, type ModelProps } from './primitives';

export function Basin({ size, color }: ModelProps) {
  const { w, d, h } = size;
  const cab = mat('lacquer', color);
  const ceramic = mat('ceramic', '#fbfbf9');
  const bowl = mat('ceramic', '#eeeeea');
  const chrome = mat('chrome');
  const legH = 14;
  const topH = 12;
  const cabTop = h - topH;
  return (
    <group>
      {[-1, 1].map((s) => (
        <Cyl key={s} p={[s * (w / 2 - 4), legH / 2, d / 2 - 6]} rt={1.2} h={legH} m={chrome} seg={8} />
      ))}
      <B p={[0, legH + (cabTop - legH) / 2, -1]} s={[w, cabTop - legH, d - 2]} m={cab} />
      <B p={[0, legH + (cabTop - legH) / 2, d / 2 - 0.9]} s={[w - 1, cabTop - legH - 1, 1.6]} m={mat('lacquer', shade(color, 0.02))} />
      <B p={[0, legH + (cabTop - legH) * 0.8, d / 2 + 0.6]} s={[Math.min(30, w * 0.4), 1.2, 1.4]} m={chrome} />
      <RB p={[0, h - topH / 2, 0]} s={[w, topH, d]} m={ceramic} radius={2.5} />
      <group position={[0, h + 0.02, 3]} scale={[1, 1, (d * 0.55) / (w * 0.7)]}>
        <Cyl p={[0, 0, 0]} rt={(w * 0.7) / 2} h={0.4} m={bowl} seg={40} />
      </group>
      <Cyl p={[0, h + 8, -d / 2 + 6]} rt={1.5} h={16} m={chrome} />
      <B p={[0, h + 15, -d / 2 + 11]} s={[2, 2, 10]} m={chrome} />
      {/* ayna */}
      <B p={[0, h + 60, -d / 2 + 1]} s={[w * 0.9 + 3, 73, 1.5]} m={mat('matte', '#2d2d2d')} />
      <B p={[0, h + 60, -d / 2 + 1.9]} s={[w * 0.9, 70, 0.3]} m={mat('mirror')} />
    </group>
  );
}

export function Toilet({ size }: ModelProps) {
  const { w, d, h } = size;
  const c = mat('ceramic', '#fbfbf9');
  const seat = mat('plastic', '#f4f4f2');
  const tankD = 18;
  const bowlD = d - tankD;
  const bowlZ = -d / 2 + tankD + bowlD / 2 - 2;
  return (
    <group>
      <group position={[0, 0, bowlZ - 3]} scale={[1, 1, 1.35]}>
        <Cyl p={[0, 19, 0]} rt={w * 0.32} rb={w * 0.26} h={38} m={c} seg={28} />
      </group>
      <group position={[0, 0, bowlZ]} scale={[1, 1, bowlD / w]}>
        <Cyl p={[0, 40, 0]} rt={w / 2} rb={w * 0.38} h={8} m={c} seg={32} />
        <Cyl p={[0, 45, 0]} rt={w / 2} h={2} m={seat} seg={32} />
      </group>
      <RB p={[0, 45 + (h - 45) / 2, -d / 2 + tankD / 2]} s={[w, h - 45, tankD]} m={c} radius={3} />
      <Cyl p={[0, h + 0.4, -d / 2 + tankD / 2]} rt={2.5} h={0.8} m={mat('chrome')} />
    </group>
  );
}

export function Bathtub({ size }: ModelProps) {
  const { w, d, h } = size;
  const c = mat('ceramic', '#fbfbf9');
  const inner = mat('ceramic', '#f1f1ee');
  const t = 7;
  return (
    <group>
      <RB p={[0, h / 2, -d / 2 + t / 2]} s={[w, h, t]} m={c} radius={2} />
      <RB p={[0, h / 2, d / 2 - t / 2]} s={[w, h, t]} m={c} radius={2} />
      <RB p={[-w / 2 + t / 2, h / 2, 0]} s={[t, h, d]} m={c} radius={2} />
      <RB p={[w / 2 - t / 2, h / 2, 0]} s={[t, h, d]} m={c} radius={2} />
      <B p={[0, 6, 0]} s={[w - 2 * t, 12, d - 2 * t]} m={inner} />
      <Cyl p={[-w / 2 + t / 2, h + 6, 0]} rt={1.5} h={12} m={mat('chrome')} />
      <B p={[-w / 2 + t / 2 + 5, h + 11, 0]} s={[10, 2, 2]} m={mat('chrome')} />
    </group>
  );
}
