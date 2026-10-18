# Skema MotionDefinition v1 — Kamus Animasi Motion Easy

> Dokumen ini adalah sumber tunggal format animasi. Di Fase 3, versi ringkas dokumen ini
> akan dijadikan bagian dari prompt yang dikirim ke AI (BYO-AI).

## 1. Aturan keulang (diperiksa validator)

1. Output **HANYA JSON berikut blok ```json```** — tanpa kalimat pembuka/penutup, tanpa kedok JS.
2. `version` wajib `1`.
3. Semua koordinat & ukuran adalah **fraksi 0..1** relatif lebar/tinggi kanvas.
   - `geometry.x/y` = titik PUSAT objek; `0.5/0.5` = pusat kanvas.
   - `0` = sisi kiri/atas kanvas; `1` = sisi kanan/bawah.
4. Waktu berupa **detik** (`0..canvas.durationSec`), BUKAN frame.
5. Semua warna hex 6 digit (`#f97316`). Gradasi di layer biasa **tidak ada di v1** — buat 2 layer bertumpuk (di kind `canvas` gradasi boleh, via `fx.gradient`).
6. Gerakan hanya preset resmi. **Tidak ada kode JS di layer data, tidak ada fitur eksperimen** — SATU-satunya pengecualian: kind `canvas` (lian. §3a).
7. Layer maksimal **60 per karya**. `durationSec` maksimal 60, minimal 1.
8. Semua layer wajib punya `id` unik, `time` (from < to), dan `geometry`.
9. Teks: huruf latin. Napakuti baris dengan `\n` kalau perlu.

## 2. Struktur teratas

```json
{
  "version": 1,
  "name": "Nama karya",
  "notes": "catatan bebas, tidak dirender",
  "canvas": {
    "w": 1920,
    "h": 1080,
    "fps": 30,
    "durationSec": 6,
    "background": "#070912"
  },
  "layers": [ { "...": "satukan layer di bawah" } ]
}
```

- `canvas.fps`: `24` | `30` | `60`.
- `canvas.w/h`: rasio piksel karya (16:9 => 1920x1080, 9:16 => 1080x1920, 1:1 => 1080x1080).
- `canvas.background`: `null` = transparan.

## 3. Bentuk layer (kind)

| kind | Wajib | Keterangan |
|---|---|---|
| `rect` | — | kotak; `w/h`, `style.radius` untuk sudut membulat |
| `ellipse` | — | lingkaran/oval; `w/h` |
| `triangle` | — | segitiga ke atas; `w/h` |
| `text` | `text` | teks; ukuran pakai `text.size` |
| `line` | `line` | garis dari `(geometry.x,y)` ke `line.to`; gaya `style.strokeWidth` |
| `canvas` | `kanvas` | **KANVAS BEBAS (v1.1)** — lian §3a |
| `image` | `asset` | id aset gambar — **abaikan dulu hingga Fase 6** |

### 3a. Kanvas Bebas (kind `canvas`) — efek organik

```json
{
  "id": "fx-nebula",
  "kind": "canvas",
  "tag": "fx-kanvas",
  "time": { "from": 0, "to": 8 },
  "geometry": { "x": 0.5, "y": 0.5 },
  "kanvas": { "source": "function draw(ctx, time, w, h, fx) { ... }" }
}
```

Aturan kode di dalam `kanvas.source`:

| Aturan | Isi |
|---|---|
| Tanda tangan | SATU fungsi `draw(ctx, time, w, h, fx)` — `ctx` Canvas 2D, koordinat **piksel penuh** `w × h` |
| Determinis | Wajib! Dilarang `Math.random()`, `Date`, `fetch`, font, gambar, atau state antar frame — preview & export harus identik |
| Helper `fx` | `fx.loop(time, period)` fase 0..1 berulang · `fx.pulse(time, period)` gelombang halus 0..1 · `fx.ease(x)` rentet · `fx.rand(i, seed)` pseudo-acak TETAP · `fx.glow(ctx, warna, blur)` + `fx.glowOff(ctx)` · `fx.gradient(...)` · `fx.radial(...)` |
| Kinerja | maks ~2000 langkah gambar per frame; partikel/bintang cukup 40-120 |
| Panjang | maks ~20.000 karakter per `source` |
| Motion | `motion.loop` TIDAK memengaruhi kind canvas — buat gerak di dalam kode; `time.from/to` dan alpha (opacity/motion in-out) tetap berlaku |

Validator memeriksa sintaks `source` dengan compile-check; kegagalan runtime sandboxed (ada layar peringatan, app tidak mati).

## 4. Gerakan (motion)

Setiap layer opsional punya `motion`:

```json
{
  "in":   { "type": "pop",    "at": 0.2, "dur": 0.5, "easing": "easeOutBack" },
  "out":  { "type": "nom", "before": 0.5, "dur": 0.45, "easing": "easeIn" },
  "loop": { "type": "float",  "dur": 1.2, "amount": 0.18, "phase": 0.3 }
}
```

- `in` — gerakan masuk, mulai di `time.from + at` (detik).
- `out` — gerakan keluar, berakhir di `time.to - before` (detik).
- `loop` — gerakan berulang selama layer tampil.

| `in`/`out`.type | Arti |
|---|---|
| `none` | langsung muncul / langsung hilang |
| `fadeIn` | transparansi 0 → 1 (pakai untuk `in`) |
| `fadeOut` | transparansi 1 → 0 (pakai untuk `out`) |
| `slideUp` | masuk dari bawah ke posisi |
| `slideDown` | masuk dari atas |
| `slideLeft` | masuk dari kanan |
| `slideRight` | masuk dari kiri |
| `pop` | membesar dari 0 ke ukuran penuh (efek "muncul") |

| `loop`.type | Arti (`amount` = fraksi tinggi kanvas) |
|---|---|
| `none` | diam |
| `float` | naik-turun bolak-balik |
| `pulse` | besar-kecil (denyut) |
| `spin` | berputar terus (derajat = amount × 360) |
| `sway` | goyang kiri-kanan (tanpa naik-turun) |

| `easing` | Kesan gerakan |
|---|---|
| `linear` | kecepatan sedera (tanpa akselerasi) |
| `easeIn` | mulai lambat, makin cepat |
| `easeOut` | cepat lalu melambat halus — pas untuk slide |
| `easeInOut` | halus dua sisi — pas untuk melayang |
| `easeOutBack` | sedikit overshoot — pas untuk pop |
| `easeOutBounce` | memantul saat berhenti |
| `easeOutElastic` | karet, bergetar lalu menetap |

## 5. Aturan kecil yang sering salah

- `motion.in.at` **bukan waktu absolut** — offset dari `time.from`. Untuk urutan A→B, gunakan `time.from` berbeda antar layer.
- `geometry` pada `text` tetap pakai `x/y` **titik pusat**; tidak perlu `w/h`.
- `style.strokeWidth`, `style.radius` = fraksi **tinggi kanvas** (0.004 ≈ 4 px pada 1080p).
- Opacity di `style.opacity` (0..1, default 1). Untuk kedipan halus, gunakan `loop: pulse` dengan `amount < 0.1`.
- `durationSec` mencakup seluruh durasi video, termasuk jeda `out`.

## 6. Contoh lengkap (buka `src/engine/samples.ts` untuk 6 contoh Typed)

```json
{
  "version": 1,
  "name": "Judul Reveal",
  "canvas": { "w": 1920, "h": 1080, "fps": 30, "durationSec": 6, "background": "#070912" },
  "layers": [
    {
      "id": "bg",
      "kind": "rect",
      "time": { "from": 0, "to": 6 },
      "geometry": { "x": 0.5, "y": 0.5, "w": 1, "h": 1 },
      "style": { "color": "#191b25" }
    },
    {
      "id": "judul",
      "kind": "text",
      "time": { "from": 0.2, "to": 6 },
      "geometry": { "x": 0.56, "y": 0.36 },
      "style": { "color": "#e1e1ef" },
      "text": { "content": "MOTION EASY STUDIO", "size": 0.075, "weight": 900, "align": "left" },
      "motion": { "in": { "type": "slideRight", "at": 0.2, "dur": 0.7, "easing": "easeOut" } }
    }
  ]
}
```
