import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Crown,
  AlertTriangle,
  Lock,
} from "lucide-react";
import Modal from "./Modal";
import { EXPORT_PRESETS, slugify, estimasiMb, type ExportPreset } from "../export/presets";
import { exportMp4, unduhBlob, webCodecsSupported } from "../export/encoder";
import { TARGET_MB_OPTIONS, padMp4Blob } from "../export/pad";
import { buatZip, type ArsipFile } from "../export/zip";
import { parsingBatch, type BatchItem } from "../export/batch";
import { useLicense } from "../license/useLicense";
import { premiumEfektif, MODE_DEV } from "../license/license";
import type { MotionDefinition } from "../engine/schema";

interface Props {
  /** definisi aktif di Studio — bisa ditambahkan ke batch sekali klik */
  def: MotionDefinition;
  open: boolean;
  onClose: () => void;
}

interface BarisAntre {
  nama: string;
  state: "menunggu" | "render" | "ok" | "gagal";
  pct: number;
  mb?: number;
  err?: string;
}

type finishing =
  | { state: "idle" }
  | { state: "done"; zipMb: number; filename: string; jumlah: number }
  | { state: "error"; message: string };

export default function BulkModal({ def, open, onClose }: Props) {
  const lic = useLicense();
  const premium = premiumEfektif(lic);
  const supported = webCodecsSupported();
  const [teks, setTeks] = useState("");
  const [sertakanAktif, setSertakanAktif] = useState(false);
  const [presetId, setPresetId] = useState("720"); // default 720: batch = banyak file, mulai dari yang ringan
  const [targetMb, setTargetMb] = useState<number>(0);
  const [baris, setBaris] = useState<BarisAntre[]>([]);
  const [status, setStatus] = useState<finishing>({ state: "idle" });
  const [berjalan, setBerjalan] = useState(false);
  const cancelRef = useRef({ cancelled: false });
  const zipRef = useRef<Blob | null>(null);

  const hasilParse = useMemo(() => parsingBatch(teks), [teks]);
  const items: BatchItem[] = useMemo(() => {
    const tambahan = sertakanAktif ? [{ nama: def.name, def }] : [];
    return [...hasilParse.ok, ...tambahan];
  }, [hasilParse, sertakanAktif, def]);

  const preset = EXPORT_PRESETS.find((p) => p.id === presetId) as ExportPreset;
  const terkunci = preset.premium && !premium;

  const totalDurasi = items.reduce((n, it) => n + it.def.canvas.durationSec, 0);
  const perkiraanTotal = estimasiMb(totalDurasi, preset.bitrate);
  const beringat = perkiraanTotal > 400;

  const jalankan = async () => {
    if (!premium) {
      setStatus({ state: "error", message: "Bulk ZIP khusus Premium — aktivasi lisensi di menu Harga." });
      return;
    }
    if (terkunci) {
      setStatus({ state: "error", message: "Preset ini butuh lisensi premium — aktivasi di menu Lisensi." });
      return;
    }
    if (items.length === 0) return;

    cancelRef.current = { cancelled: false };
    zipRef.current = null;
    setBerjalan(true);
    setStatus({ state: "idle" });
    setBaris(items.map((it) => ({ nama: it.nama, state: "menunggu", pct: 0 })));

    const arsip: ArsipFile[] = [];
    let dibatalkan = false;

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current.cancelled) { dibatalkan = true; break; }
      setBaris((b) => b.map((x, j) => (j === i ? { ...x, state: "render", pct: 0 } : x)));
      try {
        const hasil = await exportMp4(
          items[i].def,
          preset,
          (pr) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, pct: pr.pct } : x))),
          cancelRef.current,
        );
        const finalBlob = await padMp4Blob(hasil.blob, targetMb);
        const data = new Uint8Array(await finalBlob.arrayBuffer());
        arsip.push({
          nama: `${String(arsip.length + 1).padStart(2, "0")}-${slugify(items[i].nama)}-${hasil.size.width}x${hasil.size.height}.mp4`,
          data,
        });
        setBaris((b) =>
          b.map((x, j) =>
            j === i
              ? { ...x, state: "ok", pct: 100, mb: finalBlob.size / 1_000_000 }
              : x,
          ),
        );
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("dibatalkan")) {
          dibatalkan = true;
          break;
        }
        // satu karya gagal TIDAK membatalkan antrean — dilanjutkan
        setBaris((b) => b.map((x, j) => (j === i ? { ...x, state: "gagal", err: msg } : x)));
      }
    }

    if (dibatalkan) {
      setBerjalan(false);
      setStatus({ state: "idle" });
      return;
    }

    if (arsip.length === 0) {
      setBerjalan(false);
      setStatus({ state: "error", message: "Tidak ada karya yang berhasil dirender — periksa daftar gagal di atas." });
      return;
    }

    try {
      const zip = buatZip(arsip);
      zipRef.current = zip;
      const filename = `motion-easy-bulk-${arsip.length}-karya-${preset.id}p.zip`;
      unduhBlob(zip, filename);
      setBerjalan(false);
      setStatus({ state: "done", zipMb: zip.size / 1_000_000, filename, jumlah: arsip.length });
    } catch (e) {
      setBerjalan(false);
      setStatus({ state: "error", message: `gagal membungkus ZIP: ${(e as Error).message}` });
    }
  };

  const reset = () => {
    setBaris([]);
    setStatus({ state: "idle" });
    zipRef.current = null;
  };

  const progresTotal =
    baris.length > 0
      ? baris.reduce((n, b) => n + (b.state === "ok" ? 100 : b.pct), 0) / (baris.length * 100)
      : 0;
  const selesai = baris.filter((b) => b.state === "ok").length;

  return (
    <Modal open={open} title="Bulk ZIP — Render Batch (SATU file ZIP)" onClose={() => !berjalan && onClose()}>
      {/* Bulk ZIP = fitur Premium */}
      {!premium && (
        <div className="rounded-xl border border-accent/40 bg-gradient-to-br from-amber-400/10 via-orange-500/10 to-rose-500/10 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Lock className="h-4 w-4 text-primary" /> Bulk ZIP khusus Premium
          </h4>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-dim">
            Render <strong className="text-ink">banyak karya sekaligus</strong> lalu unduh
            sebagai <strong className="text-ink">satu file ZIP</strong> — tanpa popup-blocker,
            tanpa download satu-satu. Fitur ini tersedia di paket Bulanan &amp; Lifetime.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-ink-dim">
            <li>• Batch 10–50 karya dalam sekali antre</li>
            <li>• Nama file otomatis rapi &amp; berurutan</li>
            <li>• Enlarge-MB per video ikut aktif</li>
          </ul>
          <Link
            to="/harga"
            onClick={onClose}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2.5 text-xs font-bold text-deep shadow"
          >
            <Crown className="h-4 w-4" /> Lihat Paket Premium
          </Link>
          <p className="mt-2 text-center font-mono text-[9px] text-muted">
            mulai Rp 15.000/bulan · atau Rp 55.000 sekali bayar
          </p>
        </div>
      )}

      <div className={premium ? "space-y-3" : "pointer-events-none select-none space-y-3 opacity-40"}>
      {!supported && (
        <div className="flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Browser ini tidak mendukung WebCodecs — gunakan Chrome/Edge desktop.</span>
        </div>
      )}

      {/* Pilihan kualitas */}
      <div className="flex flex-wrap gap-1.5">
        {EXPORT_PRESETS.map((p) => {
          const aktif = presetId === p.id;
          const kunci = p.premium && !premium;
          return (
            <button
              key={p.id}
              disabled={kunci || berjalan}
              onClick={() => setPresetId(p.id)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
                aktif && !kunci
                  ? "border-accent bg-panel-high font-semibold text-primary"
                  : kunci
                    ? "border-edge bg-panel-low text-muted"
                    : "border-edge bg-panel-low text-ink-dim hover:text-ink"
              }`}
            >
              {p.label}
              {kunci && <Crown className="h-3 w-3 text-muted" />}
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[9px] text-muted">
        saran: untuk batch, mulai dari {preset.caption.toLowerCase()} — bisa dim-render ulang per karya kalau perlu kualitas lebih.
      </p>

      {/* Target Ukuran File (Enlarge MB) */}
      <div className="rounded-lg border border-edge bg-panel-low p-2">
        <label className="block font-mono text-[9px] uppercase tracking-widest text-muted">
          Target Ukuran per Video (Enlarge MB)
        </label>
        <select
          value={targetMb}
          onChange={(e) => setTargetMb(Number(e.target.value))}
          disabled={berjalan}
          className="mt-1 w-full rounded-md border border-edge bg-well px-2 py-1 text-[10px] text-ink-dim"
        >
          {TARGET_MB_OPTIONS.map((o) => (
            <option key={o.mb} value={o.mb}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tempel banyak definisi */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
          Daftar karya
        </p>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          disabled={berjalan}
          rows={5}
          placeholder={`Tempel BEBERAPA jawaban AI sekaligus…\n\n• dipisah blok \`\`\`json … \`\`\`, atau\n• dipisah baris ---\n• atau satu array [ {def A}, {def B} ]`}
          className="mt-1.5 w-full resize-y rounded-md border border-edge bg-well p-2 font-mono text-[10px] leading-relaxed placeholder:text-muted/50 focus:border-secondary focus:outline-none"
        />
        <label className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-dim">
          <input
            type="checkbox"
            checked={sertakanAktif}
            onChange={(e) => setSertakanAktif(e.target.checked)}
            disabled={berjalan}
            className="accent-accent"
          />
          sertakan karya aktif di Studio: <span className="font-mono text-[10px] text-secondary">{def.name}</span>
        </label>
      </div>

      {/* Hasil pemeriksaan */}
      {(items.length > 0 || hasilParse.gagal.length > 0) && !berjalan && status.state === "idle" && (
        <div className="rounded-lg border border-edge bg-panel-low p-2.5 text-[11px]">
          <p className="font-mono text-[10px] text-tertiary">
            ✓ {items.length} karya siap render
            {totalDurasi > 0 && (
              <span className="text-muted"> · total {totalDurasi.toFixed(0)} dtk · ± {perkiraanTotal.toLocaleString("id-ID")} MB</span>
            )}
          </p>
          {beringat && (
            <p className="mt-1 flex items-start gap-1.5 text-[10px] text-accent">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              banyak sekali — pertimbangkan 720p atau pecah bertahap (RAM browser terbatas).
            </p>
          )}
          {hasilParse.gagal.length > 0 && (
            <ul className="mt-1.5 max-h-24 space-y-1 overflow-y-auto rounded bg-error/10 p-2 font-mono text-[9px] text-error">
              {hasilParse.gagal.slice(0, 6).map((g, i) => (
                <li key={i}><span className="opacity-60">{g.label}:</span> {g.pesan}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Antrean berjalan */}
      {baris.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              {berjalan && <Loader2 className="h-3 w-3 animate-spin text-secondary" />}
              {selesai}/{baris.length} selesai
            </span>
            <span>{Math.round(progresTotal * 100)}%</span>
          </div>
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {baris.map((b, i) => (
              <li key={i} className="rounded-md border border-edge bg-panel-low px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="min-w-0 flex-1 truncate font-mono text-ink-dim" title={b.nama}>{b.nama}</span>
                  {b.state === "ok" && <CheckCircle2 className="h-3 w-3 shrink-0 text-tertiary" />}
                  {b.state === "render" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-secondary" />}
                  {b.state === "gagal" && <XCircle className="h-3 w-3 shrink-0 text-error" />}
                  <span className="shrink-0 font-mono text-[9px] text-muted">
                    {b.state === "ok" && `✓ ${b.mb?.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`}
                    {b.state === "render" && `${Math.round(b.pct)}%`}
                    {b.state === "menunggu" && "menunggu"}
                    {b.state === "gagal" && "gagal"}
                  </span>
                </div>
                {b.state === "render" && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-high">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" style={{ width: `${Math.max(2, b.pct)}%` }} />
                  </div>
                )}
                {b.state === "gagal" && b.err && (
                  <p className="mt-0.5 font-mono text-[9px] text-error">{b.err.slice(0, 120)}</p>
                )}
              </li>
            ))}
          </ul>
          {berjalan && (
            <button
              onClick={() => (cancelRef.current.cancelled = true)}
              className="w-full rounded-lg border border-edge px-3 py-2 text-[11px] text-error hover:bg-error/10"
            >
              Batalkan
            </button>
          )}
        </div>
      )}

      {/* Selesai / error */}
      {status.state === "done" && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-tertiary/10 px-3 py-2 text-[11px] text-tertiary">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Selesai! <span className="font-mono">{status.filename}</span> ({status.zipMb.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB · {status.jumlah} karya) di folder Download — buka saja seperti ZIP biasa.
            </span>
          </div>
          <button
            onClick={() => zipRef.current && unduhBlob(zipRef.current, `motion-easy-bulk-${status.jumlah}-karya-${preset.id}p.zip`)}
            className="w-full rounded-lg border border-edge px-3 py-2 text-[11px] text-ink-dim hover:text-ink"
          >
            Unduh ulang ZIP
          </button>
          <button onClick={reset} className="w-full rounded-lg bg-panel-high px-3 py-2 text-[11px] font-semibold text-ink hover:bg-bright">
            Buat batch baru
          </button>
        </div>
      )}
      {status.state === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      <div>
        <button
          onClick={jalankan}
          disabled={items.length === 0 || berjalan || !supported || terkunci}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2.5 text-sm font-semibold text-deep shadow disabled:opacity-50"
        >
          {berjalan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
          {berjalan ? "Mengrenders…" : `Render ${items.length} karya → 1 ZIP (${preset.label})`}
        </button>
      </div>

      <p className="font-mono text-[9px] leading-relaxed text-muted">
        {MODE_DEV ? "mode pengembangan — premium terbuka (lokal) · " : ""}
        encode 100% lokal (WebCodecs) · karya gagal tidak menghentikan antrean · hasil = satu ZIP siap upload microstock
      </p>
      </div>
    </Modal>
  );
}
