/** Run in a browser against Vite: import('/tests/svg.browser.ts').then(m => m.testSvg()). */
import { prepareImageAssets, svgToMotionDefinition } from "../src/engine/svg";
import { renderFrame } from "../src/engine/renderer";
import { validateDefinition } from "../src/engine/validator";

export async function testSvg() {
  const results: string[] = [];
  const assert = (name: string, condition: boolean) => {
    if (!condition) throw new Error(`FAIL: ${name}`);
    results.push(name);
  };
  const svg = (body: string, attrs = 'viewBox="10 20 200 100"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
  const def = svgToMotionDefinition("sample.svg", svg('<rect id="tile" x="10" y="20" width="200" height="100" fill="#f59e0b"/><circle cx="110" cy="70" r="20" fill="#ffffff"/>'));
  assert("two named top-level layers", def.layers.length === 2 && def.layers[0].name === "tile");
  assert("fixed FHD artboard with aspect-fit content", def.canvas.w === 1920 && def.canvas.h === 1080 && def.layers[0].geometry.w === 0.8);
  const content = decodeURIComponent(def.layers[0].asset!.split(",").slice(1).join(","));
  assert("non-zero viewBox origin preserved", content.includes('viewBox="10 20 200 100"'));
  assert("imported definition validates", validateDefinition(def).errors.length === 0);
  await prepareImageAssets(def);
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;
  const ctx = canvas.getContext("2d")!;
  renderFrame(ctx, def, 2);
  const pixels = ctx.getImageData(0, 0, 320, 180).data;
  assert("SVG rasterizes into canvas without taint", pixels.some((value, index) => index % 4 === 0 && value > 150));
  assert("alpha outside content stays transparent", pixels[3] === 0);
  const hostile = svgToMotionDefinition("hostile.svg", svg('<style>@import "https://invalid.example/font.css";</style><script>alert(1)</script><foreignObject/><image href="https://invalid.example/x"/><rect onclick="alert(1)" style="fill:url(https://invalid.example/x)" fill="url(https://invalid.example/y)" width="30" height="30"/>'));
  const cleaned = decodeURIComponent(hostile.layers[0].asset!);
  assert("scripts, CSS, handlers, foreignObject and remote URLs stripped", !/onclick|<script|<style|foreignObject|invalid\.example/.test(cleaned));
  const gradient = svgToMotionDefinition("gradient.svg", svg('<defs><linearGradient id="paint"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ff0000"/></linearGradient></defs><rect x="10" y="20" width="200" height="100" fill="url(#paint)"/>'));
  assert("local gradient definitions retained", decodeURIComponent(gradient.layers[0].asset!).includes('fill="url(#paint)"'));
  await prepareImageAssets(gradient);
  renderFrame(ctx, gradient, 2);
  assert("gradient renders", ctx.getImageData(160, 90, 1, 1).data[0] > 100);
  const sized = svgToMotionDefinition("size.svg", svg('<rect width="200" height="100"/>', 'width="200px" height="100px"'));
  assert("width/height fallback keeps aspect ratio", Math.abs(sized.layers[0].geometry.w! / sized.layers[0].geometry.h! - 1.125) < 0.001);
  for (const [name, source] of [
    ["malformed input rejected", "<svg>"],
    ["DOCTYPE rejected", '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>'],
    ["empty SVG rejected", svg("")],
    ["more than 60 layers rejected", svg("<rect/>".repeat(61))],
    ["oversized artboard rejected", svg("<rect/>", 'viewBox="0 0 9999999 10"')],
    ["oversized file rejected", " ".repeat(2_000_001)],
  ]) {
    let rejected = false;
    try { svgToMotionDefinition("bad.svg", source); } catch { rejected = true; }
    assert(name, rejected);
  }
  let remoteRejected = false;
  try { await prepareImageAssets({ ...def, layers: [{ ...def.layers[0], asset: "https://invalid.example/x.svg" }] }); } catch { remoteRejected = true; }
  assert("remote JSON assets rejected before loading", remoteRejected);
  return { passed: results.length, results };
}
