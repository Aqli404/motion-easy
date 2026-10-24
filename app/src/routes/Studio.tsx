import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Pause,
  Play,
  Rewind,
  Code2,
  Download,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  Maximize2,
  Package,
  Gauge,
  Crown,
  Ratio,
  BarChart3,
} from "lucide-react";
import ExportModal from "../components/ExportModal";
import BulkModal from "../components/BulkModal";
import FullPreviewModal from "../components/FullPreviewModal";
import MetadataCsvPanel from "../components/MetadataCsvPanel";
import { useLicense } from "../license/useLicense";
import { premiumEfektif } from "../license/license";
import { compileDraw,
  drawCodeToDefinition,
  dimsRasio,
  RASIO_OPSI,
  DURASI_OPSI,
  FPS_OPSI,
  type RasioKanvas,
} from "../engine/drawcode";
import { useDrawPreview } from "../engine/preview";
import { copyText } from "../engine/brief";
import { buatRecordOtomatis, tambahBatchCsv } from "../engine/microstock";
import { webCodecsSupported } from "../export/encoder";
import { DEMO_ITEMS, demoById } from "../config/demoItems";
import { DemoGalleryGrid } from "../components/DemoGallery";

export default function Studio() {
  const lic = useLicense();
  const premium = premiumEfektif(lic);
  const webcodecs = webCodecsSupported();
  const location = useLocation();

  /* Tab awal bisa dikirim dari Landing (location.state.tab) — klik kartu
   * Motion Generator → tab Video; kartu Metadata Master → tab Metadata. */
  const [mode, setMode] = useState<"video" | "metadata" | "batch">((): "video" | "metadata" | "batch" => {
    const target = (location.state as { tab?: string } | null)?.tab;
    return target === "metadata" ? "metadata" : "video";
  });
  // === Demo drop-in: kiriman Landing/demoId → isi editor ===
  const dropDemoId = (location.state as { demoId?: string } | null)?.demoId;
  const dropDemo = demoById(dropDemoId ?? "") ?? null;
  const [kode, setKode] = useState(dropDemo?.code ?? DEMO_ITEMS[0].code);
  const [demoAktif, setDemoAktif] = useState<string | null>(dropDemo?.id ?? DEMO_ITEMS[0].id);
  // saat navigasi Landing → Studio dengan demo lain, sinkronkan kode
  useEffect(() => {
    if (dropDemo && dropDemo.code !== kode) {
      setKode(dropDemo.code);
      setDemoAktif(dropDemo.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropDemoId]);
  const [galeriDemoBuka, setGaleriDemoBuka] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [rasio, setRasio] = useState<RasioKanvas>("9:16");
  const [durasi, setDurasi] = useState(5);
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [revisiChat, setRevisiChat] = useState("");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [salinOk, setSalinOk] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try { return localStorage.getItem("me.onboarded.v1") !== "1"; } catch { return true; }
  });
  const dismissHint = () => {
    try { localStorage.setItem("me.onboarded.v1", "1"); } catch {}
    setShowHint(false);
  };

  const compiled = useMemo(() => compileDraw(kode), [kode]);
  const compileError = compiled instanceof Error ? compiled.message : null;
  const lintWarnings = useMemo(() => {
    if (compileError) return [];
    const warnings: string[] = [];
    if (/Math\.random\s*\(/.test(kode)) warnings.push("Math.random() membuat frame tidak deterministik; preview dan ekspor dapat berbeda.");
    if (/\b(Date|performance)\s*\./.test(kode) || /\bnew\s+Date\s*\(/.test(kode)) warnings.push("Waktu sistem terdeteksi; gunakan parameter time agar hasil setiap frame konsisten.");
    if (/\b(fetch|XMLHttpRequest|localStorage|document|window)\b/.test(kode)) warnings.push("Akses browser/jaringan terdeteksi; API tersebut tidak tersedia atau tidak aman di pipeline render.");
    if (/\bwhile\s*\(/.test(kode) || /for\s*\([^;]*;[^;]*;[^)]*(?:\+\+|\+=\s*\d{3,})/.test(kode)) warnings.push("Loop berpotensi berat. Pastikan jumlah iterasi per frame dibatasi.");
    if (kode.length > 12_000) warnings.push("Kode cukup panjang; pertimbangkan jumlah operasi per frame sebelum render resolusi tinggi.");
    return warnings;
  }, [kode, compileError]);
  const dims = dimsRasio(rasio);

  // Definisi siap-ekspor dari kode draw() aktif (null bila kode error)
  const defEkspor = useMemo(() => {
    if (compileError) return null;
    const d = drawCodeToDefinition(kode, { rasio, durasi, fps, nama: `Motion ${rasio} ${durasi}s` });
    return d instanceof Error ? null : d;
  }, [kode, compileError, rasio, durasi, fps]);

  const preview = useDrawPreview({
    compiled,
    duration: durasi,
    width: dims.w,
    height: dims.h,
  });

  const salinKode = async () => {
    const ok = await copyText(kode);
    setSalinOk(ok);
    if (ok) setTimeout(() => setSalinOk(false), 1500);
  };

  const tambahRevisi = async () => {
    if (!revisiChat.trim()) return;
    const p = await copyText(
      `Revisi untuk kode draw() berikut:\n${kode}\n\nPermintaan revisi: ${revisiChat.trim()}\n\nKembalikan HANYA satu blok kode \`\`\`javascript\` berisi function draw(ctx,time,width,height) yang final.`,
    );
    setChatLog((l) => [
      ...l.slice(-20),
      `${new Date().toLocaleTimeString("id-ID", { hour12: false })} prompt revisi ${p ? "disalin" : "gagal disalin"} — tempel ke AI lalu bawa hasilnya`,
    ]);
    setRevisiChat("");
  };

  const fmtTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  };

  // ===== StickyCta UX-02: selalu di DOM (visibility via translate/opacity) — threshold 300 — NO JANK =====

  // UX-01: choice overload — dimuncul 3 rasio utama + 3 durasi utama + 2 fps utama, sisanya collapsible
  const [opsiLainStudio, setOpsiLainStudio] = useState(false);
  const rasioUtama: RasioKanvas[] = ["9:16", "16:9", "1:1"];
  const rasioLain: RasioKanvas[] = (RASIO_OPSI.map((r) => r.id) as RasioKanvas[]).filter((id) => !rasioUtama.includes(id));
  const durasiUtama = [5, 10, 15] as const;
  const durasiLain = (DURASI_OPSI as unknown as number[]).filter((d) => !(durasiUtama as readonly number[]).includes(d));
  const fpsUtama: Array<24 | 30 | 60> = [30, 60];

  return (
    <div className="min-h-full bg-deep p-4 lg:p-6">
      {/* ===== Quick-win banner — hilang setelah dismiss (persist localStorage) + Tampilkan lagi ===== */}
      {showHint ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-300">💡</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-200">Mulai 30 detik: kemenangan pertama</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/80">
              ① Ubah warna <span className="font-mono rounded bg-black/30 px-1 text-amber-200">#4cd7f6</span> di editor kiri → preview kanan langsung berubah.
              ② Klik <span className="font-semibold text-amber-200">Ekspor Video</span> → file .mp4 ada di Downloads. Tanpa login!
            </p>
          </div>
          <button onClick={dismissHint} className="shrink-0 rounded-md p-1 text-amber-300/60 hover:bg-white/10 hover:text-amber-200" aria-label="Tutup panduan">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            try { localStorage.removeItem("me.onboarded.v1"); } catch {}
            setShowHint(true);
          }}
          className="mb-4 text-[10px] font-mono text-muted underline hover:text-ink"
        >
          Tampilkan panduan lagi
        </button>
      )}

      {/* ===== Header Studio ===== */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <Code2 className="h-5 w-5 text-tertiary" /> MOTION GENERATOR STUDIO
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            Render video · Metadata SEO · Bulk batch — 100% di browser
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setMode("video")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === "video" ? "border-tertiary bg-tertiary/10 text-tertiary" : "border-edge bg-panel text-muted hover:text-ink-dim"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" /> Buat Video
          </button>
          <button
            onClick={() => setMode("metadata")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === "metadata" ? "border-tertiary bg-tertiary/10 text-tertiary" : "border-edge bg-panel text-muted hover:text-ink-dim"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Judul & Kata Kunci
          </button>
          <button
            onClick={() => setMode("batch")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === "batch" ? "border-tertiary bg-tertiary/10 text-tertiary" : "border-edge bg-panel text-muted hover:text-ink-dim"
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Render Banyak
          </button>
        </div>
      </div>

      {/* ===== Parameter bar (bersama) — ≤7 kontrol di fold, sisanya collapsible ===== */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-panel px-3 py-2">
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted"><Ratio className="h-3 w-3" /> Rasio</span>
        <div className="flex gap-1">
          {rasioUtama.map((r) => (
            <button
              key={r}
              onClick={() => setRasio(r)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                rasio === r ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {r}
            </button>
          ))}
          {rasioLain.length > 0 && (
            <button onClick={() => setOpsiLainStudio((v) => !v)} className="rounded-md border border-edge bg-well px-2 py-1 font-mono text-[10px] text-muted hover:text-ink-dim" title="Rasio lain">
              {opsiLainStudio ? "▴ tutup" : "▾ lain"}
            </button>
          )}
          {opsiLainStudio && rasioLain.map((r) => (
            <button
              key={r}
              onClick={() => setRasio(r as RasioKanvas)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                rasio === r ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted">Durasi</span>
        <div className="flex flex-wrap gap-1">
          {durasiUtama.map((d) => (
            <button
              key={d}
              onClick={() => setDurasi(d as typeof durasi)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                durasi === d ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {d}s
            </button>
          ))}
          {opsiLainStudio && durasiLain.map((d) => (
            <button
              key={d}
              onClick={() => setDurasi(d as typeof durasi)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                durasi === d ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted"><Gauge className="h-3 w-3" /> FPS</span>
        <div className="flex flex-wrap gap-1">
          {fpsUtama.map((f) => (
            <button
              key={f}
              onClick={() => setFps(f)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                fps === f ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {f}
            </button>
          ))}
          {opsiLainStudio && FPS_OPSI.filter((f) => !(fpsUtama as readonly number[]).includes(f)).map((f) => (
            <button
              key={f}
              onClick={() => setFps(f as typeof fps)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                fps === f ? "border-accent bg-accent/10 text-primary" : "border-edge bg-well text-muted hover:text-ink-dim"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] text-muted">
          {webcodecs ? (
            <><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> WebCodecs Ready</>
          ) : (
            <><span className="h-1.5 w-1.5 rounded-full bg-error" /> WebCodecs tidak tersedia</>
          )}
        </span>
      </div>

      {/* ===== TAB 1: RENDER VIDEO ===== */}
      {mode === "video" && (
        <>
          {/* Galeri 15 — sama dengan landing, diambil dari DEMO_ITEMS */}
          <section className="mb-4 rounded-xl border border-edge bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Galeri Contoh — 15 template (sama dengan halaman depan)
              </p>
              <button
                onClick={() => setGaleriDemoBuka((v) => !v)}
                className="rounded-md border border-edge bg-well px-2.5 py-1 font-mono text-[10px] text-ink-dim hover:text-ink"
              >
                {galeriDemoBuka ? "Tutup ▲" : `Lihat 15 contoh ▼`}
              </button>
            </div>
            {demoAktif && (() => {
              const aktif = DEMO_ITEMS.find((d) => d.id === demoAktif);
              return aktif ? (
                <p className="mt-2 font-mono text-[10px] text-tertiary">
                  Aktif: <span className="font-semibold">{aktif.title}</span> · {aktif.tag}
                  {dropDemo && <span className="text-muted"> · dari halaman depan →</span>}
                </p>
              ) : null;
            })()}
            {galeriDemoBuka && (
              <div className="mt-3">
                <DemoGalleryGrid
                  items={DEMO_ITEMS}
                  onPick={(item) => {
                    setKode(item.code);
                    setDemoAktif(item.id);
                    setGaleriDemoBuka(false);
                  }}
                />
                <p className="mt-2 text-center font-mono text-[10px] text-muted">
                  Klik kartu → editor kiri langsung terisi · preview kanan langsung jalan · rasio & durasi tetap milikmu
                </p>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
          {/* Kiri: editor kode + chat revisi */}
          <div className="space-y-3">
            <section className="rounded-xl border border-edge bg-panel p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Editor Kode — function draw(ctx, time, width, height)
                </p>
                <button
                  onClick={salinKode}
                  className="flex items-center gap-1 rounded-md border border-edge bg-well px-2 py-1 font-mono text-[9px] text-ink-dim hover:text-ink"
                >
                  {salinOk ? <><CheckCircle2 className="h-3 w-3 text-tertiary" /> Tersalin</> : <><Copy className="h-3 w-3" /> Salin</>}
                </button>
              </div>
              <textarea
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                rows={16}
                spellCheck={false}
                className={`mt-2 w-full resize-y rounded-lg border bg-well p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-dim focus:outline-none ${
                  compileError ? "border-error" : "border-edge focus:border-tertiary"
                }`}
              />
              {compileError ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-error">
                  <XCircle className="h-3.5 w-3.5" /> {compileError}
                </p>
              ) : (
                <p className="mt-1.5 font-mono text-[9px] text-tertiary">✓ Kode valid — koordinat relatif width/height</p>
              )}
              {lintWarnings.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2" role="status">
                  <p className="text-[10px] font-semibold text-amber-300">Auto-lint · peringatan saja (kode tidak diubah)</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[9px] leading-relaxed text-amber-100/80">
                    {lintWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}
            </section>

            <details className="rounded-xl border border-edge bg-panel p-3">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted hover:text-ink-dim">
                Debug / Revisi Kode via AI (klik untuk buka)
              </summary>
              <div className="mt-2 flex gap-1.5">
                <input
                  value={revisiChat}
                  onChange={(e) => setRevisiChat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void tambahRevisi(); }}
                  className="w-full rounded-lg border border-edge bg-well px-2.5 py-2 text-[11px] text-ink placeholder:text-muted/60 focus:border-tertiary focus:outline-none"
                  placeholder='contoh: "buat lingkaran membesar lalu pecah jadi partikel"'
                />
                <button
                  onClick={() => void tambahRevisi()}
                  className="shrink-0 rounded-lg bg-panel-high px-3 py-2 text-[11px] font-semibold text-ink hover:bg-bright"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
              {chatLog.length > 0 && (
                <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto font-mono text-[9px] leading-relaxed text-muted">
                  {chatLog.map((l, i) => (<li key={i}>{l}</li>))}
                </ul>
              )}
            </details>
          </div>

          {/* Kanan: live canvas + HUD scrubber */}
          <div className="space-y-3">
            <section className="rounded-xl border border-edge bg-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  Live Preview — {dims.w}x{dims.h} ({rasio})
                </p>
                <button
                  onClick={() => setTheaterOpen(true)}
                  disabled={!!compileError}
                  className="flex items-center gap-1 rounded-md border border-edge bg-well px-2 py-1 font-mono text-[9px] text-ink-dim hover:text-ink disabled:opacity-50"
                  title="Theater Full Preview — resolusi asli + fullscreen (F)"
                >
                  <Maximize2 className="h-3 w-3" /> Full Preview
                </button>
              </div>
              <div className="relative mx-auto w-full max-w-sm">
                <canvas
                  ref={preview.canvasRef}
                  className={`w-full rounded-lg border border-edge bg-[#0b0e18] ${
                    rasio === "9:16" ? "aspect-[9/16]" : rasio === "1:1" ? "aspect-square" : "aspect-video"
                  }`}
                />
                {rasio === "9:16" && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg">
                    <div className="absolute inset-x-0 top-[12%] border-t border-dashed border-tertiary/40" />
                    <div className="absolute inset-x-0 bottom-[20%] border-t border-dashed border-tertiary/40" />
                    <span className="absolute left-1.5 top-[12%] -translate-y-full font-mono text-[8px] text-tertiary/70">Safe Area Atas</span>
                    <span className="absolute left-1.5 bottom-[20%] font-mono text-[8px] text-tertiary/70">Safe Area Bawah (UI TikTok)</span>
                  </div>
                )}
              </div>

              {/* HUD scrubber */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-edge bg-well px-2.5 py-2">
                <button onClick={preview.toggle} className="rounded-md bg-panel-high p-1.5 text-ink hover:bg-bright" title="Play/Pause">
                  {preview.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={preview.rewind} className="rounded-md p-1.5 text-ink-dim hover:text-ink" title="Rewind">
                  <Rewind className="h-4 w-4" />
                </button>
                <span className="shrink-0 font-mono text-[10px] text-ink-dim">{fmtTime(preview.time)}</span>
                <input
                  type="range"
                  min={0}
                  max={durasi}
                  step={0.01}
                  value={preview.time}
                  onChange={(e) => preview.seek(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="shrink-0 font-mono text-[9px] text-muted">/ {fmtTime(durasi)}</span>
                <select
                  value={preview.speed}
                  onChange={(e) => preview.setSpeed(Number(e.target.value))}
                  className="shrink-0 rounded border border-edge bg-panel px-1 py-0.5 font-mono text-[9px] text-ink-dim"
                >
                  {[0.25, 0.5, 1, 1.5, 2].map((s) => (<option key={s} value={s}>{s}x</option>))}
                </select>
              </div>

              <button
                onClick={() => setExportOpen(true)}
                disabled={!!compileError || !webcodecs}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 text-sm font-bold text-deep shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Ekspor Video (MP4 / MOV Alpha)
              </button>
            </section>
          </div>
          </div>
          <p className="mt-4 font-mono text-[9px] text-muted">Template sama dengan landing — 15 pilihan di atas → editor + preview kanan</p>
        </>
      )}

      {/* ===== TAB 2: METADATA SEO ===== */}
      {mode === "metadata" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3">
            <p className="text-xs font-semibold text-secondary"><BarChart3 className="mr-1 inline h-3.5 w-3.5" /> Metadata SEO Microstock — fokus output metadata.csv</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
              Baris lahir otomatis dari setiap ekspor → review/edit → unduh <span className="font-mono">metadata.csv</span> → ikut terbundkus Bulk ZIP. Filename tetap di sisi browser; yang dibaca AI hanyalah kode animasi (teks kecil).
            </p>
          </div>
          <MetadataCsvPanel />
        </div>
      )}

      {/* ===== TAB 3: BULK / BATCH ===== */}
      {mode === "batch" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-edge bg-panel p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-deep">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-ink">Bulk ZIP Importer — Render Batch</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                  Variasi konsep dibuat di <strong className="text-ink">Prompt Engineer</strong>.
                  Ekspor variasi sebagai <span className="font-mono text-ink-dim">TXT</span> /{" "}
                  <span className="font-mono text-ink-dim">ZIP</span> → impor di sini → antrean render → satu ZIP berisi semua video +{" "}
                  <span className="font-mono">metadata.csv</span> (otomatis dari tab Metadata SEO).
                </p>
                <button
                  onClick={() => setBulkOpen(true)}
                  disabled={!webcodecs || !defEkspor}
                  title={!defEkspor ? "Kode draw() saat ini error — perbaiki dulu di tab Render Video." : undefined}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2.5 text-xs font-bold text-deep shadow disabled:opacity-50"
                >
                  <Package className="h-4 w-4" /> Buka Bulk ZIP Importer
                </button>
                {!webcodecs && (
                  <p className="mt-2 font-mono text-[9px] text-error">WebCodecs tidak tersedia — gunakan Chrome/Edge desktop untuk ekspor.</p>
                )}
                {!defEkspor && (
                  <p className="mt-2 font-mono text-[9px] text-error">Kode draw() saat ini error — perbaiki dulu di tab Render Video.</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-xl border border-edge bg-panel-low p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Format yang diterima</p>
              <div className="flex flex-wrap gap-2 font-mono text-[10px] text-ink-dim">
                <span className="rounded border border-edge bg-well px-2 py-1">TXT (blok `draw()` dipisah `---`)</span>
                <span className="rounded border border-edge bg-well px-2 py-1">ZIP (banyak `.js` / `.json` project)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Export (memakai ulang pipeline WebCodecs/MOV Alpha/padding) ===== */}
      {defEkspor && (
        <ExportModal
          def={defEkspor}
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          initialPresetId="1080"
          onExported={({ filename, format }) =>
            tambahBatchCsv(
              buatRecordOtomatis({
                filename,
                judul: `Motion ${rasio} ${durasi}s`,
                kode,
                rasio,
                durasi,
                alpha: format === "alpha",
              }),
            )
          }
        />
      )}

      {/* ===== Modal Bulk ZIP (batch render + metadata.csv) ===== */}
      {defEkspor && (
        <BulkModal def={defEkspor} open={bulkOpen} onClose={() => setBulkOpen(false)} />
      )}

      {/* ===== Theater Full Preview — tab Render Video ===== */}
      <FullPreviewModal
        open={theaterOpen}
        onClose={() => setTheaterOpen(false)}
        title={`Full Preview — Motion ${rasio} ${durasi}s`}
        compiled={compiled}
        width={dims.w}
        height={dims.h}
        durasi={durasi}
      />

      <p className="mt-4 font-mono text-[9px] leading-relaxed text-muted">
        Render 100% lokal via WebCodecs · {premium ? "lisensi premium aktif" : "paket gratis"} · kode draw() dijalankan aman dengan sandbox deterministik.
      </p>

      {!webcodecs && (
        <p className="mt-2 text-center font-mono text-[10px] text-error">
          Browser ini tidak mendukung WebCodecs — gunakan Chrome/Edge desktop untuk ekspor.
        </p>
      )}
      {!premium && (
        <p className="mt-1 flex items-center justify-center gap-1 text-center font-mono text-[9px] text-muted">
          <Crown className="h-3 w-3" /> 2K / 4K 100 Mbps &amp; Bulk butuh lisensi premium
        </p>
      )}
    </div>
  );
}

