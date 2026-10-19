import { useEffect, useState } from "react";
import type { InOutType, LayerSpec, LoopType, MotionDefinition } from "../engine/schema";
import { duplicateLayer, moveLayer } from "../engine/project";
import { pulihkanWarnaAsli, terapkanRecolorLayer, type ModeWarna } from "../engine/svg";

const BOX_THUMB = "overflow-hidden rounded border border-edge";

/**
 * Panel pengatur layer hasil impor SVG Motion.
 * - Klik thumbnail = pilih layer (primer).
 * - Ctrl/Cmd/Shift+klik = tambah/kurangi di seleksi multi; beberapa pengaturan
 *   (opacity, gerak masuk, loop) diterapkan ke semua layer terpilih.
 */
export default function SvgControls({ def, onChange }: { def: MotionDefinition; onChange: (def: MotionDefinition) => void }) {
  const [id, setId] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const layers = def.layers.filter((layer) => layer.tag === "svg");
  const layer = layers.find((item) => item.id === id) ?? layers[0];
  useEffect(() => {
    const valid = new Set(layers.map((item) => item.id));
    setMulti((m) => {
      const next = m.filter((mid) => valid.has(mid));
      return next.length === m.length ? m : next;
    });
    if (id && !valid.has(id)) setId("");
  }, [layers, id]);
  if (!layer) return null;
  const targets = multi.length > 1 && multi.includes(layer.id) ? multi : [layer.id];
  const judulTargets = targets.length > 1 ? ` (${targets.length} layer)` : "";
  const update = (patch: Partial<LayerSpec>) => onChange({ ...def, layers: def.layers.map((item) => item.id === layer.id ? { ...item, ...patch } : item) });
  const updateTargets = (patch: (item: LayerSpec) => Partial<LayerSpec>) =>
    onChange({ ...def, layers: def.layers.map((item) => targets.includes(item.id) ? { ...item, ...patch(item) } : item) });
  const pilih = (pid: string, kembangkan: boolean) => {
    if (kembangkan) {
      setMulti((m) => (m.length === 0 || !m.includes(layer.id) ? [layer.id, pid] : m.includes(pid) ? m.filter((x) => x !== pid) : [...m, pid]));
    } else {
      setMulti([]);
      setId(pid);
    }
  };
  const duplikatTerpilih = () => {
    let nextDef = def;
    for (const tid of [...targets].reverse()) nextDef = duplicateLayer(nextDef, tid);
    setMulti([]);
    if (targets.length === 1) {
      const posisi = def.layers.findIndex((item) => item.id === targets[0]);
      const salinan = nextDef.layers[posisi + 1];
      if (salinan) setId(salinan.id);
    }
    onChange(nextDef);
  };
  const hapusTerpilih = () => {
    const sisa = def.layers.filter((item) => !targets.includes(item.id));
    if (!sisa.length) return;
    setMulti([]);
    setId("");
    onChange({ ...def, layers: sisa });
  };
  // Recolor: mengganti warna hex di dalam asset layer (buffer aman, gagal
  // per-layer tidak menghentikan layer lain yang bisa diganti).
  const [recMode, setRecMode] = useState<ModeWarna>("isi");
  const [recWarna, setRecWarna] = useState("#ff5722");
  const [recPesan, setRecPesan] = useState("");
  const recolor = () => {
    const gagal: string[] = [];
    let perubahan = 0;
    const layersBaru = def.layers.map((item) => {
      if (!targets.includes(item.id) || item.kind !== "image" || !item.asset) return item;
      try {
        perubahan++;
        return terapkanRecolorLayer(item, recMode, recWarna);
      } catch (error) {
        gagal.push(`${item.name}: ${(error as Error).message}`);
        return item;
      }
    });
    setRecPesan(gagal.length ? gagal.join(" · ") : `Warna ${recWarna} (mode ${recMode}) diterapkan ke ${perubahan} layer.`);
    if (perubahan) onChange({ ...def, layers: layersBaru });
  };
  const warnaAsli = () => {
    setRecPesan("");
    onChange({ ...def, layers: def.layers.map((item) => targets.includes(item.id) && item.assetAwal ? pulihkanWarnaAsli(item) : item) });
  };
  const field = "w-full rounded border border-edge bg-panel px-2 py-1.5 text-xs";
  const numeric = (label: string, value: number, min: number, max: number, change: (n: number) => void) => (
    <label className="space-y-1 text-xs text-ink-dim">{label}<input aria-label={label} className={field} type="number" step="0.1" min={min} max={max} value={Number(value.toFixed(2))} onChange={(event) => { const n = event.target.valueAsNumber; if (Number.isFinite(n)) change(Math.max(min, Math.min(max, n))); }} /></label>
  );
  return <section className="rounded-xl border border-edge bg-panel-low p-3">
    <h2 className="text-sm font-semibold">SVG Motion Lite</h2>
    <p className="mb-3 text-xs text-muted">Setiap elemen/grup tingkat atas menjadi layer. CSS, script, gambar tertaut, dan animasi SVG bawaan tidak diimpor.</p>
    {layers.length > 1 && (
      <div className="mb-3">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted">Layer thumbnail — klik = pilih · Ctrl/Cmd/Shift+klik = multi-select</p>
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {layers.map((item) => {
            const prim = item.id === layer.id;
            const terpilih = targets.includes(item.id) && targets.length > 1;
            return <button key={item.id} title={`${item.name}${terpilih ? " — terpilih" : ""}`} onClick={(event) => pilih(item.id, event.ctrlKey || event.metaKey || event.shiftKey)} className={`min-w-[64px] rounded border p-1 text-left text-[10px] ${prim ? "border-accent bg-panel-high text-primary" : terpilih ? "border-secondary bg-secondary/10 text-secondary" : "border-edge bg-panel text-ink-dim hover:bg-panel-high"}`}>
              {item.asset && <img src={item.asset} alt="" width={64} height={36} style={{ objectFit: "contain", backgroundImage: def.canvas.background ? undefined : "conic-gradient(#252833 25%, #383b47 0 50%, #252833 0 75%, #383b47 0)", backgroundSize: "10px 10px" }} className={BOX_THUMB} />}
              <span className="mt-0.5 block truncate" title={item.name}>{item.name}</span>
            </button>;
          })}
        </div>
      </div>
    )}
    <div className="mb-3 flex flex-wrap gap-2 text-xs">
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers[0].id === layer.id} onClick={() => onChange(moveLayer(def, layer.id, -1))}>Ke belakang</button>
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers.at(-1)?.id === layer.id} onClick={() => onChange(moveLayer(def, layer.id, 1))}>Ke depan</button>
      <button className="rounded border border-edge px-3 py-2 disabled:opacity-40" disabled={def.layers.length >= 60 || targets.length + def.layers.length - 0 > 60} onClick={duplikatTerpilih}>Duplikat{judulTargets}</button>
      <button className="rounded border border-edge px-3 py-2 text-error disabled:opacity-40" disabled={def.layers.length - targets.length < 1} onClick={hapusTerpilih}>Hapus{judulTargets}</button>
      {targets.length > 1 && <span className="self-center text-[10px] text-secondary">{targets.length} layer terpilih — opacity/gerak/loop diterapkan ke semua</span>}
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      <label className="text-xs">Layer<select aria-label="Layer SVG" className={field} value={layer.id} onChange={(e) => pilih(e.target.value, false)}>{layers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs">Gerak masuk<select aria-label="Gerak masuk SVG" className={field} value={layer.motion?.in?.type ?? "none"} onChange={(e) => updateTargets((item) => ({ motion: { ...item.motion, in: { type: e.target.value as InOutType, dur: e.target.value === "draw" ? 1.2 : 0.6 } } }))}>{["none", "fadeIn", "slideUp", "slideDown", "slideLeft", "slideRight", "pop", "draw"].map((type) => <option key={type} value={type}>{type}{type === "draw" ? " (garis digambar)" : ""}</option>)}</select></label>
      <label className="text-xs">Loop<select aria-label="Loop SVG" className={field} value={layer.motion?.loop?.type ?? "none"} onChange={(e) => updateTargets((item) => ({ motion: { ...item.motion, loop: { type: e.target.value as LoopType, dur: 3, amount: e.target.value === "spin" ? 1 : 0.03 } } }))}>{["none", "float", "pulse", "spin", "sway"].map((type) => <option key={type}>{type}</option>)}</select></label>
      {numeric("Posisi X (%)", layer.geometry.x * 100, 0, 100, (n) => update({ geometry: { ...layer.geometry, x: n / 100 } }))}
      {numeric("Posisi Y (%)", layer.geometry.y * 100, 0, 100, (n) => update({ geometry: { ...layer.geometry, y: n / 100 } }))}
      {numeric("Rotasi (derajat)", layer.style?.rotation ?? 0, -360, 360, (n) => update({ style: { ...layer.style, rotation: n } }))}
      <label className="text-xs">Opacity (%){judulTargets}<input aria-label="Opacity SVG" className={field} type="number" step="5" min={0} max={100} value={Number(((layer.style?.opacity ?? 1) * 100).toFixed(0))} onChange={(event) => { const n = event.target.valueAsNumber; if (Number.isFinite(n)) updateTargets(() => ({ style: { ...layer.style, opacity: Math.max(0, Math.min(100, n)) / 100 } })); }} /></label>
      {numeric("Ukuran (%)", (layer.geometry.w ?? 1) * 100, 1, 200, (n) => update({ geometry: { ...layer.geometry, w: n / 100, h: (layer.geometry.h ?? 1) * n / 100 / (layer.geometry.w ?? 1) } }))}
      {numeric("Mulai (detik)", layer.time.from, 0, layer.time.to - 0.1, (n) => update({ time: { ...layer.time, from: n } }))}
      {numeric("Selesai (detik)", layer.time.to, layer.time.from + 0.1, def.canvas.durationSec, (n) => update({ time: { ...layer.time, to: n } }))}
      <label className="text-xs">Latar MP4<input aria-label="Warna latar SVG" type="color" className={field} value={def.canvas.background ?? "#101827"} onChange={(e) => onChange({ ...def, canvas: { ...def.canvas, background: e.target.value } })} /></label>
      <button className="rounded border border-edge px-2 text-xs" onClick={() => onChange({ ...def, canvas: { ...def.canvas, background: null } })}>Latar transparan</button>
      <label className="text-xs">Recolor<select aria-label="Mode recolor" className={field} value={recMode} onChange={(e) => setRecMode(e.target.value as ModeWarna)}><option value="isi">isi (fill)</option><option value="garis">garis (stroke)</option><option value="semua">isi + garis</option></select></label>
      <label className="text-xs gap-1.5">Warna
        <div className="flex items-center gap-1.5">
          <input aria-label="Warna pengganti recolor" type="color" className={field} value={recWarna} onChange={(e) => setRecWarna(e.target.value)} />
          <button className="rounded border border-secondary/50 bg-secondary/10 px-2 py-1.5 text-[11px] text-secondary hover:bg-secondary/20" onClick={recolor}>Terapkan</button>
          <button className="rounded border border-edge px-2 py-1.5 text-[11px] text-ink-dim disabled:opacity-40 hover:text-ink" disabled={!targets.some((tid) => def.layers.find((i) => i.id === tid)?.assetAwal)} onClick={warnaAsli} title="Kembali ke asset asli sebelum recolor">Asli</button>
        </div>
      </label>
      {recPesan && <p role="status" className="col-span-2 text-[10px] text-muted md:col-span-4 xl:col-span-6">{recPesan}</p>}
    </div>
    <p className="mt-3 text-xs text-muted">MP4 tidak mendukung alpha (area transparan menjadi hitam). Cover PNG mempertahankan transparansi. Rotasi/scale memakai pivot pusat tiap objek. Gerak "draw" hanya berlaku untuk layer berisi &lt;path&gt; ber-outline; layer lain memakai fadeIn.</p>
  </section>;
}
