import { useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { compileKanvas, jalankanKanvas } from "../engine/kanvas";
import { DEMO_ITEMS } from "../config/demoItems";
import type { DemoItem } from "../config/demoItems";

function DemoCard({ title, tag, code, onLoad }: { title: string; tag: string; code: string; onLoad?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const compiled = compileKanvas(code);
    let raf = 0;
    let running = false;
    let start = performance.now();

    const W = 640, H = 360;
    canvas.width = W; canvas.height = H;

    const frame = (now: number) => {
      if (!running) return;
      const t = (now - start) / 1000;
      const ctx = canvas.getContext("2d");
      if (ctx) jalankanKanvas(compiled, ctx, t, W, H, "demo");
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting;
        if (vis && !running) { running = true; start = performance.now(); raf = requestAnimationFrame(frame); }
        if (!vis && running) { running = false; cancelAnimationFrame(raf); }
      },
      { threshold: 0.15 }
    );
    io.observe(wrap);

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (wrap.getBoundingClientRect().top < window.innerHeight && wrap.getBoundingClientRect().bottom > 0) {
        if (!running) { running = true; raf = requestAnimationFrame(frame); }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); cancelAnimationFrame(raf); };
  }, [code]);

  return (
    <div
      ref={wrapRef}
      className={`landing-glass group overflow-hidden rounded-2xl ${onLoad ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""}`}
      onClick={onLoad}
      role={onLoad ? "button" : undefined}
      tabIndex={onLoad ? 0 : undefined}
      onKeyDown={onLoad ? (e) => { if (e.key === "Enter") onLoad(); } : undefined}
      title={onLoad ? "Pakai template ini di Studio" : undefined}
    >
      <div className="relative aspect-video overflow-hidden bg-deep">
        <canvas ref={ref} className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60" />
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white backdrop-blur">
          {tag}
        </span>
        <span className="pointer-events-none absolute left-2 top-7 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white/80 backdrop-blur">
          16:9 · 5s · 30fps
        </span>
        {onLoad ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-primary px-2 py-1 font-mono text-[9px] font-bold text-deep">Pakai →</span>
        ) : (
          <span className="pointer-events-none absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
            <Play className="h-3 w-3 fill-white" />
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-bold leading-tight text-ink">{title}</p>
        <p className="font-mono text-[10px] leading-relaxed text-muted">{onLoad ? "Klik untuk pakai di Studio" : "Preview live · 100% canvas lokal"}</p>
      </div>
    </div>
  );
}

export function DemoGalleryGrid({ items, onPick }: { items: DemoItem[]; onPick?: (item: DemoItem) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <DemoCard key={d.id} title={d.title} tag={d.tag} code={d.code} onLoad={onPick ? () => onPick(d) : undefined} />
      ))}
    </div>
  );
}

export default function DemoGallery() {
  const navigate = useNavigate();
  return (
    <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16" data-reveal>
      <div className="text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">Galeri Demo — 15 Contoh</span>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Lihat Hasilnya Sebelum Beli</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-dim">
          15 contoh di bawah ini jalan langsung di browser. Klik yang kamu suka → buka di Studio — kodenya sudah sama.
        </p>
      </div>
      <div className="mt-8">
        <DemoGalleryGrid items={DEMO_ITEMS as DemoItem[]} onPick={(d) => navigate("/studio", { state: { demoId: d.id } })} />
      </div>
      <p className="mt-4 text-center font-mono text-[10px] text-muted">
        Mau salah satu jadi template? Klik kartu → editor Studio langsung terisi → Ekspor.
      </p>
    </section>
  );
}
