import { useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  ClipboardPaste,
  CheckCircle2,
  XCircle,
  Hammer,
  ArrowUpRight,
} from "lucide-react";
import Modal from "./Modal";
import {
  KATEGORI,
  GAYA,
  TEMAS,
  defaultBrief,
  buildSvgPrompt,
  buildSvgRepairPrompt,
  copyText,
  type Brief,
} from "../engine/brief";
import { prepareImageAssets, svgToMotionDefinition } from "../engine/svg";
import type { MotionDefinition } from "../engine/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (def: MotionDefinition) => void;
}

/** Ambil isi blok ```svg``` pertama; kalau tidak ada penanda, pakai teks mentah. */
export function extractSvg(paste: string): string {
  const match = paste.match(/```(?:svg|xml)?\s*?\n?([\s\S]*?)```/);
  const raw = match ? match[1] : paste;
  const svg = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return (svg ? svg[0] : raw).trim();
}

export default function SvgAiModal({ open, onClose, onApply }: Props) {
  const [brief, setBrief] = useState<Brief>(defaultBrief);
  const [paste, setPaste] = useState("");
  const [lastSvg, setLastSvg] = useState("");
  const [percobaan, setPercobaan] = useState(0);
  const [pesan, setPesan] = useState("");
  const [ok, setOk] = useState<null | boolean>(null);
  const [handoff, setHandoff] = useState<"Gemini" | "ChatGPT" | "Claude" | null>(null);

  const prompt = useMemo(() => buildSvgPrompt(brief), [brief]);

  const setB = <K extends keyof Brief>(k: K, v: Brief[K]) =>
    setBrief((b) => ({ ...b, [k]: v }));

  const salinPrompt = async () => {
    const sudah = await copyText(prompt);
    setPesan(sudah ? "Prompt SVG disalin — tempel di layanan AI pilihanmu." : "Gagal salin — blok teks prompt & Ctrl+C manual.");
    setOk(sudah);
  };

  const bukaAi = async (nama: "Gemini" | "ChatGPT" | "Claude", url: string) => {
    const sudah = await copyText(prompt);
    setHandoff(nama);
    window.open(url, "_blank", "noopener,noreferrer");
    setPesan(sudah ? `${nama} dibuka — tempel prompt, kirim, salin blok svg hasilnya.` : `${nama} dibuka — salin prompt manual bila clipboard gagal.`);
    setOk(sudah);
  };

  const salinPerapi = async () => {
    const rp = buildSvgRepairPrompt(lastSvg, [pesan || "SVG ditolak validator"], Math.max(1, percobaan));
    const sudah = await copyText(rp);
    setPesan(sudah ? "Prompt perbaikan disalin — tempel balik ke layanan AI." : "Gagal salin prompt perbaikan.");
    setOk(sudah);
  };

  const validasiDanMuat = async () => {
    const code = extractSvg(paste);
    if (!/<svg[\s>]/i.test(code)) {
      setLastSvg("");
      setOk(false);
      setPesan("Tidak ada markup SVG di kotak tempel — salin blok ```svg``` dari jawaban AI.");
      setPercobaan((p) => Math.min(3, p + 1));
      return;
    }
    setLastSvg(code);
    try {
      const nama = `${brief.ide.trim().slice(0, 32) || "SVG AI"}`;
      const imported = svgToMotionDefinition(`${nama}.svg`, code);
      await prepareImageAssets(imported);
      onApply(imported);
      setOk(true);
      setPercobaan(0);
      setPesan(`Karya dimuat: ${imported.layers.length} layer — atur gerak tiap layer di panel SVG Motion.`);
    } catch (error) {
      setOk(false);
      setPercobaan((p) => Math.min(3, p + 1));
      setPesan((error as Error).message);
    }
  };

  return (
    <Modal open={open} wide title="SVG dari AI — prompt builder" onClose={onClose}>
      <p className="text-xs text-ink-dim">
        Isi brief, salin prompt, kirim ke AI (Gemini/ChatGPT/Claude), lalu tempel balik blok
        <span className="font-mono"> ```svg``` </span>
        jawaban AI di bawah. Hasilnya dipecah menjadi layer animasi yang siap diatur di panel SVG Motion. 100% lokal — tak ada data yang dikirim ke mana pun.
      </p>

      {/* BRIEF */}
      <div className="rounded-lg border border-edge bg-well p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">1 · brief</p>
        <select
          value=""
          onChange={(e) => {
            const t = TEMAS.find((x) => x.label === e.target.value);
            if (!t) return;
            setBrief((b) => ({ ...b, ide: t.ide, kategori: t.kategori, gaya: t.gaya }));
          }}
          className="mt-2 w-full rounded-md border border-edge bg-panel-low px-1.5 py-1.5 text-[10px] text-ink-dim"
        >
          <option value="">⚡ Tema siap pakai… ({TEMAS.length} tema)</option>
          {TEMAS.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
        <input
          value={brief.ide}
          onChange={(e) => setB("ide", e.target.value)}
          placeholder="Ide karya SVG…"
          maxLength={160}
          className="mt-2 w-full rounded-md border border-edge bg-panel-low px-2 py-1.5 text-[11px] placeholder:text-muted/60 focus:border-accent focus:outline-none"
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <select
            value={brief.kategori}
            onChange={(e) => setB("kategori", e.target.value)}
            className="rounded-md border border-edge bg-panel-low px-1.5 py-1.5"
          >
            {KATEGORI.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            value={brief.gaya}
            onChange={(e) => setB("gaya", e.target.value)}
            className="rounded-md border border-edge bg-panel-low px-1.5 py-1.5"
          >
            {GAYA.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-md border border-edge bg-panel-low px-1.5 py-1">
            <input
              type="color"
              value={brief.warnaUtama}
              onChange={(e) => setB("warnaUtama", e.target.value)}
              className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Warna utama"
            />
            <span className="text-[9px] text-muted">utama</span>
          </label>
          <label className="flex items-center gap-1.5 rounded-md border border-edge bg-panel-low px-1.5 py-1">
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
            className="mt-1.5 w-full rounded-md border border-edge bg-panel-low p-2 font-mono text-[9px] leading-relaxed text-ink-dim"
          />
        </details>

        <button
          onClick={salinPrompt}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-[11px] font-semibold text-deep shadow"
        >
          <Copy className="h-3.5 w-3.5" /> Salin Prompt SVG
        </button>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button
            onClick={() => bukaAi("Gemini", "https://gemini.google.com/app")}
            className="flex items-center justify-center gap-1 rounded-lg border border-secondary/40 bg-secondary/10 px-2 py-2 text-[10px] font-semibold text-secondary hover:bg-secondary/20"
          >
            Gemini <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={() => bukaAi("ChatGPT", "https://chatgpt.com/")}
            className="flex items-center justify-center gap-1 rounded-lg border border-edge bg-panel-high px-2 py-2 text-[10px] font-semibold text-ink-dim hover:text-ink"
          >
            ChatGPT <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={() => bukaAi("Claude", "https://claude.ai/new")}
            className="flex items-center justify-center gap-1 rounded-lg border border-edge bg-panel-high px-2 py-2 text-[10px] font-semibold text-ink-dim hover:text-ink"
          >
            Claude <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-muted">
          Artboard fix 1920×1080 (16:9). Animasi masuk/loop ditambahkan aplikasi setelah muat — fokus AI hanya komposisi.
        </p>
      </div>

      {handoff && (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-2.5 text-[10px] text-secondary">
          <div className="flex items-center gap-1.5 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> {handoff} sudah dibuka
          </div>
        </div>
      )}

      {/* PASTE */}
      <div className="rounded-lg border border-edge bg-well p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted">2 · tempel jawaban AI</p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={7}
          placeholder={"Tempel blok ```svg``` dari jawaban AI…\n(atau markup SVG apa pun)"}
          className="mt-2 w-full resize-y rounded-md border border-edge bg-panel-low p-2 font-mono text-[10px] leading-relaxed placeholder:text-muted/50 focus:border-secondary focus:outline-none"
        />
        <button
          onClick={() => void validasiDanMuat()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-panel-high px-3 py-2 text-[11px] font-semibold text-ink hover:bg-bright"
        >
          <ClipboardPaste className="h-3.5 w-3.5 text-secondary" /> Validasi &amp; Muat Jadi Layer
        </button>
        {ok === true && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-tertiary/10 px-2.5 py-2 text-[10px] text-tertiary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valid.
          </div>
        )}
        {ok === false && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-error">
              <XCircle className="h-3.5 w-3.5" /> <span className="font-mono">{pesan}</span>
            </div>
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
                Percobaan habis — ubah brief atau tulis ulang prompt utama. Alternatif: simpan file .svg lalu pakai tombol SVG Motion.
              </p>
            )}
          </div>
        )}
        {ok === null && pesan && <p role="status" className="mt-2 text-[10px] text-muted">{pesan}</p>}
      </div>
    </Modal>
  );
}
