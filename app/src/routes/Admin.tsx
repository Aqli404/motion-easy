import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  KeyRound,
  Send,
  Copy,
  Check,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Search,
  MessageCircle,
  AlertCircle,
  Lock,
  LogOut,
  Trash2,
  DollarSign,
  Users,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

// Storage Keys
const STORAGE_ORDERS = "me.admin.orders.v1";
const STORAGE_PIN = "me.admin.pin.v1";
const STORAGE_PRIV_KEY = "me.admin.priv_key.v1";

const DEFAULT_PIN = "889900"; // PIN Default admin pertama kali

export interface OrderRecord {
  id: string;
  timestamp: number;
  nama: string;
  wa: string;
  paket: "bulanan" | "lifetime";
  harga: number;
  metode: string;
  kode: string;
  exp: number | null; // null jika lifetime, unix second jika bulanan
  status: "Lunas" | "Refund";
  note?: string;
}

// Helper Base64URL
function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Signer ECDSA WebCrypto
async function generateLicenseCode(
  privJwk: any,
  tier: "bulanan" | "lifetime",
  bulan = 1,
  note = ""
): Promise<{ code: string; exp: number | null }> {
  const key = await window.crypto.subtle.importKey(
    "jwk",
    privJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  let exp: number | null = null;
  if (tier === "bulanan") {
    exp = now + bulan * 30 * 24 * 3600;
  }

  const payload = { v: 1, tier, iat: now, exp, note };
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);

  const sig = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    payloadBytes
  );

  return {
    code: `${b64u(payloadBytes)}.${b64u(sig)}`,
    exp,
  };
}

export default function AdminPortal() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [savedPin, setSavedPin] = useState(DEFAULT_PIN);

  // Private key state
  const [privKeyJwk, setPrivKeyJwk] = useState<any | null>(null);
  const [keyInputText, setKeyInputText] = useState("");

  // Tabs: 'buat' | 'pesanan' | 'template' | 'kunci'
  const [tab, setTab] = useState<"buat" | "pesanan" | "template" | "kunci">("buat");

  // Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [search, setSearch] = useState("");

  // Form Buat Lisensi
  const [formNama, setFormNama] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formPaket, setFormPaket] = useState<"bulanan" | "lifetime">("bulanan");
  const [formBulan, setFormBulan] = useState(1);
  const [formMetode, setFormMetode] = useState("QRIS");
  const [formNote, setFormNote] = useState("");
  const [loadingSign, setLoadingSign] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{
    order: OrderRecord;
    copied: boolean;
  } | null>(null);

  // Status copy global
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load storage on mount
  useEffect(() => {
    try {
      const pin = localStorage.getItem(STORAGE_PIN);
      if (pin) setSavedPin(pin);

      const k = localStorage.getItem(STORAGE_PRIV_KEY);
      if (k) setPrivKeyJwk(JSON.parse(k));

      const rawOrders = localStorage.getItem(STORAGE_ORDERS);
      if (rawOrders) setOrders(JSON.parse(rawOrders));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === savedPin) {
      setIsLoggedIn(true);
      setAuthError("");
    } else {
      setAuthError("PIN Admin salah. Coba lagi.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPinInput("");
  };

  const handleSavePrivateKey = () => {
    try {
      const parsed = JSON.parse(keyInputText.trim());
      if (parsed.kty !== "EC" || !parsed.d) {
        alert("Format kunci tidak valid. Pastikan itu isi file lisensi-master-private.json");
        return;
      }
      setPrivKeyJwk(parsed);
      localStorage.setItem(STORAGE_PRIV_KEY, JSON.stringify(parsed));
      setKeyInputText("");
      alert("Kunci privat master berhasil disimpan di browser Anda!");
    } catch {
      alert("Gagal membaca JSON kunci. Periksa kembali teks yang ditempel.");
    }
  };

  const simpanOrders = (baru: OrderRecord[]) => {
    setOrders(baru);
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(baru));
  };

  const handleBuatLisensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privKeyJwk) {
      alert("Kunci privat master belum diatur. Masuk ke tab 'Pengaturan Kunci' dulu!");
      setTab("kunci");
      return;
    }
    if (!formNama.trim()) {
      alert("Nama pembeli wajib diisi!");
      return;
    }

    setLoadingSign(true);
    try {
      const { code, exp } = await generateLicenseCode(
        privKeyJwk,
        formPaket,
        formBulan,
        `${formNama.trim()} (${formWa.trim()})`
      );

      const now = Date.now();
      const idOrder = `ME-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;
      const harga = formPaket === "bulanan" ? 15000 * formBulan : 55000;

      const orderBaru: OrderRecord = {
        id: idOrder,
        timestamp: now,
        nama: formNama.trim(),
        wa: formWa.trim(),
        paket: formPaket,
        harga,
        metode: formMetode,
        kode: code,
        exp,
        status: "Lunas",
        note: formNote.trim(),
      };

      const updated = [orderBaru, ...orders];
      simpanOrders(updated);

      setLastGenerated({ order: orderBaru, copied: false });
      setFormNama("");
      setFormWa("");
      setFormNote("");
    } catch (err: any) {
      alert("Gagal membuat lisensi: " + err.message);
    } finally {
      setLoadingSign(false);
    }
  };

  const formatWaNumber = (no: string) => {
    let clean = no.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    return clean;
  };

  const generateWaMessage = (order: OrderRecord) => {
    const expiredStr = order.exp
      ? new Date(order.exp * 1000).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Selamanya (Lifetime Pass)";

    return `Halo Kak ${order.nama}! Pembayaran Anda telah kami verifikasi ✅

Berikut adalah kode lisensi resmi Motion Easy Kakak:

━━━━━━━━━━━━━━━━━━━━
KODE LISENSI:
${order.kode}
━━━━━━━━━━━━━━━━━━━━

📋 Detail Pembelian:
• ID Pesanan: ${order.id}
• Paket: ${order.paket === "bulanan" ? "Bulanan (Rp 15.000)" : "Lifetime Pass (Rp 55.000)"}
• Masa Aktif: ${expiredStr}
• Bebas Watermark & Akses Penuh ke Ekspor Video 🚀

👉 CARA AKTIVASI MUDAH:
1. Buka website: https://motion-easy.rosifulaqli59.workers.dev
2. Klik menu "Aktivasi Lisensi" di sebelah kiri
3. Tempel (Paste) kode lisensi di atas
4. Klik tombol "Aktivasi"
5. Selesai! Buka menu "Studio" dan semua fitur premium otomatis terbuka 🎉

Mohon simpan pesan dan kode ini baik-baik ya Kak. Terima kasih banyak dan selamat berkarya! ✨`;
  };

  const generateReminderMessage = (order: OrderRecord) => {
    const expDate = order.exp ? new Date(order.exp * 1000).toLocaleDateString("id-ID") : "";
    return `Halo Kak ${order.nama}! Semoga project animasi videonya berjalan lancar ya 🎬

Sekadar info ramah, lisensi Motion Easy Bulanan Kakak akan berakhir pada ${expDate}.

Agar fitur Unlimited Export, 2K, dan Bulk ZIP tetap aktif:
• Perpanjang Bulanan: Rp 15.000 / 30 hari
• Atau UPGRADE ke Lifetime: Cukup Rp 55.000 (sekali bayar seumur hidup, tanpa perpanjangan lagi!)

Ketik "PERPANJANG" jika ingin kami bantu proseskan kodenya ya Kak! 😊🙏`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const exportCsv = () => {
    const header = [
      "ID Pesanan",
      "Tanggal",
      "Nama Pembeli",
      "No WhatsApp",
      "Paket",
      "Harga",
      "Metode Pembayaran",
      "Status",
      "Tanggal Expired",
      "Kode Lisensi",
    ];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.timestamp).toLocaleDateString("id-ID"),
      `"${o.nama}"`,
      `"${o.wa}"`,
      o.paket,
      o.harga,
      o.metode,
      o.status,
      o.exp ? new Date(o.exp * 1000).toLocaleDateString("id-ID") : "Selamanya",
      `"${o.kode}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data-Pesanan-MotionEasy-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ringkasan Dashboard
  const stats = useMemo(() => {
    const totalOmzet = orders.reduce((acc, curr) => acc + (curr.status === "Lunas" ? curr.harga : 0), 0);
    const totalUser = orders.length;
    const nowSec = Math.floor(Date.now() / 1000);
    const activeMonthly = orders.filter((o) => o.paket === "bulanan" && o.exp && o.exp > nowSec).length;
    const lifetimeCount = orders.filter((o) => o.paket === "lifetime").length;
    return { totalOmzet, totalUser, activeMonthly, lifetimeCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.nama.toLowerCase().includes(q) ||
        o.wa.includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }, [orders, search]);

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070913] p-4 font-sans text-slate-100">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0f1424] p-6 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-lg font-bold tracking-tight">Portal Admin Motion Easy</h1>
            <p className="mt-1 text-xs text-slate-400">
              Kelola pesanan & terbitkan lisensi langsung dari browser Anda
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                PIN Keamanan
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN Admin..."
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-center text-sm font-mono tracking-widest text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                autoFocus
              />
              <p className="mt-1 text-[10px] text-slate-500 text-center">
                PIN default awal: <code className="text-cyan-400 font-mono">889900</code>
              </p>
            </div>

            {authError && (
              <div className="rounded-lg bg-red-500/10 p-2 text-center text-xs text-red-400">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110"
            >
              Masuk Dashboard
            </button>

            <div className="pt-2 text-center">
              <Link to="/studio" className="text-xs text-slate-400 hover:text-slate-200">
                ← Kembali ke Studio
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#070913] font-sans text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0d1222]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 font-extrabold text-slate-950 text-sm">
              ME
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight">Admin Portal</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/30">
                  Online
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Generator Lisensi & Kelola Pesanan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/studio"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
            >
              Ke Studio <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none">
          {[
            { id: "buat", label: "⚡ Terbitkan Lisensi", icon: PlusCircle },
            { id: "pesanan", label: `📦 Data Pesanan (${orders.length})`, icon: FileSpreadsheet },
            { id: "template", label: "💬 Template Chat WA", icon: MessageCircle },
            { id: "kunci", label: "🔑 Pengaturan Kunci", icon: KeyRound },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-orange-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
        {/* Banner Peringatan Kunci Belum Diatur */}
        {!privKeyJwk && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <strong>Kunci Privat Master Belum Terhubung!</strong>
                <p className="mt-0.5 text-amber-300/80">
                  Untuk menerbitkan lisensi asli yang valid, Anda perlu menempelkan isi file{" "}
                  <code>lisensi-master-private.json</code> sekali saja di tab Pengaturan Kunci.
                </p>
              </div>
            </div>
            <button
              onClick={() => setTab("kunci")}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-slate-950 hover:brightness-110"
            >
              Atur Kunci Sekarang
            </button>
          </div>
        )}

        {/* Ringkasan Dashboard Ringkas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-[#0f1424] p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Omzet</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-extrabold text-emerald-400">
              Rp {stats.totalOmzet.toLocaleString("id-ID")}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0f1424] p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Pesanan</span>
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-extrabold text-slate-100">
              {stats.totalUser} <span className="text-xs font-normal text-slate-400">transaksi</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0f1424] p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Lifetime Member</span>
              <Sparkles className="h-4 w-4 text-orange-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-extrabold text-orange-400">
              {stats.lifetimeCount} <span className="text-xs font-normal text-slate-400">member</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0f1424] p-3.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Bulanan Aktif</span>
              <Clock className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-extrabold text-purple-400">
              {stats.activeMonthly} <span className="text-xs font-normal text-slate-400">user</span>
            </div>
          </div>
        </div>

        {/* TAB 1: FORM BUAT LISENSI */}
        {tab === "buat" && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0f1424] p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <PlusCircle className="h-5 w-5 text-orange-400" />
                <h2 className="text-sm font-bold">Form Terbitkan Lisensi Baru</h2>
              </div>

              <form onSubmit={handleBuatLisensi} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Nama Pembeli *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: Budi Santoso"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      No. WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={formWa}
                      onChange={(e) => setFormWa(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Pilihan Paket Lisensi *
                    </label>
                    <select
                      value={formPaket}
                      onChange={(e) => setFormPaket(e.target.value as any)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-orange-400 focus:outline-none"
                    >
                      <option value="bulanan">Paket Bulanan (Rp 15.000 / 30 Hari)</option>
                      <option value="lifetime">Lifetime Pass (Rp 55.000 / Selamanya)</option>
                    </select>
                  </div>

                  {formPaket === "bulanan" ? (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Durasi Bulan
                      </label>
                      <select
                        value={formBulan}
                        onChange={(e) => setFormBulan(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-orange-400 focus:outline-none"
                      >
                        <option value={1}>1 Bulan (30 Hari) - Rp 15.000</option>
                        <option value={2}>2 Bulan (60 Hari) - Rp 30.000</option>
                        <option value={3}>3 Bulan (90 Hari) - Rp 45.000</option>
                        <option value={6}>6 Bulan (180 Hari) - Rp 90.000</option>
                        <option value={12}>1 Tahun (360 Hari) - Rp 180.000</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Masa Aktif
                      </label>
                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-cyan-400">
                        <Sparkles className="h-3.5 w-3.5" /> Seumur Hidup (Tanpa Expired)
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Metode Pembayaran
                    </label>
                    <select
                      value={formMetode}
                      onChange={(e) => setFormMetode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-orange-400 focus:outline-none"
                    >
                      <option value="QRIS">QRIS (GoPay/OVO/DANA/ShopeePay/BCA)</option>
                      <option value="Transfer BCA">Transfer Bank BCA</option>
                      <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                      <option value="Transfer BRI">Transfer Bank BRI</option>
                      <option value="DANA">DANA Langsung</option>
                      <option value="GoPay">GoPay Langsung</option>
                      <option value="Lainnya">Lainnya / Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Referral TikTok / Diskon"
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingSign || !privKeyJwk}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {loadingSign ? "Membuat Kriptografi Lisensi..." : "⚡ Terbitkan Kode Lisensi Sekarang"}
                </button>
              </form>
            </div>

            {/* Panel Hasil Lisensi Baru */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0f1424] p-5 sm:p-6 shadow-xl">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-sm font-bold">Hasil Kode Lisensi Terakhir</h2>
                </div>

                {lastGenerated ? (
                  <div className="mt-4 space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{lastGenerated.order.nama}</span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        {lastGenerated.order.id}
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-2.5">
                      <div className="text-[10px] font-mono text-slate-400 mb-1">KODE LISENSI RESMI:</div>
                      <div className="break-all font-mono text-[11px] leading-relaxed text-cyan-300 select-all">
                        {lastGenerated.order.kode}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() =>
                          handleCopyText(lastGenerated.order.kode, "kode-last")
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2 font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        {copiedId === "kode-last" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Salin Kode Saja
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          handleCopyText(generateWaMessage(lastGenerated.order), "wa-last")
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 font-semibold text-cyan-300 hover:bg-cyan-500/20"
                      >
                        {copiedId === "wa-last" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" /> Pesan Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Salin Pesan WA
                          </>
                        )}
                      </button>
                    </div>

                    {lastGenerated.order.wa && (
                      <a
                        href={`https://api.whatsapp.com/send?phone=${formatWaNumber(
                          lastGenerated.order.wa
                        )}&text=${encodeURIComponent(generateWaMessage(lastGenerated.order))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110"
                      >
                        <Send className="h-3.5 w-3.5" /> Kirim Otomatis ke WhatsApp Pembeli
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 text-center text-slate-500">
                    <Clock className="mx-auto h-8 w-8 opacity-40" />
                    <p className="mt-2 text-xs">Belum ada lisensi yang dibuat di sesi ini.</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Isi formulir di sebelah kiri lalu klik tombol terbitkan.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Database Pesanan Tersimpan:</span>
                <strong className="text-slate-200">{orders.length} Transaksi</strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA PESANAN */}
        {tab === "pesanan" && (
          <div className="rounded-2xl border border-slate-800 bg-[#0f1424] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold">Daftar Semua Pesanan Lisensi</h2>
                <p className="text-xs text-slate-400">
                  Data otomatis tersimpan di browser Anda dan bisa diekspor ke Excel kapan pun.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari nama / WhatsApp..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Unduh CSV / Excel
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FileSpreadsheet className="mx-auto h-10 w-10 opacity-30" />
                <p className="mt-2 text-xs">Belum ada data pesanan yang cocok.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3">ID / Tanggal</th>
                      <th className="py-2.5 px-3">Pembeli & WA</th>
                      <th className="py-2.5 px-3">Paket</th>
                      <th className="py-2.5 px-3">Harga</th>
                      <th className="py-2.5 px-3">Masa Aktif</th>
                      <th className="py-2.5 px-3 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredOrders.map((o) => {
                      const nowSec = Math.floor(Date.now() / 1000);
                      const isExpired = o.exp && o.exp < nowSec;
                      const isH7 = o.exp && o.exp - nowSec < 7 * 86400 && !isExpired;

                      return (
                        <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-200">{o.id}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(o.timestamp).toLocaleDateString("id-ID")}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">{o.nama}</div>
                            <div className="text-[10px] text-slate-400">{o.wa || "—"}</div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                                o.paket === "lifetime"
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                                  : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                              }`}
                            >
                              {o.paket === "lifetime" ? "Lifetime Pass" : "Bulanan"}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-200">
                            Rp {o.harga.toLocaleString("id-ID")}
                          </td>

                          <td className="py-3 px-3">
                            {o.exp ? (
                              <div>
                                <div className="text-slate-300">
                                  s/d {new Date(o.exp * 1000).toLocaleDateString("id-ID")}
                                </div>
                                {isExpired ? (
                                  <span className="text-[9px] font-bold text-red-400">
                                    ● Expired
                                  </span>
                                ) : isH7 ? (
                                  <span className="text-[9px] font-bold text-amber-400">
                                    ● H-7 Renewal
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-400">
                                    ● Aktif
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-400">
                                Selamanya ✓
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleCopyText(o.kode, o.id + "-kode")}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white"
                              title="Salin Kode"
                            >
                              {copiedId === o.id + "-kode" ? "Tersalin!" : "Kode"}
                            </button>

                            {o.wa && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${formatWaNumber(
                                  o.wa
                                )}&text=${encodeURIComponent(
                                  isH7 || isExpired
                                    ? generateReminderMessage(o)
                                    : generateWaMessage(o)
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
                                title="Chat WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" /> WA
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TEMPLATE CHAT WA */}
        {tab === "template" && (
          <div className="rounded-2xl border border-slate-800 bg-[#0f1424] p-5 sm:p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold">Template Pesan WhatsApp Siap Pakai</h2>
              <p className="text-xs text-slate-400">
                Klik tombol "Salin Template" di bawah, lalu tempelkan langsung ke chat pembeli.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-400">1. Balasan Pertama / Info Paket</span>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Halo Kak! Terima kasih sudah menghubungi Motion Easy 🙌\n\nMotion Easy adalah studio video motion graphics berbasis AI yang berjalan 100% di browser. Bikin video promosi, judul, dan animasi keren tanpa antre render cloud dan bebas watermark!\n\nPilihan paket lisensi kami:\n1️⃣ PAKET BULANAN — Rp 15.000 / 30 Hari\n   ✓ Ekspor MP4 tanpa batas (unlimited)\n   ✓ Resolusi 2K (1440p) super tajam\n   ✓ Bulk ZIP & Enlarge-MB\n\n2️⃣ LIFETIME PASS — Rp 55.000 (Sekali Bayar Seumur Hidup) ⭐ Paling Laris\n   ✓ Semua fitur Paket Bulanan\n   ✓ Kualitas Master 4K (2160p)\n   ✓ Bebas biaya langganan selamanya\n   ✓ Akses semua update fitur baru ke depan\n\nKakak tertarik ambil paket yang mana untuk kebutuhan videonya? 😊`,
                        "tmpl-1"
                      )
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    {copiedId === "tmpl-1" ? "Tersalin!" : "Salin Template"}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Digunakan untuk menyapa pembeli pertama kali yang bertanya di WhatsApp dan membandingkan paket.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">2. Rincian Pembayaran</span>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Siap Kak! Berikut rincian pembayarannya ya:\n\n📦 Paket: [BULANAN / LIFETIME]\n💰 Total: [Rp 15.000 / Rp 55.000]\n\nPembayaran dapat melalui:\n🔹 QRIS (Bisa semua Bank & E-Wallet: GoPay, OVO, DANA, ShopeePay)\n🔹 Transfer BCA: [NOMOR REKENING] a.n [NAMA]\n🔹 DANA / GoPay: [NOMOR HP]\n\nJika sudah transfer, mohon kirim bukti transfernya ya Kak. Kode lisensi akan langsung kami buatkan dan kirimkan dalam 1-3 menit! 🚀`,
                        "tmpl-2"
                      )
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    {copiedId === "tmpl-2" ? "Tersalin!" : "Salin Template"}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Kirim rincian rekening/QRIS setelah calon pembeli menentukan paket pilihannya.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">3. Bantuan Aktivasi Gaptek</span>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Boleh Kak, kami bantu pandu langkahnya ya:\n1. Buka website: https://motion-easy.rosifulaqli59.workers.dev lewat Chrome / Edge di laptop.\n2. Klik menu "Aktivasi Lisensi" di sebelah kiri.\n3. Salin kode lisensi dari kami tadi, lalu tempelkan (paste) di kotak yang tersedia.\n4. Klik tombol "Aktivasi".\n5. Kembali ke menu "Studio" dan coba ekspor videonya!\n\nJika ada pesan error warna merah, tolong screenshot layarnya dan kirim ke sini ya Kak 🙏`,
                        "tmpl-3"
                      )
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    {copiedId === "tmpl-3" ? "Tersalin!" : "Salin Template"}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Panduan bertahap saat pembeli bingung cara memasukkan kode di website.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">4. Reminder Renewal H-7</span>
                  <button
                    onClick={() =>
                      handleCopyText(
                        `Halo Kak! Semoga project videonya berjalan lancar ya 🎬\n\nSekadar info ramah, lisensi Motion Easy Bulanan Kakak akan berakhir sekitar 7 hari lagi.\nAgar fitur Unlimited Export, 2K, dan Bulk ZIP Kakak tetap aktif:\n• Perpanjang Bulanan: Rp 15.000 / 30 hari\n• Atau UPGRADE ke Lifetime: Cukup Rp 55.000 (sekali bayar seumur hidup, tanpa bayar lagi!)\n\nJika ingin diperpanjang sekarang, balas pesan ini "PERPANJANG" ya Kak 😊🙏`,
                        "tmpl-4"
                      )
                    }
                    className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    {copiedId === "tmpl-4" ? "Tersalin!" : "Salin Template"}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Kirimkan ke pelanggan paket bulanan seminggu sebelum lisensinya kedaluwarsa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PENGATURAN KUNCI & KEAMANAN */}
        {tab === "kunci" && (
          <div className="rounded-2xl border border-slate-800 bg-[#0f1424] p-5 sm:p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold">Pengaturan Kunci Privat & PIN Admin</h2>
              <p className="text-xs text-slate-400">
                Kunci privat ini digunakan browser untuk menandatangani kode lisensi secara kriptografis (ECDSA P-256).
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Tempel Kunci Privat Master (Isi file: <code>lisensi-master-private.json</code>)
              </label>
              <textarea
                rows={4}
                value={keyInputText}
                onChange={(e) => setKeyInputText(e.target.value)}
                placeholder='{"key_ops":["sign"],"ext":true,"kty":"EC","x":"...","y":"...","crv":"P-256","d":"..."}'
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 font-mono text-[10px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
              <button
                onClick={handleSavePrivateKey}
                className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110"
              >
                Simpan Kunci ke Browser Ini
              </button>
              {privKeyJwk ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Kunci master saat ini aktif dan terpasang di browser ini.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4" /> Belum ada kunci tersimpan.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Ubah PIN Akses Admin
              </label>
              <div className="flex gap-2 max-w-xs">
                <input
                  type="password"
                  placeholder="PIN baru..."
                  onChange={(e) => {
                    if (e.target.value.length >= 4) {
                      setSavedPin(e.target.value);
                      localStorage.setItem(STORAGE_PIN, e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                PIN ini tersimpan aman di browser Anda untuk mengunci dashboard saat tidak digunakan.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
