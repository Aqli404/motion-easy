/**
 * export/pad.ts — padding payload MP4 yang sah (ISO/IEC 14496-12).
 *
 * Mengatasi masalah microstock/agensi yang menolak video berukuran < 10 MB
 * karena mengira file korup atau undershoot bitrate.
 *
 * Cara kerja (Standar Resmi MP4):
 * - MP4 tersusun atas kotak-kotak (boxes/atoms) berawalan 4-byte ukuran + 4-byte tipe.
 * - Kotak bertipe "free" atau "skip" diabaikan sepenuhnya oleh pemutar video
 *   (VLC, Premiere, browser, Instagram, YouTube), tetapi dihitung penuh
 *   sebagai ukuran file di sistem operasi & server kurasi agensi.
 * - 100% aman, tidak merusak stream H.264 atau durasi sama sekali.
 */

export const TARGET_MB_OPTIONS = [
  { label: "Normal (Tanpa Padding)", mb: 0 },
  { label: "10 MB", mb: 10 },
  { label: "20 MB", mb: 20 },
  { label: "25 MB (Adobe Stock / Shutterstock)", mb: 25 },
  { label: "50 MB (Master HD)", mb: 50 },
  { label: "75 MB", mb: 75 },
  { label: "100 MB (High Bitrate 4K)", mb: 100 },
  { label: "105 MB (garansi di atas 100)", mb: 105 },
  { label: "150 MB", mb: 150 },
  { label: "200 MB (Master 4K Heavyweight)", mb: 200 },
] as const;

/**
 * Tambahkan kotak 'free' di ujung file supaya ukurannya pas dengan target MB
 * yang diinginkan pengguna. Berlaku untuk MP4 dan QuickTime MOV — keduanya
 * berbasis box ISO-BMFF/ftyp QuickTime yang mengakui atom 'free'.
 * WebM/Alpha BUKAN struktur box → tidak boleh dipad (dijaga di pemanggil).
 */
/** Target overall bitrate 84 Mbps — terbukti lolos Adobe (105 MB / 10 detik). */
export const OVERALL_BITRATE_84_MBPS = 84_000_000;

/** Hitung target MB supaya overall bitrate ≈ 84 Mbps; lantai 105 MB. */
export function targetMicrostockUntukDurasi(durasiSec: number): number {
  const dariBitrate = Math.ceil(((OVERALL_BITRATE_84_MBPS * Math.max(1, durasiSec)) / 8) / 1_048_576);
  // 10s → 105 MB terbukti; klip lebih pendek tetap 105 sebagai lantai aman
  return Math.max(105, dariBitrate);
}

export function padMp4Blob(originalBlob: Blob, targetMb: number): Promise<Blob> {
  if (targetMb <= 0) return Promise.resolve(originalBlob);
  if (!Number.isFinite(targetMb) || targetMb < 0 || targetMb > 2000) {
    return Promise.reject(new Error("Target ukuran harus antara 0 dan 2000 MB."));
  }
  // Target dihitung basis MiB (1 048 576) supaya file ≥ target baik di
  // Windows Explorer (MB desimal) maupun Finder macOS (MiB biner).
  // 105 MB → 105 MiB = 110 100 480 byte → tampil ≥105 di Finder & ≥110 di Explorer.
  // Margin 0,5% menghindari pembulatan viewer ke bawah.
  const targetBytes = Math.ceil(targetMb * 1_048_576 * 1.005);
  if (originalBlob.size >= targetBytes) return Promise.resolve(originalBlob);

  // Free box uses a 32-bit size field; limit keeps it representable and avoids
  // allocating a second full-sized copy of the already-rendered movie.
  const padLen = Math.max(8, Math.ceil(targetBytes - originalBlob.size));
  if (padLen > 0xffffffff) return Promise.reject(new Error("Padding terlalu besar untuk format ISO-BMFF."));
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  view.setUint32(0, padLen, false);
  view.setUint32(4, 0x66726565, false); // 'free'
  const parts: BlobPart[] = [originalBlob, header];
  // Keep peak allocation bounded even for large custom targets.
  const zeroChunkSize = 8 * 1024 * 1024;
  let remaining = padLen - 8;
  while (remaining > 0) {
    const size = Math.min(remaining, zeroChunkSize);
    parts.push(new Uint8Array(size));
    remaining -= size;
  }
  return Promise.resolve(new Blob(parts, { type: originalBlob.type || "video/mp4" }));
}
