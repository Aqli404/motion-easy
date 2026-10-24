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

/**
 * Koleksi "tema siap pakai" — satu klik mengisi brief (ide + kategori + gaya)
 * dengan resep yang sudah teruji menghasilkan MotionDefinition bagus.
 * Ini jawaban kita atas "150+ preset tema"-nya kompetitor, tapi lebih
 * transparan: user melihat & bisa mengubah isi brief sebelum menyalin prompt.
 */
export interface Tema {
  label: string;
  ide: string;
  kategori: string;
  gaya: string;
}

export const TEMAS: Tema[] = [
  { label: "Bokeh Hangat Lembut", ide: "Bola-bola bokeh hangat blur melayang perlahan untuk latar video wawancara", kategori: "Background Loop", gaya: "Elegan Gelap" },
  { label: "Countdown Ring Neon", ide: "Angka 3-2-1 dalam ring melingkar ber-glow yang memendek tiap detik", kategori: "Infografik / Statistik", gaya: "Neon Gelap" },
  { label: "Cyberpunk Neon Grid", ide: "Latar grid neon berkilau dengan partikel glow melayang dan garis gelombang sirkuit", kategori: "Partikel & Efek Organik", gaya: "Neon Gelap" },
  { label: "Denyut Like Hati", ide: "Hati berdenyut pop berturut-turut dengan lingkaran glow meluas setiap detak", kategori: "Partikel & Efek Organik", gaya: "Playful" },
  { label: "Grafik Bisnis 2026", ide: "Empat bar statistik naik berjenjang dengan angka persen dan judul Pertumbuhan 2026", kategori: "Infografik / Statistik", gaya: "Corporate" },
  { label: "Grafik Saham Menaik", ide: "Garis grafik harga naik bertahap dengan ticker angka persen, latar financial gelap", kategori: "Infografik / Statistik", gaya: "Corporate" },
  { label: "Hook TikTok 3-2-1", ide: "Hitungan 3-2-1 muncul pop berurutan lalu teks hook utama meledak dengan easing bounce", kategori: "Judul / Intro", gaya: "Playful" },
  { label: "Hujan Koin Promo", ide: "Simbol koin dan rupiah jatuh perlahan dari atas dengan teks promo besar", kategori: "Partikel & Efek Organik", gaya: "Playful" },
  { label: "Judul Film Sinematik", ide: "Judul film muncul fadeIn sangat lambat dengan partikel debu emas melayang", kategori: "Judul / Intro", gaya: "Elegan Gelap" },
  { label: "Loading Ring Teknologi", ide: "Ring melingkar berputar dengan teks LOADING untuk latar aplikasi atau presentasi", kategori: "Background Loop", gaya: "Neon Gelap" },
  { label: "Logo Reveal Modern", ide: "Bentuk logo dari rect dan ellipse pop dengan easeOutBack lalu flash putih tipis", kategori: "Logo Sting", gaya: "Corporate" },
  { label: "Lower Third Berita", ide: "Kotak nama dan jabatan muncul slide kiri ala breaking news dengan garis aksen merah", kategori: "Lower Third", gaya: "Corporate" },
  { label: "Medan Bintang Galaxy", ide: "Sekitar 100 bintang berkelip deterministik plus nebula ungu-biru untuk judul sinematik", kategori: "Partikel & Efek Organik", gaya: "Elegan Gelap" },
  { label: "Promo Diskon 50%", ide: "Badge DISKON 50% muncul pop berdenyut di tengah, diapit dua garis aksen berkilau", kategori: "Judul / Intro", gaya: "Playful" },
  { label: "Ramadhan Elegan", ide: "Bulan dan bintang ber-glow emas berdenyut lembut dengan teks sambutan elegan", kategori: "Background Loop", gaya: "Elegan Gelap" },
  { label: "Sertifikat Penghargaan", ide: "Border bingkai slide dari sisi kiri-kanan, teks SERTIFIKAT muncul fadeIn elegan", kategori: "Judul / Intro", gaya: "Elegan Gelap" },
  { label: "Teks Glitch Pop", ide: "Huruf judul muncul pop satu per satu dengan offset kedalaman gaya glitch", kategori: "Judul / Intro", gaya: "Playful" },
  { label: "Tombol Subscribe", ide: "Tombol SUBSCRIBE slide naik dengan lonceng notifikasi berdenyut di sebelahnya", kategori: "Lower Third", gaya: "Playful" },
  { label: "UMKM Produk Terbaik", ide: "Teks produk naik dari bawah dengan bola-bola aksen memantul di latar gelap", kategori: "Judul / Intro", gaya: "Playful" },
  { label: "Waveform Podcast", ide: "Batang gelombang audio berdenyut mengikuti ritme di bawah judul episode podcast", kategori: "Partikel & Efek Organik", gaya: "Neon Gelap" },
].sort((a, b) => a.label.localeCompare(b.label));

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

/* ===== Alur SVG Motion (AI → SVG berlapis) ===== */

const SVG_KATEGORI_HINT: Record<string, string> = {
  "Judul / Intro": "1 judul besar + subjudul + 2 dekorasi aksen; komposisi terpusat.",
  "Lower Third": "Seluruh komposisi menumpuk di pita sepertiga bawah kanvas; bagian atas tetap bersih.",
  "Infografik / Statistik": "3-5 kartu/bar angka, masing-masing kelompok <g> sendiri lengkap dengan label teksnya.",
  "Logo Sting": "Bentuk logo sederhana 1-3 <g> besar di tengah; sisa area kosong rapi.",
  "Background Loop": "Pola dekoratif merata sepanjang kanvas, 8-16 <g>; tanpa teks.",
  "Partikel & Efek Organik": "Jangan ratusan titik terpisah — kelompokkan jadi 3-8 <g> berisi beberapa bentuk serupa.",
  "Bebas / Custom": "ikuti deskripsi ide pengguna.",
};

function contohSvg(utama: string, aksen: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="grad-utama" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${utama}"/>
      <stop offset="1" stop-color="${aksen}"/>
    </linearGradient>
  </defs>
  <rect id="background" width="1920" height="1080" fill="#0b0f1a"/>
  <g id="dekorasi-lingkaran">
    <circle cx="240" cy="880" r="150" fill="none" stroke="${utama}" stroke-width="6" opacity="0.5"/>
    <circle cx="1790" cy="170" r="90" fill="none" stroke="${aksen}" stroke-width="4" opacity="0.4"/>
  </g>
  <g id="judul">
    <text x="960" y="480" font-family="Arial, sans-serif" font-size="120" font-weight="800" fill="${utama}" text-anchor="middle">JUDUL UTAMA</text>
    <text x="960" y="580" font-family="Arial, sans-serif" font-size="48" fill="#ffffff" opacity="0.85" text-anchor="middle">Subjudul singkat</text>
  </g>
  <g id="aksen-garis">
    <rect x="860" y="640" width="200" height="10" rx="5" fill="url(#grad-utama)"/>
  </g>
</svg>`;
}

const SVG_RULES = `
ATURAN WAJIB (validator membuang atau menolak bila dilanggar):
1. Output = SATU blok kode <svg>…</svg> murni. Tanpa penjelasan, tanpa teks lain di luar blok.
2. Root: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">. Artboard tetap 16:9.
3. Setiap elemen atau <g> yang menjadi anak LANGSUNG dari root = satu layer animasi. Maksimal {MAX} layer tingkat atas.
4. Setiap layer wajib punya id unik yang deskriptif (misal id="judul", id="kartu-1") — id dipakai sebagai nama layer di aplikasi.
5. Kelompokkan bentuk yang satu kesatuan dalam <g id="...">. Detail kecil boleh path kompleks DI DALAM group.
6. HANYA presentation attributes: fill, stroke, stroke-width, opacity, font-family, font-size, font-weight, font-style, text-anchor, transform, clip-path. DILARANG KERAS: atribut style/class, <style>, <script>, <use>, <filter>, <foreignObject>, <a>, <animate>/<animateTransform>/SMIL, dan semua gambar/URL eksternal.
7. Gradien diperbolehkan hanya sebagai <defs> lokal dengan id unik, dipakai via fill="url(#id)".
8. Teks: <text x=".." y=".." font-family="Arial, sans-serif" font-size="angka" fill="#hex" text-anchor="middle">. Maksimal 1-2 baris per layer; font serif/eksternal tidak dijamin tersedia.
9. Latar: layer pertama = satu <rect> penuh 1920x1080 dengan fill gelap sesuai gaya, id="background", KECUALI brief meminta transparan.
10. Urutan layer = urutan gambar; yang terakhir paling atas. Overlay/dekorasi halus taruh paling akhir.
11. Total maksimal sekitar 3000 elemen. Utamakan bentuk sederhana yang mudah dibaca.`.trim();

/** Prompt utama SVG Motion dari brief (ide/kategori/gaya/warna). */
export function buildSvgPrompt(b: Brief): string {
  const kategoriHint = SVG_KATEGORI_HINT[b.kategori] ?? SVG_KATEGORI_HINT["Bebas / Custom"];
  const gayaHint = GAYA_HINT[b.gaya] ?? "";
  const ide = b.ide.trim() || "(pengguna tidak menulis ide — buat yang menarik sesuai kategori)";
  const maxLayer = Math.min(60, Math.max(2, b.maxLayer));

  return [
    "Peran: kamu adalah desainer grafis SVG. Ubah BRIEF di bawah menjadi SATU karya SVG berlapis yang siap dipecah menjadi layer animasi.",
    "",
    "OUTPUT WAJIB: satu blok kode ```svg``` berisi markup SVG murni.",
    "",
    SVG_RULES.replace("{MAX}", String(maxLayer)),
    "",
    "CONTOH FORMAT YANG VALID (amati strukturnya; ganti isi & warna mengikuti brief):",
    "```svg",
    contohSvg(b.warnaUtama, b.warnaAksen),
    "```",
    "",
    "BRIEF PENGGUNA:",
    `- Ide / tema: ${ide}`,
    `- Kategori: ${b.kategori} — petunjuk: ${kategoriHint}`,
    `- Gaya visual: ${b.gaya} — petunjuk: ${gayaHint}`,
    `- Warna utama: ${b.warnaUtama}  |  Aksen: ${b.warnaAksen}`,
    `- Maksimal ${maxLayer} layer tingkat atas. Bahasa teks: Indonesia`,
    "",
    "SARAN TEKNIS:",
    "- Kontras kuat antara background dan elemen utama; gerak halus akan ditambahkan aplikasi, jadi fokus pada komposisi dan hierarki.",
    "- Beri ruang kosong di tepi kanvas (sekitar 10%) supaya gerak/looping tidak memotong elemen penting.",
    "- Jangan taruh transform di root <svg>; transforms hanya di dalam layer.",
    "",
    "Sekarang tulis SVG-nya.",
  ].join("\n");
}

/** Prompt perbaikan SVG (self-heal) — dipakai saat validasi/parse gagal. */
export function buildSvgRepairPrompt(
  originalSvg: string,
  messages: string[],
  percobaan: number,
): string {
  return [
    `Karya SVG kamu DITOLAK validator (percobaan ${percobaan} dari 3). Perbaiki dengan tepat.`,
    "",
    "PESAN VALIDATOR:",
    ...messages.map((m, i) => `${i + 1}. ${m}`),
    "",
    "INGAT:",
    "- viewBox \"0 0 1920 1080\", xmlns svg, tanpa <style>/<script>/class, tanpa URL eksternal",
    "- setiap layer = anak langsung root dengan id unik, maksimal 60 layer tingkat atas",
    "- gradien hanya <defs> lokal via url(#id)",
    "",
    "SVG SEBELUMNYA (perbaiki bagian yang bermasalah, pertahankan yang sudah benar):",
    "```svg",
    originalSvg,
    "```",
    "",
    "Output ulang: SATU blok kode ```svg``` penuh, tanpa penjelasan.",
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
