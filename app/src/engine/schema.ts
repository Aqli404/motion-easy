/**
 * MotionDefinition — "kamus animasi" Motion Easy.
 *
 * Prinsip desain (Fase 1):
 * - Koordinat & ukuran pakai FRASI 0..1 relatif lebar/tinggi kanvas
 *   -> definisi yang sama bisa dirender di 720p/1080p/4K tanpa konversi.
 * - Waktu pakai DETIK -> AI tidak perlu tahu fps saat menulis gerakan.
 * - Gerakan pakai PRESET (in/out/loop) -> AI hampir tak mungkin salah;
 *   keyframe mentah belum ada di v1 (bisa ditambahkan di v2 tanpa merusak).
 * - Semua warna hex 6 digit. Murni data.
 *
 * v1.1 — tambahan "kanvas bebas" (kind "canvas"): AI boleh mengirim SATU
 * fungsi draw(ctx, time, w, h, fx) untuk efek organik (partikel, glow,
 * gelombang). Kontrak & aturan determinisme di engine/kanvas.ts. Layer
 * biasa (data) tetap jalan seperti semula; fitur ini pertambahan, bukan
 * pengganti.
 */

export const SCHEMA_VERSION = 1 as const;

/** Bilangan 0..1 yang menunjuk posisi relatif pada kanvas. */
export type Frac = number;
/** Warna hex 6 digit, mis. "#f97316". */
export type Color = string;

export const EASE_NAMES = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "easeOutBack",
  "easeOutBounce",
  "easeOutElastic",
] as const;
export type EaseName = (typeof EASE_NAMES)[number];

export const LAYER_KINDS = ["rect", "ellipse", "triangle", "text", "line", "image", "canvas"] as const;
export type LayerKind = (typeof LAYER_KINDS)[number];

export const IN_OUT_TYPES = [
  "none",
  "fadeIn",
  "fadeOut",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "pop",
] as const;
export type InOutType = (typeof IN_OUT_TYPES)[number];

export const LOOP_TYPES = ["none", "float", "pulse", "spin", "sway"] as const;
export type LoopType = (typeof LOOP_TYPES)[number];

/** Gerakan masuk layer. Mulai pada `time.from + at` detik. */
export interface EntranceMotion {
  type?: InOutType; // default "fadeIn"
  at?: number; // offset mulai (detik) dari time.from; default 0
  dur?: number; // durasi gerakan (detik); default 0.6
  easing?: EaseName; // default "easeOut"
}

/** Gerakan keluar layer. Berakhir tepat pada `time.to - before` detik. */
export interface ExitMotion {
  type?: InOutType;
  before?: number; // extra jeda sebelum end (detik); default 0
  dur?: number; // default 0.6
  easing?: EaseName; // default "easeIn"
}

/** Gerakan berulang selama layer tampil. */
export interface LoopMotion {
  type?: LoopType; // default "none"
  dur?: number; // panjang satu siklus (detik); default 2
  amount?: Frac; // besar gerakan sebagai.fraksi tinggi kanvas; default 0.05
  phase?: number; // 0..1 — posisi awal siklus (untuk stagger)
}

export interface MotionSpec {
  in?: EntranceMotion;
  out?: ExitMotion;
  loop?: LoopMotion;
}

export interface StyleSpec {
  color?: Color; // flat fill
  opacity?: number; // 0..1; default 1
  stroke?: Color; // hex border (opsional)
  strokeWidth?: number; // fraksi tinggi kanvas; default 0
  radius?: number; // fraksi tinggi kanvas; sudut membulat rect; default 0
  rotation?: number; // derajat awal; default 0
}

/** Spesifikasi teks untuk kind === "text". */
export interface TextSpec {
  content: string;
  size: Frac; // fraksi dari tinggi kanvas; 0.05 = judul besar di 1080p
  weight?: 400 | 500 | 600 | 700 | 800 | 900; // default 700
  align?: "left" | "center" | "right"; // default "center"
  font?: "sans" | "mono"; // default "sans"
  lineHeight?: number; // 1.0..2.0; default 1.2
}

/** Spesifikasi garis untuk kind === "line": dari (geometry.x,y) ke line.to. */
export interface LineSpec {
  to: { x: Frac; y: Frac };
}

/**
 * Spesifikasi "kanvas bebas" untuk kind === "canvas" (v1.1, tambahan atas v1).
 * `source` = string berisi SATU function expression:
 *   function draw(ctx, time, w, h, fx) { ... }
 * Diimplementasikan di engine/kanvas.ts (compile + runtime + helper fx).
 */
export interface CanvasSpec {
  source: string;
}

/** Satu layer (objek) di scene. Urutan array = urutan tumpukan (akhir = paling atas). */
export interface LayerSpec {
  id: string; // unik 1 definition
  name?: string; // buat layer panel (opsional)
  kind: LayerKind;
  tag?: string; // tanda bebas: "background" | "title" | "card" | ...
  time: { from: number; to: number }; // detik
  /** geometry.x/y = titik pusat; w/h = ukuran bbox (fraksi). */
  geometry: { x: Frac; y: Frac; w?: Frac; h?: Frac };
  style?: StyleSpec;
  text?: TextSpec; // wajib untuk kind "text"
  line?: LineSpec; // wajib untuk kind "line"
  kanvas?: CanvasSpec; // wajib untuk kind "canvas"
  asset?: string; // SVG lokal tersanitasi sebagai data URL untuk kind "image"
  assetAwal?: string; // asset asli sebelum recolor — untuk tombol "warna asli"
  motion?: MotionSpec;
}

export interface MotionDefinition {
  version: 1;
  name: string;
  notes?: string; // catatan penulis (human/AI), tidak dirender
  canvas: {
    w: number; // px, bilangan bulat (mis. 1920)
    h: number; // px
    fps: 24 | 30 | 60;
    durationSec: number; // > 0
    background: Color | null; // null = transparan
  };
  layers: LayerSpec[]; // <= 80 layer seluruh durasi
}
