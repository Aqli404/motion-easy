import { useState } from "react";
import type { InOutType, LayerSpec, LoopType, MotionDefinition } from "../engine/schema";
import { duplicateLayer, moveLayer } from "../engine/project";

export default function SvgControls({ def, onChange }: { def: MotionDefinition; onChange: (def: MotionDefinition) => void }) {
  const [id, setId] = useState("");
  const layers = def.layers.filter((layer) => layer.tag === "svg");
  const layer = layers.find((item) => item.id === id) ?? layers[0];
  if (!layer) return null;
  const update = (patch: Partial<LayerSpec>) => onChange({ ...def, layers: def.layers.map((item) => item.id === layer.id ? { ...item, ...patch } : item) });
  const field = "w-full rounded border border-edge bg-panel px-2 py-1.5 text-xs";
  const numeric = (label: string, value: number, min: number, max: number, change: (n: number) => void) => (
    <label className="space-y-1 text-xs text-ink-dim">{label}<input aria-label={label} className={field} type="number" step="0.1" min={min} max={max} value={Number(value.toFixed(2))} onChange={(event) => { const n = event.target.valueAsNumber; if (Number.isFinite(n)) change(Math.max(min, Math.min(max, n))); }} /></label>
  );
  return <section className="rounded-xl border border-edge bg-panel-low p-3">
    <h2 className="text-sm font-semibold">SVG Motion Lite</h2>
    <p className="mb-3 text-xs text-muted">Setiap elemen/grup tingkat atas menjadi layer. CSS, script, gambar tertaut, dan animasi SVG bawaan tidak diimpor.</p>
    <div className="mb-3 flex flex-wrap gap-2 text-xs">
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers[0].id === layer.id} onClick={() => onChange(moveLayer(def, layer.id, -1))}>Ke belakang</button>
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers.at(-1)?.id === layer.id} onClick={() => onChange(moveLayer(def, layer.id, 1))}>Ke depan</button>
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers.length >= 60} onClick={() => { const next = duplicateLayer(def, layer.id); setId(next.layers[next.layers.findIndex((item) => item.id === layer.id) + 1].id); onChange(next); }}>Duplikat layer</button>
      <button className="rounded border border-edge px-3 py-2 text-error disabled:opacity-40" disabled={def.layers.length <= 1} onClick={() => { onChange({ ...def, layers: def.layers.filter((item) => item.id !== layer.id) }); setId(""); }}>Hapus layer</button>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      <label className="text-xs">Layer<select aria-label="Layer SVG" className={field} value={layer.id} onChange={(e) => setId(e.target.value)}>{layers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs">Gerak masuk<select aria-label="Gerak masuk SVG" className={field} value={layer.motion?.in?.type ?? "none"} onChange={(e) => update({ motion: { ...layer.motion, in: { type: e.target.value as InOutType, dur: 0.6 } } })}>{["none", "fadeIn", "slideUp", "slideDown", "slideLeft", "slideRight", "pop"].map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-xs">Loop<select aria-label="Loop SVG" className={field} value={layer.motion?.loop?.type ?? "none"} onChange={(e) => update({ motion: { ...layer.motion, loop: { type: e.target.value as LoopType, dur: 3, amount: e.target.value === "spin" ? 1 : 0.03 } } })}>{["none", "float", "pulse", "spin", "sway"].map((type) => <option key={type}>{type}</option>)}</select></label>
      {numeric("Posisi X (%)", layer.geometry.x * 100, 0, 100, (n) => update({ geometry: { ...layer.geometry, x: n / 100 } }))}
      {numeric("Posisi Y (%)", layer.geometry.y * 100, 0, 100, (n) => update({ geometry: { ...layer.geometry, y: n / 100 } }))}
      {numeric("Rotasi (derajat)", layer.style?.rotation ?? 0, -360, 360, (n) => update({ style: { ...layer.style, rotation: n } }))}
      {numeric("Opacity (%)", (layer.style?.opacity ?? 1) * 100, 0, 100, (n) => update({ style: { ...layer.style, opacity: n / 100 } }))}
      {numeric("Ukuran (%)", (layer.geometry.w ?? 1) * 100, 1, 200, (n) => update({ geometry: { ...layer.geometry, w: n / 100, h: (layer.geometry.h ?? 1) * n / 100 / (layer.geometry.w ?? 1) } }))}
      {numeric("Mulai (detik)", layer.time.from, 0, layer.time.to - 0.1, (n) => update({ time: { ...layer.time, from: n } }))}
      {numeric("Selesai (detik)", layer.time.to, layer.time.from + 0.1, def.canvas.durationSec, (n) => update({ time: { ...layer.time, to: n } }))}
      <label className="text-xs">Latar MP4<input aria-label="Warna latar SVG" type="color" className={field} value={def.canvas.background ?? "#101827"} onChange={(e) => onChange({ ...def, canvas: { ...def.canvas, background: e.target.value } })} /></label>
      <button className="rounded border border-edge px-2 text-xs" onClick={() => onChange({ ...def, canvas: { ...def.canvas, background: null } })}>Latar transparan</button>
    </div>
    <p className="mt-3 text-xs text-muted">MP4 tidak mendukung alpha (area transparan menjadi hitam). Cover PNG mempertahankan transparansi. Rotasi/scale menggunakan pusat artboard SVG, bukan pusat tiap path.</p>
  </section>;
}
