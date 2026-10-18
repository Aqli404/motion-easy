# Panduan Pengguna Motion Easy

## Dari ide menjadi video MP4

**Website:** https://motion-easy.rosifulaqli59.workers.dev  
**Versi:** 1.0

Motion Easy adalah studio motion graphics yang berjalan langsung di browser. Anda dapat membuat intro, judul, lower third, logo reveal, infografik, background, dan efek partikel tanpa menginstal software editing yang berat.

Alur utamanya:

> Pilih tema → buat brief → gunakan AI → tempel JSON → preview → ekspor MP4

---

## Daftar isi

1. Sebelum memulai
2. Paket Motion Easy
3. Membuat video pertama
4. Mengenal Studio
5. Menggunakan AI dan JSON
6. Preview dan ekspor
7. Aktivasi lisensi
8. Bulk ZIP dan Enlarge-MB
9. Workflow berdasarkan kebutuhan
10. Troubleshooting
11. Checklist ekspor
12. Dokumentasi menu aplikasi
13. Kamus istilah
14. Lampiran template

---

# 1. Sebelum Memulai

Gunakan komputer atau laptop dengan:

- Google Chrome atau Microsoft Edge versi desktop terbaru
- Koneksi internet saat membuka aplikasi dan layanan AI
- Ruang penyimpanan yang cukup untuk file MP4

Motion Easy memakai WebCodecs untuk ekspor video. Chrome dan Edge desktop memberikan dukungan terbaik. Anda tidak perlu membuat akun atau memasukkan kartu kredit untuk mencoba paket Gratis.

Buka website, lalu klik **Buka Studio**.

> **Penting:** proses animasi dan render dilakukan di komputer Anda. Data karya tidak perlu dikirim ke server Motion Easy.

---

# 2. Paket Motion Easy

## Gratis — Rp0

- Ekspor 720p dan 1080p
- 5 ekspor MP4 per hari
- Tanpa watermark
- 20 tema prompt instan
- Live preview di browser
- Kanvas bebas dan efek visual organik
- Cover PNG resolusi penuh
- Tanpa registrasi

Kuota reset otomatis setiap tengah malam berdasarkan waktu lokal perangkat. Ekspor yang gagal atau dibatalkan tidak dihitung.

## Bulanan — Rp15.000 per 30 hari

- Semua fitur Gratis
- Ekspor tanpa batas
- Resolusi hingga 2K
- Bulk ZIP
- Enlarge-MB 10/25/50 MB
- Dukungan prioritas WhatsApp

## Lifetime Pass — Rp55.000 sekali bayar

- Semua fitur Bulanan
- Resolusi hingga 4K
- Bulk ZIP 4K tanpa batas jumlah
- Akses permanen
- Tanpa tagihan perpanjangan
- Kode lisensi offline
- Termasuk pembaruan fitur mendatang

Semua paket menghasilkan video tanpa watermark.

---

# 3. Membuat Video Pertama

## Langkah 1 — Buka Studio

1. Buka https://motion-easy.rosifulaqli59.workers.dev.
2. Klik **Buka Studio**.
3. Pastikan halaman **Studio Editor** tampil.

## Langkah 2 — Pilih tema

Untuk percobaan pertama, pilih **Judul Reveal**. Tema lain yang tersedia antara lain Hook TikTok 3-2-1, Promo Diskon 50%, Logo Reveal Modern, Lower Third Berita, Cyberpunk Neon Grid, dan Teks Glitch Pop.

## Langkah 3 — Atur tampilan

Pilih kategori, gaya visual, durasi, dan frame rate. Untuk mulai, gunakan durasi 5–8 detik dan 30 fps.

## Langkah 4 — Validasi dan preview

Klik **Validasi & Preview**, lalu tekan play. Pastikan teks, warna, dan gerakan sudah terlihat benar.

## Langkah 5 — Ekspor

Pilih 1080p, klik **Ekspor MP4**, tunggu proses selesai, lalu cari file di folder Downloads/Unduhan.

---

# 4. Mengenal Studio

- **Tema:** titik awal siap pakai.
- **Kategori:** jenis karya, seperti Judul/Intro, Lower Third, atau Infografik.
- **Gaya visual:** misalnya Neon Gelap, Corporate, Playful, atau Elegan Gelap.
- **Layer:** elemen penyusun video, seperti background, teks, bentuk, garis, dan partikel.
- **Preview:** tampilan animasi sebelum ekspor.
- **Log aktivitas:** catatan validasi dan proses yang dilakukan.
- **Alur AI:** bagian untuk membuat brief, menyalin prompt, menempel JSON, dan memvalidasi hasil.

Layer yang berada lebih awal biasanya menjadi elemen belakang. Layer berikutnya berada di atasnya.

---

# 5. Menggunakan AI dan JSON

Motion Easy menggunakan alur BYO-AI. Anda dapat memakai ChatGPT, Claude, Gemini, atau layanan AI lain.

## Menulis brief

Jelaskan jenis video, teks, gaya, warna, durasi, dan gerakan.

Contoh:

> Buat video pembuka untuk channel YouTube bernama “Ruang Kreatif”. Tampilkan judul “Ruang Kreatif” dan subjudul “Ide sederhana, dampak luar biasa”. Gunakan gaya neon gelap, aksen cyan, durasi 8 detik. Judul masuk dari bawah dan keluar dengan fade out halus.

## AI Handoff: Buka Gemini, ChatGPT, atau Claude

Di bawah tombol **Salin Prompt**, tersedia tombol **Gemini**, **ChatGPT**, dan **Claude**. Tombol ini membantu pemula karena prompt langsung disalin dan layanan AI pilihan dibuka di tab baru.

Alurnya:

1. Isi brief atau pilih tema.
2. Klik Gemini, ChatGPT, atau Claude.
3. Prompt otomatis disalin ke clipboard.
4. Layanan AI terbuka di tab baru.
5. Tempel prompt dan kirim.
6. Salin seluruh JSON hasil AI.
7. Kembali ke Motion Easy.
8. Tempel JSON, lalu klik **Validasi & Preview**.

Fitur ini tidak memerlukan API key Motion Easy. Anda menggunakan akun atau subscription AI milik sendiri. Motion Easy tidak mengirim hasil secara otomatis dari layanan AI; pengguna tetap menyalin JSON kembali agar dapat diperiksa validator.

Jika clipboard tidak tersedia, klik **Salin Prompt** dan gunakan `Ctrl+C`, lalu tempel manual dengan `Ctrl+V`.

## Menyalin prompt

1. Isi brief atau pilih tema.
2. Klik **Salin Prompt**.
3. Buka ChatGPT, Claude, atau Gemini.
4. Tempel prompt dan kirim.
5. Salin seluruh JSON yang dihasilkan AI.
6. Kembali ke Motion Easy.
7. Tempel JSON pada area **tempel (sample)**.
8. Klik **Validasi & Preview**.

## Jika JSON tidak valid

Minta AI menggunakan instruksi ini:

> Tulis ulang hasil sebelumnya menjadi satu JSON MotionDefinition yang valid. Jangan tambahkan sapaan, penjelasan, atau teks di luar JSON. Pastikan JSON dapat diproses oleh JSON.parse dan mengikuti semua aturan format Motion Easy.

Tempel hanya objek JSON. Jangan menyertakan kalimat seperti “Berikut hasilnya” atau “Semoga membantu”.

## Aturan penting MotionDefinition

- `version` harus bernilai `1`.
- JSON harus valid.
- Koordinat dan ukuran memakai nilai 0 sampai 1.
- Waktu memakai detik dan harus berada dalam durasi kanvas.
- Warna menggunakan hex enam digit, misalnya `#4cd7f6`.
- Jenis layer: `rect`, `ellipse`, `triangle`, `text`, `line`, atau `canvas`.
- Maksimal 30 layer.
- Kurangi partikel dan efek berat jika preview lambat.

---

# 6. Preview dan Ekspor

## Pemeriksaan preview

Putar animasi dari awal hingga akhir. Periksa:

- Teks tidak terpotong.
- Warna memiliki kontras.
- Gerakan tidak terlalu cepat.
- Semua elemen berada di dalam frame.
- Animasi masuk dan keluar pada waktu yang tepat.

## Pilihan resolusi

- **720p:** uji cepat dan ukuran lebih kecil.
- **1080p:** penggunaan umum, TikTok, Reels, YouTube, dan presentasi.
- **2K:** paket Bulanan dan Lifetime.
- **4K:** paket Lifetime.

## Prosedur ekspor

1. Pastikan preview benar.
2. Pilih preset resolusi.
3. Klik **Ekspor MP4**.
4. Jangan tutup tab saat proses berjalan.
5. Tunggu pesan selesai.
6. Buka folder Downloads/Unduhan.

Nama file biasanya mengikuti nama karya dan resolusinya, misalnya `judul-reveal-1920x1080.mp4`.

### Kuota Gratis

Paket Gratis memiliki 5 ekspor MP4 per hari. Kuota hanya terpotong setelah ekspor berhasil. Paket Bulanan dan Lifetime tidak memiliki batas ekspor.

---

# 7. Aktivasi Lisensi

## Membeli paket

1. Buka **Harga & Paket**.
2. Pilih Bulanan atau Lifetime Pass.
3. Klik **Pesan via WhatsApp**.
4. Ikuti instruksi pembayaran admin.
5. Setelah pembayaran dikonfirmasi, admin mengirim kode lisensi.

Pembayaran dapat dilakukan melalui metode yang tersedia, seperti QRIS, e-wallet, atau transfer bank.

## Memasukkan kode

1. Buka **Aktivasi Lisensi**.
2. Tempel kode lisensi.
3. Klik **Aktivasi**.
4. Pastikan status berubah menjadi Premium.
5. Kembali ke Studio dan periksa fitur yang terbuka.

Lisensi diverifikasi secara lokal. Paket Bulanan aktif 30 hari; Lifetime aktif selamanya pada perangkat/browser yang diaktivasi. Simpan kode lisensi di tempat aman.

> Jika data situs browser dihapus, Anda mungkin perlu memasukkan kembali kode lisensi.

---

# 8. Bulk ZIP dan Enlarge-MB

## Bulk ZIP

Bulk ZIP membuat banyak karya sekaligus dan mengemas hasilnya menjadi satu file ZIP. Gunakan untuk variasi judul, seri konten, banyak produk, atau beberapa versi bahasa. Fitur ini khusus Premium.

## Enlarge-MB

Enlarge-MB membantu memenuhi syarat ukuran file minimum dengan pilihan 10, 25, atau 50 MB. Fitur ini khusus Premium dan dirancang untuk memperbesar ukuran kontainer MP4 tanpa merusak video stream.

---

# 9. Workflow Praktis

## TikTok atau Reels

Gunakan teks besar yang terbaca dalam 1–2 detik pertama, durasi 5–15 detik, dan ekspor 1080p. Sisakan jarak aman dari tepi layar untuk area tombol aplikasi.

## Intro YouTube

Pilih Judul/Intro, masukkan nama channel dan subjudul pendek, gunakan durasi 5–8 detik, lalu tambahkan gerakan masuk dan keluar yang halus.

## Lower third

Masukkan nama dan jabatan, gunakan warna kontras, batasi informasi, dan pilih durasi 5–8 detik.

## Microstock

Gunakan desain bersih dan mudah dipakai ulang. Pastikan aset, merek, font, musik, dan lisensi yang digunakan memang aman untuk tujuan publikasi.

---

# 10. Troubleshooting

## Preview glitch atau berkedip

Validasi ulang JSON, kurangi jumlah layer/partikel, kurangi efek canvas, muat ulang halaman, lalu tutup aplikasi lain yang memakai banyak RAM atau GPU.

## JSON tidak bisa divalidasi

Hapus teks di luar JSON, periksa koma dan tanda kutip, lalu minta AI menghasilkan “satu JSON valid saja”. Salin ulang seluruh blok JSON.

## Teks terpotong

Pendekkan teks, kecilkan ukuran font, pindahkan teks menjauh dari tepi, atau minta AI menambahkan safe margin.

## Export MP4 gagal

Gunakan Chrome/Edge desktop terbaru, coba 720p atau 1080p, kurangi durasi dan layer, tutup tab lain, lalu muat ulang halaman.

## Export terlalu lambat

Sambungkan laptop ke charger, tutup aplikasi berat, gunakan resolusi lebih rendah, kurangi partikel, dan jangan menjalankan ekspor bersamaan.

## File tidak ditemukan

Periksa folder Downloads, daftar download browser, izin download otomatis, dan cari file dengan ekstensi `.mp4`.

## Fitur Premium masih terkunci

Buka Aktivasi Lisensi, pastikan kode berhasil, muat ulang Studio, lalu periksa kembali. Jika masih terkunci, kirim screenshot kepada admin.

## Kuota Gratis habis

Tunggu reset harian atau upgrade ke Bulanan/Lifetime untuk ekspor tanpa batas.

## Halaman kosong atau tidak merespons

Muat ulang dengan `Ctrl + R`, gunakan Chrome/Edge desktop, pastikan JavaScript aktif, nonaktifkan sementara ekstensi pemblokir script, atau coba jendela Incognito.

Saat meminta bantuan, sertakan screenshot, pesan error, browser, sistem operasi, resolusi, paket, dan langkah terakhir sebelum masalah. Jangan mengirim kode lisensi di ruang publik.

---

# 11. Checklist Sebelum Ekspor

- [ ] Teks benar dan tidak typo.
- [ ] Semua teks terlihat utuh.
- [ ] Warna cukup kontras.
- [ ] Gerakan mudah diikuti.
- [ ] Durasi sesuai kebutuhan.
- [ ] Preview sudah diputar dari awal sampai akhir.
- [ ] Resolusi sudah benar.
- [ ] Kuota masih tersedia jika memakai Gratis.
- [ ] Folder Downloads memiliki ruang cukup.

---

# 12. Dokumentasi Menu Aplikasi

## Studio Editor

Ini adalah tempat utama untuk membuat dan mengekspor animasi. Di dalamnya terdapat tema, pengaturan brief, preview, layer, alur AI, validasi JSON, dan ekspor.

## Kamus Animasi — MotionDefinition

Menu ini adalah referensi teknis untuk format animasi. Anda dapat memilih enam contoh bawaan dan melihat JSON lengkapnya. Gunakan menu ini jika ingin memahami struktur layer atau membandingkan hasil AI dengan contoh yang sudah valid.

Aturan yang tampil di aplikasi meliputi koordinat 0–1, waktu dalam detik, warna hex enam digit, preset gerakan, maksimal 60 layer, durasi 1–60 detik, dan canvas effect yang deterministik.

> Jumlah maksimal layer pada validator aplikasi adalah 60. Untuk performa yang nyaman, gunakan jumlah layer sesedikit mungkin.

## Panduan

Menu Panduan memperlihatkan alur lima langkah:

1. Isi brief.
2. Salin prompt ke AI pilihan Anda.
3. Tempel hasil AI.
4. Atur dan preview animasi.
5. Ekspor MP4.

Menu ini juga menjelaskan browser yang didukung dan privasi proses render.

## Proyek Saya

Menu Proyek Saya saat ini masih bertanda **Segera Hadir**. Fitur simpan dan muat ulang proyek sedang disiapkan. Untuk sekarang, animasi dapat langsung diekspor dari Studio. Jika Anda ingin menyimpan pekerjaan, simpan JSON MotionDefinition di file teks pribadi sebelum menutup halaman.

## Harga & Paket

Menu ini berisi harga, fitur tiap paket, matriks perbandingan, FAQ, dan tombol pembelian melalui WhatsApp.

## Aktivasi Lisensi

Menu ini digunakan untuk menempel kode lisensi yang diterima setelah pembayaran. Setelah aktivasi berhasil, kembali ke Studio agar fitur Premium terbaca.

## Navigasi di layar kecil

Pada layar sempit, klik tombol menu untuk membuka sidebar. Pilih halaman yang dibutuhkan, lalu sidebar akan tertutup otomatis.

---

# 13. Kamus Istilah

| Istilah | Arti sederhana |
|---|---|
| Brief | Penjelasan ide video |
| Prompt | Instruksi untuk AI |
| JSON | Format data yang ditempel ke Motion Easy |
| MotionDefinition | Struktur JSON untuk animasi |
| Layer | Elemen penyusun video |
| Preview | Tampilan sebelum ekspor |
| Render | Proses membuat video |
| Export | Menyimpan hasil menjadi file MP4 |
| FPS | Jumlah frame per detik |
| WebCodecs | Teknologi browser untuk memproses video |
| Client-side | Proses yang dilakukan di perangkat pengguna |
| Bulk ZIP | Banyak video dalam satu file ZIP |
| Enlarge-MB | Penyesuaian ukuran file minimum |
| Lifetime | Lisensi aktif selamanya |

---

---

# 14. Lampiran Template

## Template brief umum

```text
Buat video [jenis video] untuk [tujuan atau audiens].
Tampilkan teks: “[judul]” dan “[subjudul/CTA]”.
Gaya visual: [gaya].
Warna utama: [warna].
Gerakan: [cara masuk, diam, dan keluar].
Kanvas: [rasio], durasi [jumlah] detik, [fps] fps.
Pastikan semua teks terbaca dan tidak keluar dari frame.
```

## Template brief promo

```text
Buat video promo [produk] untuk TikTok/Reels.
Hook: “[kalimat pembuka]”.
Keunggulan: “[keunggulan 1]”, “[keunggulan 2]”.
Penawaran: “[harga atau promo]”.
CTA: “[ajakan tindakan]”.
Gunakan gaya [gaya], warna [warna], rasio 9:16, durasi [jumlah] detik.
```

## Template prompt perbaikan

```text
Perbaiki JSON MotionDefinition berikut.
Kembalikan hanya satu JSON valid tanpa penjelasan.
Pastikan version = 1, semua waktu berada dalam durasi kanvas,
warna memakai hex 6 digit, layer valid, teks tidak terpotong,
dan jumlah layer tidak lebih dari 60.

JSON:
[tempel JSON di sini]

Kesalahan validator:
[tempel pesan error di sini]
```

## Template laporan masalah

```text
Masalah: [jelaskan singkat]
Halaman: [Studio/Harga/Lisensi/dll.]
Browser dan versi: [Chrome/Edge + versi]
Sistem operasi: [Windows/macOS]
Paket: [Gratis/Bulanan/Lifetime]
Resolusi: [720p/1080p/2K/4K]
Langkah sebelum masalah: [tulis urutan]
Pesan error: [salin pesan]
Screenshot: [lampirkan]
```

## Penutup

Mulailah dengan satu video pendek. Pilih tema, tulis brief, gunakan AI, validasi JSON, periksa preview, lalu ekspor MP4.

Website: https://motion-easy.rosifulaqli59.workers.dev

Untuk pembelian atau masalah lisensi, gunakan tombol WhatsApp pada halaman **Harga & Paket**.
