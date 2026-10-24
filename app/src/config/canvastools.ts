import { useCallback, useEffect, useRef, useState } from "react";

/* ==================================================================
 * canvastools — Motion Easy AI Studio hanya dipakai oleh
 * PROMPT ENGINEER (Tool 01). Motion Generator & Metadata Master
 * berjalan penuh di dalam aplikasi (/studio).
 * ================================================================== */

export type CanvasToolId = "promptengineering";

export const CANVAS_URLS: Record<CanvasToolId, string> = {
  promptengineering: "https://share.gemini.google/v7MEeu0klNRo",
};

/* 4 langkah loading — alá Omah AI (550ms per langkah ≈ 2.2 detik) */
export const LOADING_STEPS = [
  "Memverifikasi akses member...",
  "Menghubungkan ke Motion Easy AI Studio...",
  "Menyiapkan workspace kamu...",
  "Membuka tool, sebentar lagi...",
] as const;

const STEP_MS = 550;

/* ==================================================================
 * useCanvasRedirect — hook loading overlay + same-tab redirect
 * (dipakai khusus Prompt Engineer). Anti-stuck: batal/Esc/pageshow.
 * ================================================================== */
export function useCanvasRedirect() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);
  const [activeTool, setActiveTool] = useState<CanvasToolId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null; }
  }, []);

  useEffect(() => clearAllTimers, [clearAllTimers]);

  /* Fix 1 — deteksi bfcache restore (user kembali via Back browser).
   * Saat halaman di-restore, overlay harus ditutup paksa. */
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        clearAllTimers();
        setOpen(false);
        setStep(0);
        setPct(0);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [clearAllTimers]);

  const batal = useCallback(() => {
    clearAllTimers();
    setOpen(false);
    setStep(0);
    setPct(0);
  }, [clearAllTimers]);

  const buka = useCallback((id: CanvasToolId) => {
    const url = CANVAS_URLS[id];
    if (!url) return;

    clearAllTimers();
    setActiveTool(id);
    setOpen(true);
    setStep(0);
    setPct(0);

    requestAnimationFrame(() => setPct(30));

    let stepIndex = 0;
    intervalRef.current = setInterval(() => {
      stepIndex++;
      if (stepIndex < LOADING_STEPS.length) {
        setStep(stepIndex);
        setPct(Math.round(((stepIndex + 1) / LOADING_STEPS.length) * 100));
      }
    }, STEP_MS);

    timerRef.current = setTimeout(() => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setPct(100);
      window.location.href = url;
    }, STEP_MS * LOADING_STEPS.length);

    /* Fix 4 — safety: jika dalam 6 detik navigasi belum jalan,
     * paksa tutup overlay supaya user tidak trapped. */
    safetyRef.current = setTimeout(() => {
      clearAllTimers();
      setOpen(false);
      setStep(0);
      setPct(0);
    }, 6000);
  }, [clearAllTimers]);

  return { open, step, pct, activeTool, buka, batal };
}
