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
  { label: "10 MB (Standar Agensi)", mb: 10 },
  { label: "25 MB (Mikrostok Umum)", mb: 25 },
  { label: "50 MB (Master HD)", mb: 50 },
] as const;

/**
 * Tambahkan kotak 'free' di ujung buffer MP4 supaya ukurannya pas
 * dengan target MB yang diinginkan pengguna.
 */
export function padMp4Blob(originalBlob: Blob, targetMb: number): Promise<Blob> {
  if (targetMb <= 0) return Promise.resolve(originalBlob);
  const targetBytes = targetMb * 1_000_000;

  return originalBlob.arrayBuffer().then((origBuf) => {
    const curSize = origBuf.byteLength;
    if (curSize >= targetBytes) return originalBlob; // sudah lebih besar dari target

    const needed = targetBytes - curSize;
    // Ukuran minimal kotak MP4 adalah 8 byte (4 byte ukuran + 4 byte 'free').
    // Kalau selisih kurang dari 8, sesuaikan pas 8 byte.
    const padLen = Math.max(8, needed);

    const padBuf = new ArrayBuffer(padLen);
    const v = new DataView(padBuf);
    v.setUint32(0, padLen, true); // ukuran kotak (big-endian di spec, tapi mp4-muxer kita pakai little? Ah MP4 wajib BIG-ENDIAN untuk kotak teratas!)
    // PERHATIAN: Spesifikasi MP4 (ISO/IEC 14496-12) mewajibkan SEMUA ukuran box
    // menggunakan BIG-ENDIAN (network byte order).
    v.setUint32(0, padLen, false); // big-endian!
    // Tipe box: 'free' (0x66726565) atau 'skip' (0x736b6970)
    v.setUint32(4, 0x66726565, false); // 'free'
    // Sisa byte dibiarkan bernilai 0 (null padding)

    const finalBuf = new ArrayBuffer(curSize + padLen);
    const finalView = new Uint8Array(finalBuf);
    finalView.set(new Uint8Array(origBuf), 0);
    finalView.set(new Uint8Array(padBuf), curSize);

    return new Blob([finalBuf], { type: "application/mp4" });
  });
}
