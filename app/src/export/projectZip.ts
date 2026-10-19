import { Unzip, UnzipInflate } from "fflate";
import { openProject } from "../engine/project";
import type { BatchItem } from "./batch";

export interface ProjectZipResult { ok: BatchItem[]; gagal: { label: string; pesan: string }[] }

/** Bounded streaming decompression; filenames are labels, never filesystem paths. */
export async function readProjectZip(bytes: Uint8Array): Promise<ProjectZipResult> {
  if (bytes.length > 12_000_000) throw new Error("ZIP maksimal 12 MB.");
  if (bytes[0] !== 80 || bytes[1] !== 75) throw new Error("File bukan arsip ZIP.");
  const result: ProjectZipResult = { ok: [], gagal: [] };
  const files: { name: string; data: Uint8Array[] }[] = [];
  let count = 0, total = 0;
  const unzip = new Unzip((file) => {
    if (++count > 100) throw new Error("ZIP maksimal 100 entri.");
    if (file.name.endsWith("/")) return;
    if (!/\.motion\.json$/i.test(file.name)) {
      result.gagal.push({ label: file.name, pesan: "Diabaikan: hanya .motion.json dengan asset embedded yang didukung." });
      return;
    }
    if (files.length >= 20) throw new Error("ZIP maksimal 20 proyek.");
    if (file.name.startsWith("/") || file.name.includes("\\") || file.name.split("/").includes("..")) throw new Error("Path file ZIP tidak aman.");
    const entry = { name: file.name, data: [] as Uint8Array[] };
    files.push(entry);
    let size = 0;
    file.ondata = (error, data) => {
      if (error) throw error;
      size += data.length; total += data.length;
      if (size > 12_000_000 || total > 24_000_000) { file.terminate(); throw new Error("Batas ekstraksi ZIP terlampaui: 12 MB per proyek / 24 MB total."); }
      entry.data.push(data);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    unzip.push(bytes.subarray(offset, offset + 32768), offset + 32768 >= bytes.length);
  }
  for (const entry of files) {
    try {
      const text = await new Blob(entry.data.map((chunk) => new Uint8Array(chunk))).text();
      const def = await openProject(text);
      result.ok.push({ nama: `${entry.name} · ${def.name}`, def });
    } catch (error) { result.gagal.push({ label: entry.name, pesan: (error as Error).message }); }
  }
  if (!files.length) throw new Error("ZIP tidak berisi proyek .motion.json.");
  return result;
}
