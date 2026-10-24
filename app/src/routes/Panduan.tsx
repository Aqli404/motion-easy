import { Terminal, Rocket, Film, Sparkles, Layers, Volume2, ShieldCheck, Download, Package, Award, MonitorUp } from "lucide-react";

const tahap = [
  {
    n: 1,
    t: "Prompt Engineer — AI Studio",
    d: "Tool 01 berjalan penuh di Motion Easy AI Studio (akses 1-klik dari beranda). Login Google pribadimu — AI Studio meracik variasi kode draw() siap review & download.",
  },
  {
    n: 2,
    t: "Render Video & Full Preview",
    d: "Tempel kode draw(ctx,time,width,height) di tab Render Video → live preview real-time. Klik Full Preview untuk theater resolusi asli + fullscreen (F), backdrop Gelap/Putih/Transparan, safe-area 9:16, kontrol auto-hide dan shortcut Spasi/←→.",
  },
  {
    n: 3,
    t: "Bulk ZIP Importer — Render Batch",
    d: "Ekspor banyak variasi dari Prompt Engineer sebagai TXT / ZIP → impor di tab Bulk → antrean WebCodecs lokal → satu ZIP isi semua video + metadata.csv otomatis. 100% di browser.",
  },
  {
    n: 4,
    t: "Metadata SEO — metadata.csv otomatis",
    d: "Setiap video yang diekspor langsung menambah baris di tab Metadata SEO (filename, title 60–90 char, description 100–160 char, tepat 50 keyword). Review/edit inline atau perkaya via AI (salin prompt pakai kode draw() + unduh 5 thumbnail JPG kecil) lalu tempel balik JSON untuk validasi.",
  },
  {
    n: 5,
    t: "Ekspor MP4 / MOV bersih ≥100 MB (CBR)",
    d: "Preset 4K · 160/200 Mbps (Premium, CBR + latency quality) membuat konten nyata ≥100 MB — bukan sekadar padding. Butuh garansi: target 105 MB (MiB-basis) mengisi sisa agar pasti di atas 100 di Windows & Finder.",
  },
];

const fiturUnggulan = [
  {
    icon: MonitorUp,
    title: "Theater Full Preview",
    desc: "Canvas dirender pada resolusi asli preset lalu di-scale — yang terlihat identik hasil ekspor. Fullscreen API asli (double-click atau F), backdrop Gelap/Putih/Checker-transparan, safe-area TikTok.",
  },
  {
    icon: Sparkles,
    title: "MOV Bersih ≥100 MB (CBR Premium)",
    desc: "4K · 160/200 Mbps, bitrateMode constant + latencyMode quality. H.264 QuickTime nyata untuk Adobe Premiere; WebM VP9 Alpha 32-bit transparan untuk CapCut/Premiere/DaVinci/AE.",
  },
  {
    icon: ShieldCheck,
    title: "Garansi 105 MB (MiB)",
    desc: "Target padding berbasis MiB + 0,5% margin — >100 MB di Windows Explorer & Finder. free-box ISO-BMFF resmi, tanpa merusak stream H.264.",
  },
  {
    icon: Package,
    title: "Bulk ZIP Importer",
    desc: "Impor TXT (blok draw() dipisah `---`) atau ZIP project → antrean render batch WebCodecs client-side → satu ZIP berisi video + metadata.csv.",
  },
  {
    icon: Layers,
    title: "Metadata.csv Otomatis — zero input",
    desc: "Baris lahir saat render: parse warna hex → nama warna + motif (rotating, glowing, particles…) + label resolusi jujur (Full HD/4K) + normalize tepat 50 keyword. Persist localStorage lintas sesi.",
  },
  {
    icon: Volume2,
    title: "Audio SFX + Cover PNG",
    desc: "Whoosh/Pop/Ding sintetis Web Audio, menyuntik sinkron gerak (0 KB). Cover PNG dari frame loop apa pun; metadata batch tetap tersinkron di ZIP.",
  },
  {
    icon: Rocket,
    title: "Privasi 100% Client-Side",
    desc: "Render WebCodecs di GPU-mu. Lisensi Premium Bulanan/Lifetime offline ECDSA P-256, tetap aktif meski offline. Tanpa kirim brief/video ke server.",
  },
  {
    icon: Film,
    title: "Multi-Rasio 1-Klik",
    desc: "16:9 · 9:16 · 1:1 pakai koordinat relatif 0..1 — layout otomatis proporsional; safe-area preview 9:16 untuk feeds vertikal.",
  },
];

export default function Panduan() {
  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
            E-Book & Dokumentasi Resmi
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Panduan Lengkap Motion Easy Studio
          </h1>
          <p className="mt-1 text-xs text-muted font-mono">
            Platform Motion Graphics Video 100% Client-Side · Versi 3.1 (Prompt Engineer · Theater Full Preview · Bulk ZIP · Metadata CSV · 4K CBR ≥100 MB)
          </p>
        </div>

        {/* 5 Langkah Utama */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Alur Kerja Cepat (5 Langkah)</span>
          </h2>
          <ol className="space-y-3">
            {tahap.map(({ n, t, d }) => (
              <li
                key={n}
                className="flex gap-4 rounded-2xl border border-edge/80 bg-panel-low p-4 shadow-sm hover:border-primary/40 transition-all"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel font-mono text-sm font-bold text-primary border border-primary/20 shadow-sm">
                  {n}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{t}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-dim">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Fitur Unggulan Terbaru */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tertiary" />
            <span>Fitur Unggulan Generasi Baru</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {fiturUnggulan.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-2xl border border-edge/80 bg-panel p-4 space-y-2 shadow-sm hover:border-tertiary/30 transition-all">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{f.title}</span>
                  </div>
                  <p className="text-xs text-ink-dim leading-relaxed font-sans">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informasi Sistem & Spesifikasi */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="rounded-2xl border border-edge bg-panel-low p-5 space-y-2">
            <div className="flex items-center gap-2 text-secondary font-semibold text-xs">
              <Terminal className="h-4 w-4" />
              <span>Dukungan Browser & Hardware</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-muted">
              Optimal di <strong>Google Chrome</strong> & <strong>Microsoft Edge</strong> desktop dengan WebCodecs hardware acceleration.
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              Encoder negociasi CBR dulu; bila mesin menolak, fallback ke variable & sisanya ditutup padding premium agar tetap ≥100 MB. Paket Gratis 1080p (3/hari) — 2K & 4K butuh Premium.
            </p>
          </div>

          <div className="rounded-2xl border border-edge bg-panel-low p-5 space-y-2">
            <div className="flex items-center gap-2 text-tertiary font-semibold text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Sistem Lisensi Offline ECDSA P-256</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-muted">
              Lisensi Premium Bulanan & Lifetime divalidasi offline (ECDSA P-256) — tanpa login akun, tanpa tracking server.
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-muted">
              2K/4K, MOV bersih + padding 105 MB, Bulk ZIP & Alpha transparan tetap aktif offline. Mode dev: premium terbuka di localhost.
            </p>
          </div>
          <div className="rounded-2xl border border-edge bg-panel-low p-5 space-y-2 sm:col-span-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Award className="h-4 w-4" />
              <span>Catatan Microstock (Adobe Stock / Shutterstock)</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-muted">
              Kombo yang disarankan: <strong>4K · 160 Mbps (5 dtk ≈100 MB konten nyata) + target 105 MB</strong> → kontainer MOV/MP4 konsisten di Excel & Finder. Gunakan posting-target Enlarge tanpa render ulang untuk naik ke 200 MB.
            </p>
          </div>
        </div>

        {/* Minimal local-only notes */}
        <div className="rounded-2xl border border-edge bg-panel p-4 space-y-2">
          <div className="flex items-center gap-2 text-ink font-semibold text-xs">
            <Download className="h-4 w-4" />
            <span>Catatan Penting</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 font-mono text-[11px] text-ink-dim">
            <li>Prompt Engineer mengalir dari AI Studio Motion Easy — buka 1-klik dari beranda; file variasi diunduh TXT/ZIP untuk Bulk.</li>
            <li>Metadata.csv lahir otomatis saat render; perkayakan baris via salin prompt (berisi kode draw) + 5 frame JPG lalu tempel balik JSON AI.</li>
            <li>Hasil MOV Alpha dipisah: gunakan MP4/MOV untuk upload microstock; Alpha WebM untuk overlay transparan CapCut/Premiere/AE/DaVinci.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
