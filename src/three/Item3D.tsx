import { Html, Line } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { getFurniture } from '../catalog/furniture';
import { computeWalls, DEG, distancesToWalls, footprintHalfExtents, rayToWall, snapAngle } from '../core/geometry';
import type { FloorItem, OpeningItem } from '../core/types';
import { useEditor } from '../store/editorStore';
import { FurnitureModel, OpeningModel } from './models/registry';
import { useCaptureState } from './sceneBridge';

const SELECT_COLOR = '#2f6fd6';
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const tmp = new THREE.Vector3();
/** Görünmez ama ışın testine giren tıklama alanları için malzeme */
const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

function useControlsLock() {
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const setInteracting = useEditor((s) => s.setInteracting);
  return (on: boolean) => {
    if (controls) controls.enabled = !on;
    setInteracting(on);
    document.body.style.cursor = on ? 'grabbing' : '';
  };
}

function SelectionBox({ w, h, d, y = 0 }: { w: number; h: number; d: number; y?: number }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 2, h + 2, d + 2)), [w, h, d]);
  return (
    <lineSegments geometry={geo} position={[0, y + h / 2, 0]} renderOrder={10}>
      <lineBasicMaterial color={SELECT_COLOR} depthTest={false} transparent opacity={0.9} />
    </lineSegments>
  );
}

/** Zemin üzerindeki döndürme halkası + tutamak */
function RotateHandle({ item }: { item: FloorItem }) {
  const rotateTo = useEditor((s) => s.updateItem);
  const checkpoint = useEditor((s) => s.checkpoint);
  const lock = useControlsLock();
  const dragging = useRef(false);
  const r = Math.max(item.size.w, item.size.d) / 2 + 22;
  const a = item.rotation * DEG;
  const knob: [number, number, number] = [Math.sin(a) * r, 1.5, Math.cos(a) * r];

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    checkpoint();
    dragging.current = true;
    lock(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(floorPlane, tmp)) return;
    const deg = Math.atan2(tmp.x - item.position.x, tmp.z - item.position.z) / DEG;
    rotateTo(item.id, { rotation: snapAngle(deg, 5, 4) }, true);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    dragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    lock(false);
  };

  return (
    <group position={[item.position.x, 0, item.position.z]} onClick={(e) => e.stopPropagation()}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]} renderOrder={5}>
        <ringGeometry args={[r - 1.2, r + 1.2, 96]} />
        <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh position={knob} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerOver={() => (document.body.style.cursor = 'grab')} onPointerOut={() => !dragging.current && (document.body.style.cursor = '')}>
        <sphereGeometry args={[7, 20, 14]} />
        <meshStandardMaterial color={SELECT_COLOR} emissive={SELECT_COLOR} emissiveIntensity={0.35} />
      </mesh>
      {/* dokunmatik ekranlar için geniş görünmez tutamak */}
      <mesh position={knob} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} material={hitMaterial}>
        <sphereGeometry args={[16, 8, 6]} />
      </mesh>
    </group>
  );
}

/** Seçili nesneden duvarlara ölçü çizgileri (en yakın iki duvar). */
function WallDistances({ item }: { item: FloorItem }) {
  const room = useEditor((s) => s.project!.room);
  const walls = useMemo(() => computeWalls(room), [room]);
  const lines = useMemo(() => {
    const { hx, hz } = footprintHalfExtents(item.size, item.rotation);
    return distancesToWalls(item, walls)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .filter((d) => d.distance > 1)
      .map(({ wallIndex, distance }) => {
        const n = walls[wallIndex].normal;
        const ext = Math.abs(hx * n.x) + Math.abs(hz * n.z);
        const sx = item.position.x - n.x * ext;
        const sz = item.position.z - n.z * ext;
        const ex = sx - n.x * distance;
        const ez = sz - n.z * distance;
        return { key: wallIndex, a: [sx, 2, sz] as [number, number, number], b: [ex, 2, ez] as [number, number, number], mid: [(sx + ex) / 2, 4, (sz + ez) / 2] as [number, number, number], distance };
      });
  }, [item, walls]);
  return (
    <>
      {lines.map((l) => (
        <group key={l.key}>
          <Line points={[l.a, l.b]} color="#e0673a" lineWidth={2} dashed dashSize={6} gapSize={4} depthTest={false} renderOrder={6} />
          <Html position={l.mid} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="dim-label dim-label--accent">{Math.round(l.distance)} cm</div>
          </Html>
        </group>
      ))}
    </>
  );
}

export const FloorItem3D = memo(function FloorItem3D({ item, selected }: { item: FloorItem; selected: boolean }) {
  const def = getFurniture(item.catalogId);
  const select = useEditor((s) => s.select);
  const move = useEditor((s) => s.moveFloorItem);
  const checkpoint = useEditor((s) => s.checkpoint);
  const showMeasurements = useEditor((s) => s.showMeasurements);
  const capturing = useCaptureState((s) => s.capturing);
  const lock = useControlsLock();
  const drag = useRef<{ dx: number; dz: number; moved: boolean; pointerId: number } | null>(null);

  if (!def) return null;

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    select({ type: 'item', id: item.id });
    if (item.locked) return;
    if (!e.ray.intersectPlane(floorPlane, tmp)) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { dx: tmp.x - item.position.x, dz: tmp.z - item.position.z, moved: false, pointerId: e.pointerId };
    lock(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(floorPlane, tmp)) return;
    if (!d.moved) {
      checkpoint(); // ilk harekette geri alma noktası
      d.moved = true;
    }
    move(item.id, { x: tmp.x - d.dx, z: tmp.z - d.dz }, true);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    lock(false);
  };

  const showHelpers = selected && !capturing;
  return (
    <>
      <group
        position={[item.position.x, item.elevation, item.position.z]}
        rotation={[0, item.rotation * DEG, 0]}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => e.stopPropagation()}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!drag.current) document.body.style.cursor = item.locked ? 'not-allowed' : 'grab';
        }}
        onPointerOut={() => !drag.current && (document.body.style.cursor = '')}
      >
        <FurnitureModel def={def} size={item.size} color={item.color ?? def.colors[0]} />
        {showHelpers && <SelectionBox w={item.size.w} h={item.size.h} d={item.size.d} />}
        {showHelpers && showMeasurements && (
          <Html position={[0, item.size.h + 14, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="dim-label">
              {Math.round(item.size.w)} × {Math.round(item.size.d)} × {Math.round(item.size.h)} cm
            </div>
          </Html>
        )}
      </group>
      {showHelpers && !item.locked && <RotateHandle item={item} />}
      {showHelpers && showMeasurements && <WallDistances item={item} />}
    </>
  );
});

export function OpeningItem3D({ item, wallThickness, hiddenRef }: { item: OpeningItem; wallThickness: number; hiddenRef: MutableRefObject<boolean> }) {
  const def = getFurniture(item.catalogId);
  const selected = useEditor((s) => s.selection?.type === 'item' && s.selection.id === item.id);
  const select = useEditor((s) => s.select);
  const moveOpening = useEditor((s) => s.moveOpening);
  const checkpoint = useEditor((s) => s.checkpoint);
  const capturing = useCaptureState((s) => s.capturing);
  const lock = useControlsLock();
  const drag = useRef<{ du: number; wall: number; moved: boolean } | null>(null);

  if (!def) return null;

  const hitWall = (e: ThreeEvent<PointerEvent>) => {
    const p = useEditor.getState().project!;
    return rayToWall(e.ray.origin, e.ray.direction, computeWalls(p.room), p.room.height);
  };

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (hiddenRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    select({ type: 'item', id: item.id });
    if (item.locked) return;
    const hit = hitWall(e);
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { du: hit && hit.wallIndex === item.wallIndex ? hit.u - item.offset : 0, wall: item.wallIndex, moved: false };
    lock(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const hit = hitWall(e);
    if (!hit) return;
    if (!d.moved) {
      checkpoint();
      d.moved = true;
    }
    if (hit.wallIndex !== d.wall) {
      d.wall = hit.wallIndex;
      d.du = 0;
    }
    moveOpening(item.id, hit.wallIndex, hit.u - d.du, true);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    lock(false);
  };

  const { w, h } = item.size;
  return (
    <group
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={(e) => !hiddenRef.current && e.stopPropagation()}
      onPointerOver={(e) => {
        if (hiddenRef.current) return;
        e.stopPropagation();
        document.body.style.cursor = 'ew-resize';
      }}
      onPointerOut={() => !drag.current && (document.body.style.cursor = '')}
    >
      <OpeningModel def={def} size={item.size} color={item.color ?? def.colors[0]} wallThickness={wallThickness} flip={item.flip} />
      {/* açıklığın tamamını tıklanabilir yapan görünmez yüzey */}
      <mesh position={[0, h / 2, -wallThickness / 2]} material={hitMaterial}>
        <boxGeometry args={[w, h, wallThickness + 4]} />
      </mesh>
      {selected && !capturing && (
        <group position={[0, 0, -wallThickness / 2]}>
          <SelectionBox w={w + 14} h={h + 7} d={wallThickness + 4} y={-1} />
        </group>
      )}
    </group>
  );
}
