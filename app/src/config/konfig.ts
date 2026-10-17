/**
 * Konfigurasi global Motion Easy (Fase 5).
 *
 * ⚠️ SATU FILE INI yang perlu diganti sebelum rilis:
 *  1. Ganti isi PAYMENT_LINKS dengan link Lynk.id asli (dan nomor WhatsApp).
 *  2. PUBLIC_KEY_JWK sudah benar — jangan diubah kecuali regenerate kunci.
 */

/** Kunci publik ECDSA untuk verifikasi kode lisensi (aman untuk dibagikan). */
export const PUBLIC_KEY_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "eEdS81bpnrsXAbyX8a6S_NL07grPdN_0sRlhmyRDgKA",
  y: "Vf_QUjwycumYFrPsjKvm_oPq6PfA-Rx03DeEN4tTxmE",
  ext: true,
};

/** Link pembayaran — GANTI dengan milikmu (Lynk.id, gratis) sebelum rilis. */
export const PAYMENT_LINKS = {
  bulanan: "", // mis. "https://lynk.id/MUUSERNAME/xxxxx" — kosong = belum diset
  lifetime: "",
  /** nomor WhatsApp format internasional tanpa +, mis. "6281234567890" */
  whatsapp: "",
};

export const HARGA = {
  bulanan: 15_000,
  lifetime: 55_000,
} as const;

/** True bila link pembayaran belum diisi admin. */
export function linkPembayaranSiap(): boolean {
  return PAYMENT_LINKS.bulanan.length > 0 && PAYMENT_LINKS.lifetime.length > 0;
}
