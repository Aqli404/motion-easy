import { Link } from "react-router-dom";
import { Check, ShieldCheck, HelpCircle, X } from "lucide-react";
import PricingSection from "../components/PricingSection";
import { MATRIKS, FAQS, hargaRp } from "../config/paketData";
import { useHarga } from "../config/HargaContext";

export default function Harga() {
  const { bulanan, lifetime } = useHarga();
  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header halaman penuh — berbeda dari versi ringkas di Landing */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            Investasi Sekali, Pakai Selamanya
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
            Pilih Paket yang Pas untuk Kebutuhan Animasi Anda
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-ink-dim sm:text-sm">
            Halaman lengkap — perbandingan fitur, FAQ, dan garansi. Versi ringkasnya juga tampil di beranda.
          </p>
        </div>

        {/* Kartu + modal — sumber kebenaran tunggal */}
        <div className="mt-8">
          <PricingSection />
        </div>

        {/* Tabel Perbandingan Fitur */}
        <div className="mt-14">
          <div className="text-center">
            <h3 className="text-lg font-black tracking-tight text-ink sm:text-xl">
              Bandingkan Fitur, Bukan Cuma Harga
            </h3>
            <p className="mx-auto mt-1.5 max-w-xl text-xs text-ink-dim">
              Semua paket bebas watermark. Bedanya ada di kecepatan produksi dan kualitas master.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-edge bg-panel">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted">Fitur</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-ink-dim">
                    Gratis
                    <div className="font-mono text-[10px] font-normal text-muted">Rp 0</div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-ink-dim">
                    Bulanan
                    <div className="font-mono text-[10px] font-normal text-muted">{hargaRp(bulanan)}</div>
                  </th>
                  <th className="relative px-3 py-3 text-center text-xs font-bold text-primary">
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
                    Lifetime
                    <div className="font-mono text-[10px] font-normal text-muted">{hargaRp(lifetime)}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIKS.map((row) => (
                  <tr key={row.fitur} className="border-b border-edge/50 last:border-0">
                    <td className="px-4 py-2.5 text-[11px] text-ink-dim">{row.fitur}</td>
                    {(["gratis", "bulanan", "lifetime"] as const).map((k) => {
                      const v = row[k];
                      return (
                        <td key={k} className="px-3 py-2.5 text-center">
                          {v === true ? (
                            <Check className="mx-auto h-4 w-4 text-tertiary" aria-label="tersedia" />
                          ) : v === false ? (
                            <X className="mx-auto h-4 w-4 text-muted/40" aria-label="tidak tersedia" />
                          ) : (
                            <span className={`font-mono text-[10px] ${k === "lifetime" ? "font-semibold text-primary" : "text-ink-dim"}`}>
                              {v}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center font-mono text-[10px] text-muted">
            Gratis = 3 ekspor 720p per hari · kuota reset otomatis tiap tengah malam (waktu lokal)
          </p>
        </div>

        {/* Keamanan & Garansi */}
        <div className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-6 text-center sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Kode tampil otomatis setelah lunas · Garansi uang kembali 7 hari</h4>
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                Bayar QRIS lunas → kode lisensi muncul langsung di layar sukses pembayaran. Tempel di <Link to="/lisensi" className="font-semibold text-secondary underline">Aktivasi Lisensi</Link> — fitur premium aktif seketika. Tidak puas dalam 7 hari? Uang kembali. Lisensi offline (ECDSA) — tetap aktif walau server down.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h3 className="flex items-center gap-2 text-base font-bold text-ink">
            <HelpCircle className="h-4 w-4 text-secondary" /> Pertanyaan yang Sering Diajukan
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {FAQS.map((f, idx) => (
              <div key={idx} className="rounded-xl border border-edge bg-panel-low p-4 text-xs">
                <h5 className="font-semibold text-ink">{f.q}</h5>
                <p className="mt-2 leading-relaxed text-ink-dim">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center font-mono text-[10px] text-muted">
          © 2026 Motion Easy · Semua hak dilindungi ·{" "}
          <Link to="/privasi" className="underline hover:text-ink">
            Privasi &amp; Ketentuan
          </Link>
          {" · "}
          <Link to="/" className="underline hover:text-ink">
            ← Kembali ke Beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
