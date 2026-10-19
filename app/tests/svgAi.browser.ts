import { buildSvgPrompt, buildSvgRepairPrompt, defaultBrief } from "../src/engine/brief";
import { prepareImageAssets, svgToMotionDefinition } from "../src/engine/svg";
import { extractSvg } from "../src/components/SvgAiModal";

export async function testSvgAi() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(`FAIL: ${name}`); results.push(name); };

  const brief = defaultBrief();
  brief.maxLayer = 24;
  const prompt = buildSvgPrompt(brief);

  // 1) Prompt memuat aturan kunci
  assert("prompt memuat viewBox tetap 1920x1080", prompt.includes('viewBox="0 0 1920 1080"'));
  assert("prompt memerintahkan blok svg", prompt.includes("```svg"));
  assert("prompt melarang style/script/SMIL", prompt.includes("<script>") && prompt.includes("<animateTransform>"));
  assert("prompt memakai batas layer dari brief", prompt.includes("Maksimal 24 layer tingkat atas"));
  assert("prompt memuat warna brief", prompt.includes(brief.warnaUtama) && prompt.includes(brief.warnaAksen));
  assert("prompt memuat contoh berstruktur id", prompt.includes('id="background"') && prompt.includes('id="judul"'));
  assert("prompt menyebut presentation attributes", prompt.includes("presentation attributes"));

  // ID di prompt unik dan tidak ada duplikat grad
  const grad = prompt.match(/id="grad-[\w-]+"/g) ?? [];
  assert("gradien contoh unik", new Set(grad).size === grad.length && grad.length === 1);

  // 2) extractSvg: jawaban AI berbungkus digali dengan benar
  const kode = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect id="coba" width="1920" height="1080" fill="#101822"/></svg>';
  assert("kode bersih lolos apa adanya", extractSvg(kode) === kode);
  assert("prosa dihapus, isi blok dipakai", extractSvg(`Berikut hasilnya:\n\n\`\`\`svg\n${kode}\n\`\`\`\nSemoga bermanfaat!`) === kode);
  assert("penanda xml juga diterima", extractSvg(`\`\`\`xml\n${kode}\n\`\`\``) === kode);
  assert("tanpa penanda tetap ada isi", extractSvg(`catatan\n${kode}\npenutup`) === kode);

  // 3) Contoh SVG di dalam prompt sendiri valid & actionable
  const contohMatch = prompt.match(/```svg\s*\n([\s\S]*?)```/);
  assert("contoh svg ada dalam prompt", Boolean(contohMatch));
  if (contohMatch) {
    const def = svgToMotionDefinition("contoh.svg", contohMatch[1]);
    assert("contoh prompt -> 4 layer dengan nama id", def.layers.length === 4 && def.layers.some((l) => l.name === "background") && def.layers.some((l) => l.name === "judul"));
    await prepareImageAssets(def);
  }

  // 4) Jawaban AI hostile (script + remote ref) dibersihkan tanpa mematikan karya
  const hostile = 'Perhatian:\n```svg\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><script>alert(1)</script><rect id="bg" width="1920" height="1080" fill="#121212"/><image href="https://evil.example/x.png"/></svg>\n```';
  const defHostile = svgToMotionDefinition("hostile.svg", extractSvg(hostile));
  assert("layer hostile terselamatkan dari sanitasi", defHostile.layers.length === 1 && defHostile.layers[0].name === "bg");
  await prepareImageAssets(defHostile);

  // 5) Skenario gagal realistis: > 60 layer dan tanpa elemen visual
  const boong = `Gerbang SVG:\n\`\`\`svg\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">${Array.from({ length: 65 }, (_, i) => `<circle id="c${i}" cx="10" cy="10" r="5"/>`).join("")}</svg>\n\`\`\``;
  let layerDitolak = false;
  try { svgToMotionDefinition("boong.svg", extractSvg(boong)); } catch { layerDitolak = true; }
  assert("jawaban AI 65 layer ditolak pesan jelas", layerDitolak);

  let tanpaVisual = false;
  try { svgToMotionDefinition("kosong.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><script>var x=1;</script></svg>'); } catch { tanpaVisual = true; }
  assert("SVG tanpa elemen visual ditolak", tanpaVisual);

  // 6) Prompt perbaikan memuat kesalahan & SVG lama
  const repair = buildSvgRepairPrompt(kode, ["Terlalu banyak layer"], 1);
  assert("prompt perbaikan memuat pesan + svg lama", repair.includes("Perbaiki dengan tepat") && repair.includes("Terlalu banyak layer") && repair.includes(kode));

  return { passed: results.length, results };
}
