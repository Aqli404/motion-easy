param([switch]$DryRun)
$ErrorActionPreference = "Stop"

# ============================================================
#  backup-kunci.ps1 - cadangkan kunci privat lisensi Motion Easy
#  AMAN: skrip ini TIDAK PERNAH menampilkan isi file kunci.
#  Yang tampil hanya: nama file, ukuran, sidik jari SHA-256, status.
#  Pencadangan murni lokal - tidak ada koneksi internet.
# ============================================================

# skrip ini ada di <repo>\tools\ → repo root = induk dari folder tools
$repoRoot  = Split-Path -Parent $PSScriptRoot
$keyPath   = Join-Path $repoRoot ".rahasia\lisensi-master-private.json"
$SIDIK     = "03340BBC4BE405E434DD7B5B90FC9B72FD4471B2A41B290D8910AB5F925A48E1"
$subFolder = "Backup-MotionEasy"
$cfgPath   = Join-Path $PSScriptRoot "backup-tujuan.txt"

Write-Host ""
Write-Host "  ==== CADANGKAN KUNCI PRIVAT Lisensi MOTION EASY ====" -ForegroundColor Cyan
Write-Host "  (skrip tidak pernah menampilkan isi kunci)" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path $keyPath)) {
  Write-Host "  GAGAL: kunci tidak ditemukan di:" -ForegroundColor Red
  Write-Host "    $keyPath"
  exit 1
}

$item = Get-Item $keyPath
$hashAsli = (Get-FileHash $keyPath -Algorithm SHA256).Hash
Write-Host ("  File   : " + $item.Name)
Write-Host ("  Ukuran : " + [math]::Round($item.Length / 1KB, 1) + " KB")
Write-Host ("  Ubah   : " + $item.LastWriteTime)
if ($hashAsli -eq $SIDIK) {
  Write-Host "  Sidik  : cocok dengan catatan (03340BBC...48E1)" -ForegroundColor Green
} else {
  Write-Host "  PERINGATAN: SIDIK JARI BERBEDA dari catatan!" -ForegroundColor Yellow
  Write-Host ("  Sidik sekarang : " + $hashAsli)
  Write-Host "  Kalau ini kunci rotasi baru, lanjut saja. Kalau tidak tahu kenapa beda, JANGAN lanjut."
  if (-not $DryRun) {
    $jawab = Read-Host "  Lanjut cadangkan? (y/t) [y]"
    if ($jawab -match "^[tT]") { Write-Host "  Dibatalkan."; exit 1 }
  }
}

# ---- kumpulkan daftar tujuan -------------------------------------------
if (Test-Path $cfgPath) {
  $tujuan = Get-Content $cfgPath -ErrorAction SilentlyContinue |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith("#") } |
    ForEach-Object { [Environment]::ExpandEnvironmentVariables($_) }
  Write-Host ("  Tujuan   : backup-tujuan.txt (" + @($tujuan).Count + " lokasi)")
} else {
  $cand = @(
    (Join-Path $env:USERPROFILE "Google Drive\My Drive"),
    (Join-Path $env:USERPROFILE "OneDrive"),
    "G:\My Drive", "H:\My Drive", "I:\My Drive", "J:\My Drive", "K:\My Drive"
  )
  try {
    Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=2" -ErrorAction Stop |
      ForEach-Object { $cand += $_.DeviceID }
  } catch { }
  $tujuan = @($cand | Where-Object { Test-Path $_ })
  Write-Host "  Tujuan   : deteksi otomatis"
}
$tujuan = @($tujuan | Select-Object -Unique)

# ---- dry run -------------------------------------------------------------
if ($DryRun) {
  Write-Host ""
  Write-Host "  [DRY RUN] Rencananya:" -ForegroundColor Cyan
  if ($tujuan.Count -eq 0) {
    Write-Host "    - TIDAK ADA tujuan terdeteksi. Akan dibuat template backup-tujuan.txt"
    Write-Host "    - Kamu mengetik lokasi Drive/flashdisk, lalu jalankan lagi"
  } else {
    foreach ($t in $tujuan) { Write-Host ("    - salin kunci -> " + (Join-Path $t $subFolder) + " lalu verifikasi SHA-256") }
  }
  Write-Host "  [DRY RUN] Tidak ada berkas yang disalin." -ForegroundColor DarkGray
  Write-Host ""
  exit 0
}

# ---- tanpa tujuan → buat template & instruksikan -------------------------
if ($tujuan.Count -eq 0) {
  if (-not (Test-Path $cfgPath)) {
    $template = @(
      "# Lokasi tujuan backup kunci privat Motion Easy - satu lokasi per baris.",
      "# Baris yang diawali # diabaikan. %USERPROFILE% diperluas otomatis.",
      "# Contoh:",
      "# C:\Users\<NamaKamu>\Google Drive\My Drive",
      "# E:\",
      "# D:\MyDrive"
    )
    Set-Content -Path $cfgPath -Value $template -Encoding ASCII
  }
  Write-Host ""
  Write-Host "  TIDAK ADA tujuan backup yang terdeteksi." -ForegroundColor Yellow
  Write-Host "  Tempel flashdisk atau buka folder Google Drive-mu, lalu:"
  Write-Host ("    1. buka " + $cfgPath)
  Write-Host "    2. tulis lokasinya di atas, contoh baris: E:\   (tanpa tanda #)"
  Write-Host "    3. jalankan lagi backup-kunci.bat"
  exit 1
}

# ---- rekam daftar yang terdeteksi biar konsisten berikutnya ---------------
if (-not (Test-Path $cfgPath)) {
  $catatan = @("# Lokasi tujuan backup kunci privat Motion Easy (terdeteksi otomatis).") + $tujuan
  Set-Content -Path $cfgPath -Value $catatan -Encoding ASCII
}

# ---- salin + verifikasi ---------------------------------------------------
$laporan = @()
foreach ($t in $tujuan) {
  $dir  = Join-Path $t $subFolder
  $line = [pscustomobject]@{ Tujuan = $dir; Status = "" }
  try {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item $keyPath -Destination $dir -Force
    $salin = Join-Path $dir "lisensi-master-private.json"
    $h = (Get-FileHash $salin -Algorithm SHA256).Hash
    if ($h -eq $hashAsli) { $line.Status = "IDENTIK [OK]" } else { $line.Status = "BEDA [ULANGI]" }
    $panduan = @(
      "CARA MEMULIHKAN KUNCI MOTION EASY",
      "=================================",
      "1. Salin lisensi-master-private.json dari folder ini ke:",
      "   C:\Users\M ROSIFUL AQLI\motionforge\.rahasia\",
      "2. Verifikasi sidik jari SHA-256 masih:",
      "   03340BBC4BE405E434DD7B5B90FC9B72FD4471B2A41B290D8910AB5F925A48E1",
      "3. Menerbitkan kode lisensi (jalankan dari folder app):",
      '   node tools/lisensi.mjs sign --tier bulanan --bulan 1 --note "NamaPembeli" --key ..\.rahasia\lisensi-master-private.json',
      "",
      "PERINGATAN: jangan pernah kirim file ini ke WhatsApp, chat, atau screenshot."
    )
    Set-Content -Path (Join-Path $dir "CARA-PULIHKAN.txt") -Value $panduan -Encoding ASCII
  } catch {
    $line.Status = "GAGAL: " + $_.Exception.Message
  }
  $laporan += $line
}

Write-Host ""
Write-Host "  HASIL:" -ForegroundColor Cyan
$laporan | Format-Table -AutoSize -Wrap | Out-Host
$ok = @($laporan | Where-Object { $_.Status -like "IDENTIK*" }).Count
Write-Host ("  Terverifikasi identik: " + $ok + " dari " + $laporan.Count)
if ($ok -lt $laporan.Count) { exit 1 } else { exit 0 }
