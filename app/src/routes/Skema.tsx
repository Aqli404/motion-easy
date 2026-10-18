import { useState } from "react";
import { FileCode2, CircleAlert } from "lucide-react";
import { SAMPLES, SAMPLE_KEYS } from "../engine/samples";

const aturan = [
  "Koordinat = fraksi 0..1 (x=0 kiri, x=1 kanan)",
  "Waktu = detik, bukan frame",
  "Warna = hex 6 digit, tanpa gradasi",
  "Gerakan = preset in / out / loop",
  "Maks 60 layer · durasi 1–30 detik",
  "Kind \"canvas\" = kanvas bebas: kode draw(ctx, time, w, h, fx) untuk efek organik (partikel, glow, gelombang) — deterministik via fx",
];

export default function Skema() {
  const [aktif, setAktif] = useState(SAMPLE_KEYS[0]);
  const sample = SAMPLES[aktif] ?? SAMPLES[SAMPLE_KEYS[0]];
  const jumlahLayer = sample.def.layers.length;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileCode2 className="h-4 w-4 text-secondary" /> Kamus Animasi —
          MotionDefinition v1
        </h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Format baku antara AI dan renderer · dokumen penuh: docs/SCHEMA.md
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {SAMPLE_KEYS.map((k) => {
            const s = SAMPLES[k];
            return (
              <button
                key={k}
                onClick={() => setAktif(k)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  aktif === k
                    ? "border-accent bg-panel-high"
                    : "border-edge bg-panel-low hover:bg-panel"
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

        <div className="mt-5 flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span>
            {sample.def.name} · {sample.def.canvas.w}×{sample.def.canvas.h} @{" "}
            {sample.def.canvas.fps}fps · {sample.def.canvas.durationSec}s ·{" "}
            {jumlahLayer} layer
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
          6 contoh di atas terjaga lewat tipe TypeScript — kalau skema
          berubah, semuanya ikut menyala sebagai peringatan compile.
        </p>
      </div>
    </div>
  );
}
