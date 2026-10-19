import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Download,
  Camera,
  Package,
  Crown,
  Activity,
  Cpu,
  Lock,
  FileImage,
  Sparkles,
} from "lucide-react";
import Modal from "../components/Modal";
import AiPanel from "../components/AiPanel";
import ExportModal from "../components/ExportModal";
import BulkModal from "../components/BulkModal";
import SvgControls from "../components/SvgControls";
import Timeline from "../components/Timeline";
import SequenceModal from "../components/SequenceModal";
import SvgAiModal from "../components/SvgAiModal";
import { SAMPLES, SAMPLE_KEYS } from "../engine/samples";
import { renderFrame, activeLayerCount } from "../engine/renderer";
import { usePlayer } from "../engine/player";
import { useLicense } from "../license/useLicense";
import { premiumEfektif } from "../license/license";
import { useKuota } from "../license/kuota";
import type { MotionDefinition, MotionSpec } from "../engine/schema";
import { prepareImageAssets, svgToMotionDefinition } from "../engine/svg";
import { MAX_PROJECT_BYTES, openProject, projectText } from "../engine/project";
import { slugify } from "../export/presets";
import { unduhBlob } from "../export/encoder";

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

export default function Studio() {
  const [defId, setDefId] = useState(SAMPLE_KEYS[0]);
  const [custom, setCustomState] = useState<MotionDefinition | null>(null);
  const [history, setHistory] = useState<{ past: MotionDefinition[]; future: MotionDefinition[] }>({ past: [], future: [] });
  const adalahKustom = custom !== null;
  const def: MotionDefinition =
    custom ?? SAMPLES[defId]?.def ?? SAMPLES[SAMPLE_KEYS[0]].def;
  const duration = def.canvas.durationSec;
  const setCustom = (next: MotionDefinition | null) => {
    if (next === def) return;
    setHistory((state) => ({ past: [...state.past.slice(-29), def], future: [] }));
    setCustomState(next);
  };
  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({ past: history.past.slice(0, -1), future: [def, ...history.future] });
    setCustomState(previous);
  };
  const redo = () => {
    const next = history.future[0];
    if (!next) return;
    setHistory({ past: [...history.past, def], future: history.future.slice(1) });
    setCustomState(next);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  // draw terkini: diperbarui tiap render, dipakai player via ref
  const drawRef = useRef<(t: number) => void>(() => {});
  drawRef.current = (t: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    renderFrame(ctx, def, t);
    if (labelRef.current) labelRef.current.textContent = fmt(t);
    if (sliderRef.current) sliderRef.current.value = String(t);
    if (countRef.current)
      countRef.current.textContent = `${activeLayerCount(def, t)}/${def.layers.length}`;
    if (playheadRef.current)
      playheadRef.current.style.left = `${(Math.min(t, duration) / Math.max(0.001, duration)) * 100}%`;
  };

  const player = usePlayer((t) => drawRef.current(t), duration);
  // Timeline drag: playhead diperbarui langsung dari draw callback (tanpa re-render).
  const playheadRef = useRef<HTMLDivElement | null>(null);

  // setup canvas + reset saat definisi berganti
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = def.canvas.w;
    c.height = def.canvas.h;
    ctxRef.current = c.getContext("2d");
    let active = true;
    prepareImageAssets(def).then(() => {
      if (active && ctxRef.current) renderFrame(ctxRef.current, def, player.getTime());
    }).catch((error: Error) => { if (active) setSvgError(error.message); });
    if (ctxRef.current) renderFrame(ctxRef.current, def, player.getTime());
    if (sliderRef.current) {
      sliderRef.current.max = String(duration);
      sliderRef.current.value = String(Math.min(player.getTime(), duration));
    }
    if (labelRef.current) labelRef.current.textContent = fmt(Math.min(player.getTime(), duration));
    if (countRef.current)
      countRef.current.textContent = `0/${def.layers.length}`;
    return () => { active = false; };
  }, [def, duration]);

  const [exportOpen, setExportOpen] = useState(false);
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const [svgAiOpen, setSvgAiOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLockOpen, setBulkLockOpen] = useState(false);
  const [svgError, setSvgError] = useState("");
  const svgInputRef = useRef<HTMLInputElement | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectMessage, setProjectMessage] = useState("");

  const importProject = async (file: File) => {
    setProjectBusy(true);
    setSvgError("");
    setProjectMessage("");
    try {
      if (file.size > MAX_PROJECT_BYTES) throw new Error("Proyek terlalu besar. Maksimal 12 MB.");
      const next = await openProject(await file.text());
      player.pause();
      setCustom(next);
      player.seek(0);
      setProjectMessage(`Proyek dibuka: ${next.name}`);
    } catch (error) { setSvgError((error as Error).message); }
    finally { setProjectBusy(false); if (projectInputRef.current) projectInputRef.current.value = ""; }
  };
  const saveProject = () => {
    try {
      unduhBlob(new Blob([projectText(def)], { type: "application/json" }), `${slugify(def.name)}.motion.json`);
      setProjectMessage("File proyek diunduh. Simpan file ini untuk membuka kembali pengaturan dan asset SVG.");
      setSvgError("");
    } catch (error) { setSvgError((error as Error).message); }
  };

  const lic = useLicense();
  const premium = premiumEfektif(lic);
  const kuota = useKuota(premium);

  const importSvg = async (file: File) => {
    setSvgError("");
    try {
      if (!file.name.toLowerCase().endsWith(".svg")) throw new Error("Pilih file SVG.");
      if (file.size > 2_000_000) throw new Error("File SVG terlalu besar. Maksimal 2 MB.");
      const source = await file.text();
      const imported = svgToMotionDefinition(file.name, source);
      await prepareImageAssets(imported);
      setCustom(imported);
      setSvgError("");
      player.seek(0);
    } catch (error) {
      setSvgError((error as Error).message || "SVG tidak dapat diimpor.");
    } finally {
      if (svgInputRef.current) svgInputRef.current.value = "";
    }
  };

  // ===== Quick Wins =====

  /** Simpan frame saat ini sebagai PNG resolusi penuh definisi (thumbnail/cover). */
  const ambilCover = () => {
    const c = document.createElement("canvas");
    c.width = def.canvas.w;
    c.height = def.canvas.h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Kalau frame saat ini "blank" (kontras ~0, mis. t=0 belum ada yang
    // masuk), scan kandidat frame dan pilih yang paling ramai — diukur
    // LANGSUNG dari hasil render, bukan dari daftar layer.
    const kontrasDi = (waktu: number) => {
      const s = document.createElement("canvas");
      s.width = 160;
      s.height = Math.max(1, Math.round((160 * def.canvas.h) / def.canvas.w));
      const sx = s.getContext("2d");
      if (!sx) return -1;
      renderFrame(sx, def, waktu);
      const d = sx.getImageData(0, 0, s.width, s.height).data;
      let mn = 999, mx = -1;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > mx) mx = d[i];
        if (d[i] < mn) mn = d[i];
      }
      return mx - mn;
    };
    let t = player.getTime();
    if (kontrasDi(t) < 24) {
      const dur = def.canvas.durationSec;
      const kandidat = [0.35, 0.5, 0.25, 0.7, 0.85];
      let terbaikK = kontrasDi(t);
      for (const f of kandidat) {
        const cand = dur * f;
        const k = kontrasDi(cand);
        if (k > terbaikK) {
          terbaikK = k;
          t = cand;
        }
      }
    }
    renderFrame(ctx, def, t);
    const slug = def.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cover-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, "image/png");
  };

  /**
   * Ubah durasi: SEMUA waktu layer (from/to + motion.at + motion.before)
   * ikut diskalakan proporsional, jadi koreografi tetap utuh.
   */
  const ubahDurasi = (d: number) => {
    const old = def.canvas.durationSec;
    if (Math.abs(old - d) < 0.05) return;
    const k = d / old;
    const layers = def.layers.map((l) => {
      const from = Math.min(d - 0.2, Math.max(0, l.time.from * k));
      const to = Math.max(from + 0.2, Math.min(d, l.time.to * k));
      const mo: MotionSpec | undefined = l.motion;
      const span = Math.max(0.2, to - from);
      const inM = mo?.in
        ? { ...mo.in, at: Math.max(0, Math.min(span - 0.1, (mo.in.at ?? 0) * k)) }
        : undefined;
      const outM = mo?.out
        ? { ...mo.out, before: Math.max(0, Math.min(span - 0.1, (mo.out.before ?? 0) * k)) }
        : undefined;
      return {
        ...l,
        time: { from: Number(from.toFixed(3)), to: Number(to.toFixed(3)) },
        motion: mo ? { ...mo, in: inM, out: outM } : undefined,
      };
    });
    setCustom({
      ...def,
      name: `${def.name} · ${d}s`,
      notes: "durasi diubah lewat preset durasi Studio",
      canvas: { ...def.canvas, durationSec: d },
      layers,
    });
    player.seek(0);
  };

  // Timeline drag: menyeret memperbarui def tanpa menambah history (mulus);
  // lepas → komit sekali bersama snapshot pre-drag sehingga Undo/Redo
  // = 1 langkah per seretan.
  const setTimelineDraft = (next: MotionDefinition) => setCustomState(next);
  const commitTimeline = (next: MotionDefinition, asal: MotionDefinition) => {
    if (next === asal) return;
    setHistory((state) => ({ past: [...state.past.slice(-29), asal], future: [] }));
    setCustomState(next);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={projectBusy} onClick={() => projectInputRef.current?.click()}>{projectBusy ? "Membuka…" : "Buka proyek"}</button>
        <button className="rounded border border-edge px-3 py-2" onClick={saveProject}>Simpan proyek</button>
        <button className="rounded border border-edge px-3 py-2" onClick={() => { player.pause(); setSequenceOpen(true); }}>PNG Sequence ZIP</button>
        <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={!history.past.length} onClick={undo}>Undo</button>
        <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={!history.future.length} onClick={redo}>Redo</button>
        <span role="status" className="text-muted">{projectMessage || "Proyek disimpan sebagai file lokal, bukan otomatis di cloud."}</span>
        <input aria-label="File proyek Motion Easy" ref={projectInputRef} className="hidden" type="file" accept=".json,application/json" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importProject(file); }} />
      </div>
      {/* Baris atas: pilih sample + sumber + aksi */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Sample
        </span>
        {SAMPLE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => { setCustom(null); setDefId(k); player.reset(); }}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              !adalahKustom && defId === k
                ? "border-accent bg-panel-high font-semibold text-primary"
                : "border-edge bg-panel-low text-ink-dim hover:bg-panel"
            }`}
          >
            {SAMPLES[k].label}
          </button>
        ))}
        {adalahKustom && (
          <span className="flex items-center gap-1.5 rounded-lg border border-secondary/50 bg-secondary/10 px-2.5 py-1.5 text-xs text-secondary">
            <Cpu className="h-3.5 w-3.5" /> Proyek: {def.name}
          </span>
        )}
        <input
          ref={svgInputRef}
          type="file"
          accept="image/svg+xml,.svg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importSvg(file);
          }}
        />
        <button
          onClick={() => svgInputRef.current?.click()}
          title="Impor SVG menjadi layer animasi"
          className="flex items-center gap-1.5 rounded-md border border-secondary/40 bg-secondary/10 px-2.5 py-1.5 text-xs text-secondary hover:bg-secondary/20"
        >
          <FileImage className="h-3.5 w-3.5" /> SVG Motion
        </button>
        <button
          onClick={() => setSvgAiOpen(true)}
          title="Buat SVG berlapis via prompt ke AI (Gemini/ChatGPT/Claude)"
          className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/20"
        >
          <Sparkles className="h-3.5 w-3.5" /> SVG dari AI
        </button>
        {svgError && <span role="alert" className="max-w-xs text-[10px] text-error">{svgError}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-muted sm:block">
            {def.canvas.w}×{def.canvas.h} · {def.canvas.fps} fps ·{" "}
            {def.canvas.durationSec.toFixed(1)}s · {def.layers.length} layer
          </span>
          {kuota.unlimited ? (
            <span className="hidden items-center gap-1 rounded-md border border-tertiary/40 bg-tertiary/10 px-2 py-1 font-mono text-[9px] text-tertiary md:flex">
              <Crown className="h-2.5 w-2.5" /> ekspor tanpa batas
            </span>
          ) : (
            <span
              className={`hidden items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] md:flex ${
                kuota.remaining > 0
                  ? "border-edge bg-panel-low text-muted"
                  : "border-error/40 bg-error/10 text-error"
              }`}
              title={`Kuota ekspor gratis harian: ${kuota.used}/${kuota.limit} terpakai`}
            >
              {kuota.remaining > 0
                ? `kuota gratis ${kuota.remaining}/${kuota.limit}`
                : "kuota habis"}
            </span>
          )}
          <div className="hidden items-center gap-0.5 md:flex" title="Preset durasi — gerak ikut diskalakan">
            {[5, 10, 15, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => ubahDurasi(d)}
                className={`rounded-md border px-1.5 py-1 font-mono text-[10px] transition-colors ${
                  Math.abs(duration - d) < 0.05
                    ? "border-accent bg-panel-high font-semibold text-primary"
                    : "border-edge bg-panel-low text-muted hover:text-ink-dim"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
          <button
            onClick={() => (premium ? setBulkOpen(true) : setBulkLockOpen(true))}
            title="Bulk ZIP — render banyak karya sekaligus jadi 1 file ZIP (Premium)"
            className="relative rounded-md border border-edge bg-panel p-2 text-ink-dim hover:text-secondary"
          >
            <Package className="h-4 w-4" />
            {!premium && (
              <Lock className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-primary" />
            )}
          </button>
          <button
            onClick={ambilCover}
            title="Simpan Cover (PNG resolusi penuh, frame saat ini)"
            className="rounded-md border border-edge bg-panel p-2 text-ink-dim hover:text-secondary"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExportOpen(true)}
            title="Ekspor Video MP4"
            className="rounded-md border border-edge bg-panel p-2 text-ink-dim hover:text-ink"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPremiumOpen(true)}
            title="Buka 2K / 4K (Premium)"
            className="rounded-md border border-edge bg-panel p-2 text-primary hover:text-accent"
          >
            <Crown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {def.layers.some((layer) => layer.tag === "svg") && <SvgControls def={def} onChange={setCustom} />}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Kiri: layer list */}
        <aside className="hidden w-56 shrink-0 flex-col rounded-xl border border-edge bg-panel-low p-3 lg:flex">
          <h2 className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            <Layers className="h-3.5 w-3.5" /> Layer
          </h2>
          <div className="mt-1 flex items-center gap-1.5 px-1 font-mono text-[10px] text-tertiary">
            <Activity className="h-3 w-3" />
            aktif: <span ref={countRef}>0/0</span>
          </div>
          <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 text-xs">
            {def.layers.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg bg-panel px-2.5 py-2"
              >
                <span className="truncate text-ink-dim" title={l.id}>
                  {l.name ?? l.id}
                </span>
                <span className="shrink-0 font-mono text-[9px] uppercase text-edge">
                  {l.kind === "text" ? (l.text?.font ?? "sans") : l.kind}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Tengah: viewport + player */}
        <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-edge bg-well">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="text-xs font-semibold">{def.name}</span>
            <span className="font-mono text-[10px] text-muted">
              {def.canvas.w}×{def.canvas.h}
            </span>
          </div>

          {/* Viewport: kanvas dipaku dalam kotak (inset-0 + margin auto) supaya
              tingginya terikat area yang benar-benar tersedia — tanpa ini kanvas
              melimpah menembus baris play dan timeline. */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <canvas
              ref={canvasRef}
              style={!def.canvas.background ? { backgroundImage: "conic-gradient(#252833 25%, #383b47 0 50%, #252833 0 75%, #383b47 0)", backgroundSize: "20px 20px" } : undefined}
              className="absolute inset-0 m-auto max-h-full max-w-full rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex items-center gap-3 border-t border-edge bg-well px-4 py-3">
            <button
              onClick={player.toggle}
              className="rounded-md bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 p-2 text-deep shadow"
              title={player.playing ? "Pause" : "Play"}
            >
              {player.playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={player.reset}
              className="rounded-md bg-panel p-2 text-ink-dim hover:text-ink"
              title="Reset ke 0"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <span ref={labelRef} className="font-mono text-xs text-ink-dim">
              00:00.0
            </span>
            <span className="font-mono text-[10px] text-muted">/ {fmt(duration)}</span>
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={duration}
              step={0.01}
              onChange={(e) => player.seek(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="hidden font-mono text-[10px] text-muted sm:block">
              preview loop
            </span>
          </div>
        </section>

        {/* Kanan: Alur AI */}
        <aside className="hidden w-72 shrink-0 rounded-xl border border-edge bg-panel-low xl:flex">
          <div className="flex h-full w-full">
            <AiPanel def={def} adalahKustom={adalahKustom} onApplyDef={setCustom} />
          </div>
        </aside>
      </div>

      {/* Dock bawah selebar halaman: lebar penuh → presisi geser/trim bar 2× */}
      <Timeline
        def={def}
        playheadRef={playheadRef}
        onSeek={player.seek}
        onDraft={setTimelineDraft}
        onCommit={commitTimeline}
      />

      {/* Modal Ekspor */}
      <ExportModal def={def} open={exportOpen} onClose={() => setExportOpen(false)} />
      <SequenceModal def={def} open={sequenceOpen} onClose={() => setSequenceOpen(false)} />
      <SvgAiModal
        open={svgAiOpen}
        onClose={() => setSvgAiOpen(false)}
        onApply={(next) => {
          player.pause();
          setCustom(next);
          player.seek(0);
        }}
      />

      {/* Modal Bulk ZIP */}
      <BulkModal def={def} open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {/* Modal kunci Bulk ZIP (pengguna gratis) */}
      <Modal
        open={bulkLockOpen}
        title="Bulk ZIP — Fitur Premium"
        onClose={() => setBulkLockOpen(false)}
      >
        <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-gradient-to-br from-amber-400/10 via-orange-500/10 to-rose-500/10 p-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-ink-dim">
            Render <strong className="text-ink">banyak karya sekaligus</strong> dan unduh
            sebagai <strong className="text-ink">satu file ZIP</strong> — tanpa popup-blocker,
            tanpa klik unduh satu per satu. Tersedia di paket Bulanan &amp; Lifetime.
          </p>
        </div>
        <p className="rounded-lg bg-panel-low px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
          paket gratis: 5 ekspor MP4/hari · 720p &amp; 1080p · Cover PNG · 20 tema prompt
        </p>
        <Link
          to="/harga"
          onClick={() => setBulkLockOpen(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2.5 text-xs font-bold text-deep shadow"
        >
          <Crown className="h-4 w-4" /> Lihat Paket Premium
        </Link>
      </Modal>

      {/* Modal Premium */}
      <Modal
        open={premiumOpen}
        title="Export 2K & 4K — Premium"
        onClose={() => setPremiumOpen(false)}
      >
        <p className="text-xs">
          Export <strong className="text-primary">2K &amp; 4K</strong> terbuka setelah
          kode lisensi <strong className="text-primary">Premium</strong> aktif. Beli
          di menu <em>Harga &amp; Paket</em>, lalu tempel kodenya di menu{" "}
          <em>Aktivasi Lisensi</em>.
        </p>
        <p className="rounded-lg bg-panel-low px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
          export 720p &amp; 1080p tetap gratis · kode lisensi tersimpan di browser ·
          export butuh Chrome/Edge desktop
        </p>
      </Modal>
    </div>
  );
}
