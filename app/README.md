# Motion Easy — AI Motion Graphics Video Studio

Aplikasi client-side 100%: brief → prompt AI → kode animasi → preview realtime → export MP4.
Biaya AI/server = **Rp 0** (BYO-AI, render di browser user).

## Struktur

```
motionforge\
├── app\            ← proyek ini (React + Vite + Tailwind v4)
└── design\stitch\  ← referensi desain (9 layar Stitch, jangan diubah)
```

## Menjalankan lokal

```bash
cd app
npm install     # sekali saja
npm run dev     # buka http://localhost:5173
npm run build   # hasil produksi ke folder dist\
npm run preview # cek hasil build di http://localhost:4173
```

Keahlian browser: **Chrome / Edge desktop** untuk export MP4 (WebCodecs).

## Deploy ke Cloudflare Workers (gratis)

Proyek ini ter-deploy via **Cloudflare Workers Builds** (bukan Pages) di repo `Aqli404/motion-easy`.

1. Push folder ini ke repositori GitHub.
2. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → hubungkan repositori ini.
3. Setelan build di dashboard:
   - Build command: `cd app && npm ci && npm run build`
   - Deploy command: `npx wrangler deploy`
4. Kode di root repo yang menopang deploy:
   - `wrangler.json` — aset `./app/dist`, `not_found_handling: "single-page-application"`
   - `app/worker/index.js` — worker mini dengan binding `ASSETS`
5. Setiap `git push` → build & deploy otomatis.

> Routing `/studio`, `/lisensi`, `/harga` tidak akan 404: SPA fallback ditangani `not_found_handling`
> di `wrangler.json`. **JANGAN** menambahkan file `_redirects` (pola `/* /index.html 200`) — di Workers
> itu memicu *infinite loop* saat deploy (error 100324).

## Peta fase

| Fase | Isi | Status |
|---|---|---|
| 0 | Fondasi + deploy | ✅ |
| 1 | Skema MotionDefinition | ✅ |
| 2 | Studio: render canvas + player | ✅ |
| 3 | Alur AI (BYO-AI): prompt/paste/validator/self-heal | ✅ |
| 4 | Export MP4 (WebCodecs) | ✅ |
| 5 | Lisensi & pembayaran (Rp 0/15rb/55rb) | ✅ (link pembayaran perlu diisi admin) |
| 6 | Proyek saya, asset manager, template | ⏳ |

Harga mengacu: kompetitor 10rb/25rb/65rb → Motion Easy **0/15rb/55rb**.
