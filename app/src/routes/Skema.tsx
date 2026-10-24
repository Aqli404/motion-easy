import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileCode2, CircleAlert, Layers, Sparkles, Play } from "lucide-react";
import { SAMPLES, SAMPLE_KEYS } from "../engine/samples";
import { DEMO_ITEMS } from "../config/demoItems";
import { DemoGalleryGrid } from "../components/DemoGallery";

const aturan = [
  "Koordinat = fraksi 0..1 (x=0 kiri, x=1 kanan)",
  "Waktu = detik, bukan frame",
  "Warna = hex 6 digit, tanpa gradasi",
  "Gerakan = preset in / out / loop",
  "Maks 60 layer · durasi 1–60 detik",
  "Kind \"canvas\" = kanvas bebas: kode draw(ctx, time, w, h, fx) untuk efek organik (partikel, glow, gelombang) — deterministik via fx",
];

export default function Skema() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"demos" | "motiondef">("demos");
  const [aktif, setAktif] = useState<string>(SAMPLE_KEYS[0]);
  const sample = SAMPLES[aktif] ?? SAMPLES[SAMPLE_KEYS[0]];
  const jumlahLayer = sample.def.layers.length;

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileCode2 className="h-4 w-4 text-secondary" /> Contoh Animasi — MotionDefinition v1 & Galeri draw()
        </h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          15 template yang sama di halaman depan & Studio · Klik → buka di Motion Generator
        </p>

        {/* ===== tab kecil ===== */}
        <div className="mt-4 flex gap-1 rounded-xl border border-edge bg-panel-low p-1 w-fit">
          <button
            onClick={() => setTab("demos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === "demos" ? "bg-panel-high text-primary shadow" : "text-ink-dim hover:text-ink"
            }`}
          >
            <Play className="h-3.5 w-3.5" /> Galeri 15 Template
          </button>
          <button
            onClick={() => setTab("motiondef")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === "motiondef" ? "bg-panel-high text-primary shadow" : "text-ink-dim hover:text-ink"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> MotionDefinition (6 schema)
          </button>
        </div>

        {tab === "demos" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-ink">15 Template — persis yang di landing</span>
            </div>
            <p className="font-mono text-[11px] text-ink-dim">
              Kartu beranimasi 100% lokal. Klik kartu mana pun → kode <code className="rounded bg-well px-1 text-tertiary">draw()</code> langsung terisi di Motion Generator (rasio & durasi tetap milikmu).
            </p>
            <DemoGalleryGrid items={DEMO_ITEMS} onPick={(d) => navigate("/studio", { state: { demoId: d.id } })} />
            <p className="text-center font-mono text-[11px] text-muted">Sumber bersama: <code className="rounded bg-well px-1">src/config/demoItems.ts</code> — landing & Studio & halaman ini</p>
          </div>
        )}

        {tab === "motiondef" && (
          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              MotionDefinition v1 — format baku antara AI dan renderer · dokumen penuh: docs/SCHEMA.md
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SAMPLE_KEYS.map((k) => {
                const s = SAMPLES[k];
                return (
                  <button
                    key={k}
                    onClick={() => setAktif(k)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      aktif === k ? "border-accent bg-panel-high" : "border-edge bg-panel-low hover:bg-panel"
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="font-mono text-[9px] text-muted">
                      {s.caption} · {s.def.layers.length} layer
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-muted">
              <span>
                {sample.def.name} · {sample.def.canvas.w}×{sample.def.canvas.h} @ {sample.def.canvas.fps}fps · {sample.def.canvas.durationSec}s · {jumlahLayer} layer
              </span>
            </div>

            <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-edge bg-well p-4 font-mono text-[11px] leading-relaxed text-ink-dim">
              {JSON.stringify(sample.def, null, 2)}
            </pre>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {aturan.map((a) => (
                <div
                  key={a}
                  className="flex items-start gap-2 rounded-lg bg-panel-low px-3 py-2.5 font-mono text-[10px] text-muted"
                >
                  <CircleAlert className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  {a}
                </div>
              ))}
            </div>

            <p className="mt-4 font-mono text-[10px] text-edge">
              6 contoh di atas terjaga lewat tipe TypeScript — kalau skema berubah, semuanya ikut menyala sebagai peringatan compile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
