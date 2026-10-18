/**
 * Fase 3 — Prompt Builder (BYO-AI).
 * Menyusun teks prompt siap tempel ke ChatGPT/Claude/Gemini milik user,
 * plus prompt "perbaikan" untuk self-heal (maks 3 percobaan).
 *
 * Sumber kebenaran: nama-nama diambil dari schema.ts supaya prompt
 * TIDAK BISA berbeda dari validator.
 */

import {
  EASE_NAMES,
  LOOP_TYPES,
} from "./schema";
import { SAMPLES } from "./samples";

export type Rasio = "16:9" | "9:16" | "1:1";

export interface Brief {
  ide: string;
  kategori: string;
  gaya: string;
  rasio: Rasio;
  durasi: number;
  fps: 24 | 30 | 60;
  warnaUtama: string;
  warnaAksen: string;
  maxLayer: number;
}

export const KATEGORI = [
  "Judul / Intro",
  "Lower Third",
  "Infografik / Statistik",
  "Logo Sting",
  "Background Loop",
  "Partikel & Efek Organik",
  "Bebas / Custom",
] as const;

export const GAYA = [
  "Minimal Flat",
  "Neon Gelap",
  "Corporate",
  "Playful",
  "Elegan Gelap",
] as const;

export const RASIO_MAP: Record<Rasio, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

const KATEGORI_HINT: Record<string, string> = {
  "Judul / Intro": "1 layar judul besar + subjudul, background gelap.",
  "Lower Third": "canvas.background = null (transparan); identitas di sepertiga bawah; gerak in rapi dan out tepat sebelum video berakhir.",
  "Infografik / Statistik": "3-5 kartu/bar dengan angka; masuk berjenjang (stagger 0.2-0.3 dtk antar elemen pakai motion.in.at).",
  "Logo Sting": "logo dari bentuk sederhana (rect/ellipse/triangle), pop dengan easing easeOutBack, lalu fadeOut.",
  "Background Loop": "10-30 bentuk kecil float/pulse dengan phase acak 0..1; tanpa teks; siklus terasa mulus.",
  "Partikel & Efek Organik": "utamakan 1 layer kind \"canvas\" (KANVAS BEBAS) — medan partikel/glow/gelombang via kode draw(), boleh + 1-2 layer teks di atasnya.",
  "Bebas / Custom": "ikuti deskripsi ide pengguna.",
};

const GAYA_HINT: Record<string, string> = {
  "Minimal Flat": "warna flat, radius kecil, whitespace luas, gerak fadeIn/slide halus.",
  "Neon Gelap": "background sangat gelap, elemen cerah, kesan glow lewat stroke cerah tipis.",
  "Corporate": "sudut tegas (radius 0), slideLeft/slideRight, easing easeOut.",
  "Playful": "huruf pop, easing easeOutBounce, warna ceria, bentuk ellipse.",
  "Elegan Gelap": "gerak lambat (dur in 0.8-1.2), dominan fadeIn, opacity rendah utk dekorasi.",
};

export function defaultBrief(): Brief {
  return {
    ide: "Teks judul muncul dengan garis aksen lalu keluar halus",
    kategori: "Judul / Intro",
    gaya: "Neon Gelap",
    rasio: "16:9",
    durasi: 8,
    fps: 30,
    warnaUtama: "#4cd7f6",
    warnaAksen: "#f97316",
    maxLayer: 30,
  };
}

/** Contoh output valid — dipakai sebagai few-shot di prompt. */
function contohValidJson(utama: string, aksen: string): string {
  const base = SAMPLES["judul-reveal"].def;
  const contoh: typeof base = {
    ...base,
    canvas: { ...base.canvas, durationSec: 6 },
    layers: base.layers.map((l) => ({
      ...l,
      style: l.style ? { ...l.style } : undefined,
    })),
    notes: "contoh format — data animasi yang melampaui brief boleh diubah",
  };
  // warna contoh diganti sesuai warna brief supaya AI tidak copy asal
  const swap: Record<string, string> = {
    "#4cd7f6": utama,
    "#f97316": aksen,
  };
  const text = JSON.stringify(contoh, null, 2);
  return text.replace(/#4cd7f6/g, swap["#4cd7f6"]).replace(/#f97316/g, swap["#f97316"]);
}

const RULES_TEXT = `
ATURAN WAJIB (validator menolak bila dilanggar):
1. Output = SATU blok kode json berisi objek MotionDefinition. Tanpa sapaan, tanpa penjelasan, tanpa field lain.
2. "version" wajib 1. JSON harus valid: JSON.parse sukses, tidak ada koma gantung, tidak ada komentar.
3. Semua koordinat & ukuran = FRAKSI 0..1 relatif kanvas (0 = kiri/atas, 1 = kanan/bawah, 0.5/0.5 = pusat).
4. Waktu = DETIK. time.from < time.to, dan semuanya di dalam 0..canvas.durationSec.
5. Warna hex 6 digit (#rrggbb). GRADIEN pada layer biasa tidak didukung — buat layer bertumpuk.
6. layer kind: rect | ellipse | triangle | text | line | canvas. Layer "text" wajib punya "text", layer "line" wajib punya "line", layer "canvas" wajib punya "kanvas".
7. geometry.x/y = titik PUSAT; geometry.w/h = ukuran bbox (fraksi). Untuk teks dan canvas, w/h tidak perlu.
8. motion.in type: none | fadeIn | slideUp | slideDown | slideLeft | slideRight | pop  (fadeIn, fokus untuk masuk)
9. motion.out type: none | fadeOut | slideUp | slideDown | slideLeft | slideRight  (fadeOut, fokus untuk keluar)
10. motion.loop: none | float | pulse | spin | sway + dur, amount (fraksi, umum 0.05-0.2), phase (0..1)
11. easing: ${EASE_NAMES.join(" | ")}
12. Layer maks {MAX} layer. Hindari layer menghantui: partikel cukup 20-40.

BENTUK TEKS (kind "text"):
- text.content = string (boleh \\n)
- text.size = fraksi tinggi kanvas (0.02-0.12 umum)
- text.weight: 400|500|600|700|800|900 ; text.align: left|center|right ; text.font: sans|mono ; text.lineHeight: 1.0-2.0
- warnanya via style.color

KANVAS BEBAS (kind "canvas") — untuk efek organik: medan bintang, partikel, nebula, gelombang, glow, gradien dinamis:
- Struktur wajib: { id, kind:"canvas", time:{from,to}, geometry:{x:0.5,y:0.5}, kanvas:{ source:"function draw(ctx, time, w, h, fx) { ... }" } }
- source = string berisi SATU fungsi JS. ctx = Canvas 2D biasa dengan koordinat PIKSEL PENUH kanvas w x h.
- Boleh pakai Math, sin/cos, dan helper fx HANYA ini:
  fx.loop(time, period) -> fase berulang 0..1
  fx.pulse(time, period) -> gelombang halus 0..1 (mulus untuk denyut/napas)
  fx.ease(x) -> rentet 0..1
  fx.rand(i, seed) -> angka "acak" tetap 0..1 (deterministik — WAJIB untuk partikel/bintang)
  fx.glow(ctx, warna, blur) + fx.glowOff(ctx) -> efek pendar
  fx.gradient(ctx, x0,y0,x1,y1, [warna1, warna2, ...]) -> gradien linear
  fx.radial(ctx, x, y, radius, [warna1, warna2]) -> gradien radial berpusat
- DETERMINISTIK WAJIB: DILARANG Math.random(), Date, fetch, font, gambar, atau state. Setiap frame murni fungsi dari (time, w, h) supaya preview dan export identik.
- Hindari mengubah ctx.globalAlpha secara permanen; kalau mengubah, kembalikan ke nilai awal atau pakai save()/restore().
- JANGAN pakai loop lebih dari ~2000 langkah per frame. Partikel/bintang cukup 40-120 titik.
- Ketika KATEGORI menyebut efek partikel/neon/gelombang, gunakanlah kind "canvas" untuk latar + layer teks di atasnya bila perlu.
`.trim();

/** Prompt utama dari brief. */
export function buildPrompt(b: Brief): string {
  const dims = RASIO_MAP[b.rasio];
  const kategoriHint = KATEGORI_HINT[b.kategori] ?? KATEGORI_HINT["Bebas / Custom"];
  const gayaHint = GAYA_HINT[b.gaya] ?? "";
  const ide = b.ide.trim() || "(pengguna tidak menulis ide — buat yang menarik sesuai kategori)";

  return [
    "Peran: kamu adalah generator motion graphics. Ubah BRIEF di bawah menjadi SATU karya animasi berformat MotionDefinition.",
    "",
    `OUTPUT WAJIB: satu blok kode \`\`\`json\`\`\` berisi objek MotionDefinition. version = 1.`,
    "",
    RULES_TEXT.replace("{MAX}", String(b.maxLayer)),
    "",
    "CONTOH FORMAT YANG VALID (amati strukturnya; ganti isi & warna mengikuti brief):",
    "```json",
    contohValidJson(b.warnaUtama, b.warnaAksen),
    "```",
    "",
    "BRIEF PENGGUNA:",
    `- Ide / tema: ${ide}`,
    `- Kategori: ${b.kategori} — petunjuk: ${kategoriHint}`,
    `- Gaya visual: ${b.gaya} — petunjuk: ${gayaHint}`,
    `- Kanvas: ${dims.w}x${dims.h} (rasio ${b.rasio}), durasi ${b.durasi} detik, fps ${b.fps}`,
    `- Warna utama: ${b.warnaUtama}  |  Aksen: ${b.warnaAksen}`,
    `- Bahasa teks: Indonesia`,
    "",
    "SARAN TEKNIS:",
    "- Urutkan layer dari belakang ke depan (background array pertama).",
    "- Strukturkan waktu: beri ruang napas antar kunci; jangan seragam.",
    "- Untuk stagger, gunakan motion.in.at berjenjang (0.15-0.35) antar elemen.",
    "- Beri motion.out sebelum video berakhir (time.to - 0.4..0.6).",
    "",
    "Sekarang tulis JSON-nya.",
  ].join("\n");
}

/** Prompt perbaikan (self-heal) — dipakai saat validasi gagal. */
export function buildRepairPrompt(
  originalJson: string,
  messages: string[],
  percobaan: number,
  maxLayer: number,
): string {
  return [
    `Karya MotionDefinition kamu DITOLAK validator (percobaan ${percobaan} dari 3). Perbaiki dengan tepat.`,
    "",
    "DAFTAR KESALAHAN:",
    ...messages.map((m, i) => `${i + 1}. ${m}`),
    "",
    "INGAT ATURAN PENTING:",
    "- koordinat = fraksi 0..1; waktu = detik; warna hex 6 digit",
    "- koordinat/nilai motion & easing hanya dari daftar resmi",
    `- maks ${maxLayer} layer`,
    "",
    "JSON SEBELUMNYA (perbaiki bagian yang bermasalah, pertahankan yang sudah benar):",
    "```json",
    originalJson,
    "```",
    "",
    "Output ulang: SATU blok kode ```json``` penuh, tanpa penjelasan.",
  ].join("\n");
}

/** Salin teks ke clipboard dengan fallback untuk HTTP non-secure. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Nama preset LOOP untuk label UI. */
export const LOOP_LABEL: Record<(typeof LOOP_TYPES)[number], string> = {
  none: "diam",
  float: "melayang",
  pulse: "denyut",
  spin: "putar",
  sway: "goyang",
};
