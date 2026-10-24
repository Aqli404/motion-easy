/**
 * export/mov.ts — Ekspor QuickTime MOV & video transparan (Mediabunny).
 *
 * Dulu: modul ini hanya menyusun kontainer MOV kosong (ftyp+moov+mdat TANPA
 * satu frame media pun) — hasilnya file korup. Sekarang memakai Mediabunny:
 *   1. exportQuickTime  — MOV QuickTime sungguhan, H.264, frame asli per frame.
 *   2. exportWebmAlpha  — WebM VP9 dengan alpha ASLI (alpha: 'keep'),
 *      hasilnya overlay transparan murni untuk Premiere/AE/DaVinci/CapCut.
 *
 * Library dimuat dinamis (lazy) supaya bundle utama tetap ringan — Mediabunny
 * hanya diunduh saat user benar-benar menekan tombol ekspor MOV/Alpha.
 *
 * Kode final (MotionDefinition) TIDAK pernah diubah — hanya dirender
 * frame demi frame lewat renderer resmi engine/renderer.ts.
 */

import type { ExportProgress } from "./encoder";
import { renderFrame } from "../engine/renderer";
import type { MotionDefinition } from "../engine/schema";
import { resolveExportSize, type ExportPreset, type ExportSize } from "./presets";

/** Bentuk minimal modul mediabunny yang dipakai runtime (type-only import). */
type Mediabunny = typeof import("mediabunny");

export interface MediaExportResult {
  blob: Blob;
  size: ExportSize;
  durationSec: number;
}

let mediabunnyPromise: Promise<Mediabunny> | null = null;
function loadMediabunny(): Promise<Mediabunny> {
  mediabunnyPromise ??= import("mediabunny") as Promise<Mediabunny>;
  return mediabunnyPromise;
}

/** Loop render frame demi frame ke CanvasSource output Mediabunny. */
async function renderToOutput(
  opts: {
    def: MotionDefinition;
    preset: ExportPreset;
    size: ExportSize;
    /** null = pertahankan transparansi; string hex = latar solid */
    background: string | null;
    codec: "avc" | "vp9";
    alpha?: "keep" | "discard";
    onProgress: (p: ExportProgress) => void;
    cancel: import("./encoder").CancelFlag;
  },
): Promise<Blob> {
  const { def, preset, size, background, codec, alpha = "discard", onProgress, cancel } = opts;
  const fps = def.canvas.fps;
  const { width, height } = size;

  onProgress({ phase: "preparing", frame: 0, totalFrames: 0, pct: 0 });
  const {
    BufferTarget,
    CanvasSource,
    MovOutputFormat,
    WebMOutputFormat,
    Output,
  } = await loadMediabunny();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Gagal menyiapkan canvas render.");

  const source = new CanvasSource(canvas, {
    codec,
    bitrate: preset.bitrate,
    // CBR + quality → MOV microstock benar-benar membawa bitrate target
    // (file bersih besar, bukan simulasi ditambah padding).
    bitrateMode: "constant",
    latencyMode: "quality",
    keyFrameInterval: 2,
    alpha,
  });

  const output = new Output({
    format: codec === "avc" ? new MovOutputFormat() : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  output.addVideoTrack(source, { frameRate: fps });

  await output.start();

  const totalFrames = Math.max(1, Math.round(def.canvas.durationSec * fps));
  const frameDur = 1 / fps;

  onProgress({ phase: "encoding", frame: 0, totalFrames, pct: 0 });

  for (let i = 0; i < totalFrames; i++) {
    if (cancel.cancelled) throw new Error("Export dibatalkan.");
    ctx.clearRect(0, 0, width, height);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    renderFrame(ctx, def, i * frameDur);
    // add() menunggu encoder + writer siap (backpressure resmi Mediabunny)
    await source.add(i * frameDur, frameDur);
    if (i % 5 === 0 || i === totalFrames - 1) {
      onProgress({
        phase: "encoding",
        frame: i + 1,
        totalFrames,
        pct: ((i + 1) / totalFrames) * 92,
      });
    }
  }

  onProgress({ phase: "muxing", frame: totalFrames, totalFrames, pct: 95 });
  await output.finalize();
  onProgress({ phase: "muxing", frame: totalFrames, totalFrames, pct: 100 });

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Gagal membungkus file media.");
  return new Blob([buffer], { type: codec === "avc" ? "video/quicktime" : "video/webm" });
}

/** MOV QuickTime sungguhan (H.264, latar solid) — file valid berisi frame. */
export async function exportQuickTime(
  def: MotionDefinition,
  preset: ExportPreset,
  onProgress: (p: ExportProgress) => void,
  cancel: import("./encoder").CancelFlag,
): Promise<MediaExportResult> {
  const size = resolveExportSize(def, preset);
  const { canEncodeVideo } = await loadMediabunny();
  const ok = await canEncodeVideo("avc", { width: size.width, height: size.height, frameRate: def.canvas.fps });
  if (!ok) throw new Error("Browser ini tidak sanggup meng-encode H.264 untuk MOV. Coba preset lebih kecil.");
  const blob = await renderToOutput({
    def,
    preset,
    size,
    background: def.canvas.background ?? "#070a13",
    codec: "avc",
    onProgress,
    cancel,
  });
  return { blob, size, durationSec: def.canvas.durationSec };
}

/**
 * Video transparan ASLI: WebM VP9 dengan alpha 'keep'.
 * Area tanpa konten tetap benar-benar tembus cahaya di Premiere/AE/DaVinci.
 */
export async function exportWebmAlpha(
  def: MotionDefinition,
  preset: ExportPreset,
  onProgress: (p: ExportProgress) => void,
  cancel: import("./encoder").CancelFlag,
): Promise<MediaExportResult> {
  const size = resolveExportSize(def, preset);
  const { canEncodeVideo } = await loadMediabunny();
  const ok = await canEncodeVideo("vp9", { width: size.width, height: size.height, frameRate: def.canvas.fps });
  if (!ok) throw new Error("Browser ini tidak mendukung encode VP9. Gunakan Chrome/Edge terbaru untuk video alpha.");
  const blob = await renderToOutput({
    def,
    preset,
    size,
    background: null,
    codec: "vp9",
    alpha: "keep",
    onProgress,
    cancel,
  });
  return { blob, size, durationSec: def.canvas.durationSec };
}
