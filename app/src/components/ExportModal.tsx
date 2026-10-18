import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Crown, X, CheckCircle2, XCircle, Loader2, Lock, Sparkles } from "lucide-react";
import Modal from "./Modal";
import { EXPORT_PRESETS, resolveExportSize, estimasiMb, slugify, type ExportPreset } from "../export/presets";
import { exportMp4, unduhBlob, webCodecsSupported, probeDukunganPreset, type ExportProgress } from "../export/encoder";
import { TARGET_MB_OPTIONS, padMp4Blob } from "../export/pad";
import { useLicense } from "../license/useLicense";
import { premiumAktif, premiumEfektif, MODE_DEV, labelTier, expiryLabel } from "../license/license";
import { useKuota, recordDailyExport } from "../license/kuota";
import type { MotionDefinition } from "../engine/schema";

interface Props {
  def: MotionDefinition;
  open: boolean;
  onClose: () => void;
}

type Status =
  | { state: "idle" }
  | { state: "running"; progress: ExportProgress }
  | { state: "done"; fileMb: number; filename: string }
  | { state: "error"; message: string };

export default function ExportModal({ def, open, onClose }: Props) {
  const lic = useLicense();
  const premium = premiumEfektif(lic);
  const kuota = useKuota(premium);
  const [presetId, setPresetId] = useState("1080");
  const [targetMb, setTargetMb] = useState<number>(0);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const cancelRef = useRef({ cancelled: false });
  const blobRef = useRef<Blob | null>(null);
  const supported = webCodecsSupported();
  const [dukungan, setDukungan] = useState<Record<string, boolean> | null>(null);
  const [infoTersalin, setInfoTersalin] = useState(false);

  // Setelah modal terbuka, cek sekali: preset mana yang benar-benar didukung
  // mesin ini. Preset aktif yang ternyata gak sanggup otomatis diganti.
  useEffect(() => {
    if (!open || dukungan) return;
    let batal = false;
    probeDukunganPreset(def).then((hasil) => {
      if (batal) return;
      setDukungan(hasil);
      setPresetId((id) => {
        if (hasil[id] !== false) return id;
        const penerus = [...EXPORT_PRESETS]
          .reverse()
          .find((p) => (!p.premium || premium) && hasil[p.id] !== false);
        return penerus ? penerus.id : id;
      });
    });
    return () => {
      batal = true;
    };
    // dependensi disengaja: probe hanya dijalankan sekali per def terbuka
  }, [open, def]);

  const reset = () => {
    setStatus({ state: "idle" });
    cancelRef.current = { cancelled: false };
    blobRef.current = null;
  };

  const mulai = async () => {
    const preset = EXPORT_PRESETS.find((p) => p.id === presetId)!;
    // penjaga tegas: preset premium hanya boleh diekspor bila premium efektif
    if (preset.premium && !premiumEfektif(lic)) {
      setStatus({ state: "error", message: "Preset ini butuh lisensi premium — aktivasi di menu Lisensi." });
      return;
    }
    // penjaga kuota harian paket gratis
    if (!kuota.unlimited && kuota.remaining <= 0) {
      setStatus({
        state: "error",
        message: `Kuota ${kuota.limit} ekspor gratis hari ini sudah habis. Upgrade ke Premium untuk ekspor tanpa batas.`,
      });
      return;
    }
    cancelRef.current = { cancelled: false };
    blobRef.current = null;
    setStatus({ state: "running", progress: { phase: "preparing", frame: 0, totalFrames: 0, pct: 0 } });
    try {
      const hasil = await exportMp4(
        def,
        preset,
        (progress) => setStatus({ state: "running", progress }),
        cancelRef.current,
      );
      const paddedBlob = await padMp4Blob(hasil.blob, premium ? targetMb : 0);
      blobRef.current = paddedBlob;
      const filename = `${slugify(def.name)}-${hasil.size.width}x${hasil.size.height}.mp4`;
      unduhBlob(paddedBlob, filename);
      // kuota hanya dipotong setelah ekspor benar-benar sukses
      if (!kuota.unlimited) recordDailyExport();
      setStatus({ state: "done", fileMb: paddedBlob.size / 1_000_000, filename });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("dibatalkan")) setStatus({ state: "idle" });
      else setStatus({ state: "error", message: msg });
    }
  };

  /** Kumpulkan info mesin untuk dukungan via WhatsApp. */
  const salinInfoPerangkat = () => {
    const baris = EXPORT_PRESETS.map(
      (p) => `${p.label}: ${dukungan?.[p.id] === false ? "tidak didukung" : "didukung"}`,
    ).join("\n");
    const teks = [
      "Info Perangkat — Motion Easy",
      navigator.userAgent,
      `WebCodecs: ${supported ? "ada" : "tidak ada"}`,
      baris,
    ].join("\n");
    navigator.clipboard
      .writeText(teks)
      .then(() => {
        setInfoTersalin(true);
        setTimeout(() => setInfoTersalin(false), 2500);
      })
      .catch(() => {
        // clipboard diblokir — abaikan, pengguna bisa screenshot
      });
  };

  const presetAktif = EXPORT_PRESETS.find((p) => p.id === presetId) as ExportPreset;
  const ukuran = resolveExportSize(def, presetAktif);
  const berjalan = status.state === "running";
  const frameInfo =
    status.state === "running"
      ? `${status.progress.phase} · frame ${status.progress.frame}/${status.progress.totalFrames || "?"}`
      : "";

  return (
    <Modal open={open} title="Ekspor Video (MP4)" onClose={() => !berjalan && onClose()}>
      {!supported && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Browser ini tidak mendukung WebCodecs (encode video). Gunakan{" "}
            <strong>Chrome</strong> atau <strong>Edge</strong> desktop terbaru.
          </span>
        </div>
      )}

      <p className="text-xs">
        Sumber: <span className="text-primary">{def.name}</span> ·{" "}
        {def.canvas.durationSec}s @ {def.canvas.fps}fps
      </p>

      {/* Kuota harian paket gratis */}
      {!kuota.unlimited && (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
            kuota.remaining > 0
              ? "bg-panel-low text-ink-dim"
              : "bg-error/10 text-error"
          }`}
        >
          {kuota.remaining > 0 ? (
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
          ) : (
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {kuota.remaining > 0 ? (
              <>
                Paket gratis: <strong className="text-ink">{kuota.remaining}</strong> dari{" "}
                {kuota.limit} ekspor tersisa hari ini.
              </>
            ) : (
              <>
                Kuota {kuota.limit} ekspor gratis hari ini sudah habis.{" "}
                <Link to="/harga" className="font-semibold underline" onClick={onClose}>
                  Upgrade Premium
                </Link>{" "}
                untuk ekspor tanpa batas.
              </>
            )}
          </span>
        </div>
      )}

      <ul className="space-y-1.5">
        {EXPORT_PRESETS.map((p) => {
          const s = resolveExportSize(def, p);
          const aktif = presetId === p.id;
          const terkunci = p.premium && !premium;
          const tidakDukung = dukungan ? dukungan[p.id] === false : false;
          const mati = terkunci || tidakDukung;
          const badge = tidakDukung
            ? "mesin tak sanggup"
            : p.premium
              ? premium
                ? "aktif ✓"
                : "butuh lisensi"
              : "gratis";
          return (
            <li key={p.id}>
              <button
                onClick={() => !mati && !berjalan && setPresetId(p.id)}
                disabled={mati || berjalan}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                  aktif && !mati
                    ? "border-accent bg-panel-high"
                    : mati
                      ? "border-edge bg-panel-low opacity-60"
                      : "border-edge bg-panel-low hover:bg-panel"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`font-mono font-semibold ${mati ? "text-muted" : "text-ink-dim"}`}>
                    {p.label}
                  </span>
                  <span className="font-mono text-[9px] text-muted">
                    {s.width}×{s.height} · maks ~{estimasiMb(def.canvas.durationSec, p.bitrate)} MB
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`font-mono text-[9px] ${mati ? "text-error" : premium && p.premium ? "text-tertiary" : "text-muted"}`}>
                    {badge}
                  </span>
                  {p.premium ? (
                    <Crown className={`h-3.5 w-3.5 ${terkunci ? "text-muted" : "text-primary"}`} />
                  ) : (
                    aktif && !tidakDukung && <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Opsi Enlarge-MB (Jujur via MP4 free box padding) — fitur Premium */}
      <div
        className={`rounded-lg border p-2.5 ${
          premium ? "border-edge bg-panel-low" : "border-edge bg-panel-low/60"
        }`}
      >
        <label className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-muted">
          <span>Target Ukuran File (Enlarge MB Resmi)</span>
          {!premium && (
            <span className="flex items-center gap-1 rounded bg-panel-high px-1.5 py-0.5 text-[8px] text-primary">
              <Lock className="h-2.5 w-2.5" /> Premium
            </span>
          )}
        </label>
        <select
          value={premium ? targetMb : 0}
          onChange={(e) => setTargetMb(Number(e.target.value))}
          disabled={berjalan || !premium}
          className="mt-1.5 w-full rounded-md border border-edge bg-well px-2 py-1.5 text-[11px] text-ink-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          {TARGET_MB_OPTIONS.map((o) => (
            <option key={o.mb} value={o.mb}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
          {premium
            ? "menambahkan kontainer ISO/IEC (`free` box) — ukuran file membesar tanpa merusak video stream. Lolos syarat minimal agensi/microstock."
            : "khusus Premium — menaikkan ukuran file ke 10/25/50 MB lewat kotak ISO resmi, aman untuk syarat minimal microstock."}
        </p>
      </div>

      {/* Progres */}
      {status.state === "running" && (
        <div className="mt-3">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-secondary" /> {frameInfo}
            </span>
            <span>{Math.round(status.progress.pct)}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-[width] duration-150"
              style={{ width: `${Math.max(2, status.progress.pct)}%` }}
            />
          </div>
          <button
            onClick={() => (cancelRef.current.cancelled = true)}
            className="mt-2 w-full rounded-lg border border-edge px-3 py-2 text-[11px] text-error hover:bg-error/10"
          >
            Batalkan
          </button>
        </div>
      )}

      {status.state === "done" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-tertiary/10 px-3 py-2 text-[11px] text-tertiary">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Selesai! <span className="font-mono">{status.filename}</span> (
              {status.fileMb.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB) sudah
              diunduh ke folder Download.
            </span>
          </div>
          <button
            onClick={() => blobRef.current && unduhBlob(blobRef.current, `${slugify(def.name)}-${ukuran.width}x${ukuran.height}.mp4`)}
            className="w-full rounded-lg border border-edge px-3 py-2 text-[11px] text-ink-dim hover:text-ink"
          >
            Unduh ulang
          </button>
        </div>
      )}

      {status.state === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <span>{status.message}</span>
            <button
              onClick={salinInfoPerangkat}
              className="mt-1 block font-mono text-[10px] underline opacity-80 hover:opacity-100"
            >
              {infoTersalin ? "tersalin ✓ (tempel di WhatsApp admin)" : "Salin Info Perangkat"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3">
        {status.state === "done" ? (
          <button
            onClick={() => { reset(); onClose(); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-panel-high px-3 py-2.5 text-sm font-semibold text-ink hover:bg-bright"
          >
            <CheckCircle2 className="h-4 w-4 text-tertiary" /> Tutup
          </button>
        ) : (
          <button
            onClick={mulai}
            disabled={
              berjalan ||
              !supported ||
              dukungan?.[presetId] === false ||
              (!kuota.unlimited && kuota.remaining <= 0)
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2.5 text-sm font-semibold text-deep shadow disabled:opacity-50"
          >
            {berjalan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {berjalan
              ? "Mengencode…"
              : !kuota.unlimited && kuota.remaining <= 0
                ? "Kuota hari ini habis — Upgrade Premium"
                : `Ekspor ${presetAktif.label}`}
          </button>
        )}
      </div>

      <p className="mt-2 font-mono text-[9px] leading-relaxed text-muted">
        {lic && premiumAktif(lic)
          ? `lisensi ${labelTier(lic.payload.tier)} · berlaku ${expiryLabel(lic.payload)} · 2K/4K terbuka`
          : MODE_DEV
            ? "mode pengembangan — premium terbuka (hanya di komputer lokal ini)"
            : "encode di GPU-mu (WebCodecs) · 2K/4K butuh lisensi — aktivasi di menu Lisensi"}
      </p>
    </Modal>
  );
}
