-- Cloudflare D1 Schema untuk Motion Easy Admin
-- Jalankan: npx wrangler d1 execute motion-easy --file=./app/worker/schema.sql

CREATE TABLE IF NOT EXISTS paket (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bulanan', 'lifetime')),
  durasi_hari INTEGER,          -- null untuk lifetime, angka hari untuk bulanan
  max_res INTEGER NOT NULL DEFAULT 1440, -- 1080, 1440 (2K), 2160 (4K)
  bulk INTEGER NOT NULL DEFAULT 1,
  enlarge INTEGER NOT NULL DEFAULT 1,
  harga INTEGER NOT NULL,
  bawaan INTEGER NOT NULL DEFAULT 0,
  aktif INTEGER NOT NULL DEFAULT 1,
  urut INTEGER NOT NULL DEFAULT 0,
  catatan TEXT,
  dibuat_ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pesanan (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  nama TEXT NOT NULL,
  wa TEXT,
  paket_id TEXT NOT NULL,
  paket_nama TEXT NOT NULL,
  tier TEXT NOT NULL,
  harga INTEGER NOT NULL,
  metode TEXT,
  kode TEXT NOT NULL,
  exp INTEGER,                  -- unix timestamp kedaluwarsa atau null untuk lifetime
  status TEXT NOT NULL DEFAULT 'Lunas',
  note TEXT,
  email_admin TEXT,
  dibatalkan_ts INTEGER
);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  email TEXT,
  aksi TEXT NOT NULL,
  detail TEXT,
  ip TEXT
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_cobaan (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);

-- Indeks performa
CREATE INDEX IF NOT EXISTS idx_pesanan_ts ON pesanan(ts DESC);
CREATE INDEX IF NOT EXISTS idx_pesanan_status ON pesanan(status);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_cobaan(ip, ts);

-- Paket resmi awal. INSERT OR IGNORE menjaga data admin yang sudah ada.
INSERT OR IGNORE INTO paket
  (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
VALUES
  ('paket-bulanan-30', 'Paket Bulanan (30 Hari)', 'bulanan', 30, 1440, 1, 1, 15000, 1, 1, 1,
   'Maksimal 2K (1440p), berlaku 30 hari.', CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('paket-lifetime', 'Lifetime Pass', 'lifetime', NULL, 2160, 1, 1, 55000, 1, 1, 2,
   'Maksimal 4K (2160p), berlaku selamanya.', CAST(strftime('%s','now') AS INTEGER) * 1000);

INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('sesi_epoch', '1');
