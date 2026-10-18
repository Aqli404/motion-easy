import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Clapperboard,
  BookOpen,
  FileCode2,
  FolderOpen,
  Tag,
  KeyRound,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import Logo from "./Logo";

const nav = [
  { to: "/studio", label: "Studio", icon: Clapperboard, hint: "Editor" },
  { to: "/skema", label: "Kamus Animasi", icon: FileCode2, hint: "Spesifikasi" },
  { to: "/panduan", label: "Panduan", icon: BookOpen, hint: "Cara pakai" },
  { to: "/proyek", label: "Proyek Saya", icon: FolderOpen, hint: "Segera" },
  { to: "/harga", label: "Harga & Paket", icon: Tag, hint: "Upgrade" },
  { to: "/lisensi", label: "Aktivasi Lisensi", icon: KeyRound, hint: "Kode" },
];

const titles: Record<string, string> = {
  "/studio": "Studio Editor",
  "/skema": "Kamus Animasi (MotionDefinition)",
  "/panduan": "Panduan Penggunaan",
  "/proyek": "Proyek Saya",
  "/harga": "Harga & Paket",
  "/lisensi": "Aktivasi Lisensi",
  "/privasi": "Privasi & Ketentuan",
};

export default function Shell() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Motion Easy";
  const [menuOpen, setMenuOpen] = useState(false);

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

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ to, label, icon: Icon, hint }) => (
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
        </nav>

        <div className="border-t border-edge p-3">
          <div className="rounded-lg bg-panel p-3">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-tertiary" />
              <span className="font-semibold text-tertiary">Paket Gratis</span>
            </div>
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted">
              720p &amp; 1080p gratis · upgrade di Harga
            </p>
          </div>
        </div>
      </aside>

      {/* ===== Area kanan ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 rounded-md border border-edge p-2 text-ink-dim hover:bg-panel hover:text-ink lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-sm font-semibold">{title}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-edge bg-panel px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            v0.5 · Client-side
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
