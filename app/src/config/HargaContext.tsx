import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { HARGA } from "./konfig";

export interface PaketRow {
  id: string;
  nama: string;
  tier: "bulanan" | "lifetime";
  durasi_hari: number | null;
  max_res: number;
  bulk: number;
  enlarge: number;
  harga: number;
  bawaan: number;
  aktif: number;
  urut: number;
}

interface HargaLive {
  bulanan: number;   // harga bulanan live (fallback HARGA.bulanan)
  lifetime: number;  // harga lifetime live
  rows: PaketRow[];  // semua paket aktif
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const FALLBACK: HargaLive = {
  bulanan: HARGA.bulanan,
  lifetime: HARGA.lifetime,
  rows: [],
  loading: true,
  error: null,
  refresh: () => {},
};

const Ctx = createContext<HargaLive>(FALLBACK);

export function useHarga(): HargaLive {
  return useContext(Ctx);
}

export function HargaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<HargaLive, "refresh">>({
    bulanan: HARGA.bulanan,
    lifetime: HARGA.lifetime,
    rows: [],
    loading: true,
    error: null,
  });

  const fetchHarga = useCallback(async () => {
    try {
      const res = await fetch("/api/paket-aktif");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Gagal memuat harga");
      const rows: PaketRow[] = Array.isArray(j.data) ? j.data : [];
      if (rows.length === 0) {
        setState((s) => ({ ...s, loading: false, error: j.fallback ? null : "paket kosong" }));
        return;
      }
      const bul = rows.find((r) => r.tier === "bulanan")?.harga ?? HARGA.bulanan;
      const life = rows.find((r) => r.tier === "lifetime")?.harga ?? HARGA.lifetime;
      setState({ bulanan: bul, lifetime: life, rows, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    fetchHarga();
    const onVis = () => { if (document.visibilityState === "visible") fetchHarga(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchHarga]);

  const value: HargaLive = { ...state, refresh: fetchHarga };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
