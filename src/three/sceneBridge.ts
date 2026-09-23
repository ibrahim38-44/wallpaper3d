import { create } from 'zustand';
import type { Vec2 } from '../core/types';

/**
 * DOM arayüzü ile <Canvas> içi arasındaki köprü. Canvas içindeki
 * <BridgeConnector/> bu fonksiyonları doldurur; UI katmanı (sürükle-bırak,
 * ekran görüntüsü) bunları çağırır. Böylece UI, three.js'e doğrudan bağımlı olmaz.
 */
export interface SceneBridge {
  screenToFloor(clientX: number, clientY: number): Vec2 | null;
  screenToWall(clientX: number, clientY: number): { wallIndex: number; offset: number } | null;
  capture(): Promise<string>;
}

const noop: SceneBridge = {
  screenToFloor: () => null,
  screenToWall: () => null,
  capture: async () => '',
};

export const sceneBridge: { current: SceneBridge } = { current: noop };

/** Ekran görüntüsü alınırken seçim çerçevesi, ölçü etiketleri vb. gizlenir. */
export const useCaptureState = create<{ capturing: boolean; set(v: boolean): void }>()((set) => ({
  capturing: false,
  set: (v) => set({ capturing: v }),
}));
