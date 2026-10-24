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

/** [SEC-01] Anti jam-mundur: monotonic clock. Nilai = epoch ms terbesar yang pernah terlihat. */
const CLOCK_KEY = "me.license.clock.v1";
const CLOCK_KEY2 = "me.clock.v1"; // backup — hapus 1 key saja tidak cukup bypass
const TOLERANSI_JAM_MS = 5 * 60 * 1000; // 5 menit — toleransi geser jam / NTP drift

function emit() {
  window.dispatchEvent(new Event(LICENSE_EVENT));
}

function bacaLastSeen(): number {
  try {
    const vals: number[] = [];
    for (const k of [CLOCK_KEY, CLOCK_KEY2]) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isFinite(n)) vals.push(n);
    }
    return vals.length ? Math.max(...vals) : 0;
  } catch {
    return 0;
  }
}

function tulisLastSeen(now: number): void {
  try {
    const last = bacaLastSeen();
    if (now > last) {
      localStorage.setItem(CLOCK_KEY, String(now));
      localStorage.setItem(CLOCK_KEY2, String(now));
    }
  } catch {
    // storage penuh/diblokir — abaikan, jangan gagalkan verifikasi
  }
}

/** True bila jam OS terdeteksi mundur > toleransi dibanding lastSeen. */
export function isJamMundur(): boolean {
  try {
    const now = Date.now();
    const last = bacaLastSeen();
    return last > 0 && now < last - TOLERANSI_JAM_MS;
  } catch {
    return false;
  }
}

export function pesanJamMundur(): string {
  return "Jam perangkat terdeteksi mundur — sinkronkan waktu otomatis (Settings \u2192 Date & time \u2192 Automatic) lalu muat ulang halaman.";
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

  // [SEC-02] iat di masa depan = jam maju / belum sinkron
  if (payload.iat * 1000 > Date.now() + TOLERANSI_JAM_MS) {
    return { ok: false, error: "Jam perangkat belum sinkron — aktifkan waktu otomatis lalu coba lagi." };
  }
  // [SEC-01] jam mundur: hanya blokir bulanan (lifetime exp=null tidak diuntungkan dari mundur)
  if (payload.tier === "bulanan" && isJamMundur()) {
    return { ok: false, error: pesanJamMundur() };
  }
  if (payload.exp !== null && payload.exp * 1000 <= Date.now()) {
    return { ok: false, error: "Kode sudah kedaluwarsa. Perpanjang di menu Harga." };
  }
  // sukses → majukan monotonic clock
  tulisLastSeen(Date.now());
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
    if (!data?.payload?.tier || typeof data.code !== "string" || typeof data.payload.iat !== "number") return null;
    // [SEC-01] jam mundur → blokir hanya bulanan (lifetime tidak diuntungkan)
    if (data.payload.tier === "bulanan" && isJamMundur()) return null;
    if (data.payload.exp !== null && data.payload.exp * 1000 <= Date.now()) return null;
    if (data.payload.iat * 1000 > Date.now() + TOLERANSI_JAM_MS) return null;
    tulisLastSeen(Date.now());
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
export const MODE_DEV = !!(import.meta as any).env?.DEV;

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
  if (lic.payload.tier === "bulanan" && isJamMundur()) return false;
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

export interface IzinPresetResult {
  diizinkan: boolean;
  alasan?: string;
  badge: string;
}

type Tingkat = "gratis" | "bulanan" | "lifetime";

/**
 * Peta preset → tingkat minimum. Preset yang TIDAK terdaftar otomatis DITOLAK
 * (fail closed) — jadi preset baru default-nya terkunci, bukan gratis.
 *
 * Tangga: gratis (720/1080) → bulanan (2K + 4K ≤100 Mbps) → lifetime (4K 160/200 Mbps).
 * Bedakan bitrate sengaja: gratis sudah 1080p, tapi 4K master 160–200 Mbps
 * (≥100 MB/5 detik, standar microstock) tetap eksklusif Lifetime.
 */
const MIN_TINGKAT: Record<string, Tingkat> = {
  "720": "gratis",
  "1080": "gratis",
  "1440": "bulanan",
  "2160": "bulanan",
  "2160-100": "bulanan",
  "2160-160": "lifetime",
  "2160-200": "lifetime",
};

const URUTAN: Record<Tingkat, number> = { gratis: 0, bulanan: 1, lifetime: 2 };

export function izinPreset(presetId: string, lic: ActiveLicense | null, abaikanDev = false): IzinPresetResult {
  if (MODE_DEV && !abaikanDev) return { diizinkan: true, badge: "aktif ✓ (dev)" };

  const butuh = MIN_TINGKAT[presetId];
  if (!butuh) {
    return { diizinkan: false, badge: "tak dikenal", alasan: "Preset ekspor tidak dikenali." };
  }
  if (butuh === "gratis") return { diizinkan: true, badge: "gratis" };

  const milik: Tingkat = premiumAktif(lic) ? (lic!.payload.tier ?? "gratis") : "gratis";
  if (URUTAN[milik] >= URUTAN[butuh]) return { diizinkan: true, badge: "aktif ✓" };

  if (butuh === "lifetime") {
    if (milik === "bulanan") {
      return {
        diizinkan: false,
        badge: "khusus Lifetime",
        alasan: "Bitrate 4K 160–200 Mbps khusus paket Lifetime. Paket Bulanan mendukung 4K hingga 100 Mbps.",
      };
    }
    return {
      diizinkan: false,
      badge: "butuh Lifetime",
      alasan: "Butuh lisensi Lifetime untuk ekspor 4K 160–200 Mbps — aktivasi di menu Lisensi.",
    };
  }
  return {
    diizinkan: false,
    badge: "butuh lisensi",
    alasan: "Resolusi 2K/4K butuh lisensi Premium (Bulanan / Lifetime) — aktivasi di menu Lisensi.",
  };
}
