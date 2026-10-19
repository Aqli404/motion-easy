import type { Color, DrawSpec, InOutType, EaseName, LayerSpec, MotionDefinition } from "./schema";

const MAX_SVG_BYTES = 2_000_000;
const SVG_NS = "http://www.w3.org/2000/svg";
const TAGS = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "title", "desc"]);
const ATTRS = new Set(["id", "viewBox", "preserveAspectRatio", "transform", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "clip-path", "clip-rule", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "dx", "dy", "letter-spacing", "color", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "fx", "fy", "clipPathUnits"]);
const LOCAL_URL = /^url\(\s*['"]?#[a-zA-Z_][\w:.-]*['"]?\s*\)$/;

function fail(message: string): never {
  throw new Error(message);
}

function safeNumber(value: string | null, fallback: number): number {
  const parsed = value && /^\d+(?:\.\d+)?(?:px)?$/.test(value) ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanSvgDocument(source: string): { doc: XMLDocument; viewBox: string; width: number; height: number } {
  if (new Blob([source]).size > MAX_SVG_BYTES) fail("File SVG terlalu besar. Maksimal 2 MB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) fail("DOCTYPE dan entity eksternal tidak didukung.");
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") {
    fail("File SVG tidak valid atau tidak dapat dibaca.");
  }

  if (doc.querySelectorAll("*").length > 3000) fail("SVG terlalu kompleks. Maksimal 3.000 elemen.");
  for (const element of Array.from(doc.querySelectorAll("*"))) {
    if (element.namespaceURI !== SVG_NS || !TAGS.has(element.localName)) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.trim();
      if (!ATTRS.has(attribute.name) || /[\\<>]|(?:javascript|data|https?):|@import|expression\s*\(/i.test(value) || (/url/i.test(value) && !LOCAL_URL.test(value))) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  const root = doc.documentElement;
  const parts = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  const validBox = parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0;
  const width = validBox
    ? parts[2]
    : safeNumber(root.getAttribute("width"), 100);
  const height = validBox
    ? parts[3]
    : safeNumber(root.getAttribute("height"), 100);
  if (width > 16384 || height > 16384 || width < 1 || height < 1) {
    fail("Ukuran artboard SVG harus 1–16.384 unit per sisi.");
  }
  const viewBox = validBox ? parts.join(" ") : `0 0 ${width} ${height}`;
  root.setAttribute("xmlns", SVG_NS);
  root.setAttribute("viewBox", viewBox);
  // Explicit intrinsic dimensions are required by drawImage in some browsers.
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  return { doc, viewBox, width, height };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function wrapElement(root: Element, element: Element, viewBox: string): string {
  const clone = root.cloneNode(false) as Element;
  clone.setAttribute("viewBox", viewBox);
  for (const defs of Array.from(root.children).filter((child) => child.localName === "defs")) {
    clone.appendChild(defs.cloneNode(true));
  }
  clone.appendChild(element.cloneNode(true));
  return new XMLSerializer().serializeToString(clone);
}

/**
 * Ukur bbox tiap elemen tingkat atas (koordinat user-space root) dengan
 * memasang salinan SVG serentak ke DOM tersembunyi. Dipakai untuk pivot
 * per objek: rotasi/scale berputar di sekitar bbox elemen, bukan pusat
 * artboard. Elemen yang gagal diukur tetap memakai artboard penuh.
 */
function measureTopLevelBBoxes(
  rootSerialized: string,
  elements: Element[],
): Map<Element, { x: number; y: number; width: number; height: number }> {
  const boxes = new Map<Element, { x: number; y: number; width: number; height: number }>();
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.setAttribute("style", "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0");
  const root = new DOMParser().parseFromString(rootSerialized, "image/svg+xml").documentElement;
  holder.appendChild(root);
  document.body.appendChild(holder);
  try {
    for (const element of elements) {
      const probe = root.ownerDocument.createElementNS(SVG_NS, "g");
      // Elemen dipindah ke probe agar bbox mencakup transform milik elemen.
      probe.appendChild(element.cloneNode(true));
      root.appendChild(probe);
      try {
        const box = probe.getBBox();
        if (Number.isFinite(box.x) && Number.isFinite(box.y) && box.width > 0 && box.height > 0) {
          boxes.set(element, { x: box.x, y: box.y, width: box.width, height: box.height });
        }
      } catch { /* pengukuran gagal — fallback artboard penuh */ }
      probe.remove();
    }
  } finally {
    holder.remove();
  }
  return boxes;
}

const r2 = (value: number) => Number(value.toFixed(2));

const WARNA_HEX6 = /^#[0-9a-fA-F]{6}$/;

/** Warisin nilai hex (stroke/fill) dari elemen ke arah root; null kalau tidak ada/cakupan lain. */
function warnaInherited(element: Element | null, attribute: "stroke" | "fill"): string | null {
  let node: Element | null = element;
  while (node) {
    const value = (node.getAttribute(attribute) ?? "").trim();
    if (value && value !== "none") return WARNA_HEX6.test(value) ? value.toLowerCase() : null;
    node = node.parentElement;
  }
  return null;
}

const MAX_DRAW_PATHS = 40;
const MAX_DRAW_D_CHARS = 100_000;

/**
 * Deteksi layer path ber-outline untuk draw reveal: elemen = <path> tunggal,
 * atau <g> yang seluruh keturunan visualnya path. Mengukur getTotalLength
 * di DOM tersembunyi (satu kali, saat impor). Environs gagal → null.
 */
function measureDrawSpecs(
  rootSerialized: string,
  elements: Element[],
): Map<Element, DrawSpec | null> {
  const specs = new Map<Element, DrawSpec | null>(elements.map((element) => [element, null]));
  const root = new DOMParser().parseFromString(rootSerialized, "image/svg+xml").documentElement;
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.setAttribute("style", "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0");
  holder.appendChild(root);
  document.body.appendChild(holder);
  try {
    for (const element of elements) {
      try {
        const paths = element.localName === "path"
          ? [element]
          : element.querySelector("path")
            ? Array.from(element.querySelectorAll("path"))
            : [];
        if (!paths.length || paths.length > MAX_DRAW_PATHS) continue;
        // Semua bentuk non-path (rect/circle/text/…) membuat layer tidak layak draw.
        const nonPath = Array.from(element.querySelectorAll("*")).some(
          (child) => !["path", "g", "title", "desc", "metadata"].includes(child.localName),
        );
        if (nonPath) continue;
        let dTotal = 0;
        const items: DrawSpec["paths"] = [];
        let layak = true;
        for (const path of paths) {
          const svgPath = path as SVGPathElement;
          const d = svgPath.getAttribute("d") ?? "";
          const stroke = warnaInherited(svgPath, "stroke");
          if (!d || d.length > 20_000 || !stroke) { layak = false; break; }
          dTotal += d.length;
          if (dTotal > MAX_DRAW_D_CHARS) { layak = false; break; }
          const widthRaw = svgPath.getAttribute("stroke-width")
            ?? svgPath.closest("[stroke-width]")?.getAttribute("stroke-width")
            ?? "1";
          const width = parseFloat(widthRaw);
          if (!Number.isFinite(width) || width <= 0) { layak = false; break; }
          items.push({ d, len: svgPath.getTotalLength(), stroke, width });
        }
        if (!layak || !items.length) continue;
        const fill = warnaInherited(paths[0], "fill");
        specs.set(element, {
          fill: fill ?? null,
          vb: { x: 0, y: 0, w: 0, h: 0 }, // diisi setelah bbox diketahui
          paths: items,
        });
      } catch { /* pengukuran gagal — layer tetap normal */ }
    }
  } finally {
    holder.remove();
  }
  return specs;
}

/** Convert a local SVG into safe, independently animatable image layers. */
export function svgToMotionDefinition(fileName: string, source: string): MotionDefinition {
  const { doc, viewBox, width, height } = cleanSvgDocument(source);
  const root = doc.documentElement;
  const elements = Array.from(root.children).filter((element) => {
    const tag = element.localName.toLowerCase();
    return tag !== "defs" && tag !== "title" && tag !== "desc" && tag !== "metadata";
  });
  if (!elements.length) fail("SVG tidak memiliki elemen visual yang didukung.");
  if (elements.length > 60) fail("Maksimal 60 layer tingkat atas. Kelompokkan elemen SVG dengan <g>.");
  const selected = elements;
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const scale = Math.min(canvasWidth * 0.8 / width, canvasHeight * 0.8 / height);
  const parts = viewBox.split(/[\s,]+/).map(Number);
  const vx0 = parts[0] || 0;
  const vy0 = parts[1] || 0;
  const boxes = measureTopLevelBBoxes(new XMLSerializer().serializeToString(root), selected);
  const draws = measureDrawSpecs(new XMLSerializer().serializeToString(root), selected);
  const layers: LayerSpec[] = selected.map((element, index) => {
    // Pivot per objek: asset dipotong ke bbox elemen (dibatasi artboard) dan
    // geometry center mengikuti bbox — rotasi/scale berputar di pusat objek.
    let assetViewBox = viewBox;
    let geoW = width * scale / canvasWidth;
    let geoH = height * scale / canvasHeight;
    let geoX = 0.5;
    let geoY = 0.5;
    const box = boxes.get(element);
    if (box) {
      const x0 = Math.max(vx0, box.x);
      const y0 = Math.max(vy0, box.y);
      const x1 = Math.min(vx0 + width, box.x + box.width);
      const y1 = Math.min(vy0 + height, box.y + box.height);
      if (x1 - x0 > 0.5 && y1 - y0 > 0.5) {
        assetViewBox = [r2(x0), r2(y0), r2(x1 - x0), r2(y1 - y0)].join(" ");
        geoW = (x1 - x0) * scale / canvasWidth;
        geoH = (y1 - y0) * scale / canvasHeight;
        geoX = 0.5 + ((x0 + x1) / 2 - (vx0 + width / 2)) * scale / canvasWidth;
        geoY = 0.5 + ((y0 + y1) / 2 - (vy0 + height / 2)) * scale / canvasHeight;
      }
    }
    // Draw reveal: layer baru otomatis memakai gerak masuk "draw" (garis
    // digambar 1.2 dtk); layer lain tetap fadeIn.
    const draw = draws.get(element) ?? undefined;
    let drawSpec: DrawSpec | undefined;
    let inMotion: { type: InOutType; dur: number; at: number; easing: EaseName } = {
      type: "fadeIn",
      dur: 0.55,
      at: Math.min(index * 0.12, 1.5),
      easing: "easeOut",
    };
    if (draw && draw.paths.length) {
      const vbParts = assetViewBox.split(/[\s,]+/).map(Number);
      if (Number.isFinite(vbParts[2]) && vbParts[2] > 0 && Number.isFinite(vbParts[3]) && vbParts[3] > 0) {
        drawSpec = { ...draw, vb: { x: vbParts[0] || 0, y: vbParts[1] || 0, w: vbParts[2], h: vbParts[3] } };
        inMotion = { type: "draw", dur: 1.2, at: Math.min(index * 0.12, 1.5), easing: "easeInOut" };
      }
    }
    return {
      id: `svg-${index + 1}`,
      name: element.getAttribute("id") || `${element.localName} ${index + 1}`,
      kind: "image",
      tag: "svg",
      time: { from: 0, to: 6 },
      geometry: { x: geoX, y: geoY, w: geoW, h: geoH },
      asset: svgDataUrl(wrapElement(root, element, assetViewBox)),
      assetAwal: svgDataUrl(wrapElement(root, element, assetViewBox)),
      draw: drawSpec,
      motion: {
        in: inMotion,
        loop: { type: "float", dur: 3, amount: 0.008, phase: index / Math.max(1, selected.length) },
      },
    };
  });
  if (
    layers.reduce(
      (size, layer) =>
        size +
        (layer.asset?.length ?? 0) +
        (layer.assetAwal?.length ?? 0) +
        (layer.draw?.paths.reduce((s, item) => s + item.d.length + 64, 0) ?? 0),
      0,
    ) > 8_000_000
  ) {
    fail("Total asset SVG terlalu besar setelah pemisahan layer. Sederhanakan SVG atau kelompokkan elemen.");
  }

  return {
    version: 1,
    name: fileName.replace(/\.svg$/i, "") || "SVG Motion",
    notes: "SVG Motion Lite — SVG lokal telah disanitasi dan diubah menjadi layer animasi.",
    canvas: { w: canvasWidth, h: canvasHeight, fps: 30, durationSec: 6, background: null },
    layers,
  };
}

export type ModeWarna = "isi" | "garis" | "semua";

const WARNA_HEX = /^#[0-9a-fA-F]{6}$/;
function decodeAssetSvg(asset: string) {
  if (!asset.startsWith("data:image/svg+xml;charset=utf-8,")) {
    throw new Error("Layer ini tidak punya asset SVG lokal.");
  }
  const decoded = decodeURIComponent(asset.slice(asset.indexOf(",") + 1));
  if (new Blob([decoded]).size > MAX_SVG_BYTES) throw new Error("Asset layer terlalu besar untuk recolor.");
  const doc = new DOMParser().parseFromString(decoded, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") {
    throw new Error("Asset SVG layer tidak dapat dibaca.");
  }
  return doc;
}

/**
 * Recolor asset layer SVG: ganti nilai fill/stroke hex pada elemen layer
 * (termasuk anak-anak group). Aman by-construction: gradien via url(#…) dan
 * fill "none" tidak disentuh, dan tidak ada atribut lain yang berganti.
 */
export function recolorLayerAsset(asset: string, mode: ModeWarna, warna: string): string {
  if (!WARNA_HEX.test(warna)) throw new Error("Warna harus hex 6 digit (#rrggbb).");
  if (mode !== "isi" && mode !== "garis" && mode !== "semua") throw new Error("Mode recolor tidak dikenal.");
  const doc = decodeAssetSvg(asset);
  const sasaran = mode === "isi" ? ["fill"] : mode === "garis" ? ["stroke"] : ["fill", "stroke"];
  let berubah = 0;
  for (const element of Array.from(doc.querySelectorAll("*"))) {
    if (element.localName === "stop") continue;
    for (const attribute of sasaran) {
      const nilai = (element.getAttribute(attribute) ?? "").trim();
      // "none" = outline/tanpa isi; url(#id) = gradien; bukan hex = warna css bernama → lewati.
      if (!nilai || nilai === "none" || /^url\(/i.test(nilai) || !WARNA_HEX.test(nilai)) continue;
      element.setAttribute(attribute, warna);
      berubah++;
    }
  }
  if (!berubah) throw new Error("Tidak ada warna hex yang cocok di layer ini — coba mode lain.");
  return svgDataUrl(new XMLSerializer().serializeToString(doc.documentElement));
}

/**
 * Recolor satu layer penuh: asset gambar + spec draw (garis/fill) diganti
 * bersamaan supaya reveal dan versi statis tidak tidak sinkron. Perubahan
 * warna yang gagal (tak ada hex) dilempar sesudah pengecekan curam.
 */
export function terapkanRecolorLayer(layer: LayerSpec, mode: ModeWarna, warna: string): LayerSpec {
  if (layer.kind !== "image" || !layer.asset) return layer;
  const asset = recolorLayerAsset(layer.asset, mode, warna);
  let draw = layer.draw;
  if (draw) {
    const gantiStroke = mode === "garis" || mode === "semua";
    const gantiFill = mode === "isi" || mode === "semua";
    draw = {
      ...draw,
      paths: gantiStroke ? draw.paths.map((item) => ({ ...item, stroke: warna as Color })) : draw.paths,
      fill: gantiFill ? (warna as Color) : draw.fill,
    };
  }
  return { ...layer, asset, draw };
}

/**
 * Pulihkan warna draw reveal dari asset asli (assetAwal): warna stroke/fill
 * setiap path dibaca ulang dari SVG asli supaya tombol "Asli" mengembalikan
 * reveal dan versi statis ke kondisi impor yang sama.
 */
export function pulihkanWarnaAsli(layer: LayerSpec): LayerSpec {
  if (layer.kind !== "image" || !layer.assetAwal || !layer.draw) return layer;
  try {
    const raw = layer.assetAwal.replace(/^data:image\/svg\+xml;charset=utf-8,/, "");
    const root = new DOMParser().parseFromString(decodeURIComponent(raw), "image/svg+xml").documentElement;
    const paths = Array.from(root.querySelectorAll("path"));
    const items = layer.draw.paths.map((item, index) => {
      const source = paths[index];
      if (!source) return item;
      const stroke = warnaInherited(source, "stroke") ?? item.stroke;
      return { ...item, stroke };
    });
    const fill = paths.length ? warnaInherited(paths[0], "fill") : null;
    return { ...layer, asset: layer.assetAwal, draw: { ...layer.draw, paths: items, fill } };
  } catch {
    return { ...layer, asset: layer.assetAwal };
  }
}

export function loadImageAsset(source: string): Promise<HTMLImageElement> {
  if (!source.startsWith("data:image/svg+xml;charset=utf-8,")) {
    return Promise.reject(new Error("Hanya asset SVG lokal dari import SVG Motion yang didukung."));
  }
  let safeSource: string;
  try {
    const decoded = decodeURIComponent(source.slice(source.indexOf(",") + 1));
    safeSource = svgDataUrl(new XMLSerializer().serializeToString(cleanSvgDocument(decoded).doc.documentElement));
  } catch (error) {
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => reject(new Error("Asset SVG terlalu lama dimuat.")), 10000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Asset SVG gagal dimuat.")); };
    image.src = safeSource;
  });
}

const imageCache = new Map<string, HTMLImageElement>();
const pendingImages = new Map<string, Promise<HTMLImageElement>>();

export function getImageAsset(source: string): HTMLImageElement | undefined {
  return imageCache.get(source);
}

export async function prepareImageAssets(def: MotionDefinition): Promise<void> {
  const assets = Array.from(new Set(def.layers.map((layer) => layer.asset).filter((asset): asset is string => Boolean(asset))));
  await Promise.all(assets.map(async (asset) => {
    if (imageCache.has(asset)) return;
    let pending = pendingImages.get(asset);
    if (!pending) {
      pending = loadImageAsset(asset);
      pendingImages.set(asset, pending);
    }
    try {
      const image = await pending;
      imageCache.set(asset, image);
    } finally {
      pendingImages.delete(asset);
    }
  }));
}
