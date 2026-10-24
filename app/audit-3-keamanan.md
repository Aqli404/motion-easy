# Audit 3 — Keamanan Sistem Lisensi Premium (Motion Easy)

> **Aturan audit:** JANGAN ubah kode. Setiap temuan punya skenario eksploitasi konkret. Yang aman ditulis di bagian "Aman".
> Tanggal: 2026-01-04 · Build live: `index-CTn9lutz.js` · Worker: `motion-easy.rosifulaqli59.workers.dev` · D1: `motion-easy (0b1658…)`

---

## Ringkasan eksekutif (jujur)

Arsitektur lisensi Motion Easy adalah **offline-first yang disengaja**: kode ECDSA P-256 ditandatangani dengan private key di `.rahasia` (local) atau di Worker (`LICENSE_PRIVATE_KEY_JWK`), diverifikasi di browser dengan `PUBLIC_KEY_JWK`. Tidak ada server render — jadi **gating premium memang client-side**. Itu bukan bug, itu trade-off produk.

Artinya: **palsu tidak bisa** (signature), tapi **share & jam mundur bisa**. Untuk harga Rp 15–55k dan target awal <100 user, ini **bisa diterima** — asal ekspektasi dijelasin jujur dan mitigasi murah dikerjain dulu (jam mundur). Device-binding / aktivasi server baru worth it setelah ada traksi.

---

## 1 — Kebocoran Kunci

### Aman (tidak ada kebocoran ditemukan)

| Item | Bukti (cara cek) | Status |
|------|------------------|--------|
| Private key tidak ikut bundle client | `Select-String dist/assets/*.js "rahasia|lisensi-master"` → 0 hit. `konfig.ts` hanya `PUBLIC_KEY_JWK` (x,y) | ✅ Aman |
| `.rahasia/` gitignored | `motionforge/.gitignore` berisi `.rahasia/` dan `**/lisensi-master-private.json` — `git ls-files --others` tidak menampilkan isi `.rahasia` | ✅ Aman |
| Private key tidak terekspos di network | `tools/lisensi.mjs` menulis ledger lokal; Worker `issueLicenseCode` baca `env.LICENSE_PRIVATE_KEY_JWK` (Cloudflare secret), response hanya `code` (payload.signature) bukan JWK | ✅ Aman |
| `PUBLIC_KEY_JWK` di client | Sengaja publik — verifikasi butuh ini. Tidak sensitif. | ✅ Aman (by design) |
| `.wrangler/cache` tidak commit | `git status` menunjukkan `?? .wrangler/` untracked, tidak ada secret di repo | ✅ Aman |

**Catatan:** Lakukan `git log --all -p | grep -i "BEGIN PRIVATE KEY"` sekali sebelum repo dipublik. Jika pernah ter-commit, **rotate key** (generate baru, update `PUBLIC_KEY_JWK` + `LICENSE_PRIVATE_KEY_JWK` secret, terbitkan ulang 2 kode yang sudah ada).

---

## 2 — Validasi Waktu (WAKTU PERANGKAT)

> Semua cek `exp` pakai `Date.now()` — jam OS pembeli.

| ID | SEVERITY | File | Celah | Skenario eksploitasi (langkah user) | Dampak bisnis | Rekomendasi | Effort |
|----|----------|------|-------|--------------------------------------|---------------|-------------|--------|
| [SEC-01] | **High** | `src/license/license.ts:91,122,170` — `verifikasiKode`, `muatLisensi`, `premiumAktif` | `exp * 1000 <= Date.now()` — waktu dari OS, bukan server | 1. Beli Bulanan 30 hari. 2. Setelah 30 hari, lisensi expired (`premiumAktif=false`). 3. User buka Settings OS → mundurkan tanggal 20 hari (atau `timedatectl set-time`). 4. Reload `motion-easy` → `Date.now()` mundur → `exp > Date.now()` lagi → Premium aktif kembali. 5. Ekspor 2K/4K & Bulk ZIP jalan lagi. | Bulanan bisa dipakai selamanya oleh user yang mau utak-atik jam. Revenue bocor bertahap; tidak massal tapi 100% berhasil untuk yang niat. Lifetime tidak terdampak (exp=null). | **Mitigasi murah (tanpa server):** simpan `lastSeen = max(Date.now(), saved)` di `localStorage` (`me.license.clock.v1`). Saat `Date.now() < lastSeen - 5 menit` → tolak + tampilkan "Jam perangkat mundur, sinkronkan waktu". Update `lastSeen` setiap `verifikasiKode` sukses. **Mitigasi kuat:** endpoint `/api/time` (Worker `Date.now()`) — cek opsional saat online, cache 24 jam, fallback ke jam lokal jika offline. | 2–3 jam (local) / +1 jam (endpoint) |
| [SEC-02] | **Medium** | `src/license/license.ts:147-164` `validasiUlangTersimpan` | Tidak ada monotonic clock / `iat` future check | 1. User set jam maju 1 tahun → `iat` di payload (ditandatangani) jadi "masa depan" tidak ditolak. 2. Kombinasi dengan SEC-01: jam maju-mundur bisa bikin `lastSeen` lompat. 3. Saat ini `iat` tidak divalidasi sama sekali. | Bisa bikin logika `lastSeen` bingung kalau nanti ditambah tanpa guard. Tidak langsung bocor uang, tapi melemahkan mitigasi jam. | Tambah guard di `verifikasiKode`: tolak jika `payload.iat *1000 > Date.now() + 5 menit` ("jam perangkat belum sinkron"). | 0.5 jam |

**Berapa lama celah dipakai?** Selama user tidak mengembalikan jam — **tak terbatas**. Bulanan yang sudah expired bisa hidup terus dengan jam mundur 15–30 hari. Tidak butuh internet, tidak terdeteksi server.

---

## 3 — localStorage Tampering

| ID | SEVERITY | File | Celah | Skenario eksploitasi | Dampak | Rekomendasi | Effort |
|----|----------|------|-------|----------------------|--------|-------------|--------|
| [SEC-03] | **High** (bisnis) | `src/license/license.ts:103-106,113-127` + `src/routes/Lisensi.tsx:38` | Lisensi bisa di-clone ke N perangkat tanpa batas — tidak ada device binding / aktivasi server | 1. Pembeli A dapat kode `xxxx.yyyy` (Lifetime 55k). 2. A kirim string kode via WA/Telegram ke B, C, D. 3. B/C/D buka `/lisensi` → tempel → `verifikasiKode` → `simpanLisensi` → Premium aktif di device mereka. 4. Validasi tanda tangan tetap lolos karena kode asli. Tidak ada hitungan pemakaian di server. | 1 kode = N user. Di harga 55k, grup share 5–10 orang bikin ARPU anjlok. Tidak terdeteksi karena tidak ada telemetri. | **MVP (diterima):** biarkan, tapi catat risiko; tambah `note` berisi WA pembeli untuk audit manual. **Saat 100 user:** aktivasi server — `POST /api/license/activate` catat `deviceHash`, batasi 2–3 device/kode, tombol "cabut perangkat" di Admin. Butuh D1 tabel `aktivasi`. | 6–10 jam |
| [SEC-04] | **Low** | `src/license/kuota.ts:16,42-51,65-74` | Kuota gratis `me.quota.v1` bisa di-reset | 1. User gratis ekspor 3× → limit. 2. F12 → Application → Local Storage → hapus `me.quota.v1` atau `localStorage.clear()` → reload → `getDailyExportUsage()` baca 0 lagi → ekspor lagi. 3. Atau ubah `date` di JSON jadi kemarin. | Gratis jadi tak terbatas 720/1080p. Tidak bocor premium (2K/4K tetap terkunci `izinPreset`), jadi dampak kecil. | **Sengaja by design** (komen di file sudah jujur). Jika ingin ketat: pindah kuota ke memory + IndexedDB + fingerprint, tapi tetap client-side. Tidak worth it untuk MVP. | 0 (diterima) |
| [SEC-05] | **Medium** | `src/license/license.ts:147-164` | Tampering payload tanpa signature akan ketahuan, **tapi** user bisa edit lalu paste ulang kode asli | 1. F12 → edit `me.license.v1` → ubah `tier:"bulanan"` jadi `"lifetime"` tanpa ubah `code`. 2. Reload → `useLicense` panggil `validasiUlangTersimpan()` → `verifikasiKode(lic.code)` decode payload dari `code` (bukan dari `payload` yang diedit) → `payload.tier` tetap `bulanan` → `cocok=false` → `hapusLisensi()` → kembali gratis. **Gagal.** 3. Jadi tamper **gagal** — sistem sudah benar. | Tidak ada bocor — justru bukti anti-tamper jalan. | Pertahankan `validasiUlangTersimpan` yang bandingkan `payload` dari signature vs `payload` tersimpan. Sudah tepat. | 0 |

**Seberapa mudah edit localStorage?** Sangat mudah — 2 klik di DevTools. **Tapi** edit `tier` tidak berguna karena `validasiUlangTersimpan` verifikasi signature ECDSA P-256 tiap load. Yang mudah dan berhasil adalah **copy-paste kode valid ke browser lain** (SEC-03) — bukan edit.

---

## 4 — Bypass Fungsi Premium (client-only gating)

| ID | SEVERITY | File | Celah | Skenario eksploitasi | Dampak | Rekomendasi | Effort |
|----|----------|------|-------|----------------------|--------|-------------|--------|
| [SEC-06] | **High** (inherent) | `src/license/license.ts:212-243` `izinPreset` + `src/components/ExportModal.tsx` + `src/components/BulkModal.tsx` + `src/export/encoder.ts` | Gating premium hanya di client; render 2K/4K & Bulk ZIP jalan lokal via WebCodecs, tidak ada server yang menolak | 1. User gratis buka `/studio` → F12 Console. 2. `let m = await import("/assets/index-CTn9lutz.js")` atau override: `localStorage.setItem("me.license.v1", JSON.stringify({code:"...",payload:{tier:"lifetime",exp:null}}))` — tapi butuh kode valid. **Jalur lebih mudah:** patch runtime: `import * as L from "./src/license/license.ts"; L.izinPreset = () => ({diizinkan:true})` tidak bisa karena module closure, tapi bisa patch DOM: klik tombol Export yang disabled → di DevTools hapus `disabled` + `pointer-events` → panggil `exportMp4()` langsung dari console dengan `def` curian. 3. Karena `exportMp4` tidak cek lisensi server, video 4K 160 Mbps tetap ter-render di GPU lokal. | User teknikal bisa ekspor 4K tanpa bayar. Tidak massal (butuh skill console), tapi 100% mungkin. Ini konsekuensi **offline-first** — bukan kelalaian. | **Terima untuk MVP** — dokumen jujur: "Premium gate = UX gate, bukan DRM". Jika mau keras: (a) watermark tipis untuk gratis (sudah ada `watermark` di schema?), (b) enkripsi preset 4K-160/200 dengan kunci yang hanya didapat setelah aktivasi online sekali. Tapi itu ubah arsitektur. Untuk sekarang: pertahankan `MIN_TINGKAT` fail-closed (preset tak dikenal → ditolak) — sudah benar. | 0 (terima) / 16+ jam (arsitektur ulang) |
| [SEC-07] | **Low** | `src/license/license.ts:135,139,213` `MODE_DEV` | `MODE_DEV = import.meta.env.DEV` — di prod jadi `false` dan tree-shaken | 1. User buka prod `https://...` → coba `localStorage.setItem("vite:dev","1")` atau cari `MODE_DEV` di `window`. 2. Tidak ada — `grep dist/assets/index-*.js "MODE_DEV"` → 0 hit. Vite ganti `import.meta.env.DEV` jadi literal `false` saat build, dead-code eliminated. | Tidak bisa bypass via MODE_DEV di produksi. | Sudah aman. Jangan pernah ganti jadi `localStorage.getItem("dev")` — pertahankan `import.meta.env.DEV`. | 0 |

**Bisa dipanggil dari console?** Ya — `exportMp4`, `exportQuickTime`, `padMp4Blob` adalah fungsi JS biasa. Tidak ada `fetch("/api/export")` yang butuh token. Ini **sengaja** karena rendering lokal (privasi & biaya). Jadi pertahanannya adalah **ekonomi**: harga murah + mudah beli > repot nge-hack.

---

## 5 — OWASP Umum

| ID | SEVERITY | File | Celah | Skenario eksploitasi | Dampak | Rekomendasi | Effort |
|----|----------|------|-------|----------------------|--------|-------------|--------|
| [SEC-08] | **Medium** | `app/worker/index.js:333-338,496-500` + `wrangler.json` | Tidak ada security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | 1. `curl -i https://.../` → cek header → tidak ada `Content-Security-Policy` / `Strict-Transport-Security`. 2. Jika ada XSS di masa depan, tanpa CSP `script-src 'self'` akan lebih mudah. Tanpa `X-Frame-Options: DENY`, halaman bisa di-iframe untuk clickjacking. | Clickjacking / XSS amplification. Saat ini XSS belum ada (React auto-escape), tapi header adalah defense-in-depth. | Tambah di Worker `fetch` fallback: `new Response(..., {headers: {"Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://www.googleapis.com; frame-ancestors 'none'", "X-Frame-Options":"DENY", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"strict-origin-when-cross-origin", "Strict-Transport-Security":"max-age=31536000; includeSubDomains"}})`. **Hati-hati:** `kanvas.ts:117 new Function` butuh `script-src 'unsafe-eval'` jika CSP ketat — ubah kompilasi ke Worker sandbox atau izinkan `'unsafe-eval'` sementara. | 2 jam |
| [SEC-09] | **Medium** | `app/worker/index.js:333-338` | CORS/Origin check hanya untuk mutasi POST/PATCH/DELETE; GET `/api/admin/config` & `/api/admin/pesanan` tanpa Origin guard | 1. Attacker buat halaman `evil.com` dengan `<img src="https://motion-easy.../api/admin/pesanan?q=">` — tapi butuh cookie `me_admin` HttpOnly + SameSite=Lax → tidak terkirim cross-site (Lax). 2. Jadi **tidak exploitable** saat ini karena `SameSite=Lax` + `HttpOnly`. | Rendah. CSRF via GET tidak bawa cookie. | Pertahankan `SameSite=Lax` + `HttpOnly` (sudah benar). Tambahkan `Origin` check untuk GET sensitif jika mau ketat, tapi tidak urgent. | 0.5 jam |
| [SEC-10] | **Medium** | `app/worker/index.js:413-474` | Rate limiting hanya untuk `login-recovery` (5/15 menit via D1), tidak ada untuk `login` Google & `issue` | 1. Bot brute-force `POST /api/admin/login` dengan JWT palsu — tiap request trigger `fetch JWKS` + `crypto.subtle.verify` (CPU). 2. Tanpa limit, bisa DoS Worker (CPU time). 3. `issue` juga bisa di-spam admin yang sudah login (buat 200 pesanan/detik). | DoS / biaya Worker. Login Google tidak bisa brute-force password (JWT), tapi bisa abuse CPU. | Tambah rate limit generik: KV/D1 counter per IP untuk semua `/api/admin/*` — 60 req/menit/IP. Reuse tabel `login_cobaan`. | 3 jam |
| [SEC-11] | **Medium** | `app/package.json` `react-router-dom 6.28.0` | `npm audit` → 2 moderate: GHSA-wrjc-x8rr-h8h6 (open redirect via backslash), GHSA-337j-9hxr-rhxg (constructor injection via deserializeErrors) | 1. App pakai `useNavigate` & `<Link>` — jika ada link `to={userInput}` tanpa sanitasi, backslash bisa redirect ke origin lain. Saat ini `to` semua hardcoded, jadi tidak reachable. 2. `deserializeErrors` hanya SSR — app ini SPA static, tidak pakai SSR. | Tidak reachable di app ini, tapi audit CI akan merah. | Tunda major upgrade ke `react-router-dom@7.18.4` sampai sempat QA (breaking). Untuk sekarang: `npm audit --audit-level=high` gate di CI (moderate di-allow), jadwalkan upgrade Q1. | 4–6 jam |
| [SEC-12] | **Low** | `app/src/engine/kanvas.ts:117` `new Function("ctx","time",...)` | Kompilasi draw() via `new Function` — jika CSP `unsafe-eval` dimatikan, preview & export pecah | 1. User tempel kode draw() → `compileKanvas` → `new Function` → jika CSP `script-src 'self'` tanpa `'unsafe-eval'` → `EvalError: blocked by CSP`. 2. Saat ini tidak ada CSP, jadi tidak pecah. | Tech debt: nambah CSP nanti akan break fitur inti. | Jika pasang CSP, tambahkan `'unsafe-eval'` sementara, atau pindah kompilasi ke Web Worker dengan `importScripts` sandbox. Dokumentasikan trade-off. | 1 jam (CSP) / 8 jam (Worker) |
| [SEC-13] | **Low** | `app/worker/index.js:400,409,715-717` | Error message dari `e.message` dikirim ke client (`json({ok:false, error:e.message})`) | 1. Trigger error (kirim `credential` kosong) → response `{"error":"..."}` berisi pesan internal. 2. Saat ini pesan sudah generik Indonesia, tidak bocor stack. | Info disclosure minimal. | Pertahankan pesan generik. Di `catch` global, log `e.stack` ke `console.error` saja, kirim `error:"Gagal..."` generik ke client. Sudah cukup baik. | 0.5 jam |
| [SEC-14] | **Low** | `app/src/export/projectZip.ts:12-26` | ZIP import sudah bounded — cek traversal `..`, `files.length` 20, `size` 12 MB | — | — | Sudah aman. Pertahankan guard `file.name.includes("..")` + `startsWith("/")`. | 0 |
| [SEC-15] | **Info** | `app/src/routes/Lisensi.tsx` | `note` payload ditampilkan (`p.note`) tanpa sanitasi khusus — tapi React escape otomatis | 1. Admin isi `note="<svg onload=alert(1)>"` saat issue. 2. Pembeli lihat `/lisensi` → `note` dirender sebagai text (`{p.note}`) → React escape → `<svg…>` jadi teks, tidak dieksekusi. | Tidak XSS karena React. | Tetap aman. Jika pernah pakai `dangerouslySetInnerHTML` untuk note, sanitasi dulu. Saat ini tidak ada. | 0 |

**XSS/CORS ringkas:** `grep -r "innerHTML|dangerouslySetInnerHTML|eval(" src --include="*.tsx|*.ts"` → hanya `new Function` di `kanvas.ts` (intentional, user-local). Tidak ada `innerHTML`. React auto-escape. ✅

---

## Bagian "Aman" — yang sudah benar, jangan diutak-atik

| Area | Bukti | Kenapa aman |
|------|-------|-------------|
| Signature ECDSA P-256 | `license.ts:70-86` import `PUBLIC_KEY_JWK` lalu `crypto.subtle.verify` SHA-256. `tools/lisensi.mjs` sign dengan `crypto.subtle.sign` pakai private JWK. | Palsu butuh private key. Validasi tiap load via `validasiUlangTersimpan` (bandingkan payload dari signature vs payload tersimpan). Edit `tier`/`exp` tanpa signature baru → ditolak & dihapus. |
| Fail-closed preset | `MIN_TINGKAT` + `if (!butuh) return ditolak` (`license.ts:216-217`). `URUTAN` lifetime > bulanan > gratis | Preset baru yang belum didaftar otomatis terkunci, bukan gratis. |
| `MODE_DEV` tidak bocor ke prod | `import.meta.env.DEV` → Vite inline `false` → dead-code eliminated. `grep dist` → 0 hit. | Tidak ada backdoor dev di produksi. |
| Private key storage | `.gitignore` + `wrangler.json` `env.LICENSE_PRIVATE_KEY_JWK` via `wrangler secret put` (tidak di repo). `dist` tidak mengandung JWK privat. | Tidak terekspos ke client / GitHub. |
| Session admin | `worker/index.js:103-127` HMAC-SHA256, `HttpOnly; SameSite=Lax; Secure` (prod), `epoch` invalidation via `sesi_epoch` di D1 | Cookie tidak bisa dibaca JS, tidak terkirim cross-site, bisa revoke massal via `logout-semua`. |
| ZIP traversal guard | `projectZip.ts:24` cek `..`, `\\`, `/`, batas 20 file/12 MB/24 MB total | Zip-slip & zip-bomb tertangani. |
| Kuota honesty | `kuota.ts` komen jujur: "memang bisa diakali lewat DevTools… pembatas wajar" | Ekspektasi benar — tidak klaim anti-curang. |
| Google OAuth verification | `worker/index.js:51-94` cek `alg RS256`, `kid`, `exp`, `iss`, `aud`, `email_verified`, ambil JWKS resmi | Tidak bisa spoof Google token. |

---

## Catatan jujur: CUKUP / WAJIB / TUNDA

### CUKUP diterima untuk MVP harga Rp 15–55k (jangan over-engineer)

- **SEC-03 Share kode** — 1 kode dipakai 5 teman. Di harga segini, biaya bikin device-binding > kerugian share awal. Mitigasi: tulis di FAQ "Lisensi untuk 1 pemilik, share = pelanggaran" + pantau manual via `note` WA. Action kalau ketahuan share massal: revoke manual (hapus pesanan, ganti kode).
- **SEC-04 Kuota reset** — gratis 720/1080p tak terbatas via hapus localStorage. Dampak kecil, bukan revenue.
- **SEC-06 Gating client-only** — selama render lokal, ini inherent. Harga murah + UX beli 1-klik lebih efektif daripada DRM.
- **SEC-11 CVE react-router moderate** — tidak reachable (no SSR, no user-controlled `to`). Tunda major upgrade.
- **SEC-12 `new Function`** — intentional, user-local. Terima.

### WAJIB diperbaiki sebelum terima pembayaran skala (atau sebelum 1 Nov naik ke 75k)

- **[SEC-01] Jam mundur** — **WAJIB.** User bulanan bisa abadi dengan mundurkan jam. Fix murah: `lastSeen` monotonic di localStorage (2–3 jam). Tanpa ini, claim "Bulanan 30 hari" tidak jujur. **Kerjakan sebelum buka order Bulanan.**
- **Backup & rotate key sekali** — pastikan `.rahasia` sudah backup offline (sudah ada `lisensi-terbit.jsonl`), dan `wrangler secret put LICENSE_PRIVATE_KEY_JWK` sudah terisi di prod. Tes `POST /api/admin/issue` dari Admin UI sekali — kalau belum, Bulanan/Lifetime yang diterbitkan offline tidak sinkron D1.
- **Harga & ledger konsisten** — `HARGA` + D1 `paket` + `lisensi-terbit.jsonl` sudah sinkron 15k/55k. Sebelum naik 75k, siapkan skrip `UPDATE paket SET harga=75000 WHERE id='paket-lifetime'`.

### Bisa ditunda sampai ada 100 user / Rp 5–10 jt omzet

- **Device binding / aktivasi server (SEC-03 full fix)** — 6–10 jam. Worth it setelah ada bukti share merugikan.
- **Security headers full (SEC-08)** — 2 jam, tapi butuh uji CSP `unsafe-eval`.
- **Rate limit generik (SEC-10)** — 3 jam, butuh D1 KV.
- **Upgrade react-router 6→7** — 4–6 jam + QA regresi.
- **Server-time check `/api/time`** — 1 jam, butuh fallback offline.

**Rekomendasi urutan 7 hari ke depan:**
1. Hari 1: SEC-01 `lastSeen` (2 jam) + test jam mundur.
2. Hari 2: verifikasi `LICENSE_PRIVATE_KEY_JWK` di prod + 1 issue E2E via Admin.
3. Sebelum 1 Nov: siapkan bonus 20 template + checklist keyword (prasyarat naik 75k) — bukan sekuriti, tapi revenue.
4. Setelah 100 user: device-binding + CSP + rate-limit.

---

## Cara verifikasi temuan (repro)

```bash
# 1. Private key tidak di bundle
Select-String -Path app/dist/assets/*.js -Pattern "lisensi-master|PRIVATE" -SimpleMatch

# 2. Jam mundur
# - Beli/buat kode bulanan exp = now+30d, aktivasi
# - Settings → Date & time → matikan auto → mundurkan 20 hari → reload → premium masih aktif (bug SEC-01)

# 3. Share kode
# - Copy localStorage.getItem("me.license.v1") dari browser A → paste di browser B → premium aktif

# 4. Kuota reset
# - localStorage.removeItem("me.quota.v1") → ekspor lagi

# 5. MODE_DEV tidak di prod
Select-String -Path app/dist/assets/*.js -Pattern "MODE_DEV" -SimpleMatch  # → 0 hit

# 6. Headers
curl -i https://motion-easy.rosifulaqli59.workers.dev/ | grep -i "content-security\|strict-transport"

# 7. npm audit
cd app; npm audit --audit-level=moderate
```

---

## Penutup

Sistem saat ini **cukup aman untuk jualan MVP** — signature kuat, anti-tamper jalan, private key tidak bocor, fail-closed preset benar. Satu lubang yang **wajib ditambal** sebelum klaim "Bulanan 30 hari" adalah **jam mundur (SEC-01)** — fix-nya murah dan tanpa server. Sisanya adalah trade-off offline-first yang jujur: share & console-bypass memang bisa, tapi di harga 15–55k biaya nge-hack > biaya beli.

*Audit ini tidak mengubah kode apa pun — hanya membaca `src/license/*`, `src/config/*`, `worker/index.js`, `package.json`, `dist`, dan `.gitignore`.*
