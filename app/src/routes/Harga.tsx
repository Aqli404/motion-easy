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
  ShieldCheck,
  Zap,
  HelpCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import {
  PAYMENT_LINKS,
  HARGA,
  linkPaketTerisi,
  waSiap as waSiapFn,
} from "../config/konfig";

type PaketId = "bulanan" | "lifetime";

function linkWa(id: PaketId): string {
  const nama = id === "bulanan" ? "Bulanan (Rp 15.000)" : "Lifetime (Rp 55.000)";
  const pesan = `Halo, saya mau beli paket ${nama} Motion Easy. Mohon info rekening/QRIS pembayarannya.`;
  return `https://wa.me/${PAYMENT_LINKS.whatsapp}?text=${encodeURIComponent(pesan)}`;
}

function hargaRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const paket: Array<{
  nama: string;
  harga: string;
  periode: string;
  subjudul: string;
  isian: string[];
  warna: string;
  tombol: string;
  badge?: string;
  highlight?: boolean;
  microcopy?: string;
  id?: PaketId;
}> = [
  {
    nama: "Gratis Selamanya",
    harga: "Rp 0",
    periode: "tanpa batas waktu",
    subjudul: "Buktikan sendiri kualitasnya langsung di browser",
    isian: [
      "Ekspor video kualitas 720p & 1080p",
      "Mode Kanvas Bebas (efek visual organik)",
      "Bulk ZIP (render banyak video jadi 1 arsip)",
      "Simpan Cover PNG resolusi tinggi",
      "20 koleksi tema prompt instan",
      "100% proses lokal di komputer sendiri",
    ],
    warna: "border-edge bg-panel-low",
    tombol: "border border-edge bg-panel text-ink-dim hover:text-ink hover:border-bright",
    microcopy: "Langsung pakai tanpa registrasi atau kartu kredit",
  },
  {
    nama: "Bulanan",
    harga: hargaRp(HARGA.bulanan),
    periode: "per 30 hari akses",
    subjudul: "Solusi hemat untuk kebutuhan proyek jangka pendek",
    isian: [
      "Semua fitur di Paket Gratis",
      "Buka ekspor resolusi tinggi 2K (1440p)",
      "Bulk ZIP resolusi 2K tanpa batas jumlah",
      "Dukungan teknis prioritas via WhatsApp",
      "Bisa diperpanjang kapan saja sesuai kebutuhan",
    ],
    warna: "border-edge bg-panel-low",
    tombol: "border border-edge bg-panel text-ink-dim hover:text-ink hover:border-bright",
    microcopy: "Hanya Rp 500/hari untuk kualitas video tajam",
    id: "bulanan",
  },
  {
    nama: "Lifetime Pass",
    harga: hargaRp(HARGA.lifetime),
    periode: "sekali bayar seumur hidup",
    subjudul: "Paling hemat. Setara hanya 3,6 bulan paket bulanan",
    isian: [
      "Semua fitur di Paket Bulanan",
      "Buka ekspor master ultra 4K (2160p)",
      "Bulk ZIP batch render kualitas 4K",
      "Akses permanen tanpa tagihan perpanjangan",
      "Kode lisensi offline, anti server down",
      "Termasuk semua update fitur studio di masa depan",
    ],
    warna: "border-accent bg-panel-high shadow-xl shadow-primary/10 relative md:-translate-y-2",
    tombol: "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-deep font-bold shadow-md hover:scale-[1.01] transition-transform",
    badge: "Paling Menguntungkan",
    highlight: true,
    microcopy: "Sekali investasi, nikmati kebebasan produksi selamanya",
    id: "lifetime",
  },
];

const faqs = [
  {
    q: "Bagaimana cara kerja lisensi offline?",
    a: "Setelah pembayaran, admin mengirim kode lisensi bertanda tangan kriptografi (ECDSA). Kode ini disimpan aman di browsermu dan diverifikasi secara lokal tanpa bergantung pada koneksi server database. Jadi aplikasimu tidak akan pernah terkunci meskipun server sedang offline.",
  },
  {
    q: "Apakah video hasil ekspor bebas watermark?",
    a: "Ya. Semua video yang kamu ekspor—baik dari paket Gratis, Bulanan, maupun Lifetime—bersih 100% tanpa watermark, siap kamu gunakan untuk YouTube, TikTok, klien, atau dijual di platform microstock.",
  },
  {
    q: "Mengapa disarankan menggunakan Chrome atau Edge desktop?",
    a: "Motion Easy memanfaatkan teknologi WebCodecs untuk merender video langsung menggunakan GPU perangkatmu tanpa mengirim data ke server. Saat ini teknologi rendering grafis berkecepatan tinggi ini didukung paling optimal di Google Chrome dan Microsoft Edge versi desktop.",
  },
];

export default function Harga() {
  const [beli, setBeli] = useState<PaketId | null>(null);
  const waSiap = waSiapFn();

  const target = beli ? (linkPaketTerisi(beli) ? PAYMENT_LINKS[beli] : "") : "";
  const paketWaktu = hargaRp(beli === "lifetime" ? HARGA.lifetime : HARGA.bulanan);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Zap className="h-3.5 w-3.5" /> Investasi Sekali, Pakai Selamanya
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
            Pilih Paket yang Pas untuk Kebutuhan Animasi Anda
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-ink-dim sm:text-sm">
            Mulai dari Rp 0 untuk kebutuhan standar, atau miliki akses 4K permanen tanpa
            terjebak tagihan langganan bulanan yang menumpuk.
          </p>
        </div>

        {/* Info Box Pembayaran */}
        {!linkPaketTerisi("bulanan") && !linkPaketTerisi("lifetime") && (
          waSiap ? (
            <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-xs text-secondary">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Pembayaran dilayani langsung melalui <strong>WhatsApp</strong> resmi via QRIS, e-wallet (GoPay, OVO, DANA), atau transfer bank. Lisensi langsung dikirim setelah konfirmasi tanpa perlu login akun.
              </span>
            </div>
          ) : (
            <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Kontak pembayaran sedang dipersiapkan. Hubungi admin untuk informasi lisensi.
              </span>
            </div>
          )
        )}

        {/* Kartu Harga */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {paket.map((p) => {
            const id = p.id;
            const adaLink = id ? linkPaketTerisi(id) : false;
            return (
              <article
                key={p.nama}
                className={`flex flex-col justify-between rounded-2xl border p-6 transition-all ${p.warna}`}
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

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight sm:text-4xl text-ink">
                      {p.harga}
                    </span>
                    <span className="font-mono text-xs text-muted">/ {p.periode}</span>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs">
                    {p.isian.map((i) => (
                      <li key={i} className="flex items-start gap-2.5 text-ink-dim">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {p.id ? (
                    <button
                      onClick={() => id && setBeli(id)}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${p.tombol}`}
                    >
                      {adaLink ? "Beli Sekarang" : waSiap ? "Pesan via WhatsApp" : "Segera Tersedia"}
                    </button>
                  ) : (
                    <Link
                      to="/studio"
                      className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-colors ${p.tombol}`}
                    >
                      Buka Studio Gratis
                    </Link>
                  )}
                  {p.microcopy && (
                    <p className="mt-2 text-center font-mono text-[10px] text-muted">
                      {p.microcopy}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Keamanan & Garansi */}
        <div className="mt-12 rounded-2xl border border-edge bg-panel p-6 text-center sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-well text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Kebebasan &amp; Keamanan Penuh</h4>
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                Motion Easy beroperasi 100% di browser lokal Anda. Lisensi bersifat permanen pada perangkat Anda tanpa risiko pemutusan sepihak atau gangguan server. Simpan kode lisensi Anda, dan gunakan kapan pun Anda butuh berkreasi.
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
            {faqs.map((f, idx) => (
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
        </p>
      </div>

      {/* Modal Beli */}
      <Modal
        open={beli !== null}
        title={`Pemesanan Paket ${beli === "lifetime" ? "Lifetime Pass" : "Bulanan"} — ${paketWaktu}`}
        onClose={() => setBeli(null)}
      >
        <ol className="space-y-3 text-xs">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              1
            </span>
            <span className="text-ink-dim">
              {target ? (
                <>
                  Lakukan pembayaran di halaman kasir via QRIS atau transfer — klik tombol{" "}
                  <a href={target} target="_blank" rel="noreferrer" className="text-secondary underline font-semibold">
                    Bayar Sekarang
                  </a>.
                </>
              ) : (
                <>
                  Klik tombol <strong>Pesan via WhatsApp</strong> di bawah. Format pesan sudah disiapkan otomatis untuk admin kami.
                </>
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              2
            </span>
            <span className="text-ink-dim">
              Admin akan mengirimkan QRIS/Nomor Rekening serta langsung menerbitkan <strong>kode lisensi resmi</strong> setelah konfirmasi.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel font-mono text-[10px] font-bold text-primary">
              3
            </span>
            <span className="text-ink-dim">
              Buka menu{" "}
              <Link to="/lisensi" className="underline font-semibold text-secondary" onClick={() => setBeli(null)}>
                Aktivasi Lisensi
              </Link>
              , lalu tempel kode tersebut. Fitur premium langsung aktif seketika.
            </span>
          </li>
        </ol>

        <div className="mt-5 flex gap-2">
          {target ? (
            <button
              onClick={() => window.open(target, "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-xs font-bold text-deep shadow"
            >
              <ShoppingCart className="h-4 w-4" /> Bayar Sekarang
            </button>
          ) : (
            <button
              disabled={!waSiap}
              onClick={() => beli && window.open(linkWa(beli), "_blank")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-xs font-bold text-deep shadow transition-transform hover:scale-[1.01]"
            >
              <MessageCircle className="h-4 w-4" /> Hubungi Admin via WhatsApp
            </button>
          )}
        </div>

        <p className="mt-3 flex items-start gap-1.5 font-mono text-[10px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
          Kode lisensi divalidasi langsung di perangkat secara kriptografis (ECDSA). Data pribadi Anda tidak pernah disimpan di server kami.
        </p>
      </Modal>
    </div>
  );
}
