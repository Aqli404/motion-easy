import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Copy,
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  Trash2,
  Hammer,
  ExternalLink,
} from "lucide-react";
import {
  KATEGORI,
  GAYA,
  TEMAS,
  defaultBrief,
  buildPrompt,
  buildRepairPrompt,
  copyText,
  type Brief,
} from "../engine/brief";
import { extractJson, validateDefinition, type Issue } from "../engine/validator";
import type { MotionDefinition } from "../engine/schema";

interface Props {
  def: MotionDefinition; // definisi aktif (sample atau custom)
  adalahKustom: boolean;
  onApplyDef: (d: MotionDefinition | null) => void; // null = kembali ke sample
}

type LogEntry = { time: string; msg: string; warna: "dim" | "ok" | "err" | "info" };

const warnaLog: Record<LogEntry["warna"], string> = {
  dim: "text-muted",
  ok: "text-tertiary",
  err: "text-error",
  info: "text-secondary",
};

const potong = (_level: Issue["level"], pesan: string) =>
  pesan.length <= 90 ? pesan : pesan.slice(0, 88) + "…";

export default function AiPanel({ def, adalahKustom, onApplyDef }: Props) {
  const [brief, setBrief] = useState<Brief>(defaultBrief);
  const [paste, setPaste] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [validBenerm, setValidBenerm] = useState<null | { ok: boolean }>(null);
  const [percobaan, setPercobaan] = useState(0);
  const [lastJson, setLastJson] = useState<string>("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);

  const prompt = useMemo(() => buildPrompt(brief), [brief]);
  const durasi = def.canvas.durationSec;

  const tulisLog = (msg: string, warna: LogEntry["warna"] = "dim") => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    setLog((l) => [...l.slice(-40), { time, msg, warna }]);
  };

  const salinPrompt = async () => {
    const ok = await copyText(prompt);
    tulisLog(
      ok ? `prompt disalin ke clipboard (${prompt.length.toLocaleString("id-ID")} karakter)` : "gagal salin — coba blok & Ctrl+C manual",
      ok ? "ok" : "err",
    );
  };

  const bukaAi = async (nama: "Gemini" | "ChatGPT" | "Claude", url: string) => {
    const ok = await copyText(prompt);
    window.open(url, "_blank", "noopener,noreferrer");
    tulisLog(
      ok
        ? `prompt disalin — ${nama} dibuka di tab baru, tempel prompt lalu bawa JSON kembali`
        : `${nama} dibuka — salin prompt manual jika clipboard tidak tersedia`,
      ok ? "info" : "err",
    );
  };

  const salinPerapi = async () => {
    const pesan = issues.filter((i) => i.level === "error").map((i) => `${i.path}: ${i.message}`);
    const rp = buildRepairPrompt(lastJson, pesan, percobaan, brief.maxLayer);
    const ok = await copyText(rp);
    tulisLog(ok ? "prompt perbaikan disalin — tempel balik jawaban AI ke kotak paste" : "gagal salin prompt perbaikan", ok ? "info" : "err");
  };

  const validasiDanPreview = () => {
    const extracted = extractJson(paste);
    setLastJson(paste.trim());
    if (extracted.error) {
      setIssues([{ path: "input", message: extracted.error, level: "error" }]);
      setValidBenerm({ ok: false });
      setPercobaan((p) => Math.min(3, p + 1));
      tulisLog(extracted.error, "err");
      return;
    }
    const hasil = validateDefinition(extracted.json);
    const errs = hasil.errors.filter((i) => i.level === "error");
    setIssues([...hasil.errors]);

    if (hasil.def && errs.length === 0) {
      setValidBenerm({ ok: true });
      setPercobaan(0);
      onApplyDef(hasil.def);
      tulisLog(`animasi diterapkan: "${hasil.def.name}" — ${hasil.def.layers.length} layer, ${hasil.def.canvas.durationSec} dtk. Tekan ▶`, "ok");
      for (const w of hasil.warnings.slice(0, 3)) tulisLog(`catatan: ${potong("warning", w.message)}`, "dim");
    } else {
      setValidBenerm({ ok: false });
      onApplyDef(null);
      setPercobaan((p) => Math.min(3, p + 1));
      tulisLog(`ditolak validator — ${errs.length} kesalahan. Pakai prompt perbaikan (inisiatif ${percobaan + 1}/3).`, "err");
    }
  };

  const backToSample = () => {
    onApplyDef(null);
    setIssues([]);
    setValidBenerm(null);
    tulisLog("kembali ke sample bawaan", "dim");
  };

  const setB = <K extends keyof Brief>(k: K, v: Brief[K]) =>
    setBrief((b) => ({ ...b, [k]: v }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Alur AI</span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted">
          BYO-AI · Rp 0
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* ===== LANGKAH 1: BRIEF ===== */}
        <div className="rounded-lg border border-edge bg-panel p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
            1 · brief
          </p>
          <select
            value=""
            onChange={(e) => {
              const t = TEMAS.find((x) => x.label === e.target.value);
              if (!t) return;
              setBrief((b) => ({ ...b, ide: t.ide, kategori: t.kategori, gaya: t.gaya }));
              tulisLog(`tema "${t.label}" dimuat — ide/kategori/gaya terisi, bebas edit`, "info");
            }}
            className="mt-2 w-full rounded-md border border-edge bg-well px-1.5 py-1.5 text-[10px] text-ink-dim"
          >
            <option value="">⚡ Tema siap pakai… ({TEMAS.length} tema)</option>
            {TEMAS.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
          <input
            value={brief.ide}
            onChange={(e) => setB("ide", e.target.value)}
            placeholder="Ide animasi…"
            maxLength={160}
            className="mt-2 w-full rounded-md border border-edge bg-well px-2 py-1.5 text-[11px] placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
            <select
              value={brief.kategori}
              onChange={(e) => setB("kategori", e.target.value)}
              className="rounded-md border border-edge bg-well px-1.5 py-1.5"
            >
              {KATEGORI.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <select
              value={brief.gaya}
              onChange={(e) => setB("gaya", e.target.value)}
              className="rounded-md border border-edge bg-well px-1.5 py-1.5"
            >
              {GAYA.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={brief.durasi}
              onChange={(e) => setB("durasi", Number(e.target.value))}
              className="rounded-md border border-edge bg-well px-1.5 py-1.5"
            >
              {[5, 8, 10, 15, 20, 30, 60].map((d) => (
                <option key={d} value={d}>{d} detik</option>
              ))}
            </select>
            <select
              value={brief.fps}
              onChange={(e) => setB("fps", Number(e.target.value) as 24 | 30 | 60)}
              className="rounded-md border border-edge bg-well px-1.5 py-1.5"
            >
              {[24, 30, 60].map((f) => (
                <option key={f} value={f}>{f} fps</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 rounded-md border border-edge bg-well px-1.5 py-1">
              <input
                type="color"
                value={brief.warnaUtama}
                onChange={(e) => setB("warnaUtama", e.target.value)}
                className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Warna utama"
              />
              <span className="text-[9px] text-muted">utama</span>
            </label>
            <label className="flex items-center gap-1.5 rounded-md border border-edge bg-well px-1.5 py-1">
              <input
                type="color"
                value={brief.warnaAksen}
                onChange={(e) => setB("warnaAksen", e.target.value)}
                className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Warna aksen"
              />
              <span className="text-[9px] text-muted">aksen</span>
            </label>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-muted hover:text-ink-dim">
              pratinjau prompt ({prompt.length.toLocaleString("id-ID")} karakter)
            </summary>
            <textarea
              readOnly
              value={prompt}
              rows={8}
              className="mt-1.5 w-full rounded-md border border-edge bg-well p-2 font-mono text-[9px] leading-relaxed text-ink-dim"
            />
          </details>

          <button
            onClick={salinPrompt}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-[11px] font-semibold text-deep shadow"
          >
            <Copy className="h-3.5 w-3.5" /> Salin Prompt
          </button>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => bukaAi("Gemini", "https://gemini.google.com/app")}
              className="flex items-center justify-center gap-1 rounded-lg border border-secondary/40 bg-secondary/10 px-2 py-2 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
              title="Salin prompt lalu buka Gemini"
            >
              Gemini <ExternalLink className="h-3 w-3" />
            </button>
            <button
              onClick={() => bukaAi("ChatGPT", "https://chatgpt.com/")}
              className="flex items-center justify-center gap-1 rounded-lg border border-edge bg-panel-low px-2 py-2 text-[10px] font-semibold text-ink-dim hover:bg-panel-high hover:text-ink"
              title="Salin prompt lalu buka ChatGPT"
            >
              ChatGPT <ExternalLink className="h-3 w-3" />
            </button>
            <button
              onClick={() => bukaAi("Claude", "https://claude.ai/new")}
              className="flex items-center justify-center gap-1 rounded-lg border border-edge bg-panel-low px-2 py-2 text-[10px] font-semibold text-ink-dim hover:bg-panel-high hover:text-ink"
              title="Salin prompt lalu buka Claude"
            >
              Claude <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-muted">
            Tombol AI menyalin prompt otomatis lalu membuka layanan pilihanmu di tab baru.
            Tempel prompt di sana, salin JSON, lalu kembali ke langkah 2.
          </p>
        </div>

        {/* ===== LANGKAH 2: PASTE ===== */}
        <div className="rounded-lg border border-edge bg-panel p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
            2 · tempel {adalahKustom ? "(custom aktif)" : "(sample)"}
          </p>
          <textarea
            ref={pasteRef}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`Tempel jawaban AI di sini… (blok \`\`\`json) \natau tempel JSON apa pun`}
            rows={5}
            className="mt-2 w-full resize-y rounded-md border border-edge bg-well p-2 font-mono text-[10px] leading-relaxed placeholder:text-muted/50 focus:border-secondary focus:outline-none"
          />
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={validasiDanPreview}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-panel-high px-3 py-2 text-[11px] font-semibold text-ink hover:bg-bright"
            >
              <ClipboardPaste className="h-3.5 w-3.5 text-secondary" /> Validasi &amp; Preview
            </button>
            {adalahKustom && (
              <button
                onClick={backToSample}
                title="Kembali ke sample bawaan"
                className="rounded-lg border border-edge px-2.5 py-2 text-[11px] text-ink-dim hover:text-ink"
              >
                Sample
              </button>
            )}
          </div>

          {validBenerm?.ok && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-tertiary/10 px-2.5 py-2 text-[10px] text-tertiary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid &amp; sudah diterapkan ke viewport.
            </div>
          )}
          {validBenerm?.ok === false && issues.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-error">
                <XCircle className="h-3.5 w-3.5" /> {issues.filter((i) => i.level === "error").length} kesalahan.
              </div>
              <ul className="max-h-28 space-y-1 overflow-y-auto rounded-lg bg-error/10 p-2 font-mono text-[9px] leading-relaxed text-error">
                {issues.slice(0, 8).map((i, idx) => (
                  <li key={idx}>
                    <span className="opacity-60">{i.path}:</span> {potong(i.level, i.message)}
                  </li>
                ))}
              </ul>
              {percobaan < 3 && (
                <button
                  onClick={salinPerapi}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/20"
                >
                  <Hammer className="h-3.5 w-3.5" /> Salin Prompt Perbaikan ({percobaan}/3)
                </button>
              )}
              {percobaan >= 3 && (
                <p className="font-mono text-[9px] text-muted">
                  Jumlah percobaan habis — coba ubah brief atau tulis ulang prompt utama.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ===== LOG ===== */}
        <div className="rounded-lg border border-edge bg-panel p-2.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">log aktivitas</p>
            <button
              onClick={() => setLog([])}
              className="text-muted hover:text-ink"
              title="Bersihkan log"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto font-mono text-[9px] leading-relaxed">
            {log.length === 0 ? (
              <li className="text-muted">masih kosong — mulai dari brief di atas</li>
            ) : (
              log.map((l, i) => (
                <li key={i} className={warnaLog[l.warna]}>
                  <span className="opacity-50">{l.time}</span> {l.msg}
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="font-mono text-[9px] leading-relaxed text-muted">
          durasi aktif: {durasi} dtk · render lokal, tak ada data yang dikirim ke mana pun.
        </p>
      </div>
    </div>
  );
}
