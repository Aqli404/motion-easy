/**
 * Kuota ekspor harian untuk paket Gratis.
 *
 * - Pengguna gratis: 3 ekspor MP4 per hari (khusus 720p–1080p, tanggal lokal YYYY-MM-DD).
 *   2K ke atas butuh lisensi Premium.
 * - Pengguna Premium (Bulanan aktif / Lifetime): tanpa batas.
 *
 * Catatan jujur: kuota ini disimpan di localStorage dan memang bisa diakali
 * lewat DevTools. Fungsinya sebagai pembatas wajar untuk pengguna biasa,
 * bukan sistem anti-curang. Pengaman berbayar yang sebenarnya tetap
 * resolusi 2K/4K + fitur Bulk ZIP / Enlarge-MB.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "me.quota.v1";
export const FREE_DAILY_EXPORT_LIMIT = 3;
export const QUOTA_EVENT = "me-quota-changed";

interface QuotaData {
  date: string;
  count: number;
}

export interface KuotaInfo {
  unlimited: boolean;
  used: number;
  remaining: number;
  limit: number;
}

function hariIni(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function bacaMentah(): QuotaData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as QuotaData;
    if (!data || typeof data.date !== "string" || typeof data.count !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

/** Pemakaian hari ini (selalu mulai dari 0 saat tanggal berganti). */
export function getDailyExportUsage(): { used: number; remaining: number; limit: number } {
  const data = bacaMentah();
  const used = data && data.date === hariIni() ? Math.max(0, data.count) : 0;
  return {
    used,
    remaining: Math.max(0, FREE_DAILY_EXPORT_LIMIT - used),
    limit: FREE_DAILY_EXPORT_LIMIT,
  };
}

/** Catat satu ekspor sukses (hanya dipanggil untuk pengguna gratis). */
export function recordDailyExport(): void {
  try {
    const { used } = getDailyExportUsage();
    const data: QuotaData = { date: hariIni(), count: used + 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(QUOTA_EVENT));
  } catch {
    // localStorage penuh/diblokir — abaikan, jangan gagalkan ekspor
  }
}

/** Hook reaktif: ikut berubah saat ekspor tercatat atau lisensi berubah. */
export function useKuota(premium: boolean): KuotaInfo {
  const [info, setInfo] = useState<KuotaInfo>(() => ({
    unlimited: premium,
    ...getDailyExportUsage(),
  }));

  useEffect(() => {
    const sync = () =>
      setInfo({
        unlimited: premium,
        ...getDailyExportUsage(),
      });
    sync();
    window.addEventListener(QUOTA_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(QUOTA_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [premium]);

  return info;
}
