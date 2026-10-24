import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tag, Check, X as XIcon, ShoppingCart, KeyRound, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { PAYMENT_LINKS, linkPaketTerisi, waSiap as waSiapFn } from "../config/konfig";
import { buildPaket, hargaRp, linkWa, type PaketId } from "../config/paketData";
import { useHarga } from "../config/HargaContext";

export default function PricingSection({
  compact = false,
  glass = false,
}: {
  compact?: boolean;
  glass?: boolean;
}) {
  const [beli, setBeli] = useState<PaketId | null>(null);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const navigate = useNavigate();
  const waSiap = waSiapFn();
  const harga = useHarga();
  const hargaPair = { bulanan: harga.bulanan, lifetime: harga.lifetime };
  const PAKET = useMemo(() => buildPaket(hargaPair), [harga.bulanan, harga.lifetime]);
  const target = beli ? (linkPaketTerisi(beli) ? PAYMENT_LINKS[beli] : "") : "";
  const paketWaktu = hargaRp(hargaPair[beli === "lifetime" ? "lifetime" : "bulanan"]);

  // trust mini: anchor hemat & scarcity ringan — dari harga live, tidak hardcode
  const hematLifetime = `Hemat ${hargaRp(12 * hargaPair.bulanan - hargaPair.lifetime)} vs 12× bulanan`;
  const badgeHargaBayangan = `Harga terbitan perdana — ${hargaRp(75_000)} per 1 Nov`;
  const handleBayarOtomatis = async (id: PaketId) => {
    setCreateErr("");
    setCreating(true);
    try {
      const r = await fetch("/api/pesanan/buat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paketId: id }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Gagal membuat pesanan");
      setBeli(null);
      navigate(`/bayar/${encodeURIComponent(j.ref)}`);
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };
  return (
    <>
      {/* Header kecil di dalam section — disembunyikan bila compact dipakai di Landing */}
      {!compact && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            Investasi Sekali, Pakai Selamanya
          </span>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Pilih Paket yang Pas untuk Kebutuhan Animasi Anda
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-ink-dim sm:text-sm">
            Mulai dari Rp 0 untuk kebutuhan standar, atau miliki akses 4K permanen tanpa terjebak tagihan langganan.
          </p>
        </div>
      )}

      {/* Info Box — pembayaran otomatis */}
      {!compact && (
        <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-xs text-secondary">
          <span className="mt-0.5 shrink-0 text-base">⚡</span>
          <span>
            Pembayaran <strong>otomatis via QRIS</strong> (DANA / GoPay / OVO / m-banking) — kode lisensi tampil langsung setelah lunas. Butuh bantuan? Chat admin.
          </span>
        </div>
      )}

      {/* 3 Kartu */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {PAKET.map((p) => {
          const id = p.id;
          return (
            <article
              key={p.nama}
              className={`flex flex-col justify-between rounded-2xl p-6 transition-all ${glass ? "landing-glass" : `border ${p.warna}`}`}
            >
              <div>
                {p.badge && (
                  <div className="mb-2">
                    <span className="rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-deep">
                      {p.badge}
                    </span>
                  </div>
                )}
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Tag className="h-4 w-4 text-accent" /> {p.nama}
                </h3>
                <p className="mt-1 text-xs text-ink-dim">{p.subjudul}</p>
                {p.highlight && <p className="mt-1 font-mono text-[10px] leading-relaxed text-primary">{badgeHargaBayangan}</p>}
                <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
                  <span className="whitespace-nowrap text-3xl font-black tracking-tight text-ink sm:text-4xl">{p.harga}</span>
                  <span className="font-mono text-xs text-muted">/ {p.periode}</span>
                </div>
                {p.highlight && (
                  <p className="mt-1 font-mono text-[10px] line-through decoration-muted/40 text-muted">Normal {hargaRp(12 * hargaPair.bulanan)} (12× {hargaRp(hargaPair.bulanan)})</p>
                )}
                {p.highlight && <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-center font-mono text-[10px] font-semibold text-amber-300">{hematLifetime}</p>}
                <ul className="mt-6 space-y-2.5 text-xs">
                  {p.isian.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-ink-dim">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                {p.kurang && p.kurang.length > 0 && (
                  <div className={`mt-4 space-y-1.5 rounded-xl border p-3 ${glass ? "border-white/10 bg-white/[0.02]" : "border-edge bg-panel-low"}`}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Belum termasuk</p>
                    <ul className="space-y-1.5">
                      {p.kurang.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[11px] text-muted line-through decoration-muted/40">
                          <XIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error/70" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-8 flex flex-col gap-1.5">
                {p.microcopy && (
                  <p className="text-center font-mono text-[10px] text-muted">{p.microcopy}</p>
                )}
                {p.id && (
                  <p className="text-center font-mono text-[9px] leading-relaxed text-muted">
                    Bayar otomatis via QRIS — kode tampil langsung setelah lunas · Garansi 7 hari
                  </p>
                )}
                {p.id ? (
                  <button
                    onClick={() => id && setBeli(id)}
                    className={`mt-2 inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${p.tombol}`}
                  >
                    <ShoppingCart className="h-4 w-4 shrink-0" /> Bayar Otomatis — QRIS
                  </button>
                ) : (
                  <Link
                    to="/studio"
                    className={`mt-2 block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-colors ${p.tombol}`}
                  >
                    Buka Studio Gratis
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal Beli — dipakai di Landing maupun /harga: Bayar Otomatis primary + WA fallback */}
      <Modal
        open={beli !== null}
        title={`Pemesanan Paket ${beli === "lifetime" ? "Lifetime Pass" : "Bulanan"} — ${paketWaktu}`}
        onClose={() => { if (!creating) { setBeli(null); setCreateErr(""); } }}
      >
        <ol className="space-y-3 text-xs">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">1</span>
            <span className="text-ink-dim">
              {target ? (
                <>Lakukan pembayaran di halaman kasir via QRIS atau transfer — klik <a href={target} target="_blank" rel="noreferrer" className="font-semibold text-secondary underline">Bayar Sekarang</a>.</>
              ) : (
                <>Klik <strong>Bayar Otomatis</strong> di bawah — halaman bayar QRIS terbuka, kode lisensi tampil langsung setelah lunas.</>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">2</span>
            <span className="text-ink-dim">
              Bayar via QRIS (DANA/GoPay/OVO/m-banking — simpan gambar QR → pindai dari galeri juga bisa).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">3</span>
            <span className="text-ink-dim">
              Lunas → kode lisensi muncul otomatis di halaman. Buka <Link to="/lisensi" className="font-semibold text-secondary underline" onClick={() => setBeli(null)}>Aktivasi Lisensi</Link>, tempel kode — premium aktif seketika.
            </span>
          </li>
        </ol>
        {createErr && <p className="mt-3 rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-xs text-error">{createErr}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {target ? (
            <button
              onClick={() => window.open(target, "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-xs font-bold text-deep shadow"
            >
              <ShoppingCart className="h-4 w-4" /> Bayar Sekarang
            </button>
          ) : (
            <>
              <button
                disabled={creating || !beli}
                onClick={() => beli && handleBayarOtomatis(beli)}
                className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-xs font-bold text-deep shadow transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {creating ? "Menyiapkan pembayaran…" : "Bayar Otomatis — QRIS"}
              </button>
              {waSiap && (
                <button
                  onClick={() => beli && window.open(linkWa(beli, PAYMENT_LINKS.whatsapp, hargaPair), "_blank")}
                  className="w-full py-1 text-center font-mono text-[11px] text-muted hover:text-ink-dim underline-offset-2 hover:underline"
                >
                  Ada masalah? Chat admin via WhatsApp
                </button>
              )}
            </>
          )}
        </div>
        <p className="mt-3 flex items-start gap-1.5 font-mono text-[10px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
          Kode tampil langsung di halaman sukses setelah lunas · Garansi uang kembali 7 hari · ECDSA kriptografis.
        </p>
      </Modal>
    </>
  );
}
