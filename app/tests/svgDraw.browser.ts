/** Run in a browser against Vite: import('/tests/svgDraw.browser.ts').then(m => m.testSvgDraw()). */
import { pulihkanWarnaAsli, prepareImageAssets, svgToMotionDefinition, terapkanRecolorLayer } from "../src/engine/svg";
import { renderFrame } from "../src/engine/renderer";
import { validateDefinition } from "../src/engine/validator";
import type { LayerSpec } from "../src/engine/schema";

/** Skala satuan viewBox asset ke piksel kanvas (uniform, karena geo & vb sejajar bbox). */
const kSkala = (l: LayerSpec, W = 1920) => ((l.geometry.w ?? 1) * W) / (l.draw?.vb.w ?? 1);
/** Posisi canvas dari koordinat user (satuan viewBox) pada layer draw. */
const titik = (l: LayerSpec, xUser: number, yUser: number) => {
  const k = l.draw ? kSkala(l) : 1;
  const cx = (l.geometry.x ?? 0.5) * 1920 + (xUser - (l.draw!.vb.x + l.draw!.vb.w / 2)) * k;
  const cy = (l.geometry.y ?? 0.5) * 1080 + (yUser - (l.draw!.vb.y + l.draw!.vb.h / 2)) * k;
  return { x: Math.round(cx), y: Math.round(cy) };
};

const SAMPEL = (ctx: CanvasRenderingContext2D, t: { x: number; y: number }) => ctx.getImageData(t.x, t.y, 1, 1).data;

export async function testSvgDraw() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(`FAIL: ${name}`); results.push(name); };
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("no ctx");

  // 1) Path tunggal ber-outline → layer draw otomatis (halus: masuk "draw").
  const def1 = svgToMotionDefinition(
    "garis.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><path id="coret" d="M300 540 H900" fill="none" stroke="#ff0000" stroke-width="14"/></svg>',
  );
  const garis = def1.layers[0];
  assert("layer path ber-outline → draw spec", !!garis.draw && garis.draw.paths.length === 1);
  assert("gerak masuk otomatis draw + dur 1.2", garis.motion?.in?.type === "draw" && garis.motion?.in?.dur === 1.2);
  assert("panjang path terukur (getTotalLength)", Math.abs(garis.draw!.paths[0].len - 600) < 5);
  assert("warna stroke draw dari SVG", garis.draw!.paths[0].stroke === "#ff0000" && garis.draw!.fill === null);
  assert("def draw lolos validator", validateDefinition(def1).errors.length === 0);

  ctx.clearRect(0, 0, 1920, 1080);
  await prepareImageAssets(def1);
  renderFrame(ctx, def1, 0.01);
  let p = SAMPEL(ctx, titik(garis, 500, 540));
  assert("t=0.01: garis belum digambar (alpha 0)", p[3] < 10);
  ctx.clearRect(0, 0, 1920, 1080);
  renderFrame(ctx, def1, 0.6);
  p = SAMPEL(ctx, titik(garis, 500, 540));
  assert("t=0.6: separuh garis sudah digambar (merah)", p[0] > 200 && p[3] > 200);
  p = SAMPEL(ctx, titik(garis, 800, 540));
  assert("t=0.6: bagian akhir garis belum tergambar", p[3] < 10);
  ctx.clearRect(0, 0, 1920, 1080);
  renderFrame(ctx, def1, 3);
  p = SAMPEL(ctx, titik(garis, 800, 540));
  assert("t=3: garis utuh sampai ujung", p[0] > 200 && p[3] > 200);

  // 2) Static fallback: in diganti fadeIn → asset gambar tampil normal.
  const statis = { ...def1, layers: [{ ...garis, motion: { ...garis.motion, in: { type: "fadeIn" as const, dur: 0.4 } } }] };
  ctx.clearRect(0, 0, 1920, 1080);
  await prepareImageAssets(statis);
  renderFrame(ctx, statis, 3);
  p = SAMPEL(ctx, titik(garis, 800, 540));
  assert("fallback static (fadeIn) tetap menampilkan asset", p[0] > 200 && p[3] > 200);

  // 3) Group dua path warna berbeda → satu layer draw, warna per path.
  const def2 = svgToMotionDefinition(
    "duo.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g id="duo" stroke-width="6"><path d="M600 300 h400" fill="none" stroke="#ff0000"/><path d="M600 500 h400" fill="none" stroke="#0000ff"/></g></svg>',
  );
  const duo = def2.layers[0];
  assert("group path → draw, dua warna", !!duo.draw && duo.draw.paths.length === 2 && duo.draw.paths[0].stroke === "#ff0000" && duo.draw.paths[1].stroke === "#0000ff");
  await prepareImageAssets(def2);
  ctx.clearRect(0, 0, 1920, 1080);
  renderFrame(ctx, def2, 3);
  p = SAMPEL(ctx, titik(duo, 800, 300));
  assert("garis merah group digambar", p[0] > 200 && p[1] < 60 && p[3] > 200);
  p = SAMPEL(ctx, titik(duo, 800, 500));
  assert("garis biru group digambar", p[2] > 200 && p[1] < 60 && p[3] > 200);

  // 4) Group berisi non-path (rect) → tidak jadi draw, tetap fadeIn.
  const def3 = svgToMotionDefinition(
    "campur.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g id="campur"><path d="M200 200 h300" fill="none" stroke="#ff0000" stroke-width="6"/><rect x="600" y="180" width="100" height="80" fill="#00ff00"/></g></svg>',
  );
  assert("group dengan rect → tanpa draw", !def3.layers[0].draw && def3.layers[0].motion?.in?.type === "fadeIn");

  // 5) Path dengan fill: isi muncul setelah garis selesai.
  const def4 = svgToMotionDefinition(
    "segitiga.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><path id="segitiga" d="M960 200 L760 600 L1160 600 Z" fill="#00ff00" stroke="#ff00ff" stroke-width="10"/></svg>',
  );
  const tri = def4.layers[0];
  assert("layer segitiga draw + fill tersimpan", !!tri.draw && tri.draw.fill === "#00ff00");
  await prepareImageAssets(def4);
  ctx.clearRect(0, 0, 1920, 1080);
  renderFrame(ctx, def4, 3);
  p = SAMPEL(ctx, titik(tri, 960, 480));
  assert("isi segitiga muncul setelah garis", p[1] > 200 && p[3] > 200);
  let outlineMagenta = false;
  const tepi = titik(tri, 860, 400); // titik tengah sisi kiri segitiga
  for (let dy = -3; dy <= 3 && !outlineMagenta; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const q = SAMPEL(ctx, { x: tepi.x + dx, y: tepi.y + dy });
      if (q[0] > 200 && q[2] > 200) { outlineMagenta = true; break; }
    }
  }
  assert("outline magenta di sisi kiri", outlineMagenta);

  // 6) d terlalu panjang (>20k chars) → layer tanpa draw (fade biasa).
  let dGede = "M100 100 ";
  while (dGede.length < 21_000) dGede += "l1 1 ";
  const def5 = svgToMotionDefinition(
    "gede.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><path d="${dGede}" fill="none" stroke="#00ff00" stroke-width="6"/></svg>`,
  );
  assert("path d >20k chars tidak jadi draw", !def5.layers[0].draw && def5.layers[0].motion?.in?.type === "fadeIn");

  // 7) >40 path satu group → tidak jadi draw.
  const banyak = Array.from({ length: 41 }, (_, i) => `<path d="M100 ${100 + i} h300" fill="none" stroke="#ff8800" stroke-width="4"/>`).join("");
  const def6 = svgToMotionDefinition(
    "banyak.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g id="banyak">${banyak}</g></svg>`,
  );
  assert("group >40 path tidak jadi draw", !def6.layers[0].draw && def6.layers[0].motion?.in?.type === "fadeIn");

  // 8) Recolor layer draw: garis & isi ikut tersinkron.
  const merahBergaris = terapkanRecolorLayer(duo, "garis", "#123456");
  assert("recolor garis mengubah warna draw", merahBergaris.draw!.paths.every((item) => item.stroke === "#123456"));
  const grad = def4.layers[0];
  const isiKuning = terapkanRecolorLayer(grad, "isi", "#ffff00");
  assert("recolor isi mengubah fill draw", isiKuning.draw!.fill === "#ffff00");
  assert("recolor isi tidak mengubah stroke draw", isiKuning.draw!.paths[0].stroke === "#ff00ff");
  const duaWarna = terapkanRecolorLayer(grad, "semua", "#0af0af");
  assert("recolor semua mengubah fill + garis draw", duaWarna.draw!.fill === "#0af0af" && duaWarna.draw!.paths[0].stroke === "#0af0af");
  assert("asset ikut direcolor (attr stroke)", duaWarna.asset!.includes("%230af0af"));
  const kembali = pulihkanWarnaAsli(duaWarna);
  assert("pulihkan mengembalikan warna draw asli", kembali.draw!.fill === "#00ff00" && kembali.draw!.paths[0].stroke === "#ff00ff" && kembali.asset === kembali.assetAwal);

  // 9) draw pada layer non-image: warning, bukan error.
  const salah = { ...def1, layers: [{ ...def1.layers[0], kind: "text" as const, text: { content: "x", size: 0.05 } }] };
  const hasil = validateDefinition(salah);
  assert("draw di non-image hanya warning", hasil.errors.length === 0 && hasil.warnings.some((w) => String(w.path + " " + w.message).includes("draw")));

  return { passed: results.length, results };
}
