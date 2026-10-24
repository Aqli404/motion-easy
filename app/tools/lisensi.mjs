#!/usr/bin/env node
/**
 * CLI lisensi Motion Easy — jalankan dengan Node.js 20+.
 *
 * Perintah:
 *   node tools/lisensi.mjs generate --out ../.rahasia
 *       -> membuat pasangan kunci ECDSA P-256 (privat JANGAN dibagikan!)
 *
 *   node tools/lisensi.mjs sign --tier lifetime --note "Pembeli #7" --key ../.rahasia/lisensi-master-private.json
 *   node tools/lisensi.mjs sign --tier bulanan --bulan 1 --note "Trial WA" --key ../.rahasia/lisensi-master-private.json
 *   node tools/lisensi.mjs sign --tier lifetime --nama "Budi" --wa 0812... --harga 55000 --key ... [--out ../.rahasia/lisensi-terbit.jsonl]
 *       -> menghasilkan kode + mencatat ke ledger .rahasia/lisensi-terbit.jsonl (gitignored)
 *          untuk diimpor ke Admin via Pesanan → Impor dari CLI
 *
 *   Ledger: satu JSON per baris (JSONL). Aman dipaste/impor lewat admin — idempoten via hash kode.
 */

import fs from "node:fs";
import path from "node:path";
import { webcrypto as crypto } from "node:crypto";

const subtle = crypto.subtle;

const b64u = (buf) => Buffer.from(buf).toString("base64url");

function parseArgs() {
  const argv = process.argv.slice(2);
  const cmd = argv.shift();
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[argv[i].slice(2)] = next;
        i++;
      } else {
        args[argv[i].slice(2)] = true;
      }
    }
  }
  return { cmd, args };
}

async function generate(outDir) {
  if (!outDir) {
    console.error("Pakai: node tools/lisensi.mjs generate --out <folder>");
    process.exit(1);
  }
  const dir = path.resolve(outDir);
  fs.mkdirSync(dir, { recursive: true });

  const { privateKey, publicKey } = await subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const privJwk = await subtle.exportKey("jwk", privateKey);
  const pubJwk = await subtle.exportKey("jwk", publicKey);

  const privFile = path.join(dir, "lisensi-master-private.json");
  const pubFile = path.join(dir, "lisensi-master-public.json");
  fs.writeFileSync(privFile, JSON.stringify(privJwk, null, 2));
  fs.writeFileSync(pubFile, JSON.stringify(pubJwk, null, 2));

  console.log("Kunci dibuat:");
  console.log("  PRIVAT (rahasia, JANGAN pernah masuk repo/aplikasi):", privFile);
  console.log("  PUBLIK  (tempel ke src/config/konfig.ts):           ", pubFile);
}

async function sign(args) {
  const tier = args.tier;
  if (tier !== "bulanan" && tier !== "lifetime") {
    console.error("--tier wajib: bulanan | lifetime");
    process.exit(1);
  }
  if (!args.key) {
    console.error("--key wajib: path ke lisensi-master-private.json");
    process.exit(1);
  }

  const jwk = JSON.parse(fs.readFileSync(path.resolve(args.key), "utf8"));
  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  let exp = null;
  if (tier === "bulanan") {
    const bulan = Number(args.bulan ?? 1);
    exp = now + bulan * 30 * 24 * 3600;
  }

  const payload = { v: 1, tier, iat: now, exp, note: String(args.note ?? "") };
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);

  const sig = await subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    payloadBytes
  );

  const code = `${b64u(payloadBytes)}.${b64u(sig)}`;

  console.log("=== KODE LISENSI (kirim kode ini ke pembeli) ===");
  console.log(code);
  console.log("");
  console.log("detail:", payloadJson);
  console.log(
    tier === "bulanan"
      ? `aktif ${exp - now} hari dari sekarang`
      : "lifetime — tanpa batas waktu"
  );

  // Catat ke ledger JSONL supaya bisa diimpor di Admin → Pesanan → Impor dari CLI
  // Flag: --out <path> | --no-ledger (matikan pencatatan) | --nama --wa --harga --paket-id
  if (args["no-ledger"]) {
    console.log("(ledger dimatikan via --no-ledger)");
    return;
  }
  const defaultOut = path.resolve(path.dirname(args.key), "lisensi-terbit.jsonl");
  const outPath = args.out ? path.resolve(String(args.out)) : defaultOut;
  const hargaRaw = args.harga !== undefined ? Number(args.harga) : (tier === "lifetime" ? 55000 : 15000);
  const paketIdDefault = tier === "lifetime" ? "paket-lifetime" : "paket-bulanan-30";
  const paketNamaDefault = tier === "lifetime" ? "Lifetime Pass" : "Paket Bulanan (30 Hari)";
  const entry = {
    ts: Date.now(),
    tier,
    exp: exp ?? null,
    harga: Number.isFinite(hargaRaw) ? hargaRaw : (tier === "lifetime" ? 55000 : 15000),
    nama: String(args.nama ?? args.note ?? "Pembeli CLI").trim() || "Pembeli CLI",
    wa: String(args.wa ?? "").trim(),
    note: String(args.note ?? "").trim(),
    paket_id: String(args["paket-id"] ?? paketIdDefault),
    paket_nama: String(args["paket-nama"] ?? paketNamaDefault),
    kode: code,
  };
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.appendFileSync(outPath, JSON.stringify(entry) + "\n", "utf8");
    // batasi hak akses di POSIX (0600-style), di Windows diabaikan
    try { fs.chmodSync(outPath, 0o600); } catch {}
    console.log(`\ndicatat → ${outPath}  (paste/impor di Admin → Pesanan → Impor dari CLI; file ini gitignored)`);
  } catch (e) {
    console.warn(`peringatan: gagal tulis ledger ${outPath}:`, e?.message ?? e);
  }
}

const { cmd, args } = parseArgs();
if (cmd === "generate") await generate(args.out);
else if (cmd === "sign") await sign(args);
else {
  console.log(
    "Pakai:\n  node tools/lisensi.mjs generate --out <folder>\n  node tools/lisensi.mjs sign --tier lifetime|bulanan --key <private.json> [--bulan N] [--note '...'] [--nama 'Budi'] [--wa 08123] [--harga 55000] [--paket-id paket-lifetime] [--out <ledger.jsonl>] [--no-ledger]"
  );
}
