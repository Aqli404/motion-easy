import type { MotionDefinition } from "./schema";

/**
 * 5 contoh MotionDefinition yang jadi "uji nyata" skema Fase 1.
 * Semua tervalidasi oleh TypeScript (tipe MotionDefinition), jadi
 * kalau skema berubah, contoh-contoh ini ikut menyala sebagai pengingat.
 */

const PALETTE = {
  deep: "#070912",
  panel: "#1d1f29",
  panelLow: "#191b25",
  accent: "#f97316",
  amber: "#ffb690",
  cyan: "#4cd7f6",
  green: "#4edea3",
  ink: "#e1e1ef",
  inkDim: "#e0c0b1",
};

/** 1) Lima bola melayang memantul — uji: loop + phase + pop. */
export const bolaMemantul: MotionDefinition = {
  version: 1,
  name: "Bola Memantul",
  notes: "Contoh gerak berulang dengan phase berjenjang (stagger).",
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 6, background: PALETTE.deep },
  layers: [
    {
      id: "bg",
      kind: "rect",
      tag: "background",
      time: { from: 0, to: 6 },
      geometry: { x: 0.5, y: 0.5, w: 1, h: 1 },
      style: { color: PALETTE.panel },
    },
    ...["#f97316", "#4cd7f6", "#4edea3", "#ffb690", "#e1e1ef"].map(
      (warna, i): MotionDefinition["layers"][number] => ({
        id: `bola-${i + 1}`,
        kind: "ellipse",
        tag: "object",
        time: { from: 0, to: 6 },
        geometry: {
          x: 0.2 + i * 0.15,
          y: 0.55,
          w: 0.08,
          h: 0.08,
        },
        style: { color: warna },
        motion: {
          in: { type: "pop", at: i * 0.15, dur: 0.5, easing: "easeOutBack" },
          loop: { type: "float", dur: 1.1, amount: 0.18, phase: i / 5 },
        },
      }),
    ),
  ],
};

/** 2) Judul reveal ala landing — uji: slide + urutan waktu. */
export const judulReveal: MotionDefinition = {
  version: 1,
  name: "Judul Reveal",
  notes: "Pengenalan layar: garis aksen, judul, subjudul — berturut-turut.",
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 6, background: PALETTE.deep },
  layers: [
    {
      id: "bg",
      kind: "rect",
      tag: "background",
      time: { from: 0, to: 6 },
      geometry: { x: 0.5, y: 0.5, w: 1, h: 1 },
      style: { color: PALETTE.panelLow },
    },
    {
      id: "aksen-bar",
      kind: "rect",
      tag: "accent",
      time: { from: 0, to: 6 },
      geometry: { x: 0.36, y: 0.5, w: 0.006, h: 0.28 },
      style: { color: PALETTE.amber },
      motion: { in: { type: "slideUp", dur: 0.6, easing: "easeOut" } },
    },
    {
      id: "judul",
      kind: "text",
      tag: "title",
      time: { from: 0.2, to: 6 },
      geometry: { x: 0.4, y: 0.36 },
      style: { color: PALETTE.ink },
      text: {
        content: "MOTION EASY STUDIO",
        size: 0.075,
        weight: 900,
        align: "left",
        font: "sans",
      },
      motion: { in: { type: "slideRight", at: 0.2, dur: 0.7, easing: "easeOut" } },
    },
    {
      id: "subjudul",
      kind: "text",
      tag: "subtitle",
      time: { from: 0.7, to: 6 },
      geometry: { x: 0.4, y: 0.58 },
      style: { color: PALETTE.inkDim },
      text: {
        content: "brief  \u2192  prompt  \u2192  animasi  \u2192  MP4",
        size: 0.03,
        weight: 500,
        align: "left",
        font: "mono",
      },
      motion: { in: { type: "fadeIn", at: 0.7, dur: 0.5 } },
    },
    {
      id: "garis-bawah",
      kind: "line",
      tag: "accent",
      time: { from: 1, to: 6 },
      geometry: { x: 0.365, y: 0.72 },
      line: { to: { x: 0.8, y: 0.72 } },
      style: { color: PALETTE.cyan, strokeWidth: 0.004 },
      motion: { in: { type: "fadeIn", at: 1, dur: 0.4 } },
    },
  ],
};

/** 3) Tiga kartu statistik pop berurutan — uji: rect + teks + timing. */
export const kartuStatistik: MotionDefinition = {
  version: 1,
  name: "Kartu Statistik",
  notes: "Format microstock populer: 3 kartu muncul satu per satu.",
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 8, background: PALETTE.deep },
  layers: [
    {
      id: "bg",
      kind: "rect",
      tag: "background",
      time: { from: 0, to: 8 },
      geometry: { x: 0.5, y: 0.5, w: 1, h: 1 },
      style: { color: PALETTE.panelLow },
    },
    ...[0, 1, 2].flatMap((i): MotionDefinition["layers"] => {
      const x = 0.3 + i * 0.2;
      const angka = ["75%", "85%", "95%"][i];
      const label = ["Efisiensi", "Kualitas", "Penjualan"][i];
      const warna = ["#f97316", "#4cd7f6", "#4edea3"][i];
      return [
        {
          id: `kartu-${i}`,
          kind: "rect",
          tag: "card",
          time: { from: 0, to: 8 },
          geometry: { x, y: 0.55, w: 0.16, h: 0.34 },
          style: { color: PALETTE.panel, stroke: warna, strokeWidth: 0.0015, radius: 0.02 },
          motion: { in: { type: "pop", at: i * 0.3, dur: 0.5, easing: "easeOutBack" } },
        },
        {
          id: `kartu-${i}-angka`,
          kind: "text",
          tag: "number",
          time: { from: 0.3 + i * 0.3, to: 8 },
          geometry: { x, y: 0.46 },
          style: { color: warna },
          text: { content: angka, size: 0.06, weight: 900, align: "center" },
          motion: { in: { type: "fadeIn", at: 0.3 + i * 0.3, dur: 0.4 } },
        },
        {
          id: `kartu-${i}-label`,
          kind: "text",
          tag: "label",
          time: { from: 0.45 + i * 0.3, to: 8 },
          geometry: { x, y: 0.63 },
          style: { color: PALETTE.inkDim },
          text: { content: label, size: 0.022, weight: 500, align: "center" },
          motion: { in: { type: "fadeIn", at: 0.45 + i * 0.3, dur: 0.4 } },
        },
      ];
    }),
  ],
};

/** 4) Partikel mengambang — uji: banyak layer + phase acak. */
export const partikelMengambang: MotionDefinition = {
  version: 1,
  name: "Partikel Mengambang",
  notes: "Latar dinamis 48 partikel, semua loop dengan phase berbeda.",
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 8, background: PALETTE.deep },
  layers: [
    {
      id: "bg",
      kind: "rect",
      tag: "background",
      time: { from: 0, to: 8 },
      geometry: { x: 0.5, y: 0.5, w: 1, h: 1 },
      style: { color: PALETTE.panelLow },
    },
    ...Array.from({ length: 48 }, (_, i): MotionDefinition["layers"][number] => {
      const warna = [PALETTE.cyan, PALETTE.amber, PALETTE.green][i % 3];
      return {
        id: `p-${i}`,
        kind: "ellipse",
        tag: "particle",
        time: { from: 0, to: 8 },
        geometry: {
          x: (i * 0.618) % 1,
          y: ((i * 0.382) % 0.8) + 0.1,
          w: 0.012 + (i % 5) * 0.004,
          h: 0.012 + (i % 5) * 0.004,
        },
        style: { color: warna, opacity: 0.3 + (i % 4) * 0.18 },
        motion: { loop: { type: "float", dur: 2.2 + (i % 5) * 0.4, amount: 0.06, phase: (i * 0.127) % 1 } },
      };
    }),
    {
      id: "judul-partikel",
      kind: "text",
      tag: "title",
      time: { from: 0.5, to: 8 },
      geometry: { x: 0.5, y: 0.5 },
      style: { color: PALETTE.ink },
      text: { content: "PARTICLE FIELD", size: 0.09, weight: 900, align: "center" },
      motion: { in: { type: "pop", at: 0.5, dur: 0.8, easing: "easeOutBack" } },
    },
  ],
};

/** 5) Lower third brand — uji: slide masuk + keluar terjadwal. */
export const lowerThirdBrand: MotionDefinition = {
  version: 1,
  name: "Lower Third Brand",
  notes: "Bar identitas di bawah: masuk kiri, keluar turun sebelum video berakhir.",
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 8, background: null },
  layers: [
    {
      id: "lower-bar",
      kind: "rect",
      tag: "background",
      time: { from: 0.4, to: 7 },
      geometry: { x: 0.33, y: 0.82, w: 0.55, h: 0.1 },
      style: { color: PALETTE.panel, radius: 0.012 },
      motion: {
        in: { type: "slideLeft", at: 0.4, dur: 0.5, easing: "easeOut" },
        out: { type: "slideDown", before: 0.5, dur: 0.45, easing: "easeIn" },
      },
    },
    {
      id: "lower-aksen",
      kind: "rect",
      tag: "accent",
      time: { from: 0.4, to: 7 },
      geometry: { x: 0.072, y: 0.82, w: 0.008, h: 0.1 },
      style: { color: PALETTE.accent, radius: 0.4 },
      motion: {
        in: { type: "slideLeft", at: 0.4, dur: 0.5, easing: "easeOut" },
        out: { type: "slideDown", before: 0.5, dur: 0.45, easing: "easeIn" },
      },
    },
    {
      id: "lower-nama",
      kind: "text",
      tag: "name",
      time: { from: 0.9, to: 7 },
      geometry: { x: 0.135, y: 0.79, w: 0.1, h: 0.1 },
      style: { color: PALETTE.ink },
      text: { content: "MOTION EASY", size: 0.035, weight: 800, align: "left" },
      motion: { in: { type: "fadeIn", at: 0.9, dur: 0.4 }, out: { type: "fadeOut", before: 0.55, dur: 0.4 } },
    },
    {
      id: "lower-role",
      kind: "text",
      tag: "role",
      time: { from: 1.2, to: 7 },
      geometry: { x: 0.135, y: 0.85, w: 0.1, h: 0.1 },
      style: { color: PALETTE.inkDim },
      text: { content: "AI Motion Graphics Studio", size: 0.02, weight: 500, align: "left", font: "mono" },
      motion: { in: { type: "fadeIn", at: 1.2, dur: 0.4 }, out: { type: "fadeOut", before: 0.55, dur: 0.4 } },
    },
  ],
};

/** Etiket + daftar contoh untuk UI (Fase 2 memakai ini sebagai test fixture). */
export const SAMPLES: Record<string, { label: string; caption: string; def: MotionDefinition }> = {
  "bola-memantul": {
    label: "Bola Memantul",
    caption: "loop float + phase stagger",
    def: bolaMemantul,
  },
  "judul-reveal": {
    label: "Judul Reveal",
    caption: "slide + urutan waktu",
    def: judulReveal,
  },
  "kartu-statistik": {
    label: "Kartu Statistik",
    caption: "pop berjenjang",
    def: kartuStatistik,
  },
  "partikel-mengambang": {
    label: "Partikel Mengambang",
    caption: "48 layer float acak",
    def: partikelMengambang,
  },
  "lower-third": {
    label: "Lower Third Brand",
    caption: "in slideLeft + out slideDown",
    def: lowerThirdBrand,
  },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES);
