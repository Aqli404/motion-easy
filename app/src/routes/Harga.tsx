import { useState } from "react";
import { Link } from "react-router-dom";
import { Tag, Check, AlertTriangle, ShoppingCart, MessageCircle, KeyRound, X } from "lucide-react";
import Modal from "../components/Modal";
import { PAYMENT_LINKS, HARGA, linkPembayaranSiap } from "../config/konfig";

const paket = [
  {
    nama: "Gratis",
    harga: "Rp 0",
    catatan: "selama-lamanya, tanpa lisensi",
    isian: ["Export 720p & 1080p", "Semua preview & sample", "Tanpa kode aktivasi"],
    warna: "border-edge",
    tombol: "bg-panel text-ink-dim",
  },
  {
    nama: "Bulanan",
    harga: `Rp ${HARGA.bulanan.toLocaleString("id-ID")}`,
    catatan: "per 30×24 jam",
    isian: ["Semua fitur Gratis", "Export 2K", "Tanpa watermark premium"],
    warna: "border-primary/60",
    tombol: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-deep",
    badge: "Paling Populer",
    id: "bulanan" as const,
  },
  {
    nama: "Lifetime",
    harga: `Rp ${HARGA.lifetime.toLocaleString("id-ID")}`,
    catatan: "sekali bayar, selamanya",
    isian: ["Semua fitur Bulanan", "Export 4K", "Terkait perangkat, tanpa perpanjangan"],
    warna: "border-secondary/60",
    tombol: "bg-panel text-ink-dim",
    id: "lifetime" as const,
  },
];

export default function Harga() {
  const [beli, setBeli] = useState<null | "bulanan" | "lifetime">(null);
  const linkSiap = linkPembayaranSiap();
  const target = beli ? (beli === "bulanan" ? PAYMENT_LINKS.bulanan : PAYMENT_LINKS.lifetime) : "";
  const wa = PAYMENT_LINKS.whatsapp
    ? `https://wa.me/${PAYMENT_LINKS.whatsapp}?text=${encodeURIComponent(
        `Halo, saya mau konfirmasi pembelian paket ${beli === "bulanan" ? "Bulanan (Rp 15.000)" : "Lifetime (Rp 55.000)"} Motion Easy.`
      )}`
    : "";

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-sm font-semibold">Pilih Paket Motion Easy</h2>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
          Pembayaran via Lynk.id · konfirmasi WhatsApp · kode lisensi via chat
        </p>

        {!linkSiap && (
          <div className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-xl bg-error/10 px-4 py-3 text-[11px] text-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Catatan admin:</strong> link pembayaran belum diisi. Buka{" "}
              <code className="font-mono">src/config/konfig.ts</code> lalu isi{" "}
              <code className="font-mono">PAYMENT_LINKS</code> (Lynk.id + WhatsApp). Sampai itu,
              tombol beli akan mati namun alurnya sudah nyata.
            </span>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {paket.map((p) => (
            <article
              key={p.nama}
              className={`rounded-xl border bg-panel-low p-5 ${p.warna} ${
                p.badge ? "shadow-lg shadow-primary/10 md:-translate-y-2" : ""
              }`}
            >
              {p.badge && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                  {p.badge}
                </span>
              )}
              <h3 className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-ink-dim">
                <Tag className="h-3.5 w-3.5" /> {p.nama}
              </h3>
              <p className="mt-2 text-2xl font-black tracking-tight">{p.harga}</p>
              <p className="font-mono text-[10px] text-muted">{p.catatan}</p>
              <ul className="mt-4 space-y-2 text-xs">
                {p.isian.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-ink-dim">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" />
                    {i}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {p.id ? (
                  <button
                    onClick={() => setBeli(p.id)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${p.tombol}`}
                  >
                    Pakai {p.nama}
                  </button>
                ) : (
                  <Link
                    to="/studio"
                    className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${p.tombol}`}
                  >
                    Mulai Sekarang
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] text-muted">
          Kode lisensi ditandatangani digital (ECDSA P-256) — palsu otomatis ditolak · ekonomi
          mikro: kompetitor 10/25/65rb → Motion Easy 0/15/55rb
        </p>
      </div>

      {/* Modal beli — 4 langkah */}
      <Modal open={beli !== null} title={`Paket ${beli === "lifetime" ? "Lifetime" : "Bulanan"}`} onClose={() => setBeli(null)}>
        <ol className="space-y-2.5 text-xs">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">1</span>
            <span className="text-ink-dim">
              Bayar via Lynk.id (QRIS / e-wallet / transfer).{" "}
              {target ? (
                <a href={target} target="_blank" rel="noreferrer" className="text-secondary underline">
                  buka halaman pembayaran
                </a>
              ) : (
                <span className="text-muted">(link belum diset admin — Fase penyetelan akhir)</span>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">2</span>
            <span className="text-ink-dim">
              Kirim bukti bayar via WhatsApp{" "}
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="text-secondary underline">
                  buka WA
                </a>
              ) : (
                <span className="text-muted">(nomor belum diset admin)</span>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">3</span>
            <span className="text-ink-dim">Terima kode lisensi (ditandatangani digital, tahan di chat).</span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">4</span>
            <span className="text-ink-dim">
              Tempel &amp; aktivasi —{" "}
              <Link to="/lisensi" className="text-primary underline" onClick={() => setBeli(null)}>
                menu Lisensi
              </Link>
            </span>
          </li>
        </ol>

        <div className="mt-4 flex gap-2">
          <button
            disabled={!target}
            onClick={() => window.open(target, "_blank")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-[11px] font-semibold text-deep shadow disabled:opacity-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Bayar Sekarang
          </button>
          <button
            disabled={!wa}
            onClick={() => window.open(wa, "_blank")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-edge px-3 py-2 text-[11px] font-semibold text-ink-dim hover:text-ink disabled:opacity-50"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Konfirmasi WA
          </button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 font-mono text-[9px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-3 w-3 shrink-0 text-secondary" />
          Kode dibuat manual oleh admin dengan alat tanda tangan lokal — tak ada server yang menyimpan
          kartu atau data pribadimu.
        </p>
      </Modal>
    </div>
  );
}
