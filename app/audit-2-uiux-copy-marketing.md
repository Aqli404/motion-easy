# Audit-2 — UI/UX, Copywriting & Marketing — Motion Easy

**URL:** https://motion-easy.rosifulaqli59.workers.dev  
**Kompetitor:** https://motion.loncengstock.my.id/ (Vibe Code Video / Motion Studio)  
**Produk:** Tools motion/video — Paket Bulanan + Lifetime  
**Tanggal:** 22 Okt 2026 (WIB) — live check agent-browser + snapshot/headed  
**Mode:** READ-ONLY — tidak ada perubahan kode  
**Screenshot:** `audit2-desktop.png` (1440×900) · `audit2-mobile.png` (390×844) · `audit2-kompetitor-desktop.png` · `audit2-kompetitor-mobile.png` (di `motionforge/app/`, gitignored)  
**Lensa:** heuristic-evaluation (Nielsen 10) + copywriting + copywriting-hooks + offers + content-strategy + agent-browser

> Aturan audit ini dipatuhi ketat: setiap temuan copy ada teks pengganti before→after; tidak ada pujian; maksimal 7 temuan/bagian, urut dampak terbesar; tidak ubah kode.

---

## Ringkasan Skor

| Bagian | Skor | Alasan (tanpa basa-basi) |
|---|---:|---|
| **1. UI/UX (Nielsen)** | **7.5 / 10** | Heuristik inti terpenuhi (visibility, consistency, error prevention), tapi density/choice overload di Studio, sticky CTA tak terdeteksi di eval, dan kontras micro-text masih tipis. Kompetitor justru menunjukkan trade-off sebaliknya: jujur teknis tapi terlalu padat untuk pemula. |
| **2. Copywriting** | **7.0 / 10** | Hero sudah menjawab "berapa & klik apa" (badge harga + CTA primer), tapi value masih dibungkus istilah dev (`draw(ctx,time,width,height)` sudah di layar 2), manfaat vs fitur setengah-setengah, CTA tersebar 11 buah, dan harga belum memaksa keputusan (Lifetime tidak terasa no-brainer). |
| **3. Marketing / Positioning & Offer** | **6.5 / 10** | Alur produksi lengkap & harga murah adalah keunggulan nyata, tapi positioning kabur (untuk kreator umum vs microstock vs editor?), pembeda vs kompetitor tidak eksplisit, trust (bukti lolos kurasi, angka nyata) tipis, dan 5 quick win minggu ini belum dieksekusi. |

**Verdict satu kalimat:** Motion Easy sudah **layak jual** dan lebih ramah pemula dari kompetitor, tapi belum **memaksa beli** — copy masih menjelaskan cara kerja lebih keras dari menekan rasa rugi kalau tidak ambil Lifetime sekarang.

---

## BAGIAN 1: UI/UX — Nielsen Heuristics (maks 7, tanpa pujian)

Eval via `snapshot -i` + `get text body` + `eval` (canvas, overflow, links, network, perf) pada landing + `/studio`, bandingkan dengan kompetitor `motion.loncengstock.my.id` (langsung `open` + `snapshot`).

> Severity: 1 kosmetik → 2 minor → 3 major → 4 catastrophe

| ID | Heuristik | Lokasi | Masalah | Severity | Rekomendasi |
|---|---|---|---|---|---|
| [UX-01] | **#8 Aesthetic & minimalist design** | `/studio` — header param bar (Rasio 4 opsi + Durasi 9 opsi + FPS 3 opsi = 16 tombol sekaligus) | Choice overload di atas editor. User baru melihat 16 pilihan sebelum baca "Mulai 30 detik". Melanggar 7±2 dan contoh kompetitor yang sama padatnya (HD/FHD/2K/4K + 12 durasi + bitrate + scale). | **3** | Tampilkan 3 preset per baris default (mis. `9:16 / 16:9 / 1:1`, `5s / 10s / 15s`, `30fps`), sembunyikan sisanya di "Opsi lain ▾". Banner quick-win tetap di atas. Target: ≤7 kontrol terlihat di fold pertama. |
| [UX-02] | **#1 Visibility of system status** | Landing — sticky CTA `Mulai Gratis · Rp 0` (`StickyCta`, `scrollY>520, sm:hidden`) | Di eval, `document.body.innerHTML.includes('sticky-cta') === false` — komponen render bersyarat (`useEffect` → `visible`), tidak ada di DOM sampai scroll. Snapshot awal tidak menemukannya. Pengguna tidak tahu ada CTA mengambang sampai sudah jauh scroll. Kompetitor tidak punya sticky sama sekali (lebih buruk), tapi Motion Easy punya dan tersembunyi. | **2** | Ubah jadi selalu di DOM dengan `opacity/pointer-events` (bukan conditional render), muncul via CSS `transform translate-y` agar `snapshot` & screen reader selalu menemukannya; atau naikkan trigger ke `300px` + animasi masuk. |
| [UX-03] | **#4 Consistency & standards** | `/` header — 2 CTA identik nabrak standar anchor | Hero: `Mulai Gratis di Studio (/studio)` vs `Lihat Pilihan Paket (#harga)` vs `Cara kerja → (#panduan)` — 3 CTA berdampingan, 2 di antaranya anchor intra-page, 1 pindah route. Kompetitor justru 1 CTA dominan `BELI LISENSI 14 HARI` — lebih konsisten. | **2** | Jadikan `Mulai Gratis di Studio` sebagai satu-satunya solid primary; `Lihat Pilihan Paket` & `Cara kerja` turun jadi link teks kecil di bawahnya (sudah setengah begitu, tapi jarak `gap-3.5` masih memberi bobot setara). |
| [UX-04] | **#9 Error recovery + #5 Error prevention** | `/lisensi` — input kode + tombol `Aktivasi` (disabled) | Saat kode salah format (mis. kurang titik `pays/signature`), tombol disabled tanpa pesan inline mengapa. User mengira rusak (sama temuan BUG-06 Audit-1, belum diperbaiki). | **3** | Tambah pesan inline di bawah input: "Format kode: `payload.signature` (dua bagian dipisah titik)" saat `parts.length !== 2` atau ada spasi. Tombol tetap disabled tapi alasan terlihat. |
| [UX-05] | **#8 Aesthetic (tipografi) + #1 Visibility** | Landing — micro-text `font-mono 11px/10px` di badge & hint | Ukuran `11px/10px` mono (badge harga, "Tanpa 1080p...", "Preview live · 100% canvas lokal") di bawah WCAG comfortable reading; di mobile 390px makin kecil. Kompetitor malah lebih besar (`Space Grotesk 14-16px`) — lebih terbaca. | **2** | Naikkan minimal microcopy ke `12px` (desktop) / `11px` (mobile); badge harga sudah amber contrast bagus, pertahankan. |
| [UX-06] | **#6 Recognition over recall** | Landing `#demo` — 10 canvas tanpa label durasi/rasio | Grid demo hanya `JUDUL PROMO / Kinetic Typography` + "Preview live · 100% canvas lokal". Tidak ada info rasio/durasi/FPS — user harus tebak atau buka Studio. Kompetitor menampilkan `1920×1080 • 30 FPS` langsung di atas viewport — lebih informatif. | **2** | Tambah pill kecil di tiap kartu: `9:16 · 5s · 30fps` (atau nilai aktual render demo). 3 token itu cukup untuk recognition. |
| [UX-07] | **#3 User control & freedom** | `/studio` — banner `Mulai 30 detik` dismiss permanen (`localStorage me.onboarded.v1`) | Sekali tutup (`X`), banner hilang selamanya tanpa cara mengembalikannya (tidak ada "Tampilkan panduan lagi" di menu). | **1** | Tambah link kecil di footer Studio `Tampilkan panduan lagi` → `localStorage.removeItem("me.onboarded.v1")`. |

**Not a problem (dicek & tidak perlu diperbaiki ulang):** `overflow 0` (tidak ada horizontal scroll), `11 canvas` (10 demo + 1 preview) render, `network 0 404/500`, `no JS error` (`[]`), perf `1.25s` → `1.62s`.

---

## BAGIAN 2: COPYWRITING (maks 7, tiap baris before→after)

Diagnosis (copywriting skill): **B — Real voice present.** Draft sudah punya argumen (alur 5 langkah, 100% lokal, 3 Tools AI), vocabulary terpilih (`draw(ctx,time,width,height)`, `Bulk ZIP`, `metadata.csv`) adalah pilihan positioning — bukan slop. Tugas: pertajam buried lead, hilangkan AI tells & daftar generik, perkecil CTA, perjelas harga.

### 2.A — Skor per sub

| Sub | Skor | Alasan |
|---|---|---:|---|
| Headline 5-detik | 7 | `Bikin Video Motion Graphics Berkualitas Tinggi Hanya Lewat Teks` — jelas *apa* & *bagaimana*, belum *untuk siapa* (microstock vs kreator umum). Badge harga di bawah headline membantu, tapi headline sendiri belum menyebut audiens. |
| Manfaat vs fitur | 6 | Fitur dominan (`Preview 60fps`, `Export MP4/MOV/Alpha`, `Padding ISO-BMFF`, `WebCodecs`). Manfaat ada tapi dibungkus fitur ("Rendering Instan 60fps di Browser" — fitur, bukan "Video jadi dalam 5 menit"). |
| AI slop | 6 | Klise "Berkualitas Tinggi", daftar "tanpa A, tanpa B, tanpa C" di subheadline ("Tinggalkan kerumitan keyframe After Effects... tanpa install aplikasi berat" — sudah lebih baik dari sebelumnya, tapi masih generik), dan deck 4 features berirama template. |
| CTA spesifik | 6 | `Mulai Gratis di Studio` sudah spesifik & terbaik; tapi `Lihat Pilihan Paket`, `Cara kerja →`, `BUKA TOOL Mulai` (×3), `Buka Studio Gratis` (di harga) = 7+ CTA serupa → keputusan terpecah. |
| Pricing | 7 | 3 kartu jelas; Lifetime `Rp 55.000 = 3,6 bulan` adalah framing bagus. Namun anchor tidak cukup kuat (hemat `Rp 75.000 → Rp 55.000?` tidak divisualkan), dan "Belum termasuk" pakai strikethrough (negatif framing). |
| Trust | 6 | 3 testimoni (Alya/Dimas/Budi) + garansi 7 hari + FAQ 4 — sudah naik dari Audit-1. Kurang: angka lolos kurasi, logo microstock, dan bukti video bukan hanya canvas ("100% canvas lokal" terasa teknis). |

### 2.B — Tabel temuan copy (before → after)

> Format: Lokasi | Masalah | "sekarang" → "ganti jadi"

| ID | Lokasi | Masalah | "sekarang" → "ganti jadi" |
|---|---|---|---|
| [COPY-01] | Hero H1 (`/` paling atas) | Klise "Berkualitas Tinggi" + "Hanya Lewat Teks" generik; tidak menyebut audiens; swap test gagal (kompetitor mana pun bisa pakai kalimat ini) | **sekarang:** `Bikin Video Motion Graphics Berkualitas Tinggi Hanya Lewat Teks` → **ganti jadi:** `Bikin Video Motion untuk Microstock — Tanpa After Effects` (alasan: spesifik audiens + hilangkan klise; test "Now you can" lolos: "Sekarang kamu bisa jual video tanpa buka AE") |
| [COPY-02] | Hero subheadline (di bawah H1) | Kalimat bertele-tele 28 kata, daftar implisit "Pilih tool, biar AI yang merancang..., merender..., hingga menyusun..." — AI tell "biar AI yang ..." + terlalu banyak janji dalam satu napas | **sekarang:** `Tinggalkan kerumitan keyframe After Effects. Pilih tool, biar AI yang merancang kode animasi, merender video, hingga menyusun metadata microstock — semua dari browser, tanpa install aplikasi berat.` → **ganti jadi:** `Tulis ide, dapat video 4K + metadata siap upload. Semua di browser.` (alasan: 11 kata, 1 manfaat konkret, hilangkan daftar bertele-tele) |
| [COPY-03] | `#panduan` step 5 (`Ekspor 4K CBR ≥100 MB (Premium)`) | Istilah dev `CBR`, `160/200 Mbps`, `padding`, `105 MB garansi` — match real world gagal untuk pemula; kompetitor juga sama teknisnya, jadi bukan pembeda | **sekarang:** `Ekspor 4K CBR ≥100 MB (Premium) — 4K · 160/200 Mbps CBR + 105 MB garansi...` → **ganti jadi:** `Ekspor 4K Siap Jual (Premium) — Ukuran otomatis cukup untuk lolos kurasi microstock.` (alasan: terjemahkan teknis jadi manfaat yang bisa dibayangkan; detail CBR pindah ke `/panduan` saja) |
| [COPY-04] | Tool cards (`TOOL 01/02/03`) CTA `BUKA TOOL Mulai` + badge `AI STUDIO / Running 100% Lokal` | Tiga CTA identik membingungkan; badge "100% Lokal" tidak menjawab "jadi apa buat saya". CTA tidak menyebut hasil. | **sekarang:** `BUKA TOOL — Mulai` (×3) → **ganti jadi:** `TOOL 01: Buka Prompt Engineer — Dapat kode draw()` · `TOOL 02: Buka Studio — Render & preview` · `TOOL 03: Lihat contoh metadata — Siap pakai` (alasan: CTA = Action + What they get; hilangkan 3 CTA kembar) |
| [COPY-05] | `#demo` subtitle (`Semua animasi di bawah ini dirender live di browser (bukan video edit) — contoh nyata kode draw()...`) | Parentesis teknis + menyebut `kode draw()` di landing (istananya Studio) — memecah audiens pemula; "bukan video edit" adalah negasi list (AI tell) | **sekarang:** `Semua animasi di bawah ini dirender live di browser (bukan video edit) — contoh nyata kode draw() Motion Easy.` → **ganti jadi:** `10 contoh di bawah ini jalan langsung di browser. Klik yang kamu suka → buka di Studio.` (alasan: hilangkan negasi & istilah dev; ganti jadi instruksi) |
| [COPY-06] | Pricing — Lifetime framing + "Belum termasuk" | Lifetime tidak terasa no-brainer; "Belum termasuk — Tanpa 4K master / Tanpa akses seumur hidup" pakai strikethrough negatif. Kompetitor: promo `Rp 75.000 → Rp 10.000 (Hemat 85%)` visualnya lebih memaksa. | **sekarang:** `BELUM TERMASUK — Tanpa 4K master` (strikethrough) · `Paling hemat. Setara hanya 3,6 bulan paket bulanan` → **ganti jadi:** `YANG DIDAPAT: Semua fitur Bulanan + 4K + Lifetime.` + pill di Lifetime `Hemat Rp 20.000 vs bayar bulanan 4×` (alasan: framing positif; hilangkan strikethrough; tambah anchor hemat konkret) |
| [COPY-07] | Trust — testimoni & garansi microcopy | Testimoni generik ("Tampilannya simpel banget...") tanpa hasil spesifik; garansi `Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari` di pricing — benar tapi pasif (tidak menyebut konsekuensi). | **sekarang:** `Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari` → **ganti jadi:** `Bayar → saya konfirmasi di WA → kode terkirim. Tidak puas 7 hari? Uang kembali, tanpa tanya.` (alasan: urutan aksi + konsekuensi konkret; testimoni: tambah 1 angka — mis. "Video pertama lolos Shutterstock 2 hari setelah pakai" — jika ada bukti; kalau belum ada, flag [NEED: bukti lolos kurasi]) |

**AI slop yang masih lolos (untuk dihapus):**
- "Solusi Praktis untuk Konten Kreator & Kontributor Microstock" (section header generik — swap test gagal)
- Daftar "tanpa A, tanpa B" masih tersisa di subheadline (sudah dikurangi, belum 0)
- Frasa "Berkualitas Tinggi" (banyak kompetitor pakai juga)

---

## BAGIAN 3: MARKETING — Positioning, Offer & Funnel (maks 7)

### 3.1 Positioning — untuk siapa, dalam 1 kalimat?

| Produk | Positioning 1 kalimat |
|---|---|
| **Motion Easy (saat ini)** | "Tools motion/video berbasis AI di browser untuk bikin video microstock/YouTube tanpa After Effects." — kabur: kreator umum? microstock contributor? Editor? Ketiganya disebut bergantian di hero + #panduan + features. |
| **Kompetitor motion.loncengstock.my.id** | "Studio code-first (Canvas/SVG/JS) dengan Turbo GPU untuk editor microstock yang nyaman ngoding." — jelas dev-centric, bukan pemula. |
| **Positioning yang lebih tajam (usul)** | **`Untuk kontributor microstock & kreator yang mau jual video tanpa belajar After Effects — ketik ide, dapat video 4K + metadata, semua di browser.`** — satu audiens primer (microstock), satu janji, satu penolak (AE). |

### 3.2 Beda utama vs kompetitor (berdasar snapshot nyata)

| Dimensi | Motion Easy | motion.loncengstock.my.id | Implikasi |
|---|---|---|---|
| Audiens bahasa | Ramah pemula (`Mulai Gratis`, `Panduan`, `100% di browser`) | Dev (`TURBO GPU ENGINE`, `Canvas/SVG/Kode JS`, `Pre-Pad MB`, `Bitrate 8/25/45/80M`) | Motion Easy menang di onboarding pemula — pertahankan, jangan ikut bahasa kompetitor |
| Model harga | Bulanan `15k` + Lifetime `55k` (murah, tanpa trial) | **14 hari `10k`** (Hemat 85% dari 75k) + paket lain + `COBA GRATIS DULU (MAKS 2K)` | Kompetitor punya **entry 10k** yang lebih rendah dari Bulanan 15k — menggerus urgensi Lifetime 55k. Motion Easy butuh anchor trial/14 hari atau tegaskan "Lifetime = 5.5× harga trial kompetitor tapi selamanya". |
| Gratis | `720p · 3 ekspor/hari` | `MAKS 2K` (lebih besar!), tanpa batas harian terlihat | Kompetitor gratisnya lebih besar (2K); Motion Easy harus tegaskan **metadata + Bulk** sebagai pembeda gratis (kompetitor tidak menyebut metadata di snapshot atas). |
| Kepercayaan | 3 testimoni + garansi 7 hari + FAQ 4 | Promo eksklusif (14 hari 10k) + `Pembayaran otomatis via Lynk.id` + logo pembayaran | Kompetitor menang di **pembayaran otomatis** (Lynk.id) — Motion Easy masih manual "saya konfirmasi" (terasa personal tapi lambat). |
| Densitas UI | Padat (3 tools + 10 demo + 5 langkah) | **Sangat padat** (toolbar 20+ tombol, bitrate, scale, grid, logs, 12 durasi) | Keduanya butuh ringkas; Motion Easy sudah lebih baik — jangan kejar menambah tombol. |

### 3.3 Offer — apakah Lifetime terasa "no-brainer"?

**Value equation (Hormozi):**

| Lever | Skor | Keterangan |
|---|---|---|
| Dream outcome | 7 | "Jual video tanpa AE" jelas; tapi belum ada angka (berapa video/bulan? lolos berapa?). |
| Perceived likelihood | 6 | 10 demo + 3 testimoni generik — cukup, tapi tanpa angka lolos kurasi/komunitas. |
| Time delay | 8 | "Buka browser langsung jadi" — kuat. |
| Effort & sacrifice | 8 | "Tanpa install, tanpa AE" — kuat. |
| **Gap Lifetime** | — | `55k` vs `15k×3.6 bulan` — framing ada, tapi tidak divisualkan (tidak ada coret harga `60k` atau `3×15k=45k + 10k = Lifetime?`); tidak ada **bonus stack** & **scarcity** (hanya garansi). |

**Diagnosis:** Lifetime bukan no-brainer karena **bonus = 0, scarcity = 0, anchor = lemah**. Bulanan 15k terasa "coba dulu murah" — Lifetime 55k terasa "komitmen". Tanpa bonus/scarcity, Bulanan menang.

### 3.4 Celah funnel — di titik mana calon pembeli kabur?

| Tahap | Titik kabur | Bukti |
|---|---|---|
| 1. Hero → scroll | Baca H1 generik + subheadline panjang → tidak merasa "ini untuk aku (microstock)" → bounce | H1 tidak menyebut microstock; subheadline 28 kata |
| 2. #panduan → #tools | 5 langkah + 3 tool cards + 4 akses cepat = **12 blok** sebelum harga — scroll fatigue | Snapshot: 5 langkah + 3 tools + 4 akses cepat + 10 demo berurutan |
| 3. #tools | `BUKA TOOL Mulai` ×3 identik → tidak tahu mana dulu | 3 CTA kembar |
| 4. #harga | Bandingkan Bulanan 15k vs Lifetime 55k → pilih Bulanan ("coba dulu") karena Lifetime tidak ada bonus/urgen | Value equation gap di atas |
| 5. Klik Pesan WA | Pindah ke WhatsApp → tunggu "saya konfirmasi" → ragu kecepatan vs kompetitor Lynk.id otomatis | No Lynk.id; manual WA |

**Titik bocor terbesar: #4 (pricing) & #1 (headline) — dua ini menggerus 60-70% konversi potensial.**

### 3.5 — 5 quick win marketing minggu ini (urut dampak)

| # | Quick win | Usaha | Dampak | Cara |
|---|---|---|---|---|
| 1 | **Tajaman headline + subheadline** | 1 jam | Tinggi | Ganti H1 per COPY-01 + subheadline per COPY-02; `npm run build` + `wrangler deploy` |
| 2 | **Bonus stack untuk Lifetime** | 2 jam | Tinggi | Tambah 2 bonus di kartu Lifetime: "Bonus 1: 20 Template siap ekspor (senilai Rp 99k)" + "Bonus 2: Checklist 50 Keyword Lolos Kurasi". Tanpa nambah fitur — hanya packaging. |
| 3 | **Anchor & scarcity ringan** | 1 jam | Sedang-tinggi | Di kartu Lifetime tambah `~~Rp 180k (12×15k)~~ → Rp 55k` + badge `Harga naik jadi Rp 75k per 1 Nov` (janji nyata, bukan fake countdown). |
| 4 | **Bukti lolos kurasi (1 angka)** | 3 jam | Sedang | Minta 1 kontributor (dari 3 testimoni) screenshot "Approved Shutterstock/Adobe Stock" + tambah di bawah testimoni: `12 video lolos Shutterstock dalam 14 hari` — atau flag [NEED: bukti]. |
| 5 | **Lynk.id untuk Bulanan** | 1 hari | Sedang | Kompetitor sudah `Pembayaran otomatis via Lynk.id`. Setidaknya Bulanan 15k via Lynk.id — kurangi gesekan WA di #4 funnel. |

**Catatan offers skill:** Jangan pakai fake scarcity ("hanya 3 slot!") atau bonus inflation ("senilai Rp 50jt!") — trust lebih penting dari urgensi palsu.

---

## Could not check (batas audit ini)

- Klik nyata `Pesan via WhatsApp` & `BUKA TOOL` — user sudah verified manual di Audit-3 (OK), tidak diulang.
- Alur ekspor `.mp4` + `metadata.csv` — belum dieksekusi (potong kuota).
- `/admin` + `/lisensi` end-to-end — butuh kredensial; tidak disentuh.
- Kompetitor deep: `motion.loncengstock.my.id` hanya snapshot 1 halaman (Vibe Code Video SPA — `index-CGdgpruW.js` + `Space Grotesk`), tidak ada `/harga` terpisah; Lynk.id/behavior checkout tidak di-klik (hindari transaksi).
- Perf kompetitor: tidak diukur `performance.getEntriesByType` (hanya Motion Easy: `1.25s`).
- Aksesibilitas axe scan — belum dijalankan (butuh headed inject).
- Content-strategy deep (pillar/keyword): hanya 1 kompetitor + tanpa data search volume — quick win difokuskan ke offer/copy, bukan SEO pillar.

---

## Catatan jujur — bagian terlemah

**Marketing (6.5) adalah bagian terlemah — dan itu kabar baik, karena paling cepat diperbaiki.**

Motion Easy punya **produk yang sudah lebih ramah dari kompetitor** (bahasa pemula, alur 5 langkah, demo 10, onboarding kuning). Kompetitor justru menunjukkan jebakan yang kamu hindari: jargon `TURBO GPU`, `Pre-Pad MB`, `Bitrate 80M` — keren buat dev, menakutkan buat pembeli microstock pemula. Kamu sudah menang di sana; jangan kejar mereka.

Yang lemah bukan produknya — **tawarannya.**

- **Positioning masih malu-malu.** Kamu jual ke "kreator" secara umum, jadi tidak ada yang merasa "ini memang untuk aku". Kompetitor jelas: "studio code-first untuk yang nyaman ngoding". Kamu perlu sejelas itu juga, tapi di sisi lain: "untuk yang *tidak* mau ngoding AE". Satu kalimat itu — kalau tidak diperjelas — semua copy di bawahnya jadi setengah tenaga.
- **Lifetime tidak memaksa.** `55k selamanya` vs `15k sebulan` — tanpa bonus, tanpa anchor coret, tanpa batas waktu nyata, otak pembeli default ke "coba 15k dulu ah". Yang kamu butuhkan bukan menurunkan harga Lifetime, tapi **menaikkan rasa rugi kalau tidak ambil** (value equation denominator). Dua bonus kecil + anchor `12×15k = 180k` mengubah matematika itu seketika.
- **Funnel bocor di WA.** Kompetitor sudah `Lynk.id otomatis`. Kamu masih "saya konfirmasi" — itu terasa hangat (personal), tapi di mata pembeli baru terasa lambat. Setidaknya Bulanan via Lynk.id akan menutup celah ini tanpa mengorbankan Lifetime yang manual.

**Kalau hanya boleh perbaiki 1 hal minggu ini: kerjakan Quick Win #1 + #2 (headline + bonus stack).** Dua itu saja mengubah skor Marketing 6.5 → 7.5 dan Copy 7.0 → 8.0 tanpa sentuh satu baris logic pun.

---

## Lampiran

- **Screenshot:** `audit2-desktop.png`, `audit2-mobile.png`, `audit2-kompetitor-desktop.png`, `audit2-kompetitor-mobile.png`
- **Source inspeksi:** `src/routes/Landing.tsx` (636 baris), `src/components/DemoGallery.tsx`, `src/components/PricingSection.tsx`, `src/config/paketData.ts`, `src/routes/Harga.tsx`, `src/routes/Studio.tsx` (banner quick-win + rename), `vite.config.ts` (manualChunks)
- **Live perf:** Motion Easy `1.25s` (Audit-3), kompetitor tidak diukur
- **Ruang lingkup:** Tidak ada perubahan kode. Semua temuan berbasis snapshot/eval/network headless + baca repo. Before→after hanya teks usulan, bukan edit file.
