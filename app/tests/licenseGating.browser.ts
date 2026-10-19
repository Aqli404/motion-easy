import { izinPreset, type ActiveLicense } from "../src/license/license";

/**
 * Pengujian Gating Resolusi (Potongan 1):
 * - 720 & 1080: gratis untuk semua (null, expired, bulanan, lifetime)
 * - 1440 (2K): terkunci untuk gratis/expired; terbuka untuk bulanan & lifetime
 * - 2160 (4K): terkunci untuk gratis/expired/bulanan; terbuka hanya untuk lifetime
 */
export async function testLicenseGating() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => {
    if (!ok) throw new Error(`Assertion failed: ${name}`);
    results.push(name);
  };

  const nowSec = Math.floor(Date.now() / 1000);

  const licBulananAktif: ActiveLicense = {
    code: "dummy.bulanan",
    payload: { v: 1, tier: "bulanan", exp: nowSec + 86400 * 30, iat: nowSec },
    storedAt: Date.now(),
  };

  const licBulananKedaluwarsa: ActiveLicense = {
    code: "dummy.bulanan.exp",
    payload: { v: 1, tier: "bulanan", exp: nowSec - 3600, iat: nowSec - 86400 * 31 },
    storedAt: Date.now(),
  };

  const licLifetime: ActiveLicense = {
    code: "dummy.lifetime",
    payload: { v: 1, tier: "lifetime", exp: null, iat: nowSec },
    storedAt: Date.now(),
  };

  // 1. Tanpa Lisensi (Gratis)
  assert("Gratis: 720p diizinkan", izinPreset("720", null, true).diizinkan === true);
  assert("Gratis: 1080p diizinkan", izinPreset("1080", null, true).diizinkan === true);
  assert("Gratis: 1440p (2K) ditolak", izinPreset("1440", null, true).diizinkan === false);
  assert("Gratis: 2160p (4K) ditolak", izinPreset("2160", null, true).diizinkan === false);
  assert("Gratis: badge 1440p adalah 'butuh lisensi'", izinPreset("1440", null, true).badge === "butuh lisensi");
  assert("Gratis: badge 2160p adalah 'butuh Lifetime'", izinPreset("2160", null, true).badge === "butuh Lifetime");

  // 2. Lisensi Kedaluwarsa
  assert("Expired: 720p diizinkan", izinPreset("720", licBulananKedaluwarsa, true).diizinkan === true);
  assert("Expired: 1080p diizinkan", izinPreset("1080", licBulananKedaluwarsa, true).diizinkan === true);
  assert("Expired: 1440p (2K) ditolak", izinPreset("1440", licBulananKedaluwarsa, true).diizinkan === false);
  assert("Expired: 2160p (4K) ditolak", izinPreset("2160", licBulananKedaluwarsa, true).diizinkan === false);

  // 3. Paket Bulanan Aktif
  assert("Bulanan: 720p diizinkan", izinPreset("720", licBulananAktif, true).diizinkan === true);
  assert("Bulanan: 1080p diizinkan", izinPreset("1080", licBulananAktif, true).diizinkan === true);
  assert("Bulanan: 1440p (2K) diizinkan", izinPreset("1440", licBulananAktif, true).diizinkan === true);
  assert("Bulanan: 2160p (4K) DITOLAK tegas", izinPreset("2160", licBulananAktif, true).diizinkan === false);
  assert("Bulanan: badge 2160p 'khusus Lifetime'", izinPreset("2160", licBulananAktif, true).badge === "khusus Lifetime");

  // 4. Paket Lifetime
  assert("Lifetime: 720p diizinkan", izinPreset("720", licLifetime, true).diizinkan === true);
  assert("Lifetime: 1080p diizinkan", izinPreset("1080", licLifetime, true).diizinkan === true);
  assert("Lifetime: 1440p (2K) diizinkan", izinPreset("1440", licLifetime, true).diizinkan === true);
  assert("Lifetime: 2160p (4K) diizinkan", izinPreset("2160", licLifetime, true).diizinkan === true);
  assert("Lifetime: badge 2160p 'aktif ✓'", izinPreset("2160", licLifetime, true).badge === "aktif ✓");

  return { passed: results.length, results };
}
