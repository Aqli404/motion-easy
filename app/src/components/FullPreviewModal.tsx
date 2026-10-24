/**
 * components/FullPreviewModal.tsx — Theater Full Preview untuk tab
 * Render Video & Bulk di /studio.
 *
 * Fitur:
 *  - Canvas dirender pada RESOLUSI ASLI preset lalu di-scale CSS →
 *    yang terlihat identik dengan hasil ekspor (bukan versi perkecil).
 *  - Fullscreen API asli: tombol, double-click canvas, keyboard `F`.
 *  - Kontrol overlay auto-hide (~2.6 detik idle saat playing).
 *  - Backdrop Gelap / Putih / Checkerboard-transparan (untuk menilai
 *    kontras + memastikan area alpha benar-benar tembus).
 *  - Safe-area TikTok (9:16) bisa ditumpangkan.
 *  - Keyboard: Spasi play/pause · ←/→ (nav antar-konsep bila disediakan,
 *    else seek ±1 dtk) · F fullscreen · Esc keluar.
 *  - Playback berdiri sendiri (instance useDrawPreview terpisah) sehingga
 *    tidak mengganggu preview utama di editor.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Rewind,
  X,
} from "lucide-react";
import { useDrawPreview, type KanvasDraw } from "../engine/preview";

export type BackdropMode = "dark" | "light" | "checker";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  compiled: KanvasDraw | Error;
  /** piksel kanvas tujuan (resolusi asli render) */
  width: number;
  height: number;
  durasi: number;
  /** navigasi antar-konsep (Bulk) — bila ada, ←/→ jadi pindah konsep */
  onPrev?: () => void;
  onNext?: () => void;
  counter?: string;
}

const GAYA_BACKDROP: Record<BackdropMode, CSSProperties> = {
  dark: { background: "#080b12" },
  light: { background: "#e9ebf2" },
  checker: {
    background:
      "repeating-conic-gradient(#1a1f2b 0% 25%, #10141d 0% 50%) 0 0 / 26px 26px",
  },
};

export default function FullPreviewModal({
  open,
  onClose,
  title,
  compiled,
  width,
  height,
  durasi,
  onPrev,
  onNext,
  counter,
}: Props) {
  const preview = useDrawPreview({ compiled, duration: durasi, width, height, autoplay: true });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const kunciTimer = useRef<number | null>(null);

  const [isFs, setIsFs] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropMode>("dark");
  const [showSafe, setShowSafe] = useState(height > width);
  const [kontrol, setKontrol] = useState(true);

  const pindahFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen().catch(() => {});
  };

  /* ===== Fullscreen API listener ===== */
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ===== Manipulasi kontrol otomatis ===== */
  const hidupkanKontrol = () => {
    setKontrol(true);
    if (kunciTimer.current !== null) window.clearTimeout(kunciTimer.current);
    kunciTimer.current = window.setTimeout(() => setKontrol(false), 2600);
  };

  useEffect(() => {
    if (!open) return;
    hidupkanKontrol();
    return () => {
      if (kunciTimer.current !== null) {
        window.clearTimeout(kunciTimer.current);
        kunciTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // saat pause: kontrol tetap tampil
  useEffect(() => {
    if (!open) return;
    if (!preview.playing) {
      if (kunciTimer.current !== null) {
        window.clearTimeout(kunciTimer.current);
        kunciTimer.current = null;
      }
      setKontrol(true);
    }
  }, [preview.playing, open]);

  /* ===== Keyboard shortcut ===== */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;

      if (e.key === " ") {
        e.preventDefault();
        preview.toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (onPrev) onPrev();
        else preview.seek(preview.time - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (onNext) onNext();
        else preview.seek(preview.time + 1);
      } else if (e.key === "f" || e.key === "F") {
        pindahFullscreen();
      } else if (e.key === "Escape") {
        // Esc di dalam fullscreen ditangani browser (keluar fullscreen).
        if (!document.fullscreenElement) onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, onPrev, onNext, preview.time]);

  if (!open) return null;

  const fmtTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  };

  const vis = kontrol ? "opacity-100" : "opacity-0 pointer-events-none";

  return (
    <div
      ref={wrapRef}
      onMouseMove={hidupkanKontrol}
      onTouchStart={hidupkanKontrol}
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={GAYA_BACKDROP[backdrop]}
    >
      {/* ===== Bar atas (auto-hide) ===== */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3 transition-opacity duration-300 ${vis}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white/90">{title ?? "Full Preview"}</p>
          <p className="font-mono text-[9px] text-white/50">
            {width}×{height} · {durasi}s · {backdrop === "light" ? "Latar Putih" : backdrop === "checker" ? "Latar Transparan" : "Latar Gelap"}
          </p>
        </div>

        {/* Toggle backdrop */}
        <div className="hidden gap-1 rounded-lg border border-white/15 bg-black/40 p-1 sm:flex">
          {([
            ["dark", "Gelap"],
            ["light", "Putih"],
            ["checker", "Transparan"],
          ] as [BackdropMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setBackdrop(mode)}
              className={`rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                backdrop === mode ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Safe area (canvas vertikal) */}
        {height > width && (
          <button
            onClick={() => setShowSafe((v) => !v)}
            title="Safe area UI TikTok"
            className={`hidden rounded-lg border px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors sm:block ${
              showSafe ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-black/40 text-white/60 hover:text-white"
            }`}
          >
            Safe Area
          </button>
        )}

        <button
          onClick={pindahFullscreen}
          title="Fullscreen (F)"
          className="rounded-lg border border-white/15 bg-black/40 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onClose}
          title="Tutup (Esc)"
          className="rounded-lg border border-white/15 bg-black/40 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ===== Navigasi kiri/kanan (Bulk) ===== */}
      {onPrev && (
        <button
          onClick={onPrev}
          className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-3 text-white/80 transition-colors duration-300 hover:bg-white/15 hover:text-white ${vis}`}
          title="Konsep sebelumnya (←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          className={`absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-3 text-white/80 transition-colors duration-300 hover:bg-white/15 hover:text-white ${vis}`}
          title="Konsep berikutnya (→)"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* ===== Canvas — resolusi asli di-scale ===== */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="relative inline-flex max-h-full max-w-full shadow-2xl shadow-black/50">
          <canvas
            ref={preview.canvasRef}
            onDoubleClick={pindahFullscreen}
            className="block max-h-[86vh] rounded-lg"
            style={{ maxWidth: "100%", height: "auto", width: "auto", maxHeight: isFs ? "100vh" : undefined }}
          />
          {height > width && showSafe && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-[12%] border-t border-dashed border-tertiary/50" />
              <div className="absolute inset-x-0 bottom-[20%] border-t border-dashed border-tertiary/50" />
              <span className="absolute left-2 top-[12%] -translate-y-full text-[10px] text-tertiary/80">Safe Area Atas</span>
              <span className="absolute bottom-[20%] left-2 text-[10px] text-tertiary/80">Safe Area Bawah (UI TikTok)</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Kontrol bawah (auto-hide) ===== */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 transition-opacity duration-300 ${vis}`}
      >
        <button
          onClick={preview.toggle}
          title="Play/Pause (Spasi)"
          className="rounded-lg bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
        >
          {preview.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={preview.rewind} title="Rewind ke 0" className="rounded-lg p-2 text-white/70 transition-colors hover:text-white">
          <Rewind className="h-4 w-4" />
        </button>
        <span className="shrink-0 font-mono text-[10px] text-white/80">{fmtTime(preview.time)}</span>
        <input
          type="range"
          min={0}
          max={durasi}
          step={0.01}
          value={preview.time}
          onChange={(e) => preview.seek(Number(e.target.value))}
          className="flex-1 accent-accent"
        />
        <span className="shrink-0 font-mono text-[10px] text-white/50">/ {fmtTime(durasi)}</span>
        <select
          value={preview.speed}
          onChange={(e) => preview.setSpeed(Number(e.target.value))}
          className="shrink-0 rounded border border-white/20 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white/80"
        >
          {[0.25, 0.5, 1, 1.5, 2].map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        {counter && (
          <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/50 sm:block">{counter}</span>
        )}
      </div>

      {/* Hint keyboard sekali di pojok */}
      <p className={`absolute left-1/2 top-16 -translate-x-1/2 font-mono text-[9px] text-white/40 transition-opacity duration-300 ${vis}`}>
        Spasi = play/pause · ←/→ = {onPrev ? "pindah konsep" : "seek ±1s"} · F = fullscreen · Esc = keluar
      </p>
    </div>
  );
}
