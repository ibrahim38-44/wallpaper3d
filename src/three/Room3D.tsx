import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { computeWalls, roomBounds } from '../core/geometry';
import { foreignHolesForWall, houseBounds } from '../core/house';
import type { FloorItem, OpeningItem, RoomDoc } from '../core/types';
import { findWallpaper, useAllWallpapers } from '../store/catalogStore';
import { useEditor } from '../store/editorStore';
import { FloorItem3D } from './Item3D';
import { activateRoom, RoomContext, useRoomCtx } from './roomContext';
import { useCaptureState } from './sceneBridge';
import { getFloorTexture } from './textures';
import { Wall3D } from './Wall3D';

const activeFloorTint = new THREE.Color('#ffffff');
const inactiveFloorTint = new THREE.Color('#d9d6d0');

function Floor() {
  const { doc, isActive } = useRoomCtx();
  const room = doc.room;
  const materialId = doc.floor.materialId;
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
  // Çok odalı evde aktif olmayan odalar hafif soluk görünür
  useEffect(() => {
    material.color.copy(isActive ? activeFloorTint : inactiveFloorTint);
  }, [material, isActive]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    if (!isActive) activateRoom(doc.id);
    else select(null);
  };

  return <mesh geometry={geo} material={material} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick} />;
}

function Ground() {
  const rooms = useEditor((s) => s.project!.rooms);
  const b = houseBounds(rooms);
  const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) * 6 + 2000;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(b.minX + b.maxX) / 2, -0.6, (b.minZ + b.maxZ) / 2]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#e3e0da" roughness={1} />
    </mesh>
  );
}

function RoomLabels({ multi }: { multi: boolean }) {
  const { doc, isActive } = useRoomCtx();
  const show = useEditor((s) => s.showMeasurements);
  const capturing = useCaptureState((s) => s.capturing);
  const walls = useMemo(() => computeWalls(doc.room), [doc.room]);
  if (capturing) return null;
  const b = roomBounds(doc.room);
  return (
    <>
      {multi && (
        <Html position={[(b.minX + b.maxX) / 2, 4, (b.minZ + b.maxZ) / 2]} center zIndexRange={[12, 0]}>
          <button className={`room-tag ${isActive ? 'is-active' : ''}`} onClick={() => activateRoom(doc.id)}>
            {doc.room.name}
          </button>
        </Html>
      )}
      {show &&
        isActive &&
        walls.map((w) => {
          const off = doc.room.wallThickness + 28;
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

function RoomScene({ doc, index, rooms }: { doc: RoomDoc; index: number; rooms: RoomDoc[] }) {
  const isActive = useEditor((s) => s.project!.activeRoomId === doc.id);
  const selection = useEditor((s) => s.selection);
  const wallpapers = useAllWallpapers();
  const walls = useMemo(() => computeWalls(doc.room), [doc.room]);
  const ctx = useMemo(() => ({ doc, isActive }), [doc, isActive]);

  const openingsByWall = useMemo(() => {
    const map = new Map<number, OpeningItem[]>();
    for (const it of doc.items) {
      if (it.kind !== 'opening') continue;
      const list = map.get(it.wallIndex) ?? [];
      list.push(it);
      map.set(it.wallIndex, list);
    }
    return map;
  }, [doc.items]);

  // Komşu odaların ortak duvardaki kapı/pencereleri (yalnızca birden çok oda varsa)
  const foreign = useMemo(
    () => (rooms.length > 1 ? walls.map((w) => foreignHolesForWall(rooms, index, w.index)) : walls.map(() => [])),
    [rooms, index, walls],
  );

  const floorItems = doc.items.filter((i): i is FloorItem => i.kind === 'floor');

  return (
    <RoomContext.Provider value={ctx}>
      <group position={[doc.origin.x, 0, doc.origin.z]}>
        <Floor />
        {walls.map((w) => {
          const finish = doc.walls[w.index];
          const wp = finish?.wallpaper ? findWallpaper(finish.wallpaper.wallpaperId, wallpapers) : undefined;
          return (
            <Wall3D
              key={w.index}
              wall={w}
              height={doc.room.height}
              thickness={doc.room.wallThickness}
              finish={finish}
              wallpaper={wp}
              openings={openingsByWall.get(w.index) ?? EMPTY}
              foreignHoles={foreign[w.index]}
              selected={isActive && selection?.type === 'wall' && selection.index === w.index}
            />
          );
        })}
        {floorItems.map((it) => (
          <FloorItem3D key={it.id} item={it} selected={isActive && selection?.type === 'item' && selection.id === it.id} />
        ))}
        <RoomLabels multi={rooms.length > 1} />
      </group>
    </RoomContext.Provider>
  );
}

/** Tüm ev: her oda kendi konumunda çizilir; aktif oda düzenlenir, diğerine dokunmak onu aktif yapar. */
export function Room3D() {
  const rooms = useEditor((s) => s.project!.rooms);
  return (
    <group>
      <Ground />
      {rooms.map((r, i) => (
        <RoomScene key={r.id} doc={r} index={i} rooms={rooms} />
      ))}
    </group>
  );
}

const EMPTY: OpeningItem[] = [];
