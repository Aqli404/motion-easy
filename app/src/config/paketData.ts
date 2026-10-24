export type PaketId = "bulanan" | "lifetime";

export function hargaRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function linkWa(
  id: PaketId,
  waNumber: string,
  hargaLive?: { bulanan: number; lifetime: number },
): string {
  let hargaStr: string;
  if (hargaLive) hargaStr = id === "bulanan" ? hargaRp(hargaLive.bulanan) : hargaRp(hargaLive.lifetime);
  else hargaStr = id === "bulanan" ? "Bulanan" : "Lifetime";
  const nama = `${id === "bulanan" ? "Bulanan" : "Lifetime"} (${hargaStr})`;
  const pesan = `Halo, saya mau beli paket ${nama} Motion Easy. Mohon info rekening/QRIS pembayarannya.`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(pesan)}`;
}

export interface HargaPair { bulanan: number; lifetime: number }

/* ── definisi 3 paket — bangun dari harga live (fallback HARGA dikirim lewat hargaPair) ── */
export function buildPaket(h: HargaPair): Array<{
  nama: string; harga: string; periode: string; subjudul: string;
  isian: string[]; kurang?: string[]; warna: string; tombol: string;
  badge?: string; highlight?: boolean; microcopy?: string; id?: PaketId;
}> {
  const hemat = 12 * h.bulanan - h.lifetime;
  return [
    {
      nama: "Gratis Selamanya",
      harga: "Rp 0",
      periode: "tanpa batas waktu",
      subjudul: "Coba Motion Easy — hasil profesional dalam 1 klik",
      isian: [
        "Ekspor 1080p gratis (3 video/hari) — tanpa watermark",
        "Mode Kanvas Bebas + efek visual organik",
        "Simpan Cover PNG resolusi tinggi",
        "20 koleksi tema prompt instan",
        "100% proses lokal di komputer sendiri",
        "Tanpa watermark, tanpa registrasi",
      ],
      kurang: ["Tanpa 2K & 4K", "Tanpa Bulk ZIP & padding ≥100 MB", "Tanpa Enlarge-MB & update fitur baru", "Tanpa dukungan prioritas"],
      warna: "border-edge bg-panel-low",
      tombol: "border border-edge bg-panel text-ink-dim hover:text-ink hover:border-bright",
      microcopy: "Langsung pakai tanpa registrasi atau kartu kredit",
    },
    {
      nama: "Bulanan",
      harga: hargaRp(h.bulanan),
      periode: "per 30 hari akses",
      subjudul: "Solusi hemat untuk kebutuhan proyek jangka pendek",
      isian: ["Semua fitur di Paket Gratis", "Ekspor tanpa batas (unlimited)", "Buka ekspor 2K & 4K sampai 100 Mbps", "Bulk ZIP — render banyak karya, 1 file", "Enlarge-MB 10/25/50 MB (ISO resmi)", "Dukungan prioritas via WhatsApp"],
      kurang: ["4K 160–200 Mbps khusus Lifetime", "Tanpa akses seumur hidup"],
      warna: "border-edge bg-panel-low",
      tombol: "border border-edge bg-panel text-ink-dim hover:text-ink hover:border-bright",
      microcopy: `Hanya ${hargaRp(Math.round(h.bulanan / 30))}/hari untuk kualitas video tajam`,
      id: "bulanan",
    },
    {
      nama: "Lifetime Pass",
      harga: hargaRp(h.lifetime),
      periode: "sekali bayar seumur hidup",
      subjudul: `Bayar sekali, simpan selamanya — hemat ${hargaRp(hemat)} vs 12× bulanan`,
      isian: ["Semua fitur di Paket Bulanan", "4K 160–200 Mbps — file ≥100 MB, standar microstock", "Bulk ZIP 4K tanpa batas jumlah", "Akses permanen tanpa tagihan perpanjangan", "Kode lisensi offline, anti server down", "Termasuk semua update fitur mendatang", "BONUS: 20 template motion siap ekspor", "BONUS: Checklist 50 keyword lolos kurasi"],
      warna: "border-accent bg-panel-high shadow-xl shadow-primary/10 relative",
      tombol: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-deep font-bold shadow-md hover:scale-[1.01] transition-transform",
      badge: `Paling Hemat — Hemat ${hargaRp(hemat)}`,
      highlight: true,
      microcopy: "Sekali investasi, nikmati kebebasan produksi selamanya",
      id: "lifetime",
    },
  ];
}

/* backward compat: import PAKET lama masih jalan (fallback HARGA) */
import { HARGA as _HARGA } from "./konfig";
export const PAKET = buildPaket(_HARGA);

/* ── matriks perbandingan ───────────────────────────────────── */
export type NilaiMatriks = boolean | string;
export const MATRIKS: Array<{ fitur: string; gratis: NilaiMatriks; bulanan: NilaiMatriks; lifetime: NilaiMatriks }> = [
  { fitur: "Live preview 60 fps di browser", gratis: true, bulanan: true, lifetime: true },
  { fitur: "20 tema prompt + Kanvas Bebas", gratis: true, bulanan: true, lifetime: true },
  { fitur: "Cover PNG resolusi penuh", gratis: true, bulanan: true, lifetime: true },
  { fitur: "Tanpa watermark", gratis: true, bulanan: true, lifetime: true },
  { fitur: "Kuota ekspor MP4 harian", gratis: "3 video/hari", bulanan: "Tanpa batas", lifetime: "Tanpa batas" },
  { fitur: "Resolusi maksimal", gratis: "1080p", bulanan: "4K · 100 Mbps", lifetime: "4K · 160–200 Mbps" },
  { fitur: "Bulk ZIP (banyak karya → 1 file)", gratis: false, bulanan: true, lifetime: true },
  { fitur: "Enlarge-MB 10/25/50 MB (ISO resmi)", gratis: false, bulanan: true, lifetime: true },
  { fitur: "Update fitur baru", gratis: false, bulanan: "Selama aktif", lifetime: "Selamanya" },
  { fitur: "Dukungan WhatsApp", gratis: false, bulanan: true, lifetime: "Prioritas VIP" },
  { fitur: "Masa aktif", gratis: "Selamanya", bulanan: "30 hari", lifetime: "Selamanya" },
];

export const FAQS = [
  { q: "Bagaimana cara kerja lisensi offline?", a: "Setelah pembayaran, admin mengirim kode lisensi bertanda tangan kriptografi (ECDSA). Kode ini disimpan aman di browsermu dan diverifikasi secara lokal tanpa bergantung pada koneksi server database. Jadi aplikasimu tidak akan pernah terkunci meskipun server sedang offline." },
  { q: "Apakah video hasil ekspor bebas watermark?", a: "Ya. Semua video yang kamu ekspor—baik dari paket Gratis, Bulanan, maupun Lifetime—bersih 100% tanpa watermark, siap kamu gunakan untuk YouTube, TikTok, klien, atau dijual di platform microstock." },
  { q: "Mengapa disarankan menggunakan Chrome atau Edge desktop?", a: "Motion Easy memanfaatkan teknologi WebCodecs untuk merender video langsung menggunakan GPU perangkatmu tanpa mengirim data ke server. Saat ini teknologi rendering grafis berkecepatan tinggi ini didukung paling optimal di Google Chrome dan Microsoft Edge versi desktop." },
  { q: "Bagaimana kuota ekspor paket gratis bekerja?", a: "Paket gratis memberi 3 ekspor MP4 per hari (khusus 720p–1080p), reset otomatis tiap tengah malam waktu lokal perangkatmu. Kuota hanya terpotong bila ekspor benar-benar berhasil — ekspor yang gagal atau kamu batalkan tidak dihitung. Paket Bulanan dan Lifetime bebas ekspor tanpa batas (hingga 4K)." },
];
