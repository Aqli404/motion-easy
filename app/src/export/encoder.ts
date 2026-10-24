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
import { synthesizeOfflineAudio } from "../engine/audio";

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
  /** true = encoder dikunci CBR (ukuran file ≈ bitrate × durasi) */
  cbr?: boolean;
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
 *
 * Prioritas: CBR (bitrateMode 'constant' + latencyMode 'quality') supaya
 * ukuran file benar-benar mengejar bitrate target — nyata untuk standar
 * microstock (file besar, kualitas bersih). Bila mesin menolak CBR atau
 * bitrate tinggi, langkah jatuh ke mode variable/variable tanpa kunci,
 * dan sisa ukuran ditutup padding di ExportModal.
 */
export async function pilihKonfigurasiEncoder(
  width: number,
  height: number,
  fps: number,
  targetBitrate: number,
): Promise<KonfigurasiEncoder> {
  const cbrExtra = { bitrateMode: "constant" as const, latencyMode: "quality" as const };
  for (const cbr of [true, false]) {
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
              ...(cbr ? cbrExtra : {}),
              ...softnya,
            });
            if (support.supported) {
              return { codec, bitrate, ...(cbr ? cbrExtra : {}), ...softnya, cbr };
            }
          } catch {
            // lanjut ke kandidat berikutnya
          }
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
  sfxAktif: boolean = true,
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

  // Sintesis audio offline jika toggle SFX aktif
  let audioBuffer: AudioBuffer | null = null;
  const audioSampleRate = 44100;
  const hasAudioEncoder = typeof AudioEncoder !== "undefined";
  const encodeAudio = sfxAktif && hasAudioEncoder;

  if (encodeAudio) {
    try {
      audioBuffer = await synthesizeOfflineAudio(def);
    } catch (e) {
      console.warn("Gagal sintesis audio:", e);
    }
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    ...(audioBuffer
      ? {
          audio: {
            codec: "aac",
            numberOfChannels: 2,
            sampleRate: audioSampleRate,
          },
        }
      : {}),
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
    ...(konfig.cbr ? { bitrateMode: "constant" as const, latencyMode: "quality" as const } : {}),
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

    // Encode trek audio AAC jika tersedia
    if (audioBuffer && hasAudioEncoder) {
      try {
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            try {
              muxer.addAudioChunk(chunk, meta);
            } catch (err) {
              console.warn("Gagal menambahkan audio chunk:", err);
            }
          },
          error: (err) => console.warn("AudioEncoder error:", err),
        });

        audioEncoder.configure({
          codec: "mp4a.40.2",
          sampleRate: audioSampleRate,
          numberOfChannels: 2,
          bitrate: 128_000,
        });

        const totalAudioSamples = audioBuffer.length;
        const chunkSize = 1024;
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        for (let offset = 0; offset < totalAudioSamples; offset += chunkSize) {
          const currentChunk = Math.min(chunkSize, totalAudioSamples - offset);
          const planarData = new Float32Array(currentChunk * 2);
          planarData.set(leftChannel.subarray(offset, offset + currentChunk), 0);
          planarData.set(rightChannel.subarray(offset, offset + currentChunk), currentChunk);

          const timestampUs = Math.round((offset / audioSampleRate) * 1_000_000);
          const audioData = new AudioData({
            format: "f32-planar",
            sampleRate: audioSampleRate,
            numberOfFrames: currentChunk,
            numberOfChannels: 2,
            timestamp: timestampUs,
            data: planarData,
          });

          audioEncoder.encode(audioData);
          audioData.close();
        }

        await audioEncoder.flush();
        audioEncoder.close();
      } catch (err) {
        console.warn("Proses encode audio dilewati:", err);
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

/** Unduh blob dengan nama file yang rapi — tahan URL 120 dtk untuk file besar (105–200 MB). */
export function unduhBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 120 dtk: file 200 MB butuh waktu flush ke disk; revoke terlalu cepat = download terpotong
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return url;
}

/** Coba simpan via File System Access API (dialog simpan asli). Gagal → fallback ke unduhBlob. */
export async function simpanBlobPremium(blob: Blob, filename: string): Promise<{ ok: boolean; dibatalkan?: boolean }> {
  const picker = (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker;
  if (picker && window.isSecureContext) {
    try {
      const ext = filename.split(".").pop() || "mp4";
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: "Video", accept: { "video/mp4": [`.${ext}`] } }],
      });
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return { ok: true };
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name;
      if (name === "AbortError") return { ok: false, dibatalkan: true };
      // NotAllowedError (gesture habis) atau lainnya → fallback anchor
    }
  }
  unduhBlob(blob, filename);
  return { ok: true };
}
