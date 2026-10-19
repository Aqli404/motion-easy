import { buatZip, type ArsipFile } from "../src/export/zip";
import { readProjectZip } from "../src/export/projectZip";
import { duplicateLayer } from "../src/engine/project";
import { svgToMotionDefinition } from "../src/engine/svg";
import type { MotionDefinition } from "../src/engine/schema";

export async function testProjectZip() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(`FAIL: ${name}`); results.push(name); };
  const a = (nama: string, teks: string): ArsipFile => ({ nama, data: new TextEncoder().encode(teks) });

  // Proyek sah: SVG dengan asset embedded + satu perubahan layer
  const def = svgToMotionDefinition("batch.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect id="bg" width="200" height="100" fill="#123456"/><circle id="dot" cx="100" cy="50" r="20" fill="#ffffff"/></svg>');
  def.layers[1].style = { opacity: 0.5 };
  def.layers[0].time = { from: 0.2, to: 4 };

  // 1) ZIP sah: 2 proyek + file tak dikenal diabaikan + subfolder
  const zipSah = buatZip([
    a("01-logo.motion.json", JSON.stringify(def, null, 2)),
    a("dalam/sub/02-kedua.motion.json", JSON.stringify(duplicateLayer(def, def.layers[0].id), null, 2)),
    a("README.txt", "diabaikan"),
    a("bukan-proyek.json", "{}"),
  ]);
  const hasil = await readProjectZip(new Uint8Array(await zipSah.arrayBuffer()));
  assert("dua proyek dimuat", hasil.ok.length === 2);
  assert("proyek utuh: asset + edit tersimpan", hasil.ok[0].nama.includes("01-logo.motion.json") && JSON.stringify(hasil.ok[0].def) === JSON.stringify(def));
  assert("subfolder tetap dibaca", hasil.ok[1].nama.includes("sub"));
  assert("file non-proyek dilaporkan diabaikan", hasil.gagal.length === 2 && hasil.gagal.every((g) => g.pesan.includes("Diabaikan")));
  assert("perubahan layer ikut lolos validasi", hasil.ok[0].def.layers[1].style?.opacity === 0.5);

  // 2) Canvas code ditolak per-file; proyek baik dalam ZIP yang sama tetap dimuat
  const jahat: MotionDefinition = { ...def, layers: [{ ...def.layers[0], kind: "canvas", kanvas: { source: "function draw(){ throw new Error('must not run'); }" } }] };
  const zipKanvas = buatZip([a("01-jahat.motion.json", JSON.stringify(jahat, null, 2)), a("02-baik.motion.json", JSON.stringify(def, null, 2))]);
  const hasilKanvas = await readProjectZip(new Uint8Array(await zipKanvas.arrayBuffer()));
  assert("kode canvas ditolak tanpa dieksekusi", hasilKanvas.ok.length === 1 && hasilKanvas.ok[0].nama.includes("02-baik"));
  assert("pesan penolakan menjelaskan alasan", hasilKanvas.gagal[0].pesan.includes("Canvas"));

  // 3) Path berbahaya ditolak
  let pathDitolak = false;
  try { await readProjectZip(new Uint8Array(await buatZip([a("../escape.motion.json", JSON.stringify(def))]).arrayBuffer())); } catch { pathDitolak = true; }
  assert("path traversal ditolak", pathDitolak);

  // 4) Bukan ZIP ditolak
  let bukanZip = false;
  try { await readProjectZip(new TextEncoder().encode("hello world, bukan arsip")); } catch { bukanZip = true; }
  assert("file bukan ZIP ditolak", bukanZip);

  // 5) ZIP tanpa proyek .motion.json ditolak
  let kosong = false;
  try { await readProjectZip(new Uint8Array(await buatZip([a("catatan.txt", "isi")]).arrayBuffer())); } catch { kosong = true; }
  assert("ZIP tanpa proyek ditolak", kosong);

  // 6) Entri berlebih (101 file) ditolak
  let terlaluBanyak = false;
  try {
    const ramai: ArsipFile[] = Array.from({ length: 101 }, (_, index) => a(`file-${index}.txt`, "x"));
    await readProjectZip(new Uint8Array(await buatZip(ramai).arrayBuffer()));
  } catch { terlaluBanyak = true; }
  assert("batas 100 entri ditegakkan", terlaluBanyak);

  // 7) Bukan proyek JSON valid ditolak per-file
  const rusak = buatZip([a("01-rusak.motion.json", "{ json tidak lengkap"), a("02-baik.motion.json", JSON.stringify(def))]);
  const hasilRusak = await readProjectZip(new Uint8Array(await rusak.arrayBuffer()));
  assert("proyek rusak ditolak, yang baik tetap jalan", hasilRusak.ok.length === 1 && hasilRusak.gagal.length === 1);

  return { passed: results.length, results };
}
