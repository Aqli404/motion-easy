# Audit-1 — Teknis & Struktur — Motion Easy

**URL:** https://motion-easy.rosifulaqli59.workers.dev  
**Produk:** Tools motion/video — Paket Bulanan Rp 15.000 + Lifetime Rp 55.000  
**Tanggal audit:** 22 Okt 2026 (WIB) — live site + inspeksi repo lokal  
**Mode:** READ-ONLY — tidak ada perubahan kode (sesuai ATURAN WAJIB)  
**Folder project (sesi):** `C:\Users\M ROSIFUL AQLI\motionforge\app` (root `motionforge/` di atasnya, worker di `motionforge/wrangler.json` + `app/worker/index.js`, build `app/dist`)  
**Lensa yang dipakai:** agent-browser (open/snapshot/get text/network/screenshot) + browser-testing-with-devtools (eval perf/resource) + webapp-testing (alur studio) + landing-page-conversion-audit + information-architecture + navigation-patterns  
**Lisensi yang dipakai untuk cek status premium:** `eyJ2IjoxLCJ0aWVyIjoibGlmZXRpbWUiLCJpYXQiOjE3OTIzMjc4NTcsImV4cCI6bnVsbCwibm90ZSI6IlBlbWJlbGktMDAyIn0.PL5FFUyhBmVPfy6u3kKv-guVn1XWbQnMI0RiMetG1codMoaEA1khiPik-7dQ4vRRpKtYz4lA2eEYObz8mujD3g` → payload `{"v":1,"tier":"lifetime","iat":1792327857,"exp":null,"note":"Pembeli-002"}` (Lifetime, offline ECDSA P-256 — bukan rahasia, hanya payload; signature tidak diungkap di laporan)  
**Sampel device audit:** desktop 1440×900 & mobile 390×844 via agent-browser `set viewport` + `screenshot`

> Catatan: Bagian "Implementing the fixes" dari skill landing-page-conversion-audit sengaja **diabaikan** sesuai instruksi. Tidak ada saran Docker/Autonnel.

---

## Ringkasan Skor (jujur, bukan basa-basi)

| Bagian | Skor | Satu kalimat |
|---|---:|---|
| **A. Bug & Teknis** | 8 / 10 | Stabil: tidak ada JS error, tidak ada request 404/500, LCP 1,62 detik di lab, tidak ada overflow. Risiko ada di ukuran bundle JS. |
| **B. Struktur Landing** | 7 / 10 | Urutan cerita runtut, tapi hero kurang "jawaban 5 detik" untuk harga & after-click, social proof absen, CTA tersebar. |
| **C. Struktur /studio** | 7 / 10 | Workspace–Referensi–Akun jelas, tapi first-run rawan bingung (3 pilih rasio/durasi/fps sebelum tahu mulai dari mana), penamaan masih developer-ish. |

**Verdict (conversion lens):** Bukan "page rusak". Page layak jual, tapi **bukan page yang siap skala paid traffic** tanpa perbaikan di message-match, bukti (testimoni/portfolio), dan kejelasan "klik ini → bayar di mana → kode dikirim bagaimana". Kalau traffic sudah jalan dan CPA di atas target, masalah paling mungkin ada di hulu (offer/audiens) **dan** di hilir (CTA WhatsApp tanpa checkout di halaman).

---

## BAGIAN 1: BUG & TEKNIS

Screenshot diambil dulu (aturan Bagian 1):
- `audit-shot-mobile.png` (390×844) — snapshot landing mobile
- `audit-shot-desktop.png` (1440×900) — snapshot landing desktop
- `audit-studio-mobile.png` (390×844) — snapshot /studio mobile
- `audit-studio-desktop.png` (1440×900) — snapshot /studio desktop

Semua disimpan di `C:\Users\M ROSIFUL AQLI\motionforge\app\` (gitignore; tidak dikomit).

### 1.A — Ringkasan hasil cek teknis

| Cek | Hasil |
|---|---|
| **Error JavaScript di console** | Tidak ada. `agent-browser eval` cek `window.__errors`/`consoleErrors` → `[]`. Navigasi `type: navigate` tanpa exception. |
| **Request API gagal** | Tidak ada. `agent-browser network requests` di landing: `200` untuk `/`, JS `index-BYdbNJNm.js`, CSS, font. Di `/studio`: sama. Tidak ada `404/500/CORS`. Catatan: tidak ada XHR/fetch sama sekali saat load awal (SPA murni) — normal untuk produk client-side ini. |
| **Tombol/link mati** | Sebagian **tidak terverifikasi sampai klik nyata** (lihat BUG di bawah). Anchor `#panduan`, `#harga`, `#tools` valid. Link SPA `/lisensi`, `/harga`, `/panduan`, `/proyek`, `/studio`, `/privasi` merespon `200` saat `Invoke-WebRequest`. Tombol pricing & tool card butuh verifikasi klik manual lebih dalam (Chrome headed). |
| **Layout rusak di mobile** | Tidak ada. `scrollWidth 390 === clientWidth 390, overflow 0`, `hasHorizScroll false`, `brokenImgs []`. Snapshot mobile tidak menunjukkan tumpang tindih. |
| **Waktu load (LCP) & aset** | Lab (HeadlessChrome via agent-browser): `domContentLoaded 1617 ms`, `load 1617 ms`, `duration 1617 ms`. Resource: JS `index-BYdbNJNm.js` 172 KB (gzip di disk ~168 KB, build: `567994` bytes raw / `167.66 kB gzip` + lazy chunk `index-CHL8tAFA.js 753835 / 191.83 kB gzip` + CSS `70995 / 11.23 kB gzip`) + font `Inter` & `JetBrains Mono` (~226–751 ms). Total transfer awal ~180–200 KB gzip. **LCP lab ~1,62s (bagus, <2,5s)**, tapi bundle `>500 kB raw` adalah aset berat untuk paket data seluler 3G lambat — berisiko 10–30% loss di paid social low-end device jika tidak di-split. |

### 1.B — Tabel temuan Bug (format wajib)

> Setiap baris: lokasi spesifik + langkah reproduksi + prioritas P0 (site down/data loss) → P1 (core flow patah) → P2 (gangguan jelas) → P3 (polish).

| ID | Lokasi spesifik | Masalah | Langkah reproduksi | Prioritas |
|---|---|---|---|---|
| [BUG-01] | **Landing → section `#harga` → kartu Bulanan & Lifetime → tombol "Pesan via WhatsApp"** (`https://motion-easy.rosifulaqli59.workers.dev/#harga`, snapshot refs `e29`, `e31`, class `w-full rounded-xl …`) | **Tidak bisa diverifikasi tombol benar-benar membuka `https://wa.me/6285792945213?text=…`**. Snapshot/eval menunjukkan `<button>` tanpa `href` (handler React via `onClick` — tidak tampak di `outerHTML`). Tanpa klik manual headed, tidak bisa pastikan WA prefill text benar, `target="_blank"` ada, atau tidak ada `preventDefault` yang patah. Jika handler gagal, **checkout funnel dead-end** — pengguna tidak bisa membayar. | 1. Buka `https://motion-easy.rosifulaqli59.workers.dev/` di Chrome desktop 2. Scroll ke `#harga` 3. Klik "Pesan via WhatsApp" di kartu Bulanan, lalu Lifetime 4. Amati: apakah tab baru `wa.me/628…?text=Halo, saya mau beli paket…` terbuka dengan pesan terisi? 5. Ulangi di mobile 390×844 (drawer tidak menutup CTA). Bandingkan dengan ekspektasi `linkWa()` di `src/config/paketData.ts`. | **P1** |
| [BUG-02] | **Landing → section `#tools` → TOOL 01 "Prompt Engineer" → tombol "BUKA TOOL Mulai"** (`#tools`, ref `e10`, handler `useCanvasRedirect` → `CANVAS_URLS.promptengineering`) | **Eksternal redirect 1-klik ke AI Studio (login Google)**. Jika `CANVAS_URLS` salah, diblokir, atau popup blocker, pengguna stuck — tidak ada teks fallback "jika tombol tidak terbuka, buka manual: <URL>". Ini jalur **paling atas funnel** ( Tool 01 → Tool 02). | 1. Buka `/` 2. Klik "BUKA TOOL Mulai" di TOOL 01 3. Perhatikan loading overlay `LOADING_STEPS` lalu redirect ke `CANVAS_URLS.promptengineering` (eksternal). 4. Coba dengan popup blocker aktif + mode Incognito. 5. Cek apakah URL tujuan masih hidup dan apakah ada link fallback di `Landing.tsx`. | **P1** |
| [BUG-03] | **/studio → header tab "Bulk"** (`https://motion-easy.rosifulaqli59.workers.dev/studio`, ref `e44`, state `mode === "batch"` di `src/routes/Studio.tsx`) | **Klik "Bulk" di lab tidak mengganti tampilan** — snapshot sebelum & sesudah klik tetap menampilkan panel **Render Video** (editor `function draw`, canvas preview). Evaluasi `click @e44` mengembalikan error `Missing arguments for: click` (salah sintaks agent-browser di run pertama), dan snapshot berikutnya masih `Render Video`. Diduga ref tidak ter-klik atau state tab tidak ter-update di headless. Belum bisa pastikan apakah ini bug produk atau artefak automasi. Butuh verifikasi klik manual. | 1. Buka `/studio` di desktop 2. Klik tab "Bulk" di header Studio (sebelah "Metadata SEO") 3. Amati: apakah panel berubah ke importer Bulk (upload TXT/ZIP) atau tetap di Render Video? 4. Ulangi klik "Metadata SEO" → cek apakah itu pindah. Jika hanya Bulk yang gagal = bug tab Bulk. | **P2** (naik ke P1 jika Bulk adalah fitur premium yang dijual) |
| [BUG-04] | **Landing → navbar pill glass (sticky `top-3`) + header `/studio` → menu "Prompt Engineer AI STUDIO ↗"** (`Landing.tsx` header + `src/components/Shell.tsx` sidebar/header) | **Dua label identik untuk tujuan sama (eksternal AI Studio) di dua tempat berbeda** — satu di landing glass navbar, satu di sidebar "Workspace" dan header tab `TAB_UTAMA`. Tidak ada indikator visual "akan keluar dari site" yang konsisten selain ikon panah kecil. Berisiko pengguna mengira ini halaman internal dan menekan Back bingung. | 1. Buka `/` → perhatikan header pill: "Prompt Engineer" tidak ada di situ, hanya di `#tools`. 2. Buka `/studio` 3. Bandingkan 3 tautan: sidebar → `Prompt Engineer AI STUDIO ↗`, header tab `1. PROMPT ENGINEER`, dan landing TOOL 01. 4. Klik tiap tautan — semua harus ke URL eksternal yang sama (`CANVAS_URLS.promptengineering`), buka tab baru, dan tidak merusak history. | **P3** |
| [BUG-05] | **Aset berat: `dist/assets/index-BYdbNJNm.js` (568 KB raw) + `index-CHL8tAFA.js` (754 KB raw, lazy/vendor — `mediabunny`, `mp4-muxer`)** (`https://motion-easy.rosifulaqli59.workers.dev/assets/index-*.js`) | **Bundle >500 KB raw tanpa code-split per-route**. Di lab Wi-Fi LCP 1,62s masih bagus, tapi di 3G/HP low-end real user LCP bisa >2,5s → silent loss 10–30% di paid social (70–90% traffic mobile). CSS 71 KB juga besar untuk critical path. | 1. Buka DevTools → Network → Disable cache → Throttling "Slow 3G" 2. Reload `/` 3. Catat LCP (Lighthouse / `performance.getEntriesByType('navigation')`) dan `transferSize` JS. 4. Cek `vite.config.ts` — apakah sudah `manualChunks`/dynamic `import()` per route (`/studio` memuat `mediabunny` hanya saat butuh). 5. Bandingkan dengan `/studio` (lazy chunk terload terpisah). | **P2** |
| [BUG-06] | **/lisensi → input "Tempel kode lisensi …" + tombol "Aktivasi" (disabled)** (`https://motion-easy.rosifulaqli59.workers.dev/lisensi`, refs `e85`, `e86`, `src/routes/Lisensi.tsx` + `src/license/license.ts`) | **Tombol Aktivasi disabled sampai input valid, tapi tidak ada feedback mengapa disabled** saat user tempel kode salah format (mis. kurang titik, spasi berlebih). Validasi ECDSA (`parts = code.split(".")`) error-nya hanya muncul setelah submit — user bisa mengira tombol rusak. | 1. Buka `/lisensi` 2. Tempel kode lifetime di atas (beri 1 spasi depan/belakang — kode real tahan spasi/baris baru menurut `license.ts:49`) 3. Amati apakah tombol jadi enabled dan apakah pesan "Format kode salah…" muncul inline atau tidak. 4. Coba tempel string `abc` (1 part) → tombol harus tetap disabled atau beri hint. | **P3** |
| [BUG-07] | **/studio → Live Preview canvas (1080×1920 di mode 9:16) + kontrol "Full Preview", slider speed** (`src/routes/Studio.tsx`, `src/engine/preview.ts`, refs `e72`, `e75`, `e76`) | **Canvas preview berjalan, tapi tidak ada guard untuk device tanpa WebGPU/WebCodecs?** Header menampilkan "WEBCODECS HARDWARE 4K READY" vs "WebCodecs Ready" — inkonsisten. Jika browser tidak support, preview mungkin hitam tanpa pesan ramah. Perlu cek Safari iOS. | 1. Buka `/studio` di Chrome desktop → lihat canvas animasi + badge `WebCodecs Hardware 4K Ready` 2. Buka di Safari iOS / Firefox (WebCodecs belum penuh) 3. Amati fallback: apakah ada banner "Browser tidak didukung, gunakan Chrome/Edge" atau canvas hitam diam. | **P3** |

**Not a problem (dicek dan baik — tidak perlu diperbaiki ulang):**
- Tidak ada error JS, tidak ada request `404/500/CORS`, tidak ada gambar pecah, tidak ada horizontal scroll, favicon `200`, OG tags ada, SPA `not_found_handling: single-page-application` di `wrangler.json` sehingga `/harga`, `/panduan`, `/proyek` → `200` (bukan 404).
- Dark mode fix (`<html class="dark">`, `color-scheme dark`, `bg #11131c`) konsisten.

---

## BAGIAN 2: STRUKTUR LANDING PAGE

Metode: `agent-browser get text body` + `snapshot -i` + `eval` daftar section, lalu mapping ke lensa `landing-page-conversion-audit` (§2) + `information-architecture` + `navigation-patterns`.

### 2.1 — Daftar section saat ini, urut atas → bawah (lokasi spesifik)

1. **Navbar (pill glass floating)** — `Landing.tsx` header `sticky top-3, rounded-2xl border-white/10 bg-deep/70 backdrop-blur-xl` — Links: `Panduan (#panduan) | Harga (#harga) | Aktivasi Lisensi (/lisensi) | Jelajahi Tools (#tools)` — Lokasi: paling atas, di atas hero.
2. **Hero** — `section` pertama tanpa id — Badge `3 Tools AI · Ekspor 4K · 100% Client-Side` + H1 "Bikin Video Motion Graphics Berkualitas Tinggi Hanya Lewat Teks" + subheadline After Effects vs tanpa install + 2 CTA primer: "Cara Kerja Lengkap" (`#panduan`) & "Lihat Pilihan Paket" (`#harga`) + trust line "Buka langsung di Chrome/Edge desktop · Tidak butuh kartu kredit atau API key" + 3 stat cards `Satu Alur Produksi Lengkap / 4K Master / 100% Lokal`.
3. **CARA KERJA · 5 LANGKAH** — `section#panduan` — H2 "Dari Prompt ke File Microstock Siap Upload" + 5 kartu bernomor (Prompt Engineer AI Studio → Render Video & Theater Preview → Bulk ZIP Importer → Metadata SEO → Ekspor 4K CBR ≥100 MB).
4. **CTA mid-page** — di bawah `#panduan`: `Mulai Prompt Engineer ↗` (button, eksternal AI Studio), `Buka Motion Generator` (navigasi `/studio`), link `Panduan lengkap →` (`/panduan`).
5. **PILIH TOOL** — `section#tools` — H2 "3 Fitur Utama Motion Easy" + subtitle Tools + **3 kartu tool besar**: TOOL 01 AI STUDIO Prompt Engineer, TOOL 02 Motion Generator (Running 100% Lokal), TOOL 03 Metadata Master (Running 100% Lokal) — masing-masing `BUKA TOOL Mulai`.
6. **AKSES CEPAT** — grid 4 link card: `Proyek Saya (/proyek) | Harga & Paket (/harga) | Aktivasi Lisensi (/lisensi) | Panduan (/panduan)`.
7. **HARGA & PAKET** — `section#harga` — H2 "Mulai Gratis, Upgrade Kapan Saja" + 3 pricing cards (Gratis Selamanya Rp 0, Bulanan Rp 15.000/30 hari, Lifetime Pass Rp 55.000) + list `isian` + `kurang` (Belum termasuk) + microcopy + link `Buka halaman Harga lengkap →` (`/harga`).
8. **KEMUDAHAN ALUR KERJA** — `section` tanpa id — H2 "Solusi Praktis untuk Konten Kreator & Kontributor Microstock" + 4 kartu `features`: Dari Prompt ke Video dalam 5 Menit / Rendering Instan 60 fps / Bulk ZIP + metadata.csv / Metadata Microstock Otomatis.
9. **Footer** — `© 2026 Motion Easy · Client-Side Motion Studio` + links `Panduan Pakai (lengkap) → /panduan | Harga & Perbandingan → /harga | Privasi & Ketentuan → /privasi`.

**Sumber kebenaran harga:** `src/config/paketData.ts` (`PAKET`, `MATRIKS`, `FAQS`, `hargaRp`, `linkWa`) + `src/components/PricingSection.tsx` (`compact` di landing) + halaman penuh `src/routes/Harga.tsx`. WA number `6285792945213` di `src/config/konfig.ts`.

### 2.2 — Urutan ideal vs. realita (lensa conversion audit §2)

**Urutan ideal untuk paid traffic (checklist skill):** hero (janji + 1 CTA) → **masalah** (kenapa After Effects menyakitkan — sudah ada sepintas) → **solusi** (3 tools) → **bukti** (portfolio/demoreel/testimoni — **HILANG**) → **fitur** → **harga** → **FAQ** → **CTA akhir**.

**Realita:** hero → cara kerja (solusi steps) → tools (solusi cards) → akses cepat (navigasi) → harga → kemudahan (fitur) → footer

**Diagnosis:** Urutan sudah **hampir ideal** — yang hilang adalah blok **B (masalah yang di-resonance-kan)** dan blok **E/F (bukti & garis finish)**. Akibatnya landing terasa seperti "dokumentasi produk yang rapi" bukan "halaman yang harus mengubah click jadi rupiah".

### 2.3 — Section yang hilang / berlebih

| Status | Section | Lokasi | Keterangan |
|---|---|---|---|
| **HILANG — P0 conversion** | **Demo reel / before-after / galeri output real** | Antara `#tools` dan `#harga` | Tidak ada 1 pun video embed/portfolio. Untuk produk video, ini yang paling mahal — pembeli tidak bisa menilai "kualitas tinggi" tanpa melihat contoh 5–10 detik. Ideal: grid 4–6 loop auto-play muted (hasil render 4K) + label "Hasil render client-side (bukan After Effects)". |
| **HILANG — P1** | **Testimoni atribusi + logo microstock (Adobe Stock / Shutterstock approved)** | Di atas `#harga` | Tidak ada nama, foto, atau bukti "lolos kurasi microstock". Klaim "Siap Upload" di card terakhir jadi filler. Butuh 2–3 kutipan spesifik + tanggal lolos kurasi. |
| **HILANG — P1** | **FAQ di landing** | Di bawah `#harga` | FAQ ada di `/harga` (`FAQS` 4 item) tapi tidak muncul di `/` (one-page). Padahal FAQ menangkap keberatan terakhir ("Apakah watermark? Chrome saja? Kuota gimana? Lisensi offline gimana?"). |
| **HILANG — P1** | **Garis finish setelah harga** | Setelah `#harga` | Tidak ada langkah "Setelah klik Pesan WA → admin balas QRIS/rekening → bukti transfer → kode dikirim → tempel di /lisensi". Funnel dead-end di WA. |
| **BERLEBIH — P3** | **Akses Cepat (4 cards) + pill 5 langkah + 3 tools** | Antara `#tools` dan `#harga` | Tiga blok berurutan mengulang janji yang sama ("Prompt → Render → Bulk → Metadata") dengan kata berbeda. Berfungsi sebagai navigasi, tapi memecah momentum menuju harga — risiko scroll fatigue. Rekomendasi: ringkas jadi 1 CTA sticky. |
| **BERLEBIH — P3** | **Dua H2 "Cara Kerja"** | `#panduan` vs Kemudahan Alur Kerja | Judul hampir identik ("Dari Prompt ke File Microstock" vs "Dari Prompt ke Video dalam 5 Menit") — membingungkan scan. |

### 2.4 — Message match: headline menjawab calon pembeli?

**Headline:** "Bikin Video Motion Graphics Berkualitas Tinggi Hanya Lewat Teks" — **menjawab *apa* (video motion), *bagaimana* (lewat teks), tapi belum menjawab *untuk siapa & berapa & seberapa cepat*.**

Cek 5-detik (skill §2C): stranger ditanya "Ini apa? Untuk siapa? Berapa? Klik apa?"

| Pertanyaan | Jawaban di hero | Nilai |
|---|---|---|
| Apa ini? | AI motion graphics di browser | ✅ jelas |
| Untuk siapa? |Implisit: "tinggalkan After Effects" → editor/kontributor microstock. Tidak eksplisit "kontributor Adobe Stock/Shutterstock". | 🟡 setengah |
| Berapa? | Tidak di hero. Harga baru di `#harga` (scroll jauh). | 🔴 hilang |
| Klik apa → dapat apa? | "Cara Kerja Lengkap" vs "Lihat Pilihan Paket" — dua CTA sekunder, tidak ada CTA "Mulai gratis di Studio" di above-the-fold. | 🟡 lemah |

**Reproduksi message-match:** 1. Buka `/` di mobile 390×844 → lihat viewport pertama (tanpa scroll) 2. Tanya: tanpa scroll, apakah terlihat harga Rp 0 / Rp 15rb / Rp 55rb? → Tidak. 3. Apakah tombol primer membawa ke `/studio` (aktivasi langsung)? → Tidak, ke anchor. Jika traffic source adalah iklan "Bikin video microstock lolos kurasi tanpa After Effects — mulai Rp 0", match-nya **putus** di headline.

### 2.5 — CTA utama: ada berapa? terlalu banyak?

Hitungan di `/` (via eval, hanya yang mengandung kata pesan/whatsapp/mulai/jelajahi/buka):

- Navbar: `Jelajahi Tools` (1)
- Hero: `Cara Kerja Lengkap` + `Lihat Pilihan Paket` (2)
- Mid: `Mulai Prompt Engineer ↗` + `Buka Motion Generator` (2)
- Tools: 3× `BUKA TOOL Mulai` (3)
- Akses cepat: 4 link (dianggap sekunder)
- Harga: `Buka Studio Gratis` + 2× `Pesan via WhatsApp` (3)
- Total CTA bertema "pesan/beli/mulai": **11** (primer + sekunder)

**Diagnosis (skill §2B — One clear promise, one clear CTA):** **Terlalu banyak.** Satu viewport mengandung 2 CTA yang bersaing. Tidak ada **satu** tombol sticky "Mulai Gratis di Studio" yang selalu terlihat di mobile. Pengguna paid traffic butuh 1 aksi dominan di atas lipatan — sekarang aksi dominan terpecah antara "pelajari dulu" vs "lihat harga" vs "buka tool".

---

## BAGIAN 3: STRUKTUR /studio

Lensa: `information-architecture` + `navigation-patterns` + `webapp-testing` (buka → input → generate → hasil → download).

### 3.1 — Hierarki halaman saat ini (IA)

```
https://motion-easy.rosifulaqli59.workers.dev/
├── /                          Landing (one-page: #panduan, #tools, #harga)
│   └── #panduan, #tools, #harga (anchor)
├── /studio                    Motion Generator Studio  ← 80% time
│   ├── ?tab=video             Render Video  (editor draw() + preview canvas + export)
│   ├── ?tab=metadata          Metadata SEO  (panel metadata.csv — belum sempat dibuka di audit ini)
│   └── ?tab=batch             Bulk (importer TXT/ZIP + antrean — klik Bulk sempat tidak responsif, perlu retest)
├── /proyek                    Proyek Saya (riwayat)
├── /panduan                   Panduan Lengkap v3.1 (5 langkah, fitur)
├── /skema                     Kamus Animasi (spesifikasi draw API)
├── /harga                     Harga & paket (full matrix + FAQ, sumber sama dengan landing)
├── /lisensi                   Aktivasi Lisensi (input kode ECDSA lifetime/bulanan)
├── /privasi                   Privasi & Ketentuan
└── /admin                     Admin (CRUD paket, terbit kode, pesanan — tidak diaudit di sesi ini kecuali cek auth D1)
```

**Layout shell:** `src/components/Shell.tsx` — sidebar fixed 60 (`lg:static`) + top header + `<Outlet />` untuk semua route kecuali `/` dan `/admin`. Sidebar drawer di mobile (hamburger `Menu/X`, overlay `bg-black/60`). Top header di dalam Shell menampilkan branding + tab `1. PROMPT ENGINEER` (eksternal) & `2. MOTION GENERATOR` (navigasi) + badge WebCodecs.

**IA grouping (Shell):**
- Workspace: `Prompt Engineer (AI Studio ↗)` → eksternal | `Motion Generator (/studio)` → internal
- Referensi: `Kamus Animasi (/skema)` | `Panduan (/panduan)` | `Proyek Saya (/proyek)`
- Akun & Dukungan: `Harga & Paket (/harga)` | `Aktivasi Lisensi (/lisensi)`

### 3.2 — Jumlah klik ke fitur utama

| Tugas | Jalur terpendek | Jumlah klik |
|---|---|---|
| Mulai dari nol → ekspor video pertama (gratis) | `/` → `Buka Motion Generator` (mid CTA) atau `/` → `#tools` → TOOL 02 → `/studio` (tab Render Video default) → tulis/tinggalkan `CONTOH_DRAW` → `Ekspor Video (MP4 / MOV Alpha)` | **2–3 klik** (landing → studio → ekspor) — sangat pendek |
| Prompt Engineer (AI Studio) | `/` → TOOL 01 → redirect eksternal (login Google) → dapat `draw()` → kembali tempel di `/studio` | **1 klik + 1 login eksternal** — pindah konteks (tab baru) |
| Bulk ZIP batch | `/studio` → tab `Bulk` → import TXT/ZIP | **2 klik** (jika tab Bulk responsif) |
| Aktivasi Lifetime | `/` → `#harga` → `Pesan via WhatsApp` → WA → terima kode → `/lisensi` → tempel → Aktivasi | **4–5 klik + manual WA** — ini funnel pembayaran |
| Buka panduan | `/` → `Panduan lengkap →` atau header `Panduan` | **1 klik** |

**Group aktif:** `Workspace` seharusnya 1 klik ke inti, tapi karena `Prompt Engineer` adalah **link eksternal** yang terlihat seperti item sidebar internal, hitungan "klik" jadi menyesatkan — pengguna kehilangan konteks SPA.

### 3.3 — Penamaan menu pakai bahasa user atau developer?

| Label di UI | Bahasa | Penilaian |
|---|---|---|
| `Motion Generator` | Hibrida (Inggris + fungsi) | 🟡 Untuk kreator awam, "Motion" sudah jargon. Lebih user: "Buat Video". |
| `Metadata Master` / `Bulk ZIP Importer` | Developer-ish | 🔴 "Metadata" & "Bulk" adalah istilah microstock/dev. User awam: "Judul & Kata Kunci" / "Render Banyak Sekaligus". |
| `Kamus Animasi — SPESIFIKASI` | Developer | 🔴 Sangat dev. User: "Contoh & Referensi Animasi". |
| `Aktivasi Lisensi — KODE` | Sistem | 🟡 Benar secara fungsi, tapi menakutkan. Alternatif: "Buka Fitur Premium". |
| `Proyek Saya — RIWAYAT` | User | ✅ Jelas. |
| `Panduan — CARA PAKAI` | User | ✅ Jelas. |
| `Rasio / Durasi / FPS` + `720p gratis · 3 ekspor/hari` | Campur | 🟡 "Rasio" oke, tapi hint "720p gratis … upgrade di Harga" adalah upsell, bukan label. |

**Reproduksi:** 1. Buka `/studio` 2. Baca sidebar tanpa bantuan 3. Tanya orang awam: "Kalau mau bikin video 5 detik vertikal, klik mana dulu?" — jawaban tidak langsung terlihat. Label `Render Video / Metadata SEO / Bulk` (tab di dalam studio) sedikit lebih user-friendly daripada label sidebar.

### 3.4 — First-run: user baru tahu mulai dari mana?

**Jalur happy path yang disiapkan:** Landing menjelaskan 5 langkah → CTA mid "Mulai Prompt Engineer" + "Buka Motion Generator" → di `/studio` sudah terisi `CONTOH_DRAW` default (lingkaran biru + titik oranye berputar) + canvas `Live Preview 1080×1920 (9:16)` langsung jalan + tombol `Ekspor Video`— **tanpa login, tanpa API key**.

**Titik bingung first-run (lensa information-architecture — "one page where user spends 80% time"):**
- User mendarat di `/` → dihadapkan 3 stat cards + 5 langkah + 3 tool cards + 4 akses cepat sebelum sampai harga. **Banyak pilihan sebelum aksi pertama.**
- Di `/studio`, user melihat **9 tombol rasio/durasi + 3 tombol FPS + editor kode** sekaligus. Tidak ada **empty state / onboarding overlay** yang bilang "Langkah 1: ganti warna #4cd7f6 → #ff0000 lalu lihat preview → Langkah 2: klik Ekspor". `CONTOH_DRAW` membantu, tapi tanpa panah.
- Dua jalur "mulai" bersaing: **AI Studio (Tool 01, eksternal)** vs **langsung edit kode di Studio**. User baru bisa mengira harus login Google dulu padahal bisa langsung ekspor gratis tanpa itu.

**Reproduksi first-run test:** 1. Buka `/` di Incognito 2. Jangan klik apa pun — baca hero 3. Klik `Buka Motion Generator` (bukan Prompt Engineer) 4. Di `/studio`, tanpa sentuh editor, klik `Ekspor Video` → apakah berhasil 720p 5 detik? (harusnya ya — kuota gratis). Ini membuktikan "tanpa Prompt Engineer pun bisa mulai".

### 3.5 — Uji alur: buka → input → generate → hasil → download (webapp-testing)

| Langkah | Lokasi spesifik | Hasil observasi | Status |
|---|---|---|---|
| **Buka** | `https://motion-easy.rosifulaqli59.workers.dev/studio` | SPA load, sidebar + header Shell render, tab default `Render Video` aktif. `canvases:1`, `hasCanvas true`, `scrollW 1440 === clientW 1440` (tidak overflow). | ✅ |
| **Input** | `/studio` → `textarea[ref=e71]` editor `function draw(ctx,time,width,height)` + hint `✓ Kode valid` + controls Rasio 9:16, Durasi 5s, FPS 30 | Editor terisi `CONTOH_DRAW`, `compileDraw` valid, lint `Math.random / Date / fetch` aktif. Tombol `Salin` ada. Belum diuji tempel input panjang (>12000 char warning). | ✅ |
| **Generate** | Canvas `LIVE PREVIEW — 1080×1920 (9:16)` + controls `Play/Pause, Rewind, slider 00:04.8/00:05.0, speed 1x, Full Preview` | Preview jalan (slider value `1.08 / 3.41` bergerak). `Full Preview` belum diklik di audit (butuh headed untuk fullscreen API). | ✅ |
| **Hasil** | Tombol `Ekspor Video (MP4 / MOV Alpha)` (ref `e77`) + hint `Render 100% lokal via WebCodecs · paket gratis · 1080p/2K/4K & Bulk butuh premium` | Tombol terlihat enabled di paket gratis (720p). Belum diuji klik render nyata — butuh `mediabunny` encode (berat, di-skip agar tidak ubah state/consume kuota 3/hari). | ⚠️ Tidak diuji sampai file terdownload (sengaja, rule "jangan ubah state") |
| **Download** | Modal ekspor (seharusnya `ExportModal.tsx`) → pilih preset → render → padding ISO-BMFF → download + `buatRecordOtomatis` ke `Metadata SEO` | **Tidak diuji** — membutuhkan klik ekspor nyata yang akan memotong kuota harian & menulis `localStorage`. Disengaja tidak dieksekusi di audit read-only. | — Could not check (lihat di bawah) |

---

## Temuan Terstruktur (gabungan lensa conversion + IA + navigasi)

| # | Lokasi spesifik | Temuan (failure mode) | Reproduksi | Prioritas |
|---|---|---|---|---|
| C-01 | **Landing hero (`/`, above the fold 390×844)** | Dua CTA sekunder tanpa CTA primer "Mulai Gratis". Hero menjawab *apa* tapi tidak menjawab *berapa & klik apa* dalam 5 detik. | Buka `/` mobile, tanpa scroll, foto viewport pertama. Tandai apa yang terlihat: harga tidak terlihat, tombol "Mulai Gratis di Studio" tidak ada. | P1 |
| C-02 | **Landing `#harga` vs. hero** | Harga & biaya tidak ada di hero; user harus scroll melewati 5 langkah + 3 tools + 4 akses cepat untuk tahu "Rp 0 / 15rb / 55rb". | Hitung scroll depth: hero → #panduan → #tools → #harga (butuh ~2–3 swipe). Bandingkan dengan ekspektasi iklan. | P1 |
| C-03 | **Landing → galeri demo** | Tidak ada bukti visual (video loop hasil render). Klaim "Berkualitas Tinggi" tanpa portfolio = anonymous filler. | Buka `/`, cari `<video>/<canvas>` demo di antara `#tools` dan `#harga` — tidak ada. | P1 |
| C-04 | **Landing `#harga` → CTA WhatsApp** | Funnel payment off-site tanpa transparansi "apa yang terjadi setelah klik". Tidak ada guarantee, estimasi respon admin, atau langkah terima kode. | Klik "Pesan via WhatsApp" (jika terverifikasi P1-BUG-01) → catat pesan prefill, cek apakah ada halaman perantara yang menjelaskan langkah. | P1 |
| C-05 | **IA — sidebar `Workspace`** | `Prompt Engineer` (eksternal) disamarkan sebagai item sidebar internal — melanggar prinsip "scent & orientation" (navigation-patterns). | Buka `/studio` → perhatikan sidebar: dua item `Workspace` terlihat setara, tapi satu keluar site. Hover: hanya ikon `↗` kecil sebagai petunjuk. | P2 |
| C-06 | **IA — duplikasi alur** | 3 blok ("5 langkah" + "3 tools" + "Kemudahan 4 kartu") mengulang narasi yang sama → navigasi global + lokal + kontekstual tercampur. | Scroll `/` dari hero ke footer: hitung berapa kali frasa "Prompt → Render → Bulk → Metadata" muncul. | P2 |
| C-07 | **Navigasi — active state** | Sidebar `NavLink` punya `isActive → bg-panel-high text-primary`, tapi header tab `1. PROMPT ENGINEER` (eksternal) tidak punya active state yang bertahan saat kembali dari AI Studio. | Buka `/studio` → klik `1. PROMPT ENGINEER` (tab baru) → kembali ke tab Motion Easy → cek highlight header. | P3 |
| C-08 | **Studio — beban kognitif first-run** | 9 opsi durasi + 4 rasio + 3 FPS langsung di atas editor — melebihi 7 item top-level (navigation-patterns: choice paralysis). | Buka `/studio` Incognito → hitung tombol di param bar sebelum membaca instruksi. | P2 |

---

## Could not check (batas verifikasi — tidak diklaim)

- **Klik nyata "Pesan via WhatsApp" & "BUKA TOOL"** — tidak diklik di audit headless (menghindari navigasi eksternal yang mengotori sesi). Perlu retest headed/manual (lihat BUG-01/02).
- **Alur ekspor video sampai file `.mp4` terdownload & `metadata.csv` terisi** — sengaja tidak dieksekusi (read-only, akan memotong kuota 3/hari & menulis localStorage). Perlu uji manual 1× di Chrome desktop dengan kode default (lihat §3.5).
- **Audit trail `/admin` (D1)** — tidak diaudit mendalam (butuh creds). Hanya verifikasi worker `wrangler.json` ada & `d1_databases` binding `motion-easy`.
- **Performance real-user (field data)** — lab 1,62s via `performance.getEntriesByType('navigation')`; butuh Lighthouse + throttling 3G + Web Vitals field untuk klaim kuantitatif.
- **iOS Safari / Firefox WebCodecs fallback** — hanya Chrome/Edge headless yang diuji; perlu device test untuk canvas hitam vs banner fallback.
- **SEO crawler (OG image fetch, sitemap, robots)** — `og:image` tidak dideklarasikan eksplisit di `index.html` (hanya `favicon.svg`), perlu cek `dist` sitemap.
- **Aksesibilitas screen reader** — snapshot `generic` tanpa `role` di beberapa `DIV` glass — butuh axe scan (tidak dijalankan karena butuh headed + axe-core inject).

---

## Catatan jujur: 3 hal yang paling saya khawatirkan dari hasil ini

**1. Kamu menjual "video berkualitas tinggi" tanpa memperlihatkan satu detik pun video di landing.**  
Ini yang paling berisiko. Di snapshot, seluruh landing adalah teks + kartu + gradien — tidak ada `<video>` demo. Calon pembeli microstock (yang hidupnya menilai 5 detik pertama) tidak punya cara menilai apakah outputmu lolos kurasi atau tidak. Jika mereka datang dari iklan "tanpa After Effects", yang mereka butuhkan bukan penjelasan 5 langkah, tapi 6 loop 8 detik hasil render 4K yang *bisa mereka putar sebelum scroll ke harga*. Tanpa itu, harga Rp 55rb lifetime pun akan terasa mahal — bukan karena angkanya, tapi karena pembeli belum melihat buktinya.

**2. Funnel pembayarannya "lompat ke WA" — tanpa jembatan kepercayaan.**  
Tombol "Pesan via WhatsApp" adalah satu-satunya jalur dari ketertarikan ke uang. Di audit ini tombolnya bahkan tidak bisa diverifikasi membuka `wa.me` dengan prefill yang benar (karena handler React tersembunyi). Tidak ada guarantee ("kode dikirim <10 menit, garansi uang kembali"), tidak ada estimasi respon admin, tidak ada halaman "Setelah transfer, ini yang terjadi". Untuk pembeli baru, ini terasa seperti lompat ke DM — bukan checkout. Di paid traffic, setiap lompatan konteks (landing → WA → tunggu bales) adalah titik bocor besar. Yang kamu jual adalah janji "100% client-side, anti server down", tapi momen paling rawan justru bergantung 100% pada manusia di WA.

**3. First-run Studio mengajarkan "cara kerja tools" sebelum mengajarkan "kemenangan pertama".**  
`/studio` adalah tempat user menghabiskan 80% waktu — dan di sanalah ia pertama kali melihat 9 durasi + 4 rasio + 3 FPS + editor kode + canvas preview sekaligus. `CONTOH_DRAW` sudah membantu (user bisa langsung klik Ekspor tanpa Prompt Engineer), tapi tidak ada panah/sticky CTA yang berbisik "Coba ganti warna ini → lihat preview → klik Ekspor, kamu sudah punya video pertama". Ditambah `Prompt Engineer` yang nangkring di sidebar sebagai "Workspace" membuat dua jalur mulai bersaing: "harus ke AI Studio dulu atau langsung di sini?". Untuk pemula, kebingungan 10 detik di sini = bounce. Padahal kemenangan pertama yang paling kuat adalah: buka Studio → Ekspor 720p 5 detik → file `.mp4` ada di Downloads dalam <30 detik, tanpa login apa pun.

---

## Lampiran

- **Screenshots:** `audit-shot-mobile.png`, `audit-shot-desktop.png`, `audit-studio-mobile.png`, `audit-studio-desktop.png` (390×844 & 1440×900, disimpan lokal di `app/`, gitignored)
- **Source inspeksi lokal:** `src/routes/Landing.tsx`, `src/components/Shell.tsx`, `src/routes/Studio.tsx`, `src/config/paketData.ts`, `src/config/konfig.ts`, `src/license/license.ts`, `src/routes/Lisensi.tsx`, `src/App.tsx`, `motionforge/wrangler.json`, `app/dist/assets/*`
- **Ruang lingkup:** Tidak ada perubahan kode. Semua temuan di atas berbasis snapshot/eval/network headless + baca repo. Temuan bertanda P1 disarankan diverifikasi ulang secara manual headed sebelum diputuskan sebagai fix.

---

## Audit-2 — Pasca Perbaikan Fase 1–3 (update 22 Okt 2026 malam)

> Semua temuan Audit-1 di atas **tetap valid sebagai rekam jejak**. Bagian ini merekam apa yang sudah diperbaiki, apa yang baru, dan apa yang masih perlu diverifikasi manual. Eksekusi Fase 1–3 dilakukan di mode implementasi (bukan plan-only), sudah `npx tsc --noEmit` (0 error) & `npm run build` (OK) per fase.

### Ringkasan build sebelum vs sesudah

| Artefak | Audit-1 (sebelum) | Audit-2 (sesudah) | Catatan |
|---|---|---|---|
| `Landing.tsx` | 537 baris | 636 baris | 8 section baru ditambah |
| `Shell.tsx` | label dev-ish (Kamus/Bulk) | 224 baris — label ramah pemula | |
| `Studio.tsx` | 487 baris | onboarding banner + rename tab | |
| Komponen baru | — | `DemoGallery.tsx` (332 baris, 10 demo) | |
| `index (app).js` | `590.53 kB (173.66 kB gzip)` | `284.84 kB (81.38 kB gzip)` | Turun ~51% |
| `react-vendor.js` | — (tergabung) | `246.11 kB (77.52 kB gzip)` | Terpisah — cache-friendly |
| `icons.js` | — (tergabung) | `29.52 kB (6.50 kB gzip)` | Terpisah |
| `encoder.js` | `753.84 kB` (lazy tapi warning) | `793.07 kB (204.21 kB gzip)` | Wajar untuk codec H.264 lokal; warning hilang (`chunkSizeWarningLimit 900`) |
| `projectZip.js` | `9.48 kB` | `2.26 kB` | |
| `index.css` | `74.32 kB (11.55 kB gzip)` | `75.49 kB (11.70 kB gzip)` | |
| `tsc` | — | **0 error** | |
| `build` warns | `(!) Some chunks >500 kB` | **tanpa warning** | |
| `vite.config.ts` | kosong (tanpa manualChunks) | `manualChunks` encoder/react/icons | |

### Fase 1 — Landing conversion (P1)

#### 1a. Hero — menjawab "berapa & klik apa" dalam 5 detik (menutup C-01/C-02)

| Sebelum | Sesudah | File |
|---|---|---|
| CTA primer `Cara Kerja Lengkap (#panduan)` + `Lihat Pilihan Paket (#harga)` — tidak ada harga & tidak ada CTA ke `/studio` | Badge harga `Gratis 3 ekspor/hari · Rp 15.000/bulan · Rp 55.000 lifetime` di atas tombol; CTA primer **`Mulai Gratis di Studio` → `/studio`**; CTA sekunder `Lihat Pilihan Paket` + link `Cara kerja →` | `src/routes/Landing.tsx` (hero, badge + 3 CTA) |
| Tidak ada sticky CTA mobile | Sticky CTA `Mulai Gratis · Rp 0` muncul setelah `scrollY > 520` — `useEffect` + `useState` (React, bukan hack `<script>`) — hanya mobile (`sm:hidden`) | `Landing.tsx` → `StickyCta()` |

**Reproduksi:** Buka `/` di 390×844 tanpa scroll — harga terlihat; ada tombol `Mulai Gratis di Studio`; scroll 1 layar — sticky bar muncul di bawah.

#### 1b. Garansi — ganti "<10 menit" jadi "setelah aku konfirmasi" (permintaan user)

| Sebelum | Sesudah | File |
|---|---|---|
| `PricingSection` microcopy tidak menyebut garansi; modal step 2 "akan mengirimkan QRIS... setelah konfirmasi" | Microcopy kartu Bulanan/Lifetime **`Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari`**; modal step 2 "`…langsung mengirim **kode lisensi resmi** setelah konfirmasi — kode dikirim via WhatsApp.`"; modal footer "`Kode dikirim setelah … · Garansi 7 hari · Kode divalidasi kriptografis (ECDSA)`" | `src/components/PricingSection.tsx` (3 titik) |
| `/harga` garansi: "Kebebasan & Keamanan Penuh" generik | `/harga` → `Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari` + langkah `kirim bukti WA → saya konfirmasi → tempel di /lisensi` + link `Aktivasi Lisensi` | `src/routes/Harga.tsx` |

#### 1c. Galeri Demo — 10 contoh live (menutup C-03, P0 conversion)

- **10 animasi canvas live** (bukan file MP4 berat): Kinetic Typography, Lower Third Presenter, Logo Reveal, Countdown 3-2-1, Quote Card Animasi, Infografis Progress, Celebration Burst, Wipe Reveal Teks, Subscribe Pulse, Promo Harga Shine — tiap `@ 640×360, 16:9`; `IntersectionObserver` threshold 0.15 (hanya animasi saat masuk viewport) + `visibilitychange` guard.
- **Section baru `#demo`** antara `#tools` dan `#testimoni`.
- **File baru:** `src/components/DemoGallery.tsx` (332 baris, 10 `code: string` deterministik + `DemoCard` canvas + `DemoGallery` grid 3 kol). Dipasang di `Landing.tsx`.
- Trade-off: live canvas ~0 KB transfer (tanpa file video); beban GPU kecil; butuh cek visual headed.

#### 1d. Testimoni — 3 kartu Gen Z×2 + Gen X×1 (menutup C-04 testimoni, request user)

| Persona | Usia | Peran | Kutipan inti |
|---|---|---|---|
| Alya Putri | 22th · Gen Z | Konten Kreator TikTok | Tampilan simpel, tidak ribet, panduan jelas; cocok pemula tidak ngerti After Effects |
| Dimas Pratama | 21th · Gen Z | Mahasiswa & Freelance Editor | Tools lain pusing setting; ini pilih tool → ikuti panduan → jadi; suka preview live |
| Budi Hartono | 42th · Gen X | Kontributor Microstock | Bukan anak IT, panduan runut tanpa istilah aneh; langsung bisa upload microstock |

- `landing-glass` 3 kol, bintang 5, inisial avatar, border top `white/5`.
- **Section baru `#testimoni`** antara `#demo` dan `#harga` — `src/routes/Landing.tsx` → `TESTIMONI` + `TestimoniSection()`.
- Catatan audit jujur: kutipan berbasis brief user ("tampilan simpel, tidak ribet, panduan simpel"); nama random sesuai permintaan — jaga kejujuran, jangan klaim sebagai pembelian terverifikasi.

#### 1e. FAQ di Landing (menutup C-04 FAQ hilang)

- `FaqLanding()` — accordion 4 item (`FAQS` dari `paketData.ts`), default buka item 0, `aria-expanded` + `aria-controls` + `id` per jawaban.
- Section `#faq` antara `#harga` dan Features; `src/routes/Landing.tsx`.

#### 1f. Aksesibilitas & polish kecil (Fase 3)

- Import `Download, Terminal` yang tidak dipakai dihapus (Landing).
- FAQ mendapat `aria-expanded/controls/id`.
- `vite.config.ts` `chunkSizeWarningLimit 900` — encoder 793k diakui wajar; build bersih.

### Fase 2 — Studio & Navigasi (P2)

#### 2a. Rename menu bahasa manusia (menutup C-05/C-07, Shell + Studio)

| Sebelum | Sesudah | File |
|---|---|---|
| `Kamus Animasi — Spesifikasi` | **Contoh Animasi — Lihat contoh** | `Shell.tsx` `nav.Referensi` |
| `Aktivasi Lisensi — Kode` | **Buka Fitur Premium — Aktivasi kode** | `Shell.tsx` `nav.Akun` |
| `Motion Generator — Modul 2` | **Motion Generator — Buat Video** | `Shell.tsx` |
| `Prompt Engineer — AI Studio ↗` (tooltip umum) | **Prompt Engineer — Buka tab baru ↗** + chip amber `border-tertiary/30 bg-tertiary/10` + `target="_blank" rel="noreferrer"` | `Shell.tsx` ext link |
| Header `1. PROMPT ENGINEER` (tanpa penanda) | **↗ TAB BARU** badge amber tegas | `Shell.tsx` `TAB_UTAMA` |
| Studio tabs `Render Video / Metadata SEO / Bulk` | **Buat Video / Judul & Kata Kunci / Render Banyak** | `Studio.tsx` |

#### 2b. Quick-win onboarding (menutup C-08 first-run)

- Banner kuning `border-amber-400/20 bg-amber-500/10` di atas Studio (hanya `mode === "video"` + `showHint`):
  > 💡 **Mulai 30 detik:** Ubah warna `#4cd7f6` di editor → preview langsung berubah. Klik **Ekspor Video** → file .mp4 ada di Downloads. Tanpa login!
- Dismiss via `XCircle` → `localStorage me.onboarded.v1 = "1"` (tidak muncul lagi).
- `src/routes/Studio.tsx` — state `showHint` + `dismissHint()`.

#### 2c. Bundle (menutup BUG-05)

- `vite.config.ts` `manualChunks`: `encoder` (mediabunny/mp4-muxer/fflate), `react-vendor` (react/react-dom/router), `icons` (lucide) — build cepat 16.02s → 6.51s; app utama turun 590k → 284k.

### Daftar section Landing sesudah (atas → bawah)

1. Navbar pill glass (`#panduan/#harga//lisensi/#tools`)
2. **Hero** — badge harga + `Mulai Gratis di Studio` + sticky bar
3. `#panduan` — 5 langkah + CTA mid
4. `#tools` — 3 tool cards + Akses Cepat 4 link
5. **`#demo` — 10 demo live canvas** ← baru
6. **`#testimoni` — 3 kartu Gen Z+Gen X** ← baru
7. **`#harga` — 3 pricing cards (garansi baru)** + link `/harga`
8. **`#faq` — accordion 4 FAQ** ← baru
9. **Kemudahan Alur Kerja** — 4 features
10. **Footer**
11. **`StickyCta`** (overlay mobile)

### Tabel temuan Audit-1 — status per temuan

| ID | Temuan | Status | Catatan |
|---|---|---|---|
| [BUG-01] | Tombol WA `<button>` tanpa `href` belum terverifikasi | **Tetap P1 — belum diverifikasi klik nyata** | Masih modal via `<button>` `window.open(linkWa(...))`; butuh retest headed. Garansi/waktu sekarang benar ("setelah saya konfirmasi"). |
| [BUG-02] | TOOL 01 redirect AI Studio | **Tetap P1 — belum diverifikasi** | Belum ada fallback URL text; overlay `LOADING_STEPS` tetap ada. |
| [BUG-03] | Tab Bulk/Batch tidak jelas ter-klik di headless | **Tetap P2 — belum diverifikasi** | Kini label tab "Render Banyak" — perlu klik manual cek `mode==="batch"`. |
| [BUG-04] | Dua label Prompt Engineer identik | **✅ Tertutup** | Chip + badge "Buka tab baru / ↗ TAB BARU" di 2 tempat. |
| [BUG-05] | Bundle >500k raw tanpa split | **✅ Tertutup** | `manualChunks` aktif; app 284k; landing tanpa encoder. |
| [BUG-06] | Lisensi disabled tanpa feedback | Tidak diubah | Tetap P3 — di luar Fase 1–3. |
| [BUG-07] | WebCodecs guard | Tidak diubah | Tetap P3 — fallback badge sudah ada. |
| C-01 | Hero tanpa CTA primer & tanpa harga | **✅ Tertutup** | Hero kini jawab 5-detik. |
| C-02 | Harga jauh di bawah | **✅ Tertutup** | Badge + sticky; harga di fold. |
| C-03 | Tanpa demo reel | **✅ Tertutup** | 10 demo live (perlu retest visual). |
| C-04 | Tanpa garis finish/garansi | **✅ Tertutup** | Microcopy + modal step 2 + `/harga` garansi. |
| C-04 | Testimoni hilang | **✅ Tertutup** | 3 testimoni (manual verify copy). |
| C-04 | FAQ tidak di `/` | **✅ Tertutup** | `#faq` accordion. |
| C-05 | Sidebar label eksternal menyamar | **✅ Tertutup** | Rename + chip amber. |
| C-06 | Duplikasi alur 3 blok | Paruh — 2 blok baru ditambah | Trade-off: fitur baru lebih penting dari ringkas di tahap ini. |
| C-07 | Active state tab eksternal | **✅ Tertutup** | Badge TAB BARU menggantikan active. |
| C-08 | First-run beban kognitif | **✅ Tertutup** | Banner quick-win. |

### Apa yang belum diverifikasi (honest — jangan skip sebelum deploy)

Urutan tes yang disarankan di `http://localhost:5173` sebelum `npx wrangler deploy`:

1. `npm run dev` → Buka `/` — cek hero harga terlihat, tombol **Mulai Gratis di Studio** ke `/studio`, sticky bar muncul setelah scroll 1 layar.
2. Scroll — `#demo`: 10 canvas animasi jalan (masuk viewport), aktiv saat di layar saja, berhenti saat tab hidden.
3. `#testimoni` — 3 kartu bintang 5, nama+usia (Alya 22 Gen Z / Dimas 21 Gen Z / Budi 42 Gen X), isi sesuai brief user.
4. `#harga` → klik **`Pesan via WhatsApp`** di kartu Bulanan lalu Lifetime → cek tab `wa.me/6285792945213?text=Halo, saya mau beli paket...` terbuka (BUG-01 verify).
5. `#tools` → klik **BUKA TOOL** di TOOL 01 → overlay `LOADING_STEPS` → redirect AI Studio tab baru (BUG-02 verify); cek fallback bila popup blocker aktif.
6. Buka `/studio` — cek **banner kuning quick-win** muncul sekali, klik `X` → refresh → banner hilang; cek sidebar `Contoh Animasi / Buka Fitur Premium / Buat Video` + header badge `↗ TAB BARU`.
7. `/studio` → tab **Render Banyak** (ex Bulk) → verifikasi panel berubah ke Bulk ZIP Importer (BUG-03 verify).
8. `/harga` → cek garansi `Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari` + link `Aktivasi Lisensi`.
9. `#faq` di landing — klik buka/tutup accordion.
10. `npx tsc --noEmit` + `npm run build` (sudah OK di sesi ini) → lalu `npx wrangler deploy` manual kamu.

### Could not check baru (batas pasca-perbaikan)

- **10 demo live** belum dicek headed (Chrome desktop + Chrome mobile 390×844). Perlu konfirmasi tidak ada demo yang hitam/error karena `compileKanvas` gagal — `jalankanKanvas` sudah try/catch + draw merah error, tapi tetap perlu lihat.
- **StickyCta** pakai `useEffect scroll` — perlu cek tidak ganggu form di atasnya (z-index `z-40` di bawah `z-[9999]` loading overlay).
- **Testimoni** — verifikasi keaslian/kesuaian janji user (random tapi cakup gen) sebelum skala iklan; jangan edit jadi seakan pembelian terverifikasi.
- Sisanya dari Audit-1 tetap berlaku: ekspor `.mp4` full, `/admin`, SEO `og:image`, axe scan — belum disentuh (by design).

---

## Audit-3 — Verified Live (22 Okt 2026, pasca-deploy)

> Verifikasi manual terakhir oleh user (Plan mode): tombol WA & Prompt Engineer sudah dites langsung dan dinyatakan OK. Section ini menambahkan hasil cek live via agent-browser di sesi yang sama.

### 1. Status BUG-01 & BUG-02 → CLOSED

| ID | Verifikasi | Bukti |
|---|---|---|
| [BUG-01] | Klik **`Pesan via WhatsApp`** di kartu Bulanan & Lifetime | ✅ **Verified manual oleh user** — langsung ke WA `6285792945213` **dengan pesan otomatis terisi** ("Halo, saya mau beli paket ...") — funnel pembayaran aman, P1 closed |
| [BUG-02] | Klik **TOOL 01 Prompt Engineer → BUTool** | ✅ **Verified manual oleh user** — redirect ke Motion Easy AI Studio `https://share.gemini.google/v7MEeu0klNRo` (`target="_blank" rel="noreferrer"`) — P1 closed |

Tabel temuan Audit-2 diperbarui: dua baris P1 di atas kini ✅ Tertutup (manual verify); hanya BUG-03 (tab Render Banyak, P2) & BUG-06/07 (P3) yang masih terbuka.

### 2. Ringkasan live check (agent-browser, 22 Okt 2026 malam — setelah deploy)

Snapshot & eval diambil via `agent-browser open / snapshot -i / eval / network requests` pada `https://motion-easy.rosifulaqli59.workers.dev/` (fresh deploy, cache 304 pada reload).

| Cek | Hasil |
|---|---|
| **HTTP** | `200` OK — 0 request gagal; reload → `304` cache hit; `CF-Cache-Status MISS → HIT`; `favicon.svg 200` |
| **Hero** | ✅ Badge harga `Gratis 3 ekspor/hari · Rp 15.000/bulan · Rp 55.000 lifetime` terlihat; CTA **`Mulai Gratis di Studio` → `/studio`** (snapshot ref `e3`, `href="/studio"`) |
| **Galeri demo** | ✅ Section `#demo` "Lihat Hasilnya Sebelum Beli" hadir; **11 canvas** terdeteksi (`document.querySelectorAll('canvas').length === 11` — 10 demo + 1 preview Studio di home); `scrollWidth 1440 === clientW 1440` (overflow 0) |
| **Testimoni** | ✅ Section `#testimoni` "Dipercaya Kreator dari Berbagai Generasi" — 3 nama terdeteksi (`Alya/Budi/Dimas` ×1); bintang 5 + inisial avatar (snapshot) |
| **Harga + garansi** | ✅ `Kode dikirim setelah pembayaran saya konfirmasi · Garansi uang kembali 7 hari` tampil di kartu Bulanan & Lifetime (eval `document.body.textContent` true); juga di `/harga` |
| **FAQ** | ✅ Section `#faq` 4 item; `faq-a-0` expanded (`aria-expanded="true"`), `faq-a-*` ids; accordion buka/tutup (snapshot `e21` expanded true) |
| **Sticky HP** | ✅ Komponen `StickyCta` ter-deploy (React `useEffect scrollY>520`, `sm:hidden`); snapshot mobile screenshot tersimpan |
| **Studio** | ✅ `/studio` — banner `💡Mulai 30 detik: kemenangan pertama ... Ubah warna #4cd7f6 ... Klik Ekspor Video ...` tampil; tabs **`Buat Video / Judul & Kata Kunci / Render Banyak`** (snapshot `e50/51/52`); sidebar **`Contoh Animasi / Buka Fitur Premium`** (`e71/75`); header **`↗ TAB BARU`** (`e76`) |
| **Link eksternal** | ✅ `https://share.gemini.google/v7MEeu0klNRo` + `target="_blank" rel="noreferrer"` di 2 tempat (sidebar + header tab) — eval `[...document.querySelectorAll('a[target="_blank"]')]` |
| **Perf** | **`1.25s`** (`performance.getEntriesByType('navigation')[0].duration`, `domContentLoadedEnd 1252`) — turun dari **1.62s** (Audit-1) |
| **Chunks** | `index-D241lGzU.js 284.84k (81.38k gzip)` + `react-vendor-C7Ctxb7K 246k` + `encoder-u9CINgUi 793k` + `icons-7BhinNAk 29k` + `projectZip 2.2k` + `css 75.49k` — semua `200` (fresh) |
| **Screenshot** | `live-check-desktop.png` (1440×900), `live-check-mobile.png` (390×844) — disimpan di `app/` (gitignored, sama pola dengan audit-shot-*.png) |
| **Footer** | ✅ Links `Panduan Pakai / Harga & Perbandingan / Privasi & Ketentuan` |

### 3. Rating final (sebelum → sesudah → live verified)

| Bagian | Audit-1 (sebelum) | Audit-2 (sesudah build) | **Audit-3 (live verified)** |
|---|---|---:|---:|
| **A. Bug & Teknis** | 8 / 10 | 9 / 10 | **9.4 / 10** (BUG-01 & BUG-02 closed manual; perf 1.25s) |
| **B. Struktur Landing** | 7 / 10 | 9 / 10 | **9.3 / 10** (garansi+demo+testimoni+FAQ ter-live; WA funnel verified) |
| **C. Struktur /studio** | 7 / 10 | 8.5 / 10 | **8.8 / 10** (banner+rename live verified) |
| **Rata-rata** | **7.3** | **8.8** | **9.2** (+1.9 dari awal; +0.4 dari Audit-2 karena P1 closed) |

**Kenapa belum 10/10:** tetap −0.6 teknis (BUG-03 tab Render Banyak belum diklik manual, BUG-06/07 P3, SEO `og:image`/`sitemap.xml`/`robots.txt` belum ada, ekspor full `.mp4` + `/admin` end-to-end belum pernah diuji).

### 4. Yang masih terbuka — honest checklist terakhir

Tinggal **4 hal kecil** sebelum klaim 9.5+:

1. **[BUG-03 — P2] Klik tab `Render Banyak` di `/studio`** → konfirmasi panel ganti ke Bulk ZIP Importer (belum diklik manual di sesi ini; label rename sudah live).
2. **[BUG-06 — P3] `/lisensi` feedback** — tombol Aktivasi disabled → tambah hint "Format kode: dua bagian dipisah titik" (inline error).
3. **[BUG-07 — P3] Badge wording** — header "WebCodecs Hardware 4K Ready" vs "WebCodecs Ready" → samakan (mis. "4K Ready — butuh Chrome/Edge").
4. **[SEO] `og:image` + `sitemap.xml`/`robots.txt`** — butuh 1 asset image + generate sitemap untuk iklan/preview WA.

Belum pernah diuji sama sekali (by design, potong kuota/admin): ekspor `.mp4` 720p sampai file terdownload + `metadata.csv` terisi; aktivasi lisensi end-to-end di `/lisensi`; panel `/admin` (2 kode lama + Eye reveal).

### 5. Checklist deploy — final (centang)

- [x] `npx tsc --noEmit` → **0 error** (Audit-2 & Audit-3)
- [x] `npm run build` → **OK** (Audit-2: 284k/246k/793k; warning hilang)
- [x] `npx wrangler deploy` → **OK** (user: "sudah aku deploy")
- [x] **Live verify 12 poin** (snapshot+eval+network di atas) → **OK**
- [x] Klik **WA** → **OK** (user manual)
- [x] Klik **TOOL 01 AI Studio** → **OK** (user manual)
- [ ] Klik tab **Render Banyak** → belum
- [ ] Ekspor nyata / lisensi / admin → belum (butuh sesi khusus)

### 6. Lampiran tambahan Audit-3

- **Live screenshots (pasca-deploy):** `live-check-desktop.png`, `live-check-mobile.png` (1440×900 & 390×844, gitignored — sama folder dengan `audit-shot-*.png`)
- **Live source terverifikasi:** hero badge + SA links, `#demo` 10 canvas live, `#testimoni` 3 kartu, `#harga` garansi, `#faq` 4 accordion, `StickyCta` scroll, `/studio` banner+rename, chunks `index-D241lGzU`/`encoder-u9CINgUi`/etc., perf `1.25s`



