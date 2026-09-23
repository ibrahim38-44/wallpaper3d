import { CameraControls, Environment, Lightformer } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type ComponentRef, type DragEvent } from 'react';
import * as THREE from 'three';
import { getFurniture } from '../catalog/furniture';
import { computeWalls, rayToFloor, rayToWall, roomBounds } from '../core/geometry';
import { useEditor } from '../store/editorStore';
import { Room3D } from './Room3D';
import { sceneBridge, useCaptureState } from './sceneBridge';
import { setMaxAnisotropy } from './textures';

function Lights() {
  const room = useEditor((s) => s.project!.room);
  const b = roomBounds(room);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = lightRef.current;
    if (!l) return;
    l.target.position.set(cx, 0, cz);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    const e = span * 0.85 + 100;
    cam.left = -e;
    cam.right = e;
    cam.top = e;
    cam.bottom = -e;
    cam.near = 10;
    cam.far = span * 6 + room.height * 6;
    cam.updateProjectionMatrix();
  }, [cx, cz, span, room.height]);
  return (
    <>
      <hemisphereLight args={['#fffaf2', '#b8ab98', 1.1]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={lightRef}
        position={[cx + span * 0.7, room.height * 3 + span, cz + span * 1.1]}
        intensity={1.6}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={1.5}
      />
      {/* tavan ışığı hissi: oda içinde yumuşak dolgu */}
      <pointLight position={[cx, room.height - 20, cz]} intensity={span * span * 0.18} distance={span * 3} decay={2} color="#fff1dc" />
    </>
  );
}

/** Kamera görünümleri + DOM köprüsünün bağlanması. */
function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof CameraControls>>(null);
  const view = useEditor((s) => s.view);
  const viewNonce = useEditor((s) => s.viewNonce);
  const interacting = useEditor((s) => s.interacting);
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    const c = controlsRef.current;
    const { project, selection } = useEditor.getState();
    if (!c || !project) return;
    const room = project.room;
    const b = roomBounds(room);
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const W = b.maxX - b.minX;
    const L = b.maxZ - b.minZ;
    const span = Math.max(W, L);
    const H = room.height;
    const persp = camera as THREE.PerspectiveCamera;
    const vfov = (persp.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * persp.aspect);
    if (view === 'top') {
      const dist = Math.max(W / 2 / Math.tan(hfov / 2), L / 2 / Math.tan(vfov / 2)) * 1.15 + H;
      void c.setLookAt(cx, dist, cz + 0.01, cx, 0, cz, true);
    } else if (view === 'wall') {
      const walls = computeWalls(room);
      const w = walls[selection?.type === 'wall' ? selection.index : 0];
      const mx = w.start.x + w.dir.x * (w.length / 2);
      const mz = w.start.z + w.dir.z * (w.length / 2);
      const dist = Math.max(w.length / 2 / Math.tan(hfov / 2), H / 2 / Math.tan(vfov / 2)) * 1.08;
      void c.setLookAt(mx + w.normal.x * dist, H * 0.5, mz + w.normal.z * dist, mx, H * 0.48, mz, true);
    } else {
      const dist = span * 1.35 + 150;
      void c.setLookAt(cx + W * 0.28, H + span * 0.55, cz + L / 2 + dist * 0.75, cx, H * 0.3, cz, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewNonce, camera]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !interacting;
  }, [interacting]);

  // DOM köprüsü
  useEffect(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    const raycaster = new THREE.Raycaster();
    const toRay = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray;
    };
    sceneBridge.current = {
      screenToFloor(x, y) {
        const r = toRay(x, y);
        return rayToFloor(r.origin, r.direction, 0);
      },
      screenToWall(x, y) {
        const p = useEditor.getState().project;
        if (!p) return null;
        const r = toRay(x, y);
        const hit = rayToWall(r.origin, r.direction, computeWalls(p.room), p.room.height);
        return hit ? { wallIndex: hit.wallIndex, offset: hit.u } : null;
      },
      async capture() {
        const setCapturing = useCaptureState.getState().set;
        setCapturing(true);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL('image/png');
        setCapturing(false);
        return url;
      },
    };
  }, [gl, camera, scene]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={60}
      maxDistance={6000}
      maxPolarAngle={Math.PI / 2 - 0.02}
      dollyToCursor
      smoothTime={0.2}
    />
  );
}

export function Scene() {
  const hasProject = useEditor((s) => !!s.project);

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-wallpaper3d-item')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e: DragEvent) => {
    const id = e.dataTransfer.getData('application/x-wallpaper3d-item');
    if (!id) return;
    e.preventDefault();
    const def = getFurniture(id);
    if (!def) return;
    const { addItem } = useEditor.getState();
    if (def.placement === 'opening') {
      const hit = sceneBridge.current.screenToWall(e.clientX, e.clientY);
      addItem(id, hit ?? undefined);
    } else {
      const pos = sceneBridge.current.screenToFloor(e.clientX, e.clientY);
      addItem(id, pos ?? undefined);
    }
  };

  return (
    <div className="scene" onDragOver={onDragOver} onDrop={onDrop}>
      {hasProject && (
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, near: 5, far: 30000, position: [800, 900, 1400] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
          onPointerMissed={(e) => e.type === 'click' && useEditor.getState().select(null)}
        >
          <color attach="background" args={['#eceae6']} />
          <Lights />
          <Suspense fallback={null}>
            <Environment resolution={128} frames={1}>
              <Lightformer intensity={1.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
              <Lightformer intensity={0.8} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 3, 1]} />
              <Lightformer intensity={0.6} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 3, 1]} />
              <Lightformer intensity={0.5} color="#ffe8cc" position={[0, 1, 5]} scale={[20, 3, 1]} />
            </Environment>
          </Suspense>
          <Room3D />
          <CameraRig />
        </Canvas>
      )}
    </div>
  );
}
