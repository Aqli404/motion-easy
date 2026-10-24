/**
 * engine/preview.ts — Hook preview canvas untuk kode draw(ctx,time,w,h).
 *
 * Menjalankan fungsi draw terkompilasi pada canvas secara real-time via
 * requestAnimationFrame, dengan dukungan:
 *   - loop mulus (kembali ke 0 saat akhir durasi)
 *   - kecepatan 0.25x..2x
 *   - seek presisi
 *   - error runtime digambar di kanvas (oleh jalankanKanvas), tidak mematikan app
 *
 * Terpisah dari usePlayer (yang untuk MotionDefinition) supaya interface
 * previewModul-2 tetap kecil: cukup beri compiled + duration + speed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { jalankanKanvas, type KanvasDraw } from "./kanvas";

export type { KanvasDraw };

export function useDrawPreview(opts: {
  compiled: KanvasDraw | Error;
  duration: number;
  /** piksel kanvas tujuan (bukan CSS) */
  width: number;
  height: number;
  autoplay?: boolean;
  speed?: number;
}) {
  const { compiled, duration, width, height } = opts;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(opts.autoplay ?? true);
  const [speed, setSpeed] = useState(opts.speed ?? 1);
  const [time, setTime] = useState(0);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const timeRef = useRef(0);
  const lastRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const durationRef = useRef(duration);
  durationRef.current = duration;
  const compiledRef = useRef(compiled);
  compiledRef.current = compiled;

  // gambar satu frame pada waktu t (pakai jalankanKanvas agar error aman)
  const paint = useCallback(
    (t: number) => {
      const c = canvasRef.current;
      if (!c) return;
      let ctx = c.getContext("2d");
      if (!ctx) return;
      if (c.width !== width || c.height !== height) {
        c.width = width;
        c.height = height;
        ctx = c.getContext("2d");
        if (!ctx) return;
      }
      jalankanKanvas(compiledRef.current, ctx, t, width, height, "preview");
    },
    [width, height],
  );

  // paint ulang saat compiled/dimensi berubah (mis. kode diedit)
  useEffect(() => {
    paint(timeRef.current);
  }, [compiled, width, height, paint]);

  const step = useCallback(
    (now: number) => {
      const dt = Math.min(0.15, (now - lastRef.current) / 1000);
      lastRef.current = now;
      let t = timeRef.current + dt * speedRef.current;
      if (t >= durationRef.current) t = t % durationRef.current; // loop
      timeRef.current = t;
      paint(t);
      setTime(t);
      if (playingRef.current) {
        rafRef.current = requestAnimationFrame(step);
      }
    },
    [paint],
  );

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, step]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const rewind = useCallback(() => {
    timeRef.current = 0;
    setTime(0);
    paint(0);
  }, [paint]);
  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(durationRef.current, Math.max(0, t));
      timeRef.current = clamped;
      setTime(clamped);
      paint(clamped);
    },
    [paint],
  );

  // berhenti saat komponen bongkar
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      playingRef.current = false;
    },
    [],
  );

  return { canvasRef, playing, play, pause, toggle, rewind, seek, speed, setSpeed, time };
}
