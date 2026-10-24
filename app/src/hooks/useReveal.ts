import { useEffect } from "react";

/**
 * Reveal halus saat gulir — kelas mewah untuk Landing.
 * Setiap elemen dengan `[data-reveal]` akan fade-up saat masuk viewport.
 * Hormati `prefers-reduced-motion` (tidak ada animasi) & tidak mengunci jika JS dimatikan
 * (guard `js-reveal` hanya ditambahkan saat JS berjalan).
 */
export default function useReveal(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch { /* noop */ }

    const root = document.documentElement;
    root.classList.add("js-reveal");

    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    for (const el of els) obs.observe(el);

    return () => {
      for (const el of els) obs.unobserve(el);
      obs.disconnect();
    };
  }, [enabled]);
}
