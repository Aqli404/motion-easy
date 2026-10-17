/**
 * Fase 4 — Encoder video (WebCodecs + mp4-muxer).
 * Render & encode 100% di browser user: requestAnimationFrame tidak dipakai,
 * tiap frame digambar ke canvas offscreen lalu dikirim ke VideoEncoder (GPU).
 * Server: tidak ada. Biaya: Rp 0.
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { renderFrame } from "../engine/renderer";
import type { MotionDefinition } from "../engine/schema";
import { resolveExportSize } from "./presets";
import type { ExportPreset, ExportSize } from "./presets";

export interface ExportProgress {
  phase: "preparing" | "encoding" | "muxing";
  frame: number;
  totalFrames: number;
  pct: number;
}

export type CancelFlag = { cancelled: boolean };

export function webCodecsSupported(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window;
}

/** Urutan codec H.264 dari kualitas terbaik ke paling aman. */
const CANDIDATE_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42001f"];

async function pickCodec(
  width: number,
  height: number,
  bitrate: number,
  fps: number,
): Promise<string> {
  for (const codec of CANDIDATE_CODECS) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) return codec;
    } catch {
      // coba codec berikutnya
    }
  }
  throw new Error(
    "Tidak ada codec H.264 yang didukung browser ini. Gunakan Chrome/Edge terbaru.",
  );
}

export interface ExportResult {
  blob: Blob;
  size: ExportSize;
  durationSec: number;
}

export async function exportMp4(
  def: MotionDefinition,
  preset: ExportPreset,
  onProgress: (p: ExportProgress) => void,
  cancel: CancelFlag,
): Promise<ExportResult> {
  if (!webCodecsSupported()) {
    throw new Error(
      "Browser ini tidak mendukung WebCodecs. Gunakan Chrome atau Edge terbaru.",
    );
  }

  const fps = def.canvas.fps;
  const size = resolveExportSize(def, preset);
  const { width, height } = size;

  onProgress({ phase: "preparing", frame: 0, totalFrames: 0, pct: 0 });
  const codec = await pickCodec(width, height, preset.bitrate, fps);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (e) {
        encodeError = e as Error;
      }
    },
    error: (e) => {
      encodeError = e;
    },
  });

  encoder.configure({
    codec,
    width,
    height,
    bitrate: preset.bitrate,
    framerate: fps,
  });

  // Canvas untuk menggambar frame (renderer yang sama dengan preview!)
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Gagal menyiapkan canvas render.");

  const totalFrames = Math.max(1, Math.round(def.canvas.durationSec * fps));
  const frameDurUs = Math.round(1_000_000 / fps);
  const keyframeEvery = Math.max(1, Math.round(fps * 2)); // keyframe tiap ~2 detik

  onProgress({ phase: "encoding", frame: 0, totalFrames, pct: 0 });

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (cancel.cancelled) throw new Error("Export dibatalkan.");
      if (encodeError) throw encodeError;

      renderFrame(ctx, def, i / fps);
      const frame = new VideoFrame(canvas, {
        timestamp: i * frameDurUs,
        duration: frameDurUs,
      });
      encoder.encode(frame, { keyFrame: i % keyframeEvery === 0 });
      frame.close();

      // jaga antrean agar tidak menumpuk di memori
      while (encoder.encodeQueueSize > 8 && !cancel.cancelled) {
        await new Promise((r) => setTimeout(r, 4));
      }
      if (cancel.cancelled) throw new Error("Export dibatalkan.");

      if (i % 3 === 0 || i === totalFrames - 1) {
        onProgress({
          phase: "encoding",
          frame: i + 1,
          totalFrames,
          pct: ((i + 1) / totalFrames) * 95,
        });
      }
    }

    onProgress({ phase: "muxing", frame: totalFrames, totalFrames, pct: 97 });
    await encoder.flush();
    muxer.finalize();
    const buffer = (muxer.target as ArrayBufferTarget).buffer;
    onProgress({ phase: "muxing", frame: totalFrames, totalFrames, pct: 100 });
    return {
      blob: new Blob([buffer], { type: "video/mp4" }),
      size,
      durationSec: def.canvas.durationSec,
    };
  } finally {
    try {
      if (encoder.state !== "closed") encoder.close();
    } catch {
      // abaikan
    }
  }
}

/** Unduh blob dengan nama file yang rapi. */
export function unduhBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
