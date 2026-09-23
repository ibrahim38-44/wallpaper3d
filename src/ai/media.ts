import type { AnalysisImage } from './types';

/**
 * Fotoğraf/video ön işleme – tamamen tarayıcıda yapılır, sunucuya yalnızca
 * küçültülmüş JPEG kareler gider (bant genişliği ve gizlilik için).
 */

const MAX_DIM = 1280;
const PREVIEW_DIM = 160;

function canvasToJpeg(source: CanvasImageSource, sw: number, sh: number, maxDim: number, quality = 0.85): string {
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

const strip = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

export async function imageFileToAnalysisImage(file: File): Promise<AnalysisImage> {
  const bmp = await createImageBitmap(file);
  try {
    const full = canvasToJpeg(bmp, bmp.width, bmp.height, MAX_DIM);
    const preview = canvasToJpeg(bmp, bmp.width, bmp.height, PREVIEW_DIM, 0.7);
    return { mediaType: 'image/jpeg', data: strip(full), preview, label: file.name };
  } finally {
    bmp.close();
  }
}

/** Videodan eşit aralıklı `count` kare çıkarır. */
export async function extractVideoFrames(file: File, count = 6, onProgress?: (done: number, total: number) => void): Promise<AnalysisImage[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video açılamadı (desteklenmeyen biçim olabilir).'));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) throw new Error('Video süresi okunamadı.');
    const frames: AnalysisImage[] = [];
    for (let i = 0; i < count; i++) {
      const t = (duration * (i + 0.5)) / count;
      await new Promise<void>((resolve, reject) => {
        const onSeek = () => {
          video.removeEventListener('seeked', onSeek);
          resolve();
        };
        video.addEventListener('seeked', onSeek);
        video.onerror = () => reject(new Error('Video karesi okunamadı.'));
        video.currentTime = t;
      });
      const w = video.videoWidth;
      const h = video.videoHeight;
      frames.push({
        mediaType: 'image/jpeg',
        data: strip(canvasToJpeg(video, w, h, MAX_DIM)),
        preview: canvasToJpeg(video, w, h, PREVIEW_DIM, 0.7),
        label: `${file.name} @ ${t.toFixed(1)} sn`,
      });
      onProgress?.(i + 1, count);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
