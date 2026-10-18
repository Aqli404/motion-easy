/**
 * engine/kanvas.ts — "kanvas bebas" (kind "canvas").
 *
 * AI (atau pengguna) boleh mengirim SATU fungsi:
 *    function draw(ctx, time, w, h, fx) { ... }
 * Renderer memanggilnya per frame, di atas koordinat definisi (piksel penuh).
 *
 * KONTRAK (WAJIB dipatuhi kode yang dihasilkan AI):
 * - DETERMINISTIK: hasil frame hanya fungsi dari (time, w, h). Dilarang:
 *   Math.random(), Date, fetch/XHR, DOM, localStorage, font loading,
 *   canvas kedua, atau state antar frame — kalau tidak, preview VS hasil
 *   export 4K akan berbeda.
 * - `fx` adalah satu-satunya helper yang dijamin ada. Jangan pakai
 *   global lain yang tidak di-append scope.
 * - Kinerja: target < ~2 ribu operasi gambar per frame; jangan loop
 *   ke puluhan ribu titik.
 *
 * Keamanan: kode dijalankan di browser pengguna sendiri (BYO-AI, tanpa
 * server). Validator melakukan compile-check dulu, runtime dibungkus
 * try/catch sehingga kode yang crash TIDAK pernah mematikan app.
 */

/** Helper fx yang diteruskan ke fungsi draw. Semua deterministik & murni. */
export interface FxKit {
  /** Fase berulang 0..1 — siklus apapun periodenya. */
  loop(time: number, period?: number): number;
  /** Gelombang halus 0..1 (mulus & berulang). */
  pulse(time: number, period?: number): number;
  /** Rentet (clamp) 0..1. */
  ease(x: number): number;
  /** Pseudo-acak DETERMINISTIK dari indeks (harus dibandingkan render lain). */
  rand(i: number, seed?: number): number;
  /** Gradien linear (koordinat piksel kanvas definisi). */
  gradient(
    ctx: CanvasRenderingContext2D,
    x0: number, y0: number, x1: number, y1: number,
    stops: string[],
  ): CanvasGradient;
  /** Gradien radial (r = radius piksel). */
  radial(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    stops: string[],
  ): CanvasGradient;
  /** Aktifkan efek glow (shadow) berwarna. */
  glow(ctx: CanvasRenderingContext2D, color: string, blurPx: number): void;
  /** Matikan glow (panggil setelah selesai menggambar bagian ber-glow). */
  glowOff(ctx: CanvasRenderingContext2D): void;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const FX: FxKit = {
  loop(time, period) {
    const p = period && period > 0 ? period : 2;
    return ((time / p) % 1 + 1) % 1;
  },
  pulse(time, period) {
    return 0.5 - 0.5 * Math.cos(FX.loop(time, period) * Math.PI * 2);
  },
  ease: clamp01,
  // Hash sinus klasik — deterministik lintas mesin, 0..1.
  rand(i, seed) {
    const s = i * 127.1 + (seed ?? 0) * 311.7;
    const x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
  },
  gradient(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const n = Math.max(2, stops.length);
    stops.forEach((c, i) => g.addColorStop(i / (n - 1), c));
    return g;
  },
  radial(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.001, r));
    const n = Math.max(2, stops.length);
    stops.forEach((c, i) => g.addColorStop(i / (n - 1), c));
    return g;
  },
  glow(ctx, color, blurPx) {
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0, blurPx);
  },
  glowOff(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  },
};

/** Fungsi draw hasil kompilasi source. */
export type KanvasDraw = (
  ctx: CanvasRenderingContext2D,
  time: number, w: number, h: number, fx: FxKit,
) => void;

const MAX_KODE = 20_000;

/** Cache compile per source string (definisi sama dirender berkali-kali). */
const cache = new Map<string, KanvasDraw | Error>();

/**
 * Kompilasi source jadi fungsi draw. Hasil error TIDAK throw —
 * validator & renderer nullable (keluarkan pesan Indonesia yang manusiawi).
 */
export function compileKanvas(src: string): KanvasDraw | Error {
  const key = src;
  const hit = cache.get(key);
  if (hit) return hit;
  let result: KanvasDraw | Error;
  if (src.trim() === "") {
    result = new Error("source kanvas kosong — wajib berisi function draw(ctx, time, w, h, fx).");
  } else if (src.length > MAX_KODE) {
    result = new Error(`kode kanvas terlalu panjang (${src.length} karakter) — maksimal ${MAX_KODE}.`);
  } else {
    try {
      // "use strict" + expression: menerima `function draw(){}` maupun `(ctx)=>{}`.
      const wrapper = new Function(
        "ctx", "time", "w", "h", "fx",
        `"use strict";\nreturn (\n${src}\n);`,
      );
      const produced = wrapper() as unknown;
      if (typeof produced !== "function") {
        result = new Error(
          'source harus berupa SATU function, mis: "function draw(ctx, time, w, h, fx) { ... }"',
        );
      } else {
        result = produced as KanvasDraw;
      }
    } catch (e) {
      result = new Error(`kode tidak bisa dikompilasi: ${(e as Error).message}`);
    }
  }
  cache.set(key, result);
  return result;
}

/** Peringatan runtime yang sudah pernah ditampilkan (agar tidak spam). */
const runtimeWarned = new Set<string>();

/** Pratinjau drew error di kanvas supaya user melihat, bukan layar diam. */
function drawKanvasError(
  ctx: CanvasRenderingContext2D,
  w: number,
  pesan: string,
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const TW = ctx.canvas.width;
  const TH = ctx.canvas.height;
  ctx.fillStyle = "#0b0e18";
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = "#ff6b6b";
  ctx.font = "600 28px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const baris = pesan.match(/.{1,52}(\s|$)/g) ?? [pesan];
  baris.slice(0, 6).forEach((s, i) => ctx.fillText(s.trim(), 32, 36 + i * 40));
  ctx.fillStyle = "#8a8fa3";
  ctx.font = "500 22px monospace";
  ctx.fillText("Layer kanvas gagal dijalankan — cek pesan di Alur AI.", 32, 36 + Math.min(6, baris.length) * 40 + 18);
  ctx.restore();
}

/**
 * Panggil fungsi draw dengan pengamanan penuh:
 * - error compile → layar peringatan merah jelas
 * - error runtime → tanda peringatan kecil + console.warn sekali
 */
export function jalankanKanvas(
  compiled: KanvasDraw | Error,
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  layerId: string,
): void {
  if (compiled instanceof Error) {
    drawKanvasError(ctx, w, compiled.message);
    return;
  }
  try {
    compiled(ctx, t, w, h, FX);
  } catch (e) {
    const msg = (e as Error).message || String(e);
    const key = layerId + ":" + msg;
    if (!runtimeWarned.has(key)) {
      runtimeWarned.add(key);
      console.warn("[kanvas:" + layerId + "]", msg);
    }
    drawKanvasError(ctx, w, "runtime error: " + msg);
  }
}
