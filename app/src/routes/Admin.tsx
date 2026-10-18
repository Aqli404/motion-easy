import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  Copy,
  Check,
  FileSpreadsheet,
  Clock,
  Search,
  MessageSquare,
  AlertCircle,
  Lock,
  LogOut,
  ArrowUpRight,
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";

const STORAGE_ORDERS = "me.admin.orders.v1";
const STORAGE_PIN = "me.admin.pin.v1";
const STORAGE_PRIV_KEY = "me.admin.priv_key.v1";
const DEFAULT_PIN = "889900";

export interface OrderRecord {
  id: string;
  timestamp: number;
  nama: string;
  wa: string;
  paket: "bulanan" | "lifetime";
  harga: number;
  metode: string;
  kode: string;
  exp: number | null;
  status: "Lunas" | "Refund";
  note?: string;
}

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [savedPin, setSavedPin] = useState(DEFAULT_PIN);

  const [privKeyJwk, setPrivKeyJwk] = useState<any | null>(null);
  const [keyInputText, setKeyInputText] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [tab, setTab] = useState<"ringkasan" | "terbitkan" | "pesanan" | "template" | "pengaturan">("ringkasan");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterPaket, setFilterPaket] = useState<"all" | "bulanan" | "lifetime">("all");

  // Form Issue License
  const [formNama, setFormNama] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formPaket, setFormPaket] = useState<"bulanan" | "lifetime">("lifetime");
  const [formBulan, setFormBulan] = useState(1);
  const [formMetode, setFormMetode] = useState("QRIS");
  const [formNote, setFormNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCreated, setActiveCreated] = useState<OrderRecord | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      setAuthError("PIN tidak sesuai. Silakan periksa kembali.");
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
        alert("Format JWK tidak valid. Pastikan ini adalah isi lisensi-master-private.json");
        return;
      }
      setPrivKeyJwk(parsed);
      localStorage.setItem(STORAGE_PRIV_KEY, JSON.stringify(parsed));
      setKeyInputText("");
      alert("Kunci privat master berhasil dikonfigurasi.");
    } catch {
      alert("Format JSON tidak terbaca. Periksa kembali teks yang ditempel.");
    }
  };

  const simpanOrders = (baru: OrderRecord[]) => {
    setOrders(baru);
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(baru));
  };

  const handleBuatLisensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privKeyJwk) {
      alert("Kunci privat master belum diatur di menu Pengaturan.");
      setTab("pengaturan");
      return;
    }
    if (!formNama.trim()) {
      alert("Nama pelanggan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { code, exp } = await generateLicenseCode(
        privKeyJwk,
        formPaket,
        formBulan,
        `${formNama.trim()}${formWa ? ` (${formWa.trim()})` : ""}`
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
      setActiveCreated(orderBaru);

      setFormNama("");
      setFormWa("");
      setFormNote("");
    } catch (err: any) {
      alert("Gagal menerbitkan lisensi: " + err.message);
    } finally {
      setIsSubmitting(false);
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
      : "Permanen (Lifetime Pass)";

    return `Halo Kak ${order.nama}, konfirmasi pembayaran Motion Easy sudah kami verifikasi.

Berikut kode lisensi resmi Anda:

KODE LISENSI:
${order.kode}

Rincian:
• ID Transaksi: ${order.id}
• Paket: ${order.paket === "bulanan" ? "Bulanan (30 Hari)" : "Lifetime Pass"}
• Masa Aktif: ${expiredStr}

Petunjuk Aktivasi:
1. Buka https://motion-easy.rosifulaqli59.workers.dev
2. Buka menu Aktivasi Lisensi.
3. Tempel kode lisensi di atas, lalu klik Aktivasi.
4. Kembali ke Studio untuk mulai berkarya tanpa batas.

Simpan pesan ini sebagai bukti lisensi Anda. Terima kasih!`;
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCsv = () => {
    const header = [
      "ID Pesanan",
      "Tanggal",
      "Nama Pelanggan",
      "WhatsApp",
      "Paket",
      "Nominal",
      "Metode",
      "Status",
      "Kedaluwarsa",
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
      o.exp ? new Date(o.exp * 1000).toLocaleDateString("id-ID") : "Permanen",
      `"${o.kode}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `motion-easy-orders-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const totalOmzet = orders.reduce((acc, curr) => acc + (curr.status === "Lunas" ? curr.harga : 0), 0);
    const totalUser = orders.length;
    const nowSec = Math.floor(Date.now() / 1000);
    const activeMonthly = orders.filter((o) => o.paket === "bulanan" && o.exp && o.exp > nowSec).length;
    const expiredMonthly = orders.filter((o) => o.paket === "bulanan" && o.exp && o.exp <= nowSec).length;
    const lifetimeCount = orders.filter((o) => o.paket === "lifetime").length;
    return { totalOmzet, totalUser, activeMonthly, expiredMonthly, lifetimeCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchQuery =
        !search.trim() ||
        o.nama.toLowerCase().includes(search.toLowerCase()) ||
        o.wa.includes(search) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      const matchPaket = filterPaket === "all" || o.paket === filterPaket;
      return matchQuery && matchPaket;
    });
  }, [orders, search, filterPaket]);

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center px-4 font-sans text-zinc-100 antialiased">
        <div className="w-full max-w-sm border border-zinc-800 bg-zinc-900/60 p-6 rounded-xl shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-6 w-6 rounded bg-zinc-100 text-zinc-950 font-bold text-xs flex items-center justify-center">
              ME
            </span>
            <span className="font-semibold text-sm tracking-tight text-zinc-200">Motion Easy Admin</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                PIN Akses
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                PIN default: <span className="font-mono text-zinc-400">889900</span>
              </p>
            </div>

            {authError && (
              <div className="p-2.5 rounded-md border border-red-900/50 bg-red-950/20 text-xs text-red-400">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-9 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors"
            >
              Masuk
            </button>

            <div className="pt-2 text-center">
              <Link to="/studio" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Kembali ke Studio
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN ADMIN CONSOLE
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased text-xs flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/studio" className="h-6 w-6 rounded bg-zinc-100 text-zinc-950 font-bold text-xs flex items-center justify-center">
              ME
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="font-medium text-zinc-300">Admin Operations</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/studio"
              className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1 text-xs"
            >
              Studio <ArrowUpRight className="h-3 w-3" />
            </Link>
            <span className="text-zinc-800">|</span>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto border-t border-zinc-900 scrollbar-none">
          {[
            { id: "ringkasan", label: "Ringkasan" },
            { id: "terbitkan", label: "Terbitkan Lisensi" },
            { id: "pesanan", label: `Data Pesanan (${orders.length})` },
            { id: "template", label: "Template Pesan" },
            { id: "pengaturan", label: "Pengaturan" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                tab === item.id
                  ? "border-zinc-100 text-zinc-100"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Subtle warning if private key is not linked */}
        {!privKeyJwk && (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-amber-300/90 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                Kunci privat master belum diatur di browser ini. Penerbitan lisensi memerlukan konfigurasi sekali di tab Pengaturan.
              </span>
            </div>
            <button
              onClick={() => setTab("pengaturan")}
              className="text-xs font-semibold underline text-amber-300 hover:text-white shrink-0"
            >
              Buka Pengaturan
            </button>
          </div>
        )}

        {/* TAB 1: RINGKASAN */}
        {tab === "ringkasan" && (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3.5">
                <div className="text-[11px] text-zinc-400">Total Omzet</div>
                <div className="text-lg font-semibold text-zinc-100 mt-1 font-mono">
                  Rp {stats.totalOmzet.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3.5">
                <div className="text-[11px] text-zinc-400">Total Transaksi</div>
                <div className="text-lg font-semibold text-zinc-100 mt-1 font-mono">
                  {stats.totalUser}
                </div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3.5">
                <div className="text-[11px] text-zinc-400">Member Lifetime</div>
                <div className="text-lg font-semibold text-zinc-100 mt-1 font-mono">
                  {stats.lifetimeCount}
                </div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3.5">
                <div className="text-[11px] text-zinc-400">Bulanan Aktif / Expired</div>
                <div className="text-lg font-semibold text-zinc-100 mt-1 font-mono">
                  {stats.activeMonthly} <span className="text-xs text-zinc-500 font-normal">/ {stats.expiredMonthly}</span>
                </div>
              </div>
            </div>

            {/* Quick Action & Recent Section */}
            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-8 border border-zinc-800 bg-zinc-900/30 rounded-lg p-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
                  <div className="font-semibold text-zinc-200">Aktivitas Transaksi Terbaru</div>
                  <button
                    onClick={() => setTab("pesanan")}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Lihat Semua ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">
                    Belum ada riwayat transaksi yang tercatat.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-zinc-200">{o.nama}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {o.id} · {new Date(o.timestamp).toLocaleDateString("id-ID")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-zinc-300">Rp {o.harga.toLocaleString("id-ID")}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{o.paket}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-4 border border-zinc-800 bg-zinc-900/30 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-zinc-200 mb-1">Aksi Cepat</div>
                  <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                    Terbitkan lisensi instan saat pembeli telah melakukan konfirmasi transfer di WhatsApp.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setTab("terbitkan")}
                    className="w-full h-8 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Terbitkan Lisensi Baru
                  </button>
                  <button
                    onClick={exportCsv}
                    className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Unduh Backup (.csv)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TERBITKAN LISENSI */}
        {tab === "terbitkan" && (
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-7 border border-zinc-800 bg-zinc-900/30 rounded-lg p-5">
              <div className="font-semibold text-zinc-200 pb-3 border-b border-zinc-800 mb-4">
                Form Penerbitan Lisensi
              </div>

              <form onSubmit={handleBuatLisensi} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Pembeli *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nomor WhatsApp</label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={formWa}
                      onChange={(e) => setFormWa(e.target.value)}
                      className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Pilihan Paket *</label>
                    <select
                      value={formPaket}
                      onChange={(e) => setFormPaket(e.target.value as any)}
                      className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    >
                      <option value="lifetime">Lifetime Pass (Rp 55.000)</option>
                      <option value="bulanan">Paket Bulanan (Rp 15.000 / 30 Hari)</option>
                    </select>
                  </div>

                  {formPaket === "bulanan" ? (
                    <div>
                      <label className="block text-zinc-400 mb-1">Masa Berlaku</label>
                      <select
                        value={formBulan}
                        onChange={(e) => setFormBulan(Number(e.target.value))}
                        className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                      >
                        <option value={1}>1 Bulan (30 Hari) - Rp 15.000</option>
                        <option value={2}>2 Bulan (60 Hari) - Rp 30.000</option>
                        <option value={3}>3 Bulan (90 Hari) - Rp 45.000</option>
                        <option value={6}>6 Bulan (180 Hari) - Rp 90.000</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-zinc-400 mb-1">Masa Berlaku</label>
                      <div className="h-8 flex items-center px-2.5 rounded-md border border-zinc-800/80 bg-zinc-950/40 text-zinc-400">
                        Permanen (Lifetime)
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Metode Pembayaran</label>
                    <select
                      value={formMetode}
                      onChange={(e) => setFormMetode(e.target.value)}
                      className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    >
                      <option value="QRIS">QRIS</option>
                      <option value="BCA">Transfer Bank BCA</option>
                      <option value="Mandiri">Transfer Bank Mandiri</option>
                      <option value="BRI">Transfer Bank BRI</option>
                      <option value="DANA">DANA</option>
                      <option value="GoPay">GoPay</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Catatan Internal (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Sumber lead / diskon"
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !privKeyJwk}
                    className="w-full h-9 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors disabled:opacity-40"
                  >
                    {isSubmitting ? "Memproses..." : "Terbitkan Kode Lisensi"}
                  </button>
                </div>
              </form>
            </div>

            {/* Result Box */}
            <div className="md:col-span-5 border border-zinc-800 bg-zinc-900/30 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-zinc-200 pb-3 border-b border-zinc-800 mb-3">
                  Hasil Lisensi Terakhir
                </div>

                {activeCreated ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200">{activeCreated.nama}</span>
                      <span className="font-mono text-zinc-500">{activeCreated.id}</span>
                    </div>

                    <div className="p-3 rounded border border-zinc-800 bg-zinc-950">
                      <div className="text-[10px] text-zinc-500 mb-1 font-mono uppercase">Kode Lisensi:</div>
                      <div className="font-mono text-zinc-200 break-all select-all text-[11px] leading-relaxed">
                        {activeCreated.kode}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCopyText(activeCreated.kode, "active-code")}
                        className="h-8 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
                      >
                        {copiedId === "active-code" ? "Tersalin!" : "Salin Kode"}
                      </button>
                      <button
                        onClick={() => handleCopyText(generateWaMessage(activeCreated), "active-msg")}
                        className="h-8 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
                      >
                        {copiedId === "active-msg" ? "Pesan Tersalin!" : "Salin Pesan WA"}
                      </button>
                    </div>

                    {activeCreated.wa && (
                      <a
                        href={`https://api.whatsapp.com/send?phone=${formatWaNumber(
                          activeCreated.wa
                        )}&text=${encodeURIComponent(generateWaMessage(activeCreated))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-8 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        Kirim ke WhatsApp Pelanggan →
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500">
                    Belum ada lisensi yang dibuat pada sesi ini.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex justify-between">
                <span>Total Data Tersimpan</span>
                <span className="font-mono text-zinc-300">{orders.length} entri</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATA PESANAN */}
        {tab === "pesanan" && (
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="font-semibold text-zinc-200">Daftar Transaksi</div>

              <div className="flex items-center gap-2">
                <select
                  value={filterPaket}
                  onChange={(e) => setFilterPaket(e.target.value as any)}
                  className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="all">Semua Paket</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="bulanan">Bulanan</option>
                </select>

                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Cari nama / ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-7 pr-3 rounded border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none w-44"
                  />
                </div>

                <button
                  onClick={exportCsv}
                  className="h-8 px-2.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                Tidak ada data pesanan yang cocok dengan kriteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                      <th className="py-2 px-3">ID / Tanggal</th>
                      <th className="py-2 px-3">Pelanggan</th>
                      <th className="py-2 px-3">Paket</th>
                      <th className="py-2 px-3">Harga</th>
                      <th className="py-2 px-3">Masa Berlaku</th>
                      <th className="py-2 px-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-xs">
                    {filteredOrders.map((o) => {
                      const nowSec = Math.floor(Date.now() / 1000);
                      const isExpired = o.exp && o.exp < nowSec;

                      return (
                        <tr key={o.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-zinc-200">{o.id}</div>
                            <div className="text-[10px] text-zinc-500">
                              {new Date(o.timestamp).toLocaleDateString("id-ID")}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-zinc-200">{o.nama}</div>
                            <div className="text-[10px] text-zinc-500">{o.wa || "—"}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] uppercase text-zinc-400">
                              {o.paket}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-300">
                            Rp {o.harga.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400">
                            {o.exp ? (
                              <div>
                                <span>{new Date(o.exp * 1000).toLocaleDateString("id-ID")}</span>
                                <span className={`ml-2 text-[10px] ${isExpired ? "text-red-400" : "text-emerald-400"}`}>
                                  {isExpired ? "Expired" : "Aktif"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-300">Permanen</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => handleCopyText(o.kode, o.id + "-c")}
                              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] transition-colors"
                            >
                              {copiedId === o.id + "-c" ? "Tersalin" : "Salin Kode"}
                            </button>
                            {o.wa && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${formatWaNumber(
                                  o.wa
                                )}&text=${encodeURIComponent(generateWaMessage(o))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] inline-flex items-center gap-1 transition-colors"
                              >
                                WA <ArrowUpRight className="h-2.5 w-2.5" />
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

        {/* TAB 4: TEMPLATE PESAN */}
        {tab === "template" && (
          <div className="space-y-4">
            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-200">1. Respon Awal / Informasi Paket</span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `Halo Kak! Terima kasih sudah menghubungi Motion Easy.\n\nMotion Easy adalah studio video motion graphics berbasis AI yang berjalan 100% di browser tanpa antre render cloud dan tanpa watermark.\n\nPilihan paket lisensi:\n1. Paket Bulanan — Rp 15.000 / 30 Hari\n   • Ekspor MP4 tanpa batas\n   • Resolusi 2K (1440p)\n   • Bulk ZIP & Enlarge-MB\n\n2. Lifetime Pass — Rp 55.000 (Sekali bayar seumur hidup)\n   • Semua fitur paket bulanan\n   • Resolusi master 4K (2160p)\n   • Akses pembaruan fitur selamanya\n\nBoleh kami bantu untuk paket yang ingin Kakak gunakan?`,
                      "tmpl-1"
                    )
                  }
                  className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                >
                  {copiedId === "tmpl-1" ? "Tersalin!" : "Salin Teks"}
                </button>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Gunakan saat prospek pertama kali bertanya tentang pilihan paket dan fitur di WhatsApp.
              </p>
            </div>

            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-200">2. Rincian Pembayaran</span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `Baik Kak, berikut rincian pembayarannya:\n\nPaket: [BULANAN / LIFETIME]\nNominal: [Rp 15.000 / Rp 55.000]\n\nMetode pembayaran:\n• QRIS (Semua bank dan e-wallet)\n• Transfer BCA: [NOMOR REKENING] a.n [NAMA]\n• E-Wallet DANA/GoPay: [NOMOR HP]\n\nMohon kirimkan konfirmasi bukti transfer setelah pembayaran dilakukan ya Kak. Kode lisensi akan langsung kami buatkan. Terima kasih!`,
                      "tmpl-2"
                    )
                  }
                  className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                >
                  {copiedId === "tmpl-2" ? "Tersalin!" : "Salin Teks"}
                </button>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Kirim nomor rekening atau QRIS setelah pembeli memilih paket yang diinginkan.
              </p>
            </div>

            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-200">3. Pengingat Perpanjangan (H-7)</span>
                <button
                  onClick={() =>
                    handleCopyText(
                      `Halo Kak! Sekadar info ramah, lisensi Motion Easy Bulanan Kakak akan berakhir dalam 7 hari.\n\nAgar akses ekspor tanpa batas, 2K, dan Bulk ZIP tetap berjalan lancar:\n• Perpanjang Bulanan: Rp 15.000 / 30 hari\n• Atau Upgrade Lifetime: Rp 55.000 (sekali bayar seumur hidup)\n\nBalas pesan ini jika Kakak ingin kami siapkan kodenya ya. Terima kasih!`,
                      "tmpl-3"
                    )
                  }
                  className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                >
                  {copiedId === "tmpl-3" ? "Tersalin!" : "Salin Teks"}
                </button>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Kirimkan pengingat ramah untuk pelanggan bulanan seminggu sebelum masa berlaku habis.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: PENGATURAN */}
        {tab === "pengaturan" && (
          <div className="space-y-6 max-w-2xl">
            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-5 space-y-3">
              <div className="font-semibold text-zinc-200">Kunci Privat Master (ECDSA P-256)</div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kunci ini digunakan secara lokal oleh WebCrypto browser Anda untuk menandatangani lisensi.
                Tempelkan isi file <code>motionforge/.rahasia/lisensi-master-private.json</code>.
              </p>

              <div className="relative">
                <textarea
                  rows={3}
                  value={keyInputText}
                  onChange={(e) => setKeyInputText(e.target.value)}
                  placeholder='{"key_ops":["sign"],"ext":true,"kty":"EC",...}'
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-200 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSavePrivateKey}
                  className="h-8 px-3 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors"
                >
                  Simpan Kunci
                </button>
                {privKeyJwk ? (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    ✓ Kunci master terpasang dan aktif di browser ini
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500">
                    Belum ada kunci tersimpan
                  </span>
                )}
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg p-5 space-y-3">
              <div className="font-semibold text-zinc-200">Ganti PIN Akses</div>
              <p className="text-[11px] text-zinc-400">
                PIN ini mengunci sesi admin lokal Anda pada perangkat ini.
              </p>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="password"
                  placeholder="PIN baru (min. 4 angka)"
                  onChange={(e) => {
                    if (e.target.value.length >= 4) {
                      setSavedPin(e.target.value);
                      localStorage.setItem(STORAGE_PIN, e.target.value);
                    }
                  }}
                  className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 focus:border-zinc-500 focus:outline-none w-full font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
