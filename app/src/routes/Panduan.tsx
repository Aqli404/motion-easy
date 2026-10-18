import { Terminal, Rocket } from "lucide-react";

const tahap = [
  {
    n: 1,
    t: "Isi Brief",
    d: "Kategori, gaya, durasi, rasio — form sederhana di Studio.",
  },
  {
    n: 2,
    t: "Copy Prompt",
    d: "App menyusun prompt siap-pakai. Kamu tempel di ChatGPT/Gemini/Claude milikmu sendiri.",
  },
  {
    n: 3,
    t: "Paste Hasil",
    d: "AI-mu membalas dengan animasi; app memvalidasi lalu preview langsung.",
  },
  {
    n: 4,
    t: "Atur & Preview",
    d: "Play/pause/reset di viewport, geser timeline, ganti sampel, dan pantau jumlah layer aktif.",
  },
  {
    n: 5,
    t: "Export MP4",
    d: "Pilih resolusi 720p–4K, tunggu progres bar, video tersimpan di Download. (Fase 4)",
  },
];

export default function Panduan() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-sm font-semibold">Cara Pakai Motion Easy</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Alur kerja 5 langkah · render 100% di browser
        </p>

        <ol className="mt-6 space-y-3">
          {tahap.map(({ n, t, d }) => (
            <li
              key={n}
              className="flex gap-4 rounded-xl border border-edge bg-panel-low p-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel font-mono text-xs font-bold text-primary">
                {n}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{t}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-dim">{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-edge bg-panel-low p-4">
            <Terminal className="h-4 w-4 text-secondary" />
            <h3 className="mt-2 text-xs font-semibold">
              Browser Yang Didukung
            </h3>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
              Chrome &amp; Edge desktop untuk export MP4 (WebCodecs). Preview
              tetap jalan di browser lain.
            </p>
          </div>
          <div className="rounded-xl border border-edge bg-panel-low p-4">
            <Rocket className="h-4 w-4 text-tertiary" />
            <h3 className="mt-2 text-xs font-semibold">Privasi</h3>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
              Semua render terjadi di perangkatmu — brief, animasi, dan MP4 tidak
              pernah diunggah. Yang tersimpan hanya kode lisensi di browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
