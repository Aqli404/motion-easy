// Worker mini Cloudflare: sajikan aset statis; rute tak dikenal → index.html (fallback SPA)
// Rute /lisensi, /harga, /studio dikonsumsi langsung oleh React Router — jadi harus SPA fallback.
export default {
	async fetch(request, env) {
		const res = await env.ASSETS.fetch(request);
		if (res.status !== 404) return res;
		const url = new URL(request.url);
		return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
	},
};
