import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import type { MotionDefinition } from "../engine/schema";
import { exportSequence, SEQUENCE_MAX_FRAMES, type SequenceOptions, type SequenceProgress } from "../export/sequence";
import { slugify } from "../export/presets";
import { unduhBlob } from "../export/encoder";
import { useLicense } from "../license/useLicense";
import { premiumEfektif } from "../license/license";
import { Link } from "react-router-dom";

export default function SequenceModal({ def, open, onClose }: { def: MotionDefinition; open: boolean; onClose: () => void }) {
  const license = useLicense();
  const premium = premiumEfektif(license);
  const [options, setOptions] = useState<SequenceOptions>({ resolution: "720", fps: 30, transparent: true });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SequenceProgress | null>(null);
  const [message, setMessage] = useState("");
  const cancel = useRef({ cancelled: false });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel.current.cancelled = true; }; }, []);
  const total = Math.ceil(def.canvas.durationSec * options.fps);
  const start = async () => {
    if (running || !premium) return;
    cancel.current = { cancelled: false };
    setRunning(true); setMessage(""); setProgress(null);
    try {
      const blob = await exportSequence(def, options, cancel.current, (value) => { if (alive.current) setProgress(value); });
      if (!alive.current || cancel.current.cancelled) return;
      unduhBlob(blob, `${slugify(def.name)}-png-${options.resolution}p-${options.fps}fps.zip`);
      setMessage(`Selesai: ${total} frame PNG (${(blob.size / 1_000_000).toFixed(1)} MB) diunduh sebagai ZIP.`);
    } catch (error) { if (alive.current) setMessage((error as Error).message); }
    finally { if (alive.current) setRunning(false); }
  };
  return <Modal open={open} title="PNG Sequence ZIP" onClose={() => { if (!running) onClose(); }}>
    <p className="text-xs">Urutan frame PNG untuk software editing. Alpha dipertahankan; tidak perlu WebCodecs. ZIP menyertakan informasi FPS.</p>
    {!premium ? <p className="text-xs">PNG Sequence tersedia untuk Premium. <Link className="text-secondary underline" to="/harga">Lihat paket</Link></p> : <>
      <fieldset disabled={running} className="space-y-3 disabled:opacity-60">
        <label className="block text-xs">Resolusi<select aria-label="Resolusi PNG" className="ml-3 rounded bg-panel-low p-2" value={options.resolution} onChange={(e) => setOptions({ ...options, resolution: e.target.value as SequenceOptions["resolution"] })}><option value="720">720p</option><option value="1080">1080p</option></select></label>
        <label className="block text-xs">Frame rate<select aria-label="FPS PNG" className="ml-3 rounded bg-panel-low p-2" value={options.fps} onChange={(e) => setOptions({ ...options, fps: Number(e.target.value) as SequenceOptions["fps"] })}>{[24, 30, 60].map((fps) => <option key={fps} value={fps}>{fps} FPS</option>)}</select></label>
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={options.transparent} onChange={(e) => setOptions({ ...options, transparent: e.target.checked })} />Abaikan warna latar proyek (alpha)</label>
      </fieldset>
      <p className="text-xs text-muted">{total} frame · batas {SEQUENCE_MAX_FRAMES} frame / 128 MB data PNG. ZIP dibuat di RAM; pemakaian memori dapat lebih besar. Layer background di dalam artwork tetap terlihat—hapus/nonaktifkan layer itu untuk alpha penuh.</p>
      {running && progress && <div role="status" className="text-xs"><progress className="w-full" max={progress.total} value={progress.frame} />{progress.phase}: {progress.frame}/{progress.total} · {(progress.bytes / 1_000_000).toFixed(1)} MB</div>}
      <p role="status" className="text-xs">{message}</p>
      {running ? <button className="rounded border border-edge px-3 py-2" onClick={() => { cancel.current.cancelled = true; }}>Batalkan ekspor PNG</button> : <button disabled={total > SEQUENCE_MAX_FRAMES} className="rounded border border-edge px-3 py-2 disabled:opacity-40" onClick={() => void start()}>Ekspor PNG ZIP</button>}
    </>}
  </Modal>;
}
