/**
 * Fase 5 — Lisensi offline (ECDSA via WebCrypto).
 *
 * Kode lisensi = BASE64URL(payloadJSON) + "." + BASE64URL(signature ECDSA P-256)
 * Diverifikasi memakai kunci PUBLIK (src/config/konfig.ts) — tidak butuh server.
 * Kunci privat hanya untuk menandai kode (tools/lisensi.mjs), jauh dari app.
 */

import { PUBLIC_KEY_JWK } from "../config/konfig";

export type Tier = "bulanan" | "lifetime";

export interface LicensePayload {
  v: 1;
  tier: Tier;
  iat: number; // epoch detik saat diterbitkan
  exp: number | null; // epoch detik kedaluwarsa (null = lifetime)
  note: string;
}

export interface ActiveLicense {
  code: string;
  payload: LicensePayload;
}

const STORE_KEY = "me.license.v1";
export const LICENSE_EVENT = "me-license-changed";

function emit() {
  window.dispatchEvent(new Event(LICENSE_EVENT));
}

function b64uToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? s : s + "=".repeat(4 - (s.length % 4));
  const bin = atob(pad.replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface VerifyResult {
  ok: boolean;
  payload?: LicensePayload;
  code?: string;
  error?: string;
}

/** Verifikasi kode (tahan spasi, baris baru, pemenggalan berapa pun). */
export async function verifikasiKode(raw: string): Promise<VerifyResult> {
  const code = raw.replace(/\s+/g, "");
  if (!subtleAda()) {
    return { ok: false, error: "Halaman harus dibuka via http(s):// — bukan file:// — agar kriptografi jalan." };
  }
  const parts = code.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "Format kode salah. Harusnya dua bagian dipisah tanda titik (.)." };
  }
  let payload: LicensePayload;
  try {
    const bytes = b64uToBytes(parts[0]);
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: "Bagian payload tidak terbaca. Kode kemungkinan terpotong saat dikirim." };
  }
  if (payload?.v !== 1 || (payload.tier !== "bulanan" && payload.tier !== "lifetime")) {
    return { ok: false, error: "Payload tidak dikenal — pastikan kode dari Motion Easy asli." };
  }

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      PUBLIC_KEY_JWK as never,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    const sigBytes = b64uToBytes(parts[1]);
    const payloadBytes = b64uToBytes(parts[0]);
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sigBytes,
      payloadBytes
    );
    if (!ok) return { ok: false, error: "Tanda tangan tidak sah — kode palsu atau rusak." };
  } catch {
    return { ok: false, error: "Gagal memverifikasi tanda tangan di perangkat ini." };
  }

  if (payload.exp !== null && payload.exp * 1000 <= Date.now()) {
    return { ok: false, error: "Kode sudah kedaluwarsa. Perpanjang di menu Harga." };
  }
  return { ok: true, payload, code };
}

function subtleAda(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

// ===== simpan / muat =====

export function simpanLisensi(code: string, payload: LicensePayload) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ code, payload }));
  emit();
}

export function hapusLisensi() {
  localStorage.removeItem(STORE_KEY);
  emit();
}

export function muatLisensi(): ActiveLicense | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ActiveLicense;
    // bentuk yang wajar saja (perbaikan uji publik: jangan percaya bentuk aneh)
    if (!data?.payload?.tier || typeof data.code !== "string" || typeof data.payload.iat !== "number") {
      return null;
    }
    if (data.payload.exp !== null && data.payload.exp * 1000 <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Pembuka khusus mode pengembangan (hanya saat `npm run dev` di localhost).
 * ⚠️ Keamanan: pada build produksi Vite mengganti `import.meta.env.DEV` menjadi
 * `false` lalu menghapus cabang ini dari bundle — jadi TIDAK ada pembuka gratis
 * di situs online.
 */
export const MODE_DEV = !!import.meta.env.DEV;

/** Premium yang efektif dipakai UI: lisensi sah ATAU mode pengembangan lokal. */
export function premiumEfektif(lic: ActiveLicense | null): boolean {
  return premiumAktif(lic) || MODE_DEV;
}

/**
 * Verifikasi ulang tanda tangan lisensi yang tersimpan (anti-tamper F12).
 * Bila tanda tangannya tidak sah, kedaluwarsa, atau bentuknya diutak-atik,
 * lisensi DIHAPUS. Ini menutup celah "localStorage dipercaya mentah-mentah".
 */
export async function validasiUlangTersimpan(): Promise<boolean> {
  const lic = muatLisensi();
  if (!lic) return false;
  // konteks tidak aman (bukan https/localhost)? jangan hapus — hanya lewati
  if (!subtleAda()) return true;
  const hasil = await verifikasiKode(lic.code);
  const payload = hasil.ok ? hasil.payload : undefined;
  const cocok =
    !!payload &&
    payload.v === lic.payload.v &&
    payload.tier === lic.payload.tier &&
    payload.exp === lic.payload.exp;
  if (!cocok) {
    hapusLisensi();
    return false;
  }
  return true;
}

/** Premium aktif? (bulanan belum kedaluwarsa ATAU lifetime) */
export function premiumAktif(lic: ActiveLicense | null): boolean {
  if (!lic) return false;
  if (lic.payload.tier === "lifetime") return true;
  return lic.payload.exp === null || lic.payload.exp * 1000 > Date.now();
}

/** Label ramah tier. */
export function labelTier(t: Tier): string {
  return t === "lifetime" ? "Lifetime" : "Bulanan";
}

/** Format kedaluwarsa (id-ID). */
export function expiryLabel(payload: LicensePayload): string {
  if (payload.exp === null) return "selamanya";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(payload.exp * 1000));
}
