/**
 * Konfigurasi global Motion Easy.
 *
 * Saat ini pembayaran dilayani via WhatsApp (QRIS / e-wallet / transfer).
 * Link Lynk.id boleh diisi nanti — begitu terisi, tombol Harga otomatis
 * berubah jadi "Bayar Sekarang".
 */

/** Kunci publik ECDSA untuk verifikasi kode lisensi (aman untuk dibagikan). */
export const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "eEdS81bpnrsXAbyX8a6S_NL07grPdN_0sRlhmyRDgKA",
  y: "Vf_QUjwycumYFrPsjKvm_oPq6PfA-Rx03DeEN4tTxmE",
  ext: true,
};

/** Link pembayaran — opsional. Kosong = tombol memakai jalur WhatsApp. */
export const PAYMENT_LINKS = {
  bulanan: "", // mis. "https://lynk.id/USERNAME/bulanan-rp15000"
  lifetime: "", // mis. "https://lynk.id/USERNAME/lifetime-rp55000"
  /** nomor WhatsApp format internasional tanpa +, mis. "6281234567890" */
  whatsapp: "6285792945213",
};

export const HARGA = {
  bulanan: 15_000,
  lifetime: 55_000,
} as const;

/** True bila kedua link pembayaran terisi (mode Lynk.id penuh). */
export function linkPembayaranSiap(): boolean {
  return PAYMENT_LINKS.bulanan.length > 0 && PAYMENT_LINKS.lifetime.length > 0;
}

/** True bila link pembayaran untuk satu paket terisi. */
export function linkPaketTerisi(id: "bulanan" | "lifetime"): boolean {
  return PAYMENT_LINKS[id].length > 0;
}

/** True bila nomor WhatsApp terisi (jalur pembayaran manual aktif). */
export function waSiap(): boolean {
  return PAYMENT_LINKS.whatsapp.length > 0;
}
