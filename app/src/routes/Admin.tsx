import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  KeyRound,
  Receipt,
  MessageSquare,
  ShieldCheck,
  Check,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  Lock,
  Smartphone,
  ChevronDown,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  Send,
  Layers,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

// ===== Tipe Data Admin =====

export interface AdminPackage {
  id: string;
  nama: string;
  tier: "bulanan" | "lifetime";
  durasi_hari: number | null;
  max_res: number;
  bulk: number;
  enlarge: number;
  harga: number;
  bawaan: number;
  aktif: number;
  urut: number;
  catatan?: string;
  dibuat_ts: number;
}

export interface AdminOrder {
  id: string;
  ts: number;
  nama: string;
  wa: string;
  paket_id: string;
  paket_nama: string;
  tier: "bulanan" | "lifetime";
  harga: number;
  metode: string;
  kode: string;
  exp: number | null;
  status: "Lunas" | "Batal" | "Refund";
  note?: string;
  email_admin?: string;
}

export interface AdminAudit {
  id: string;
  ts: number;
  email: string;
  aksi: string;
  detail: string;
  ip: string;
}

export interface DashboardStats {
  pendapatan_bulan_ini: number;
  total_transaksi: number;
  total_lifetime: number;
  bulanan_aktif: number;
}

export interface AdminConfig {
  googleClientId: string;
  authenticated: boolean;
  email: string | null;
  d1Ready: boolean;
}

const API_HEADERS = {
  "Content-Type": "application/json",
  "X-ME-Admin": "1",
};

// Format mata uang Rupiah
function formatRp(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

// Format tanggal & waktu
function formatTgl(ts: number | null): string {
  if (!ts) return "Selamanya";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts < 10_000_000_000 ? ts * 1000 : ts));
}

export default function AdminPortal() {
  // State Autentikasi
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [authError, setAuthError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab Navigasi Aktif
  const [activeTab, setActiveTab] = useState<
    "ringkasan" | "paket" | "terbitkan" | "pesanan" | "template" | "audit"
  >("ringkasan");

  // State Data
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendapatan_bulan_ini: 0,
    total_transaksi: 0,
    total_lifetime: 0,
    bulanan_aktif: 0,
  });
  const [auditLogs, setAuditLogs] = useState<AdminAudit[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filter & Pencarian Pesanan
  const [orderSearch, setOrderSearch] = useState("");
  const [orderTierFilter, setOrderTierFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Form Terbitkan Lisensi
  const [issuePaketId, setIssuePaketId] = useState("");
  const [issueNama, setIssueNama] = useState("");
  const [issueWa, setIssueWa] = useState("");
  const [issueMetode, setIssueMetode] = useState("QRIS");
  const [issueNote, setIssueNote] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [latestIssuedOrder, setLatestIssuedOrder] = useState<AdminOrder | null>(null);

  // Modal Buat/Edit Paket
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgFormNama, setPkgFormNama] = useState("");
  const [pkgFormTier, setPkgFormTier] = useState<"bulanan" | "lifetime">("bulanan");
  const [pkgFormDurasi, setPkgFormDurasi] = useState(30);
  const [pkgFormHarga, setPkgFormHarga] = useState(15000);
  const [pkgFormCatatan, setPkgFormCatatan] = useState("");
  const [isSavingPkg, setIsSavingPkg] = useState(false);

  // Toast / Status salin
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const salinTeks = (teks: string, keyId: string, label = "Tersalin ke clipboard!") => {
    navigator.clipboard.writeText(teks);
    setCopiedKey(keyId);
    showToast(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Muat Konfigurasi dan Status Sesi
  const muatConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch("/api/admin/config");
      const data: AdminConfig = await res.json();
      setConfig(data);
    } catch (e) {
      console.error("Gagal muat config admin:", e);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    muatConfig();
  }, [muatConfig]);

  // Muat Seluruh Data Dashboard jika sudah login
  const muatDataDashboard = useCallback(async () => {
    if (!config?.authenticated) return;
    try {
      setLoadingData(true);
      const [resPkg, resOrd] = await Promise.all([
        fetch("/api/admin/paket", { headers: API_HEADERS }),
        fetch(
          `/api/admin/pesanan?q=${encodeURIComponent(orderSearch)}&tier=${orderTierFilter}&status=${orderStatusFilter}`,
          { headers: API_HEADERS }
        ),
      ]);

      const dataPkg = await resPkg.json();
      const dataOrd = await resOrd.json();

      if (dataPkg.ok) {
        setPackages(dataPkg.data || []);
        if (dataPkg.data && dataPkg.data.length > 0 && !issuePaketId) {
          setIssuePaketId(dataPkg.data[0].id);
        }
      }
      if (dataOrd.ok) {
        setOrders(dataOrd.data || []);
        if (dataOrd.stats) setStats(dataOrd.stats);
      }
    } catch (e) {
      console.error("Gagal muat data admin:", e);
    } finally {
      setLoadingData(false);
    }
  }, [config?.authenticated, orderSearch, orderTierFilter, orderStatusFilter, issuePaketId]);

  useEffect(() => {
    if (config?.authenticated) {
      muatDataDashboard();
    }
  }, [config?.authenticated, muatDataDashboard]);

  // Muat Audit Log jika tab audit dibuka
  useEffect(() => {
    if (config?.authenticated && activeTab === "audit") {
      fetch("/api/admin/audit", { headers: API_HEADERS })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setAuditLogs(d.data || []);
        });
    }
  }, [config?.authenticated, activeTab]);

  // Inisialisasi Google Identity Services Button
  const handleGoogleCallback = async (response: any) => {
    if (!response.credential) return;
    try {
      setIsLoggingIn(true);
      setAuthError("");
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal masuk dengan Google");
      }
      showToast(`Selamat datang, ${data.name || data.email}!`);
      await muatConfig();
    } catch (e: any) {
      setAuthError(e.message || "Gagal verifikasi login Google");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (!config || config.authenticated || !config.googleClientId) return;

    const scriptId = "google-gsi-client";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const setupGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: handleGoogleCallback,
          auto_select: false,
        });

        const btnContainer = document.getElementById("google-signin-btn-container");
        if (btnContainer) {
          btnContainer.innerHTML = "";
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "filled_black",
            size: "large",
            shape: "pill",
            text: "continue_with",
            locale: "id",
            width: 280,
          });
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = setupGsi;
      document.body.appendChild(script);
    } else {
      setupGsi();
    }
  }, [config]);

  // Login Pemulihan (Emergency Code)
  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim()) return;
    try {
      setIsLoggingIn(true);
      setAuthError("");
      const res = await fetch("/api/admin/login-recovery", {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ code: recoveryCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kode pemulihan salah");
      }
      showToast("Berhasil masuk melalui jalur pemulihan.");
      setRecoveryCode("");
      setShowRecovery(false);
      await muatConfig();
    } catch (e: any) {
      setAuthError(e.message || "Gagal masuk via kode pemulihan");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Sesi Saat Ini
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", headers: API_HEADERS });
      if (!response.ok) throw new Error("Logout ditolak oleh server.");
      showToast("Anda telah keluar.");
      await muatConfig();
    } catch (e) {
      console.error("Gagal logout:", e);
    }
  };

  // Logout Semua Perangkat (Revoke All Sessions)
  const handleLogoutSemua = async () => {
    if (!confirm("Yakin ingin mencabut semua sesi admin yang aktif di seluruh perangkat?")) return;
    try {
      await fetch("/api/admin/logout-semua", { method: "POST", headers: API_HEADERS });
      showToast("Semua sesi admin di semua perangkat telah dicabut.");
      await muatConfig();
    } catch (e) {
      console.error("Gagal logout semua:", e);
    }
  };

  // Penerbitan Lisensi (Issue)
  const handleIssueLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuePaketId || !issueNama.trim()) {
      showToast("Pilih paket dan isi nama pembeli terlebih dahulu.");
      return;
    }
    try {
      setIsIssuing(true);
      const res = await fetch("/api/admin/issue", {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          paketId: issuePaketId,
          nama: issueNama.trim(),
          wa: issueWa.trim(),
          metode: issueMetode,
          note: issueNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menerbitkan lisensi");
      }

      setLatestIssuedOrder(data.pesanan);
      showToast("🎉 Lisensi resmi berhasil diterbitkan!");
      setIssueNama("");
      setIssueWa("");
      setIssueNote("");
      muatDataDashboard();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsIssuing(false);
    }
  };

  // Toggle Status Aktif Paket
  const handleTogglePaket = async (pkg: AdminPackage) => {
    const nextAktif = pkg.aktif ? 0 : 1;
    try {
      const res = await fetch(`/api/admin/paket/${pkg.id}`, {
        method: "PATCH",
        headers: API_HEADERS,
        body: JSON.stringify({ aktif: nextAktif }),
      });
      const data = await res.json();
      if (data.ok) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, aktif: nextAktif } : p))
        );
        showToast(`Status paket diubah menjadi: ${nextAktif ? "Aktif" : "Nonaktif"}`);
      } else {
        showToast(data.error || "Status paket gagal diperbarui.");
      }
    } catch (e) {
      console.error("Gagal toggle status paket:", e);
    }
  };

  // Simpan / Buat Paket Baru
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgFormNama.trim()) return;
    try {
      setIsSavingPkg(true);
      if (editingPkgId) {
        // Edit paket yang ada
        const res = await fetch(`/api/admin/paket/${editingPkgId}`, {
          method: "PATCH",
          headers: API_HEADERS,
          body: JSON.stringify({
            nama: pkgFormNama.trim(),
            harga: pkgFormHarga,
            durasi_hari: pkgFormTier === "lifetime" ? null : pkgFormDurasi,
            catatan: pkgFormCatatan.trim(),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast("Paket berhasil diperbarui!");
          setPkgModalOpen(false);
          muatDataDashboard();
        } else {
          showToast(data.error || "Paket gagal diperbarui.");
        }
      } else {
        // Buat paket baru
        const res = await fetch("/api/admin/paket", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            nama: pkgFormNama.trim(),
            tier: pkgFormTier,
            durasi_hari: pkgFormTier === "lifetime" ? null : pkgFormDurasi,
            harga: pkgFormHarga,
            catatan: pkgFormCatatan.trim(),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast("Paket baru berhasil dibuat!");
          setPkgModalOpen(false);
          muatDataDashboard();
        } else {
          showToast(data.error || "Paket gagal dibuat.");
        }
      }
    } catch (e) {
      console.error("Gagal simpan paket:", e);
    } finally {
      setIsSavingPkg(false);
    }
  };

  // Hapus Paket
  const handleDeletePackage = async (pkg: AdminPackage) => {
    if (pkg.bawaan) {
      alert("Paket bawaan sistem tidak boleh dihapus. Anda dapat menonaktifkannya.");
      return;
    }
    if (!confirm(`Hapus paket "${pkg.nama}"?`)) return;
    try {
      const res = await fetch(`/api/admin/paket/${pkg.id}`, {
        method: "DELETE",
        headers: API_HEADERS,
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Paket berhasil dihapus.");
        muatDataDashboard();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error("Gagal hapus paket:", e);
    }
  };

  // Update Status Pesanan (Lunas / Batal / Refund)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/pesanan/${orderId}`, {
        method: "PATCH",
        headers: API_HEADERS,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        );
        showToast(`Status pesanan diperbarui menjadi: ${newStatus}`);
      }
    } catch (e) {
      console.error("Gagal update status pesanan:", e);
    }
  };

  // Deteksi Lisensi yang akan segera kedaluwarsa (≤ 7 hari)
  const expiringOrders = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const batas7Hari = nowSec + 7 * 86400;
    return orders.filter(
      (o) =>
        o.tier === "bulanan" &&
        o.status === "Lunas" &&
        o.exp !== null &&
        o.exp > nowSec &&
        o.exp <= batas7Hari
    );
  }, [orders]);

  // Paket Terpilih di Form Generator
  const selectedPackageForIssue = useMemo(() => {
    return packages.find((p) => p.id === issuePaketId) || packages[0];
  }, [packages, issuePaketId]);

  // Generate Pesan WhatsApp untuk Lisensi yang Baru Diterbitkan
  const generatedWhatsAppMsg = useMemo(() => {
    if (!latestIssuedOrder) return "";
    const p = latestIssuedOrder;
    return (
      `Halo kak ${p.nama}! Terima kasih atas pembayarannya di Motion Easy 🎉\n\n` +
      `Berikut Kode Lisensi Resmi Motion Easy Anda:\n` +
      `🔑 Kode: ${p.kode}\n` +
      `🏷️ Paket: ${p.paket_nama}\n` +
      `⏳ Berlaku: ${formatTgl(p.exp)}\n\n` +
      `Cara Aktivasi:\n` +
      `1. Buka Motion Easy Studio di browser: https://motion-easy.rosifulaqli59.workers.dev\n` +
      `2. Klik tombol 'Lisensi' di pojok atas atau navigasi menu.\n` +
      `3. Tempel kode di atas lalu klik 'Aktivasi Lisensi'.\n` +
      `4. Selesai! Semua fitur langsung aktif tanpa perlu mendaftar akun.\n\n` +
      `Selamat berkarya dengan video motion graphics AI berkualitas tinggi! 🚀`
    );
  }, [latestIssuedOrder]);

  // Loading Screen Awal
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-ink-dim">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="font-mono text-xs">Memeriksa kredensial admin Motion Easy...</p>
        </div>
      </div>
    );
  }

  // ===== LAYAR LOGIN ADMIN (JIKA BELUM LOGIN) =====
  if (!config?.authenticated) {
    return (
      <div className="min-h-screen bg-bg flex flex-col justify-between p-4 sm:p-8">
        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 rounded-xl bg-panel-high border border-primary/30 px-4 py-2.5 text-xs text-ink shadow-2xl animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-tertiary" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="max-w-md w-full mx-auto my-auto py-12">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-[0_0_25px_rgba(255,182,144,0.15)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Portal Admin Lisensi
            </h1>
            <p className="text-xs text-ink-dim mt-1.5 font-mono">
              Motion Easy Studio · Keamanan Tingkat Server ECDSA P-256
            </p>
          </div>

          {/* Kotak Login */}
          <div className="rounded-2xl border border-edge bg-panel p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

            {authError && (
              <div className="mb-6 rounded-xl bg-error/10 border border-error/20 p-3.5 text-xs text-error flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Metode Utama: Sign in with Google (GIS) */}
            <div className="text-center space-y-4">
              <p className="text-xs text-ink-dim leading-relaxed">
                Akses admin terproteksi menggunakan autentikasi akun Google resmi yang terdaftar di daftar putih.
              </p>

              {config?.googleClientId ? (
                <div className="pt-2 flex flex-col items-center">
                  <div id="google-signin-btn-container" className="min-h-[44px]" />
                  {isLoggingIn && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-mono text-primary animate-pulse">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Memverifikasi kredensial Google...
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Konfigurasi Google Belum Aktif</span>
                  </div>
                  <p className="text-ink-dim leading-relaxed text-[11px]">
                    Kunci <code className="text-primary font-mono font-semibold">GOOGLE_CLIENT_ID</code> belum dipasang di secret Cloudflare Worker. Anda tetap dapat masuk menggunakan Kode Pemulihan di bawah ini.
                  </p>
                </div>
              )}
            </div>

            {/* Pemisah Alternatif */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-edge" />
              </div>
              <span className="relative bg-panel px-3 font-mono text-[10px] uppercase text-muted tracking-widest">
                atau opsi darurat
              </span>
            </div>

            {/* Jalur Darurat: Kode Pemulihan (Emergency Recovery) */}
            <div>
              <button
                type="button"
                onClick={() => setShowRecovery(!showRecovery)}
                className="w-full text-center font-mono text-xs text-ink-dim hover:text-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Masuk dengan Kode Pemulihan (Recovery)</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showRecovery ? "rotate-180" : ""}`} />
              </button>

              {showRecovery && (
                <form onSubmit={handleRecoveryLogin} className="mt-4 space-y-3 pt-3 border-t border-edge/60">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                      Kode Pemulihan Darurat
                    </label>
                    <input
                      type="password"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Masukkan RECOVERY_CODE..."
                      className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoggingIn || !recoveryCode.trim()}
                    className="w-full rounded-xl bg-panel-high border border-edge py-2 text-xs font-semibold text-ink hover:bg-well hover:border-primary/40 transition-colors disabled:opacity-40"
                  >
                    {isLoggingIn ? "Memverifikasi..." : "Masuk Darurat"}
                  </button>
                </form>
              )}
            </div>

            {/* Indikator Status Database */}
            <div className="mt-8 pt-4 border-t border-edge/50 flex items-center justify-between text-[11px] font-mono text-muted">
              <span>Database D1:</span>
              <span className={config?.d1Ready ? "text-tertiary flex items-center gap-1" : "text-error flex items-center gap-1"}>
                {config?.d1Ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {config?.d1Ready ? "Terkoneksi" : "Belum terpasang"}
              </span>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-muted hover:text-ink font-mono transition-colors">
              ← Kembali ke Studio Motion Easy
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== DASHBOARD UTAMA ADMIN (SESI AKTIF) =====
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col font-sans">
      {/* Toast Notifikasi Global */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-xl bg-panel-high border border-primary/30 px-4 py-2.5 text-xs text-ink shadow-2xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-tertiary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-edge bg-panel/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-ink">Motion Easy</span>
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                ADMIN
              </span>
            </div>
            <p className="text-[10px] text-muted font-mono hidden sm:block">
              ECDSA P-256 Server Issuer & Paket D1
            </p>
          </div>
        </div>

        {/* Info Sesi & Aksi Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-medium text-ink truncate max-w-[200px]">
              {config?.email}
            </span>
            <span className="text-[10px] font-mono text-tertiary">Sesi Aktif ✓</span>
          </div>

          <button
            onClick={muatDataDashboard}
            disabled={loadingData}
            title="Segarkan Data"
            className="p-2 rounded-lg border border-edge bg-panel-low text-ink-dim hover:text-ink hover:bg-panel transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Keluar dari Dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-panel-low hover:bg-error/15 hover:border-error/30 text-xs text-ink-dim hover:text-error transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Navigasi Tab */}
      <nav className="border-b border-edge bg-panel-low/60 px-4 sm:px-6 overflow-x-auto">
        <div className="flex gap-1 py-1.5 min-w-max">
          {[
            { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
            { id: "paket", label: "Paket Lisensi", icon: Package },
            { id: "terbitkan", label: "Terbitkan Lisensi", icon: KeyRound },
            { id: "pesanan", label: "Pesanan & Transaksi", icon: Receipt },
            { id: "template", label: "Template WhatsApp", icon: MessageSquare },
            { id: "audit", label: "Audit & Pengaturan", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const aktif = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  aktif
                    ? "bg-panel text-primary border border-edge shadow-sm font-semibold"
                    : "text-ink-dim hover:text-ink hover:bg-panel/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${aktif ? "text-primary" : "text-muted"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Konten Utama Sesuai Tab */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner Peringatan Lisensi Menjelang Habis */}
        {expiringOrders.length > 0 && activeTab !== "pesanan" && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-ink">
                  {expiringOrders.length} Lisensi Bulanan Akan Kedaluwarsa dalam ≤ 7 Hari
                </h4>
                <p className="text-[11px] text-ink-dim mt-0.5">
                  Pelanggan: {expiringOrders.map((o) => `${o.nama} (${o.wa || "tanpa WA"})`).slice(0, 3).join(", ")}
                  {expiringOrders.length > 3 ? " dan lainnya..." : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("pesanan")}
              className="px-3 py-1.5 rounded-lg bg-primary text-bg font-semibold text-xs hover:bg-accent transition-colors shrink-0"
            >
              Lihat di Tab Pesanan →
            </button>
          </div>
        )}

        {/* TAB 1: RINGKASAN */}
        {activeTab === "ringkasan" && (
          <div className="space-y-6">
            {/* Kartu Metrik KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-edge bg-panel p-5 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Pendapatan (Bulan Ini)
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1 block">
                      {formatRp(stats.pendapatan_bulan_ini)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-tertiary/15 text-tertiary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="text-tertiary font-semibold">Total {stats.total_transaksi}</span> transaksi terdata
                </div>
              </div>

              <div className="rounded-2xl border border-edge bg-panel p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Total Pembeli Lifetime
                    </span>
                    <span className="text-2xl font-bold font-mono text-primary mt-1 block">
                      {stats.total_lifetime}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-muted font-mono">
                  Paket 4K Rp 55.000 seumur hidup
                </div>
              </div>

              <div className="rounded-2xl border border-edge bg-panel p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Bulanan Aktif Saat Ini
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1 block">
                      {stats.bulanan_aktif}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-panel-high text-ink">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-muted font-mono">
                  {expiringOrders.length > 0 ? (
                    <span className="text-primary font-medium">{expiringOrders.length} butuh reminder perpanjangan</span>
                  ) : (
                    <span>Semua masa aktif masih aman</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-edge bg-panel p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Paket Aktif di Katalog
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1 block">
                      {packages.filter((p) => p.aktif).length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-panel-high text-ink">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-muted font-mono">
                  Dari total {packages.length} variasi paket D1
                </div>
              </div>
            </div>

            {/* Quick Actions & Ringkasan Cepat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-edge bg-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    5 Transaksi Terakhir
                  </h3>
                  <button
                    onClick={() => setActiveTab("pesanan")}
                    className="text-xs text-primary hover:underline font-mono"
                  >
                    Lihat Semua ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted font-mono">
                    Belum ada transaksi lisensi yang diterbitkan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-edge text-muted font-mono text-[10px] uppercase">
                          <th className="pb-2">Waktu</th>
                          <th className="pb-2">Pembeli</th>
                          <th className="pb-2">Paket</th>
                          <th className="pb-2">Nominal</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Kode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-edge/40">
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o.id} className="hover:bg-panel-low/40">
                            <td className="py-2.5 font-mono text-[11px] text-muted">
                              {formatTgl(o.ts)}
                            </td>
                            <td className="py-2.5 font-medium text-ink">
                              {o.nama}
                              {o.wa && <span className="block text-[10px] font-mono text-muted">{o.wa}</span>}
                            </td>
                            <td className="py-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                o.tier === "lifetime" ? "bg-primary/15 text-primary" : "bg-panel-high text-ink"
                              }`}>
                                {o.tier === "lifetime" ? "Lifetime 4K" : "Bulanan 2K"}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono font-medium">{formatRp(o.harga)}</td>
                            <td className="py-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                o.status === "Lunas" ? "text-tertiary bg-tertiary/10" : "text-error bg-error/10"
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono">
                              <button
                                onClick={() => salinTeks(o.kode, o.id, "Kode lisensi disalin!")}
                                className="p-1 rounded bg-panel-low hover:bg-well text-ink-dim hover:text-ink transition-colors"
                                title="Salin Kode"
                              >
                                {copiedKey === o.id ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pintasan Aksi Cepat */}
              <div className="rounded-2xl border border-edge bg-panel p-5 space-y-4">
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Aksi Cepat Admin
                </h3>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab("terbitkan")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-primary/40 transition-colors text-left"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink">Terbitkan Lisensi Baru</div>
                      <div className="text-[11px] text-muted font-mono">Form input pembeli & WhatsApp</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingPkgId(null);
                      setPkgFormNama("");
                      setPkgFormTier("bulanan");
                      setPkgFormDurasi(30);
                      setPkgFormHarga(15000);
                      setPkgFormCatatan("");
                      setPkgModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-primary/40 transition-colors text-left"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink">Tambah Paket / Promo Baru</div>
                      <div className="text-[11px] text-muted font-mono">Atur durasi hari dan harga D1</div>
                    </div>
                    <Plus className="h-4 w-4 text-tertiary" />
                  </button>

                  <button
                    onClick={() => setActiveTab("template")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-primary/40 transition-colors text-left"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink">Salin Script WhatsApp Sales</div>
                      <div className="text-[11px] text-muted font-mono">Template balas cepat pelanggan</div>
                    </div>
                    <MessageSquare className="h-4 w-4 text-accent" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAKET LISENSI */}
        {activeTab === "paket" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink tracking-tight">Katalog Paket & Pricing</h2>
                <p className="text-xs text-ink-dim font-mono mt-0.5">
                  Dikelola dinamis di Cloudflare D1. Fitur mengikuti tier paket (Bulanan = 2K, Lifetime = 4K).
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingPkgId(null);
                  setPkgFormNama("");
                  setPkgFormTier("bulanan");
                  setPkgFormDurasi(30);
                  setPkgFormHarga(15000);
                  setPkgFormCatatan("");
                  setPkgModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-bg font-semibold text-xs hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>+ Buat Paket Baru</span>
              </button>
            </div>

            {/* Grid Kartu Paket */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    pkg.aktif
                      ? "border-edge bg-panel shadow-md"
                      : "border-edge/50 bg-panel-low/40 opacity-60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          pkg.tier === "lifetime" ? "bg-primary/15 text-primary" : "bg-panel-high text-ink"
                        }`}>
                          {pkg.tier}
                        </span>
                        <h3 className="font-bold text-base text-ink mt-1.5">{pkg.nama}</h3>
                      </div>
                      <button
                        onClick={() => handleTogglePaket(pkg)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                          pkg.aktif ? "bg-tertiary/15 text-tertiary" : "bg-panel-high text-muted"
                        }`}
                      >
                        {pkg.aktif ? "AKTIF" : "OFF"}
                      </button>
                    </div>

                    <div className="font-mono text-2xl font-bold text-ink">
                      {formatRp(pkg.harga)}
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-b border-edge/60 py-3">
                      <div className="flex justify-between text-ink-dim">
                        <span>Durasi:</span>
                        <span className="font-mono font-medium text-ink">
                          {pkg.tier === "lifetime" ? "Selamanya" : `${pkg.durasi_hari || 30} Hari`}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Maksimal Resolusi:</span>
                        <span className="font-mono font-medium text-ink">
                          {pkg.tier === "lifetime" ? "4K (2160p)" : "2K (1440p)"}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Bulk ZIP & Enlarge:</span>
                        <span className="font-mono text-tertiary">Didukung ✓</span>
                      </div>
                    </div>

                    {pkg.catatan && (
                      <p className="text-[11px] text-muted italic">
                        "{pkg.catatan}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-edge/40 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-muted">
                      {pkg.bawaan ? "Paket Bawaan" : "Paket Kustom"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingPkgId(pkg.id);
                          setPkgFormNama(pkg.nama);
                          setPkgFormTier(pkg.tier);
                          setPkgFormDurasi(pkg.durasi_hari || 30);
                          setPkgFormHarga(pkg.harga);
                          setPkgFormCatatan(pkg.catatan || "");
                          setPkgModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-panel-low hover:bg-panel-high text-ink font-mono text-[11px] transition-colors"
                      >
                        Edit
                      </button>
                      {!pkg.bawaan && (
                        <button
                          onClick={() => handleDeletePackage(pkg)}
                          className="p-1 rounded-lg hover:bg-error/15 text-muted hover:text-error transition-colors"
                          title="Hapus Paket"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TERBITKAN LISENSI */}
        {activeTab === "terbitkan" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Penerbitan Kode Lisensi Resmi</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Kunci privat ECDSA P-256 tersimpan aman di server Cloudflare Worker. Kode lisensi dapat divalidasi offline oleh klien.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom Kiri: Form Input Generator */}
              <div className="rounded-2xl border border-edge bg-panel p-6 shadow-sm">
                <form onSubmit={handleIssueLicense} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                      Pilih Paket Pembelian *
                    </label>
                    <select
                      value={issuePaketId}
                      onChange={(e) => setIssuePaketId(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-well px-3 py-2.5 text-xs font-mono text-ink focus:border-primary focus:outline-none"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} — {formatRp(p.harga)} ({p.tier === "lifetime" ? "Selamanya" : `${p.durasi_hari} Hari`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                        Nama Pembeli / Akun *
                      </label>
                      <input
                        type="text"
                        required
                        value={issueNama}
                        onChange={(e) => setIssueNama(e.target.value)}
                        placeholder="Misal: Mas Budi Santoso"
                        className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                        Nomor WhatsApp (Opsional)
                      </label>
                      <input
                        type="text"
                        value={issueWa}
                        onChange={(e) => setIssueWa(e.target.value)}
                        placeholder="Misal: 08123456789"
                        className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                        Metode Pembayaran
                      </label>
                      <select
                        value={issueMetode}
                        onChange={(e) => setIssueMetode(e.target.value)}
                        className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink focus:border-primary focus:outline-none"
                      >
                        <option value="QRIS">QRIS Statis / Dinamis</option>
                        <option value="Transfer BCA">Transfer Bank BCA</option>
                        <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                        <option value="GoPay / OVO / Dana">Dompet Digital (E-Wallet)</option>
                        <option value="Gratis / Giveaway">Gratis / Promo / Bonus</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                        Catatan Transaksi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        placeholder="Misal: Batch 1 Promo Launching"
                        className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Ringkasan Parameter */}
                  {selectedPackageForIssue && (
                    <div className="rounded-xl border border-edge/60 bg-panel-low p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-ink-dim">
                        <span>Tier Lisensi:</span>
                        <span className="font-semibold text-primary uppercase">{selectedPackageForIssue.tier}</span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Tagihan:</span>
                        <span className="font-semibold text-ink">{formatRp(selectedPackageForIssue.harga)}</span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Masa Berlaku:</span>
                        <span className="text-ink">
                          {selectedPackageForIssue.tier === "lifetime" ? "Akses Seumur Hidup (4K)" : `${selectedPackageForIssue.durasi_hari} Hari (2K)`}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isIssuing || !issueNama.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-bg font-bold text-xs hover:bg-accent transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isIssuing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Menandatangani ECDSA di Server...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>⚡ Terbitkan Lisensi Resmi Sekarang</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Kolom Kanan: Pratinjau Hasil & Tombol Kirim WhatsApp */}
              <div className="rounded-2xl border border-edge bg-panel p-6 shadow-sm flex flex-col justify-between">
                {latestIssuedOrder ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-edge">
                      <div className="flex items-center gap-2 text-tertiary font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Lisensi Berhasil Diterbitkan!</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted">ID: {latestIssuedOrder.id}</span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted tracking-wider block mb-1">
                        Kode Lisensi Resmi (Offline ECDSA)
                      </span>
                      <div className="rounded-xl border border-primary/30 bg-well p-3 relative group">
                        <pre className="font-mono text-[11px] text-primary break-all whitespace-pre-wrap select-all">
                          {latestIssuedOrder.kode}
                        </pre>
                        <button
                          onClick={() => salinTeks(latestIssuedOrder.kode, "issued-code", "Kode lisensi disalin!")}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-panel-high text-xs font-mono text-ink hover:text-primary transition-colors"
                        >
                          {copiedKey === "issued-code" ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Salin Kode Saja</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted tracking-wider block mb-1">
                        Pratinjau Pesan WhatsApp ke Pembeli
                      </span>
                      <div className="rounded-xl border border-edge bg-well p-3 text-xs text-ink-dim whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                        {generatedWhatsAppMsg}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => salinTeks(generatedWhatsAppMsg, "wa-msg", "Pesan WhatsApp lengkap disalin!")}
                        className="flex-1 py-2.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {copiedKey === "wa-msg" ? <Check className="h-4 w-4 text-tertiary" /> : <Copy className="h-4 w-4" />}
                        <span>Salin Format WA Lengkap</span>
                      </button>

                      {latestIssuedOrder.wa && (
                        <a
                          href={`https://wa.me/${latestIssuedOrder.wa.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(generatedWhatsAppMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 rounded-xl bg-tertiary/20 border border-tertiary/30 hover:bg-tertiary/30 text-xs font-semibold text-tertiary flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          <span>Kirim ke WhatsApp Web</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="my-auto py-16 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-panel-low text-muted">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <h4 className="font-medium text-sm text-ink">Belum Ada Lisensi Diterbitkan di Sesi Ini</h4>
                    <p className="text-xs text-muted max-w-xs mx-auto">
                      Isi formulir di sebelah kiri dan klik "Terbitkan Lisensi". Hasil kode dan template pesan WhatsApp akan tampil di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PESANAN & TRANSAKSI */}
        {activeTab === "pesanan" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink tracking-tight">Daftar Pesanan & Riwayat Transaksi</h2>
                <p className="text-xs text-ink-dim font-mono mt-0.5">
                  Tersimpan di Cloudflare D1. Memantau pesanan aktif, kedaluwarsa, dan status pembayaran.
                </p>
              </div>

              {/* Ekspor Laporan CSV Sederhana */}
              <button
                onClick={() => {
                  if (orders.length === 0) return alert("Belum ada data pesanan.");
                  const csvRows = [
                    ["ID", "Tanggal", "Nama", "WhatsApp", "Paket", "Tier", "Harga", "Status", "Kode"],
                    ...orders.map((o) => [
                      o.id,
                      new Date(o.ts).toISOString(),
                      o.nama,
                      o.wa || "",
                      o.paket_nama,
                      o.tier,
                      o.harga,
                      o.status,
                      o.kode,
                    ]),
                  ];
                  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `laporan-transaksi-motion-easy-${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-panel-low hover:bg-panel-high text-xs font-mono text-ink transition-colors"
              >
                <span>Unduh Laporan CSV</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="rounded-xl border border-edge bg-panel p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari nama, WA, ID transaksi..."
                  className="w-full rounded-lg border border-edge bg-well pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={orderTierFilter}
                  onChange={(e) => setOrderTierFilter(e.target.value)}
                  className="rounded-lg border border-edge bg-well px-2.5 py-1.5 text-xs font-mono text-ink"
                >
                  <option value="all">Semua Tier</option>
                  <option value="bulanan">Bulanan (2K)</option>
                  <option value="lifetime">Lifetime (4K)</option>
                </select>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-lg border border-edge bg-well px-2.5 py-1.5 text-xs font-mono text-ink"
                >
                  <option value="all">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Batal">Batal</option>
                  <option value="Refund">Refund</option>
                </select>
              </div>
            </div>

            {/* Tabel Pesanan */}
            <div className="rounded-2xl border border-edge bg-panel overflow-hidden shadow-sm">
              {orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted font-mono">
                  Tidak ada pesanan yang sesuai dengan filter pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-edge bg-panel-low/40 text-muted font-mono text-[10px] uppercase">
                        <th className="px-4 py-3">Waktu & ID</th>
                        <th className="px-4 py-3">Pembeli</th>
                        <th className="px-4 py-3">Paket</th>
                        <th className="px-4 py-3">Masa Berlaku</th>
                        <th className="px-4 py-3">Nominal & Bayar</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge/40">
                      {orders.map((o) => {
                        const nowSec = Math.floor(Date.now() / 1000);
                        const isExpiringSoon =
                          o.tier === "bulanan" &&
                          o.exp !== null &&
                          o.exp > nowSec &&
                          o.exp <= nowSec + 7 * 86400;
                        const isExpired = o.tier === "bulanan" && o.exp !== null && o.exp <= nowSec;

                        return (
                          <tr key={o.id} className="hover:bg-panel-low/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-[11px] text-ink block">{formatTgl(o.ts)}</span>
                              <span className="font-mono text-[10px] text-muted">{o.id}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-ink block">{o.nama}</span>
                              {o.wa ? (
                                <a
                                  href={`https://wa.me/${o.wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-[10px] text-tertiary hover:underline flex items-center gap-1"
                                >
                                  <span>{o.wa}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="font-mono text-[10px] text-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-ink block">{o.paket_nama}</span>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                                o.tier === "lifetime" ? "bg-primary/15 text-primary" : "bg-panel-high text-ink-dim"
                              }`}>
                                {o.tier}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px]">
                              {formatTgl(o.exp)}
                              {isExpiringSoon && (
                                <span className="block text-[10px] text-primary font-semibold">
                                  H-{Math.ceil((o.exp! - nowSec) / 86400)} kedaluwarsa
                                </span>
                              )}
                              {isExpired && (
                                <span className="block text-[10px] text-error font-semibold">
                                  Kedaluwarsa
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              <span className="font-bold text-ink block">{formatRp(o.harga)}</span>
                              <span className="text-[10px] text-muted">{o.metode || "QRIS"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                className={`rounded px-2 py-1 font-mono text-[10px] font-semibold border ${
                                  o.status === "Lunas"
                                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                                    : "bg-error/10 text-error border-error/20"
                                }`}
                              >
                                <option value="Lunas">Lunas</option>
                                <option value="Batal">Batal</option>
                                <option value="Refund">Refund</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => salinTeks(o.kode, o.id, "Kode lisensi disalin!")}
                                  title="Salin Kode Lisensi"
                                  className="p-1.5 rounded-lg bg-panel-low hover:bg-well text-ink-dim hover:text-ink transition-colors"
                                >
                                  {copiedKey === o.id ? (
                                    <Check className="h-3.5 w-3.5 text-tertiary" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: TEMPLATE PESAN WHATSAPP & SOP SALES */}
        {activeTab === "template" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Template Pesan WhatsApp & SOP Sales</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Template praktis untuk membalas chat pembeli, follow up pembayaran QRIS, reminder H-7, dan penawaran upgrade lifetime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: "tpl-1",
                  judul: "1. Perkenalan & Pilihan Paket Lisensi",
                  keterangan: "Kirim saat ada prospek baru menanyakan harga atau cara beli.",
                  teks: `Halo kak! Selamat datang di Motion Easy 👋\n\nBerikut pilihan lisensi resmi Motion Easy Studio:\n1. 🌟 Paket Bulanan (30 Hari) — Rp 15.000\n   ✓ Ekspor hingga 2K (1440p)\n   ✓ Fitur Bulk ZIP & Enlarge MB\n   ✓ Berlaku 30 hari\n\n2. 👑 Lifetime Pass (Akses Selamanya) — Rp 55.000 [Paling Hemat]\n   ✓ Ekspor maksimal Ultra HD 4K (2160p)\n   ✓ Fitur Bulk ZIP & Enlarge MB\n   ✓ Tanpa langganan, akses seumur hidup\n\nBoleh tahu tertarik paket yang mana kak? 😊`,
                },
                {
                  id: "tpl-2",
                  judul: "2. Instruksi Pembayaran (QRIS / Transfer)",
                  keterangan: "Kirim saat calon pembeli sudah memilih paket yang diinginkan.",
                  teks: `Baik kak, untuk aktivasi lisensi Motion Easy:\n\nPembayaran dapat dilakukan via QRIS (BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, Dana):\n[Kirim gambar QRIS Anda atau nomor rekening]\n\nSetelah transfer, mohon kirim bukti tangkapan layar ya kak agar kode lisensi resmi langsung kami terbitkan. Terima kasih! 🙏`,
                },
                {
                  id: "tpl-3",
                  judul: "3. Penyerahan Kode Lisensi & Tutorial Aktivasi",
                  keterangan: "Format standar penyerahan kode lisensi resmi setelah pembayaran lunas.",
                  teks: `Terima kasih atas pembayarannya kak! 🎉\n\nBerikut Kode Lisensi Resmi Motion Easy:\n🔑 Kode: [TEMPEL_KODE_DISINI]\n\nCara Aktivasi:\n1. Buka Motion Easy di browser: https://motion-easy.rosifulaqli59.workers.dev\n2. Klik ikon 'Lisensi' di pojok atas.\n3. Tempel kode di atas lalu klik 'Aktivasi Lisensi'.\n4. Selesai! Semua fitur langsung aktif tanpa perlu login akun.\n\nSelamat berkarya dengan video motion graphics AI berkualitas tinggi! 🚀`,
                },
                {
                  id: "tpl-4",
                  judul: "4. Pengingat Perpanjangan Lisensi (H-7 / H-3)",
                  keterangan: "Kirim ke pengguna paket bulanan yang masa aktifnya segera habis.",
                  teks: `Halo kak! Semoga project motion graphics-nya lancar ya ✨\n\nKami ingin menginfokan bahwa lisensi bulanan Motion Easy kakak akan berakhir beberapa hari lagi.\n\nAgar ekspor high-res 2K dan fitur Bulk ZIP tidak terputus, kakak bisa perpanjang sekarang dengan harga tetap Rp 15.000/30 hari, atau upgrade ke Lifetime Pass (Rp 55.000) untuk akses 4K selamanya.\n\nMau kami bantu proses sekarang kak? 😊`,
                },
                {
                  id: "tpl-5",
                  judul: "5. Penawaran Upgrade Khusus ke Lifetime Pass",
                  keterangan: "Upsell eksklusif bagi pengguna yang sudah merasakan manfaat paket bulanan.",
                  teks: `Halo kak! 🙌\n\nTerima kasih sudah aktif berkarya dengan Motion Easy! Khusus pengguna setia bulanan, hari ini kakak bisa upgrade ke *Lifetime Pass* dengan potongan spesial selisih harga!\n\nDengan Lifetime Pass:\n✓ Resolusi terbuka maksimal Ultra HD 4K (2160p)\n✓ Tidak perlu perpanjang bulanan lagi selamanya\n\nPenawaran ini terbatas ya kak. Mau kami terbitkan kode Lifetime-nya hari ini? 💎`,
                },
              ].map((tpl) => (
                <div key={tpl.id} className="rounded-2xl border border-edge bg-panel p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-ink">{tpl.judul}</h3>
                    <p className="text-[11px] text-muted">{tpl.keterangan}</p>
                    <div className="rounded-xl border border-edge bg-well p-3.5 text-xs text-ink-dim whitespace-pre-wrap font-sans max-h-56 overflow-y-auto">
                      {tpl.teks}
                    </div>
                  </div>
                  <button
                    onClick={() => salinTeks(tpl.teks, tpl.id, "Script template disalin!")}
                    className="w-full py-2.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === tpl.id ? <Check className="h-4 w-4 text-tertiary" /> : <Copy className="h-4 w-4" />}
                    <span>Salin Teks Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT & PENGATURAN */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Audit Log & Pengaturan Keamanan</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Mencatat seluruh aksi admin (login, terbitkan lisensi, perubahan paket) untuk transparansi dan audit forensik.
              </p>
            </div>

            {/* Aksi Keamanan: Keluar Semua Perangkat */}
            <div className="rounded-2xl border border-error/30 bg-error/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-error flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Cabut Semua Sesi Aktif (Logout Semua Perangkat)
                </h4>
                <p className="text-xs text-ink-dim mt-1 max-w-xl">
                  Menaikkan epoch sesi di database Cloudflare D1. Semua cookie sesi admin di perangkat mana pun akan langsung kedaluwarsa seketika.
                </p>
              </div>
              <button
                onClick={handleLogoutSemua}
                className="px-4 py-2 rounded-xl bg-error text-bg font-bold text-xs hover:bg-error/90 transition-colors shrink-0"
              >
                Cabut Semua Sesi
              </button>
            </div>

            {/* Tabel Audit Log */}
            <div className="rounded-2xl border border-edge bg-panel p-5 space-y-4">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Riwayat Aktivitas Terakhir
              </h3>

              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted font-mono">
                  Belum ada catatan aktivitas admin.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-edge text-muted text-[10px] uppercase">
                        <th className="pb-2">Waktu</th>
                        <th className="pb-2">Admin / Pelaku</th>
                        <th className="pb-2">Aksi</th>
                        <th className="pb-2">Detail Perubahan</th>
                        <th className="pb-2">IP Asal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge/40">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-panel-low/40">
                          <td className="py-2.5 text-muted">{formatTgl(log.ts)}</td>
                          <td className="py-2.5 text-ink font-semibold">{log.email}</td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-panel-high text-primary text-[10px]">
                              {log.aksi}
                            </span>
                          </td>
                          <td className="py-2.5 text-ink-dim max-w-xs truncate">{log.detail}</td>
                          <td className="py-2.5 text-muted">{log.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL BUAT / EDIT PAKET */}
      {pkgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-edge bg-panel p-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <h3 className="font-bold text-base text-ink flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>{editingPkgId ? "Edit Konfigurasi Paket" : "Buat Paket / Promo Baru"}</span>
              </h3>
              <button
                onClick={() => setPkgModalOpen(false)}
                className="p-1 rounded-lg hover:bg-panel-high text-muted hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="mt-4 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                  Nama Paket *
                </label>
                <input
                  type="text"
                  required
                  value={pkgFormNama}
                  onChange={(e) => setPkgFormNama(e.target.value)}
                  placeholder="Misal: Promo Launching 90 Hari"
                  className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                    Tier Lisensi *
                  </label>
                  <select
                    disabled={!!editingPkgId}
                    value={pkgFormTier}
                    onChange={(e) => setPkgFormTier(e.target.value as any)}
                    className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink focus:border-primary focus:outline-none disabled:opacity-50"
                  >
                    <option value="bulanan">Bulanan (Maks 2K)</option>
                    <option value="lifetime">Lifetime (Maks 4K)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                    Durasi (Hari)
                  </label>
                  <input
                    type="number"
                    disabled={pkgFormTier === "lifetime"}
                    value={pkgFormTier === "lifetime" ? "" : pkgFormDurasi}
                    onChange={(e) => setPkgFormDurasi(Number(e.target.value))}
                    placeholder={pkgFormTier === "lifetime" ? "Selamanya" : "30"}
                    className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                  Harga Resmi (Rupiah) *
                </label>
                <input
                  type="number"
                  required
                  value={pkgFormHarga}
                  onChange={(e) => setPkgFormHarga(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1">
                  Catatan Internal / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={pkgFormCatatan}
                  onChange={(e) => setPkgFormCatatan(e.target.value)}
                  placeholder="Keterangan singkat paket..."
                  className="w-full rounded-xl border border-edge bg-well px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPkgModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-edge text-xs text-ink-dim hover:text-ink transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPkg}
                  className="px-5 py-2 rounded-xl bg-primary text-bg font-bold text-xs hover:bg-accent transition-colors disabled:opacity-40"
                >
                  {isSavingPkg ? "Menyimpan..." : "Simpan Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
