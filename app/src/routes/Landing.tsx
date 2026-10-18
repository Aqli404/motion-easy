import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Sparkles, Layers, ShieldCheck, Zap } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    t: "Dari Ide Langsung Jadi Video",
    d: "Cukup ketik ide atau pilih 20 tema siap pakai. AI menyusun gerakan dinamis, partikel, hingga teks tanpa kamu perlu menguasai software rumit.",
    tag: "Hemat Waktu Desain",
  },
  {
    icon: Zap,
    t: "Rendering Instan di Browser",
    d: "Animasi diproses langsung oleh GPU perangkatmu lewat WebCodecs. Preview berjalan 60 fps secara realtime tanpa antre render di cloud.",
    tag: "Nol Waktu Tunggu",
  },
  {
    icon: Layers,
    t: "Produksi Massal Bulk ZIP",
    d: "Tempel banyak konsep sekaligus, klik render, dan dapatkan satu file ZIP rapi berisi semua video MP4. Tidak ada lagi download manual yang tercegat.",
    tag: "Siap Jual Microstock",
  },
  {
    icon: ShieldCheck,
    t: "Tanpa Biaya Server & Langganan AI",
    d: "Pakai akun AI milikmu sendiri (ChatGPT, Claude, atau Gemini). Kami tidak membebani biaya langganan bulanan mahal untuk render cloud.",
    tag: "Modal Rp 0",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-deep text-ink">
      {/* Navbar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              MOTION <span className="text-accent">EASY</span>
            </div>
            <div className="font-mono text-[10px] text-muted">
              AI Motion Video Studio
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/harga"
            className="rounded-lg px-3 py-2 text-ink-dim transition-colors hover:text-ink"
          >
            Harga
          </Link>
          <Link
            to="/lisensi"
            className="rounded-lg px-3 py-2 text-ink-dim transition-colors hover:text-ink"
          >
            Aktivasi Lisensi
          </Link>
          <Link
            to="/studio"
            className="rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 font-semibold text-deep shadow-md transition-transform hover:scale-[1.02]"
          >
            Buka Studio
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3.5 py-1.5 font-mono text-[11px] text-tertiary shadow-sm">
          <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
          Ekspor 1080p Gratis Selamanya · 100% Client-Side
        </div>

        <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Bikin Video Motion Graphics Berkualitas Tinggi{" "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Hanya Lewat Teks
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-dim sm:text-lg">
          Tinggalkan kerumitan keyframe After Effects. Buat animasi judul, lower third,
          hingga visual partikel organik langsung di browser. Tanpa install aplikasi berat,
          bebas antre render, dan tanpa langganan server yang menguras kantong.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/studio"
            className="rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-3.5 font-bold text-deep shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
          >
            Coba Buat Animasi Sekarang
          </Link>
          <Link
            to="/harga"
            className="rounded-xl border border-edge bg-panel px-7 py-3.5 font-semibold text-ink-dim transition-colors hover:border-bright hover:text-ink"
          >
            Lihat Pilihan Paket
          </Link>
        </div>

        <p className="mt-3 text-xs text-muted">
          Buka langsung di Chrome/Edge desktop · Tidak butuh kartu kredit atau pendaftaran akun
        </p>

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 font-mono">
          {[
            ["720p – 4K", "Kualitas Master Ekspor"],
            ["1 Klik Bulk", "Download Banyak Video Sekaligus"],
            ["100% Lokal", "Privasi Aman di Komputer Sendiri"],
          ].map(([val, desc]) => (
            <div key={desc} className="rounded-xl border border-edge bg-panel p-4 text-center">
              <dt className="text-xl font-extrabold text-primary sm:text-2xl">{val}</dt>
              <dd className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {desc}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Feature Section */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center">
          <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
            Kemudahan Alur Kerja
          </h2>
          <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Solusi Praktis untuk Konten Kreator &amp; Kontributor Microstock
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.t}
                className="flex flex-col justify-between rounded-2xl border border-edge bg-panel p-6 transition-all hover:border-primary/50 hover:bg-panel-high"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-well text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink">{f.t}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-dim">{f.d}</p>
                </div>
                <div className="mt-6 border-t border-edge/60 pt-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                    {f.tag}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge px-6 py-8 text-center font-mono text-[11px] text-muted">
        <p>© 2026 Motion Easy · Client-Side Motion Studio · Privasi terjamin tanpa penyimpanan data cloud</p>
        <div className="mt-2 space-x-4">
          <Link to="/panduan" className="underline hover:text-ink">
            Panduan Pakai
          </Link>
          <Link to="/privasi" className="underline hover:text-ink">
            Privasi &amp; Ketentuan
          </Link>
        </div>
      </footer>
    </div>
  );
}
