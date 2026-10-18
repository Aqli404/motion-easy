/**
 * export/batch.ts — parsing kumpulan MotionDefinition untuk Bulk ZIP.
 *
 * bentuk input yang diterima (user pysai tempel dari jawaban AI):
 * 1. BLOK ```json``` berulang — satu blok = satu karya
 * 2. Dipisah baris "---" (3 garis atau lebih)
 * 3. SATU array JSON berisi banyak objek definisi
 *
 * Tiap karya divalidasi penuh oleh validator yang sama dengan Alur AI —
 * karya offending TIDAK membatalkan seluruh antrean, hanya dilaporkan.
 */

import type { MotionDefinition } from "../engine/schema";
import { extractJson, validateDefinition } from "../engine/validator";

export interface BatchItem {
  nama: string;
  def: MotionDefinition;
}

export interface BatchGagal {
  label: string;
  pesan: string;
}

/** Potong teks jadi segmen-segmen kandidat karya. */
function segmen(text: string): string[] {
  const t = text.trim();
  if (t === "") return [];
  if (t.includes("```")) {
    const hasil: string[] = [];
    const re = /```(?:json)?\s*([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) hasil.push(m[1]);
    if (hasil.length === 0) hasil.push(t);
    return hasil;
  }
  if (/^\s*-{3,}\s*$/m.test(t)) return t.split(/^\s*-{3,}\s*$/m);
  return [t];
}

export function parsingBatch(text: string): { ok: BatchItem[]; gagal: BatchGagal[] } {
  const ok: BatchItem[] = [];
  const gagal: BatchGagal[] = [];

  const semua: unknown[] = [];
  let nomor = 0;

  for (const raw of segmen(text)) {
    const seg = raw.trim();
    if (!seg) continue;
    nomor++;
    const label = `karya #${nomor}`;
    const { json, error } = extractJson(seg);
    if (!json) {
      gagal.push({ label, pesan: error ?? "JSON tidak bisa dibaca" });
      continue;
    }
    if (Array.isArray(json)) {
      for (let i = 0; i < json.length; i++) { semua.push(json[i]); }
      continue;
    }
    semua.push(json);
  }

  // label per item dari array jauh lebih bermakna dengan nama aslinya;
  // validasi dilakukan di sini (satu tempat, dua sumber input).
  return validasiSemua(semua, ok, gagal);
}

function validasiSemua(
  semua: unknown[],
  ok: BatchItem[],
  gagal: BatchGagal[],
): { ok: BatchItem[]; gagal: BatchGagal[] } {
  semua.forEach((el, idx) => {
    const label = `karya #${idx + 1}`;
    const r = validateDefinition(el);
    const errs = r.errors.filter((e) => e.level === "error");
    if (!r.def || errs.length > 0) {
      gagal.push({
        label,
        pesan:
          errs.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join(" · ") ||
          "struktur tidak valid",
      });
      return;
    }
    ok.push({ nama: r.def.name, def: r.def });
  });
  return { ok, gagal };
}
