# Admin Operations Kit — Motion Easy

Kit ini dirancang khusus untuk mempermudah Anda mengelola penjualan lisensi Motion Easy secara rapi, cepat, dan profesional tanpa perlu backend database yang rumit.

---

## Isi Folder Ini

1. **`SOP-ADMIN.md`**  
   Standar Operasional Prosedur lengkap: urutan alur kerja, perintah terminal untuk membuat kode lisensi Bulanan & Lifetime, penanganan error, dan strategi renewal.

2. **`TEMPLATE-CHAT.md`**  
   Template chat WhatsApp siap salin dari greeting, instruksi bayar, pengiriman lisensi, bantuan aktivasi, hingga reminder perpanjangan H-7 dan H-1.

3. **`DATABASE-PESANAN-TEMPLATE.csv`**  
   Template tabel database pesanan. Kompatibel 100% dengan **Microsoft Excel**, **Google Sheets**, dan **Notion**.

---

## Cara Menggunakan Database Pesanan

### Opsi A: Buka di Microsoft Excel
1. Klik dua kali file `DATABASE-PESANAN-TEMPLATE.csv`.
2. File akan otomatis terbuka di Excel dalam bentuk tabel kolom.
3. Anda bisa simpan sebagai `.xlsx` (Excel Workbook) jika ingin menambahkan warna atau rumus jumlah omzet otomatis:
   - Rumus total omzet: `=SUM(G2:G100)`

### Opsi B: Impor ke Google Sheets (Rekomendasi untuk Akses HP & Laptop)
1. Buka [Google Sheets](https://sheets.new).
2. Klik **File** → **Import** (Impor).
3. Pilih tab **Upload** lalu seret file `DATABASE-PESANAN-TEMPLATE.csv`.
4. Pilih "Replace spreadsheet" dan klik **Import data**.
5. Spreadsheet database penjualan Anda siap dipakai dan bisa diupdate langsung dari HP!

### Opsi C: Impor ke Notion (Tampilan Database Mewah & Modern)
1. Buka workspace Notion Anda.
2. Buat halaman baru, ketik `/import` lalu pilih **CSV**.
3. Pilih file `DATABASE-PESANAN-TEMPLATE.csv`.
4. Notion akan otomatis membuat **Database Table** lengkap dengan properti teks, tanggal, dan nomor!
5. Anda bisa menambahkan tampilan **Board View** berdasarkan status pembayaran (Menunggu → Lunas → Lisensi Dikirim).

---

## Ringkasan Perintah Penting (PowerShell)

Jalankan selalu dari folder `motionforge/app`:

```powershell
cd "C:\Users\M ROSIFUL AQLI\motionforge\app"
```

### 1. Buat Lisensi Bulanan (Rp 15.000 / 30 Hari):
```powershell
node tools/lisensi.mjs sign --tier bulanan --bulan 1 --note "NamaPembeli" --key ..\.rahasia\lisensi-master-private.json
```

### 2. Buat Lisensi Lifetime Pass (Rp 55.000 / Permanen):
```powershell
node tools/lisensi.mjs sign --tier lifetime --note "NamaPembeli" --key ..\.rahasia\lisensi-master-private.json
```

---

## Tips Keamanan Admin
- **File Kunci Privat:** `motionforge\.rahasia\lisensi-master-private.json` adalah brankas lisensi Anda. Jangan pernah dipindahkan ke folder publik atau dikirimkan ke siapa pun.
- Yang dikirim ke pembeli hanyalah **string kode panjang** hasil dari perintah `sign`.
