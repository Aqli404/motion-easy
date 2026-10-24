import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Crown, X, CheckCircle2, XCircle, Loader2, Lock, Sparkles, Volume2, VolumeX, Film, Clapperboard as Clapper } from "lucide-react";
import Modal from "./Modal";
import { EXPORT_PRESETS, resolveExportSize, estimasiMb, slugify, type ExportPreset } from "../export/presets";
import { exportMp4, unduhBlob, simpanBlobPremium, webCodecsSupported, probeDukunganPreset, type ExportProgress } from "../export/encoder";
import { exportWebmAlpha, exportQuickTime } from "../export/mov";
import { TARGET_MB_OPTIONS, padMp4Blob, targetMicrostockUntukDurasi } from "../export/pad";
import { sfx } from "../engine/audio";
import { useLicense } from "../license/useLicense";
import { premiumAktif, premiumEfektif, MODE_DEV, labelTier, expiryLabel, izinPreset } from "../license/license";
import { useKuota, recordDailyExport } from "../license/kuota";
import type { MotionDefinition } from "../engine/schema";
import { renderFrame } from "../engine/renderer";

interface Props {
  def: MotionDefinition;
  open: boolean;
  onClose: () => void;
  initialPresetId?: string;
  /** dipanggil sekali setelah ekspor sukses — untuk auto-baris metadata.csv */
  onExported?: (info: { filename: string; format: FormatEkspor }) => void;
}

type FormatEkspor = "mp4" | "mov" | "alpha";

type Status =
  | { state: "idle" }
  | { state: "running"; progress: ExportProgress }
  | { state: "done"; fileMb: number; filename: string }
  | { state: "error"; message: string };

export default function ExportModal({ def, open, onClose, initialPresetId, onExported }: Props) {
  const lic = useLicense();
  const premium = premiumEfektif(lic);
  const kuota = useKuota(premium);
  const [format, setFormat] = useState<FormatEkspor>("mp4");
  const [presetId, setPresetId] = useState(initialPresetId || "1080");
  const [targetMb, setTargetMb] = useState<number>(() => targetMicrostockUntukDurasi(def.canvas.durationSec ?? 10));
  const [customMb, setCustomMb] = useState("");
  const [postTargetMb, setPostTargetMb] = useState<number>(0);
  // SFX audio — default mute untuk jalan aman kurasi (pembeli bisa aktifkan kalau perlu)
  const [sfxAktif, setSfxAktif] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const cancelRef = useRef({ cancelled: false });
  const blobRef = useRef<Blob | null>(null);
  const rawBlobRef = useRef<Blob | null>(null);
  const supported = webCodecsSupported();
  const [dukungan, setDukungan] = useState<Record<string, boolean> | null>(null);
  const [infoTersalin, setInfoTersalin] = useState(false);
  const [coverTime, setCoverTime] = useState(0);
  const durasi = def.canvas.durationSec ?? 5;
  const targetMicrostock = targetMicrostockUntukDurasi(durasi);
  const overallMbps = targetMicrostock > 0 ? Math.round(((targetMicrostock * 1_048_576 * 8) / Math.max(1, durasi) / 1_000_000) * 10) / 10 : 0;
  const belumTerapkanMicrostock = !!(premium && format !== "alpha" && targetMb < targetMicrostock && rawBlobRef.current === null && status.state === "idle");

  useEffect(() => {
    if (initialPresetId) {
      setPresetId(initialPresetId);
    }
  }, [initialPresetId, open]);

  // Microstock ideal: saat modal dibuka dari canvas, pasang target lantai 105 (atau auto sesuai durasi)
  useEffect(() => {
    if (open) setTargetMb((v) => (v === 0 ? targetMicrostock : v));
  }, [open, targetMicrostock]);

  // Setelah modal terbuka, cek sekali: preset mana yang benar-benar didukung
  // mesin ini dan diizinkan lisensi. Preset aktif yang ternyata gak sanggup/terkunci otomatis diganti.
  useEffect(() => {
    if (!open || dukungan) return;
    let batal = false;
    probeDukunganPreset(def).then((hasil) => {
      if (batal) return;
      setDukungan(hasil);
      setPresetId((id) => {
        const preferred = initialPresetId || id;
        if (hasil[preferred] !== false && izinPreset(preferred, lic).diizinkan) return preferred;
        const penerus = [...EXPORT_PRESETS]
          .reverse()
          .find((p) => izinPreset(p.id, lic).diizinkan && hasil[p.id] !== false);
        return penerus ? penerus.id : preferred;
      });
    });
    return () => {
      batal = true;
    };
    // dependensi disengaja: probe hanya dijalankan sekali per def terbuka
  }, [open, def, lic, initialPresetId]);

  // Preset sekali klik: Microstock 4K (terbukti 105 MB / 10s → 84 Mbps overall) — SATU TOMBOL
  const terapkanMicrostock = () => {
    setFormat("mp4");
    setPresetId("2160-160");
    setTargetMb(targetMicrostock);
    setSfxAktif(false);
    sfx.setMuted(true);
  };

  const reset = () => {
    setStatus({ state: "idle" });
    cancelRef.current = { cancelled: false };
    blobRef.current = null;
    rawBlobRef.current = null;
  };

  const mulai = async () => {
    const preset = EXPORT_PRESETS.find((p) => p.id === presetId)!;
    const izin = izinPreset(preset.id, lic);
    if (!izin.diizinkan) {
      setStatus({ state: "error", message: izin.alasan || "Preset ini tidak diizinkan untuk paket Anda." });
      return;
    }
    if ((format === "mov" || format === "alpha") && !premium) {
      setStatus({ state: "error", message: "Ekspor MOV QuickTime & Video Alpha Transparan adalah fitur khusus lisensi Premium." });
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
      let rawBlob: Blob;
      let outWidth = def.canvas.w;
      let outHeight = def.canvas.h;

      if (format === "mov") {
        const hasil = await exportQuickTime(
          def,
          preset,
          (progress) => setStatus({ state: "running", progress }),
          cancelRef.current,
        );
        rawBlob = hasil.blob;
        outWidth = hasil.size.width;
        outHeight = hasil.size.height;
      } else if (format === "alpha") {
        const hasil = await exportWebmAlpha(
          def,
          preset,
          (progress) => setStatus({ state: "running", progress }),
          cancelRef.current,
        );
        rawBlob = hasil.blob;
        outWidth = hasil.size.width;
        outHeight = hasil.size.height;
      } else {
        const hasil = await exportMp4(
          def,
          preset,
          (progress) => setStatus({ state: "running", progress }),
          cancelRef.current,
          sfxAktif,
        );
        rawBlob = hasil.blob;
        outWidth = hasil.size.width;
        outHeight = hasil.size.height;
      }

      rawBlobRef.current = rawBlob;
      // ISO-BMFF free-box padding is enabled for MP4 and QuickTime MOV (both
      // box-based). Never append an atom to WebM (Alpha) — different structure.
      const paddedBlob = await padMp4Blob(rawBlob, premium && format !== "alpha" ? targetMb : 0);
      blobRef.current = paddedBlob;
      setPostTargetMb(premium && format !== "alpha" ? targetMb : 0);
      const ext = format === "mov" ? "mov" : format === "alpha" ? "webm" : "mp4";
      const filename = `${slugify(def.name)}-${outWidth}x${outHeight}.${ext}`;
      const simpan = await simpanBlobPremium(paddedBlob, filename);
      if (simpan.dibatalkan) {
        setStatus({ state: "error", message: "Simpan dibatalkan. Tekan Ekspor untuk menyimpan kembali." });
        return;
      }
      // kuota hanya dipotong setelah ekspor benar-benar sukses
      if (!kuota.unlimited) recordDailyExport();
      // fileMb dilaporkan dalam MB desimal untuk keramahan bacaan
      setStatus({ state: "done", fileMb: paddedBlob.size / 1_048_576, filename });
      onExported?.({ filename, format });
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
  const buatCover = () => {
    const canvas = document.createElement("canvas");
    canvas.width = ukuran.width;
    canvas.height = ukuran.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus({ state: "error", message: "Browser gagal membuat cover canvas." });
      return;
    }
    renderFrame(ctx, def, Math.max(0, Math.min(def.canvas.durationSec, coverTime)));
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus({ state: "error", message: "Gagal menghasilkan cover PNG." });
        return;
      }
      unduhBlob(blob, `${slugify(def.name)}-cover.png`);
    }, "image/png");
  };
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

      {/* Format Video: MP4 / QuickTime MOV / WebM VP9 Alpha */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-edge bg-panel-low p-1 text-xs">
        <button
          onClick={() => setFormat("mp4")}
          disabled={berjalan}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold transition-all ${
            format === "mp4"
              ? "bg-panel text-primary shadow-sm border border-primary/20"
              : "text-muted hover:text-ink"
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span className="truncate">MP4</span>
        </button>
        <button
          onClick={() => {
            if (!premium) {
              setStatus({ state: "error", message: "Ekspor MOV QuickTime adalah fitur khusus lisensi Premium." });
              return;
            }
            setFormat("mov");
          }}
          disabled={berjalan}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold transition-all ${
            format === "mov"
              ? "bg-panel text-primary shadow-sm border border-primary/20"
              : "text-muted hover:text-ink"
          }`}
        >
          <Clapper className="h-3.5 w-3.5" />
          <span className="truncate">MOV</span>
          {!premium && <Lock className="h-3 w-3 text-muted" />}
        </button>
        <button
          onClick={() => {
            if (!premium) {
              setStatus({ state: "error", message: "Ekspor Video Alpha Transparan adalah fitur khusus lisensi Premium." });
              return;
            }
            setFormat("alpha");
          }}
          disabled={berjalan}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold transition-all ${
            format === "alpha"
              ? "bg-panel text-primary shadow-sm border border-primary/20"
              : "text-muted hover:text-ink"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-tertiary" />
          <span className="truncate">Alpha</span>
          {!premium && <Lock className="h-3 w-3 text-muted" />}
        </button>
      </div>
      {format === "mov" && (
        <p className="text-[10px] leading-relaxed text-muted">
          MOV QuickTime (H.264) — file valid berisi frame asli untuk Adobe Premiere &amp; CapCut PC. Butuh latar: pakai Alpha untuk overlay tembus cahaya.
        </p>
      )}
      {format === "alpha" && (
        <p className="text-[10px] leading-relaxed text-ink-dim">
          WebM VP9 dengan transparansi ASLI (alpha channel tetap disimpan). Didukung After Effects, Premiere Pro, DaVinci Resolve &amp; CapCut PC.
        </p>
      )}

      <ul className="space-y-1.5">
        {EXPORT_PRESETS.map((p) => {
          const s = resolveExportSize(def, p);
          const aktif = presetId === p.id;
          const izin = izinPreset(p.id, lic);
          const terkunci = !izin.diizinkan;
          const tidakDukung = dukungan ? dukungan[p.id] === false : false;
          const mati = terkunci || tidakDukung;
          const badge = tidakDukung ? "mesin tak sanggup" : izin.badge;
          return (
            <li key={p.id}>
              <button
                onClick={() => !mati && !berjalan && setPresetId(p.id)}
                disabled={mati || berjalan}
                title={terkunci ? izin.alasan : undefined}
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
                    {s.width}×{s.height} · ≈{estimasiMb(def.canvas.durationSec, p.bitrate)} MB konten
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[9px] ${
                      tidakDukung
                        ? "text-error"
                        : terkunci
                          ? "text-muted"
                          : izin.badge.startsWith("aktif")
                            ? "text-tertiary"
                            : "text-muted"
                    }`}
                  >
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

      {format === "alpha" && presetId === "2160" && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-2.5 flex items-start gap-2 text-[10px] text-ink-dim leading-relaxed">
          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            <strong className="text-ink">Tips Alpha 4K:</strong> Untuk overlay transparan di CapCut PC, Premiere Pro, &amp; DaVinci Resolve, resolusi <strong>1080p</strong> atau <strong>2K</strong> sudah sangat tajam dan jauh lebih cepat dirender.
          </span>
        </div>
      )}

      {/* Opsi Target Padding MB (ISO-BMFF free box) — Lolos Kurasi Adobe Stock & Shutterstock */}
      {format !== "alpha" && (
      <div className={`rounded-xl border p-3 space-y-2 ${premium ? "border-accent/20 bg-panel-low" : "border-edge bg-panel-low/60"}`}>
        {belumTerapkanMicrostock && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Preset ini akan menghasilkan file <strong>≈{Math.round(estimasiMb(durasi, (EXPORT_PRESETS.find(p=>p.id===presetId)?.bitrate) ?? 80_000_000))} MB</strong> — ubah Target ke <strong>{targetMicrostock} MB</strong> biar pasti ≥100 MB dan lolos Adobe.</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted font-bold">
            <Film className="h-3.5 w-3.5 text-accent" />
            <span>Padding Minimal File Microstock</span>
          </label>
          {!premium && (
            <span className="flex items-center gap-1 rounded bg-panel-high px-1.5 py-0.5 text-[9px] font-mono text-primary">
              <Lock className="h-2.5 w-2.5" /> Premium
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={terapkanMicrostock}
            disabled={berjalan || !premium}
            className="rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-1.5 text-[11px] font-bold text-deep shadow disabled:opacity-50"
          >
            ✨ Microstock 4K · {targetMicrostock} MB
          </button>
          <span className="py-1.5 font-mono text-[10px] leading-relaxed text-muted">Resolusi 4K · SFX OFF · target {targetMicrostock} MB (overall {overallMbps} Mbps)</span>
        </div>
        <p className="mb-1.5 text-[10px] leading-relaxed text-muted">
          Preset <span className="font-mono text-ink-dim">4K · 160 Mbps</span> + target <span className="font-mono text-ink-dim">{targetMicrostock} MB</span> → konten MP4 4K (≥100 MB) sesuai standar kurasi Adobe Stock & Shutterstock.
        </p>
        <select
          value={premium ? targetMb : 0}
          onChange={(e) => setTargetMb(Number(e.target.value))}
          disabled={berjalan || !premium}
          className="w-full rounded-lg border border-edge bg-well px-2.5 py-2 text-xs text-ink font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {TARGET_MB_OPTIONS.map((o) => (
            <option key={o.mb} value={o.mb}>
              {o.label}
            </option>
          ))}
          {targetMb > 0 && !TARGET_MB_OPTIONS.some((o) => o.mb === targetMb) && (
            <option value={targetMb}>{targetMb} MB (custom)</option>
          )}
        </select>
          {premium && format === "mp4" && (
          <label className="block text-[10px] text-muted">
            Target custom (MB, 1–2000)
            <input
              type="number"
              min={1}
              max={2000}
              step={1}
              value={customMb}
              disabled={berjalan}
              onChange={(e) => {
                setCustomMb(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1 && n <= 2000) setTargetMb(n);
              }}
              placeholder="mis. 120"
              className="mt-1 w-full rounded-lg border border-edge bg-well px-2.5 py-2 text-xs text-ink disabled:opacity-60"
            />
          </label>
        )}
        <p className="text-[10px] text-muted leading-relaxed font-mono">
          <strong className="text-ink">Aman untuk kurasi Shutterstock &amp; Adobe Stock</strong> — menyuntikkan kontainer ISO-BMFF <code>free</code> box resmi tanpa merusak kualitas video stream sedikit pun.
        </p>
      </div>
      )}

      {/* Toggle Sound Effects (SFX) Transisi */}
      <div className="flex items-center justify-between rounded-xl border border-edge bg-panel-low/60 p-3">
        <div className="flex items-center gap-2">
          {sfxAktif ? <Volume2 className="h-4 w-4 text-tertiary" /> : <VolumeX className="h-4 w-4 text-muted" />}
          <div>
            <div className="text-xs font-semibold text-ink">SFX Transisi Otomatis</div>
            <div className="text-[10px] text-muted font-mono">Whoosh, Pop & Ding sintetis Web Audio API</div>
          </div>
        </div>
        <button
          onClick={() => {
            const next = !sfxAktif;
            setSfxAktif(next);
            sfx.setMuted(!next);
            if (next) sfx.play("ding");
          }}
          className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
            sfxAktif ? "bg-tertiary/15 text-tertiary border border-tertiary/30" : "bg-panel text-muted border border-edge"
          }`}
        >
          {sfxAktif ? "AKTIF" : "MUTED"}
        </button>
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
            onClick={() => blobRef.current && simpanBlobPremium(blobRef.current, status.filename)}
            className="w-full rounded-lg border border-tertiary bg-tertiary/15 px-3 py-2 text-[11px] font-semibold text-tertiary hover:bg-tertiary/25"
          >
            Unduh ulang · {status.fileMb.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB
          </button>
          <p className="text-center font-mono text-[9px] text-muted">Kalau file tidak muncul di Downloads: izinkan unduhan ganda di address bar atau gunakan Unduh ulang.</p>
          <div className="rounded-lg border border-edge bg-panel-low p-2.5">
            <label className="block text-[10px] font-semibold text-ink-dim">
              Cover PNG dari frame animasi
              <input
                type="range"
                min={0}
                max={def.canvas.durationSec}
                step={0.1}
                value={coverTime}
                onChange={(e) => setCoverTime(Number(e.target.value))}
                className="mt-2 block w-full accent-orange-400"
              />
              <span className="font-mono text-muted">Frame {coverTime.toFixed(1)}s</span>
            </label>
            <button onClick={buatCover} className="mt-2 w-full rounded-lg border border-edge px-3 py-2 text-[10px] font-semibold text-ink-dim hover:text-ink">
              Buat & Unduh Cover PNG
            </button>
          </div>
          {premium && format !== "alpha" && rawBlobRef.current && (
            <div className="rounded-lg border border-edge bg-panel-low p-2.5">
              <label className="block text-[10px] font-semibold text-ink-dim">Naikkan ukuran tanpa render ulang</label>
              <div className="mt-1.5 flex gap-1.5">
                <select
                  value={postTargetMb}
                  onChange={async (e) => {
                    const next = Number(e.target.value);
                    setPostTargetMb(next);
                    if (!rawBlobRef.current || status.state !== "done") return;
                    try {
                      const enlarged = await padMp4Blob(rawBlobRef.current, next);
                      blobRef.current = enlarged;
                      await simpanBlobPremium(enlarged, status.filename);
                      setStatus({ ...status, fileMb: enlarged.size / 1_048_576 });
                    } catch (err) {
                      setStatus({ state: "error", message: (err as Error).message });
                    }
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-edge bg-well px-2 py-1.5 text-[10px] text-ink"
                >
                  {TARGET_MB_OPTIONS.map((o) => <option key={o.mb} value={o.mb}>{o.label}</option>)}
                  {postTargetMb > 0 && !TARGET_MB_OPTIONS.some((o) => o.mb === postTargetMb) && <option value={postTargetMb}>{postTargetMb} MB (custom)</option>}
                </select>
                <button
                  onClick={async () => {
                    try {
                      const enlarged = await padMp4Blob(rawBlobRef.current!, postTargetMb);
                      blobRef.current = enlarged;
                      await simpanBlobPremium(enlarged, status.filename);
                      setStatus({ ...status, fileMb: enlarged.size / 1_048_576 });
                    } catch (err) {
                      setStatus({ state: "error", message: (err as Error).message });
                    }
                  }}
                  className="shrink-0 rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-deep hover:brightness-110"
                >
                  Terapkan & Unduh
                </button>
              </div>
              <p className="mt-1 text-[9px] text-muted">Ganti target di atas → otomatis diterapkan & diunduh (menimpa free-box). Tidak mengubah kualitas atau membuat render baru.</p>
            </div>
          )}
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
