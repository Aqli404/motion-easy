import { openProject, projectText, duplicateLayer, moveLayer } from "../src/engine/project";
import { svgToMotionDefinition } from "../src/engine/svg";

export async function testProject() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(name); results.push(name); };
  const def = svgToMotionDefinition("roundtrip.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="#123456"/><circle cx="100" cy="50" r="20"/></svg>');
  def.layers[1].style = { rotation: 35, opacity: 0.6 };
  const loaded = await openProject(projectText(def));
  assert("SVG project roundtrip preserves assets and edits", JSON.stringify(loaded) === JSON.stringify(def));
  const moved = moveLayer(def, def.layers[0].id, 1);
  assert("reorder immutable", moved.layers[1].id === def.layers[0].id && def.layers[0].id === "svg-1");
  assert("boundary reorder is no-op", moveLayer(def, def.layers[0].id, -1) === def);
  const duplicated = duplicateLayer(def, def.layers[0].id);
  assert("duplicate gets unique ID and same asset", duplicated.layers.length === 3 && duplicated.layers[1].id !== def.layers[0].id && duplicated.layers[1].asset === def.layers[0].asset);
  for (const [name, text] of [
    ["bad JSON rejected", "{"],
    ["invalid schema rejected", "{}"],
    ["Canvas code rejected", JSON.stringify({ ...def, layers: [{ ...def.layers[0], kind: "canvas", kanvas: { source: "function draw() { throw new Error('must not run') }" } }] })],
    ["remote asset rejected", JSON.stringify({ ...def, layers: [{ ...def.layers[0], asset: "https://invalid.example/x.svg" }] })],
    ["oversized input rejected", " ".repeat(12_000_001)],
  ]) {
    let rejected = false;
    try { await openProject(text); } catch { rejected = true; }
    assert(name, rejected);
  }
  return { passed: results.length, results };
}
