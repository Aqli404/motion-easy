import type { MotionDefinition } from "../engine/schema";
import { prepareImageAssets } from "../engine/svg";
import { renderFrame } from "../engine/renderer";
import { buatZip, type ArsipFile } from "./zip";
import { resolveExportSize, slugify, EXPORT_PRESETS } from "./presets";

export const SEQUENCE_MAX_FRAMES = 600;
export const SEQUENCE_MAX_BYTES = 128_000_000;
export interface SequenceOptions { resolution: "720" | "1080"; fps: 24 | 30 | 60; transparent: boolean }
export interface SequenceProgress { phase: "preparing" | "rendering" | "packing"; frame: number; total: number; bytes: number }

export async function exportSequence(
  def: MotionDefinition, options: SequenceOptions, cancel: { cancelled: boolean },
  progress: (value: SequenceProgress) => void,
): Promise<Blob> {
  if (![24, 30, 60].includes(options.fps)) throw new Error("FPS PNG sequence tidak valid.");
  const preset = EXPORT_PRESETS.find((item) => item.id === options.resolution && !item.premium);
  if (!preset) throw new Error("PNG sequence Lite mendukung 720p dan 1080p.");
  const total = Math.ceil(def.canvas.durationSec * options.fps);
  if (!Number.isFinite(total) || total < 1 || total > SEQUENCE_MAX_FRAMES) throw new Error(`Maksimal ${SEQUENCE_MAX_FRAMES} frame. Kurangi durasi atau FPS proyek.`);
  const { width, height } = resolveExportSize(def, preset);
  if (width * height > 4_200_000) throw new Error("Rasio terlalu ekstrem. Maksimal 4,2 juta piksel per frame.");
  const check = () => { if (cancel.cancelled) throw new Error("Ekspor PNG dibatalkan."); };
  check();
  progress({ phase: "preparing", frame: 0, total, bytes: 0 });
  await prepareImageAssets(def);
  check();
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Gagal membuat canvas PNG.");
  const scene = options.transparent ? { ...def, canvas: { ...def.canvas, background: null } } : def;
  const files: ArsipFile[] = [];
  let bytes = 0;
  try {
    for (let i = 0; i < total; i++) {
      check();
      renderFrame(ctx, scene, i / options.fps);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal encode frame PNG.")), "image/png"));
      check();
      bytes += png.size;
      if (bytes > SEQUENCE_MAX_BYTES) throw new Error("Batas 128 MB PNG tercapai. Kurangi resolusi atau durasi lalu ulangi.");
      files.push({ nama: `frames/${slugify(def.name)}-${String(i + 1).padStart(6, "0")}.png`, data: new Uint8Array(await png.arrayBuffer()) });
      progress({ phase: "rendering", frame: i + 1, total, bytes });
    }
    files.push({ nama: "sequence.json", data: new TextEncoder().encode(JSON.stringify({ name: def.name, width, height, fps: options.fps, frames: total, durationSec: def.canvas.durationSec, transparentBackground: options.transparent, note: "Import frames as image sequence at the specified FPS. Opaque layers inside artwork remain opaque." }, null, 2)) });
    progress({ phase: "packing", frame: total, total, bytes });
    await new Promise((resolve) => setTimeout(resolve, 0));
    check();
    return buatZip(files);
  } finally {
    files.length = 0;
    canvas.width = 1; canvas.height = 1;
  }
}
