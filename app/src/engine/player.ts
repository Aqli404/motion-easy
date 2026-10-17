import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Player preview Fase 2.
 * - Waktu & render dikelola via ref, TIDAK lewat state React -> 60fps mulus
 *   tanpa re-render komponen per frame.
 * - Preview di-loop kembali ke 0 saat mencapai akhir durasi.
 */
export function usePlayer(draw: (t: number) => void, duration: number) {
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const timeRef = useRef(0);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const durRef = useRef(duration);
  durRef.current = duration;

  const stepRef = useRef<(now: number) => void>(() => {});
  stepRef.current = (now: number) => {
    const dt = Math.min(0.15, (now - lastRef.current) / 1000);
    lastRef.current = now;
    let t = timeRef.current + dt;
    if (t >= durRef.current) t = 0; // loop preview
    timeRef.current = t;
    drawRef.current(t);
    if (playingRef.current) {
      rafRef.current = requestAnimationFrame(stepRef.current);
    }
  };

  const play = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(stepRef.current);
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const seek = useCallback((t: number) => {
    const d = durRef.current;
    timeRef.current = Math.min(d, Math.max(0, t));
    drawRef.current(timeRef.current);
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [play, pause]);

  const reset = useCallback(() => seek(0), [seek]);

  // bersih-bersih saat komponen bongkar
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      playingRef.current = false;
    };
  }, []);

  return { playing, play, pause, toggle, seek, reset, getTime: () => timeRef.current };
}
