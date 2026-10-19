import type { MotionDefinition } from "./schema";
import { validateDefinition } from "./validator";
import { prepareImageAssets } from "./svg";

export const MAX_PROJECT_BYTES = 12_000_000;

/** Project files are data, never an authorization to execute imported code. */
export async function openProject(text: string): Promise<MotionDefinition> {
  if (new Blob([text]).size > MAX_PROJECT_BYTES) throw new Error("Proyek terlalu besar. Maksimal 12 MB.");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("JSON proyek tidak valid."); }
  if (typeof data === "object" && data !== null && "layers" in data && Array.isArray(data.layers) && data.layers.some((layer: unknown) => typeof layer === "object" && layer !== null && "kind" in layer && layer.kind === "canvas")) {
    throw new Error("Proyek berisi kode Canvas ditolak. Buka proyek hanya mendukung layer data/SVG agar kode dari file tidak dijalankan otomatis.");
  }
  const result = validateDefinition(data);
  if (!result.def || result.errors.length) {
    throw new Error(result.errors.slice(0, 3).map((issue) => `${issue.path}: ${issue.message}`).join(" · "));
  }
  if (result.def.layers.some((layer) => layer.kind === "canvas")) {
    throw new Error("Buka proyek saat ini hanya mendukung layer data/SVG. Proyek berisi kode Canvas ditolak agar kode dari file tidak dijalankan otomatis.");
  }
  await prepareImageAssets(result.def);
  return result.def;
}

export function projectText(def: MotionDefinition): string {
  if (def.layers.some((layer) => layer.kind === "canvas")) throw new Error("Simpan/buka proyek saat ini mendukung layer data dan SVG, belum kode Canvas.");
  const text = JSON.stringify(def, null, 2);
  if (new Blob([text]).size > MAX_PROJECT_BYTES) throw new Error("Proyek terlalu besar untuk disimpan (maksimal 12 MB).");
  return text;
}

export function moveLayer(def: MotionDefinition, id: string, direction: -1 | 1): MotionDefinition {
  const index = def.layers.findIndex((layer) => layer.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= def.layers.length) return def;
  const layers = [...def.layers];
  [layers[index], layers[target]] = [layers[target], layers[index]];
  return { ...def, layers };
}

export function duplicateLayer(def: MotionDefinition, id: string): MotionDefinition {
  if (def.layers.length >= 60) throw new Error("Maksimal 60 layer per proyek.");
  const index = def.layers.findIndex((layer) => layer.id === id);
  if (index < 0) return def;
  const copy = { ...def.layers[index], id: crypto.randomUUID(), name: `${def.layers[index].name ?? id} · salinan` };
  return { ...def, layers: [...def.layers.slice(0, index + 1), copy, ...def.layers.slice(index + 1)] };
}
