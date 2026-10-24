import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileCode2,
  FolderOpen,
  Tag,
  KeyRound,
  Sparkles,
  Menu,
  X,
  Wand2,
  Clapperboard,
  Cpu,
  DollarSign,
  ArrowUpRight,
  ClockAlert,
} from "lucide-react";
import Logo from "./Logo";
import { webCodecsSupported } from "../export/encoder";
import { CANVAS_URLS } from "../config/canvastools";
import { isJamMundur, pesanJamMundur } from "../license/license";

type NavItem = { to: string; label: string; icon: typeof Wand2; hint: string; ext?: string };

const nav: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { to: CANVAS_URLS.promptengineering, label: "Prompt Engineer", icon: Wand2, hint: "Buka tab baru ↗", ext: CANVAS_URLS.promptengineering },
      { to: "/studio", label: "Motion Generator", icon: Clapperboard, hint: "Buat Video" },
    ],
  },
  {
    group: "Referensi",
    items: [
      { to: "/skema", label: "Contoh Animasi", icon: FileCode2, hint: "Lihat contoh" },
      { to: "/panduan", label: "Panduan", icon: BookOpen, hint: "Cara pakai" },
      { to: "/proyek", label: "Proyek Saya", icon: FolderOpen, hint: "Riwayat" },
    ],
  },
  {
    group: "Akun & Dukungan",
    items: [
      { to: "/harga", label: "Harga & Paket", icon: Tag, hint: "Upgrade" },
      { to: "/lisensi", label: "Buka Fitur Premium", icon: KeyRound, hint: "Aktivasi kode" },
    ],
  },
];

const TAB_UTAMA: { to?: string; ext?: string; label: string }[] = [
  { ext: CANVAS_URLS.promptengineering, label: "1. PROMPT ENGINEER" },
  { to: "/studio", label: "2. MOTION GENERATOR" },
];

export default function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [jamMundur, setJamMundur] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const webcodecs = webCodecsSupported();

  useEffect(() => {
    const cek = () => setJamMundur(isJamMundur());
    cek();
    const id = setInterval(cek, 2000);
    const onVis = () => { if (!document.hidden) cek(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", cek);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("storage", cek); };
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* ===== Latar gelap di belakang drawer (hanya layar sempit) ===== */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ===== Sidebar (drawer di layar sempit) ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-edge bg-panel-low transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-edge px-5 py-4">
          <Logo className="h-9 w-9" />
          <div className="flex-1 leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              MOTION <span className="text-accent">EASY</span>
            </div>
            <div className="font-mono text-[10px] text-muted">
              AI Motion Video Studio
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-muted hover:bg-panel hover:text-ink lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-3">
          {nav.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 pb-1 font-mono text-[8px] uppercase tracking-widest text-muted">{group}</p>
              <div className="space-y-1">
                {items.map(({ to, label, icon: Icon, hint, ext }) =>
                  ext ? (
                    <a
                      key={to}
                      href={ext}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      title="Buka Motion Easy AI Studio — tab baru"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim transition-colors hover:bg-panel hover:text-ink"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      <span className="flex items-center gap-0.5 rounded-full border border-tertiary/30 bg-tertiary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-tertiary">
                        {hint}
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </a>
                  ) : (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-panel-high font-semibold text-primary"
                          : "text-ink-dim hover:bg-panel hover:text-ink"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                      {hint}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-edge p-3">
          <div className="rounded-lg bg-panel p-3">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-tertiary" />
              <span className="font-semibold text-tertiary">Paket Gratis</span>
            </div>
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted">
              720p gratis · 3 ekspor/hari · upgrade di Harga
            </p>
          </div>
        </div>
      </aside>

      {/* ===== Area kanan ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3 sm:px-6">
          {/* Branding + Tab Switcher + Status (sesuai spesifikasi header suite) */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 rounded-md border border-edge p-2 text-ink-dim hover:bg-panel hover:text-ink lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-extrabold tracking-tight">
                MOTION <span className="text-accent">EASY</span>
              </div>
              <div className="font-mono text-[9px] text-muted">AI Motion Video Suite</div>
            </div>
          </div>

          {/* Tab Switcher di tengah header */}
          <nav className="flex items-center gap-1 rounded-lg border border-edge bg-panel-low p-1">
            {TAB_UTAMA.map((t) =>
              t.ext ? (
                <a
                  key={t.label}
                  href={t.ext}
                  target="_blank"
                  rel="noreferrer"
                  title="Buka Motion Easy AI Studio — tab baru"
                  className="flex items-center gap-1 rounded-md border border-tertiary/20 bg-tertiary/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-tertiary transition-colors hover:bg-tertiary/20"
                >
                  {t.label}
                  <span className="rounded bg-tertiary px-1 py-0.5 text-[7px] leading-none text-deep">↗ TAB BARU</span>
                </a>
              ) : (
                <button
                  key={t.to}
                  onClick={() => t.to && navigate(t.to)}
                  className={`rounded-md px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    pathname === t.to ? "bg-panel-high text-primary" : "text-muted hover:text-ink-dim"
                  }`}
                >
                  {t.label}
                </button>
              ),
            )}
          </nav>

          {/* Indikator status engine di kanan */}
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${
                webcodecs ? "border-tertiary/40 bg-tertiary/10 text-tertiary" : "border-error/40 bg-error/10 text-error"
              }`}
              title={webcodecs ? "WebCodecs tersedia — ekspor 4K didukung" : "WebCodecs tidak tersedia"}
            >
              <Cpu className="h-3 w-3" /> WebCodecs Hardware 4K Ready
            </span>
            <span
              className="hidden items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-secondary sm:flex"
              title="Render 100% lokal di browser — tanpa biaya server"
            >
              <DollarSign className="h-3 w-3" /> Zero-Cost Engine
            </span>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {jamMundur && (
            <div className="flex items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 font-mono text-[11px] leading-relaxed text-amber-700 sm:px-6">
              <ClockAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{pesanJamMundur()}</span>
              <button onClick={() => location.reload()} className="ml-auto shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-700">Muat ulang</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
