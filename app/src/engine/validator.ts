/**
 * Fase 3 — Validator MotionDefinition.
 * Menerjemahkan aturan docs/SCHEMA.md ke pengecekan struktur dengan
 * pesan error berbahasa Indonesia yang bisa dibaca user (dan AI, saat self-heal).
 */

import type { MotionDefinition, LayerSpec } from "./schema";
import { EASE_NAMES, LAYER_KINDS, IN_OUT_TYPES, LOOP_TYPES } from "./schema";
import { compileKanvas } from "./kanvas";

export interface Issue {
  path: string;
  message: string;
  level: "error" | "warning";
}

export interface ValidationResult {
  def: MotionDefinition | null;
  errors: Issue[];
  warnings: Issue[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";

/** Ambil JSON dari teks hasil AI — tahan balutan ```json fence / kalimat basa-basi. */
export function extractJson(text: string): { json?: unknown; error?: string } {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return {
      error:
        "Tidak ada JSON terdeteksi. Minta AI mengulang dengan HANYA satu blok kode ```json```.",
    };
  }
  try {
    return { json: JSON.parse(body.slice(start, end + 1)) };
  } catch (e) {
    return { error: `JSON rusak: ${(e as Error).message}` };
  }
}

export function validateDefinition(json: unknown): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const E = (path: string, message: string) => errors.push({ path, message, level: "error" });
  const W = (path: string, message: string) => warnings.push({ path, message, level: "warning" });

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return {
      def: null,
      errors: [{ path: "$", message: "Output bukan objek MotionDefinition.", level: "error" }],
      warnings,
    };
  }
  const root = json as Record<string, unknown>;

  if (root.version !== 1) {
    E("version", `"version" wajib 1 (dapat: ${JSON.stringify(root.version)}).`);
  }
  if (!isStr(root.name) || root.name.trim() === "") {
    W("name", `"name" kosong — dipakai nama default.`);
  }

  // === canvas ===
  const canvas = root.canvas;
  if (typeof canvas !== "object" || canvas === null) {
    E("canvas", "Objek " + '"canvas"' + " wajib ada.");
  } else {
    const c = canvas as Record<string, unknown>;
    if (!isNum(c.w) || !isNum(c.h) || c.w < 8 || c.h < 8) {
      E("canvas.w/h", "canvas.w & canvas.h wajib piksel > 8.");
    }
    if (c.fps !== 24 && c.fps !== 30 && c.fps !== 60) {
      E("canvas.fps", "canvas.fps wajib 24, 30, atau 60.");
    }
    if (!isNum(c.durationSec) || c.durationSec < 1 || c.durationSec > 60) {
      E("canvas.durationSec", "durasi wajib 1-60 detik.");
    }
    if (c.background !== null && !isStr(c.background)) {
      E("canvas.background", "canvas.background wajib hex atau null (transparan).");
    } else if (isStr(c.background) && !HEX.test(c.background)) {
      E("canvas.background", "background harus hex 6 digit (#rrggbb).");
    }
  }

  // === layers ===
  const rawLayers = root.layers;
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    E("layers", "layers wajib array berisi minimal 1 layer.");
  } else {
    if (rawLayers.length > 60) {
      E("layers", `Terlalu banyak layer (${rawLayers.length}). Maksimal 60.`);
    }
    const seenIds = new Set<string>();
    rawLayers.forEach((rl, i) => {
      const path = `layers[${i}]`;
      if (typeof rl !== "object" || rl === null) {
        E(path, "Layer bukan objek.");
        return;
      }
      const l = rl as Record<string, unknown>;

      // id
      if (!isStr(l.id) || l.id.trim() === "") {
        E(`${path}.id`, "id wajib string unik.");
      } else if (seenIds.has(l.id)) {
        E(`${path}.id`, `id "${l.id}" dobel — id harus unik.`);
      } else {
        seenIds.add(l.id);
      }

      // kind
      const kind = l.kind;
      if (!isStr(kind) || !(LAYER_KINDS as readonly string[]).includes(kind)) {
        E(`${path}.kind`, `kind "${String(kind)}" tidak dikenal. Pilih: ${LAYER_KINDS.join(", ")}.`);
        return;
      }

      // geometry & time
      const geo = l.geometry;
      if (typeof geo !== "object" || geo === null) {
        E(`${path}.geometry`, "geometry wajib: { x, y, w?, h? } (fraksi).");
      } else {
        const g = geo as Record<string, unknown>;
        if (!isNum(g.x) || !isNum(g.y)) {
          E(`${path}.geometry.x/y`, "geometry.x & geometry.y wajib angka fraksi 0..1.");
        }
        const needsWH = kind === "rect" || kind === "ellipse" || kind === "triangle";
        if (needsWH && (!isNum(g.w) || !isNum(g.h) || g.w <= 0 || g.h <= 0)) {
          E(`${path}.geometry.w/h`, `kind "${kind}" wajib punya geometry.w & geometry.h > 0.`);
        }
      }

      const time = l.time;
      if (typeof time !== "object" || time === null) {
        E(`${path}.time`, "time wajib: { from, to } dalam detik.");
      } else {
        const tm = time as Record<string, unknown>;
        if (!isNum(tm.from) || !isNum(tm.to) || tm.from < 0 || tm.to <= tm.from) {
          E(`${path}.time`, "time.from < time.to, keduanya angka detik, from >= 0.");
        }
      }

      // style
      const style = l.style;
      if (style !== undefined && style !== null) {
        if (typeof style !== "object") {
          E(`${path}.style`, "style harus objek.");
        } else {
          const s = style as Record<string, unknown>;
          if (s.color !== undefined && !HEX.test(String(s.color))) {
            E(`${path}.style.color`, "style.color harus hex 6 digit.");
          }
          if (s.stroke !== undefined && !HEX.test(String(s.stroke))) {
            E(`${path}.style.stroke`, "style.stroke harus hex 6 digit.");
          }
          if (s.opacity !== undefined && (!isNum(s.opacity) || s.opacity < 0 || s.opacity > 1)) {
            E(`${path}.style.opacity`, "opacity 0..1.");
          }
          if (s.rotation !== undefined && (!isNum(s.rotation) || Math.abs(s.rotation) > 720)) {
            E(`${path}.style.rotation`, "rotation harus derajat (-720..720).");
          }
        }
      }

      // text wajib utk kind text
      if (kind === "text") {
        const txt = l.text;
        if (typeof txt !== "object" || txt === null) {
          E(`${path}.text`, `Layer kind "text" wajib punya objek "text".`);
        } else {
          const x = txt as Record<string, unknown>;
          if (!isStr(x.content) || x.content.trim() === "") {
            E(`${path}.text.content`, "text.content wajib string tidak kosong.");
          }
          if (!isNum(x.size) || x.size < 0.003 || x.size > 0.25) {
            E(`${path}.text.size`, "text.size harus fraksi tinggi kanvas 0.003..0.25.");
          }
          if (x.align !== undefined && !["left", "center", "right"].includes(String(x.align))) {
            E(`${path}.text.align`, "align: left | center | right.");
          }
          if (x.font !== undefined && !["sans", "mono"].includes(String(x.font))) {
            E(`${path}.text.font`, "font: sans | mono.");
          }
          if (x.weight !== undefined && ![400, 500, 600, 700, 800, 900].includes(Number(x.weight))) {
            W(`${path}.text.weight`, "weight akan dibulatkan ke 400..900.");
          }
        }
      }
      if (kind === "line") {
        const ln = l.line;
        if (typeof ln !== "object" || ln === null) {
          E(`${path}.line`, `Layer kind "line" wajib punya objek "line" { to: {x,y} }.`);
        } else {
          const to = (ln as Record<string, unknown>).to;
          if (typeof to !== "object" || to === null || !isNum((to as Record<string, unknown>).x) || !isNum((to as Record<string, unknown>).y)) {
            E(`${path}.line.to`, "line.to wajib { x, y } fraksi.");
          }
        }
      }
      if (kind === "image") {
        if (!isStr(l.asset) || !l.asset.startsWith("data:image/svg+xml;charset=utf-8,")) {
          E(`${path}.asset`, "kind image wajib punya asset SVG lokal dari import SVG Motion.");
        }
      }

      // kanvas wajib utk kind canvas
      if (kind === "canvas") {
        const k = l.kanvas;
        if (typeof k !== "object" || k === null || !isStr((k as Record<string, unknown>).source)) {
          E(`${path}.kanvas`, 'kind "canvas" wajib punya objek "kanvas": { source: "function draw(ctx, time, w, h, fx) { ... }" }.');
        } else {
          const src = (k as Record<string, unknown>).source as string;
          const compiled = compileKanvas(src);
          if (compiled instanceof Error) {
            E(`${path}.kanvas.source`, compiled.message);
          } else {
            W(`${path}.kanvas`, "kind \"canvas\" menjalankan kode apa adanya — pastikan deterministik (tanpa Math.random/Date/fetch) supaya preview & export identik.");
          }
          // peringatan bila layer canvas memakai motion.loop (tidak berpengaruh)
          const mvC = l.motion as Record<string, unknown> | undefined;
          const loopC = typeof mvC?.loop === "object" && mvC.loop !== null ? (mvC.loop as Record<string, unknown>) : null;
          if (loopC) {
            W(`${path}.motion.loop`, "motion.loop tidak memengaruhi kind \"canvas\" — gelombang/denyut dibuat di dalam kode draw() pakai fx.");
          }
        }
      }

      // motion
      const motion = l.motion;
      if (motion !== undefined && motion !== null) {
        if (typeof motion !== "object") {
          E(`${path}.motion`, "motion harus objek { in?, out?, loop? }.");
        } else {
          const m = motion as Record<string, unknown>;
          const inM = m.in;
          if (inM !== undefined && inM !== null) {
            if (typeof inM !== "object") {
              E(`${path}.motion.in`, "motion.in harus objek.");
            } else {
              const mi = inM as Record<string, unknown>;
              if (mi.type !== undefined && !(IN_OUT_TYPES as readonly string[]).includes(String(mi.type))) {
                E(`${path}.motion.in.type`, `type "${String(mi.type)}" tidak dikenal.`);
              }
              if (mi.type === "fadeOut") {
                E(`${path}.motion.in.type`, '"fadeOut" hanya untuk motion.out (untuk masuk pakai "fadeIn").');
              }
              if (mi.dur !== undefined && (!isNum(mi.dur) || mi.dur <= 0 || mi.dur > 3)) {
                W(`${path}.motion.in.dur`, "dur gerakan biasanya 0.2..1.5 dtk.");
              }
              if (mi.at !== undefined && (!isNum(mi.at) || mi.at < 0)) {
                E(`${path}.motion.in.at`, "at = offset detik >= 0 dari time.from.");
              }
              if (mi.easing !== undefined && !(EASE_NAMES as readonly string[]).includes(String(mi.easing))) {
                E(`${path}.motion.in.easing`, `easing "${String(mi.easing)}" tidak dikenal. Pilih: ${EASE_NAMES.join(", ")}.`);
              }
            }
          }
          const outM = m.out;
          if (outM !== undefined && outM !== null) {
            if (typeof outM !== "object") {
              E(`${path}.motion.out`, "motion.out harus objek.");
            } else {
              const mo = outM as Record<string, unknown>;
              if (mo.type !== undefined && !(IN_OUT_TYPES as readonly string[]).includes(String(mo.type))) {
                E(`${path}.motion.out.type`, `type "${String(mo.type)}" tidak dikenal.`);
              }
              if (mo.type === "fadeIn") {
                E(`${path}.motion.out.type`, '"fadeIn" hanya untuk motion.in (untuk keluar pakai "fadeOut").');
              }
              if (mo.before !== undefined && (!isNum(mo.before) || mo.before < 0)) {
                E(`${path}.motion.out.before`, "before = detik >= 0 (jeda sebelum layer berakhir).");
              }
              if (mo.easing !== undefined && !(EASE_NAMES as readonly string[]).includes(String(mo.easing))) {
                E(`${path}.motion.out.easing`, `easing "${String(mo.easing)}" tidak dikenal.`);
              }
            }
          }
          const loopM = m.loop;
          if (loopM !== undefined && loopM !== null) {
            if (typeof loopM !== "object") {
              E(`${path}.motion.loop`, "motion.loop harus objek.");
            } else {
              const ml = loopM as Record<string, unknown>;
              if (ml.type !== undefined && !(LOOP_TYPES as readonly string[]).includes(String(ml.type))) {
                E(`${path}.motion.loop.type`, `loop type "${String(ml.type)}" tidak dikenal. Pilih: ${LOOP_TYPES.join(", ")}.`);
              }
              const amtOk = isNum(ml.amount) && ml.amount >= 0 && ml.amount <= 0.5;
              if (ml.amount !== undefined && !amtOk) {
                E(`${path}.motion.loop.amount`, "amount loop harus fraksi 0..0.5.");
              }
              const phaseOk = isNum(ml.phase) && ml.phase >= 0 && ml.phase <= 1;
              if (ml.phase !== undefined && !phaseOk) {
                W(`${path}.motion.loop.phase`, "phase akan diputar ke 0..1.");
              }
            }
          }
        }
      }

      // catatan bila layer muncul persis seluruh durasi tapi ada loop float — fine.
      void (l as unknown as LayerSpec);
    });
  }

  if (errors.length > 0) {
    return { def: null, errors, warnings };
  }

  const def = json as unknown as MotionDefinition;
  const dur = def.canvas.durationSec;
  for (const l of def.layers) {
    if (l.time.to > dur + 0.001) {
      W(`layers[${l.id}].time`, `time.to (${l.time.to}) melewati durasi (${dur}s) — bagian akhir tak terlihat.`);
    }
    if (l.time.from > dur - 0.2 && l.time.to <= dur + 0.001) {
      W(`layers[${l.id}].time`, "layer muncul hampir di akhir video — cek lagi.");
    }
  }
  if (def.layers.length > 40) {
    W("layers", `${def.layers.length} layer — render & export masih lancar, tapi tetap pantau.`);
  }

  return { def, errors, warnings };
}
