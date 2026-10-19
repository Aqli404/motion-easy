# SVG Motion Lite

## Penggunaan

1. Buka Studio dan pilih **SVG Motion**.
2. Pilih SVG lokal (maksimal 2 MB).
3. Setiap elemen atau grup `<g>` tingkat atas menjadi layer; maksimal 60 layer.
4. Pilih layer di panel SVG Motion Lite. Atur gerak masuk, loop, posisi, ukuran, rotasi, opacity, dan waktu tampil.
5. Putar preview atau geser scrubber. Animasi fade dimulai pada detik 0 sehingga frame pertama dapat kosong.
6. Gunakan ekspor MP4 seperti biasa. Kuota dan batas resolusi tetap mengikuti paket yang ada.

Artboard proyek adalah 1920×1080; SVG dipasang proporsional di tengah dengan ruang tepi 10%. Setiap asset layer dipotong ke bounding box elemennya — rotasi dan scale memakai pivot di pusat objek, bukan pusat artboard. Elemen di luar viewBox tetap dilayani dengan artboard penuh. Layer mempertahankan urutan sumber; layer terakhir berada di atas. Ukuran bbox diukur di browser saat impor; font berbeda antar perangkat dapat menggeser bbox teks sedikit.

## Batasan versi Lite

- Shape, path, grup, teks, gradient lokal, dan clip-path lokal didukung.
- Sanitasi memakai allowlist elemen dan atribut; script, CSS/style, event handler, external resource, embedded image, `use`, filter, foreignObject, dan animasi SVG bawaan dibuang.
- Recolor hanya mengganti nilai hex (`#rrggbb`) attr fill/stroke; warna bernama CSS tidak diganti.
- SVG berbasis CSS perlu diekspor ulang dengan presentation attributes; tampilan font bergantung pada font lokal browser.
- Maksimal 3.000 elemen, 60 layer tingkat atas, artboard 1–16.384 unit per sisi, dan 8 juta karakter asset hasil pemisahan.
- Preview checkerboard tidak masuk ke hasil render.
- MP4 H.264 tidak menyimpan alpha; area transparan menjadi hitam. Pilih warna latar jika diperlukan. Cover PNG mempertahankan alpha.
- Belum mencakup draw-path/reveal, recolor, ungroup rekursif, timeline drag, atau MOV Alpha.
- Tidak ada perubahan harga maupun fitur Premium baru pada fase ini.

## Panel layer: thumbnail dan multi-select

- Thumbnail tiap layer SVG ditampilkan di panel Kontrol; klik memilih layer primer, **Ctrl/Cmd/Shift+klik** menambah/mengurangi seleksi banyak layer.
- Pillar Kontrol: **Recolor** — pilih mode `isi (fill)` / `garis (stroke)` / `isi + garis`, pilih warna, klik **Terapkan**. Hanya warna hex 6 digit di asset yang diganti; gradien (`fill="url(#…)"`, stop), `fill="none"` (outline), dan teks CSS bernama tidak tersentuh. Bekerja juga saat multi-select. Tombol **Asli** mengembalikan asset ke kondisi impor (asset asli disimpan terpisah sebagai `assetAwal`).
- **Duplikat/Hapus** bekerja pada semua layer terpilih (label menampilkan jumlah); **Ke depan/belakang** hanya layer primer.
- **Gerak masuk, Loop, dan Opacity** diterapkan ke semua layer terpilih — praktis untuk mengatur satu gaya gerak sekaligus. Posisi, ukuran, rotasi, dan waktu hanya untuk layer primer.
- Simpan/buka proyek tetap memakai format lama; multi-select tidak disimpan (sesi panel). Berhasil recolor tetap tersimpan oleh proyek melalui `asset` yang baru; asset asli ikut disimpan lewat `assetAwal`.

## Pengujian

Jalankan `npm run dev` dari `app`, buka Studio, lalu jalankan dari console browser lokal:

```js
await import('/tests/svg.browser.ts').then(m => m.testSvg())
```

Suite mencakup pemisahan layer, aspect-fit, origin viewBox, validasi schema, rasterisasi nyata, alpha, sanitasi konten berbahaya, gradient, dimensi fallback, input rusak, batas ukuran, dan penolakan remote asset.

Pemeriksaan manual: import SVG → pilih layer → pop/pulse → rotasi → scrub → export MP4 720p → selesai. Screenshot memerlukan peninjauan visual manual tambahan.

Uji pivot per objek: `await import('/tests/svgPivot.browser.ts').then(m => m.testSvgPivot())` — 11 pemeriksaan geometry bbox, rotasi 180° tetap di tempat (dan titik pivot artboard lama kosong), bbox dilampi ke irisan artboard, fallback elemen di luar viewBox, dan bbox grup ber-transform. Helper interaksi UI thumbnail/multi-select: `tests/svgSelectUi.browser.ts` (manual).

Uji recolor: `await import('/tests/svgRecolor.browser.ts').then(m => m.testSvgRecolor())` — 16 pemeriksaan: fill/stroke berganti per mode, gradien url + stop tetap, `fill="none"` tetap none, anak group ikut, warna non-hex ditolak, hasil terlihat di pixel render, tombol "Asli" via `assetAwal`, dan proyek recolored lolos simpan-buka. Rekologi UI manual: helper `ujiRecolor()` di `tests/svgSelectUi.browser.ts`.

## Simpan/buka proyek dan edit layer

- **Simpan proyek** mengunduh `.motion.json` berisi definisi animasi, perubahan layer, dan asset SVG embedded. Bukan autosave atau penyimpanan cloud.
- **Buka proyek** memvalidasi JSON dan memuat asset sebelum mengganti proyek aktif. Input gagal tidak mengganti proyek aktif. Maksimal file 12 MB.
- Versi ini mendukung proyek berbasis data/SVG. Proyek dengan layer kode `canvas` ditolak pada simpan/buka agar file tidak menjadi jalur eksekusi kode otomatis.
- **Undo/Redo** menyimpan maksimal 30 perubahan dalam sesi Studio. History tidak bertahan setelah refresh/navigasi keluar Studio.
- **Ke depan/Ke belakang** menggeser layer satu posisi. Layer terakhir digambar paling atas.
- **Duplikat layer** membuat ID unik (maksimal 60 layer); **Hapus layer** menyisakan minimal satu layer.
- Uji browser tambahan: `await import('/tests/project.browser.ts').then(m => m.testProject())`.

## PNG Sequence ZIP (Premium)

1. Buka proyek dan pilih **PNG Sequence ZIP** di toolbar Studio.
2. Pilih 720p/1080p dan 24/30/60 FPS.
3. Centang **Abaikan warna latar proyek (alpha)** untuk menghilangkan warna latar canvas. Background yang berupa layer atau gambar SVG tetap ada; hapus layer tersebut jika perlu.
4. Ekspor, lalu ekstrak ZIP. Import folder `frames` sebagai image sequence di software editing dan atur FPS sesuai `sequence.json`.

Frame pertama berada pada waktu 0, frame berikutnya pada `index / fps`. Entrance fade dapat membuat frame pertama kosong—ini normal. Nama frame memakai enam digit, mulai `000001.png`. Checkerboard preview tidak diekspor.

Batas awal: 600 frame, 128 MB total data PNG, 4,2 juta piksel per frame. Batas bukan jaminan kompatibilitas semua perangkat: ZIP dibentuk di RAM dan peak memory dapat beberapa kali ukuran output. Kurangi durasi/resolusi jika batas terlampaui. Progres dan pembatalan tersedia selama render; tahap pengemasan ZIP sinkron tidak bisa diinterupsi di tengah proses.

Fitur ini tersedia untuk Premium (Bulanan/Lifetime), tidak memakai kuota MP4 gratis. Tidak mengubah harga paket. Tidak membutuhkan WebCodecs karena memakai encoder PNG browser. Belum ada 2K/4K PNG sequence atau streaming ZIP ke disk.

Uji: `await import('/tests/sequence.browser.ts').then(m => m.testSequence())` — memeriksa struktur ZIP, isi PNG, alpha, metadata, batas frame, rasio ekstrem, dan pembatalan. Uji UI lokal: 5 detik × 24 FPS → 120 frame dalam ZIP 3,6 MB.

## Bulk Project ZIP Input (Premium)

Modal **Bulk ZIP** sekarang menerima tambahan input ZIP berisi proyek `.motion.json` (hasil **Simpan proyek**, termasuk proyek dengan asset SVG embedded).

1. Klik **Bulk ZIP**, lalu pilih file ZIP pada bagian **Impor ZIP proyek**.
2. Setiap entri `.motion.json` divalidasi sama seperti **Buka proyek**: JSON, schema, asset embedded, dan penolakan layer kode `canvas`. Tidak ada kode dari file yang dieksekusi.
3. Proyek valid masuk ke daftar karya bersama proyek tempelan; klik render seperti biasa untuk menghasilkan satu ZIP berisi MP4.
4. File yang gagal divalidasi atau bukan `.motion.json` dilaporkan per file tanpa menggagalkan yang lain.

Batas keamanan: ZIP maksimal 12 MB, 100 entri, 20 proyek valid, ekstraksi total 24 MB dan 12 MB per proyek; nama path `..`, awalan `/`, dan backslash ditolak sehingga isi arsip hanya data, bukan lokasi tulis. Asset remote dalam proyek juga ditolak oleh validator proyek.

Uji: `await import('/tests/projectZip.browser.ts').then(m => m.testProjectZip())` — 12 pemeriksaan: dimuat dua proyek + subfolder, file asing diabaikan, perubahan layer tersimpan, kode canvas ditolak tanpa dieksekusi, path traversal/arsip non-ZIP/ZIP kosong/101 entri ditolak, dan proyek rusak tidak menggagalkan yang sah. Uji UI lokal: ZIP 2 proyek → render 2/2 sukses.

## SVG dari AI (prompt builder)

Tombol **SVG dari AI** di toolbar Studio memandu alur AI → SVG berlapis → layer animasi:

1. Isi brief (tema siap pakai, ide, kategori, gaya, dua warna) lalu **Salin Prompt SVG** atau buka Gemini/ChatGPT/Claude langsung dari modal.
2. Prompt memerintahkan AI menghasilkan blok ` ```svg ` dengan aturan yang cocok dengan SVG Motion Lite: `viewBox="0 0 1920 1080"`, setiap layer = anak langsung root ber-`id` unik (maksimal mengikuti brief, hard-cap 60), hanya presentation attributes, tanpa `<style>`/`<script>`/SMIL/URL eksternal, gradien hanya `<defs>` lokal, dan layer `background` sebagai latar.
3. Tempel jawaban AI di kotak tempel. Konten dibersihkan otomatis (ambil blok svg pertama atau substring `<svg…</svg>`), lalu **Validasi & Muat Jadi Layer** menjalankan sanitasi yang sama seperti impor file.
4. Jika ditolak, tombol **Salin Prompt Perbaikan** mengirim ulang SVG + pesan validator ke AI (maksimal 3 percobaan dalam satu sesi).

Batas dan keamanan tetap sama dengan impor file: 2 MB, 3.000 elemen, 60 layer, asset remote dibuang, teks bergantung font lokal browser. Artboard tetap 16:9 — pekerjaan vertikal perlu diubah manual. Jawaban AI bebas prosa; hanya markup SVG yang dipakai. Uji: `await import('/tests/svgAi.browser.ts').then(m => m.testSvgAi())` — 18 pemeriksaan isi prompt, penggali blok kode, contoh SVG di prompt (valid & jadi 4 layer), jawaban hostile tersanitasi, >60 layer ditolak, dan prompt perbaikan. Helper interaksi UI: `tests/svgAiUi.browser.ts` (manual, bukan suite).
