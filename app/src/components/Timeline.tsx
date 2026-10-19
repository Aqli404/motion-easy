import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MotionDefinition, LayerSpec } from "../engine/schema";

/**
 * Timeline drag (B4): bar per layer (time.from–time.to) di atas ruler detik.
 * - Tarik badan bar → pindahkan waktu tampil layer (clamp dalam track).
 * - Tarik tepi kiri/kanan → pangkas (trim), span minimal 0,2 dtk, snap 0,05.
 * - Klik latar track kosong atau ruler → seek preview.
 * - Gutter kiri menampilkan nama layer agar label tak terpotong di bar pendek;
 *   area track dibatasi ~9 baris (scroll untuk layer lebih banyak) dan bisa
 *   dilipat (chevron, pilihan diingat di localStorage).
 * Saat menyeret, def diperbarui lewat onDraft (tanpa history); saat lepas,
 * hasil terakhir + snapshot pre-drag dikirim ke onCommit sehingga Undo/Redo
 * = 1 langkah per seretan. Hasil draft disimpan di ref supaya komit tak
 * bergantung pada saat React melakukan render ulang.
 */
interface TimelineProps {
  def: MotionDefinition;
  playheadRef: RefObject<HTMLDivElement | null>;
  onSeek: (t: number) => void;
  onDraft: (next: MotionDefinition) => void;
  /** next = hasil seretan terakhir; asal = def sebelum gestur mulai (untuk history). */
  onCommit: (next: MotionDefinition, asal: MotionDefinition) => void;
}

type Mode = "move" | "left" | "right" | "seek";

const SNAP = 0.05; // ujung menempel ke 0,05 dtk agar mudah segaris
const MIN_SPAN = 0.2;

export default function Timeline({ def, playheadRef, onSeek, onDraft, onCommit }: TimelineProps) {
  const [lipat, setLipat] = useState(() => {
    try { return localStorage.getItem("timeline-lipat") === "1"; } catch { return false; }
  });
  const toggleLipat = () =>
    setLipat((n) => {
      try { localStorage.setItem("timeline-lipat", n ? "0" : "1"); } catch { /* private mode: abaikan */ }
      return !n;
    });

  const trackRef = useRef<HTMLDivElement | null>(null);
  const asal = useRef<MotionDefinition>(def); // snapshot pre-drag untuk history
  const hasil = useRef<MotionDefinition | null>(null); // hasil draft terakhir
  const geser = useRef<null | {
    mode: Mode;
    id: string;
    startX: number;
    startFrom: number;
    startTo: number;
    durasi: number;
    lebarPx: number;
  }>(null);

  const xKeWaktu = (clientX: number, lebarPx: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    const w = lebarPx || (rect?.width ?? 1);
    const x = clientX - (rect?.left ?? 0);
    return Math.max(0, Math.min(def.canvas.durationSec, (x / Math.max(1, w)) * def.canvas.durationSec));
  };

  const mulai = (event: ReactPointerEvent<HTMLElement>, mode: Mode, l?: { id: string; time: { from: number; to: number } }) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (mode !== "seek") event.stopPropagation();
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* capture gagal di event sintetis — tetap jalan lewat bubbling */ }
    hasil.current = null;
    if (mode === "seek" || !l) {
      onSeek(xKeWaktu(event.clientX, rect?.width ?? 0));
      geser.current = { mode: "seek", id: "", startX: event.clientX, startFrom: 0, startTo: 0, durasi: def.canvas.durationSec, lebarPx: rect?.width ?? 1 };
      return;
    }
    asal.current = def;
    geser.current = {
      mode,
      id: l.id,
      startX: event.clientX,
      startFrom: l.time.from,
      startTo: l.time.to,
      durasi: def.canvas.durationSec,
      lebarPx: rect?.width ?? 1,
    };
  };

  const gerak = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = geser.current;
    if (!g) return;
    if (g.mode === "seek") {
      onSeek(xKeWaktu(event.clientX, g.lebarPx));
      return;
    }
    const dt = (event.clientX - g.startX) / Math.max(1, g.lebarPx) * g.durasi;
    const tap = (v: number) => Math.round(v / SNAP) * SNAP;
    const layers = def.layers.map((l): LayerSpec => {
      if (l.id !== g.id) return l;
      let from = g.startFrom;
      let to = g.startTo;
      if (g.mode === "move") {
        const span = to - from;
        from = Math.max(0, Math.min(g.durasi - span, from + dt));
        to = from + span;
      } else if (g.mode === "left") {
        from = Math.max(0, Math.min(to - MIN_SPAN, from + dt));
      } else {
        to = Math.max(from + MIN_SPAN, Math.min(g.durasi, to + dt));
      }
      from = tap(from);
      to = tap(to);
      if (to - from < MIN_SPAN) {
        if (g.mode === "left") from = to - MIN_SPAN;
        else to = from + MIN_SPAN;
      }
      from = Math.round(Math.max(0, from) * 1000) / 1000;
      to = Math.round(Math.min(g.durasi, to) * 1000) / 1000;
      return { ...l, time: { from, to } };
    });
    hasil.current = { ...def, layers };
    onDraft(hasil.current);
  };

  const lepas = () => {
    const g = geser.current;
    geser.current = null;
    if (g && g.mode !== "seek") {
      const next = hasil.current ?? def;
      hasil.current = null;
      onCommit(next, asal.current);
    }
  };

  const total = def.canvas.durationSec;
  const persen = (t: number) => `${Math.max(0, Math.min(100, (t / Math.max(0.001, total)) * 100))}%`;
  const ticks: number[] = [];
  const langkahTick = total > 30 ? 2 : total > 12 ? 1 : 0.5;
  for (let t = 0; t <= total + 0.001; t += langkahTick) ticks.push(t);

  return (
    <div className="hidden shrink-0 select-none border-t border-edge bg-well md:block" aria-label="Timeline layer">
      {/* Kepala: lipat/buka + ringkas */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          onClick={toggleLipat}
          className="flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:bg-panel-low hover:text-ink-dim"
          title={lipat ? "Buka timeline" : "Lipat timeline"}
        >
          {lipat ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Timeline · {def.layers.length} layer
        </button>
        <span className="ml-auto hidden font-mono text-[9px] text-muted lg:block">
          geser bar = pindah · tarik tepi = trim · klik latar = seek
        </span>
      </div>
      {!lipat && (
        <div
          className="relative px-3 pb-2"
          onPointerMove={gerak}
          onPointerUp={lepas}
          onPointerCancel={lepas}
        >
          {/* Ruler (lebar mengikuti kolom track, mengarah lewat gutter) */}
          <div className="flex items-end gap-2">
            <span className="w-24 shrink-0 pb-0.5 font-mono text-[8px] uppercase tracking-widest text-muted">
              layer
            </span>
            <div
              aria-label="Ruler timeline"
              className="relative h-3 flex-1 cursor-pointer rounded bg-panel"
              onPointerDown={(e) => mulai(e, "seek")}
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`absolute top-0 h-full w-px bg-edge ${t >= 1 ? "" : "opacity-60"}`}
                  style={{ left: persen(t) }}
                >
                  {Math.abs(t % 1) < 0.001 && (
                    <b className="absolute left-1 top-0 font-mono text-[8px] font-normal not-italic text-muted">{t}s</b>
                  )}
                </span>
              ))}
            </div>
          </div>
          {/* Track + gutter nama (scroll bersama bila layer banyak) */}
          <div className="mt-1 flex max-h-40 gap-2 overflow-y-auto pr-1">
            <div className="w-24 shrink-0 space-y-0.5 py-1">
              {def.layers.map((l) => (
                <div
                  key={l.id}
                  className="flex h-4 items-center overflow-hidden font-mono text-[9px] leading-none text-muted"
                >
                  <span className="truncate" title={l.name ?? l.id}>{l.name ?? l.id}</span>
                </div>
              ))}
            </div>
            <div
              ref={trackRef}
              aria-label="Track timeline"
              className="relative flex-1 space-y-0.5 rounded bg-panel-low/50 p-1"
              onPointerDown={(e) => { if (e.target === e.currentTarget) mulai(e, "seek"); }}
            >
              {def.layers.map((l) => (
                <div key={l.id} className="relative h-4">
                  <div
                    role="button"
                    aria-label={`Bar waktu ${l.name ?? l.id}`}
                    title={`${l.name ?? l.id} · ${l.time.from.toFixed(2)}s–${l.time.to.toFixed(2)}s`}
                    className="absolute top-0 flex h-full min-w-[14px] cursor-grab items-center overflow-hidden rounded border border-accent/50 bg-accent/20 text-[9px] text-primary active:cursor-grabbing"
                    style={{ left: persen(l.time.from), width: persen(l.time.to - l.time.from) }}
                    onPointerDown={(e) => mulai(e, "move", l)}
                  >
                    <span
                      aria-label={`Trim kiri ${l.name ?? l.id}`}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-accent/50"
                      onPointerDown={(e) => mulai(e, "left", l)}
                    />
                    <span className="pointer-events-none truncate px-2 font-mono">{l.name ?? l.id}</span>
                    <span
                      aria-label={`Trim kanan ${l.name ?? l.id}`}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-accent/50"
                      onPointerDown={(e) => mulai(e, "right", l)}
                    />
                  </div>
                </div>
              ))}
              {/* Playhead (posisi disetel langsung oleh player, tanpa re-render) */}
              <div
                ref={playheadRef}
                className="pointer-events-none absolute -top-1 bottom-0 z-10 w-px bg-primary"
                style={{ left: "0%" }}
              >
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
