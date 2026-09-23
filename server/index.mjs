/**
 * Wallpaper3D sunucusu – bağımlılıksız Node.js (>= 20).
 *
 *  POST /api/analyze-room  → Claude (vision) ile oda fotoğrafı analizi
 *  GET  /api/health        → durum
 *  Diğer istekler          → dist/ (üretim derlemesi) statik servis + SPA yönlendirme
 *
 * Ortam değişkenleri (server/.env):
 *   ANTHROPIC_API_KEY   (zorunlu – AI analizi için)
 *   ANTHROPIC_MODEL     (varsayılan: claude-sonnet-4-5)
 *   PORT                (varsayılan: 8787)
 *   ALLOWED_ORIGIN      (CORS; varsayılan: aynı köken / geliştirmede *)
 *   RATE_LIMIT_PER_HOUR (IP başına analiz, varsayılan 30)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_PROMPT, buildToolSchema, buildUserText } from './analyzePrompt.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 30);
const MAX_BODY = 30 * 1024 * 1024;
const MAX_IMAGES = 8;
const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// ------------------------------------------------------------------ yardımcılar
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...headers,
  });
  res.end(data);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('İstek çok büyük (en fazla 30 MB).'), { status: 413 });
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Geçersiz JSON.'), { status: 400 });
  }
}

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_LIMIT;
}

function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'Geçersiz istek.';
  const { images, room, catalog } = body;
  if (!Array.isArray(images) || images.length === 0) return 'En az bir görsel gerekli.';
  if (images.length > MAX_IMAGES) return `En fazla ${MAX_IMAGES} görsel gönderilebilir.`;
  for (const im of images) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(im?.mediaType)) return 'Desteklenmeyen görsel türü.';
    if (typeof im.data !== 'string' || im.data.length < 100) return 'Görsel verisi eksik.';
  }
  if (!room || !(room.widthCm > 0) || !(room.lengthCm > 0) || !(room.heightCm > 0)) return 'Oda ölçüleri eksik.';
  if (!Array.isArray(catalog) || catalog.length === 0 || catalog.length > 200) return 'Katalog listesi geçersiz.';
  for (const c of catalog) if (typeof c?.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(c.id)) return 'Katalog kimliği geçersiz.';
  return null;
}

// ------------------------------------------------------------------ AI analizi
async function analyzeRoom(body) {
  const catalog = body.catalog.map((c) => ({
    id: c.id,
    placement: String(c.placement ?? 'floor').slice(0, 10),
    hint: String(c.hint ?? c.name ?? c.id).slice(0, 80),
    defaultSize: { w: Number(c.defaultSize?.w) || 0, d: Number(c.defaultSize?.d) || 0, h: Number(c.defaultSize?.h) || 0 },
  }));
  const tool = buildToolSchema(catalog.map((c) => c.id));
  const content = [
    ...body.images.map((im, i) => [
      { type: 'text', text: `Image ${i + 1}${i === 0 ? ' (reference view – defines back/left/right)' : ''}:` },
      { type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } },
    ]).flat(),
    {
      type: 'text',
      text: buildUserText({
        room: body.room,
        estimateRoom: !!body.estimateRoom,
        catalog,
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
      }),
    },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message ?? `Model API hatası (${res.status})`;
    throw Object.assign(new Error(msg), { status: res.status === 429 ? 429 : 502 });
  }
  const block = data?.content?.find((b) => b.type === 'tool_use' && b.name === tool.name);
  if (!block) throw Object.assign(new Error('Model yapılandırılmış yanıt döndürmedi.'), { status: 502 });
  return block.input;
}

// ------------------------------------------------------------------ statik dosyalar
async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (path.includes('..')) return send(res, 400, 'Bad path');
  let file = join(DIST, path || 'index.html');
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html'); // SPA
  }
  try {
    const buf = await readFile(file);
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    const cache = file.includes(`${join(DIST, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    res.end(buf);
  } catch {
    send(res, 404, 'Bulunamadı. Önce "npm run build" çalıştırın ya da geliştirme için "npm run dev" kullanın.');
  }
}

// ------------------------------------------------------------------ sunucu
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.url === '/api/health') return send(res, 200, { ok: true, ai: !!API_KEY, model: MODEL });
    if (req.url === '/api/analyze-room' && req.method === 'POST') {
      if (!API_KEY) return send(res, 503, { error: 'AI analizi yapılandırılmamış: sunucuda ANTHROPIC_API_KEY tanımlı değil.' });
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      if (rateLimited(ip)) return send(res, 429, { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' });
      const body = await readJson(req);
      const invalid = validateRequest(body);
      if (invalid) return send(res, 400, { error: invalid });
      const started = Date.now();
      const result = await analyzeRoom(body);
      console.log(`[analyze] ${body.images.length} görsel, ${result?.items?.length ?? 0} öğe, ${Date.now() - started} ms`);
      return send(res, 200, result);
    }
    if (req.url?.startsWith('/api/')) return send(res, 404, { error: 'Bulunamadı' });
    if (req.method === 'GET') return serveStatic(req, res);
    return send(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('[server]', err);
    return send(res, err.status ?? 500, { error: err.message ?? 'Sunucu hatası' });
  }
});

server.listen(PORT, () => {
  console.log(`Wallpaper3D sunucusu http://localhost:${PORT}  (AI: ${API_KEY ? MODEL : 'kapalı – ANTHROPIC_API_KEY yok'})`);
});
