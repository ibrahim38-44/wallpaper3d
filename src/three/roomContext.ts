import { createContext, useContext } from 'react';
import type { RoomDoc } from '../core/types';
import { useEditor } from '../store/editorStore';

export interface RoomCtx {
  doc: RoomDoc;
  isActive: boolean;
}

/** Sahnede her oda kendi bağlamıyla çizilir (konum ofseti, aktiflik). */
export const RoomContext = createContext<RoomCtx | null>(null);

export function useRoomCtx(): RoomCtx {
  const c = useContext(RoomContext);
  if (!c) throw new Error('RoomContext yok');
  return c;
}

/** Pasif bir odaya dokunulduğunda onu aktif oda yapar (etkileşimden önce çağrılır). */
export function activateRoom(id: string) {
  useEditor.getState().setActiveRoom(id);
}
