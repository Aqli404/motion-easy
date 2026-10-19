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

async function authenticateAdmin(req, env) {
	if (!env.SESSION_SECRET) return null;
	const secret = env.SESSION_SECRET;
	const cookies = parseCookies(req);
	const token = cookies["me_admin"];
	if (!token) return null;

	const session = await verifySessionToken(token, secret);
	if (!session || !session.email) return null;

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
		`);

		// Seed paket default jika belum ada
		const countRow = await env.DB.prepare("SELECT count(*) as c FROM paket").first();
		if (countRow && countRow.c === 0) {
			const now = Date.now();
			await env.DB.batch([
				env.DB.prepare(
					`INSERT INTO paket (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					"paket-bulanan-30",
					"Paket Bulanan (30 Hari)",
					"bulanan",
					30,
					1440,
					1,
					1,
					15000,
					1,
					1,
					1,
					"Standar 30 hari resolusi hingga 2K (1440p)",
					now
				),
				env.DB.prepare(
					`INSERT INTO paket (id, nama, tier, durasi_hari, max_res, bulk, enlarge, harga, bawaan, aktif, urut, catatan, dibuat_ts)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(
					"paket-lifetime",
					"Lifetime Pass (Akses Selamanya)",
					"lifetime",
					null,
					2160,
					1,
					1,
					55000,
					1,
					1,
					2,
					"Akses seumur hidup 4K (2160p) tanpa batas waktu",
					now
				),
				env.DB.prepare(
					`INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('sesi_epoch', '1')`
				),
			]);
		}
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

		// 2. POST /api/admin/login (Google ID Token)
		if (method === "POST" && pathname === "/api/admin/login") {
			try {
				const body = await request.json();
				const credential = body.credential;
				if (!credential) return badRequest("Kredensial Google wajib disertakan");

				const { email, name } = await verifyGoogleIdToken(credential, env);

				// Periksa daftar putih admin
				const adminEmailsRaw = env.ADMIN_EMAILS || "";
				const allowedList = adminEmailsRaw
					.split(",")
					.map((e) => e.trim().toLowerCase())
					.filter(Boolean);

				if (allowedList.length === 0) {
					return json({ ok: false, error: "ADMIN_EMAILS belum diatur di Cloudflare Worker secret." }, 500);
				}

				if (!allowedList.includes(email.toLowerCase())) {
					await recordAudit(env, email, "login_ditolak_bukan_admin", { name }, clientIp);
					return json({ ok: false, error: `Akun Google (${email}) tidak terdaftar sebagai admin.` }, 403);
				}

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

					if (b.nama !== undefined) { fields.push("nama = ?"); values.push(String(b.nama).trim()); }
					if (b.harga !== undefined) { fields.push("harga = ?"); values.push(Math.max(0, Number(b.harga))); }
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
					conditions.push("(LOWER(nama) LIKE ? OR wa LIKE ? OR id LIKE ? OR LOWER(kode) LIKE ?)");
					const like = `%${q}%`;
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
