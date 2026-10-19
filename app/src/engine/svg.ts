import type { LayerSpec, MotionDefinition } from "./schema";

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
    return {
      id: `svg-${index + 1}`,
      name: element.getAttribute("id") || `${element.localName} ${index + 1}`,
      kind: "image",
      tag: "svg",
      time: { from: 0, to: 6 },
      geometry: { x: geoX, y: geoY, w: geoW, h: geoH },
      asset: svgDataUrl(wrapElement(root, element, assetViewBox)),
      motion: {
        in: { type: "fadeIn", dur: 0.55, at: Math.min(index * 0.12, 1.5), easing: "easeOut" },
        loop: { type: "float", dur: 3, amount: 0.008, phase: index / Math.max(1, selected.length) },
      },
    };
  });
  if (layers.reduce((size, layer) => size + (layer.asset?.length ?? 0), 0) > 8_000_000) {
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

export function loadImageAsset(source: string): Promise<HTMLImageElement> {
  // Imported JSON must not turn asset loading into arbitrary network requests.
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
