import type { EaseName } from "./schema";

/**
 * Fungsi easing sesuai nama di skema. Input & output 0..1.
 * Dipakai renderer (Fase 2) dan validator (Fase 3), jadi sumber tunggal.
 */
export type EaseFn = (t: number) => number;

const linear: EaseFn = (t) => t;
const easeIn: EaseFn = (t) => t * t;
const easeOut: EaseFn = (t) => 1 - (1 - t) * (1 - t);
const easeInOut: EaseFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
const easeOutBack: EaseFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutElastic: EaseFn = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutBounce: EaseFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

export const EASING: Record<EaseName, EaseFn> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeOutBack,
  easeOutBounce,
  easeOutElastic,
};

export function getEase(name: EaseName | undefined): EaseFn {
  return EASING[name ?? "easeOut"];
}

/** Keterangan ramah-human, dipakai UI & panduan prompt. */
export const EASE_INFO: Array<{ name: EaseName; caption: string }> = [
  { name: "linear", caption: "kecepatan konstan (tanpa akselerasi)" },
  { name: "easeIn", caption: "mulai lambat, makin cepat" },
  { name: "easeOut", caption: "mulai cepat, berhenti halus (pas untuk slide)" },
  { name: "easeInOut", caption: "halus dua-duanya (pas untuk gerak melayang)" },
  { name: "easeOutBack", caption: "ada sedikit overshoot (pas untuk pop)" },
  { name: "easeOutBounce", caption: "memantul saat berhenti" },
  { name: "easeOutElastic", caption: "karet, bergetar lalu menetap" },
];
