/**
 * export/zip.ts — penulis ZIP minimal tanpa dependensi (NODE:, jszip, dsb).
 *
 * Pakai metode STORE (tanpa kompresi): file yang mengisi arsip ini adalah
 * MP4 — datanya sudah terkompresi H.264, deflate tidak akan mengecilkannya
 * dan hanya memboroskan CPU. Hasilnya tetap ZIP resmi (PK) yang terbuka di
 * Windows Explorer, macOS, dan Linux apa adanya.
 *
 * Ini solusi "Bulk ZIP": semua hasil render batch dibungkus SATU file,
 * sekali unduh — bukan memancing download satu-per-satu yang bisa digagalkan
 * pengaturan browser.
 */

/** Tabel CRC32 standar (polinomial 0xEDB88320) dihitung sekali. */
const tabelCrc = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = tabelCrc[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Waktu DOS (bitfield tanggal+jam) dari tanggal sekarang. */
function waktuDos(d: Date): { waktu: number; tanggal: number } {
  const waktu = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const tanggal = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { waktu, tanggal };
}

export interface ArsipFile {
  /** Nama file DI DALAM arsip (pakai ASCII agar aman di semua OS). */
  nama: string;
  data: Uint8Array;
}

/**
 * Bungkus kumpulan file menjadi satu arsip .zip (metode STORE).
 * Semua tulisan manual pakai DataView — bilangan little-endian sesuai
 * spesifikasi PKWARE APPNOTE.
 */
export function buatZip(files: ArsipFile[]): Blob {
  const { waktu, tanggal } = waktuDos(new Date());

  // 1) Ukur dulu seluruh arsip supaya blob final disusun sekali jalan.
  const namaBytes = files.map((f) => new TextEncoder().encode(f.nama));
  const totalLokal = files.reduce(
    (n, f, i) => n + 30 + namaBytes[i].length + f.data.length,
    0,
  );
  const totalTengah = files.reduce((n, _f, i) => n + 46 + namaBytes[i].length, 0);
  const total = totalLokal + totalTengah + 22;

  const buf = new ArrayBuffer(total);
  const v = new DataView(buf);
  let p = 0;

  const offsetLokal: number[] = [];

  // 2) Local file header + data per entri
  //    Local header: 30 byte, lalu langsung nama, lalu data.
  files.forEach((f, i) => {
    offsetLokal.push(p);
    const crc = crc32(f.data);
    const ukuran = f.data.length;
    v.setUint32(p, 0x04034b50, true); // signature "PK\x03\x04"
    v.setUint16(p + 4, 20, true); // versi yang dibutuhkan
    v.setUint16(p + 6, 0, true); // flag
    v.setUint16(p + 8, 0, true); // metode: 0 = STORE
    v.setUint16(p + 10, waktu, true);
    v.setUint16(p + 12, tanggal, true);
    v.setUint32(p + 14, crc, true);
    v.setUint32(p + 18, ukuran, true); // compressed size
    v.setUint32(p + 22, ukuran, true); // uncompressed size
    v.setUint16(p + 26, namaBytes[i].length, true);
    v.setUint16(p + 28, 0, true); // extra len
    new Uint8Array(buf, p + 30, namaBytes[i].length).set(namaBytes[i]);
    p += 30 + namaBytes[i].length;
    new Uint8Array(buf, p, f.data.length).set(f.data);
    p += f.data.length;
  });

  // 3) Central directory.
  const offsetMulaiTengah = p;
  files.forEach((f, i) => {
    const crc = crc32(f.data);
    const ukuran = f.data.length;
    v.setUint32(p, 0x02014b50, true);
    v.setUint16(p + 4, 20, true); // versi pembuat
    v.setUint16(p + 6, 20, true); // versi dibutuhkan
    v.setUint16(p + 8, 0, true);
    v.setUint16(p + 10, 0, true); // STORE
    v.setUint16(p + 12, waktu, true);
    v.setUint16(p + 14, tanggal, true);
    v.setUint32(p + 16, crc, true);
    v.setUint32(p + 20, ukuran, true);
    v.setUint32(p + 24, ukuran, true);
    v.setUint16(p + 28, namaBytes[i].length, true);
    v.setUint16(p + 30, 0, true); // extra
    v.setUint16(p + 32, 0, true); // comment
    v.setUint16(p + 34, 0, true); // disk mulai
    v.setUint16(p + 36, 0, true); // internal attrs
    v.setUint32(p + 38, 0, true); // external attrs
    v.setUint32(p + 42, offsetLokal[i], true); // alamat local header entri ini
    p += 46;
    new Uint8Array(buf, p, namaBytes[i].length).set(namaBytes[i]);
    p += namaBytes[i].length;
  });

  // 4) End of central directory.
  v.setUint32(p, 0x06054b50, true);
  v.setUint16(p + 4, 0, true);
  v.setUint16(p + 6, 0, true);
  v.setUint16(p + 8, files.length, true);
  v.setUint16(p + 10, files.length, true);
  v.setUint32(p + 12, p - offsetMulaiTengah, true);
  v.setUint32(p + 16, offsetMulaiTengah, true);
  v.setUint16(p + 20, 0, true);
  p += 22;

  if (p !== total) {
    // penjaga ukuran: tidak diharapkan terjadi — deteksi dini di pengembangan
    if (import.meta.env.DEV) {
      throw new Error(`BUG ukuran zip: tertulis ${p} dari ${total}`);
    }
  }

  return new Blob([buf], { type: "application/zip" });
}
