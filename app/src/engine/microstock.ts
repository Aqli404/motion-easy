/**
 * engine/microstock.ts — Microstock Video Director & Commercial Asset Engine.
 *
 * Mengubah ide mentah user (Indonesia/Inggris, bisa mengandung nama brand)
 * menjadi paket aset komersial siap jual:
 *
 * 1. IP & Trademark Guard — deteksi & sanitasi nama merek → istilah generik
 *    fungsional (dilakukan LOKAL lebih dulu, sebelum prompt meninggalkan browser).
 * 2. Metadata multi-agen (Adobe Stock, Shutterstock, Pond5, Envato):
 *    SEO Title 60–90 karakter, Description 100–160, tepat 50 keyword Inggris.
 * 3. Preview marketplace — harga simulasi $49–79 + badge teknis.
 * 4. Rekaman CSV siap upload bulk (ikut terbundkus di Bulk ZIP sebagai metadata.csv).
 *
 * Arsitektur sama dengan brief.ts (BYO-AI): engine membangun prompt untuk AI
 * eksternal milik user, lalu MEMVALIDASI & MENORMALISASI JSON yang kembali —
 * aturan di file ini adalah satu-satunya sumber kebenaran.
 */

import { extractJson, type Issue } from "./validator";

/* ================================================================== */
/* 1. PROTOKOL IP & TRADEMARK GUARD                                     */
/* ================================================================== */

export interface IpRule {
  label: string;
  pattern: RegExp;
  replacement: string;
}

/**
 * Daftar larangan komersial. Dipakai dua arah:
 * - sanitizeIdea(): membersihkan brief SEBELUM dikirim ke AI eksternal.
 * - validateMicrostockJson(): memindai hasil AI (judul/deskripsi/keyword).
 */
export const IP_RULES: IpRule[] = [
  { label: "Apple", pattern: /\bapples?\b/gi, replacement: "major tech manufacturer" },
  { label: "iPhone", pattern: /\biphones?\b/gi, replacement: "modern frameless smartphone mockup" },
  { label: "iOS", pattern: /\bios\b/gi, replacement: "mobile operating system" },
  { label: "iPad", pattern: /\bipads?\b/gi, replacement: "modern tablet mockup" },
  { label: "MacBook", pattern: /\bmacbooks?\b/gi, replacement: "slim laptop mockup" },
  { label: "Android", pattern: /\bandroids?\b/gi, replacement: "smartphone interface mockup" },
  { label: "Windows", pattern: /\bwindows\s*(?:os|10|11)?\b/gi, replacement: "desktop operating system" },
  { label: "Google", pattern: /\bgoogle\b/gi, replacement: "major tech platform" },
  { label: "Tesla", pattern: /\btesla\b/gi, replacement: "futuristic electric vehicle" },
  { label: "Nike", pattern: /\bnike\b/gi, replacement: "athletic sportswear brand" },
  { label: "Adidas", pattern: /\badidas\b/gi, replacement: "sportswear brand" },
  { label: "Lego", pattern: /\blego\b/gi, replacement: "interlocking building blocks" },
  { label: "Sony", pattern: /\bsony\b/gi, replacement: "electronics manufacturer" },
  { label: "PlayStation", pattern: /\bplaystations?\b|\bps[45]\b/gi, replacement: "modern gaming console" },
  { label: "Xbox", pattern: /\bxbox\b/gi, replacement: "modern gaming console" },
  { label: "Nintendo", pattern: /\bnintendo\b/gi, replacement: "handheld gaming console" },
  { label: "Gamepad", pattern: /\bdual[\s-]?sense\b/gi, replacement: "wireless game controller" },
  { label: "Instagram", pattern: /\binstagrams?\b|\big\s+reels?\b/gi, replacement: "vertical social media video feed" },
  { label: "TikTok", pattern: /\btik[\s-]?toks?\b/gi, replacement: "short-form vertical video app" },
  { label: "YouTube", pattern: /\byou[\s-]?tubes?\b/gi, replacement: "video sharing platform" },
  { label: "WhatsApp", pattern: /\bwhats[\s-]?apps?\b/gi, replacement: "mobile messaging app" },
  { label: "Twitter / X", pattern: /\btwitter\b/gi, replacement: "microblogging social app" },
  { label: "Facebook", pattern: /\bfacebooks?\b/gi, replacement: "social network platform" },
  { label: "Netflix", pattern: /\bnetflix\b/gi, replacement: "streaming video service" },
  { label: "Disney", pattern: /\bdisney\b|\bmickey\b/gi, replacement: "family entertainment brand" },
  { label: "Cyberpunk", pattern: /\bcyberpunks?\b/gi, replacement: "futuristic sci-fi neon dystopian" },
  { label: "McDonald's", pattern: /\bmc[\s-]?donalds?\b/gi, replacement: "fast food restaurant chain" },
  { label: "Samsung", pattern: /\bsamsung\b|\bgalaxy\s*(?:s|note|z)?\d*\b/gi, replacement: "flagship smartphone brand" },
  { label: "Coca-Cola", pattern: /\bco[\s-]?ca[\s-]?cola\b|\bpepsi\b/gi, replacement: "carbonated soft drink" },
  { label: "Ferrari", pattern: /\bferrari\b|\blamborghini\b|\bporsche\b/gi, replacement: "luxury sports car" },
  { label: "Shopee", pattern: /\bshopee\b/gi, replacement: "online marketplace ecommerce cart" },
  { label: "Tokopedia", pattern: /\btokopedia\b/gi, replacement: "online marketplace ecommerce cart" },
  { label: "Marvel", pattern: /\bmarvel\b|\bspider[\s-]?man\b|\bavengers?\b/gi, replacement: "superhero comic character" },
  { label: "Star Wars", pattern: /\bstar\s*wars\b|\bluke\s+skywalker\b/gi, replacement: "space opera franchise character" },
  { label: "Harry Potter", pattern: /\bharry\s+potter\b|\bhogwarts\b/gi, replacement: "wizard school fantasy" },
  { label: "Pokémon", pattern: /\bpok[eé]mon\b|\bpikachu\b/gi, replacement: "cartoon monster creature" },
];

export interface SanitizeResult {
  text: string;
  changes: { original: string; replacement: string }[];
}

/** Ganti semua kecocokan IP blocklist dalam teks; kembalikan daftar perubahan unik. */
export function sanitizeIdea(text: string): SanitizeResult {
  let out = text;
  const changes: { original: string; replacement: string }[] = [];
  const seen = new Set<string>();
  for (const rule of IP_RULES) {
    rule.pattern.lastIndex = 0;
    const cocok = out.match(rule.pattern);
    if (!cocok) continue;
    rule.pattern.lastIndex = 0;
    out = out.replace(rule.pattern, rule.replacement);
    for (const m of cocok) {
      const key = `${m.toLowerCase()}→${rule.replacement}`;
      if (!seen.has(key)) {
        seen.add(key);
        changes.push({ original: m.trim(), replacement: rule.replacement });
      }
    }
  }
  return { text: out, changes };
}

/** Pindai teks (judul/deskripsi/keyword) terhadap blocklist. */
export function scanIp(text: string): { original: string; replacement: string }[] {
  const found: { original: string; replacement: string }[] = [];
  const seen = new Set<string>();
  for (const rule of IP_RULES) {
    rule.pattern.lastIndex = 0;
    const cocok = text.match(rule.pattern);
    if (!cocok) continue;
    for (const m of cocok) {
      const key = m.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push({ original: m.trim(), replacement: rule.replacement });
      }
    }
  }
  return found;
}

/* ================================================================== */
/* 2. BRIEF & PROMPT BUILDER (BYO-AI)                                   */
/* ================================================================== */

export const MIKRO_KATEGORI = ["Technology", "Abstract", "Business", "Holiday", "Finance"] as const;
export type MikroKategori = (typeof MIKRO_KATEGORI)[number];

export interface MicrostockBrief {
  ide: string;
  kategori: MikroKategori;
  rasio: "16:9" | "9:16" | "1:1";
  durasi: number;
  fps: 30 | 60;
  alpha: boolean;
}

export function defaultMicrostockBrief(): MicrostockBrief {
  return {
    ide: "",
    kategori: "Technology",
    rasio: "16:9",
    durasi: 6,
    fps: 30,
    alpha: true,
  };
}

const MIKRO_RASIO: Record<MicrostockBrief["rasio"], { w: number; h: number }> = {
  "16:9": { w: 3840, h: 2160 },
  "9:16": { w: 2160, h: 3840 },
  "1:1": { w: 2160, h: 2160 },
};

/** Bangun prompt lengkap untuk AI eksternal. Ide disanitasi LOKAL dulu. */
export function buildMicrostockPrompt(b: MicrostockBrief): string {
  const { text: ideAman, changes } = sanitizeIdea(b.ide.trim());
  const dims = MIKRO_RASIO[b.rasio];
  const ide = ideAman || "(pengguna tidak menulis ide — buat aset motion graphics komersial menarik sesuai kategori)";

  const fence = "```json";
  const schemaContoh = JSON.stringify(
    {
      ip_guard: {
        is_safe: true,
        violations_detected: 0,
        sanitized_entities: [{ original: "nama brand jika ada di ide user", replacement: "istilah generik aman komersial" }],
      },
      visual_engine: {
        title_concept: "Nama konsep visual",
        theme_category: "Technology",
        canvas_parameters: {
          palette: { primary: "#4cd7f6", secondary: "#f97316", accent: "#4edea3", background: "#000000" },
          particle_count: 80,
          speed_multiplier: 1.2,
          glow_intensity: 15,
          animation_style: "Deskripsi instruksi logika animasi untuk canvas render",
          is_alpha_ready: true,
        },
      },
      microstock_metadata: {
        agency_target: "Adobe Stock, Shutterstock, Pond5 & Envato",
        title: "SEO Commercial Title Ready for Review 4K Loop Motion Graphics",
        description: "Commercial description explaining the visual footage purpose for video editors and content creators worldwide.",
        category: "Technology",
        top_10_keywords: "keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, keyword7, keyword8, keyword9, keyword10",
        all_50_keywords: "50 kata kunci lengkap dipisah koma tanpa nomor urut",
        csv_record: {
          filename: "motion_asset_001.mp4",
          title: "SEO Commercial Title Ready for Review 4K Loop Motion Graphics",
          description: "Commercial description explaining the visual footage purpose for video editors and content creators worldwide.",
          keywords: "50 kata kunci dipisah koma",
          category: "Technology",
        },
      },
      marketplace_preview: {
        simulated_price_usd: 79,
        technical_badges: ["4K UHD", "60 FPS", "Alpha Transparent", "Seamless Loop"],
        curation_checklist: { zero_ip_violations: true, commercial_license_approved: true, fifty_keywords_fulfilled: true },
      },
    },
    null,
    2,
  );

  return [
    'ROLE: You are a world-class "Microstock Video Director & Commercial Asset Engine".',
    "Transform the CREATIVE BRIEF at the bottom into a commercial-ready motion graphics asset package, returned as ONE JSON object. Everything you output must be safe to sell on Adobe Stock, Shutterstock, Pond5 and Envato.",
    "",
    "PROTOCOL 1 — COMMERCIAL IP & TRADEMARK GUARD (MANDATORY)",
    "Never include any brand name, trademark, copyrighted character, product model, mascot, logo, song title, movie/franchise title, celebrity name, or brand location in title, description, keywords, category, or visual concept.",
    "BANNED EXAMPLES (non-exhaustive): Apple, iPhone, iPad, iOS, MacBook, Android, Windows, Google, Tesla, Nike, Adidas, Lego, Sony, PlayStation, PS5, Xbox, Nintendo, Instagram, TikTok, YouTube, WhatsApp, Twitter, X, Facebook, Netflix, Disney, Cyberpunk, McDonald's, Samsung, Galaxy, Coca-Cola, Pepsi, Ferrari, Lamborghini, Porsche, Shopee, Tokopedia, Marvel, Star Wars, Harry Potter, Pokemon.",
    "If the brief mentions any of them, silently replace with a generic functional term, e.g.:",
    '  iPhone / smartphone   -> "modern frameless smartphone mockup"',
    '  PlayStation / gamepad -> "wireless game controller"',
    '  Instagram / TikTok    -> "vertical social media video feed"',
    '  Shopee / Tokopedia    -> "online marketplace ecommerce cart"',
    '  Cyberpunk             -> "futuristic sci-fi neon dystopian"',
    "Set ip_guard.is_safe=true and list EVERY replacement in ip_guard.sanitized_entities.",
    "",
    "PROTOCOL 2 — MULTI-AGENCY METADATA STANDARD",
    "- title: English, 60-90 characters, descriptive and natural (may include technical facts like '4K Loop', 'Alpha Channel', 'Motion Graphics'). NO keyword stuffing.",
    "- description: 1-2 English sentences, 100-160 characters, explaining how a video editor or creator would use this footage.",
    "- keywords: EXACTLY 50 English keywords, comma separated. The FIRST 10 must be the highest-relevance terms (Adobe reads them first). The remaining 40: synonyms, industries, emotions, technical descriptors (4k, loop, background, alpha channel, motion graphics, abstract, glowing). No single word may repeat more than twice.",
    "- category: one of Technology | Abstract | Business | Holiday | Finance.",
    "",
    "PROTOCOL 3 — MARKETPLACE PREVIEW DATA",
    "- simulated_price_usd: realistic mid-premium price, integer between 49 and 79.",
    "- technical_badges: truthful technical badges, e.g. '4K UHD', '60 FPS', 'Alpha Transparent' or 'Black Background', 'Seamless Loop'.",
    "",
    "OUTPUT FORMAT — STRICT",
    `Return ONLY one fenced ${fence} block containing EXACTLY this schema (no markdown outside the fence, no commentary, no extra keys):`,
    "```json",
    schemaContoh,
    "```",
    "",
    "CREATIVE BRIEF:",
    `- Idea (already IP-sanitized locally): ${ide}`,
    `- Theme category: ${b.kategori}`,
    `- Canvas: ${dims.w}x${dims.h} (${b.rasio}), ${b.durasi}s, ${b.fps} fps, alpha channel: ${b.alpha ? "yes" : "no"}`,
    "- If the asset contains text, keep it short and generic (Indonesian is fine for ON-SCREEN text) — but ALL metadata (title, description, keywords) MUST be in English.",
    "",
    `Now output the ${fence} JSON block only.`,
  ].join("\n");
}

/** Prompt perbaikan (self-heal) — dipakai saat validasi microstock gagal. */
export function buildMicrostockRepairPrompt(
  originalJson: string,
  messages: string[],
  percobaan: number,
): string {
  return [
    `Paket microstock kamu DITOLAK validator (percobaan ${percobaan} dari 3). Perbaiki dengan tepat.`,
    "",
    "DAFTAR KESALAHAN:",
    ...messages.map((m, i) => `${i + 1}. ${m}`),
    "",
    "INGAT ATURAN PENTING:",
    "- tepat 50 keyword Inggris dipisah koma, tanpa repetisi kata > 2 kali",
    "- title 60-90 karakter; description 100-160 karakter; keduanya berbahasa Inggris",
    "- TANPA nama brand/trademark apa pun (Apple, TikTok, Shopee, dst) — pakai istilah generik",
    "- simulated_price_usd integer 49..79",
    "- struktur 4 bagian wajib: ip_guard, visual_engine, microstock_metadata, marketplace_preview",
    "",
    "JSON SEBELUMNYA (perbaiki bagian bermasalah, pertahankan yang sudah benar):",
    "```json",
    originalJson,
    "```",
    "",
    "Output ulang: SATU blok kode ```json``` penuh, tanpa penjelasan.",
  ].join("\n");
}

/* ================================================================== */
/* 3. TIPE HASIL                                                       */
/* ================================================================== */

export interface MicrostockPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface MicrostockAsset {
  ip_guard: {
    is_safe: boolean;
    violations_detected: number;
    sanitized_entities: { original: string; replacement: string }[];
  };
  visual_engine: {
    title_concept: string;
    theme_category: string;
    canvas_parameters: {
      palette: MicrostockPalette;
      particle_count: number;
      speed_multiplier: number;
      glow_intensity: number;
      animation_style: string;
      is_alpha_ready: boolean;
    };
  };
  microstock_metadata: {
    agency_target: string;
    title: string;
    description: string;
    category: string;
    top_10_keywords: string;
    all_50_keywords: string;
    csv_record: MicrostockCsvRecord;
  };
  marketplace_preview: {
    simulated_price_usd: number;
    technical_badges: string[];
    curation_checklist: {
      zero_ip_violations: boolean;
      commercial_license_approved: boolean;
      fifty_keywords_fulfilled: boolean;
    };
  };
}

export interface MicrostockCsvRecord {
  filename: string;
  title: string;
  description: string;
  keywords: string;
  category: string;
  /** kode draw() asal baris ini (untuk thumbnail & prompt perkaya-AI) — tidak ikut ke CSV */
  kode?: string;
}

/* ================================================================== */
/* 4. VALIDATOR & NORMALISASI                                          */
/* ================================================================== */

const HEX = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_PALETTE: MicrostockPalette = {
  primary: "#4cd7f6",
  secondary: "#f97316",
  accent: "#4edea3",
  background: "#000000",
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Potong pada batas karakter tapi jaga kata tetap utuh. */
function potongKata(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim();
}

function slugifyLembut(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

/* --- Kata kunci: pool padding agar selalu tepat 50 --- */

const SEED_PER_KATEGORI: Record<MikroKategori, string[]> = {
  Technology: ["technology", "tech background", "digital innovation", "science", "engineering", "computer", "software", "automation", "future tech", "high tech"],
  Abstract: ["abstract background", "abstract shapes", "abstract loop", "fluid abstract", "geometric abstract", "colorful abstract", "minimal abstract", "abstract pattern", "abstract motion", "modern abstract"],
  Business: ["business", "corporate", "business background", "office", "teamwork", "success", "strategy", "professional", "company", "presentation"],
  Holiday: ["holiday", "holiday background", "festive season", "celebration", "greeting", "party", "ornament", "gift", "seasonal", "festive decoration"],
  Finance: ["finance", "financial background", "economy", "investment", "banking", "money", "profit", "growth chart", "financial concept", "wealth"],
};

const POOL_TEKNIS = [
  "4k", "loop", "background", "motion graphics", "animated", "animation", "seamless", "template",
  "modern", "digital", "glow", "dynamic", "intro", "opener", "banner", "futuristic", "technology",
  "business", "finance", "celebration", "alpha channel", "transparent", "render", "screen", "display",
  "concept", "internet", "data", "network", "neon", "light", "particles", "wave", "gradient",
  "interface", "hud", "sci fi", "corporate", "no people", "copy space", "headline", "title",
  "presentation", "marketing", "advertisement", "promo", "growth", "profit", "money", "coin",
  "banking", "payment", "ecommerce", "shopping", "retail", "luxury", "gold", "elegant",
  "minimal", "geometric", "pattern", "texture", "fluid", "smoke", "energy", "electricity",
  "circuit", "artificial intelligence", "cloud", "cybersecurity", "globe", "world", "city",
  "space", "galaxy", "stars", "bokeh", "clean background", "professional", "royalty free",
  "commercial", "editable", "text placeholder", "loopable", "infographic", "chart", "diagram",
  "element", "effect", "transition", "reveal", "lower third", "countdown", "loading", "progress",
  "badge", "icon", "shape", "particle background", "tech background", "business background",
  "abstract background", "stock footage", "video template", "motion background", "seamless background",
  "digital background", "modern background", "background video", "visual effect", "3d",
  "high quality", "ultra hd", "widescreen", "vertical", "horizontal", "square", "royalty free music",
];

/** Normalisasi ke tepat 50: bersih, dedupe (maks 2 kemunculan), padding unik dari pool. */
function normalizeKeywords(raw: string[], kategori: string): string[] {
  const clean: string[] = [];
  const counts = new Map<string, number>();
  for (const kw of raw) {
    const k = kw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!k || k.length > 40) continue;
    const c = counts.get(k) ?? 0;
    if (c >= 2) continue;
    counts.set(k, c + 1);
    clean.push(k);
  }
  const seed = SEED_PER_KATEGORI[kategori as MikroKategori] ?? SEED_PER_KATEGORI.Technology;
  for (const pad of [...seed, ...POOL_TEKNIS]) {
    if (clean.length >= 50) break;
    if ((counts.get(pad) ?? 0) >= 1) continue;
    counts.set(pad, 1);
    clean.push(pad);
  }
  return clean.slice(0, 50);
}

function normalisasiKategori(raw: unknown): { kategori: string; berubah: boolean } {
  if (!isStr(raw)) return { kategori: "Technology", berubah: true };
  const t = raw.trim().toLowerCase();
  const peta: Record<string, MikroKategori> = {
    technology: "Technology", tech: "Technology", teknologi: "Technology",
    abstract: "Abstract", abstrak: "Abstract",
    business: "Business", corporate: "Business", bisnis: "Business",
    holiday: "Holiday", holidays: "Holiday", festive: "Holiday", liburan: "Holiday",
    finance: "Finance", financial: "Finance", keuangan: "Finance", money: "Finance",
  };
  const kategori = peta[t];
  if (kategori) return { kategori, berubah: raw !== kategori };
  return { kategori: "Technology", berubah: true };
}

export interface MicrostockValidation {
  asset: MicrostockAsset | null;
  errors: Issue[];
  warnings: Issue[];
}

/**
 * Validasi & normalisasi JSON hasil AI.
 * Error = struktur hilang total (AI salah format). Selebihnya diperbaiki
 * otomatis (IP disanitasi, keyword dipad ke 50, judul dipotong, harga di-clamp)
 * dengan warning agar user tahu apa yang disentuh engine.
 */
export function validateMicrostockJson(raw: string): MicrostockValidation {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const E = (path: string, message: string) => errors.push({ path, message, level: "error" });
  const W = (path: string, message: string) => warnings.push({ path, message, level: "warning" });

  const extracted = extractJson(raw);
  if (extracted.error || extracted.json === undefined) {
    return {
      asset: null,
      errors: [{ path: "input", message: extracted.error ?? "JSON tidak terbaca.", level: "error" }],
      warnings,
    };
  }
  const root = asRecord(extracted.json);
  if (!root) {
    return { asset: null, errors: [{ path: "$", message: "Output bukan objek JSON.", level: "error" }], warnings };
  }

  // --- struktur wajib: 4 bagian utama ---
  const ipRaw = asRecord(root.ip_guard);
  const veRaw = asRecord(root.visual_engine);
  const mmRaw = asRecord(root.microstock_metadata);
  const mpRaw = asRecord(root.marketplace_preview);
  if (!ipRaw) E("ip_guard", 'Objek "ip_guard" wajib ada.');
  if (!veRaw) E("visual_engine", 'Objek "visual_engine" wajib ada.');
  if (!mmRaw) E("microstock_metadata", 'Objek "microstock_metadata" wajib ada.');
  if (!mpRaw) E("marketplace_preview", 'Objek "marketplace_preview" wajib ada.');
  if (errors.length > 0 || !ipRaw || !veRaw || !mmRaw || !mpRaw) return { asset: null, errors, warnings };

  // --- metadata dasar ---
  const judulAsli = isStr(mmRaw.title) ? mmRaw.title.trim() : "";
  const descAsli = isStr(mmRaw.description) ? mmRaw.description.trim() : "";
  if (!judulAsli) E("microstock_metadata.title", "title wajib string tidak kosong.");
  if (!descAsli) E("microstock_metadata.description", "description wajib string tidak kosong.");
  if (errors.length > 0) return { asset: null, errors, warnings };

  // --- IP scan + sanitasi otomatis pada seluruh teks metadata ---
  const semuaTeks = `${isStr(veRaw.title_concept) ? veRaw.title_concept : ""}\n${judulAsli}\n${descAsli}\n${isStr(mmRaw.all_50_keywords) ? mmRaw.all_50_keywords : ""}`;
  const pelanggaran = scanIp(semuaTeks);
  const entitiesDariAi = Array.isArray(ipRaw.sanitized_entities)
    ? ipRaw.sanitized_entities
        .map((e) => asRecord(e))
        .filter((e): e is Record<string, unknown> => e !== null)
        .map((e) => ({ original: isStr(e.original) ? e.original.trim() : "", replacement: isStr(e.replacement) ? e.replacement.trim() : "" }))
        .filter((e) => e.original !== "")
    : [];
  const gabungan = [...pelanggaran];
  for (const e of entitiesDariAi) {
    if (!gabungan.some((g) => g.original.toLowerCase() === e.original.toLowerCase())) gabungan.push(e);
  }

  let title = judulAsli;
  let description = descAsli;
  let keywordsRaw = isStr(mmRaw.all_50_keywords) ? mmRaw.all_50_keywords : "";
  for (const g of gabungan) {
    const re = new RegExp(g.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    title = title.replace(re, g.replacement);
    description = description.replace(re, g.replacement);
    keywordsRaw = keywordsRaw.replace(re, g.replacement);
  }
  if (gabungan.length > 0) {
    W("ip_guard", `${gabungan.length} pelanggaran IP disanitasi otomatis menjadi istilah generik.`);
  }

  // --- panjang title & description ---
  if (title.length > 90) {
    title = potongKata(title, 90);
    W("microstock_metadata.title", `title dipotong ke ${title.length} karakter (maks 90).`);
  } else if (title.length < 60) {
    W("microstock_metadata.title", `title hanya ${title.length} karakter — idealnya 60-90 untuk SEO agensi.`);
  }
  if (description.length > 160) {
    description = potongKata(description, 160);
    W("microstock_metadata.description", `description dipotong ke ${description.length} karakter (maks 160).`);
  } else if (description.length < 100) {
    W("microstock_metadata.description", `description hanya ${description.length} karakter — idealnya 100-160.`);
  }

  // --- keyword: tepat 50 ---
  const keywords = normalizeKeywords(
    keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean),
    normalisasiKategori(mmRaw.category).kategori,
  );
  if (keywords.length !== 50) {
    // normalizeKeywords selalu menghasilkan 50 selama pool cukup; jaga-jaga
    W("microstock_metadata.all_50_keywords", `keyword dinormalisasi menjadi ${keywords.length} (target tepat 50).`);
  }
  const all50 = keywords.join(", ");
  const top10 = keywords.slice(0, 10).join(", ");

  // --- kategori ---
  const { kategori, berubah: kategoriBerubah } = normalisasiKategori(mmRaw.category);
  if (kategoriBerubah) W("microstock_metadata.category", `category dinormalisasi ke "${kategori}".`);

  // --- palette ---
  const paletRaw = asRecord((asRecord(veRaw.canvas_parameters) ?? {}).palette);
  const ambilHex = (v: unknown, fb: string): string => (isStr(v) && HEX.test(v.trim()) ? v.trim().toLowerCase() : fb);
  const palette: MicrostockPalette = {
    primary: ambilHex(paletRaw?.primary, FALLBACK_PALETTE.primary),
    secondary: ambilHex(paletRaw?.secondary, FALLBACK_PALETTE.secondary),
    accent: ambilHex(paletRaw?.accent, FALLBACK_PALETTE.accent),
    background: ambilHex(paletRaw?.background, FALLBACK_PALETTE.background),
  };
  if (paletRaw && (paletRaw.primary !== palette.primary || paletRaw.background !== palette.background)) {
    W("visual_engine.canvas_parameters.palette", "sebagian warna palette tidak valid hex-nya — diganti warna aman.");
  }

  // --- parameter kanvas ---
  const cpRaw = asRecord(veRaw.canvas_parameters) ?? {};
  const clampNum = (v: unknown, fb: number, min: number, max: number): number =>
    isNum(v) ? Math.min(max, Math.max(min, v)) : fb;

  // --- harga marketplace ---
  const hargaAsli = mpRaw.simulated_price_usd;
  const simulated_price_usd = Math.round(clampNum(hargaAsli, 59, 49, 79));
  if (isNum(hargaAsli) && (hargaAsli < 49 || hargaAsli > 79)) {
    W("marketplace_preview.simulated_price_usd", `harga ${hargaAsli} di-clamp ke $${simulated_price_usd} (rentang $49-79).`);
  }

  // --- badges teknis ---
  const badgesAsli = Array.isArray(mpRaw.technical_badges)
    ? mpRaw.technical_badges.filter(isStr).map((b) => b.trim()).filter(Boolean)
    : [];
  const isAlpha = typeof cpRaw.is_alpha_ready === "boolean" ? cpRaw.is_alpha_ready : true;
  const technical_badges = badgesAsli.length > 0
    ? badgesAsli
    : ["4K UHD", `${isNum(cpRaw.fps) ? cpRaw.fps : 30} FPS`, isAlpha ? "Alpha Transparent" : "Black Background", "Seamless Loop"];

  // --- filename CSV (sekuens saat ditambahkan ke batch) ---
  const filenameCsv = isStr((asRecord(mmRaw.csv_record) ?? {}).filename)
    ? ((asRecord(mmRaw.csv_record) as Record<string, unknown>).filename as string)
    : `motion_asset_${slugifyLembut(title).replace(/-/g, "_").slice(0, 24) || "asset"}.mp4`;

  const asset: MicrostockAsset = {
    ip_guard: {
      is_safe: gabungan.length === 0,
      violations_detected: gabungan.length,
      sanitized_entities: gabungan,
    },
    visual_engine: {
      title_concept: isStr(veRaw.title_concept) ? veRaw.title_concept.trim() : title,
      theme_category: kategori,
      canvas_parameters: {
        palette,
        particle_count: Math.round(clampNum(cpRaw.particle_count, 80, 0, 500)),
        speed_multiplier: clampNum(cpRaw.speed_multiplier, 1, 0.1, 5),
        glow_intensity: clampNum(cpRaw.glow_intensity, 15, 0, 100),
        animation_style: isStr(cpRaw.animation_style) ? cpRaw.animation_style.trim() : "halus, loop mulus, kontras kuat",
        is_alpha_ready: isAlpha,
      },
    },
    microstock_metadata: {
      agency_target: isStr(mmRaw.agency_target) ? mmRaw.agency_target.trim() : "Adobe Stock, Shutterstock, Pond5 & Envato",
      title,
      description,
      category: kategori,
      top_10_keywords: top10,
      all_50_keywords: all50,
      csv_record: { filename: filenameCsv, title, description, keywords: all50, category: kategori },
    },
    marketplace_preview: {
      simulated_price_usd,
      technical_badges,
      curation_checklist: {
        zero_ip_violations: gabungan.length === 0,
        commercial_license_approved: true,
        fifty_keywords_fulfilled: keywords.length === 50,
      },
    },
  };

  return { asset, errors, warnings };
}

/* ================================================================== */
/* 5. TOKO CSV BATCH (ikut terbundkus di Bulk ZIP; persist localStorage)*/
/* ================================================================== */

const KUNCI_BATCH = "motion-easy-batch-csv-v1";

let batch: MicrostockCsvRecord[] = [];
// pulihkan dari sesi sebelumnya
try {
  const raw = localStorage.getItem(KUNCI_BATCH);
  if (raw) {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) {
      batch = arr
        .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>) : null))
        .filter((r): r is Record<string, unknown> => r !== null)
        .filter((r) => typeof r.filename === "string" && typeof r.title === "string")
        .map((r) => ({
          filename: r.filename as string,
          title: r.title as string,
          description: typeof r.description === "string" ? r.description : "",
          keywords: typeof r.keywords === "string" ? r.keywords : "",
          category: typeof r.category === "string" ? r.category : "Technology",
          ...(typeof r.kode === "string" && r.kode ? { kode: r.kode } : {}),
        }));
    }
  }
} catch {
  /* localStorage tidak tersedia — batch hanya hidup di memori */
}

const listeners = new Set<() => void>();

function kabar() {
  try {
    localStorage.setItem(KUNCI_BATCH, JSON.stringify(batch));
  } catch {
    /* kuota penuh / private mode — abaikan, batch tetap jalan di memori */
  }
  for (const l of listeners) l();
}

export function getBatchCsv(): MicrostockCsvRecord[] {
  return batch;
}

export function subscribeBatchCsv(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Tambah satu baris; filename otomatis dapat nomor urut berikutnya. */
export function tambahBatchCsv(rec: Omit<MicrostockCsvRecord, "filename"> & { filename?: string }): MicrostockCsvRecord {
  const final: MicrostockCsvRecord = { ...rec, filename: nextCsvFilename(batch) };
  batch = [...batch, final];
  kabar();
  return final;
}

export function hapusBatchCsv(index: number) {
  batch = batch.filter((_, i) => i !== index);
  kabar();
}

/** Edit baris (tabel inline / hasil tempel JSON perkaya-AI). */
export function updateBatchCsv(index: number, patch: Partial<MicrostockCsvRecord>): void {
  if (index < 0 || index >= batch.length) return;
  batch = batch.map((r, i) => (i === index ? { ...r, ...patch } : r));
  kabar();
}

export function resetBatchCsv() {
  batch = [];
  kabar();
}

/** Nomor urut berikutnya: motion_asset_001.mp4, motion_asset_002.mp4, dst. */
export function nextCsvFilename(list: MicrostockCsvRecord[]): string {
  let max = 0;
  for (const r of list) {
    const m = r.filename.match(/(\d+)(?=\.mp4$)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `motion_asset_${String(max + 1).padStart(3, "0")}.mp4`;
}

/** Escape standar CSV (kutip ganda untuk field ber-koma/kutip/baris baru). */
export function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Susun isi file metadata.csv dari daftar rekaman (CRLF — ramah Excel). */
export function batchToCsv(rows: MicrostockCsvRecord[]): string {
  const header = "Filename,Title,Description,Keywords,Category";
  const baris = rows.map((r) =>
    [r.filename, r.title, r.description, r.keywords, r.category].map(csvEscape).join(","),
  );
  return [header, ...baris].join("\r\n");
}

/* ================================================================== */
/* 6. RECORD OTOMATIS dari hasil render (user input = nol)             */
/*    Metadata.csv lahir begitu video diekspor: parse kode draw()      */
/*    + nama file hasil ekspor (ambil resolusi di dalamnya).           */
/* ================================================================== */

export interface InfoRecordOtomatis {
  /** nama file hasil ekspor, mis. "neon-grid-1080x1920.mp4" */
  filename: string;
  /** judul konsep (cadangan bila tidak ada kata terdeteksi) */
  judul?: string;
  /** kode draw() aktif — sumber deteksi warna & pola gerak */
  kode?: string;
  rasio?: string;
  durasi?: number;
  /** true bila format ekspor WebM Alpha */
  alpha?: boolean;
  kategori?: string;
}

function hue360(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return 0;
  let h: number;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}

/** Klasifikasi hex → nama warna en (untuk keyword "neon cyan", dst). */
function namaWarna(hex: string): string | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (mx < 40) return "black";
  if (mn > 210 && d < 26) return "white";
  if (d < 22) return mx < 110 ? "dark gray" : "gray";
  if (mx > 225 && d > 100 && mn > 140 && (mx - mn) / mx < 0.55) return mx > 240 && b >= g ? "light blue" : "light tone";
  const h = hue360(r, g, b);
  if (h < 15 || h >= 340) return "red";
  if (h < 42) return "orange";
  if (h < 68) return "yellow";
  if (h < 150) return "green";
  if (h < 195) return "teal cyan".split(" ")[0];
  if (h < 230) return "cyan";
  if (h < 265) return "blue";
  if (h < 295) return "purple";
  if (h < 340) return "pink";
  return null;
}

/** Pola gerak/visual terdeteksi dari kode draw() → deskriptor en. */
function deteksiMotif(kode: string): string[] {
  const t = kode.toLowerCase();
  const kandidat: Array<[RegExp, string]> = [
    [/ctx\.rotate|rotate\(/, "rotating"],
    [/ctx\.scale|scale\(/, "scaling"],
    [/shadowblur|glow/, "glowing"],
    [/gradient|lerp|interpolat/, "gradient"],
    [/particle|partikel/, "particles"],
    [/ctx\.filltext|filltext|kinetic|teks/, "kinetic typography"],
    [/\.arc\(|circle|lingkaran|rendercircle/, "circular shapes"],
    [/\.rect\(|rect|kotak|renderrect/, "geometric rectangles"],
    [/\.moveto|\.lineto|stroke|garis|renderline/, "linear strokes"],
    [/grid/, "grid"],
    [/wave|sin\(|sinus|osilat/, "sinusoidal wave"],
    [/float|firsubscr|melayang|hover/, "floating"],
    [/bounce|spring|pegas|elastik/, "spring bounce"],
    [/pulse|denyut|beat|sinus/, "pulsing"],
    [/star|bintang/, "stars"],
    [/spiral/, "spiral"],
  ];
  const ada: string[] = [];
  for (const [re, label] of kandidat) {
    if (re.test(t) && !ada.includes(label)) ada.push(label);
  }
  return ada;
}

function kapitalKalimat(words: string[]): string {
  return words
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Label resolusi JUJUR diambil dari nama file ekspor (…-3840x2160.mp4 → "4K"). */
function labelResolusi(filename: string): { res: string; w: number } {
  const m = /(\d{3,4})x(\d{3,4})/.exec(filename);
  const w = m ? Number(m[1]) : 0;
  if (w >= 3800) return { res: "4K UHD", w };
  if (w >= 2500) return { res: "2K UHD", w };
  if (w >= 1900) return { res: "Full HD", w };
  if (w > 0) return { res: "HD", w };
  return { res: "HD", w: 0 };
}

/**
 * Bangun baris CSV OTOMATIS dari hasil render — user tidak mengetik apa pun.
 * Keyword seed: warna + motif + teknis; dinormalisasi tepat 50 via pool engine.
 */
export function buatRecordOtomatis(o: InfoRecordOtomatis): Omit<MicrostockCsvRecord, "filename"> {
  const kode = o.kode ?? "";
  const warna = [...new Set([...(kode.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map(namaWarna)].filter((w): w is string => w !== null))].slice(0, 3);
  const motif = deteksiMotif(kode).slice(0, 6);

  const { res, w } = labelResolusi(o.filename);
  const vertikal = o.rasio === "9:16" || (w > 0 && (() => { const m = /(\d{3,4})x(\d{3,4})/.exec(o.filename); return m ? Number(m[2]) > Number(m[1]) : false; })());
  const rasioWord = o.rasio === "1:1" ? "Square" : vertikal ? "Vertical" : "Widescreen";

  // Subject phrase: motif utama + warna; fallback judul konsep → "Abstract Motion"
  const subj = [...motif.slice(0, 3), ...warna.slice(0, 2)];
  const subject = subj.length > 0 ? subj : ["abstract", "glowing", "motion"];

  const subjTitle = kapitalKalimat(subject);
  const tail = `${res} Seamless ${o.durasi && o.durasi <= 15 ? "Short Loop" : "Loop"} ${rasioWord} ${
    o.alpha ? "Alpha Channel" : ""
  } Motion Graphics Background`.replace(/\s+/g, " ").trim();

  let title = `${subjTitle} ${tail}`;
  // penuhi 60–90
  const pelengkapJudul = [" for Video Editors", " for Content Creators", " Royalty Free Stock Footage", " for Intros and Reels", " for Presentations"];
  let pi = 0;
  while (title.length < 60 && pi < pelengkapJudul.length) title += pelengkapJudul[pi++];
  if (title.length > 90) {
    const cut = title.slice(0, 90);
    const sp = cut.lastIndexOf(" ");
    title = (sp > 60 ? cut.slice(0, sp) : cut).trimEnd();
  }

  // Description 100–160 kar — dua tingkat template lalu pad/potong
  const pal = warna.length > 0 ? ` with a ${warna.join(" and ")} color palette` : "";
  let desc = `Abstract ${[...motif.slice(0, 2), "animation"].join(" ")} loop${pal}, perfect as a ${rasioWord.toLowerCase()} background for video intros, social media reels, presentations, and promotional content.`;
  if (desc.length < 100) desc += " Ideal stock footage for creators.";
  if (desc.length < 100) desc += " Designed for professional video editors.";
  if (desc.length > 160) {
    const cut = desc.slice(0, 160);
    const sp = cut.lastIndexOf(" ");
    desc = (sp > 110 ? cut.slice(0, sp) : cut).trimEnd();
  }

  // Keyword raw → dinormalisasi tepat 50 (pool kategori + teknis engine)
  const rawKw: string[] = [
    ...subject, // motif + warna sebagai kata terpisah
    ...warna.map((c) => `${c} background`),
    `${rasioWord.toLowerCase()} background`,
    res.split(" ")[0].toLowerCase(),
    "motion graphics",
    "animated background",
    "seamless loop",
    "loop",
    "background",
    "abstract",
    "modern",
    "dynamic",
    "intro",
    "opener",
    "banner",
    o.alpha ? "alpha channel" : "",
    o.alpha ? "transparent" : "",
    o.durasi ? `${o.durasi} seconds` : "",
    o.rasio ?? "",
  ].filter(Boolean);

  const keywords = normalizeKeywords(rawKw, normalisasiKategori(o.kategori).kategori);

  return {
    title,
    description: desc,
    keywords: keywords.join(", "),
    category: normalisasiKategori(o.kategori).kategori,
    kode,
  };
}

/**
 * Prompt "Perkaya via AI" per-baris — berisi KODE DRAW (teks KB, bukan video)
 * + metadata saat ini. Hasil AI ditempel balik ke panel, divalidasi
 * validateMicrostockJson, lalu baris di-update.
 */
export function buildMicrostockEnrichPrompt(r: MicrostockCsvRecord): string {
  const kode = r.kode ? r.kode.trim() : "";
  return [
    'ROLE: You are a "Microstock SEO Copywriter". Upgrade the metadata of an already-rendered motion graphics asset.',
    "",
    "RULES (STRICT):",
    "- title: English, 60-90 characters, natural, no keyword stuffing",
    "- description: English, 100-160 characters, describe the editor use-case",
    "- keywords: EXACTLY 50 English keywords, comma separated. FIRST 10 = highest relevance (Adobe reads them first). Rest = synonyms, industries, technical descriptors (4k, loop, motion graphics, abstract, background, alpha channel). No single word repeated more than twice.",
    "- category: one of Technology | Abstract | Business | Holiday | Finance",
    "- NO brand/trademark names anywhere (Apple, TikTok, Shopee, Nike, Disney, Cyberpunk, dst) — generic commercial terms only",
    "",
    ...(kode
      ? ["DRAW CODE (the actual animation logic — describe what it VISUALLY renders):", "```javascript", kode, "```", ""]
      : []),
    "CURRENT METADATA (improve it, do not rename filename):",
    "```json",
    JSON.stringify({ filename: r.filename, title: r.title, description: r.description, keywords: r.keywords, category: r.category }, null, 2),
    "```",
    "",
    "OUTPUT FORMAT — STRICT: return ONLY one fenced ```json``` block with the full 4-section microstock schema",
    "(ip_guard, visual_engine, microstock_metadata with title/description/category/top_10_keywords/all_50_keywords/csv_record, marketplace_preview).",
    "The csv_record.title/description/keywords/category must reflect your upgrade; csv_record.filename unchanged. No commentary.",
  ].join("\n");
}
