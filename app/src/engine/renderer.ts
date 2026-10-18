/**
 * Renderer Canvas 2D untuk MotionDefinition.
 * Fase 2: murni fungsi (ctx, def, waktu) -> gambar. Tanpa state React.
 *
 * Kontrak visual sesuai docs/SCHEMA.md:
 * - geometry.x/y = titik pusat (fraksi lebar/tinggi kanvas)
 * - time = detik, easing & preset sesuai skema
 * - urutan layers: item array akhir digambar paling atas
 */

import type { MotionDefinition, LayerSpec } from "./schema";
import { getEase } from "./easing";
import { compileKanvas, jalankanKanvas } from "./kanvas";

const SLIDE = 0.18; // jarak slide masuk/keluar (fraksi kanvas)

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const SANS = `"Inter", "Segoe UI", system-ui, sans-serif`;
const MONO = `"JetBrains Mono", ui-monospace, monospace`;

interface LayerState {
  alpha: number;
  dx: number; // fraksi lebar kanvas
  dy: number; // fraksi tinggi kanvas
  scale: number;
  rot: number; // derajat
}

function entrance(l: LayerSpec, t: number, s: LayerState) {
  const mo = l.motion?.in;
  if (!mo) return;
  const start = l.time.from + (mo.at ?? 0);
  const dur = Math.max(0.001, mo.dur ?? 0.6);
  if (t < start) {
    if (mo.type === "none") return;
    if ((mo.type ?? "fadeIn") === "pop") s.scale *= 0.001;
    else s.alpha *= 0;
    return;
  }
  const e = getEase(mo.easing)(clamp((t - start) / dur));
  switch (mo.type ?? "fadeIn") {
    case "fadeIn":
      s.alpha *= e;
      break;
    case "slideUp":
      s.dy += (1 - e) * SLIDE;
      s.alpha *= clamp(e * 2);
      break;
    case "slideDown":
      s.dy -= (1 - e) * SLIDE;
      s.alpha *= clamp(e * 2);
      break;
    case "slideLeft": // masuk dari kanan
      s.dx += (1 - e) * SLIDE;
      s.alpha *= clamp(e * 2);
      break;
    case "slideRight": // masuk dari kiri
      s.dx -= (1 - e) * SLIDE;
      s.alpha *= clamp(e * 2);
      break;
    case "pop":
      s.scale *= Math.max(0.001, e);
      break;
  }
}

function exitMotion(l: LayerSpec, t: number, s: LayerState) {
  const mo = l.motion?.out;
  if (!mo) return;
  const end = l.time.to - (mo.before ?? 0);
  const dur = Math.max(0.001, mo.dur ?? 0.6);
  const start = end - dur;
  if (t >= end) {
    s.alpha = 0;
    return;
  }
  if (t <= start) return;
  const p = clamp((t - start) / dur); // 0 -> mulai keluar, 1 -> selesai
  const rem = 1 - p;
  switch (mo.type ?? "fadeOut") {
    case "fadeOut":
      s.alpha *= rem;
      break;
    case "slideUp":
      s.dy -= p * SLIDE;
      s.alpha *= clamp(rem * 2);
      break;
    case "slideDown":
      s.dy += p * SLIDE;
      s.alpha *= clamp(rem * 2);
      break;
    case "slideLeft":
      s.dx -= p * SLIDE;
      s.alpha *= clamp(rem * 2);
      break;
    case "slideRight":
      s.dx += p * SLIDE;
      s.alpha *= clamp(rem * 2);
      break;
    case "pop":
      s.scale *= rem;
      break;
  }
}

function applyLoop(l: LayerSpec, t: number, s: LayerState) {
  const mo = l.motion?.loop;
  if (!mo || !mo.type || mo.type === "none") return;
  const dur = Math.max(0.001, mo.dur ?? 2);
  const amount = mo.amount ?? 0.05;
  const raw = (t - l.time.from) / dur + (mo.phase ?? 0);
  const u = ((raw % 1) + 1) % 1; // aman untuk fase > 1
  const TWO_PI = Math.PI * 2;
  switch (mo.type) {
    case "float":
      s.dy += amount * 0.5 * Math.sin(u * TWO_PI);
      break;
    case "pulse":
      s.scale *= 1 + amount * (0.5 + 0.5 * Math.sin(u * TWO_PI));
      break;
    case "spin":
      // amount = jumlah putaran penuh per siklus
      s.rot += u * 360 * (amount || 1);
      break;
    case "sway":
      s.dx += amount * 0.5 * Math.sin(u * TWO_PI);
      break;
  }
}

function evalLayer(l: LayerSpec, t: number): LayerState {
  const s: LayerState = {
    alpha: 1,
    dx: 0,
    dy: 0,
    scale: 1,
    rot: l.style?.rotation ?? 0,
  };
  entrance(l, t, s);
  exitMotion(l, t, s);
  applyLoop(l, t, s);
  return s;
}

function applyFillAndStroke(
  ctx: CanvasRenderingContext2D,
  l: LayerSpec,
  H: number,
) {
  if (l.style?.color) {
    ctx.fillStyle = l.style.color;
    ctx.fill();
  }
  if (l.style?.stroke) {
    ctx.strokeStyle = l.style.stroke;
    ctx.lineWidth = Math.max(1, (l.style.strokeWidth ?? 0) * H);
    ctx.stroke();
  }
}

function beginBoxPath(
  ctx: CanvasRenderingContext2D,
  l: LayerSpec,
  W: number,
  H: number,
) {
  const w = (l.geometry.w ?? 0.3) * W;
  const h = (l.geometry.h ?? 0.3) * H;
  const r = (l.style?.radius ?? 0) * H;
  ctx.beginPath();
  if (r > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(r, Math.min(w, h) / 2));
  } else {
    ctx.rect(-w / 2, -h / 2, w, h);
  }
}

function drawShapeBody(
  ctx: CanvasRenderingContext2D,
  l: LayerSpec,
  W: number,
  H: number,
) {
  switch (l.kind) {
    case "rect":
      beginBoxPath(ctx, l, W, H);
      applyFillAndStroke(ctx, l, H);
      break;
    case "ellipse": {
      const rx = ((l.geometry.w ?? 0.1) * W) / 2;
      const ry = ((l.geometry.h ?? 0.1) * H) / 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      applyFillAndStroke(ctx, l, H);
      break;
    }
    case "triangle": {
      const w = (l.geometry.w ?? 0.2) * W;
      const h = (l.geometry.h ?? 0.2) * H;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      applyFillAndStroke(ctx, l, H);
      break;
    }
    case "image":
      // Aset tersedia di Fase 6 — gambar placeholder
      ctx.beginPath();
      ctx.rect(-0.1 * W, -0.1 * H, 0.2 * W, 0.2 * H);
      ctx.fillStyle = "#32343f";
      ctx.fill();
      break;
  }
}

/** Teks: anchor sesuai align — left = sudut kiri, right = sudut kanan, center = pusat. */
function drawTextBody(
  ctx: CanvasRenderingContext2D,
  l: LayerSpec,
  H: number,
) {
  const txt = l.text;
  if (!txt) return;
  const sizePx = Math.max(4, txt.size * H);
  const family = txt.font === "mono" ? MONO : SANS;
  ctx.font = `${txt.weight ?? 700} ${sizePx}px ${family}`;
  ctx.textAlign = txt.align ?? "center";
  ctx.textBaseline = "middle";
  const lines = txt.content.split("\n");
  const lh = sizePx * (txt.lineHeight ?? 1.2);
  ctx.fillStyle = l.style?.color ?? "#ffffff";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, (i - (lines.length - 1) / 2) * lh);
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  l: LayerSpec,
  def: MotionDefinition,
  t: number,
) {
  const W = def.canvas.w;
  const H = def.canvas.h;
  const st = evalLayer(l, t);
  const baseAlpha = (l.style?.opacity ?? 1) * st.alpha;
  if (baseAlpha <= 0.002) return;

  const g = l.geometry;
  ctx.save();
  ctx.globalAlpha = clamp(baseAlpha);

  // --- kind "canvas": kode bebas, koordinat piksel kanvas DEFINISI.
  // Digambar tanpa transform layer (geometry/motion), tapi tetap
  // mengikuti time.from/to dan alpha (style.opacity + motion in/out).
  if (l.kind === "canvas") {
    const compiled = compileKanvas(l.kanvas?.source ?? "");
    jalankanKanvas(compiled, ctx, t, W, H, l.id);
    ctx.restore();
    return;
  }

  if (l.kind === "line") {
    if (!l.line) return void ctx.restore();
    ctx.beginPath();
    ctx.moveTo(g.x * W, g.y * H);
    ctx.lineTo(l.line.to.x * W, l.line.to.y * H);
    ctx.strokeStyle = l.style?.stroke ?? l.style?.color ?? "#ffffff";
    ctx.lineWidth = Math.max(1, (l.style?.strokeWidth ?? 0.003) * H);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (l.kind === "text") {
    ctx.translate(g.x * W + st.dx * W, g.y * H + st.dy * H);
    ctx.rotate((st.rot * Math.PI) / 180);
    ctx.scale(st.scale, st.scale);
    drawTextBody(ctx, l, H);
    ctx.restore();
    return;
  }

  ctx.translate(g.x * W + st.dx * W, g.y * H + st.dy * H);
  ctx.rotate((st.rot * Math.PI) / 180);
  ctx.scale(st.scale, st.scale);
  drawShapeBody(ctx, l, W, H);
  ctx.restore();
}

/** Gambar satu frame pada waktu `t` (detik). */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  def: MotionDefinition,
  t: number,
) {
  const { w: W, h: H } = def.canvas;
  // PENTING: ukur skala dari ukuran KANVAS TUJUAN (`ctx.canvas`), bukan
  // asumsikan kanvas = kanvas definisi. Saat export 720p/2K/4K kandasnya
  // beda ukuran — tanpa ini semua gambar mampir ke kuadran kiri-atas.
  // Rapikan di tengah bila rasio kanvas tujuan sedikit berbeda (pembulatan).
  const TW = ctx.canvas.width;
  const TH = ctx.canvas.height;
  const s = W > 0 && H > 0 ? Math.min(TW / W, TH / H) : 1;
  const ox = (TW - W * s) / 2;
  const oy = (TH - H * s) / 2;
  ctx.save();
  // transformasi menangani skala + posisi; seluruh matematika gambar di bawah
  // tetap memakai koordinat definisi (fraksi × W/H definisi) — tidak berubah.
  ctx.setTransform(s, 0, 0, s, ox, oy);

  // latar: bila warna latar diatur, isi SELURUH kanvas tujuan (bukan hanya
  // area definisi) supaya hasil export tidak punya tepi kosong/hitam.
  // Bila tidak diatur, tetap bening (perilaku lama).
  if (def.canvas.background) {
    ctx.fillStyle = def.canvas.background;
    ctx.fillRect(-ox / s, -oy / s, TW / s, TH / s);
  } else {
    ctx.clearRect(0, 0, W, H);
  }
  for (const l of def.layers) {
    if (t < l.time.from || t > l.time.to) continue;
    drawLayer(ctx, l, def, t);
  }
  ctx.restore();
}

/** Jumlah layer yang sedang tampil pada waktu t — dipakai UI. */
export function activeLayerCount(def: MotionDefinition, t: number): number {
  return def.layers.filter((l) => t >= l.time.from && t <= l.time.to).length;
}
