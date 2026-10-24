/**
 * components/MetadataCsvPanel.tsx — Tabel output `metadata.csv` untuk tab
 * Metadata SEO di /studio (pengganti panel brief-JSON lama).
 *
 * Alur: baris lahir OTOMATIS dari setiap ekspor (buatRecordOtomatis) →
 * user review/edit di tabel → lint ✅/⚠️ → unduh metadata.csv / ikut Bulk ZIP.
 *
 * "Perkaya via AI" (opsional, per baris):
 *  - Salin prompt berisi KODE DRAW + metadata saat ini (teks KB, bukan video).
 *  - Unduh 5 thumbnail JPG kecil dari renderFrame (AI "melihat" isi video
 *    tanpa mengunggah file besar).
 *  - Tempel balik JSON hasil AI → divalidasi → baris di-update.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  Download,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ImageDown,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import {
  MIKRO_KATEGORI,
  getBatchCsv,
  subscribeBatchCsv,
  tambahBatchCsv,
  hapusBatchCsv,
  updateBatchCsv,
  resetBatchCsv,
  batchToCsv,
  buatRecordOtomatis,
  buildMicrostockEnrichPrompt,
  validateMicrostockJson,
  scanIp,
  type MicrostockCsvRecord,
} from "../engine/microstock";
import { copyText } from "../engine/brief";
import { unduhBlob } from "../export/encoder";
import { drawCodeToDefinition, dimsRasio, type RasioKanvas } from "../engine/drawcode";
import { renderFrame } from "../engine/renderer";

/* ===== Lint baris sederhana (aturan agensi) ===== */
function lintRow(r: MicrostockCsvRecord): string[] {
  const masalah: string[] = [];
  if (!r.filename.trim() || !/\.(mp4|mov|webm)$/i.test(r.filename.trim())) {
    masalah.push("filename harus seperti video-upload.mp4 / .mov / .webm");
  }
  if (r.title.length < 60 || r.title.length > 90) {
    masalah.push(`title ${r.title.length} char (ideal 60–90)`);
  }
  if (r.description.length < 100 || r.description.length > 160) {
    masalah.push(`description ${r.description.length} char (ideal 100–160)`);
  }
  const nKw = r.keywords.split(",").map((s) => s.trim()).filter(Boolean).length;
  if (nKw !== 50) masalah.push(`keywords ${nKw} (harus tepat 50)`);
  if (scanIp(`${r.title}\n${r.description}\n${r.keywords}`).length > 0) {
    masalah.push("terdeteksi kata IP/brand — ganti istilah generik");
  }
  return masalah;
}

export default function MetadataCsvPanel() {
  const rows = useSyncExternalStore(subscribeBatchCsv, getBatchCsv);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [salinOk, setSalinOk] = useState(false);
  const [thumbMsg, setThumbMsg] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);

  const jumlahOk = useMemo(() => rows.filter((r) => lintRow(r).length === 0).length, [rows]);

  /* ===== Unduh metadata.csv ===== */
  const unduh = () => {
    if (rows.length === 0) return;
    unduhBlob(new Blob([batchToCsv(rows)], { type: "text/csv;charset=utf-8" }), `motion-easy-metadata-${rows.length}-aset.csv`);
  };

  /* ===== Tambah baris manual ===== */
  const tambahManual = () => {
    tambahBatchCsv(buatRecordOtomatis({ filename: `.mp4` }));
  };

  /* ===== Thumbnail 5 frame kecil (bukan file video besar) ===== */
  const unduhThumbs = (r: MicrostockCsvRecord) => {
    if (!r.kode) return;
    // Pakai rasio AKTUAL dari nama file ekspor (…-1080x1920.mp4) agar
    // thumbnail tidak letterboxed salah.
    const m = /(\d{3,4})x(\d{3,4})/.exec(r.filename);
    const vw = m ? Number(m[1]) : 1920;
    const vh = m ? Number(m[2]) : 1080;
    const ar = vw / vh;
    const rasioId: RasioKanvas = Math.abs(ar - 9 / 16) < 0.1 ? "9:16" : Math.abs(ar - 1) < 0.08 ? "1:1" : "16:9";
    const def = drawCodeToDefinition(r.kode, { rasio: rasioId, durasi: 5, fps: 30, nama: r.filename });
    if (def instanceof Error) return;
    const dims = dimsRasio(rasioId);
    const w = rasioId === "9:16" ? 540 : 720;
    const h = Math.round((w * dims.h) / dims.w);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const ts = [0.15, 0.3, 0.45, 0.6, 0.75];
    ts.forEach((frak, i) => {
      renderFrame(ctx, def, frak * 5);
      const url = c.toDataURL("image/jpeg", 0.82);
      unduhBlob(dataUrlToBlob(url), `thumb-${i + 1}-${r.filename.replace(/\.[^.]+$/, "")}.jpg`);
    });
    setThumbMsg("5 thumbnail JPG diunduh — lampirkan ke AI bersama prompt-nya");
    window.setTimeout(() => setThumbMsg(null), 3500);
  };

  /* ===== Terapkan JSON hasil AI ===== */
  const terapkan = (r: MicrostockCsvRecord, index: number) => {
    setPasteErr(null);
    const hasil = validateMicrostockJson(pasteText);
    if (!hasil.asset) {
      setPasteErr(hasil.errors[0]?.message ?? "JSON tidak terbaca.");
      return;
    }
    const cr = hasil.asset.microstock_metadata.csv_record;
    updateBatchCsv(index, {
      title: cr.title,
      description: cr.description,
      keywords: cr.keywords,
      category: cr.category,
    });
    setPasteText("");
  };

  const salinPrompt = async (r: MicrostockCsvRecord) => {
    const ok = await copyText(buildMicrostockEnrichPrompt(r));
    setSalinOk(ok);
    window.setTimeout(() => setSalinOk(false), 1500);
  };

  return (
    <div className="space-y-3">
      {/* ===== Bar output: metadata.csv ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3">
        <BarChart3 className="h-4 w-4 text-secondary" />
        <p className="text-xs font-semibold text-secondary">Output: metadata.csv</p>
        <span className="rounded border border-edge bg-well px-1.5 py-0.5 font-mono text-[9px] text-muted">
          Filename,Title,Description,Keywords,Category
        </span>
        <span className="font-mono text-[10px] text-ink-dim">{rows.length} baris · {jumlahOk} ✅</span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={unduh}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-1.5 text-[11px] font-bold text-deep shadow disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Unduh metadata.csv
          </button>
          <button
            onClick={resetBatchCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-edge bg-well px-2.5 py-1.5 text-[10px] font-semibold text-muted hover:text-error disabled:opacity-50"
            title="Hapus semua baris"
          >
            <Trash2 className="inline h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-dim">
        Setiap video yang diekspor <strong>otomatis menambah baris</strong> di sini (nama file, resolusi, warna &amp; pola gerak
        dibaca dari kode animasi — file videonya tidak diunggah ke mana-mana). Review, edit kalau perlu, lalu unduh. Kalau mau
        kualitas 50 keyword premium, buka baris → <strong>Perkaya via AI</strong>.
      </p>

      {/* ===== Daftar baris ===== */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge bg-panel p-10 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm text-ink-dim">Belum ada baris. Ekspor video di tab Render Video — baris muncul otomatis.</p>
          <button onClick={tambahManual} className="mt-3 rounded-lg border border-edge bg-well px-3 py-1.5 text-[11px] font-semibold text-ink-dim hover:text-ink">
            <Plus className="mr-1 inline h-3 w-3" /> Atau tambah baris manual
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const masalah = lintRow(r);
            const terbuka = openRow === r.filename;
            return (
              <div key={`${r.filename}-${i}`} className="rounded-xl border border-edge bg-panel">
                {/* Header baris */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button onClick={() => setOpenRow(terbuka ? null : r.filename)} className="shrink-0 text-muted hover:text-ink" title={terbuka ? "Tutup" : "Edit & perkaya"}>
                    {terbuka ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className={`shrink-0 ${masalah.length === 0 ? "text-tertiary" : "text-amber-400"}`} title={masalah.join("\n")}>
                    {masalah.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{r.filename}</span>
                  <span className="hidden min-w-0 flex-[2] truncate text-[11px] text-ink-dim sm:block">{r.title}</span>
                  {masalah.length > 0 && (
                    <span className="hidden max-w-40 truncate font-mono text-[9px] text-amber-400 md:block">{masalah[0]}</span>
                  )}
                  <button
                    onClick={() => hapusBatchCsv(i)}
                    className="shrink-0 rounded-md border border-edge bg-well p-1 text-muted hover:text-error"
                    title="Hapus baris"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Detail edit + perkaya */}
                {terbuka && (
                  <div className="space-y-2 border-t border-edge px-3 py-3">
                    {/* filename + kategori */}
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={r.filename}
                        onChange={(e) => updateBatchCsv(i, { filename: e.target.value })}
                        className="min-w-52 flex-1 rounded-md border border-edge bg-well px-2 py-1 font-mono text-[10px] text-ink focus:border-tertiary focus:outline-none"
                        placeholder="nama-file.mp4"
                        spellCheck={false}
                      />
                      <select
                        value={r.category}
                        onChange={(e) => updateBatchCsv(i, { category: e.target.value })}
                        className="rounded-md border border-edge bg-well px-2 py-1 font-mono text-[10px] text-ink-dim"
                      >
                        {[...new Set([...MIKRO_KATEGORI, r.category].filter(Boolean))].map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                    {/* title */}
                    <input
                      value={r.title}
                      onChange={(e) => updateBatchCsv(i, { title: e.target.value })}
                      className="w-full rounded-md border border-edge bg-well px-2 py-1 text-[11px] text-ink focus:border-tertiary focus:outline-none"
                      placeholder="SEO title 60–90 char"
                    />
                    {/* description */}
                    <textarea
                      value={r.description}
                      onChange={(e) => updateBatchCsv(i, { description: e.target.value })}
                      rows={2}
                      className="w-full resize-none rounded-md border border-edge bg-well px-2 py-1 text-[11px] text-ink-dim focus:border-tertiary focus:outline-none"
                      placeholder="Description 100–160 char"
                    />
                    {/* keywords */}
                    <textarea
                      value={r.keywords}
                      onChange={(e) => updateBatchCsv(i, { keywords: e.target.value })}
                      rows={3}
                      className="w-full resize-none rounded-md border border-edge bg-well px-2 py-1 font-mono text-[9.5px] leading-relaxed text-ink-dim focus:border-tertiary focus:outline-none"
                      placeholder="50 keywords dipisah koma"
                    />

                    {/* Peringatan lint */}
                    {masalah.length > 0 && (
                      <ul className="list-disc space-y-0.5 rounded-md border border-amber-400/30 bg-amber-400/5 p-2 pl-6 text-[9px] text-amber-100/90">
                        {masalah.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    )}

                    {/* ===== Perkaya via AI ===== */}
                    <div className="rounded-lg border border-tertiary/30 bg-tertiary/5 p-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold text-tertiary">
                        <Sparkles className="h-3 w-3" /> Perkaya via AI {r.kode ? "" : "(baris manual — tanpa kode draw)"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => void salinPrompt(r)}
                          className="flex items-center gap-1 rounded-md bg-tertiary/15 px-2.5 py-1.5 text-[10px] font-semibold text-tertiary hover:bg-tertiary/25"
                        >
                          {salinOk ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Salin Prompt AI (kode + metadata)
                        </button>
                        {r.kode && (
                          <button
                            onClick={() => unduhThumbs(r)}
                            className="flex items-center gap-1 rounded-md bg-tertiary/15 px-2.5 py-1.5 text-[10px] font-semibold text-tertiary hover:bg-tertiary/25"
                          >
                            <ImageDown className="h-3 w-3" /> Unduh 5 Frame (JPG kecil)
                          </button>
                        )}
                      </div>
                      {thumbMsg && <p className="mt-1.5 text-[9px] text-tertiary">{thumbMsg}</p>}
                      {/* tempel balik */}
                      <div className="mt-2 flex gap-1.5">
                        <textarea
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          rows={3}
                          spellCheck={false}
                          className="w-full resize-none rounded-md border border-edge bg-well px-2 py-1 font-mono text-[9px] text-ink-dim focus:border-tertiary focus:outline-none"
                          placeholder='Tempel JSON hasil AI di sini (blok ```json``` juga boleh langsung)…'
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => terapkan(r, i)}
                          disabled={!pasteText.trim()}
                          className="rounded-md bg-panel-high px-3 py-1.5 text-[10px] font-semibold text-ink hover:bg-bright disabled:opacity-50"
                        >
                          Terapkan & Validasi
                        </button>
                        {pasteText && (
                          <button onClick={() => { setPasteText(""); setPasteErr(null); }} className="text-muted hover:text-ink">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {pasteErr && <span className="text-[9px] text-error">{pasteErr}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={tambahManual}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge bg-panel py-3 text-[11px] font-semibold text-muted hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah baris manual
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== Util kecil: dataURL → Blob (unduh jpg) ===== */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
