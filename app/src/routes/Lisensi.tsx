import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  CircleCheckBig,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import { useHarga } from "../config/HargaContext";
import { hargaRp } from "../config/paketData";
import {
  verifikasiKode,
  simpanLisensi,
  hapusLisensi,
  premiumAktif,
  labelTier,
  expiryLabel,
} from "../license/license";
import type { LicensePayload } from "../license/license";
import { useLicense } from "../license/useLicense";

export default function Lisensi() {
  const navigate = useNavigate();
  const { bulanan, lifetime } = useHarga();
  const lic = useLicense();
  const [kode, setKode] = useState("");
  const [cek, setCek] = useState<null | "loading" | { ok: boolean; msg: string }>(null);

  const aktivasi = async () => {
    if (!kode.trim()) return;
    setCek("loading");
    const hasil = await verifikasiKode(kode);
    if (hasil.ok && hasil.payload) {
      simpanLisensi(hasil.code!, hasil.payload as LicensePayload);
      setKode("");
      setCek({ ok: true, msg: "Lisensi aktif! Kode disimpan di perangkat ini." });
    } else {
      setCek({ ok: false, msg: hasil.error ?? "Kode tidak sah." });
    }
  };

  // ===== sudah premium =====
  if (lic && premiumAktif(lic)) {
    const p = lic.payload;
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="rounded-xl border border-tertiary/50 bg-tertiary/5 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-tertiary">
              <CheckCircle2 className="h-5 w-5" /> Premium Aktif
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-panel-low px-3 py-2.5">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Paket</div>
                <div className="mt-1 font-semibold text-primary">{labelTier(p.tier)}</div>
              </div>
              <div className="rounded-lg bg-panel-low px-3 py-2.5">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Berlaku</div>
                <div className="mt-1">{expiryLabel(p)}</div>
              </div>
              {p.note && (
                <div className="col-span-2 rounded-lg bg-panel-low px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Catatan kode</div>
                  <div className="mt-1 text-ink-dim">{p.note}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/studio")}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-deep shadow hover:brightness-105 active:scale-95 transition-all"
              >
                <Clapperboard className="h-4 w-4" /> Export 2K/4K di Studio
              </button>
              <button
                onClick={() => {
                  hapusLisensi();
                  setCek(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-edge px-4 py-2 text-sm text-ink-dim hover:text-error"
              >
                <Trash2 className="h-4 w-4" /> Hapus Lisensi Perangkat Ini
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-edge bg-panel-low p-4 font-mono text-[10px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <span>
              Lisensi tersimpan di perangkat ini ({window.location.host}). Kode verifikasi
              ditandatangani ECDSA P-256 — palsu akan ditolak, tanpa butuh server.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ===== belum premium: form aktivasi =====
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-edge bg-panel-low p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Aktivasi Lisensi
          </h2>
          <p className="mt-1 text-xs text-ink-dim">
            Beli paket di menu Harga, lalu tempel kode lisensi dari kami di sini.
          </p>
          <div className="mt-4 space-y-2">
            <textarea
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              rows={4}
              placeholder="Tempel kode lisensi (dua bagian dipisah titik: xxxxx.yyyyy)"
              className="w-full resize-y rounded-lg border border-edge bg-well px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
            {kode.trim() && !kode.trim().includes(".") && (
              <p className="font-mono text-[10px] text-error">Format kode: dua bagian dipisah titik (payload.signature)</p>
            )}
            <button
              onClick={aktivasi}
              disabled={cek === "loading" || !kode.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-deep shadow disabled:opacity-50"
            >
              {cek === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Aktivasi
            </button>
          </div>

          {cek && cek !== "loading" && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
                cek.ok ? "bg-tertiary/10 text-tertiary" : "bg-error/10 text-error"
              }`}
            >
              {cek.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <span>{cek.msg}</span>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-panel p-3 font-mono text-[10px] leading-relaxed text-muted">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
            <span>
              Instal Studio lokal — <strong>Rendering tetap di GPU-mu (WebCodecs)</strong> — tidak meninggalkan browser. 2K &amp; 4K terbuka setelah aktivasi.
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            to="/harga"
            className="rounded-xl border border-edge bg-panel-low p-4 transition-colors hover:border-accent"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="mt-2 text-xs font-semibold">Belum beli? Lihat Harga</h3>
            <p className="mt-1 font-mono text-[10px] text-muted">{hargaRp(bulanan)}/bulan atau {hargaRp(lifetime)} lifetime</p>
          </Link>
          <div className="rounded-xl border border-edge bg-panel-low p-4">
            <CircleCheckBig className="h-4 w-4 text-muted" />
            <h3 className="mt-2 text-xs font-semibold">Tanpa lisensi tetap bisa</h3>
            <p className="mt-1 font-mono text-[10px] text-muted">
              1080p gratis, 3 ekspor/hari — Premium membuka 2K, 4K, Bulk ZIP, dan Enlarge-MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
