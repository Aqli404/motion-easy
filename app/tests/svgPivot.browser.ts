import { prepareImageAssets, svgToMotionDefinition } from "../src/engine/svg";
import { renderFrame } from "../src/engine/renderer";

/**
 * Pivot per objek: asset dipotong ke bbox elemen sehingga rotasi/scale
 * berputar di sekitar pusat objek, bukan pusat artboard.
 */
export async function testSvgPivot() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(`FAIL: ${name}`); results.push(name); };

  const def = svgToMotionDefinition(
    "pivot.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect id="kotak" x="100" y="500" width="300" height="100" fill="#00ff00"/><circle id="lingkaran" cx="1500" cy="300" r="150" fill="#ff0000"/></svg>',
  );
  assert("dua layer nama id tetap", def.layers.length === 2 && def.layers[0].name === "kotak" && def.layers[1].name === "lingkaran");
  assert("geometry mengikuti bbox: di kiri artboard", def.layers[0].geometry.x < 0.3);
  assert("lebar = bbox × 0,8 / 1920", Math.abs(def.layers[0].geometry.w - (300 * 0.8) / 1920) < 0.02);
  assert("tinggi = bbox × 0,8 / 1080", Math.abs(def.layers[0].geometry.h - (100 * 0.8) / 1080) < 0.02);
  assert("layer kanan mengikuti bbox sendiri", def.layers[1].geometry.x > 0.7);

  const rotated = {
    ...def,
    layers: def.layers.map((l, i) => (i === 0 ? { ...l, style: { ...l.style, rotation: 180 } } : l)),
  };
  await prepareImageAssets(rotated);
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("no ctx");
  renderFrame(ctx, rotated, 1);
  const at = (x: number, y: number) => {
    const d = ctx.getImageData(x, y, 1, 1).data;
    return { r: d[0], g: d[1], a: d[3] };
  };
  const cx = Math.round(rotated.layers[0].geometry.x * 1920);
  const cy = Math.round(rotated.layers[0].geometry.y * 1080);
  const center = at(cx, cy);
  assert("pusat bbox tetap hijau setelah rotasi 180 (pivot per objek)", center.g > 200 && center.a > 200);
  const mirror = at(1920 - cx, 1080 - cy);
  assert("titik hasil pivot artboard lama kosong", mirror.g < 60);

  // Elemen sebagian di luar viewBox: bbox dilampi ke irisan artboard.
  const defSetengah = svgToMotionDefinition(
    "setengah.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect id="setengah" x="-150" y="400" width="300" height="200" fill="#00aaff"/></svg>',
  );
  assert("layer setengah keluar artboard tetap ada", defSetengah.layers.length === 1);
  assert("bbox dilampi ke irisan artboard", defSetengah.layers[0].geometry.w < 0.08);
  await prepareImageAssets(defSetengah);

  // Elemen sepenuhnya di luar viewBox: fallback artboard penuh, tidak error.
  const defLuar = svgToMotionDefinition(
    "luar.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect id="luar" x="2100" y="100" width="300" height="200" fill="#ee00ff"/></svg>',
  );
  assert("elemen di luar viewBox memakai artboard penuh", defLuar.layers.length === 1 && Math.abs(defLuar.layers[0].geometry.w - 0.8) < 0.02);
  await prepareImageAssets(defLuar);

  // Grup dengan transform: bbox mencakup transform milik elemen.
  const defTransform = svgToMotionDefinition(
    "transform.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g id="geser" transform="translate(600 200)"><rect x="100" y="100" width="200" height="100" fill="#ffff00"/></g></svg>',
  );
  assert("bbox mencakup transform translate", defTransform.layers[0].geometry.x > 0.3 && defTransform.layers[0].geometry.x < 0.65);
  await prepareImageAssets(defTransform);

  return { passed: results.length, results };
}
