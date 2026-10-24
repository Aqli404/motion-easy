import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import LandingAmbient from "../components/LandingAmbient";
import PricingSection from "../components/PricingSection";
import DemoGallery from "../components/DemoGallery";
import useReveal from "../hooks/useReveal";
import { FAQS, hargaRp } from "../config/paketData";
import { useHarga } from "../config/HargaContext";

import {
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Wand2,
  Clapperboard,
  BarChart3,
  FolderOpen,
  Tag,
  KeyRound,
  BookOpen,
  ArrowRight,
  X,
  MonitorUp,
  Package,
  Award,
  Star,
  Quote,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { LOADING_STEPS, useCanvasRedirect, type CanvasToolId } from "../config/canvastools";
import { useState, useEffect } from "react";

/* ================================================================
 * TOOL UTAMA — Prompt Engineer berjalan di Motion Easy AI Studio;
 * Motion Generator & Metadata Master berjalan LOKAL di /studio
 * (navigasi internal).
 * ================================================================ */
const TOOLS: {
  id: CanvasToolId | null;
  studioTab?: "video" | "metadata";
  icon: typeof Wand2;
  no: string;
  label: string;
  judul: string;
  deskripsi: string;
  poin: string[];
}[] = [
  {
    id: "promptengineering",
    icon: Wand2,
    no: "01",
    label: "Prompt Engineer",
    judul: "Generate Kode Animasi",
    deskripsi:
      "Upload video referensi → AI meracik prompt super-detail → AI Studio mengolah kode animasi draw() siap pakai di Motion Easy AI Studio.",
    poin: ["Upload / Paste / Link referensi", "Auto-cascade parameter", "Download .txt per konsep"],
  },
  {
    id: null,
    studioTab: "video",
    icon: Clapperboard,
    no: "02",
    label: "Motion Generator",
    judul: "Render Video 4K",
    deskripsi:
      "Tempel kode draw() → preview live di browser → render video MP4/MOV/WebM hingga 4K dengan padding microstock.",
    poin: ["Preview real-time 60 fps", "Export MP4 / MOV / Alpha", "Padding ISO-BMFF hingga 200 MB"],
  },
  {
    id: null,
    studioTab: "metadata",
    icon: BarChart3,
    no: "03",
    label: "Metadata Master",
    judul: "SEO Metadata Microstock",
    deskripsi:
      "AI menyusun judul, deskripsi, dan keywords teroptimasi untuk Adobe Stock, Shutterstock, hingga Freepik — langsung di dalam Studio.",
    poin: ["Multi-platform metadata", "IP & Trademark Guard otomatis", "Export CSV / TXT"],
  },
];

/* Akses cepat ke halaman lokal Motion Easy */
const AKSES_CEPAT = [
  { to: "/proyek", icon: FolderOpen, label: "Proyek Saya", hint: "Riwayat kerja" },
  { to: "/harga", icon: Tag, label: "Harga & Paket", hint: "Mulai Rp 0" },
  { to: "/lisensi", icon: KeyRound, label: "Aktivasi Lisensi", hint: "Kode member" },
  { to: "/panduan", icon: BookOpen, label: "Panduan", hint: "Cara pakai" },
];

const features = [
  {
    icon: Wand2,
    t: "Tulis Ide, Dapat Video 4K + Metadata",
    d: "Ketik ide → video 4K + metadata microstock langsung jadi di browser — tanpa buka After Effects.",
    tag: "Tulis Ide → Video Jadi",
  },
  {
    icon: Zap,
    t: "Rendering Instan 60 fps di Browser",
    d: "GPU perangkatmu merender via WebCodecs — preview real-time, theater full-res + safe-area 9:16, ekspor MP4 / MOV / WebM Alpha hingga 4K CBR.",
    tag: "Nol Waktu Tunggu",
  },
  {
    icon: Package,
    t: "Bulk ZIP + metadata.csv Sekaligus",
    d: "Ekspor variasi dari Prompt Engineer sebagai TXT/ZIP → impor di tab Bulk → antrean render batch → satu ZIP berisi semua video + metadata.csv otomatis. 100% lokal.",
    tag: "Fitur Premium",
  },
  {
    icon: BarChart3,
    t: "Metadata Microstock Siap Upload",
    d: "Judul 60–90 karakter, deskripsi 100–160, tepat 50 keyword bebas IP — langsung siap upload ke Adobe Stock & Shutterstock.",
    tag: "Siap Upload",
  },
];

/* 5 langkah ringkas untuk section Panduan di Landing */
const LANGKAH_PANDUAN: Array<{ n: number; icon: typeof Wand2; t: string; d: string }> = [
  {
    n: 1,
    icon: Wand2,
    t: "Prompt Engineer — AI Studio",
    d: "Buka Tool 01 di AI Studio Motion Easy, cukup login Google pribadimu. AI Studio meracik variasi kode draw() siap review.",
  },
  {
    n: 2,
    icon: MonitorUp,
    t: "Render Video & Theater Preview",
    d: "Tempel draw(ctx,time,width,height) di Motion Generator → preview realtime. Theater full-res + fullscreen (F) & safe-area 9:16.",
  },
  {
    n: 3,
    icon: Package,
    t: "Bulk ZIP Importer — Render Batch",
    d: "Ekspor variasi sebagai TXT/ZIP → impor di tab Bulk → antrean WebCodecs lokal → satu ZIP isi video + metadata.csv.",
  },
  {
    n: 4,
    icon: BarChart3,
    t: "Metadata SEO — metadata.csv otomatis",
    d: "Baris lahir otomatis saat render (50 keyword + judul 60–90 & desk 100–160). Perkaya via AI dengan kode + 5 thumbnail JPG.",
  },
  {
    n: 5,
    icon: Award,
    t: "Ekspor 4K Siap Jual (Premium)",
    d: "4K siap jual — ukuran otomatis cukup untuk lolos kurasi microstock.",
  },
];

/* Testimoni — random, cakup Gen Z & Gen X (sesuai request user) */
const TESTIMONI: Array<{ nama: string; peran: string; usia: string; isi: string }> = [
  {
    nama: "Alya Putri",
    peran: "Konten Kreator TikTok",
    usia: "22 th · Gen Z",
    isi: "Tampilannya simpel banget, nggak ribet sama sekali. Baru buka langsung paham — panduan langkah-langkahnya jelas. Cocok buat pemula kayak aku yang nggak ngerti After Effects.",
  },
  {
    nama: "Dimas Pratama",
    peran: "Mahasiswa & Freelance Editor",
    usia: "21 th · Gen Z",
    isi: "Sebelumnya coba tools lain pusing setting ini-itu. Di Motion Easy tinggal pilih tool, ikuti panduan, jadi. Paling suka preview live-nya — langsung kelihatan hasilnya sebelum ekspor.",
  },
  {
    nama: "Budi Hartono",
    peran: "Kontributor Microstock",
    usia: "42 th · Gen X",
    isi: "Sebagai yang bukan anak IT, saya cari yang praktis. Motion Easy panduannya runut, tidak banyak istilah aneh. Sekali baca panduan, langsung bisa bikin video siap upload ke microstock.",
  },
];

function TestimoniSection() {
  return (
    <section id="testimoni" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16" data-reveal>
      <div className="text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">Kata Mereka</span>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Dipercaya Kreator dari Berbagai Generasi</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-dim">
          Tampilan simpel, tidak ribet, panduan mudah dipahami — itu yang paling sering kami dengar.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TESTIMONI.map((t) => (
          <article key={t.nama} className="landing-glass flex flex-col rounded-2xl p-5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <Quote className="mt-3 h-5 w-5 text-white/15" />
            <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">“{t.isi}”</p>
            <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-[11px] font-black text-deep">
                {t.nama.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-ink">{t.nama}</p>
                <p className="font-mono text-[10px] text-muted">{t.peran} · {t.usia}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FaqLanding() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 pb-16" data-reveal>
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          <HelpCircle className="h-3.5 w-3.5" /> FAQ — Pertanyaan yang Sering Ditanyakan
        </span>
      </div>
      <div className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur">
        {FAQS.map((f, i) => (
          <div key={i}>
            <button
              aria-expanded={open === i}
              aria-controls={`faq-a-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-ink">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p id={`faq-a-${i}`} className="px-5 pb-4 text-xs leading-relaxed text-ink-dim">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function StickyCta() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-deep/90 px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:hidden ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
    >
      <div className="leading-tight">
        <p className="text-xs font-bold text-ink">Mulai Gratis · Rp 0</p>
        <p className="font-mono text-[10px] text-muted">3 ekspor/hari · tanpa kartu kredit</p>
      </div>
      <Link to="/studio" className="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-xs font-bold text-deep">
        Mulai
      </Link>
    </div>
  );
}

export default function Landing() {
  const redirect = useCanvasRedirect();
  const { bulanan, lifetime } = useHarga();
  const navigate = useNavigate();
  useReveal(true);

  return (
    <div className="relative isolate min-h-screen text-ink">
      <LandingAmbient />
      <div aria-hidden className="landing-grid pointer-events-none fixed inset-0 -z-10 hidden sm:block" />
      {/* Navbar — pill glass floating ala siaptuan */}
      <header className="sticky top-3 z-40 mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-deep/70 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight">
                MOTION <span className="text-accent">EASY</span>
              </div>
              <div className="font-mono text-[10px] text-muted">AI Motion Video Studio</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <a
              href="#panduan"
              className="hidden rounded-lg px-3 py-2 text-ink-dim transition-colors hover:text-ink sm:block"
            >
              Panduan
            </a>
            <a
              href="#harga"
              className="rounded-lg px-3 py-2 text-ink-dim transition-colors hover:text-ink"
            >
              Harga
            </a>
            <Link
              to="/lisensi"
              className="rounded-lg px-3 py-2 text-ink-dim transition-colors hover:text-ink"
            >
              Aktivasi Lisensi
            </Link>
            <a
              href="#tools"
              className="rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 font-semibold text-deep shadow-md transition-transform hover:scale-[1.02]"
            >
              Jelajahi Tools
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-6 pt-10 pb-14 text-center sm:pt-14" data-reveal>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] text-tertiary shadow-sm backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
          3 Tools AI · Ekspor 4K · 100% Client-Side
        </div>

        <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Bikin Video Motion untuk Microstock{" "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Tanpa After Effects
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-dim sm:text-lg">
          Tulis ide, dapat video 4K + metadata siap upload. Semua di browser.
        </p>

        {/* Harga singkat — jawab "berapa?" dalam 5 detik */}
        <p className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-1.5 font-mono text-[11px] font-semibold tracking-wide text-amber-300">
          <span>Gratis 3 ekspor/hari</span>
          <span className="text-amber-400/40">·</span>
          <span>{hargaRp(bulanan)}/bulan</span>
          <span className="text-amber-400/40">·</span>
          <span>{hargaRp(lifetime)} lifetime — hemat {hargaRp(12 * bulanan - lifetime)} vs 12× bulanan</span>
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/studio"
            className="rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 py-3.5 font-bold text-deep shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
          >
            Mulai Gratis di Studio
          </Link>
          <a href="#harga" className="font-mono text-xs text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
            Lihat Paket & Bonus →
          </a>
        </div>

        <p className="mt-3 text-xs text-muted">
          Buka langsung di Chrome/Edge desktop · Tidak butuh kartu kredit atau API key
        </p>

        <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 font-mono">
          {[
            ["3 Tools", "Satu Alur Produksi Lengkap"],
            ["4K Master", "Kualitas Ekspor Premium"],
            ["100% Lokal", "Privasi Aman di Komputer Sendiri"],
          ].map(([val, desc]) => (
            <div key={desc} className="landing-glass rounded-xl p-4 text-center">
              <dt className="text-xl font-extrabold text-primary sm:text-2xl">{val}</dt>
              <dd className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {desc}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ============ PANDUAN — 5 langkah ringkas (baru) ============ */}
      <section id="panduan" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16" data-reveal>
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
            Cara Kerja · 5 Langkah
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Dari Prompt ke File Microstock Siap Upload
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-dim">
            Pahami alurnya sekali, lalu langsung gas ke tool di bawah — tanpa lompat halaman.
          </p>
        </div>

        <ol className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LANGKAH_PANDUAN.map(({ n, icon: Icon, t, d }) => (
            <li
              key={n}
              className="landing-glass flex gap-3 rounded-2xl p-4 shadow-sm transition-all hover:-translate-y-0.5 lg:flex-col lg:gap-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel-high font-mono text-sm font-bold text-primary border border-primary/20 shadow-sm">
                {n}
              </span>
              <div className="min-w-0 lg:mt-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold leading-tight text-ink">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {t}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => redirect.buka("promptengineering")}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-deep shadow hover:scale-[1.01] transition-transform"
          >
            Mulai Prompt Engineer ↗ <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => void navigate("/studio")}
            className="rounded-xl border border-edge bg-panel px-5 py-2.5 text-sm font-semibold text-ink-dim hover:border-bright hover:text-ink"
          >
            Buka Motion Generator
          </button>
          <Link
            to="/panduan"
            className="font-mono text-[11px] text-muted underline hover:text-ink"
          >
            Panduan lengkap →
          </Link>
        </div>
      </section>

      {/* ============ 3 TOOL CARDS (AI Studio + lokal) ============ */}
      <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16" data-reveal>
        <div className="text-center">
          <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
            Pilih Tool
          </h2>
          <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            3 Fitur Utama Motion Easy
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-dim">
            Tool 01 berjalan di <strong className="text-ink">Motion Easy AI Studio</strong>. Tool 02 &amp; 03{" "}
            <strong className="text-ink">berjalan penuh di browser</strong> — langsung
            masuk ke Motion Generator Studio.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.no}
                onClick={() => {
                  if (tool.id) redirect.buka(tool.id);
                  else void navigate("/studio", { state: tool.studioTab ? { tab: tool.studioTab } : undefined });
                }}
                className="landing-glass group flex flex-col rounded-2xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
              >
                {/* Nomor + Label */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                    Tool {tool.no}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      tool.id
                        ? "border-tertiary/40 bg-tertiary/10 text-tertiary"
                        : "border-secondary/40 bg-secondary/10 text-secondary"
                    }`}
                  >
                    {tool.id ? "AI Studio" : "Running 100% Lokal"}
                  </span>
                </div>

                {/* Ikon */}
                <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/15 via-orange-500/15 to-rose-500/15 text-secondary transition-colors group-hover:from-amber-400 group-hover:to-rose-500 group-hover:text-deep">
                  <Icon className="h-6 w-6" />
                </div>

                {/* Judul */}
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-secondary">
                  {tool.label}
                </p>
                <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ink">
                  {tool.judul}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
                  {tool.deskripsi}
                </p>

                {/* Poin fitur */}
                <ul className="mt-4 space-y-1.5">
                  {tool.poin.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[12px] text-muted">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-secondary" />
                      {p}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-6 flex items-center justify-between border-t border-edge/60 pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {tool.no === "01" ? "Dapat kode draw()" : tool.no === "02" ? "Render & preview" : "Siap pakai"}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3.5 py-2 text-[12px] font-bold text-deep transition-transform group-hover:translate-x-0.5">
                    {tool.no === "01" ? "Prompt Engineer →" : tool.no === "02" ? "Buka Studio →" : "Lihat Metadata →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Akses cepat halaman lokal */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AKSES_CEPAT.map(({ to, icon: Icon, label, hint }) => (
            <Link
              key={to}
              to={to}
              className="landing-glass flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:-translate-y-0.5"
            >
              <Icon className="h-4 w-4 shrink-0 text-secondary" />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ DEMO GALLERY — 10 contoh live canvas ============ */}
      <DemoGallery />

      {/* ============ TESTIMONI — Gen Z ×2 + Gen X ×1 ============ */}
      <TestimoniSection />

      {/* ============ HARGA — 3 kartu ringkas (baru) ============ */}
      <section id="harga" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16" data-reveal>
        <div className="text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
            Harga & Paket
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Mulai Gratis, Upgrade Kapan Saja
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-dim">
            Tanpa kartu kredit untuk mulai. Klik beli langsung di sini — atau lihat perbandingan lengkap.
          </p>
        </div>
        <div className="mt-8">
          <PricingSection compact glass />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] text-muted">
          Ingin perbandingan fitur baris-per-baris & FAQ?{" "}
          <Link to="/harga" className="underline hover:text-ink">
            Buka halaman Harga lengkap →
          </Link>
        </p>
      </section>

      {/* ============ FAQ di Landing ============ */}
      <FaqLanding />

      {/* Feature Section */}
      <section className="mx-auto max-w-6xl px-6 pb-24" data-reveal>
        <div className="text-center">
          <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
            Kemudahan Alur Kerja
          </h2>
          <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Solusi untuk Kreator yang Mau Jual Video Tanpa Belajar After Effects
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.t}
                className="landing-glass flex flex-col justify-between rounded-2xl p-6 transition-all hover:-translate-y-1"
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
      <footer className="mt-4 border-t border-white/5 bg-deep/60 px-6 py-8 text-center font-mono text-[11px] text-muted backdrop-blur-md">
        <p>© 2026 Motion Easy · Client-Side Motion Studio · Privasi terjamin tanpa penyimpanan data cloud</p>
        <div className="mt-2 space-x-4">
          <Link to="/panduan" className="underline hover:text-ink">
            Panduan Pakai (lengkap)
          </Link>
          <Link to="/harga" className="underline hover:text-ink">
            Harga & Perbandingan
          </Link>
          <Link to="/privasi" className="underline hover:text-ink">
            Privasi &amp; Ketentuan
          </Link>
        </div>
      </footer>

      {/* Sticky CTA mobile — muncul setelah scroll (tanpa <script>, pakai scroll listener) */}
      <StickyCta />

      {/* ===== Loading Overlay (alá Omah AI — same-tab redirect) ===== */}
      {redirect.open && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-deep/95 backdrop-blur-md"
          onKeyDown={(e) => { if (e.key === "Escape") redirect.batal(); }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Memuat AI Studio"
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-lg shadow-orange-500/30">
            <span className="text-lg font-black tracking-tighter text-deep">ME</span>
          </div>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-muted">
            {TOOLS.find((t) => t.id === redirect.activeTool)?.label ?? "Prompt Engineering"}
          </p>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 w-72 overflow-hidden rounded-full bg-panel-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500 ease-out"
              style={{ width: `${redirect.pct}%` }}
            />
          </div>

          {/* Status text (berganti tiap 550ms) */}
          <p className="mt-4 text-[12px] font-semibold text-ink-dim">
            {LOADING_STEPS[redirect.step]}
          </p>

          <p className="mt-1 font-mono text-[10px] text-muted">{redirect.pct}%</p>

          <p className="mt-8 max-w-sm text-center font-mono text-[9px] leading-relaxed text-muted">
            Studio AI akan terbuka — cukup login Google kamu.
          </p>

          {/* Tombol batal + hint Esc (escape hatch anti-stuck) */}
          <button
            onClick={redirect.batal}
            className="mt-6 flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-3 py-1.5 text-[11px] font-semibold text-ink-dim transition-colors hover:bg-panel-high hover:text-ink"
          >
            <X className="h-3.5 w-3.5" /> Batalkan
          </button>
          <p className="mt-2 font-mono text-[9px] text-muted">
            tekan <kbd className="rounded bg-panel-high px-1 font-sans text-[8px]">Esc</kbd> untuk batal
          </p>
        </div>
      )}
    </div>
  );
}
