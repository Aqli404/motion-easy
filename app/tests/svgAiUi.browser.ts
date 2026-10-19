/**
 * Helper interaksi UI untuk alur "SVG dari AI" di Studio (dipakai manual via
 * agent-browser / console dev — bukan bagian suite otomatis).
 * Prasyarat: modal "SVG dari AI" sudah terbuka.
 */
export function fillDummyAiAnswer(): string {
  const ta = [...document.querySelectorAll("textarea")].find(
    (t) => (t.placeholder || "").includes("Tempel blok"),
  ) as HTMLTextAreaElement | undefined;
  if (!ta) return "no-ta";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">' +
    '<rect id="background" width="1920" height="1080" fill="#0b0f1a"/>' +
    '<g id="badge"><rect x="600" y="380" width="720" height="320" rx="24" fill="#4cd7f6"/></g>' +
    '<text id="teks-promo" x="960" y="560" font-family="Arial, sans-serif" font-size="120" font-weight="900" fill="#ffffff" text-anchor="middle">DISKON 50%</text>' +
    "</svg>";
  const text = "Berikut karyamu:\n\n```svg\n" + svg + "\n```\nEnjoy!";
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!set) return "no-setter";
  set.call(ta, text);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = [...document.querySelectorAll("button")].find((b) =>
    (b.textContent || "").includes("Validasi & Muat"),
  );
  if (!btn) return "no-btn";
  btn.click();
  return "clicked";
}

/** Buka modal SVG dari AI dari halaman Studio. */
export function openSvgAiModal(): string {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent || "").includes("SVG dari AI"),
  );
  if (!btn) return "no-btn";
  btn.click();
  return "clicked";
}
