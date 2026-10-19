import { exportSequence, type SequenceOptions } from "../src/export/sequence";
import type { MotionDefinition } from "../src/engine/schema";

export async function testSequence() {
  const results: string[] = [];
  const assert = (name: string, ok: boolean) => { if (!ok) throw new Error(name); results.push(name); };
  const def: MotionDefinition = { version: 1, name: "sequence-test", canvas: { w: 1280, h: 720, fps: 24, durationSec: 0.125, background: "#ff0000" }, layers: [{ id: "box", kind: "rect", geometry: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, time: { from: 0, to: 1 }, style: { color: "#00ff00" } }] };
  const options: SequenceOptions = { resolution: "720", fps: 24, transparent: true };
  const updates: number[] = [];
  const blob = await exportSequence(def, options, { cancelled: false }, (value) => updates.push(value.frame));
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  const entries: { name: string; bytes: Uint8Array }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const start = offset + 30 + nameLength;
    entries.push({ name: new TextDecoder().decode(new Uint8Array(buffer, offset + 30, nameLength)), bytes: new Uint8Array(buffer, start, size) });
    offset = start + size;
  }
  assert("ZIP contains three frames and metadata", entries.length === 4);
  assert("frame names ordered and padded", entries[0].name.endsWith("000001.png") && entries[2].name.endsWith("000003.png"));
  assert("PNG signature correct", entries[0].bytes[0] === 137 && entries[0].bytes[1] === 80);
  const metadata = JSON.parse(new TextDecoder().decode(entries[3].bytes));
  assert("FPS and resolution metadata", metadata.fps === 24 && metadata.width === 1280 && metadata.frames === 3);
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(entries[0].bytes)], { type: "image/png" }));
  const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
  assert("transparent pixels retained", ctx.getImageData(0, 0, 1, 1).data[3] === 0);
  assert("artwork pixels retained", ctx.getImageData(640, 360, 1, 1).data[1] === 255);
  assert("progress reaches last frame", updates.includes(3));
  assert("source background unchanged", def.canvas.background === "#ff0000");
  for (const [name, scene, settings, cancel] of [
    ["pre-cancel rejected", def, options, { cancelled: true }],
    ["frame limit enforced", { ...def, canvas: { ...def.canvas, durationSec: 60 } }, options, { cancelled: false }],
    ["extreme aspect rejected", { ...def, canvas: { ...def.canvas, w: 999999 } }, options, { cancelled: false }],
  ] as const) {
    let rejected = false;
    try { await exportSequence(scene, settings, cancel, () => {}); } catch { rejected = true; }
    assert(name, rejected);
  }
  const cancel = { cancelled: false };
  let cancelled = false;
  try { await exportSequence(def, options, cancel, (p) => { if (p.frame === 1) cancel.cancelled = true; }); } catch { cancelled = true; }
  assert("mid-render cancellation stops export", cancelled);
  return { passed: results.length, results };
}
