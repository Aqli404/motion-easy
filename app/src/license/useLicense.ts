import { useEffect, useState } from "react";
import {
  muatLisensi,
  validasiUlangTersimpan,
  LICENSE_EVENT,
  type ActiveLicense,
} from "./license";

/**
 * Subscribe status lisensi dari localStorage, sinkron antar halaman via event.
 * Saat komponen terpasang, kode tersimpan diverifikasi ULANG (anti-tamper) —
 * bila tanda tangannya tidak sah, lisensi dihapus dan status kembali gratis.
 */
export function useLicense(): ActiveLicense | null {
  const [lic, setLic] = useState<ActiveLicense | null>(() => muatLisensi());

  useEffect(() => {
    let batal = false;
    const sync = () => setLic(muatLisensi());

    void (async () => {
      await validasiUlangTersimpan();
      if (!batal) sync();
    })();

    // cek berkala (mis. kedaluwarsa saat tab menganggur)
    const t = setTimeout(sync, 1500);
    window.addEventListener(LICENSE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      batal = true;
      clearTimeout(t);
      window.removeEventListener(LICENSE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return lic;
}
