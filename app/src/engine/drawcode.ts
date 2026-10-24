/**
 * engine/drawcode.ts — Jembatan "kode draw()" ↔ MotionDefinition.
 *
 * Arsitektur baru Motion Easy berpusat pada SATU artefak: kode fungsi
 *    function draw(ctx, time, width, height) { ... }
 * yang menulis piksel relatif terhadap width & height (proporsional).
 *
 * Modul ini memetakan kode draw() tersebut ke dalam MotionDefinition
 * berisi SATU layer kind "canvas", sehingga SELURUH pipeline ekspor yang
 * sudah ada (renderer, WebCodecs MP4, MOV Alpha, ISO-BMFF padding, kurasi
 * lisensi) bisa dipakai ulang tanpa engine render baru.
 *
 * Kontrak modul (interface kecil):
 *   - drawCodeToDefinition(code, opts) -> MotionDefinition | Error
 *   - compileDraw(code)                 -> KanvasDraw | Error
 * Semua kompleksitas (koordinat piksel, fx kit, sanitasi) disembunyikan di
 * sini — pemanggil cukup memberi kode + opsi.
 */

import type { MotionDefinition } from "./schema";
import { compileKanvas, type KanvasDraw, type FxKit } from "./kanvas";

export type { KanvasDraw, FxKit };

/* ================================================================== */
/* Parameter output cepat (dipakai Prompt Engineer & Studio)            */
/* ================================================================== */

export type RasioKanvas = "16:9" | "9:16" | "1:1" | "4:5";

export const RASIO_OPSI: { id: RasioKanvas; label: string; hint: string; w: number; h: number }[] = [
  { id: "16:9", label: "Landscape 16:9", hint: "YouTube · Premiere", w: 1920, h: 1080 },
  { id: "9:16", label: "Vertical 9:16", hint: "TikTok · Reels · Shorts", w: 1080, h: 1920 },
  { id: "1:1", label: "Square 1:1", hint: "Feed · Instagram", w: 1080, h: 1080 },
  { id: "4:5", label: "Portrait 4:5", hint: "IG Post · Facebook", w: 1080, h: 1350 },
];

/** Durasi luas: dari micro-hook (3s) hingga long motion (30s). */
export const DURASI_OPSI = [3, 5, 8, 10, 15, 20, 30, 45, 60] as const;
/** 24 FPS = cinematic film look, 30 = standar, 60 = ultra smooth. */
export const FPS_OPSI = [24, 30, 60] as const;

/** Nilai piksel dasar (short-side 1080) untuk tiap rasio. */
export function dimsRasio(rasio: RasioKanvas): { w: number; h: number } {
  const found = RASIO_OPSI.find((r) => r.id === rasio) ?? RASIO_OPSI[1];
  return { w: found.w, h: found.h };
}

/* ================================================================== */
/* Kompilasi kode draw()                                                */
/* ================================================================== */

/**
 * Kompilasi kode draw(ctx, time, width, height) jadi fungsi siap panggil.
 * Menerima baik `function draw(ctx,time,width,height){...}` maupun
 * arrow `(ctx,time,width,height)=>{...}`. Parameter ke-5 (fx) dilewatkan
 * oleh renderer bila kode menginginkannya, tapi tidak wajib.
 */
export function compileDraw(code: string): KanvasDraw | Error {
  return compileKanvas(code);
}

/* ================================================================== */
/* Pemetaan kode draw() → MotionDefinition                              */
/* ================================================================== */

export interface DrawCodeOpts {
  rasio: RasioKanvas;
  durasi: number;
  fps: 24 | 30 | 60;
  /** true = latar transparan (untuk MOV Alpha); false = latar solid gelap. */
  transparan?: boolean;
  nama?: string;
}

/**
 * Bangun MotionDefinition tunggal (satu layer kind "canvas") dari kode draw.
 * Koordinat di dalam kode dijalankan pada piksel penuh kanvas (w × h) sesuai
 * rasio terpilih — pemanggil tidak perlu urus scaling.
 */
export function drawCodeToDefinition(
  code: string,
  opts: DrawCodeOpts,
): MotionDefinition | Error {
  const compiled = compileKanvas(code);
  if (compiled instanceof Error) return compiled;

  const { w, h } = dimsRasio(opts.rasio);
  const dur = Math.max(1, Math.min(60, opts.durasi));

  const def: MotionDefinition = {
    version: 1,
    name: opts.nama?.trim() || `Motion ${opts.rasio} ${opts.durasi}s`,
    notes: "Dihasilkan Motion Generator dari kode draw(ctx,time,width,height).",
    canvas: {
      w,
      h,
      fps: opts.fps,
      durationSec: dur,
      background: opts.transparan ? null : "#070a13",
      aspectRatio: opts.rasio,
    },
    layers: [
      {
        id: "draw",
        kind: "canvas",
        tag: "background",
        time: { from: 0, to: dur },
        geometry: { x: 0.5, y: 0.5 },
        kanvas: { source: code },
      },
    ],
  };
  return def;
}
