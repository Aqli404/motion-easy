import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Copy, CheckCircle2, Clock, ExternalLink, Loader2, AlertCircle, ShieldCheck, QrCode } from "lucide-react";

type PesananStatus = {
  ok: boolean;
  ref: string;
  status: string;
  paket_nama: string;
  tier: string;
  harga: number;
  amount_total: number;
  invoice_id: string | null;
  payment_url: string | null;
  kode: string | null;
  exp: number | null;
  error?: string;
};

function formatRp(n: number) { return "Rp " + new Intl.NumberFormat("id-ID").format(n); }

export default function Bayar() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PesananStatus | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!ref) return;
    try {
      const r = await fetch(`/api/pesanan/${encodeURIComponent(ref)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Gagal memuat pesanan");
      setData(j as PesananStatus);
      if (j.status === "lunas" || j.status === "paid") {
        // keep polling stopped by effect - handled there, but also redirect to sukses for clean URL
        // don't auto-navigate to avoid history spam during polling, just show success inline
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    }
  }, [ref]);

  useEffect(() => {
    fetchStatus();
    if (!ref) return;
    const t = setInterval(() => {
      // stop polling once paid/expired/cancelled
      if (data && (data.status === "lunas" || data.status === "paid" || data.status === "expired" || data.status === "cancelled")) return;
      fetchStatus();
    }, 2500);
    return () => clearInterval(t);
  }, [ref, fetchStatus, data?.status]);

  if (!ref) return <div className="p-8 text-center text-sm text-muted">Ref tidak ada. <Link to="/harga" className="underline text-primary">Kembali ke Harga</Link></div>;
  if (err && !data) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 gap-3">
      <AlertCircle className="h-8 w-8 text-error" />
      <p className="text-sm text-error">{err}</p>
      <Link to="/harga" className="text-xs underline text-muted">← Kembali ke Harga</Link>
    </div>
  );
  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>;

  const isPaid = data.status === "lunas" || data.status === "paid";
  const isExpired = data.status === "expired";
  const isCancelled = data.status === "cancelled";
  const isPending = !isPaid && !isExpired && !isCancelled;

  const salinKode = async () => {
    if (!data.kode) return;
    await navigator.clipboard.writeText(data.kode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
          <Link to="/" className="hover:text-ink">Beranda</Link><span>›</span><Link to="/harga" className="hover:text-ink">Harga</Link><span>›</span><span className="text-ink">Bayar {ref}</span>
        </div>
        <h1 className="mt-3 text-xl font-black tracking-tight">{isPaid ? "Pembayaran Berhasil 🎉" : "Selesaikan Pembayaran"}</h1>
        <p className="mt-1 text-xs text-ink-dim">
          {isPaid ? "Kode lisensi siap — salin & aktivasi di Studio." : <>Scan QRIS / buka link bayar. <strong className="text-ink">Anda menerima tagihan utuh</strong> — biaya ditanggung pembeli (Poketo/DOKU).</>}
        </p>

        {/* Ringkasan */}
        <div className="mt-5 rounded-xl border border-edge bg-panel p-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted">Paket</span><span className="font-semibold">{data.paket_nama}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted">Nominal kamu terima</span><span className="font-mono font-bold">{formatRp(data.harga)}</span>
          </div>
          {data.amount_total && data.amount_total !== data.harga && (
            <div className="flex justify-between text-[11px] mt-1 text-muted">
              <span>Pembeli bayar (incl. fee)</span><span className="font-mono">{formatRp(data.amount_total)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] mt-2">
            <span className="text-muted">Ref</span><span className="font-mono text-[11px]">{data.ref}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1 items-center">
            <span className="text-muted">Status</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono ${isPaid ? "bg-tertiary/10 text-tertiary border-tertiary/20" : isPending ? "bg-primary/10 text-primary border-primary/20" : "bg-error/10 text-error border-error/20"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-tertiary" : isPending ? "bg-primary animate-pulse" : "bg-error"}`} />
              {isPaid ? "Lunas" : isPending ? "Menunggu bayar" : isExpired ? "Kedaluwarsa" : "Dibatalkan"}
            </span>
          </div>
        </div>

        {/* Pending: link bayar */}
        {isPending && (
          <div className="mt-5 space-y-4">
            {data.payment_url ? (
              <a href={data.payment_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-3 text-sm font-bold text-deep shadow hover:brightness-105">
                <ExternalLink className="h-4 w-4" /> Buka Halaman Bayar (QRIS / VA / PayLater)
              </a>
            ) : (
              <div className="rounded-xl border border-dashed border-edge bg-panel-low p-4 text-center text-xs text-muted flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Menyiapkan link bayar…
              </div>
            )}
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-xs leading-relaxed">
              <div className="flex gap-2">
                <QrCode className="h-4 w-4 shrink-0 text-secondary mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Cara bayar (QRIS)</p>
                  <p className="text-ink-dim mt-1">Buka link di atas → pilih <strong>QRIS</strong> → scan pakai DANA / GoPay / OVO / m-banking. Bisa juga <em>simpan gambar QR → pindai dari galeri</em> kalau di HP yang sama.</p>
                  <p className="font-mono text-[11px] text-muted mt-2">Tagihan berlaku 3 hari. Halaman ini auto-refresh tiap ~2 detik.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
              <Clock className="h-3.5 w-3.5" /> Menunggu pembayaran… halaman akan otomatis jadi “Lunas” setelah kamu bayar.
            </div>
            {data.payment_url && (
              <p className="text-[11px] font-mono text-muted break-all">Link: <a href={data.payment_url} target="_blank" rel="noreferrer" className="underline text-secondary">{data.payment_url}</a></p>
            )}
          </div>
        )}

        {/* Paid: kode */}
        {isPaid && data.kode && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-tertiary/30 bg-tertiary/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-tertiary"><CheckCircle2 className="h-4 w-4" /> Kode Lisensi Resmi</div>
              <div className="mt-3 rounded-lg bg-well border border-edge p-3">
                <p className="font-mono text-[11px] leading-relaxed break-all select-all text-ink">{data.kode}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={salinKode} className="flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-semibold hover:bg-panel-high">
                  <Copy className="h-3.5 w-3.5" /> {copied ? "Tersalin ✓" : "Salin Kode"}
                </button>
                <Link to="/lisensi" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-deep">Aktivasi di Lisensi →</Link>
              </div>
              <p className="mt-3 text-[11px] font-mono text-muted">Masa berlaku: {data.exp ? new Date(data.exp * 1000).toLocaleDateString("id-ID", { dateStyle: "long" }) : "selamanya (lifetime)"}</p>
            </div>
            <div className="rounded-xl border border-edge bg-panel-low p-3 flex gap-2 text-[11px] leading-relaxed text-muted">
              <ShieldCheck className="h-4 w-4 shrink-0 text-secondary mt-0.5" />
              <span>Kode ditandatangani ECDSA P-256 — tempel di <Link to="/lisensi" className="underline text-secondary">Aktivasi Lisensi</Link> lalu ekspor 4K langsung di Studio. Garansi 7 hari.</span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="mt-5 rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            Tagihan kedaluwarsa (3 hari lewat). Silakan buat pesanan baru di <Link to="/harga" className="underline">Harga</Link>.
          </div>
        )}
        {isCancelled && (
          <div className="mt-5 rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            Tagihan dibatalkan. Buat pesanan baru di <Link to="/harga" className="underline">Harga</Link>.
          </div>
        )}

        {/* Fallback WA */}
        <p className="mt-8 text-center font-mono text-[11px] text-muted">
          Kendala bayar? Hubungi admin via <a href="https://wa.me/6285792945213" target="_blank" rel="noreferrer" className="underline text-secondary">WhatsApp</a> — sebutkan ref <span className="font-bold">{data.ref}</span>
        </p>
      </div>
    </div>
  );
}
