import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ComponentType, type ReactNode } from 'react';
import * as THREE from 'three';
import type { FurnitureDef } from '../../catalog/furniture';
import type { Size3 } from '../../core/types';
import { Bed, Dresser, Nightstand, Wardrobe } from './bedroom';
import { Basin, Bathtub, Toilet } from './bath';
import { FloorLamp, Plant, Rug } from './decor';
import { Fridge, KitchenBase, KitchenSink, KitchenWall, Stove } from './kitchen';
import { Armchair, Bookshelf, Chair, CoffeeTable, Desk, Sofa, SofaL, Table, Tv, TvUnit } from './living';
import { BalconyDoor, Door, Window } from './openings';
import type { ModelProps, OpeningModelProps } from './primitives';

/** Prosedürel model kaydı – yeni mobilya tipi eklemek için buraya bir bileşen ekleyin. */
export const PROCEDURAL_MODELS: Record<string, ComponentType<ModelProps>> = {
  bed: Bed,
  wardrobe: Wardrobe,
  nightstand: Nightstand,
  dresser: Dresser,
  sofa: Sofa,
  sofaL: SofaL,
  armchair: Armchair,
  coffeeTable: CoffeeTable,
  tvUnit: TvUnit,
  tv: Tv,
  bookshelf: Bookshelf,
  table: Table,
  desk: Desk,
  chair: Chair,
  kitchenBase: KitchenBase,
  kitchenSink: KitchenSink,
  kitchenWall: KitchenWall,
  stove: Stove,
  fridge: Fridge,
  basin: Basin,
  toilet: Toilet,
  bathtub: Bathtub,
  rug: Rug,
  plant: Plant,
  floorLamp: FloorLamp,
};

export const OPENING_MODELS: Record<string, ComponentType<OpeningModelProps>> = {
  door: Door,
  window: Window,
  balconyDoor: BalconyDoor,
};

function FallbackBox({ size, color }: ModelProps) {
  return (
    <mesh position={[0, size.h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[size.w, size.h, size.d]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

/**
 * glTF/GLB modeli yükler ve istenen ölçüye (cm) tam sığdırır.
 * Model +Z yönüne bakacak ve Y-yukarı olacak şekilde dışa aktarılmış olmalıdır.
 * Birim farkı (m/cm) otomatik ölçeklemeyle giderilir.
 */
function GltfModel({ url, size }: { url: string; size: Size3 }) {
  const { scene } = useGLTF(url);
  const { object, scale, offset } = useMemo(() => {
    const obj = scene.clone(true);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
      object: obj,
      scale: new THREE.Vector3(size.w / (dim.x || 1), size.h / (dim.y || 1), size.d / (dim.z || 1)),
      offset: new THREE.Vector3(-center.x, -box.min.y, -center.z),
    };
  }, [scene, size.w, size.h, size.d]);
  return (
    <group scale={scale}>
      <primitive object={object} position={offset} />
    </group>
  );
}

class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[Wallpaper3D] 3D model yüklenemedi, prosedürel modele dönülüyor:', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function FurnitureModel({ def, size, color }: { def: FurnitureDef; size: Size3; color: string }) {
  const Procedural = PROCEDURAL_MODELS[def.model] ?? FallbackBox;
  const procedural = <Procedural size={size} color={color} />;
  if (!def.modelUrl) return procedural;
  return (
    <ModelErrorBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GltfModel url={def.modelUrl} size={size} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

export function OpeningModel({ def, size, color, wallThickness, flip }: { def: FurnitureDef; size: Size3; color: string; wallThickness: number; flip?: boolean }) {
  const M = OPENING_MODELS[def.model];
  if (!M) return null;
  return <M size={size} color={color} wallThickness={wallThickness} flip={flip} />;
}
