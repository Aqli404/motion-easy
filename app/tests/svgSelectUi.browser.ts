/**
 * Helper interaksi UI untuk uji manual thumbnail layer & multi-select
 * di panel SVG Motion Lite (dipakai via agent-browser / console dev).
 * Prasyarat: proyek SVG aktif di Studio.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const panelSvg = () =>
  [...document.querySelectorAll("section")].find((s) => (s.textContent || "").includes("SVG Motion Lite"));

export async function cekThumbnail() {
  const panel = panelSvg();
  if (!panel) return "no-panel";
  const thumbs = [...panel.querySelectorAll("button img")];
  return { thumbnails: thumbs.length };
}

/** Ctrl/Shift+klik thumbnail kedua lalu klik "Duplikat (n)". */
export async function ujiMultiSelect() {
  const panel = panelSvg();
  if (!panel) return "no-panel";
  const tombolLayer = [...panel.querySelectorAll("button")].filter((b) => (b as HTMLButtonElement).querySelector("img"));
  if (tombolLayer.length < 2) return "need-2-thumbs";
  tombolLayer[1].dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
  await wait(250);
  const label = [...panel.querySelectorAll("button")].find((b) => (b.textContent || "").startsWith("Duplikat ("))?.textContent;
  const duplikat = [...panel.querySelectorAll("button")].find((b) => (b.textContent || "").startsWith("Duplikat ("));
  if (!duplikat) return "no-dup-button";
  const sebelum = [...panel.querySelectorAll("button img")].length;
  duplikat.click();
  await wait(400);
  const sesudah = [...panel.querySelectorAll("button img")].length;
  return { label: label?.trim(), thumbnailsSebelum: sebelum, thumbnailsSesudah: sesudah };
}

/** Hapus semua layer terpilih (multi) lalu laporkan jumlah thumbnail akhir. */
export async function ujiHapusMulti() {
  const panel = panelSvg();
  if (!panel) return "no-panel";
  const tombolLayer = [...panel.querySelectorAll("button img")].map((img) => img.closest("button") as HTMLButtonElement);
  if (tombolLayer.length < 3) return "need-3-thumbs";
  tombolLayer[0].classList.add("__ui-prim");
  tombolLayer[1].dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
  await wait(250);
  const hapus = [...panel.querySelectorAll("button")].find((b) => (b.textContent || "").startsWith("Hapus ("));
  if (!hapus) return "no-delete-button";
  const label = hapus.textContent?.trim();
  hapus.click();
  await wait(400);
  return { label, thumbnailsSesudah: [...panel.querySelectorAll("button img")].length };
}

/** Uji recolor UI: klik Terapkan lalu Asli, laporkan pesan panel. */
export async function ujiRecolor() {
  const panel = panelSvg();
  if (!panel) return "no-panel";
  const terapkan = [...panel.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Terapkan");
  if (!terapkan) return "no-terapkan";
  terapkan.click();
  await wait(700);
  const pesanSetelah = [...panel.querySelectorAll("p")].map((p) => p.textContent || "").find((t) => t.includes("diterapkan") || t.includes("Tidak ada"));
  const asli = [...panel.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Asli");
  if (!asli) return "no-asli";
  const asliDisabled = asli.disabled;
  asli.click();
  await wait(500);
  return { pesanSetelah, tombolAsliAda: true, asliDisabled };
}
