# SOP Admin Motion Easy (Standard Operating Procedure)

Dokumen ini adalah panduan kerja operasional harian untuk Admin Motion Easy dalam melayani pembeli, memverifikasi pembayaran, menerbitkan kode lisensi, dan mengelola renewal.

---

## 1. Alur Kerja Harian (Workflow Ringkas)

```text
[Chat WhatsApp Masuk]
        ↓
1. Kirim info paket & tanya kebutuhan (Template Chat 1)
        ↓
2. Pembeli pilih paket → Kirim rekening/QRIS (Template Chat 2)
        ↓
3. Pembeli kirim bukti bayar → Verifikasi mutasi rekening
        ↓
4. Buka PowerShell → Generate kode lisensi (Bulanan/Lifetime)
        ↓
5. Catat ke Database Pesanan (Excel / Google Sheets / Notion)
        ↓
6. Kirim kode lisensi & panduan aktivasi (Template Chat 3 / 4)
        ↓
7. Konfirmasi pembeli berhasil aktivasi
        ↓
8. (Khusus Bulanan) Jadwalkan pengingat renewal H-7 & H-3
```

---

## 2. Cara Membuat Kode Lisensi (Admin CLI)

Semua perintah dijalankan di komputer admin menggunakan **PowerShell** dari folder `app`:

```powershell
cd "C:\Users\M ROSIFUL AQLI\motionforge\app"
```

> **PERINGATAN KEAMANAN:**
> File `motionforge\.rahasia\lisensi-master-private.json` adalah kunci rahasia utama.
> **JANGAN PERNAH** dikirim ke pembeli, diunggah ke GitHub, atau dikirim via WhatsApp.

---

### A. Paket Bulanan (Rp 15.000 / 30 Hari)

Jalankan perintah berikut (ganti `NamaPembeli` dengan nama/WhatsApp pembeli):

```powershell
node tools/lisensi.mjs sign --tier bulanan --bulan 1 --note "NamaPembeli-ME001" --key ..\.rahasia\lisensi-master-private.json
```

**Output Terminal:**
```text
=== KODE LISENSI (kirim kode ini ke pembeli) ===
ey...panjang...signature

detail: {"v":1,"tier":"bulanan","iat":1745000000,"exp":1747592000,"note":"NamaPembeli-ME001"}
aktif 30 hari dari sekarang
```

*Ambil baris kode panjang tepat di bawah teks `=== KODE LISENSI ===`.*

---

### B. Paket Lifetime Pass (Rp 55.000 Sekali Bayar)

Jalankan perintah berikut:

```powershell
node tools/lisensi.mjs sign --tier lifetime --note "NamaPembeli-ME002" --key ..\.rahasia\lisensi-master-private.json
```

**Output Terminal:**
```text
=== KODE LISENSI (kirim kode ini ke pembeli) ===
ey...panjang...signature

detail: {"v":1,"tier":"lifetime","iat":1745000000,"exp":null,"note":"NamaPembeli-ME002"}
lifetime — tanpa batas waktu
```

---

### C. Paket Promo Khusus 3 Bulan (Bulanan x3)

Jika ada promo bundling 3 bulan:

```powershell
node tools/lisensi.mjs sign --tier bulanan --bulan 3 --note "NamaPembeli-3Bulan" --key ..\.rahasia\lisensi-master-private.json
```

---

## 3. Format ID Pesanan (Order ID)

Gunakan format ID standar agar pencarian di database mudah:

- Format: `ME-[TAHUN]-[NOMOR URUT]`
- Contoh:
  - `ME-2026-0001` (Pesanan pertama)
  - `ME-2026-0002` (Pesanan kedua)
  - `ME-2026-0001-R1` (Renewal bulan ke-1 untuk pelanggan 0001)

---

## 4. Standar Pencatatan Database

Setiap ada transaksi, segera catat 8 data wajib ini di file `DATABASE-PESANAN-TEMPLATE.csv`:
1. **ID Pesanan**
2. **Tanggal Transaksi**
3. **Nama Pembeli & No. WhatsApp**
4. **Paket (Bulanan / Lifetime)**
5. **Nominal Bayar & Metode (QRIS/BCA/DANA/dll)**
6. **Tanggal Expired** (30 hari setelah hari ini untuk bulanan, atau "Selamanya")
7. **Kode Lisensi yang dikirim**
8. **Status (Lunas / Selesai / Expired)**

---

## 5. Prosedur Penanganan Kendala (Troubleshooting)

### Kendala 1: User bilang "Kode lisensi tidak valid saat ditempel"
1. Minta user screenshot layar menu Aktivasi Lisensi.
2. Pastikan user menyalin kode lengkap tanpa spasi tambahan di awal/akhir.
3. Pastikan browser user adalah Chrome atau Edge desktop versi terbaru.
4. Jika masih gagal, terbitkan kode baru dengan note `Reissue-ME-XXXX`.

### Kendala 2: User bilang "Fitur 2K/4K atau Bulk ZIP masih terkunci padahal sudah aktivasi"
1. Minta user me-refresh halaman Studio (`Ctrl + F5` atau `Ctrl + R`).
2. Pastikan paket yang dibeli sesuai (Paket Bulanan hanya membuka 2K; 4K khusus Lifetime).
3. Pastikan user tidak membuka aplikasi di mode Incognito yang memblokir penyimpanan lokal.

### Kendala 3: Browser user tidak bisa export video
1. Ingatkan bahwa Motion Easy membutuhkan WebCodecs.
2. Minta user membuka via **Google Chrome Desktop** atau **Microsoft Edge Desktop**.

---

## 6. Prosedur Retensi & Renewal (Khusus Bulanan)

1. **H-7 sebelum expired:** Cek tab renewal, kirim Template Chat 7 (Reminder H-7).
2. **H-3 sebelum expired:** Kirim pengingat santai dengan penawaran upgrade ke Lifetime (hemat).
3. **Hari H:** Jika belum bayar, lisensi otomatis kembali ke Paket Gratis (5 ekspor/hari).
4. **H+2 setelah expired:** Kirim Template Chat 8 (Tawaran kembali).
