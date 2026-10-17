import { useEffect, useState } from "react";
import {
  muatLisensi,
  premiumAktif,
  LICENSE_EVENT,
  type ActiveLicense,
} from "./license";

/** Subscribe status lisensi dari localStorage, sinkron antar halaman via event. */
export function useLicense(): ActiveLicense | null {
  const [lic, setLic] = useState<ActiveLicense | null>(() => muatLisensi());

  useEffect(() => {
    const sync = () => setLic(muatLisensi());
    // penyegaran pertama (mis. kedaluwarsa saat tab menganggur)
    const t = setTimeout(sync, 400);
    window.addEventListener(LICENSE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener(LICENSE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  void premiumAktif; // diimpor untuk referensi silang modul (dipakai komponen lain)
  return lic;
}
