// Cloudflare Worker untuk Motion Easy
// - Menyajikan static assets (SPA fallback ke index.html)
// - Backend API Admin: Auth Google OAuth (GIS), sesi cookie HttpOnly, penerbit lisensi ECDSA P-256 di server, CRUD paket, pesanan, audit via Cloudflare D1.

let cachedGoogleJwks = null;
let googleJwksFetchedAt = 0;
let dbInitialized = false;

// ===== Utility Kriptografi =====

function b64uToBytes(s) {
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
	const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
	const bin = atob(b64 + pad);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

function bytesToB64u(buf) {
	const bytes = new Uint8Array(buf);
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a, b) {
	if (a.length !== b.length) return false;
	let out = 0;
	for (let i = 0; i < a.length; i++) {
		out |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return out === 0;
}

// ===== Google ID Token Verification =====

async function getGoogleJwks() {
	const now = Date.now();
	if (cachedGoogleJwks && now - googleJwksFetchedAt < 3600_000) {
		return cachedGoogleJwks;
	}
	const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
	if (!res.ok) throw new Error("Gagal mengambil JWKS Google");
	const data = await res.json();
	cachedGoogleJwks = data;
	googleJwksFetchedAt = now;
	return data;
}

async function verifyGoogleIdToken(idToken, env) {
	if (!env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID belum dikonfigurasi");
	const parts = idToken.split(".");
	if (parts.length !== 3) throw new Error("Format token Google tidak sah");

	const header = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
	const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1])));
	const sigBytes = b64uToBytes(parts[2]);
	const dataBytes = new TextEncoder().encode(parts[0] + "." + parts[1]);

	if (header.alg !== "RS256") throw new Error("Algoritma bukan RS256");

	const jwks = await getGoogleJwks();
	const keyJwk = jwks.keys.find((k) => k.kid === header.kid);
	if (!keyJwk) throw new Error("Kunci publik Google tidak ditemukan (kid cocok tidak ada)");

	const cryptoKey = await crypto.subtle.importKey(
		"jwk",
		keyJwk,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["verify"]
	);

	const validSig = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBytes, dataBytes);
	if (!validSig) throw new Error("Tanda tangan ID token Google tidak sah");

	const nowSec = Math.floor(Date.now() / 1000);
	if (payload.exp < nowSec) throw new Error("ID token Google telah kedaluwarsa");
	if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
		throw new Error("Issuer Google tidak valid");
	}

	if (payload.aud !== env.GOOGLE_CLIENT_ID) {
		throw new Error("Audience token Google tidak cocok dengan GOOGLE_CLIENT_ID");
	}

	if (!payload.email_verified) throw new Error("Email Google belum diverifikasi");

	const email = (payload.email || "").toLowerCase().trim();
	if (!email) throw new Error("Email tidak ditemukan di payload Google");

	return { email, name: payload.name || email, picture: payload.picture };
}

// ===== Session Management (HMAC-SHA256 Token) =====

async function getHmacKey(secret) {
	const enc = new TextEncoder().encode(secret);
	return crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signSessionToken(payload, secret) {
	const key = await getHmacKey(secret);
	const dataStr = JSON.stringify(payload);
	const dataBytes = new TextEncoder().encode(dataStr);
	const sig = await crypto.subtle.sign("HMAC", key, dataBytes);
	return `${bytesToB64u(dataBytes)}.${bytesToB64u(sig)}`;
}

async function verifySessionToken(token, secret) {
	try {
		const parts = token.split(".");
		if (parts.length !== 2) return null;
		const key = await getHmacKey(secret);
		const dataBytes = b64uToBytes(parts[0]);
		const sigBytes = b64uToBytes(parts[1]);

		const ok = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
		if (!ok) return null;

		const payload = JSON.parse(new TextDecoder().decode(dataBytes));
		if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
		return payload;
	} catch {
		return null;
	}
}

function parseCookies(req) {
	const cookieHeader = req.headers.get("Cookie") || "";
	const cookies = {};
	cookieHeader.split(";").forEach((pair) => {
		const idx = pair.indexOf("=");
		if (idx > -1) {
			const k = pair.slice(0, idx).trim();
			const v = pair.slice(idx + 1).trim();
			cookies[k] = decodeURIComponent(v);
		}
	});
	return cookies;
}

async function getSessionEpoch(env) {
	if (!env.DB) return 1;
	try {
		const row = await env.DB.prepare("SELECT nilai FROM pengaturan WHERE kunci = 'sesi_epoch'").first();
		return row ? Number(row.nilai) || 1 : 1;
	} catch {
		return 1;
	}
}

function normalizeEmail(s) { return String(s || "").trim().toLowerCase(); }
function bootstrapEmails(env) {
	return (env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
async function getAdminRow(env, emailNorm) {
	if (!env.DB) return null;
	try { return await env.DB.prepare("SELECT * FROM admin WHERE email = ?").bind(emailNorm).first(); } catch { return null; }
}
async function isAdminAllowed(env, email) {
	const n = normalizeEmail(email);
	if (!n) return { ok: false, email: n };
	if (bootstrapEmails(env).includes(n)) return { ok: true, source: "env", email: n };
	const row = await getAdminRow(env, n);
	if (row && Number(row.aktif) === 1) return { ok: true, source: "db", email: n, row };
	return { ok: false, email: n };
}
async function touchAdminLogin(env, email) {
	if (!env.DB) return;
	try {
		const n = normalizeEmail(email);
		const row = await getAdminRow(env, n);
		if (row) await env.DB.prepare("UPDATE admin SET terakhir_login_ts = ? WHERE email = ?").bind(Date.now(), n).run();
	} catch {}
}

async function authenticateAdmin(req, env) {
	if (!env.SESSION_SECRET) return null;
	const secret = env.SESSION_SECRET;
	const cookies = parseCookies(req);
	const token = cookies["me_admin"];
	if (!token) return null;

	const session = await verifySessionToken(token, secret);
	if (!session || !session.email) return null;
	// rata: semua admin sederajat — cabut langsung saat email dinonaktifkan/dihapus
	if (env.DB) {
		const allow = await isAdminAllowed(env, session.email);
		if (!allow.ok) return null;
	}

	const currentEpoch = await getSessionEpoch(env);
	if (session.epoch && session.epoch < currentEpoch) return null;

	return session;
}

// ===== Server-side ECDSA P-256 License Issuer =====

async function issueLicenseCode(tier, durasiHari, note, env) {
	if (!env.LICENSE_PRIVATE_KEY_JWK) {
		throw new Error("LICENSE_PRIVATE_KEY_JWK belum disetel di secret Worker");
	}

	let jwk;
	try {
		jwk = typeof env.LICENSE_PRIVATE_KEY_JWK === "string"
			? JSON.parse(env.LICENSE_PRIVATE_KEY_JWK)
			: env.LICENSE_PRIVATE_KEY_JWK;
	} catch {
		throw new Error("Format JSON LICENSE_PRIVATE_KEY_JWK rusak");
	}

	const key = await crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"]
	);

	const now = Math.floor(Date.now() / 1000);
	let exp = null;
	if (tier === "bulanan") {
		const hari = Number(durasiHari) || 30;
		exp = now + hari * 86400;
	}

	const payload = { v: 1, tier, iat: now, exp, note: String(note || "") };
	const payloadJson = JSON.stringify(payload);
	const payloadBytes = new TextEncoder().encode(payloadJson);

	const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, payloadBytes);
	const code = `${bytesToB64u(payloadBytes)}.${bytesToB64u(sig)}`;

	return { code, exp, payload };
}

// ===== Poketo helpers =====

function generateRef() {
	return "ME-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function verifyPoketoSignature(rawBody, header, secret) {
	if (!secret || !header) return { ok: false, reason: "secret/header kosong" };
	const parts = Object.fromEntries(header.split(",").map((p) => p.split("=").map((s) => s.trim())));
	const t = parts.t; const v1 = parts.v1;
	if (!t || !v1) return { ok: false, reason: "format signature salah" };
	const nowSec = Math.floor(Date.now() / 1000);
	if (Math.abs(nowSec - Number(t)) > 300) return { ok: false, reason: "timestamp kedaluwarsa (>5 menit)" };
	const enc = new TextEncoder().encode(secret);
	const key = await crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const data = new TextEncoder().encode(`${t}.${rawBody}`);
	const sigBuf = await crypto.subtle.sign("HMAC", key, data);
	const hex = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
	if (hex.length !== v1.length) return { ok: false, reason: "panjang signature beda" };
	let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
	if (diff !== 0) return { ok: false, reason: "signature tidak cocok" };
	return { ok: true, t, v1: hex };
}

async function fetchPoketoInvoice(invoiceIdOrRef, apiKey) {
	const res = await fetch(`https://poketo.id/api/v1/invoices/${encodeURIComponent(invoiceIdOrRef)}`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});
	const j = await res.json().catch(() => ({}));
	return { res, j };
}

// ===== D1 Database Initialization & Defaults =====

async function initDb(env) {
	if (!env.DB || dbInitialized) return;
	try {
		await env.DB.exec(`
			CREATE TABLE IF NOT EXISTS paket (
				id TEXT PRIMARY KEY,
				nama TEXT NOT NULL,
				tier TEXT NOT NULL CHECK (tier IN ('bulanan', 'lifetime')),
				durasi_hari INTEGER,
				max_res INTEGER NOT NULL DEFAULT 1440,
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
				exp INTEGER,
				status TEXT NOT NULL DEFAULT 'Lunas',
				note TEXT,
				email_admin TEXT,
				dibatalkan_ts INTEGER
			);
			CREATE TABLE IF NOT EXISTS pesanan_auto (
				ref TEXT PRIMARY KEY,
				paket_id TEXT NOT NULL,
				paket_nama TEXT NOT NULL,
				tier TEXT NOT NULL,
				harga INTEGER NOT NULL,
				status TEXT NOT NULL DEFAULT 'pending',
				kode TEXT,
				exp INTEGER,
				invoice_id TEXT,
				payment_url TEXT,
				amount_total INTEGER,
				event_id TEXT,
				payment_method TEXT,
				ip TEXT NOT NULL,
				created_ts INTEGER NOT NULL,
				paid_ts INTEGER,
				expired_ts INTEGER
			);
			CREATE TABLE IF NOT EXISTS webhook_event (
				event_id TEXT PRIMARY KEY,
				ref TEXT,
				type TEXT,
				created_ts INTEGER NOT NULL
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
			CREATE TABLE IF NOT EXISTS admin (
				email TEXT PRIMARY KEY,
				nama TEXT,
				aktif INTEGER NOT NULL DEFAULT 1,
				dibuat_ts INTEGER NOT NULL,
				dibuat_oleh TEXT,
				terakhir_login_ts INTEGER
			);
		`);

		// Seed bawaan idempoten: jangan bergantung pada tabel paket yang kosong,
		// dan jangan menimpa perubahan admin ketika Worker isolate mulai ulang.
		const now = Date.now();
		await env.DB.batch([
			env.DB.prepare(
				`INSERT OR IGNORE INTO paket (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind("paket-bulanan-30", "Paket Bulanan (30 Hari)", "bulanan", 30, 1440, 1, 1, 15000, 1, 1, 1, "Maksimal 2K (1440p), berlaku 30 hari.", now),
			env.DB.prepare(
				`INSERT OR IGNORE INTO paket (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind("paket-lifetime", "Lifetime Pass", "lifetime", null, 2160, 1, 1, 55000, 1, 1, 2, "Maksimal 4K (2160p), berlaku selamanya.", now),
			env.DB.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('sesi_epoch', '1')"),
		]);
		dbInitialized = true;
	} catch (e) {
		console.error("Gagal inisialisasi D1:", e);
	}
}

async function recordAudit(env, email, aksi, detail, ip) {
	if (!env.DB) return;
	try {
		await env.DB.prepare(
			"INSERT INTO audit (id, ts, email, aksi, detail, ip) VALUES (?, ?, ?, ?, ?, ?)"
		).bind(
			"aud-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
			Date.now(),
			email,
			aksi,
			typeof detail === "object" ? JSON.stringify(detail) : String(detail || ""),
			ip || ""
		).run();
	} catch (e) {
		console.error("Gagal catat audit:", e);
	}
}

// ===== Response Helpers =====

function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
	});
}

function badRequest(message) {
	return json({ ok: false, error: message }, 400);
}

function unauthorized(message = "Akses ditolak — silakan login terlebih dahulu.") {
	return json({ ok: false, error: message }, 401);
}

// ===== Router Utama Cloudflare Worker =====

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname;
		const method = request.method;
		const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
		if (pathname.startsWith("/api/admin/") && ["POST", "PATCH", "DELETE"].includes(method)) {
			const origin = request.headers.get("Origin");
			if (origin && origin !== url.origin) {
				return json({ ok: false, error: "Origin tidak diizinkan." }, 403);
			}
		}

		// Pastikan D1 siap jika request mengarah ke API admin
		if (pathname.startsWith("/api/admin")) {
			await initDb(env);
		}

		// --- RUTE PUBLIK ADMIN ---

		// 0. GET /api/paket-aktif — publik, harga live untuk landing/harga/modal (langsung dari D1)
		if (method === "GET" && pathname === "/api/paket-aktif") {
			await initDb(env);
			try {
				if (!env.DB) return json({ ok: true, data: null, fallback: true }, 200, { "Cache-Control": "no-store" });
				const rows = (await env.DB.prepare("SELECT id,nama,tier,durasi_hari,max_res,bulk,enlarge,harga,bawaan,aktif,urut FROM paket WHERE aktif = 1 ORDER BY urut ASC, dibuat_ts ASC").all()).results || [];
				// fallback kalau kosong (belum seed)
				if (rows.length === 0) return json({ ok: true, data: [], fallback: true }, 200, { "Cache-Control": "no-store" });
				return json({ ok: true, data: rows }, 200, { "Cache-Control": "no-store" });
			} catch (e) {
				return json({ ok: false, error: String(e.message || e) }, 500, { "Cache-Control": "no-store" });
			}
		}

		// ====== FASE B — Poketo Auto-Lisensi (publik) ======
		// POST /api/pesanan/buat { paketId }
		if (method === "POST" && pathname === "/api/pesanan/buat") {
			await initDb(env);
			if (!env.DB) return json({ ok: false, error: "Database belum siap" }, 503);
			try {
				// Rate limit ringan: 5 pesanan/jam per IP (tulis ke login_cobaan sebagai bucket generik)
				const nowMs = Date.now();
				const oneHourAgo = nowMs - 60 * 60_1000;
				await env.DB.prepare("DELETE FROM login_cobaan WHERE ts < ?").bind(oneHourAgo).run();
				const bucketKey = "auto:" + clientIp;
				const cntRow = await env.DB.prepare("SELECT count(*) as c FROM login_cobaan WHERE ip = ?").bind(bucketKey).first();
				if (cntRow && Number(cntRow.c) >= 10) return json({ ok: false, error: "Terlalu banyak pesanan dalam 1 jam. Coba lagi dalam beberapa menit." }, 429);
				const b = await request.json().catch(() => ({}));
				const paketId = String(b.paketId || "").trim();
				if (!paketId) return badRequest("paketId wajib diisi (bulanan | lifetime atau id paket)");
				// Cari paket: dukung id penuh ATAU tier singkat
				let pkg = await env.DB.prepare("SELECT * FROM paket WHERE id = ? AND aktif = 1").bind(paketId).first();
				if (!pkg && (paketId === "bulanan" || paketId === "lifetime")) {
					pkg = await env.DB.prepare("SELECT * FROM paket WHERE tier = ? AND aktif = 1 ORDER BY urut ASC LIMIT 1").bind(paketId).first();
				}
				if (!pkg) return badRequest("Paket tidak ditemukan / nonaktif");
				if (!env.POKETO_API_KEY) return json({ ok: false, error: "POKETO_API_KEY belum disetel di Worker secrets." }, 503);
				const ref = generateRef();
				const amount = Number(pkg.harga);
				if (!Number.isSafeInteger(amount) || amount < 10000) return badRequest("Harga paket tidak valid (minimal Rp10.000 — aturan Poketo). Edit harga di panel /admin terlebih dulu.");
				const title = `Motion Easy — ${pkg.nama}`;
				const poketoBody = {
					referenceId: ref,
					amount,
					title,
					description: `Paket ${pkg.nama} (${pkg.tier})`,
					expiresInMinutes: 1440 * 3, // 3 hari
					metadata: { tier: pkg.tier, paket_id: pkg.id },
					redirectUrl: `https://${url.host}/bayar/${encodeURIComponent(ref)}/sukses`,
				};
				const pokRes = await fetch("https://poketo.id/api/v1/invoices", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${env.POKETO_API_KEY}`,
						"Content-Type": "application/json",
						"Idempotency-Key": ref,
					},
					body: JSON.stringify(poketoBody),
				});
				const pokJson = await pokRes.json().catch(() => ({}));
				if (!pokRes.ok) {
					const msg = pokJson?.error?.message || `Poketo ${pokRes.status}`;
					return json({ ok: false, error: msg, code: pokJson?.error?.code }, pokRes.status);
				}
				const inv = pokJson?.data || {};
				const invoiceId = inv.id || null;
				const paymentUrl = inv.paymentUrl || null;
				const totalAmount = inv.totalAmount ?? amount;
				const expiresAt = inv.expiresAt || null;
				await env.DB.prepare(
					"INSERT INTO pesanan_auto (ref, paket_id, paket_nama, tier, harga, status, invoice_id, payment_url, amount_total, ip, created_ts) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)"
				).bind(ref, pkg.id, pkg.nama, pkg.tier, amount, invoiceId, paymentUrl, Number(totalAmount) || amount, clientIp, nowMs).run();
				await env.DB.prepare("INSERT INTO login_cobaan (ip, ts) VALUES (?, ?)").bind(bucketKey, nowMs).run();
				return json({ ok: true, ref, invoiceId, paymentUrl, amount, totalAmount, expiresAt }, 201);
			} catch (e) {
				return json({ ok: false, error: e.message || String(e) }, 500);
			}
		}

		// GET /api/pesanan/:ref  — polling publik (no-store). Kode hanya saat Lunas.
		if (method === "GET" && pathname.startsWith("/api/pesanan/")) {
			await initDb(env);
			if (!env.DB) return json({ ok: false, error: "DB belum siap" }, 503);
			const raw = decodeURIComponent(pathname.replace("/api/pesanan/", "").split("/")[0]);
			if (!raw || raw.length < 4) return badRequest("ref tidak valid");
			const row = await env.DB.prepare("SELECT * FROM pesanan_auto WHERE ref = ?").bind(raw).first();
			if (!row) return json({ ok: false, error: "Pesanan tidak ditemukan" }, 404);
			const isPaid = row.status === "paid" || row.status === "lunas";
			return json({ ok: true, ref: row.ref, status: isPaid ? "lunas" : row.status, paket_id: row.paket_id, paket_nama: row.paket_nama, tier: row.tier, harga: row.harga, invoice_id: row.invoice_id, payment_url: row.payment_url, amount_total: row.amount_total, kode: isPaid ? row.kode : null, exp: isPaid ? row.exp : null, created_ts: row.created_ts, paid_ts: row.paid_ts, expiresAt: null }, 200, { "Cache-Control": "no-store" });
		}

		// POST /api/webhook/poketo — verifikasi HMAC + re-check via Poketo API + issue lisensi (idempoten)
		if (method === "POST" && pathname === "/api/webhook/poketo") {
			await initDb(env);
			if (!env.DB) return json({ ok: false, error: "DB belum siap" }, 503);
			const rawBody = await request.text();
			const sigHeader = request.headers.get("Poketo-Signature") || "";
			const eventHeader = request.headers.get("Poketo-Event") || "";
			const eventIdHeader = request.headers.get("Poketo-Event-Id") || "";
			if (!env.POKETO_WHSEC) return json({ ok: false, error: "POKETO_WHSEC belum disetel" }, 503);
			const verif = await verifyPoketoSignature(rawBody, sigHeader, env.POKETO_WHSEC);
			if (!verif.ok) return json({ ok: false, error: "Signature tidak sah: " + verif.reason }, 400);
			let evt = null; try { evt = JSON.parse(rawBody); } catch { return json({ ok: false, error: "Body bukan JSON" }, 400); }
			const eventType = evt?.type || eventHeader || "";
			const eventId = evt?.id || eventIdHeader || "";
			if (eventId) {
				const seen = await env.DB.prepare("SELECT event_id FROM webhook_event WHERE event_id = ?").bind(eventId).first();
				if (seen) return json({ ok: true, duplicate: true }, 200);
			}
			const invEnv = evt?.data || {};
			const referenceId = invEnv.referenceId || invEnv.reference_id || "";
			const statusStr = invEnv.status || "";
			// Simpan event untuk idempoten sebelum proses
			if (eventId) {
				try { await env.DB.prepare("INSERT OR IGNORE INTO webhook_event (event_id, ref, type, created_ts) VALUES (?, ?, ?, ?)").bind(eventId, referenceId || "", eventType, Date.now()).run(); } catch {}
			}
			if (!referenceId) return json({ ok: true, note: "tanpa referenceId, diabaikan" }, 200);
			const row = await env.DB.prepare("SELECT * FROM pesanan_auto WHERE ref = ?").bind(referenceId).first();
			if (!row) return json({ ok: true, note: "ref tidak dikenal" }, 200);
			// paid
			if (eventType === "invoice.paid" || statusStr === "paid") {
				// Cegah dobel issue: kalau sudah lunas, idempoten
				if (row.status === "paid" || row.status === "lunas") {
					if (eventId) await env.DB.prepare("UPDATE pesanan_auto SET event_id = ? WHERE ref = ?").bind(eventId, referenceId).run();
					return json({ ok: true, already_paid: true }, 200);
				}
				// Re-verify via Poketo API (sekali, gagal → tetap lanjut pakai event sebagai fallback sandbox bila API gagalkarena network)
				let verified = false; let invData = invEnv;
				if (env.POKETO_API_KEY) {
					const fetched = await fetchPoketoInvoice(referenceId, env.POKETO_API_KEY);
					if (fetched.res.ok && fetched.j?.data?.status === "paid") {
						invData = fetched.j.data; verified = true;
					} else if (fetched.res.ok && fetched.j?.data?.status !== "paid") {
						// status belum paid menurut API → jangan terbitkan dulu
						return json({ ok: true, note: "API cek: belum paid" }, 200);
					} else {
						// jaringan/429 → fallback: percaya event (sandbox simulation tidak selalu ter-fetch?)
						// tetap validasi amount dari event
						verified = false; invData = invEnv;
					}
				}
				const apiAmount = Number(invData.amount);
				if (Number.isSafeInteger(apiAmount) && Number.isSafeInteger(Number(row.harga)) && apiAmount !== Number(row.harga)) {
					await recordAudit(env, "webhook-poketo", "amount_mismatch", { ref: referenceId, expected: row.harga, got: apiAmount, verified }, clientIp);
					return json({ ok: false, error: "Amount mismatch" }, 400);
				}
				// Issue lisensi ECDSA
				const pkgForTier = await env.DB.prepare("SELECT * FROM paket WHERE id = ?").bind(row.paket_id).first();
				const tier = row.tier; const durasiHari = pkgForTier ? pkgForTier.durasi_hari : (tier === "lifetime" ? null : 30);
				let codeRes;
				try { codeRes = await issueLicenseCode(tier, durasiHari, referenceId, env); } catch (e) { return json({ ok: false, error: "Gagal terbitkan kode: " + e.message }, 500); }
				const nowTs = Date.now();
				await env.DB.prepare("UPDATE pesanan_auto SET status='paid', kode=?, exp=?, event_id=?, payment_method=?, paid_ts=? WHERE ref=?").bind(codeRes.code, codeRes.exp ?? null, eventId || null, invData.paymentMethod || invData.payment_method || null, nowTs, referenceId).run();
				// Dual-write ke tabel pesanan supaya tab Pesanan & ringkasan di /admin ikut kehitung
				try {
					const pesananId = "auto-" + referenceId;
					const existsPes = await env.DB.prepare("SELECT id FROM pesanan WHERE id = ?").bind(pesananId).first();
					if (!existsPes) {
						const pkgNama = row.paket_nama || (pkgForTier ? pkgForTier.nama : row.tier);
						await env.DB.prepare(
							"INSERT INTO pesanan (id, ts, nama, wa, paket_id, paket_nama, tier, harga, metode, kode, exp, status, note, email_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Lunas', ?, ?)"
						).bind(pesananId, nowTs, "Pembeli QRIS", "", row.paket_id, pkgNama, tier, Number(row.harga), "Poketo Auto", codeRes.code, codeRes.exp ?? null, referenceId, "auto:poketo").run();
					}
				} catch (e2) { console.error("dual-write pesanan gagal", e2); }
				await recordAudit(env, "auto:poketo", "terbitkan_otomatis", { ref: referenceId, tier, invoice_id: row.invoice_id, verified, eventId }, clientIp);
				return json({ ok: true, issued: true }, 200);
			}
			// expired / cancelled / refunded
			if (eventType === "invoice.expired" || statusStr === "expired") {
				if (row.status === "pending") await env.DB.prepare("UPDATE pesanan_auto SET status='expired', expired_ts=?, event_id=? WHERE ref=?").bind(Date.now(), eventId || null, referenceId).run();
				return json({ ok: true, expired: true }, 200);
			}
			if (eventType === "invoice.cancelled" || statusStr === "cancelled") {
				if (row.status === "pending") await env.DB.prepare("UPDATE pesanan_auto SET status='cancelled', event_id=? WHERE ref=?").bind(eventId || null, referenceId).run();
				return json({ ok: true, cancelled: true }, 200);
			}
			return json({ ok: true, ignored: true, type: eventType }, 200);
		}

		// 1. GET /api/admin/config
		if (method === "GET" && pathname === "/api/admin/config") {
			const session = await authenticateAdmin(request, env);
			return json({
				ok: true,
				googleClientId: env.GOOGLE_CLIENT_ID || "",
				authenticated: !!session,
				email: session ? session.email : null,
				d1Ready: !!env.DB,
			});
		}

		// 1b. GET /api/admin/tim + mutasi tim (rata: semua admin sederajat, CRUD dibatasi ownerEnv)
		// Role: ownerEnv = ada di ADMIN_EMAILS — satu-satunya yang boleh atur tim.
		async function isOwnerEnv(email) { return bootstrapEmails(env).includes(normalizeEmail(email)); }
		if (pathname.startsWith("/api/admin/tim")) {
			// GET daftar — semua admin boleh lihat
			if (method === "GET" && pathname === "/api/admin/tim") {
				const session = await authenticateAdmin(request, env); if (!session) return unauthorized();
				const rows = env.DB ? (await env.DB.prepare("SELECT email,nama,aktif,dibuat_ts,dibuat_oleh,terakhir_login_ts FROM admin ORDER BY dibuat_ts ASC").all()).results || [] : [];
				const envOwners = bootstrapEmails(env);
				return json({ ok: true, data: rows, envOwners, selfEmail: session.email }, 200);
			}
			if (method === "POST" && pathname === "/api/admin/tim") {
				const session = await authenticateAdmin(request, env); if (!session) return unauthorized();
				if (!await isOwnerEnv(session.email)) return json({ ok: false, error: "Hanya owner (email di ADMIN_EMAILS) yang bisa menambah admin. Email kamu belum owner." }, 403);
				const xAdmin = request.headers.get("X-ME-Admin"); if (!xAdmin) return json({ ok: false, error: "Header keamanan X-ME-Admin wajib ada." }, 403);
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const b = await request.json();
				const emailNorm = normalizeEmail(b.email || b.Email || "");
				const nama = String(b.nama || b.name || "").trim().slice(0, 80);
				if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) return badRequest("Email tidak valid.");
				if (bootstrapEmails(env).includes(emailNorm)) return badRequest("Email ini sudah Owner (ADMIN_EMAILS) — tidak perlu ditambah di tim.");
				const exists = await getAdminRow(env, emailNorm); if (exists) return badRequest("Email sudah terdaftar di tim.");
				const cnt = env.DB ? (await env.DB.prepare("SELECT count(*) as c FROM admin").first())?.c || 0 : 0;
				if (cnt >= 10) return badRequest("Batas 10 admin tim. Hapus salah satu dulu.");
				await env.DB.prepare("INSERT INTO admin (email,nama,aktif,dibuat_ts,dibuat_oleh,terakhir_login_ts) VALUES (?,?,?,?,?,NULL)").bind(emailNorm, nama, 1, Date.now(), session.email).run();
				await recordAudit(env, session.email, "tambah_admin", { email: emailNorm, nama }, clientIp);
				return json({ ok: true, email: emailNorm }, 200);
			}
			if (method === "DELETE" && pathname.startsWith("/api/admin/tim/")) {
				const session = await authenticateAdmin(request, env); if (!session) return unauthorized();
				if (!await isOwnerEnv(session.email)) return json({ ok: false, error: "Hanya owner yang bisa menghapus admin." }, 403);
				const xAdmin = request.headers.get("X-ME-Admin"); if (!xAdmin) return json({ ok: false, error: "Header keamanan X-ME-Admin wajib ada." }, 403);
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const emailNorm = normalizeEmail(decodeURIComponent(pathname.replace("/api/admin/tim/", "")));
				if (!emailNorm) return badRequest("Email wajib diisi.");
				if (normalizeEmail(session.email) === emailNorm) return badRequest("Tidak bisa menghapus email kamu sendiri.");
				if (bootstrapEmails(env).includes(emailNorm)) return badRequest("Owner (ADMIN_EMAILS) tidak bisa dihapus via panel.");
				const exists = await getAdminRow(env, emailNorm); if (!exists) return badRequest("Email tidak ditemukan di tim.");
				await env.DB.prepare("DELETE FROM admin WHERE email = ?").bind(emailNorm).run();
				await recordAudit(env, session.email, "hapus_admin", { email: emailNorm }, clientIp);
				return json({ ok: true }, 200);
			}
			if (method === "PATCH" && pathname.startsWith("/api/admin/tim/")) {
				const session = await authenticateAdmin(request, env); if (!session) return unauthorized();
				if (!await isOwnerEnv(session.email)) return json({ ok: false, error: "Hanya owner yang bisa mengubah tim." }, 403);
				const xAdmin = request.headers.get("X-ME-Admin"); if (!xAdmin) return json({ ok: false, error: "Header keamanan X-ME-Admin wajib ada." }, 403);
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const emailNorm = normalizeEmail(decodeURIComponent(pathname.replace("/api/admin/tim/", "")));
				const b = await request.json();
				const row = await getAdminRow(env, emailNorm); if (!row) return badRequest("Email tidak ditemukan di tim.");
				if (b.aktif !== undefined) {
					if (normalizeEmail(session.email) === emailNorm && b.aktif === 0) return badRequest("Tidak bisa menonaktifkan email kamu sendiri.");
					await env.DB.prepare("UPDATE admin SET aktif = ? WHERE email = ?").bind(b.aktif ? 1 : 0, emailNorm).run();
					await recordAudit(env, session.email, b.aktif ? "aktifkan_admin" : "nonaktifkan_admin", { email: emailNorm }, clientIp);
					return json({ ok: true }, 200);
				}
				if (b.nama !== undefined) {
					await env.DB.prepare("UPDATE admin SET nama = ? WHERE email = ?").bind(String(b.nama || "").trim().slice(0,80), emailNorm).run();
					await recordAudit(env, session.email, "ubah_nama_admin", { email: emailNorm, nama: b.nama }, clientIp);
					return json({ ok: true }, 200);
				}
				return badRequest("Tidak ada perubahan.");
			}
		}

		// 2. POST /api/admin/login (Google ID Token)
		if (method === "POST" && pathname === "/api/admin/login") {
			try {
				const body = await request.json();
				const credential = body.credential;
				if (!credential) return badRequest("Kredensial Google wajib disertakan");

				const { email, name } = await verifyGoogleIdToken(credential, env);

				const allow = await isAdminAllowed(env, email);
				if (!allow.ok) {
					await recordAudit(env, email, "login_ditolak_bukan_admin", { name }, clientIp);
					return json({ ok: false, error: `Akun Google (${email}) belum terdaftar sebagai admin. Minta Owner menambahkan email ini di panel \u2192 Tim Admin.` }, 403);
				}
				await touchAdminLogin(env, email);

				const currentEpoch = await getSessionEpoch(env);
				const nowSec = Math.floor(Date.now() / 1000);
				const sessionPayload = {
					email: email.toLowerCase(),
					name,
					iat: nowSec,
					exp: nowSec + 43200, // 12 jam
					epoch: currentEpoch,
				};

				if (!env.SESSION_SECRET) return json({ ok: false, error: "SESSION_SECRET belum dikonfigurasi." }, 503);
				const secret = env.SESSION_SECRET;
				const token = await signSessionToken(sessionPayload, secret);

				await recordAudit(env, email, "login_google_sukses", { name }, clientIp);

				const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
				const cookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${isLocal ? "" : "; Secure"}`;

				return json(
					{ ok: true, email: email.toLowerCase(), name },
					200,
					{ "Set-Cookie": `me_admin=${encodeURIComponent(token)}; ${cookieOpts}` }
				);
			} catch (e) {
				return json({ ok: false, error: e.message || "Gagal verifikasi login Google" }, 400);
			}
		}

		// 3. POST /api/admin/login-recovery (Kode Cadangan saat Google down)
		if (method === "POST" && pathname === "/api/admin/login-recovery") {
			try {
				if (!env.RECOVERY_CODE) {
					return json({ ok: false, error: "RECOVERY_CODE belum diatur di Cloudflare Worker secret." }, 500);
				}

				// Rate limiting: maks 5 percobaan per 15 menit
				if (env.DB) {
					const now = Date.now();
					const batas15m = now - 15 * 60_000;
					await env.DB.prepare("DELETE FROM login_cobaan WHERE ts < ?").bind(batas15m).run();
					const countAttempts = await env.DB.prepare(
						"SELECT count(*) as c FROM login_cobaan WHERE ip = ? AND ts >= ?"
					).bind(clientIp, batas15m).first();

					if (countAttempts && countAttempts.c >= 5) {
						return json({ ok: false, error: "Terlalu banyak percobaan. Silakan coba lagi 15 menit lagi." }, 429);
					}
				}

				const body = await request.json();
				const codeInput = String(body.code || "").trim();

				const match = timingSafeEqual(codeInput, env.RECOVERY_CODE.trim());
				if (!match) {
					if (env.DB) {
						await env.DB.prepare("INSERT INTO login_cobaan (ip, ts) VALUES (?, ?)").bind(clientIp, Date.now()).run();
					}
					await recordAudit(env, "unknown", "login_recovery_salah", {}, clientIp);
					return json({ ok: false, error: "Kode pemulihan salah" }, 401);
				}

				const currentEpoch = await getSessionEpoch(env);
				const nowSec = Math.floor(Date.now() / 1000);
				const email = "admin-recovery@motion-easy.internal";
				const sessionPayload = {
					email,
					name: "Admin Pemulihan",
					iat: nowSec,
					exp: nowSec + 43200,
					epoch: currentEpoch,
				};

				if (!env.SESSION_SECRET) return json({ ok: false, error: "SESSION_SECRET belum dikonfigurasi." }, 503);
				const secret = env.SESSION_SECRET;
				const token = await signSessionToken(sessionPayload, secret);

				await recordAudit(env, email, "login_recovery_sukses", {}, clientIp);

				const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
				const cookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${isLocal ? "" : "; Secure"}`;

				return json(
					{ ok: true, email, name: "Admin Pemulihan" },
					200,
					{ "Set-Cookie": `me_admin=${encodeURIComponent(token)}; ${cookieOpts}` }
				);
			} catch (e) {
				return json({ ok: false, error: e.message || "Gagal login pemulihan" }, 400);
			}
		}

		// 4. POST /api/admin/logout
		if (method === "POST" && pathname === "/api/admin/logout") {
			const origin = request.headers.get("Origin");
			if (origin && origin !== url.origin) return json({ ok: false, error: "Origin tidak diizinkan." }, 403);
			if (!request.headers.get("X-ME-Admin")) return json({ ok: false, error: "Header keamanan X-ME-Admin wajib ada." }, 403);
			const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
			return json(
				{ ok: true },
				200,
				{ "Set-Cookie": `me_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isLocal ? "" : "; Secure"}` }
			);
		}

		// --- RUTE TERPROTEKSI ADMIN (Wajib Auth & CSRF Guard) ---

		if (pathname.startsWith("/api/admin/")) {
			const session = await authenticateAdmin(request, env);
			if (!session) return unauthorized();

			// CSRF Guard untuk mutasi (POST, PATCH, DELETE)
			if (method === "POST" || method === "PATCH" || method === "DELETE") {
				const xAdmin = request.headers.get("X-ME-Admin");
				if (!xAdmin) {
					return json({ ok: false, error: "Header keamanan X-ME-Admin wajib ada." }, 403);
				}
			}

			// 5. POST /api/admin/logout-semua (Invalidasi semua sesi aktif)
			if (method === "POST" && pathname === "/api/admin/logout-semua") {
				if (env.DB) {
					await env.DB.prepare(
						"INSERT INTO pengaturan (kunci, nilai) VALUES ('sesi_epoch', '1') ON CONFLICT(kunci) DO UPDATE SET nilai = CAST(CAST(nilai AS INTEGER) + 1 AS TEXT)"
					).run();
				}
				await recordAudit(env, session.email, "logout_semua_perangkat", {}, clientIp);
				const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
				return json(
					{ ok: true },
					200,
					{ "Set-Cookie": `me_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isLocal ? "" : "; Secure"}` }
				);
			}

			// 6. CRUD PAKET
			if (pathname === "/api/admin/paket") {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);

				// GET semua paket
				if (method === "GET") {
					const rows = await env.DB.prepare(
						"SELECT * FROM paket ORDER BY urut ASC, dibuat_ts DESC"
					).all();
					return json({ ok: true, data: rows.results || [] });
				}

				// POST buat paket baru
				if (method === "POST") {
					const b = await request.json();
					const nama = String(b.nama || "").trim();
					const tier = b.tier === "lifetime" ? "lifetime" : "bulanan";
					const durasiHari = tier === "lifetime" ? null : (Number(b.durasi_hari) || 30);
					const maxRes = tier === "lifetime" ? 2160 : 1440;
					const harga = Math.max(0, Number(b.harga) || 0);
					const catatan = String(b.catatan || "").trim();
					const bulk = b.bulk === false ? 0 : 1;
					const enlarge = b.enlarge === false ? 0 : 1;
					const id = "pkt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
					const now = Date.now();

					if (!nama) return badRequest("Nama paket wajib diisi");

					await env.DB.prepare(
						`INSERT INTO paket (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, ?)`
					).bind(id, nama, tier, durasiHari, maxRes, bulk, enlarge, harga, catatan, now).run();

					await recordAudit(env, session.email, "tambah_paket", { id, nama, tier, harga }, clientIp);
					return json({ ok: true, id });
				}
			}

			// PATCH / DELETE paket per-ID
			if (pathname.startsWith("/api/admin/paket/")) {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const id = pathname.replace("/api/admin/paket/", "").trim();

				if (method === "PATCH") {
					const b = await request.json();
					const fields = [];
					const values = [];

					if (b.nama !== undefined) {
						const nama = String(b.nama).trim();
						if (!nama) return badRequest("Nama paket tidak boleh kosong.");
						fields.push("nama = ?"); values.push(nama);
					}
					if (b.harga !== undefined) {
						const harga = Number(b.harga);
						if (!Number.isSafeInteger(harga) || harga < 0) return badRequest("Harga harus bilangan bulat non-negatif.");
						fields.push("harga = ?"); values.push(harga);
					}
					if (b.aktif !== undefined) { fields.push("aktif = ?"); values.push(b.aktif ? 1 : 0); }
					if (b.durasi_hari !== undefined) { fields.push("durasi_hari = ?"); values.push(b.durasi_hari === null ? null : Number(b.durasi_hari)); }
					if (b.catatan !== undefined) { fields.push("catatan = ?"); values.push(String(b.catatan).trim()); }
					if (b.urut !== undefined) { fields.push("urut = ?"); values.push(Number(b.urut) || 0); }

					if (fields.length === 0) return badRequest("Tidak ada field yang diubah");

					values.push(id);
					await env.DB.prepare(`UPDATE paket SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
					await recordAudit(env, session.email, "ubah_paket", { id, updates: b }, clientIp);
					return json({ ok: true });
				}

				if (method === "DELETE") {
					const pkg = await env.DB.prepare("SELECT * FROM paket WHERE id = ?").bind(id).first();
					if (pkg && pkg.bawaan) {
						return badRequest("Paket bawaan sistem tidak boleh dihapus. Anda dapat menonaktifkannya.");
					}
					await env.DB.prepare("DELETE FROM paket WHERE id = ?").bind(id).run();
					await recordAudit(env, session.email, "hapus_paket", { id, nama: pkg?.nama }, clientIp);
					return json({ ok: true });
				}
			}

			// 7b. POST /api/admin/pesanan/impor — impor kode CLI ke D1 (idempoten, INSERT OR IGNORE)
			if (method === "POST" && pathname === "/api/admin/pesanan/impor") {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const b = await request.json();
				const raws = Array.isArray(b.items) ? b.items : (Array.isArray(b) ? b : []);
				if (raws.length === 0) return badRequest("Tidak ada baris untuk diimpor.");
				const batch = raws.slice(0, 200);
				let ditambah = 0; let dilewati = 0;
				const seen = new Set();
				for (const it of batch) {
					const kode = String(it.kode || "").trim();
					const tier = String(it.tier || "").trim();
					if (!kode || !kode.includes(".") || (tier !== "bulanan" && tier !== "lifetime")) { dilewati++; continue; }
					const nama = String(it.nama || "Pembeli CLI").trim() || "Pembeli CLI";
					const wa = String(it.wa || "").trim();
					const note = String(it.note || it.catatan || "").trim();
					const metode = "CLI (offline)";
					const tierFinal = it.tier === "lifetime" ? "lifetime" : "bulanan";
					const exp = it.exp === null || it.exp === undefined ? null : Number(it.exp) || null;
					const harga = Number.isFinite(Number(it.harga)) ? Number(it.harga) : null;
					const paket_id = String(it.paket_id || (tierFinal === "lifetime" ? "paket-lifetime" : "paket-bulanan-30"));
					const paket_nama = String(it.paket_nama || (tierFinal === "lifetime" ? "Lifetime Pass" : "Paket Bulanan (30 Hari)"));
					const ts = Number.isFinite(Number(it.ts)) ? Number(it.ts) : Date.now();
					if (!harga && harga !== 0) { /* hargaFinal di bawah */ }
					const kodeBytes = new TextEncoder().encode(kode);
					const hashBuf = await crypto.subtle.digest("SHA-256", kodeBytes);
					const hex = [...new Uint8Array(hashBuf)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
					const id = "cli-" + hex;
					if (seen.has(id)) { dilewati++; continue; } seen.add(id);
					const exists = await env.DB.prepare("SELECT id FROM pesanan WHERE id = ?").bind(id).first();
					if (exists) { dilewati++; continue; }
					const hargaFinal = harga !== null ? harga : (tierFinal === "lifetime" ? 55000 : 15000);
					try {
						const r = await env.DB.prepare(
							`INSERT OR IGNORE INTO pesanan (id, ts, nama, wa, paket_id, paket_nama, tier, harga, metode, kode, exp, status, note, email_admin)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Lunas', ?, ?)`
						).bind(id, ts, nama, wa, paket_id, paket_nama, tierFinal, hargaFinal, metode, kode, exp, note, session.email).run();
						const ch = r?.meta?.changes;
						if (ch === 0) { dilewati++; continue; }
						ditambah++;
					} catch { dilewati++; }
				}
				await recordAudit(env, session.email, "impor_kode_cli", { jumlah: batch.length, ditambah, dilewati }, clientIp);
				return json({ ok: true, ditambah, dilewati, total: batch.length });
			}

			// 7. POST /api/admin/issue (PENERBITAN LISENSI RESMI SERVER-SIDE ECDSA)
			if (method === "POST" && pathname === "/api/admin/issue") {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				try {
					const b = await request.json();
					const paketId = String(b.paketId || "").trim();
					const nama = String(b.nama || "").trim();
					const wa = String(b.wa || "").trim();
					const metode = String(b.metode || "QRIS").trim();
					const note = String(b.note || "").trim();

					if (!paketId) return badRequest("Pilihan paket wajib diisi");
					if (!nama) return badRequest("Nama pembeli wajib diisi");

					const pkg = await env.DB.prepare("SELECT * FROM paket WHERE id = ?").bind(paketId).first();
					if (!pkg) return badRequest("Paket tidak ditemukan");
					if (!pkg.aktif) return badRequest("Paket ini sedang nonaktif dan tidak dapat diterbitkan.");

					const { code, exp } = await issueLicenseCode(pkg.tier, pkg.durasi_hari, note, env);

					const orderId = "TRX-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
					const now = Date.now();

					await env.DB.prepare(
						`INSERT INTO pesanan (id, ts, nama, wa, paket_id, paket_nama, tier, harga, metode, kode, exp, status, note, email_admin)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Lunas', ?, ?)`
					).bind(
						orderId,
						now,
						nama,
						wa,
						pkg.id,
						pkg.nama,
						pkg.tier,
						pkg.harga,
						metode,
						code,
						exp,
						note,
						session.email
					).run();

					await recordAudit(
						env,
						session.email,
						"terbitkan_lisensi",
						{ orderId, paket: pkg.nama, pembeli: nama, tier: pkg.tier },
						clientIp
					);

					return json({
						ok: true,
						pesanan: {
							id: orderId,
							ts: now,
							nama,
							wa,
							paket_id: pkg.id,
							paket_nama: pkg.nama,
							tier: pkg.tier,
							harga: pkg.harga,
							metode,
							kode: code,
							exp,
							status: "Lunas",
							note,
						},
					});
				} catch (e) {
					return json({ ok: false, error: e.message || "Gagal menerbitkan lisensi" }, 500);
				}
			}

			// 8. GET /api/admin/pesanan (Daftar & Pencarian Pesanan)
			if (method === "GET" && pathname === "/api/admin/pesanan") {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);

				const q = (url.searchParams.get("q") || "").toLowerCase().trim();
				const tier = url.searchParams.get("tier") || "";
				const status = url.searchParams.get("status") || "";
				const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
				const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

				const conditions = [];
				const params = [];

				if (q) {
					conditions.push("(LOWER(nama) LIKE ? ESCAPE '\\' OR wa LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\' OR LOWER(kode) LIKE ? ESCAPE '\\')");
					const escapedQ = q.replace(/[\\%_]/g, "\\$&");
					const like = `%${escapedQ}%`;
					params.push(like, like, like, like);
				}
				if (tier && tier !== "all") {
					conditions.push("tier = ?");
					params.push(tier);
				}
				if (status && status !== "all") {
					conditions.push("status = ?");
					params.push(status);
				}

				const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

				const ordersQuery = `SELECT * FROM pesanan ${whereClause} ORDER BY ts DESC LIMIT ? OFFSET ?`;
				const countQuery = `SELECT count(*) as total, sum(case when status='Lunas' then harga else 0 end) as total_pendapatan FROM pesanan ${whereClause}`;

				const [rowsRes, countRes] = await Promise.all([
					env.DB.prepare(ordersQuery).bind(...params, limit, offset).all(),
					env.DB.prepare(countQuery).bind(...params).first(),
				]);

				// Hitung metrics ringkasan (bulan ini)
				const startOfMonth = new Date();
				startOfMonth.setDate(1);
				startOfMonth.setHours(0, 0, 0, 0);
				const startOfMonthTs = startOfMonth.getTime();

				const stats = await env.DB.prepare(`
					SELECT
						count(*) as total_transaksi,
						sum(case when ts >= ? and status='Lunas' then harga else 0 end) as pendapatan_bulan_ini,
						count(case when tier='lifetime' then 1 end) as total_lifetime,
						count(case when tier='bulanan' and (exp is null or exp * 1000 > ?) then 1 end) as bulanan_aktif
					FROM pesanan
				`).bind(startOfMonthTs, Date.now()).first();

				return json({
					ok: true,
					data: rowsRes.results || [],
					total: countRes?.total || 0,
					total_pendapatan: countRes?.total_pendapatan || 0,
					stats: {
						pendapatan_bulan_ini: stats?.pendapatan_bulan_ini || 0,
						total_transaksi: stats?.total_transaksi || 0,
						total_lifetime: stats?.total_lifetime || 0,
						bulanan_aktif: stats?.bulanan_aktif || 0,
					},
				});
			}

			// PATCH status pesanan (e.g. Batal / Refund)
			if (method === "PATCH" && pathname.startsWith("/api/admin/pesanan/")) {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const id = pathname.replace("/api/admin/pesanan/", "").trim();
				const b = await request.json();
				const newStatus = b.status === "Batal" || b.status === "Refund" ? b.status : "Lunas";

				await env.DB.prepare("UPDATE pesanan SET status = ? WHERE id = ?").bind(newStatus, id).run();
				await recordAudit(env, session.email, "ubah_status_pesanan", { id, status: newStatus }, clientIp);
				return json({ ok: true });
			}

			// 9. GET /api/admin/audit (Log Aktivitas Admin)
			if (method === "GET" && pathname === "/api/admin/audit") {
				if (!env.DB) return json({ ok: false, error: "Database D1 belum dihubungkan" }, 503);
				const rows = await env.DB.prepare("SELECT * FROM audit ORDER BY ts DESC LIMIT 50").all();
				return json({ ok: true, data: rows.results || [] });
			}
		}

		// --- SPA STATIC FALLBACK ---
		const res = await env.ASSETS.fetch(request);
		if (res.status !== 404) return res;
		return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
	},
};
