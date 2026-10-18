import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Tag,
  Check,
  ShoppingCart,
  MessageCircle,
  KeyRound,
  AlertTriangle,
  Info,
} from "lucide-react";
import Modal from "../components/Modal";
import {
  PAYMENT_LINKS,
  HARGA,
  linkPaketTerisi,
  waSiap as waSiapFn,
} from "../config/konfig";

type PaketId = "bulanan" | "lifetime";

/** Link wa.me dengan pesan paket yang sudah terisi otomatis. */
function linkWa(id: PaketId): string {
  const nama = id === "bulanan" ? "Bulanan (Rp 15.000)" : "Lifetime (Rp 55.000)";
  const pesan = `Halo, saya mau beli paket ${nama} Motion Easy. Mohon info cara pembayarannya.`;
  return `https://wa.me/${PAYMENT_LINKS.whatsapp}?text=${encodeURIComponent(pesan)}`;
}

function hargaRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const paket: Array<{
  nama: string;
  harga: string;
  catatan: string;
  isian: string[];
  warna: string;
  tombol: string;
  badge?: string;
  id?: PaketId;
}> = [
  {
    nama: "Gratis",
    harga: "Rp 0",
    catatan: "selama-lamanya, tanpa kode aktivasi",
    isian: [
      "Export 720p & 1080p",
      "Semua preview & sample",
      "Render 100% di perangkat sendiri",
    ],
    warna: "border-edge",
    tombol: "bg-panel text-ink-dim",
  },
  {
    nama: "Bulanan",
    harga: hargaRp(HARGA.bulanan),
    catatan: "per 30 hari sejak kode diterbitkan",
    isian: [
      "Semua fitur Gratis",
      "Export 2K",
      "Dukungan via WhatsApp",
    ],
    warna: "border-primary/60",
    tombol: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-deep",
    badge: "Paling Populer",
    id: "bulanan",
  },
  {
    nama: "Lifetime",
    harga: hargaRp(HARGA.lifetime),
    catatan: "sekali bayar, selamanya",
    isian: [
      "Semua fitur Bulanan",
      "Export 4K",
      "Tanpa perpanjangan tahunan",
    ],
    warna: "border-secondary/60",
    tombol: "bg-panel text-ink-dim",
    id: "lifetime",
  },
];

export default function Harga() {
  const [beli, setBeli] = useState<PaketId | null>(null);
  const waSiap = waSiapFn();

  const target = beli ? (linkPaketTerisi(beli) ? PAYMENT_LINKS[beli] : "") : "";
  const paketWaktu = hargaRp(beli === "lifetime" ? HARGA.lifetime : HARGA.bulanan);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-sm font-semibold">Pilih Paket Motion Easy</h2>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
          Kode lisensi dikirim ke WhatsApp · kode bisa dipakai berulang
        </p>

        {!linkPaketTerisi("bulanan") && !linkPaketTerisi("lifetime") && (
          waSiap ? (
            <div className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-xl bg-secondary/10 px-4 py-3 text-[11px] text-secondary">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pembayaran dilayani langsung via <strong>WhatsApp</strong> — QRIS /
                e-wallet / transfer. Tidak ada akun, tidak ada data pribadi yang
                dikumpulkan. Tempel kode yang kamu terima di menu{" "}
                <Link to="/lisensi" className="underline">Aktivasi Lisensi</Link>.
              </span>
            </div>
          ) : (
            <div className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-xl bg-error/10 px-4 py-3 text-[11px] text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pembayaran belum tersedia — konfigurasi{' '}
                <code className="font-mono">src/config/konfig.ts</code> belum diisi.
              </span>
            </div>
          )
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {paket.map((p) => {
            const id = p.id;
            const adaLink = id ? linkPaketTerisi(id) : false;
            return (
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
                      onClick={() => id && setBeli(id)}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${p.tombol}`}
                    >
                      {adaLink ? "Beli Sekarang" : waSiap ? "Pesan via WhatsApp" : "Segera Tersedia"}
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
            );
          })}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] text-muted">
          Kode lisensi ditandatangani digital (ECDSA) — palsu otomatis ditolak ·{" "}
          <Link to="/privasi" className="underline hover:text-muted">
            Privasi &amp; Ketentuan
          </Link>
        </p>
      </div>

      {/* ===== Modal beli ===== */}
      <Modal
        open={beli !== null}
        title={`Paket ${beli === "lifetime" ? "Lifetime" : "Bulanan"} — ${paketWaktu}`}
        onClose={() => setBeli(null)}
      >
        <ol className="space-y-2.5 text-xs">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              1
            </span>
            <span className="text-ink-dim">
              {target ? (
                <>
                  Bayar di halaman pembayaran (QRIS / e-wallet / transfer) — klik{" "}
                  <a href={target} target="_blank" rel="noreferrer" className="text-secondary underline">
                    Bayar Sekarang
                  </a>{" "}
                  di bawah ini.
                </>
              ) : (
                <>
                  Klik <strong>Pesan via WhatsApp</strong> — pesan otomatis sudah
                  berisi paket yang kamu pilih, lalu admin mengirim QRIS / nominal
                  transfer.
                </>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              2
            </span>
            <span className="text-ink-dim">
              Setelah pembayaran diterima, admin mengirim <strong>kode lisensi</strong>{" "}
              ke WhatsApp-mu.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              3
            </span>
            <span className="text-ink-dim">
              Salin kode — buka menu{" "}
              <Link to="/lisensi" className="underline" onClick={() => setBeli(null)}>
                Aktivasi Lisensi
              </Link>{" "}
              dan <strong>tempelkan di sana</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              4
            </span>
            <span className="text-ink-dim">
              Kode tersimpan di browser. Simpan pesannya baik-baik — kalau berganti
              browser/HP, tempel kode yang sama lagi.
            </span>
          </li>
        </ol>

        <div className="mt-4 flex gap-2">
          {target ? (
            <button
              onClick={() => window.open(target, "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-[11px] font-semibold text-deep shadow disabled:opacity-50"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Bayar Sekarang
            </button>
          ) : (
            <button
              disabled={!waSiap}
              onClick={() => beli && window.open(linkWa(beli), "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-[11px] font-semibold text-deep shadow disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Pesan via WhatsApp
            </button>
          )}
          {target && waSiap && (
            <button
              onClick={() => beli && window.open(linkWa(beli), "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-edge px-3 py-2 text-[11px] font-semibold text-ink-dim hover:text-ink"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Konfirmasi WA
            </button>
          )}
        </div>

        <p className="mt-2 flex items-start gap-1.5 font-mono text-[9px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-3 w-3 shrink-0 text-secondary" />
          Kode lisensi dibuat manual oleh admin (ECDSA) — tidak ada hubungan dengan
          server, tidak ada data pribadi yang dikumpulkan.
        </p>
      </Modal>
    </div>
  );
}
