import { openProject, projectText } from "../src/engine/project";
import { recolorLayerAsset, svgToMotionDefinition, prepareImageAssets } from "../src/engine/svg";
import { renderFrame } from "../src/engine/renderer";

const decode = (asset: string) => decodeURIComponent(asset.slice(asset.indexOf(",") + 1));
const attr = (asset: string, selector: string, name: string): string | null => {
  const doc = new DOMParser().parseFromString(decode(asset), "image/svg+xml");
  return doc.querySelector(selector)?.getAttribute(name) ?? null;
};

const SVG_UJI =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">' +
  '<rect id="kotak" x="300" y="300" width="400" height="300" fill="#123456" stroke="#00ff00" stroke-width="8"/>' +
  '<g id="grup" fill="#223344"><circle cx="1300" cy="400" r="120"/><rect x="1200" y="600" width="200" height="150"/></g>' +
  '<path id="garis" d="M200 850 L800 850" fill="none" stroke="#abcdef" stroke-width="14"/>' +
  '<circle id="grad" cx="960" cy="900" r="90" fill="url(#gr-utama)" stroke="#aabbcc" stroke-width="6"/>' +
  "<defs><linearGradient id=\"gr-utama\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop stop-color=\"#112233\"/><stop offset=\"1\" stop-color=\"#334455\"/></linearGradient></defs>" +
  "</svg>";

export async function testSvgRecolor() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(`FAIL: ${name}`); results.push(name); };

  const def = svgToMotionDefinition("recolor.svg", SVG_UJI);
  const byId = (id: string) => def.layers.find((l) => l.name === id)!;
  assert("assetAwal == asset saat impor", byId("kotak").asset === byId("kotak").assetAwal);

  // Recolor isi layer kotak: fill berganti, stroke tidak.
  const kotakMerah = recolorLayerAsset(byId("kotak").asset!, "isi", "#ff0000");
  const doc = new DOMParser().parseFromString(decode(kotakMerah), "image/svg+xml");
  assert("fill hex berganti", doc.querySelector("rect#kotak")?.getAttribute("fill") === "#ff0000");
  assert("stroke tidak tersentuh mode isi", doc.querySelector("rect#kotak")?.getAttribute("stroke") === "#00ff00");
  assert("asset belum berubah di def", byId("kotak").asset !== kotakMerah);

  // Recolor group: fill milik group (yang diwarisi anak) diganti; anak tanpa
  // fill sendiri tetap mewarisi — visual seluruh group berubah.
  const kotakNew = recolorLayerAsset(byId("kotak").asset!, "isi", "#112244");
  const def1 = { ...def, layers: def.layers.map((l) => (l.name === "kotak" ? { ...l, asset: kotakNew } : l)) };
  const grupBaru = recolorLayerAsset(byId("grup").asset!, "isi", "#ff8800");
  const docGrup = new DOMParser().parseFromString(decode(grupBaru), "image/svg+xml");
  const grup = docGrup.querySelector("g#grup")!;
  const anak = [...docGrup.querySelectorAll("g#grup circle, g#grup rect")];
  assert(
    "group diganti, anak mewarisi atau ikut diganti",
    grup.getAttribute("fill") === "#ff8800" &&
      anak.length === 2 &&
      anak.every((e) => e.getAttribute("fill") === null || e.getAttribute("fill") === "#ff8800"),
  );

  // Garis: mode isi menolak (tak ada warna hex di path selain 'none' + stroke miliknya? path punya stroke hex, fill=none saja).
  assert("mode isi menolak layer outline", (() => { try { recolorLayerAsset(byId("garis").asset!, "isi", "#ff0000"); return false; } catch { return true; } })());
  const garisBaru = recolorLayerAsset(byId("garis").asset!, "garis", "#123123");
  assert("stroke berganti mode garis", attr(garisBaru, "path#garis", "stroke") === "#123123");
  assert("fill=none tetap none", attr(garisBaru, "path#garis", "fill") === "none");

  // Gradien: layer tanpa fill hex menolak mode isi; mode garis mengganti
  // stroke-nya tanpa menyentuh fill url(#…) dan stop gradien di dalam asset.
  let isiDitolakPadaGrad = false;
  try { recolorLayerAsset(byId("grad").asset!, "isi", "#ff0000"); } catch { isiDitolakPadaGrad = true; }
  assert("mode isi menolak layer murni gradien", isiDitolakPadaGrad);
  const gradBaru = recolorLayerAsset(byId("grad").asset!, "garis", "#123123");
  assert("fill url(#gradien) tidak disentuh", /^url\(#/i.test(attr(gradBaru, "circle#grad", "fill") ?? ""));
  assert("stop gradient tidak diubah", attr(gradBaru, "stop", "stop-color") === "#112233");
  // tapi mode "semua" pada layer kotak mengganti fill + stroke sekaligus
  const semua = recolorLayerAsset(byId("kotak").asset!, "semua", "#2468ac");
  assert("mode semua: fill & stroke sama", attr(semua, "rect#kotak", "fill") === "#2468ac" && attr(semua, "rect#kotak", "stroke") === "#2468ac");

  // tolak warna invalid
  assert("warna non-hex ditolak", (() => { try { recolorLayerAsset(byId("kotak").asset!, "isi", "tomato"); return false; } catch { return true; } })());

  // render pixel: recolor terlihat di frame
  const merah = def.layers.map((l) => (l.name === "kotak" ? { ...l, asset: kotakMerah } : l));
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d", { alpha: true })!;
  const defMerah = { ...def, layers: merah };
  await prepareImageAssets(defMerah);
  renderFrame(ctx, defMerah, 1);
  const px = Math.round(defMerah.layers[0].geometry.x * 1920);
  const py = Math.round(defMerah.layers[0].geometry.y * 1080);
  const d = ctx.getImageData(px, py, 1, 1).data;
  assert("pixel hasil recolor merah", d[0] > 200 && d[1] < 80);

  // revert via assetAwal → render kembali ke warna asli
  const defKembali = { ...defMerah, layers: defMerah.layers.map((l) => ({ ...l, asset: l.assetAwal! })) };
  await prepareImageAssets(defKembali);
  ctx.clearRect(0, 0, 1920, 1080);
  renderFrame(ctx, defKembali, 1);
  const k2 = ctx.getImageData(px, py, 1, 1).data;
  assert("assetAwal mengembalikan warna asli (#123456)", k2[0] < 80 && k2[2] > 60);

  // prakopen: recolored project ini lolos proyek open/save roundtrip (validator menerima assetAwal)
  const tersimpan = { ...defMerah, name: "recolor-simpan" };
  const dibuka = await openProject(projectText(tersimpan));
  assert("proyek recolored lolos simpan-buka", dibuka.name === "recolor-simpan" && dibuka.layers.some((l) => l.assetAwal?.includes("%23ff0000") || JSON.stringify(l).includes("%23ff0000")));

  return { passed: results.length, results };
}

// cache-probe-88
