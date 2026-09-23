import { FURNITURE } from '../catalog/furniture';
import type { AnalysisCatalogEntry, AnalysisRequest, AnalysisResult, DetectedItem, RelWall } from './types';

export interface RoomAnalysisProvider {
  analyze(req: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult>;
}

export class AnalysisError extends Error {
  constructor(message: string, public code: 'network' | 'not_configured' | 'server' | 'invalid') {
    super(message);
  }
}

export function catalogForAnalysis(): AnalysisCatalogEntry[] {
  return FURNITURE.map((f) => ({ id: f.id, name: f.name, hint: f.aiHint, placement: f.placement, defaultSize: f.defaultSize }));
}

/**
 * Sunucu uç noktasını çağırır (varsayılan: /api/analyze-room → server/index.mjs).
 * API anahtarı yalnızca sunucuda tutulur; tarayıcı asla doğrudan model API'sine gitmez.
 */
export class HttpAnalysisProvider implements RoomAnalysisProvider {
  constructor(private endpoint: string = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) ?? '/api/analyze-room') {}

  async analyze(req: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult> {
    let res: Response;
    try {
      res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new AnalysisError('AI sunucusuna ulaşılamadı. Sunucunun çalıştığından emin olun (npm run dev:server).', 'network');
    }
    if (res.status === 404) throw new AnalysisError('AI analiz uç noktası bulunamadı. Sunucu yapılandırılmamış.', 'not_configured');
    const body = (await res.json().catch(() => null)) as { error?: string } | AnalysisResult | null;
    if (!res.ok) throw new AnalysisError((body as { error?: string } | null)?.error ?? `Sunucu hatası (${res.status})`, res.status === 503 ? 'not_configured' : 'server');
    return sanitizeResult(body, new Set(req.catalog.map((c) => c.id)));
  }
}

const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
const posNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
const WALLS: RelWall[] = ['back', 'right', 'front', 'left'];

/** Model çıktısını güvenli, tutarlı bir yapıya dönüştürür (yanlış alanlar düşürülür). */
export function sanitizeResult(raw: unknown, allowedIds: Set<string>): AnalysisResult {
  if (!raw || typeof raw !== 'object') throw new AnalysisError('Geçersiz analiz yanıtı.', 'invalid');
  const r = raw as Record<string, unknown>;
  const items: DetectedItem[] = Array.isArray(r.items)
    ? (r.items as Record<string, unknown>[])
        .filter((it) => it && typeof it.catalogId === 'string' && allowedIds.has(it.catalogId))
        .map((it) => {
          const s = it.sizeCm as Record<string, unknown> | undefined;
          const w = posNum(s?.w);
          const d = posNum(s?.d);
          const h = posNum(s?.h);
          return {
            catalogId: it.catalogId as string,
            label: typeof it.label === 'string' ? it.label.slice(0, 80) : (it.catalogId as string),
            confidence: clamp01(it.confidence),
            wall: WALLS.includes(it.wall as RelWall) ? (it.wall as RelWall) : null,
            x: clamp01(it.x),
            z: clamp01(it.z),
            alongWall: typeof it.alongWall === 'number' ? clamp01(it.alongWall) : undefined,
            elevationCm: typeof it.elevationCm === 'number' && it.elevationCm >= 0 ? it.elevationCm : undefined,
            sizeCm: w && d && h ? { w, d, h } : undefined,
            rotationDeg: typeof it.rotationDeg === 'number' ? it.rotationDeg : undefined,
            notes: typeof it.notes === 'string' ? it.notes.slice(0, 200) : undefined,
          };
        })
    : [];
  const re = r.roomEstimate as Record<string, unknown> | null | undefined;
  const roomEstimate =
    re && posNum(re.widthCm) && posNum(re.lengthCm) && posNum(re.heightCm)
      ? { widthCm: re.widthCm as number, lengthCm: re.lengthCm as number, heightCm: re.heightCm as number, confidence: clamp01(re.confidence) }
      : null;
  return {
    roomEstimate,
    items,
    summary: typeof r.summary === 'string' ? r.summary : undefined,
    warnings: Array.isArray(r.warnings) ? (r.warnings as unknown[]).filter((w): w is string => typeof w === 'string') : undefined,
  };
}
