import type { MotionDefinition } from "./schema";

/**
 * 5) Kanvas bebas + 5 lainnya — "uji nyata" skema v1 (+ v1.1 kind canvas).
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

/**
 * 6) Kanvas bebas (kind "canvas") — demo powerhouse efek organik:
 * nebula radial, pita gelombang ber-glow, dan bintang berkelip.
 * Semua deterministik (fx.*), jadi preview = hasil export.
 */
const NEBULA_KODE = `function draw(ctx, time, w, h, fx) {
  var TWO = 6.28318;
  // latar gelap ber-gradasi
  ctx.fillStyle = fx.gradient(ctx, 0, 0, 0, h, ["#05070f", "#0b0f1e", "#141a2e"]);
  ctx.fillRect(0, 0, w, h);

  // tiga blob nebula lembut yang bernapas
  var blobs = [
    ["#4cd7f6", 0.28, 0.40, 0.42, 6.0],
    ["#f97316", 0.74, 0.62, 0.36, 7.3],
    ["#a78bfa", 0.52, 0.26, 0.30, 8.1]
  ];
  for (var i = 0; i < blobs.length; i++) {
    var b = blobs[i];
    var x = (b[1] + 0.05 * Math.sin(fx.loop(time, b[4]) * TWO)) * w;
    var y = (b[2] + 0.04 * Math.sin(fx.loop(time, b[4] + 1.9) * TWO + 1.2)) * h;
    var r = b[3] * (0.9 + 0.12 * fx.pulse(time, 7 - i)) * Math.max(w, h);
    var g = fx.radial(ctx, x, y, r, [b[0] + "55", b[0] + "00"]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO);
    ctx.fill();
  }

  // dua pita gelombang ber-glow
  var pita = [["#4cd7f6", 0.62, 0], ["#f97316", 0.8, 2.1]];
  for (var j = 0; j < pita.length; j++) {
    var s = pita[j];
    var fase = fx.pulse(time, 9) * TWO + s[2];
    fx.glow(ctx, s[0], 30);
    ctx.strokeStyle = s[0];
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (var px = 0; px <= w; px += 12) {
      var py = (s[1] + 0.05 * Math.sin((px / w) * 5.2 + fase)) * h;
      if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    fx.glowOff(ctx);
  }

  // medan bintang berkelip (deterministik via fx.rand)
  for (var k = 0; k < 80; k++) {
    var sx = fx.rand(k, 11) * w;
    var sy = fx.rand(k, 23) * h;
    var tw = fx.pulse(time, 1.4 + fx.rand(k, 37) * 2.2);
    var rad = 0.8 + fx.rand(k, 51) * 2.1;
    ctx.globalAlpha = 0.2 + 0.75 * tw;
    ctx.fillStyle = "#e8ecff";
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, TWO);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}`;

export const nebulaKanvas: MotionDefinition = {
  version: 1,
  name: "Nebula Kanvas Bebas",
  notes: 'Demo kind "canvas": nebula + glow wave + bintang — cukup SATU layer kode.',
  canvas: { w: 1920, h: 1080, fps: 30, durationSec: 8, background: "#05070f" },
  layers: [
    {
      id: "fx-nebula",
      kind: "canvas",
      tag: "fx-kanvas",
      time: { from: 0, to: 8 },
      geometry: { x: 0.5, y: 0.5 },
      kanvas: { source: NEBULA_KODE },
    },
    {
      id: "judul",
      kind: "text",
      tag: "title",
      time: { from: 1, to: 7.6 },
      geometry: { x: 0.5, y: 0.47 },
      style: { color: "#ffffff" },
      text: { content: "KANVAS BEBAS", size: 0.085, weight: 900, align: "center" },
      motion: { in: { type: "pop", at: 0.2, dur: 0.7, easing: "easeOutBack" }, out: { type: "fadeOut", before: 0.4, dur: 0.4 } },
    },
    {
      id: "sub",
      kind: "text",
      tag: "subtitle",
      time: { from: 1.6, to: 7.6 },
      geometry: { x: 0.5, y: 0.585 },
      style: { color: "#8ad8f2" },
      text: { content: "efek organik pakai satu kode — katakan saja pada AI", size: 0.028, weight: 600, align: "center", font: "mono" },
      motion: { in: { type: "fadeIn", at: 0.2, dur: 0.6 }, out: { type: "fadeOut", before: 0.4, dur: 0.4 } },
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
  "nebula-kanvas": {
    label: "Nebula Kanvas Bebas",
    caption: "fx: glow, gelombang, bintang (kind canvas)",
    def: nebulaKanvas,
  },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES);
