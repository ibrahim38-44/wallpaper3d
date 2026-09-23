import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OpeningItem, WallFinish, WallInfo, WallpaperDef } from '../core/types';
import { useEditor } from '../store/editorStore';
import { OpeningItem3D } from './Item3D';
import { useWallpaperTexture } from './useWallpaperTexture';

const BASEBOARD_H = 8;
const FLOOR_OPENING_EPS = 1;

interface Props {
  wall: WallInfo;
  height: number;
  thickness: number;
  finish: WallFinish;
  wallpaper?: WallpaperDef;
  openings: OpeningItem[];
  selected: boolean;
}

/**
 * Duvarın 2D profili (u = duvar boyunca, v = yükseklik).
 * Zemine oturan açıklıklar (kapı) dış konturda çentik olarak, diğerleri delik olarak eklenir;
 * böylece üçgenleme (earcut) kenara değen deliklerde bozulmaz.
 */
export function buildWallShape(length: number, height: number, openings: OpeningItem[]): THREE.Shape {
  const shape = new THREE.Shape();
  const clampU = (u: number) => Math.max(1, Math.min(length - 1, u));
  const floorOps = openings
    .filter((o) => o.elevation <= FLOOR_OPENING_EPS)
    .map((o) => ({ a: clampU(o.offset - o.size.w / 2), b: clampU(o.offset + o.size.w / 2), h: Math.min(height - 1, o.size.h) }))
    .sort((p, q) => p.a - q.a);
  shape.moveTo(0, 0);
  let cursor = 0;
  for (const f of floorOps) {
    if (f.a <= cursor + 0.5 || f.b - f.a < 1) continue; // çakışanları atla
    shape.lineTo(f.a, 0);
    shape.lineTo(f.a, f.h);
    shape.lineTo(f.b, f.h);
    shape.lineTo(f.b, 0);
    cursor = f.b;
  }
  shape.lineTo(length, 0);
  shape.lineTo(length, height);
  shape.lineTo(0, height);
  shape.closePath();

  for (const o of openings) {
    if (o.elevation <= FLOOR_OPENING_EPS) continue;
    const a = clampU(o.offset - o.size.w / 2);
    const b = clampU(o.offset + o.size.w / 2);
    const v0 = Math.max(1, o.elevation);
    const v1 = Math.min(height - 1, o.elevation + o.size.h);
    if (b - a < 1 || v1 - v0 < 1) continue;
    const hole = new THREE.Path();
    hole.moveTo(a, v0);
    hole.lineTo(a, v1);
    hole.lineTo(b, v1);
    hole.lineTo(b, v0);
    hole.closePath();
    shape.holes.push(hole);
  }
  return shape;
}

/** Süpürgelik parçaları: kapı açıklıkları hariç. */
function baseboardSegments(length: number, openings: OpeningItem[]): [number, number][] {
  const cuts = openings
    .filter((o) => o.elevation < BASEBOARD_H)
    .map((o) => [o.offset - o.size.w / 2 - 7, o.offset + o.size.w / 2 + 7] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const segs: [number, number][] = [];
  let cur = 0;
  for (const [a, b] of cuts) {
    if (a > cur) segs.push([cur, Math.min(a, length)]);
    cur = Math.max(cur, b);
  }
  if (cur < length) segs.push([cur, length]);
  return segs.filter(([a, b]) => b - a > 2);
}

const bodyMaterials = [
  new THREE.MeshStandardMaterial({ color: '#f1eee9', roughness: 0.95 }), // ön/arka yüz
  new THREE.MeshStandardMaterial({ color: '#d4cfc6', roughness: 0.95 }), // kesit/üst kenar/pervazlar
];
const baseboardMat = new THREE.MeshStandardMaterial({ color: '#f7f6f3', roughness: 0.4 });
const outlineMat = new THREE.MeshStandardMaterial({ color: '#8f8a82', roughness: 1 });

export function Wall3D({ wall, height, thickness, finish, wallpaper, openings, selected }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const hiddenRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const select = useEditor((s) => s.select);
  const setPanel = useEditor((s) => s.setPanel);

  // Yalnızca açıklık geometrisi değiştiğinde duvarı yeniden üret (mobilya sürüklerken değil)
  const sig = openings.map((o) => `${o.offset.toFixed(1)},${o.elevation},${o.size.w},${o.size.h}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shape = useMemo(() => buildWallShape(wall.length, height, openings), [wall.length, height, sig]);
  const surfaceGeo = useMemo(() => new THREE.ShapeGeometry(shape, 1), [shape]);
  const bodyGeo = useMemo(() => new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), [shape, thickness]);
  useEffect(() => () => surfaceGeo.dispose(), [surfaceGeo]);
  useEffect(() => () => bodyGeo.dispose(), [bodyGeo]);

  const texture = useWallpaperTexture(wallpaper, height, finish.wallpaper?.offsetU ?? 0, finish.wallpaper?.offsetV ?? 0);

  const surfaceMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), []);
  useEffect(() => () => surfaceMat.dispose(), [surfaceMat]);
  useEffect(() => {
    surfaceMat.map = texture;
    surfaceMat.color.set(texture ? '#ffffff' : finish.paintColor);
    const finishType = wallpaper?.finish;
    surfaceMat.roughness = texture ? (finishType === 'satin' ? 0.55 : finishType === 'textured' ? 0.95 : 0.85) : 0.92;
    surfaceMat.emissive.set(selected ? '#2f6fd6' : hovered ? '#6b8fd6' : '#000000');
    surfaceMat.emissiveIntensity = selected ? 0.16 : hovered ? 0.08 : 0;
    surfaceMat.needsUpdate = true;
  }, [surfaceMat, texture, finish.paintColor, wallpaper?.finish, selected, hovered]);

  // Kamera duvarın dış tarafındaysa duvarı gizle (kesit görünüm).
  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g) return;
    const s = (camera.position.x - wall.start.x) * wall.normal.x + (camera.position.z - wall.start.z) * wall.normal.z;
    const hide = s < -2;
    if (hide !== hiddenRef.current) {
      hiddenRef.current = hide;
      g.visible = !hide;
      if (hide) setHovered(false);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (hiddenRef.current || e.delta > 5) return;
    e.stopPropagation();
    select({ type: 'wall', index: wall.index });
    setPanel('wallpaper', window.matchMedia('(max-width: 900px)').matches);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const segments = useMemo(() => baseboardSegments(wall.length, openings), [wall.length, sig]);

  return (
    <group position={[wall.start.x, 0, wall.start.z]} rotation={[0, wall.rotationY, 0]}>
      {/* Duvar gizlense bile oda sınırı görünür kalsın */}
      <mesh position={[wall.length / 2, 1, -thickness / 2]} material={outlineMat} receiveShadow>
        <boxGeometry args={[wall.length + thickness * 2, 2, thickness]} />
      </mesh>
      <group ref={groupRef}>
        <mesh geometry={bodyGeo} material={bodyMaterials} position={[0, 0, -thickness]} receiveShadow />
        <mesh
          geometry={surfaceGeo}
          material={surfaceMat}
          position={[0, 0, 0.15]}
          receiveShadow
          onClick={onClick}
          onPointerOver={(e) => {
            if (hiddenRef.current) return;
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        />
        {segments.map(([a, b], i) => (
          <mesh key={i} position={[(a + b) / 2, BASEBOARD_H / 2, 0.9]} material={baseboardMat} castShadow receiveShadow>
            <boxGeometry args={[b - a, BASEBOARD_H, 1.5]} />
          </mesh>
        ))}
        {openings.map((o) => (
          <group key={o.id} position={[o.offset, o.elevation, 0]}>
            <OpeningItem3D item={o} wallThickness={thickness} hiddenRef={hiddenRef} />
          </group>
        ))}
      </group>
    </group>
  );
}
