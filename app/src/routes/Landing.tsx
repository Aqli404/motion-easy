import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const features = [
  {
    n: "01",
    t: "Brief Dulu, Bukan Ribet",
    d: "Isi kategori, gaya, durasi, dan rasio. Motion Easy menyusun prompt siap pakai untuk AI-mu.",
    c: "text-primary",
  },
  {
    n: "02",
    t: "Preview Realtime",
    d: "Animasi langsung digambar di canvas browser. Geser timeline, pause, replay — tanpa unduh dulu.",
    c: "text-secondary",
  },
  {
    n: "03",
    t: "Export MP4 di Browser",
    d: "Rendering memakai GPU milikmu lewat WebCodecs. 720p sampai 4K, hingga bulk export ZIP.",
    c: "text-tertiary",
  },
  {
    n: "04",
    t: "Tanpa Budget AI",
    d: "Mode BYO-AI: pakai ChatGPT/Claude/Gemini milikmu sendiri. Biaya AI kita tetap Rp 0.",
    c: "text-error",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-deep">
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
            className="rounded-lg px-3 py-2 text-ink-dim hover:text-ink"
          >
            Harga
          </Link>
          <Link
            to="/lisensi"
            className="rounded-lg px-3 py-2 text-ink-dim hover:text-ink"
          >
            Lisensi
          </Link>
          <Link
            to="/studio"
            className="rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 font-semibold text-deep shadow-md transition-transform hover:scale-[1.02]"
          >
            Buka Studio
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <span className="rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-tertiary">
          100% di browser · tanpa server
        </span>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
         {"Bikin Motion Graphics "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Pakai Prompt — Gratis
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink-dim">
          Motion Easy membantu animator microstock lulusan AI dari brief{" "}
          <span className="font-mono text-primary">ke kode animasi</span>,{" "}
          <span className="font-mono text-secondary">
            ke preview realtime
          </span>
          , sampai{" "}
          <span className="font-mono text-tertiary">jadi file MP4</span> — semua
          di browser, tanpa server, tanpa langganan AI.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/studio"
            className="rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 py-3 font-semibold text-deep shadow-lg transition-transform hover:scale-[1.02]"
          >
            Mulai Sekarang
          </Link>
          <Link
            to="/panduan"
            className="rounded-lg border border-edge bg-panel px-6 py-3 font-semibold text-ink-dim hover:text-ink"
          >
            Lihat Panduan
          </Link>
        </div>

        <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 font-mono text-xs">
          {[
            ["720p–4K", "Resolusi export"],
            ["Rp 0", "Biaya AI bulanan"],
            ["100%", "Render di browser"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-edge bg-panel p-4">
              <dt className="text-lg font-bold text-primary">{v}</dt>
              <dd className="mt-1 text-[10px] uppercase tracking-widest text-muted">
                {l}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center font-mono text-[10px] uppercase tracking-widest text-muted">
          Kenapa Motion Easy
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article
              key={f.n}
              className="rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-bright"
            >
              <span className={`font-mono text-xs font-bold ${f.c}`}>
                {f.n}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
                {f.d}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-edge px-6 py-6 text-center font-mono text-[10px] text-muted">
        © 2026 Motion Easy · Aplikasi client-side ·{" "}
        <Link to="/privasi" className="underline hover:text-muted">
          Privasi &amp; Ketentuan
        </Link>
      </footer>
    </div>
  );
}
