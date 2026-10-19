/**
 * Fase 4 — Encoder video (WebCodecs + mp4-muxer).
 * Render & encode 100% di browser user: requestAnimationFrame tidak dipakai,
 * tiap frame digambar ke canvas offscreen lalu dikirim ke VideoEncoder (GPU).
 * Server: tidak ada. Biaya: Rp 0.
 */

import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { renderFrame } from "../engine/renderer";
import type { MotionDefinition } from "../engine/schema";
import { EXPORT_PRESETS, resolveExportSize } from "./presets";
import type { ExportPreset, ExportSize } from "./presets";
import { prepareImageAssets } from "../engine/svg";

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

export interface KonfigurasiEncoder {
  codec: string;
  bitrate: number;
  hardwareAcceleration?: "prefer-software";
}

/**
 * Level AVC dipilih sesuai resolusi & fps — byte terakhir codec string
 * adalah level dalam hex. Batas makroblock/detik dari spesifikasi AVC:
 * 1f=3.1 · 28=4.0 · 29=4.1 · 2a=4.2 · 32=5.0 · 33=5.1 · 34=5.2
 * Tanpa ini, 2K/4K ditolak encoder karena level-nya kurang tinggi.
 */
const LEVEL_MBS: Array<[string, number]> = [
  ["1f", 108_000],
  ["28", 245_760],
  ["29", 245_760],
  ["2a", 522_240],
  ["32", 589_824],
  ["33", 983_040],
  ["34", 2_073_600],
];

/**
 * Profil AVC + constraint byte (2 digit profil + 2 digit constraint):
 * HIGH=6400 · MAIN=4d00 · BASELINE=4200.
 * ⚠️ Format codec H.264 = avc1.{profil2}{constraint2}{level2} — total 6 digit
 * hex. Tanpa "00", stringnya 4 digit (mis. "avc1.6428") dan browser menolak
 * SEMUANYA — termasuk 720p/1080p yang sebenarnya didukung.
 */
const PROFIL = ["6400", "4d00", "4200"];

/** Pola sah codec AVC: avc1. + 6 digit hex. Penjaga terhadap salah ketik. */
const POLA_AVC = /^avc1\.[0-9a-f]{6}$/;

/**
 * Kandidat codec: dimulai dari level TERKECIL yang cukup untuk resolusi+fps
 * ini (paling kompatibel), lalu naik sebagai cadangan. Tiap level diberi
 * 3 profil (High/Main/Baseline).
 */
function kandidatCodec(w: number, h: number, fps: number): string[] {
  const mbPerFrame = Math.ceil(w / 16) * Math.ceil(h / 16);
  const butuh = mbPerFrame * fps;
  let awal = LEVEL_MBS.findIndex(([, maks]) => maks >= butuh);
  if (awal < 0) awal = LEVEL_MBS.length - 1; // di atas tabel → level tertinggi
  const hasil = PROFIL.flatMap((p) => LEVEL_MBS.slice(awal).map(([lv]) => `avc1.${p}${lv}`));
  // jaring pengaman: bila ada string cacat, lempar saat pengembangan (bukan diam-diam)
  if (import.meta.env.DEV && hasil.some((c) => !POLA_AVC.test(c))) {
    throw new Error(`BUG: codec string tidak sah: ${hasil.filter((c) => !POLA_AVC.test(c)).join(", ")}`);
  }
  return hasil;
}

/** Bitrate turun bertahap bila encoder menolak bitrate tinggi. */
const LANGKAH_BITRATE = [1, 0.6, 0.35, 0.2];

export function pesanEncoderTidakAda(): string {
  return "Komputer/browser ini tidak sanggup meng-encode H.264 pada resolusi ini. Coba preset yang lebih kecil (1080p/720p), atau buka di Chrome/Edge desktop.";
}

/**
 * Cari kombinasi codec + bitrate + akselerasi yang BENAR-BENAR didukung
 * mesin (terverifikasi lewat isConfigSupported), dari kualitas tertinggi
 * ke paling hemat. Kombinasi terpilih langsung dipakai saat configure —
 * jadi tidak ada celah "tervalidasi tapi gagal saat eksekusi".
 */
export async function pilihKonfigurasiEncoder(
  width: number,
  height: number,
  fps: number,
  targetBitrate: number,
): Promise<KonfigurasiEncoder> {
  for (const soft of [false, true]) {
    for (const codec of kandidatCodec(width, height, fps)) {
      for (const faktor of LANGKAH_BITRATE) {
        const bitrate = Math.max(500_000, Math.round((targetBitrate * faktor) / 1000) * 1000);
        const softnya = soft ? ({ hardwareAcceleration: "prefer-software" } as const) : {};
        try {
          const support = await VideoEncoder.isConfigSupported({
            codec,
            width,
            height,
            bitrate,
            framerate: fps,
            ...softnya,
          });
          if (support.supported) {
            return { codec, bitrate, ...softnya };
          }
        } catch {
          // lanjut ke kandidat berikutnya
        }
      }
    }
  }
  throw new Error(pesanEncoderTidakAda());
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
  await prepareImageAssets(def);
  // negosiasi otomatis: codec yang pas + bitrate yang bisa ditanggung mesin
  const konfig = await pilihKonfigurasiEncoder(width, height, fps, preset.bitrate);

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
    codec: konfig.codec,
    width,
    height,
    bitrate: konfig.bitrate,
    framerate: fps,
    ...(konfig.hardwareAcceleration
      ? { hardwareAcceleration: konfig.hardwareAcceleration }
      : {}),
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

/**
 * Cek cepat (tanpa render): preset mana saja yang sanggup di-encode mesin ini.
 * Dipakai Modal Ekspor untuk menandai preset yang tidak didukung SEBELUM
 * pengguna menekan tombol — tidak ada lagi error mengejutkan.
 */
export async function probeDukunganPreset(
  def: MotionDefinition,
): Promise<Record<string, boolean>> {
  if (!webCodecsSupported()) return {};
  const hasil: Record<string, boolean> = {};
  for (const preset of EXPORT_PRESETS) {
    const { width, height } = resolveExportSize(def, preset);
    try {
      await pilihKonfigurasiEncoder(width, height, def.canvas.fps, preset.bitrate);
      hasil[preset.id] = true;
    } catch {
      hasil[preset.id] = false;
    }
  }
  // Anti-lockdown: kalau SEMUA preset dikatakan tidak didukung, kemungkinan
  // besar itu salah di logika kita (bukan mesin yang lemah) — anggap tidak
  // meyakinkan dan jangan matikan apa pun. Biarkan percobaan ekspor yang
  // melaporkan pesan sebenarnya.
  if (Object.values(hasil).every((ok) => !ok)) return {};
  return hasil;
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
