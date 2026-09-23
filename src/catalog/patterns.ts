/**
 * Prosedürel, kusursuz tekrarlanan (tileable) desen üreticileri.
 *
 * Her üretici bir desen karosunu (tile) çizer. Karonun piksel boyutu, katalogdaki
 * gerçek ölçüsüne (cm) orantılıdır; 3D tarafta doku tekrar sayısı gerçek cm'den
 * hesaplandığı için desen duvarda birebir ölçekte görünür.
 *
 * Gerçek üründe katalog genellikle taranmış görsellerle (type: 'image') gelir;
 * bu üreticiler hem demo kataloğunu hem de "renk varyantı" türetmeyi sağlar.
 */

export type PatternParams = Record<string, unknown>;
export type PatternGenerator = (ctx: CanvasRenderingContext2D, w: number, h: number, p: PatternParams) => void;

// --------------------------------------------------------------------------------------------
// Yardımcılar

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);

/** Şekli karo kenarlarından taşarsa karşı kenarda da çizer → kesintisiz tekrar. */
function drawWrapped(w: number, h: number, draw: (ox: number, oy: number) => void) {
  for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) draw(ox, oy);
}

/** Periyodik değer gürültüsü (tileable), 0..1 */
export function makePeriodicNoise(seed: number, period: number) {
  const rnd = mulberry32(seed);
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Karo üzerine ince kâğıt/lif dokusu ekler (gerçekçilik). */
function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 10, seed = 7) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const period = 64;
  const n1 = makePeriodicNoise(seed, period);
  const sx = period / w;
  const sy = period / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = (n1(x * sx * 4, y * sy * 4) - 0.5) * strength + (Math.random() - 0.5) * strength * 0.6;
      d[i] += v;
      d[i + 1] += v;
      d[i + 2] += v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    v += noise(x * f, y * f) * amp;
    f *= 2;
    amp *= 0.5;
  }
  return v;
}

// --------------------------------------------------------------------------------------------
// Üreticiler

const stripes: PatternGenerator = (ctx, w, h, p) => {
  const colors = (p.colors as string[]) ?? ['#e9e2d4', '#d5c8b0'];
  const widths = (p.widths as number[]) ?? [0.5, 0.5]; // karo genişliğine oran
  let x = 0;
  colors.forEach((c, i) => {
    const sw = widths[i % widths.length] * w;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), 0, Math.ceil(sw), h);
    x += sw;
  });
  const pin = p.pinstripe as string | undefined;
  if (pin) {
    ctx.fillStyle = pin;
    ctx.fillRect(Math.round(w * widths[0]) - 1, 0, 2, h);
    ctx.fillRect(0, 0, 2, h);
  }
  paperGrain(ctx, w, h, 8);
};

const damask: PatternGenerator = (ctx, w, h, p) => {
  const bg = str(p.bg, '#2f3b4a');
  const fg = str(p.fg, '#c8b27d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const motif = (cx: number, cy: number, s: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.fillStyle = fg;
    for (const side of [1, -1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(0, -100);
      ctx.bezierCurveTo(18, -80, 42, -70, 38, -40);
      ctx.bezierCurveTo(34, -18, 12, -22, 14, -4);
      ctx.bezierCurveTo(16, 12, 58, 4, 60, 34);
      ctx.bezierCurveTo(62, 62, 28, 72, 16, 60);
      ctx.bezierCurveTo(30, 58, 40, 44, 30, 36);
      ctx.bezierCurveTo(22, 30, 8, 44, 10, 70);
      ctx.bezierCurveTo(12, 86, 4, 96, 0, 100);
      ctx.closePath();
      ctx.fill();
      // iç kıvrım (negatif)
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(22, -40, 6, 14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(34, 30, 5, 10, -0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();
  };
  const s = Math.min(w, h) / 230;
  drawWrapped(w, h, (ox, oy) => {
    motif(w / 2 + ox, h / 4 + oy, s);
    motif(0 + ox, (3 * h) / 4 + oy, s);
    motif(w + ox, (3 * h) / 4 + oy, s);
  });
  paperGrain(ctx, w, h, 12);
};

const hexagon: PatternGenerator = (ctx, w, h, p) => {
  const bg = str(p.bg, '#f1ede6');
  const line = str(p.line, '#b8a27a');
  const lw = num(p.lineWidth, 0.012);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.5, w * lw);
  // Düz tepeli altıgen ızgara: karo = 3r × √3r (dikeyde karo yüksekliğine ölçeklenir)
  const r = w / 3;
  const sy = h / (Math.sqrt(3) * r);
  const hex = (cx: number, cy: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a) * sy;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };
  drawWrapped(w, h, (ox, oy) => {
    hex(ox, oy);
    hex(ox + 1.5 * r, oy + h / 2);
  });
  paperGrain(ctx, w, h, 8);
};

const botanical: PatternGenerator = (ctx, w, h, p) => {
  const bg = str(p.bg, '#e8efe6');
  const leafColors = (p.leaves as string[]) ?? ['#5e7d5a', '#7f9c6f', '#3f5e45'];
  const count = num(p.count, 26);
  const rnd = mulberry32(num(p.seed, 42));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w, h) / 100;
  const leaves = Array.from({ length: count }, () => ({
    x: rnd() * w,
    y: rnd() * h,
    a: rnd() * Math.PI * 2,
    l: (14 + rnd() * 12) * scale,
    c: leafColors[Math.floor(rnd() * leafColors.length)],
    stem: rnd() > 0.5,
  }));
  for (const lf of leaves) {
    drawWrapped(w, h, (ox, oy) => {
      ctx.save();
      ctx.translate(lf.x + ox, lf.y + oy);
      ctx.rotate(lf.a);
      ctx.fillStyle = lf.c;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(lf.l * 0.3, -lf.l * 0.35, lf.l * 0.8, -lf.l * 0.3, lf.l, 0);
      ctx.bezierCurveTo(lf.l * 0.8, lf.l * 0.3, lf.l * 0.3, lf.l * 0.35, 0, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, lf.l * 0.03);
      ctx.beginPath();
      ctx.moveTo(lf.l * 0.05, 0);
      ctx.lineTo(lf.l * 0.92, 0);
      ctx.stroke();
      if (lf.stem) {
        ctx.strokeStyle = lf.c;
        ctx.lineWidth = Math.max(1, lf.l * 0.04);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-lf.l * 0.2, lf.l * 0.1, -lf.l * 0.35, lf.l * 0.05);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  paperGrain(ctx, w, h, 10);
};

const herringbone: PatternGenerator = (ctx, w, h, p) => {
  const colors = (p.colors as string[]) ?? ['#d9d2c5', '#cfc6b6', '#e3ddd2'];
  ctx.fillStyle = str(p.gap, '#bfb4a2');
  ctx.fillRect(0, 0, w, h);
  const rows = num(p.rows, 4);
  const bw = w / 2;
  const bh = h / rows;
  const g = Math.max(1, w * 0.008);
  const rnd = mulberry32(3);
  for (let row = -1; row <= rows; row++) {
    const y = row * bh;
    // sol sütun: aşağı eğimli paralelkenar, sağ sütun: yukarı eğimli → balıksırtı/zikzak
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.beginPath();
    ctx.moveTo(g, y + g);
    ctx.lineTo(bw, y + bh / 2 + g);
    ctx.lineTo(bw, y + bh * 1.5 - g);
    ctx.lineTo(g, y + bh - g);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.beginPath();
    ctx.moveTo(bw + g, y + bh / 2 + g);
    ctx.lineTo(w, y + g);
    ctx.lineTo(w, y + bh - g);
    ctx.lineTo(bw + g, y + bh * 1.5 - g);
    ctx.closePath();
    ctx.fill();
  }
  paperGrain(ctx, w, h, 14);
};

const scallop: PatternGenerator = (ctx, w, h, p) => {
  const bg = str(p.bg, '#1f3a3a');
  const fg = str(p.fg, '#d4b877');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const r = w / 2;
  ctx.strokeStyle = fg;
  ctx.lineWidth = Math.max(1.5, w * 0.012);
  const fan = (cx: number, cy: number) => {
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r * k) / 4, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
    for (let a = 0; a <= 6; a++) {
      const ang = Math.PI + (a / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * r * 0.25, cy + Math.sin(ang) * r * 0.25);
      ctx.stroke();
    }
  };
  drawWrapped(w, h, (ox, oy) => {
    fan(ox + r, oy + h / 2);
    fan(ox + 0, oy + h);
    fan(ox + w, oy + h);
    fan(ox + 0, oy + 0);
    fan(ox + w, oy + 0);
  });
  paperGrain(ctx, w, h, 10);
};

const linen: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb(str(p.color, '#cfc5b4'));
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const period = 128;
  const nx = makePeriodicNoise(11, period);
  const ny = makePeriodicNoise(23, period);
  const rnd = mulberry32(5);
  // ipliğe benzer yatay/dikey çizgiler
  const rowJ = Array.from({ length: h }, () => (rnd() - 0.5) * 14);
  const colJ = Array.from({ length: w }, () => (rnd() - 0.5) * 14);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (fbm(nx, (x / w) * period * 0.25, (y / h) * period * 0.25, 3) - 0.5) * 18;
      const s = (fbm(ny, (x / w) * period, (y / h) * period * 0.1, 2) - 0.5) * 10;
      const v = n + s + rowJ[y] * 0.5 + colJ[x] * 0.5;
      d[i] = r + v;
      d[i + 1] = g + v;
      d[i + 2] = b + v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const concrete: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb(str(p.color, '#a9a6a0'));
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const period = 32;
  const n = makePeriodicNoise(num(p.seed, 91), period);
  const rnd = mulberry32(17);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = (fbm(n, (x / w) * period, (y / h) * period, 5) - 0.5) * 60 + (rnd() - 0.5) * 12;
      const pit = rnd() > 0.9985 ? -45 : 0;
      d[i] = r + v + pit;
      d[i + 1] = g + v + pit;
      d[i + 2] = b + v + pit;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const brick: PatternGenerator = (ctx, w, h, p) => {
  const mortar = str(p.mortar, '#d9d3c7');
  const base = (p.colors as string[]) ?? ['#a2553d', '#94503a', '#b0634a', '#8a4531', '#9c5b44'];
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, w, h);
  const rows = num(p.rows, 8);
  const cols = num(p.cols, 2);
  const bh = h / rows;
  const bw = w / cols;
  const m = Math.max(1, bh * 0.14);
  const rnd = mulberry32(8);
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    for (let c = -1; c <= cols; c++) {
      const x = c * bw + off;
      ctx.fillStyle = base[Math.floor(rnd() * base.length)];
      ctx.fillRect(x + m / 2, r * bh + m / 2, bw - m, bh - m);
      // tuğla yüzey lekeleri
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(${rnd() > 0.5 ? '0,0,0' : '255,255,255'},${0.04 + rnd() * 0.06})`;
        ctx.beginPath();
        ctx.ellipse(x + m + rnd() * (bw - 2 * m), r * bh + m + rnd() * (bh - 2 * m), bw * 0.12 * rnd() + 2, bh * 0.2 * rnd() + 1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  paperGrain(ctx, w, h, 22);
};

const woodPanel: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb(str(p.color, '#9b7653'));
  const planks = num(p.planks, 4);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const period = 64;
  const n = makePeriodicNoise(num(p.seed, 5), period);
  const pw = w / planks;
  const rnd = mulberry32(12);
  const tones = Array.from({ length: planks }, () => (rnd() - 0.5) * 30);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = Math.floor(x / pw);
      const lx = x - k * pw;
      const grain = Math.sin((lx / pw) * 30 + fbm(n, (x / w) * 8 + k * 3, (y / h) * period * 0.5, 4) * 12) * 12;
      const groove = lx < 1.5 ? -55 : lx < 3 ? -20 : 0;
      const v = grain + tones[k] + groove;
      d[i] = r + v;
      d[i + 1] = g + v * 0.8;
      d[i + 2] = b + v * 0.6;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const terrazzo: PatternGenerator = (ctx, w, h, p) => {
  ctx.fillStyle = str(p.bg, '#efe9e1');
  ctx.fillRect(0, 0, w, h);
  const chips = (p.chips as string[]) ?? ['#c97b5f', '#7a8f86', '#d8b56d', '#8b8b8b', '#e2c9b8'];
  const rnd = mulberry32(num(p.seed, 77));
  const count = num(p.count, 160);
  const s = Math.min(w, h) / 100;
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const rad = (0.6 + rnd() * 2.6) * s;
    const c = chips[Math.floor(rnd() * chips.length)];
    const n = 5 + Math.floor(rnd() * 3);
    const pts: [number, number][] = Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2;
      const rr = rad * (0.6 + rnd() * 0.6);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    drawWrapped(w, h, (ox, oy) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(x + px + ox, y + py + oy) : ctx.moveTo(x + px + ox, y + py + oy)));
      ctx.closePath();
      ctx.fill();
    });
  }
  paperGrain(ctx, w, h, 8);
};

const marble: PatternGenerator = (ctx, w, h, p) => {
  const [r, g, b] = hexToRgb(str(p.color, '#f0eeea'));
  const [vr, vg, vb] = hexToRgb(str(p.vein, '#8d8a86'));
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const period = 4;
  const n = makePeriodicNoise(num(p.seed, 31), period);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = (x / w) * period;
      const v = (y / h) * period;
      const turb = fbm(n, u, v, 5);
      // periyodik damar: sin argümanı karo boyunca tam periyot
      const t = Math.abs(Math.sin(((x / w) + (y / h)) * Math.PI * 2 + turb * 5));
      const t2 = Math.abs(Math.sin(((x / w) * 2 - (y / h)) * Math.PI * 2 + turb * 8));
      const vein = Math.pow(1 - t, 7) + Math.pow(1 - t2, 16) * 0.5;
      const k = Math.min(0.85, vein * 0.8);
      const shade = (turb - 0.5) * 16;
      d[i] = r * (1 - k) + vr * k + shade;
      d[i + 1] = g * (1 - k) + vg * k + shade;
      d[i + 2] = b * (1 - k) + vb * k + shade;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const trellis: PatternGenerator = (ctx, w, h, p) => {
  const bg = str(p.bg, '#f3efe8');
  const fg = str(p.fg, '#8fa3a8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.lineCap = 'round';
  // Ogee / quatrefoil kafes: 4 çeyrek yay dizisi
  const cell = (ox: number, oy: number) => {
    const cx = ox + w / 2;
    const cy = oy + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.bezierCurveTo(cx + rx * 0.55, cy - ry, cx + rx * 0.2, cy - ry * 0.2, cx + rx, cy);
    ctx.bezierCurveTo(cx + rx * 0.2, cy + ry * 0.2, cx + rx * 0.55, cy + ry, cx, cy + ry);
    ctx.bezierCurveTo(cx - rx * 0.55, cy + ry, cx - rx * 0.2, cy + ry * 0.2, cx - rx, cy);
    ctx.bezierCurveTo(cx - rx * 0.2, cy - ry * 0.2, cx - rx * 0.55, cy - ry, cx, cy - ry);
    ctx.stroke();
  };
  drawWrapped(w, h, (ox, oy) => {
    cell(ox, oy);
    cell(ox + w / 2, oy + h / 2);
  });
  paperGrain(ctx, w, h, 8);
};

const plaid: PatternGenerator = (ctx, w, h, p) => {
  ctx.fillStyle = str(p.bg, '#27384a');
  ctx.fillRect(0, 0, w, h);
  const bands = (p.bands as [number, number, string, number][]) ?? [
    [0.1, 0.18, '#3d5a45', 0.8],
    [0.45, 0.06, '#b33c33', 0.8],
    [0.62, 0.02, '#e3cf7a', 0.9],
    [0.8, 0.12, '#3d5a45', 0.7],
  ];
  for (const [pos, size, col, alpha] of bands) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = col;
    ctx.fillRect(pos * w, 0, size * w, h);
    ctx.fillRect(0, pos * h, w, size * h);
  }
  ctx.globalAlpha = 1;
  // twill dokusu
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let k = -h; k < w; k += 4) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + h, h);
    ctx.stroke();
  }
  paperGrain(ctx, w, h, 10);
};

const polka: PatternGenerator = (ctx, w, h, p) => {
  ctx.fillStyle = str(p.bg, '#f6efe4');
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = str(p.fg, '#d19a8a');
  const r = Math.min(w, h) * num(p.radius, 0.12);
  drawWrapped(w, h, (ox, oy) => {
    for (const [x, y] of [
      [0, 0],
      [w / 2, h / 2],
    ]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  paperGrain(ctx, w, h, 8);
};

export const PATTERN_GENERATORS: Record<string, PatternGenerator> = {
  stripes,
  damask,
  hexagon,
  botanical,
  herringbone,
  scallop,
  linen,
  concrete,
  brick,
  woodPanel,
  terrazzo,
  marble,
  trellis,
  plaid,
  polka,
};
