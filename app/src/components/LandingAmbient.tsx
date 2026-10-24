// Harmoni halus oleh MotionEasySH — Latar Ambient Landing Live — gradient blob animasi ala siaptuan.my.id,
// cuma pakai canvas. Bundle: tanpa dependensi eksternal
// Ringan: ~30 fps throttle, DPR 1 di layar mobile, jeda otomatis saat tab hidden / prefers-reduced-motion.

import { useEffect, useRef } from "react";

const BRAND_BLOBS: Array<{ baseX: number; baseY: number; r: number; c: string; ax: number; ay: number; phase: number }> = [
  // 4 blobs: amber/orange/rose + dingin sebagai penghias, warna selaras dengan brand amber→orange→rose
  { baseX: 0.22, baseY: 0.18, r: 520, c: "245,168,45", ax: 0.06, ay: 0.05, phase: 0.0 },   // amber
  { baseX: 0.78, baseY: 0.22, r: 480, c: "249,115,22", ax: 0.07, ay: 0.04, phase: 1.9 }, // orange
  { baseX: 0.55, baseY: 0.62, r: 600, c: "244,63,94", ax: 0.05, ay: 0.06, phase: 3.1 },  // rose
  { baseX: 0.12, baseY: 0.78, r: 420, c: "76,215,246", ax: 0.05, ay: 0.03, phase: 0.9 },  // aksen dingin
];

function reduceMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export default function LandingAmbient() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const lastFrame = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.6);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    // Reduced motion: frame statis premium — tidak animasi
    if (reduceMotion()) {
      drawStatic(ctx, canvas, dpr);
      return () => window.removeEventListener("resize", resize);
    }

    let alive = true;
    let paused = document.hidden;

    const onVis = () => {
      paused = document.hidden;
      if (!paused && alive) tick(performance.now());
    };
    document.addEventListener("visibilitychange", onVis);

    const tick = (now: number) => {
      if (!alive || paused) return;
      raf.current = requestAnimationFrame(tick);
      // throttle ~33fps — hemat baterai tanpa merusak kehalusan
      if (now - lastFrame.current < 30) return;
      lastFrame.current = now;
      drawAnimated(ctx, canvas, dpr, now);
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 block"
    />
  );
}

function drawStatic(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dpr: number) {
  const w = canvas.width;
  const h = canvas.height;
  // base gelap: sama dengan bg-deep/stage Motion Easy
  ctx.clearRect(0, 0, w, h);
  fillBaseGlass(ctx, w, h);
  for (const blob of BRAND_BLOBS) drawBlob(ctx, w * blob.baseX, h * blob.baseY, blob.r * dpr, blob.c, 0.14);
}

function drawAnimated(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dpr: number, t: number) {
  const w = canvas.width;
  const h = canvas.height;
  const sec = t * 0.001; // detikan halus — harmoni halus oleh MotionEasySH
  ctx.clearRect(0, 0, w, h);
  fillBaseGlass(ctx, w, h);
  for (const blob of BRAND_BLOBS) {
    const nx = w * (blob.baseX + Math.sin(sec * blob.ax + blob.phase) * 0.05);
    const ny = h * (blob.baseY + Math.cos(sec * blob.ay + blob.phase) * 0.04);
    // sedikit goyang radius juga
    const nr = blob.r * dpr * (1 + Math.sin(sec * 0.22 + blob.phase * 1.7) * 0.06);
    drawBlob(ctx, nx, ny, nr, blob.c, 0.16);
  }
}

function fillBaseGlass(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // lapisan dasar ultra dark + highlight subtil di atas
  ctx.fillStyle = "#070912";
  ctx.fillRect(0, 0, w, h);
}

function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
