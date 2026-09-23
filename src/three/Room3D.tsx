import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { computeWalls, roomBounds } from '../core/geometry';
import type { FloorItem, OpeningItem } from '../core/types';
import { findWallpaper, useAllWallpapers } from '../store/catalogStore';
import { useEditor } from '../store/editorStore';
import { FloorItem3D } from './Item3D';
import { useCaptureState } from './sceneBridge';
import { getFloorTexture } from './textures';
import { Wall3D } from './Wall3D';

function Floor() {
  const room = useEditor((s) => s.project!.room);
  const materialId = useEditor((s) => s.project!.floor.materialId);
  const select = useEditor((s) => s.select);

  const geo = useMemo(() => {
    const shape = new THREE.Shape(room.corners.map((c) => new THREE.Vector2(c.x, -c.z)));
    return new THREE.ShapeGeometry(shape);
  }, [room.corners]);
  useEffect(() => () => geo.dispose(), [geo]);

  const material = useMemo(() => {
    const { texture, tileW, tileH, roughness } = getFloorTexture(materialId);
    const t = texture.clone();
    t.repeat.set(1 / tileW, 1 / tileH);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness, metalness: 0 });
  }, [materialId]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    select(null);
  };

  return <mesh geometry={geo} material={material} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick} />;
}

function Ground() {
  const room = useEditor((s) => s.project!.room);
  const b = roomBounds(room);
  const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 6 + 2000;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(b.minX + b.maxX) / 2, -0.6, (b.minZ + b.maxZ) / 2]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#e3e0da" roughness={1} />
    </mesh>
  );
}

function RoomDimensions() {
  const room = useEditor((s) => s.project!.room);
  const show = useEditor((s) => s.showMeasurements);
  const capturing = useCaptureState((s) => s.capturing);
  const walls = useMemo(() => computeWalls(room), [room]);
  if (!show || capturing) return null;
  return (
    <>
      {walls.map((w) => {
        const off = room.wallThickness + 28;
        const x = w.start.x + w.dir.x * (w.length / 2) - w.normal.x * off;
        const z = w.start.z + w.dir.z * (w.length / 2) - w.normal.z * off;
        return (
          <Html key={w.index} position={[x, 2, z]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="dim-label dim-label--room">{Math.round(w.length)} cm</div>
          </Html>
        );
      })}
    </>
  );
}

export function Room3D() {
  const project = useEditor((s) => s.project!);
  const selection = useEditor((s) => s.selection);
  const wallpapers = useAllWallpapers();
  const walls = useMemo(() => computeWalls(project.room), [project.room]);

  const openingsByWall = useMemo(() => {
    const map = new Map<number, OpeningItem[]>();
    for (const it of project.items) {
      if (it.kind !== 'opening') continue;
      const list = map.get(it.wallIndex) ?? [];
      list.push(it);
      map.set(it.wallIndex, list);
    }
    return map;
  }, [project.items]);

  const floorItems = project.items.filter((i): i is FloorItem => i.kind === 'floor');

  return (
    <group>
      <Ground />
      <Floor />
      {walls.map((w) => {
        const finish = project.walls[w.index];
        const wp = finish?.wallpaper ? findWallpaper(finish.wallpaper.wallpaperId, wallpapers) : undefined;
        return (
          <Wall3D
            key={w.index}
            wall={w}
            height={project.room.height}
            thickness={project.room.wallThickness}
            finish={finish}
            wallpaper={wp}
            openings={openingsByWall.get(w.index) ?? EMPTY}
            selected={selection?.type === 'wall' && selection.index === w.index}
          />
        );
      })}
      {floorItems.map((it) => (
        <FloorItem3D key={it.id} item={it} selected={selection?.type === 'item' && selection.id === it.id} />
      ))}
      <RoomDimensions />
    </group>
  );
}

const EMPTY: OpeningItem[] = [];
