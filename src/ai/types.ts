/**
 * AI oda analizi sözleşmesi (istemci ↔ sunucu). server/index.mjs aynı şemayı kullanır.
 *
 * Koordinat kuralı (fotoğrafa göre):
 *   - İLK görselde kameranın tam karşısında kalan duvar "back" (arka) duvardır.
 *   - x: 0 = sol duvar, 1 = sağ duvar (ilk görselde görüldüğü gibi)
 *   - z: 0 = arka duvar, 1 = ön duvar (kameranın durduğu taraf)
 *   - Açıklıklar için alongWall: duvara içeriden bakarken sol kenar 0, sağ kenar 1.
 */

export type RelWall = 'back' | 'right' | 'front' | 'left';

export interface AnalysisImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** base64 (data: öneki olmadan) */
  data: string;
  /** kullanıcı arayüzü için küçük önizleme (sunucuya gönderilmez) */
  preview?: string;
  label?: string;
}

export interface AnalysisCatalogEntry {
  id: string;
  name: string;
  hint: string;
  placement: 'floor' | 'wall' | 'opening';
  defaultSize: { w: number; d: number; h: number };
}

export interface AnalysisRequest {
  images: { mediaType: AnalysisImage['mediaType']; data: string }[];
  room: { widthCm: number; lengthCm: number; heightCm: number };
  estimateRoom: boolean;
  catalog: AnalysisCatalogEntry[];
  notes?: string;
}

export interface DetectedItem {
  catalogId: string;
  label: string;
  confidence: number;
  wall: RelWall | null;
  /** zemin eşyaları için ayak izi merkezi (0..1) */
  x: number;
  z: number;
  /** açıklıklar için duvar boyunca merkez (0..1) */
  alongWall?: number;
  elevationCm?: number;
  sizeCm?: { w: number; d: number; h: number };
  rotationDeg?: number;
  notes?: string;
}

export interface AnalysisResult {
  roomEstimate: { widthCm: number; lengthCm: number; heightCm: number; confidence: number } | null;
  items: DetectedItem[];
  summary?: string;
  warnings?: string[];
}
