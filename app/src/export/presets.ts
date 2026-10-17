import type { MotionDefinition } from "../engine/schema";

/**
 * Fase 4 — Preset kualitas export.
 * Ukuran export memakai "sisi pendek" kanvas sebagai acuan supaya
 * video vertikal (9:16) tetap benar: 1080p -> 1080x1920, bukan 607x1080.
 */
export interface ExportPreset {
  id: string;
  label: string;
  /** sisi pendek target dalam piksel */
  short: number;
  bitrate: number;
  premium: boolean;
  caption: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: "720", label: "720p", short: 720, bitrate: 8_000_000, premium: false, caption: "Web & preview cepat" },
  { id: "1080", label: "1080p", short: 1080, bitrate: 25_000_000, premium: false, caption: "Standar microstock" },
  { id: "1440", label: "2K", short: 1440, bitrate: 45_000_000, premium: true, caption: "High-res stock (Fase 5)" },
  { id: "2160", label: "4K", short: 2160, bitrate: 80_000_000, premium: true, caption: "Master ultra (Fase 5)" },
];

export interface ExportSize {
  width: number;
  height: number;
}

export function resolveExportSize(def: MotionDefinition, preset: ExportPreset): ExportSize {
  const { w, h } = def.canvas;
  const short = Math.min(w, h);
  const scale = preset.short / short;
  // kunci: dimensi genap (encoder H.264 banyak menuntut kelipatan 2)
  const width = Math.max(2, Math.round((w * scale) / 2) * 2);
  const height = Math.max(2, Math.round((h * scale) / 2) * 2);
  return { width, height };
}

/** Perkiraan ukuran file mentah dalam MB (durasi x bitrate). */
export function estimasiMb(durasiSec: number, bitrate: number): number {
  return Math.round(((bitrate * durasiSec) / 8 / 1_000_000) * 10) / 10;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "motion-easy"
  );
}
