import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  KeyRound,
  Receipt,
  MessageSquare,
  ShieldCheck,
  Users,
  Check,
  Copy,
  Eye,
  EyeOff,
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
import { useHarga } from "../config/HargaContext";
import { hargaRp } from "../config/paketData";

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
    "ringkasan" | "paket" | "terbitkan" | "pesanan" | "template" | "audit" | "tim"
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

  // Toast / Status salin
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Harga live (langsung tampil di banner & template WA)
  const hargaLive = useHarga();
  // State kode lisensi yang diperlihatkan di tabel (id -> terbuka)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

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

  const toggleKode = (id: string) =>
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Filter & Pencarian Pesanan
  const [orderSearch, setOrderSearch] = useState("");
  const [orderTierFilter, setOrderTierFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [cliImporTeks, setCliImporTeks] = useState("");
  const [cliImporHasil, setCliImporHasil] = useState<null | { ditambah: number; dilewati: number; total: number }>(null);
  const [cliSedangImpor, setCliSedangImpor] = useState(false);

  // Filter Katalog Paket (A+B)
  const [paketFilter, setPaketFilter] = useState<"semua" | "aktif" | "nonaktif">("semua");

  // Tim Admin (rata: ownerEnv + admin D1)
  const [timRows, setTimRows] = useState<Array<{ email:string; nama:string; aktif:number; dibuat_ts:number; dibuat_oleh:string|null; terakhir_login_ts:number|null }>>([]);
  const [timEnvOwners, setTimEnvOwners] = useState<string[]>([]);
  const [timSelfEmail, setTimSelfEmail] = useState("");
  const isOwnerEnv = useMemo(() => config?.email ? timEnvOwners.map((e)=>e.toLowerCase()).includes(config.email.toLowerCase()) : false, [timEnvOwners, config?.email]);
  const [timEmail, setTimEmail] = useState("");
  const [timNama, setTimNama] = useState("");
  const [timBusy, setTimBusy] = useState(false);
  const muatTim = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/tim", { headers: API_HEADERS });
      const j = await r.json();
      if (j.ok) { setTimRows(j.data||[]); setTimEnvOwners(j.envOwners||[]); setTimSelfEmail((j.selfEmail||"").toLowerCase()); }
    } catch {}
  }, []);

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
    if (config?.authenticated && activeTab === "tim") muatTim();
  }, [config?.authenticated, activeTab, muatTim]);

  // Impor CLI → D1 (setelah muatDataDashboard supaya deps valid)
  // Terima: JSON array, JSONL, satu baris JSON, atau kode mentah "payload.sig"
  // Untuk kode mentah, baca payload base64url -> {tier, iat, exp, note} supaya tidak selalu lifetime
  function kodeKeItems(kode: string): unknown | null {
    const k = kode.trim(); if (!k.includes(".")) return null;
    const dot = k.indexOf("."); if (dot < 1) return null;
    const head = k.slice(0, dot);
    try {
      const b64 = head.replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
      const p = JSON.parse(json);
      const tier = p?.tier === "bulanan" ? "bulanan" as const : "lifetime" as const;
      const exp: number | null = typeof p?.exp === "number" ? p.exp : null;
      const note: string = typeof p?.note === "string" ? p.note : "";
      const ts: number = typeof p?.iat === "number" ? p.iat * 1000 : Date.now();
      return { kode: k, tier, exp, note, nama: note || "Pembeli CLI", ts, paket_id: tier === "bulanan" ? "paket-bulanan-30" : "paket-lifetime", paket_nama: tier === "bulanan" ? "Paket Bulanan (30 Hari)" : "Lifetime Pass" };
    } catch { return null; }
  }
  function parseCliTokens(teks: string): unknown[] {
    const t = teks.trim(); const out: unknown[] = [];
    // TSV/noise dari CSV: coba ekstrak setiap kode payload.sig dulu
    const codePat = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{40,}/g;
    if (t.includes(",")) {
      // kemungkinan CSV atau campur: ambil semua kode, kalau ada
      const m = [...t.matchAll(codePat)]; if (m.length > 0) { for (const mm of m) { const it = kodeKeItems(mm[0]); if (it) out.push(it); } return out; }
    }
    if (t.startsWith("[")) {
      try { const a = JSON.parse(t); if (Array.isArray(a)) return a; } catch { showToast("Format array JSON tidak valid."); return out; }
    } else if (t.includes("\n") && t.includes("{")) {
      for (const line of t.split(/\r?\n/)) {
        const L = line.trim(); if (!L) continue;
        try { out.push(JSON.parse(L)); } catch {
          const it = kodeKeItems(L); if (it) out.push(it);
        }
      }
      return out;
    } else if (t.trim().startsWith("{")) {
      try { out.push(JSON.parse(t)); } catch { showToast("Baris JSON tidak valid."); return out; }
      return out;
    } else if (t.includes(".")) {
      // bisa beberapa kode per baris dipisah spasi/koma
      const toks = t.split(/[\s,;\n]+/).filter(Boolean);
      for (const tok of toks) { const it = kodeKeItems(tok); if (it) out.push(it); }
      if (out.length) return out;
    }
    return out;
  }
  const handleImporCli = useCallback(async () => {
    const teks = cliImporTeks.trim();
    if (!teks) { showToast("Tempel JSON/JSONL kode CLI dulu."); return; }
    const items: unknown[] = parseCliTokens(teks);
    if (items.length === 0) { showToast("Tidak ada baris valid untuk diimpor."); return; }
    setCliSedangImpor(true); setCliImporHasil(null);
    try {
      const res = await fetch("/api/admin/pesanan/impor", {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ items }),
      });
      const j = await res.json();
      if (!j.ok) { showToast(j.error || "Impor gagal."); return; }
      setCliImporHasil({ ditambah: j.ditambah, dilewati: j.dilewati, total: j.total });
      showToast(`Impor selesai: +${j.ditambah} ditambah, ${j.dilewati} dilewati.`);
      setCliImporTeks("");
      muatDataDashboard();
    } catch (e) { console.error(e); showToast("Impor gagal — cek jaringan."); }
    finally { setCliSedangImpor(false); }
  }, [cliImporTeks, muatDataDashboard, showToast]);

  const handleImporFile = useCallback(async (txt: string) => {
    const toks = parseCliTokens(txt);
    if (toks.length === 0) { showToast("File tidak mengandung baris valid."); return; }
    setCliSedangImpor(true); setCliImporHasil(null);
    try {
      const res = await fetch("/api/admin/pesanan/impor", { method: "POST", headers: API_HEADERS, body: JSON.stringify({ items: toks }) });
      const j = await res.json(); if (!j.ok) { showToast(j.error || "Impor gagal."); return; }
      setCliImporHasil({ ditambah: j.ditambah, dilewati: j.dilewati, total: j.total });
      showToast(`Impor file: +${j.ditambah} ditambah, ${j.dilewati} dilewati.`);
      muatDataDashboard();
    } catch (e) { console.error(e); showToast("Impor file gagal."); }
    finally { setCliSedangImpor(false); }
  }, [muatDataDashboard, showToast]);

  const handleEksporJsonl = useCallback(() => {
    if (orders.length === 0) { showToast("Belum ada pesanan untuk diarsip."); return; }
    const lines = orders.map((o) => JSON.stringify({ ts: o.ts, tier: o.tier, exp: o.exp, harga: o.harga, nama: o.nama, wa: o.wa, note: (o as unknown as { note?: string }).note ?? "", paket_id: o.paket_id, paket_nama: o.paket_nama, kode: o.kode }));
    const blob = new Blob([lines.join("\n")], { type: "application/x-ndjson;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `motion-easy-ledger-${Date.now()}.jsonl` });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }, [orders, showToast]);

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

  // Simpan / Buat Paket Baru — helper Tim Admin (rata: semua admin sederajat)
  const handleAddTim = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRaw = timEmail.trim().toLowerCase();
    const namaRaw = timNama.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) { showToast("Email tidak valid."); return; }
    if (timRows.some((r)=>r.email.toLowerCase()===emailRaw) || timEnvOwners.map((x)=>x.toLowerCase()).includes(emailRaw)) { showToast("Email sudah terdaftar."); return; }
    setTimBusy(true);
    try {
      const r = await fetch("/api/admin/tim", { method: "POST", headers: API_HEADERS, body: JSON.stringify({ email: emailRaw, nama: namaRaw }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Gagal tambah admin");
      setTimEmail(""); setTimNama("");
      showToast(`Admin ${emailRaw} ditambahkan — minta login Google pakai email itu.`);
      muatTim();
    } catch (err:any) { showToast(err.message||"Gagal tambah admin."); }
    finally { setTimBusy(false); }
  };
  const handleRemoveTim = async (email: string) => {
    if (!confirm(`Hapus admin ${email}? Aksesnya langsung terputus.`)) return;
    try {
      const r = await fetch(`/api/admin/tim/${encodeURIComponent(email)}`, { method: "DELETE", headers: API_HEADERS });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Gagal hapus");
      showToast(`Admin ${email} dihapus.`);
      muatTim();
    } catch (err:any) { showToast(err.message||"Gagal hapus."); }
  };
  const handleToggleTim = async (row: typeof timRows[number]) => {
    const nextAktif = row.aktif ? 0 : 1;
    if (row.email.toLowerCase() === timSelfEmail) { showToast("Tidak bisa menonaktifkan email kamu sendiri."); return; }
    try {
      const r = await fetch(`/api/admin/tim/${encodeURIComponent(row.email)}`, { method: "PATCH", headers: API_HEADERS, body: JSON.stringify({ aktif: nextAktif }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error||"Gagal ubah status");
      showToast(nextAktif ? `Admin ${row.email} diaktifkan.` : `Admin ${row.email} dinonaktifkan — akses langsung terputus.`);
      muatTim();
    } catch (err:any) { showToast(err.message||"Gagal ubah."); }
  };
  const undanganWa = (email: string, nama: string) =>
    `Halo kak ${nama || email} \uD83D\uDC4B — kamu sudah jadi admin Motion Easy.\nLogin di https://motion-easy.rosifulaqli59.workers.dev/admin pakai akun Google *${email}* (Sign in with Google).\nKalau Google masih Testing: Owner harus tambahkan email ini di OAuth consent screen \u2192 Test users.\nSetelah masuk, paket & lisensi = sederajat (rata) dengan owner.`;

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
        <div className="flex gap-1.5 py-2 min-w-max">
          {[
            { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
            { id: "paket", label: "Paket Lisensi", icon: Package },
            { id: "terbitkan", label: "Terbitkan Lisensi", icon: KeyRound },
            { id: "pesanan", label: "Pesanan & Transaksi", icon: Receipt },
            { id: "template", label: "Template WhatsApp", icon: MessageSquare },
            { id: "tim", label: "Tim Admin", icon: Users },
            { id: "audit", label: "Audit & Pengaturan", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const aktif = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  aktif
                    ? "bg-panel text-primary border border-primary/30 shadow-[0_0_15px_rgba(249,115,22,0.15)] font-semibold"
                    : "text-ink-dim hover:text-ink hover:bg-panel/50 border border-transparent"
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
          <div className="space-y-6 animate-fade-in">
            {/* Kartu Metrik KPI dengan Ambient Glow khas Stitch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 shadow-md hover:border-tertiary/40 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-tertiary/10 blur-xl pointer-events-none group-hover:bg-tertiary/20 transition-all" />
                <div className="relative flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Total Pendapatan (Bulan Ini)
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1.5 block tracking-tight">
                      {formatRp(stats.pendapatan_bulan_ini)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-tertiary/15 text-tertiary border border-tertiary/20 shadow-sm">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1 text-tertiary font-semibold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    {stats.total_transaksi}
                  </span>
                  <span>transaksi berhasil terdata</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-primary/10 blur-xl pointer-events-none group-hover:bg-primary/20 transition-all" />
                <div className="relative flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Total Pembeli Lifetime
                    </span>
                    <span className="text-2xl font-bold font-mono text-primary mt-1.5 block tracking-tight">
                      {stats.total_lifetime}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/15 text-primary border border-primary/20 shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-muted font-mono">
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold text-[10px]">
                    4K Ultra HD
                  </span>
                  <span>Akses seumur hidup {hargaRp(hargaLive.lifetime)}</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-accent/10 blur-xl pointer-events-none group-hover:bg-accent/20 transition-all" />
                <div className="relative flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Bulanan Aktif Saat Ini
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1.5 block tracking-tight">
                      {stats.bulanan_aktif}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-panel-high text-accent border border-accent/20 shadow-sm">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative mt-4 text-[11px] text-muted font-mono flex items-center gap-1">
                  {expiringOrders.length > 0 ? (
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {expiringOrders.length} butuh reminder perpanjangan
                    </span>
                  ) : (
                    <span className="text-tertiary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Semua masa aktif aman
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaketFilter("aktif");
                  setActiveTab("paket");
                }}
                className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 shadow-md hover:border-ink/20 hover:-translate-y-0.5 transition-all duration-200 group text-left w-full"
              >
                <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-panel-high blur-xl pointer-events-none" />
                <div className="relative flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted block">
                      Paket Aktif di Katalog
                    </span>
                    <span className="text-2xl font-bold font-mono text-ink mt-1.5 block tracking-tight">
                      {packages.filter((p) => p.aktif).length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-panel-high text-ink border border-edge shadow-sm group-hover:border-ink/20 transition-colors">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative mt-4 text-[11px] text-muted font-mono">
                  Dari total <span className="text-ink font-semibold">{packages.length} variasi</span> paket di D1
                  {packages.filter((p) => p.aktif).length > 0 && (
                    <span className="block mt-1.5 text-[10px] leading-relaxed text-ink-dim">
                      {packages
                        .filter((p) => p.aktif)
                        .map((p) => `${p.nama} · ${formatRp(p.harga)}`)
                        .join(" · ")}
                    </span>
                  )}
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-semibold">
                    Lihat katalog <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            </div>

            {/* Quick Actions & Ringkasan Cepat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-edge/60">
                  <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>5 Transaksi Terkini</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("pesanan")}
                    className="text-xs text-primary hover:text-accent transition-colors font-mono font-medium flex items-center gap-1"
                  >
                    <span>Lihat Semua ({orders.length})</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted font-mono">
                    Belum ada transaksi lisensi yang diterbitkan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-edge text-muted font-mono text-[10px] uppercase">
                          <th className="pb-2.5">Waktu</th>
                          <th className="pb-2.5">Pembeli</th>
                          <th className="pb-2.5">Paket</th>
                          <th className="pb-2.5">Nominal</th>
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5 text-right">Kode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-edge/40">
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o.id} className="hover:bg-panel-low/60 transition-colors">
                            <td className="py-3 font-mono text-[11px] text-muted">
                              {formatTgl(o.ts)}
                            </td>
                            <td className="py-3 font-medium text-ink">
                              <div>{o.nama}</div>
                              {o.wa && <div className="text-[10px] font-mono text-muted">{o.wa}</div>}
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                                o.tier === "lifetime"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-panel-high text-ink border-edge"
                              }`}>
                                {o.tier === "lifetime" ? "Lifetime 4K" : "Bulanan 2K"}
                              </span>
                            </td>
                            <td className="py-3 font-mono font-semibold text-ink">{formatRp(o.harga)}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                o.status === "Lunas"
                                  ? "text-tertiary bg-tertiary/10 border-tertiary/20"
                                  : "text-error bg-error/10 border-error/20"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${o.status === "Lunas" ? "bg-tertiary" : "bg-error"}`} />
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {revealedIds.has(o.id) ? (
                                  <div className="max-w-[200px] rounded-lg border border-primary/20 bg-well px-2 py-1.5 text-left">
                                    <p className="font-mono text-[10px] leading-relaxed text-primary break-all select-all">{o.kode}</p>
                                  </div>
                                ) : (
                                  <span className="font-mono text-[10px] tracking-[0.18em] text-muted select-none">•••• •••• •••• ••••</span>
                                )}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleKode(o.id)}
                                    title={revealedIds.has(o.id) ? "Sembunyikan kode" : "Lihat kode lisensi"}
                                    className={`p-1.5 rounded-lg border transition-colors ${revealedIds.has(o.id) ? "bg-primary/10 border-primary/20 text-primary" : "bg-panel-low border-edge/60 text-ink-dim hover:text-ink hover:bg-panel-high"}`}
                                  >
                                    {revealedIds.has(o.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => salinTeks(o.kode, o.id, "Kode lisensi disalin!")}
                                    className="p-1.5 rounded-lg bg-panel-low hover:bg-panel-high text-ink-dim hover:text-primary transition-colors border border-edge/60"
                                    title="Salin Kode"
                                  >
                                    {copiedKey === o.id ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pintasan Aksi Cepat */}
              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-6 space-y-4 shadow-sm">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                <h3 className="font-bold text-sm text-ink flex items-center gap-2 pb-2 border-b border-edge/60">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Aksi Cepat Admin</span>
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("terbitkan")}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-primary/40 hover:-translate-y-0.5 transition-all text-left shadow-sm group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink group-hover:text-primary transition-colors">
                        Terbitkan Lisensi Baru
                      </div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">
                        Form input pembeli & kirim WhatsApp
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-tertiary/40 hover:-translate-y-0.5 transition-all text-left shadow-sm group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink group-hover:text-tertiary transition-colors">
                        Tambah Paket / Promo Baru
                      </div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">
                        Atur harga, nama promo, dan durasi di D1
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-tertiary group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab("template")}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high hover:border-accent/40 hover:-translate-y-0.5 transition-all text-left shadow-sm group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                        Salin Script WhatsApp Sales
                      </div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">
                        5 template praktis balas cepat pelanggan
                      </div>
                    </div>
                    <MessageSquare className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAKET LISENSI */}
        {activeTab === "paket" && (
          <div className="space-y-6 animate-fade-in">
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-bg font-semibold text-xs hover:bg-accent transition-all shadow-sm hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                <span>+ Buat Paket Baru</span>
              </button>
            </div>

            {/* Filter kapsul — A+B */}
            {(() => {
              const hitAktif = packages.filter((p) => p.aktif).length;
              const hitOff = packages.length - hitAktif;
              const Chip = ({ id, label, n }: { id: typeof paketFilter; label: string; n: number }) => (
                <button
                  type="button"
                  onClick={() => setPaketFilter(id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-mono font-semibold transition-colors ${
                    paketFilter === id
                      ? "border-primary bg-primary text-bg"
                      : "border-edge bg-panel-low text-muted hover:border-ink/20 hover:text-ink"
                  }`}
                >
                  {label} <span className={paketFilter === id ? "text-bg/80" : "text-muted"}>({n})</span>
                </button>
              );
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip id="semua" label="Semua" n={packages.length} />
                  <Chip id="aktif" label="Aktif" n={hitAktif} />
                  <Chip id="nonaktif" label="Nonaktif" n={hitOff} />
                  {paketFilter !== "semua" && (
                    <button
                      type="button"
                      onClick={() => setPaketFilter("semua")}
                      className="ml-1 text-[11px] font-mono text-primary hover:text-accent"
                    >
                      Reset
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Grid Kartu Paket */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(() => {
                const filtered =
                  paketFilter === "aktif"
                    ? packages.filter((p) => p.aktif)
                    : paketFilter === "nonaktif"
                      ? packages.filter((p) => !p.aktif)
                      : packages;
                // aktif dulu biar tidak tenggelam
                const sorted = [...filtered].sort((a, b) => Number(b.aktif) - Number(a.aktif) || a.urut - b.urut);
                if (sorted.length === 0) {
                  return (
                    <div className="col-span-full rounded-2xl border border-dashed border-edge bg-panel-low/40 px-6 py-10 text-center text-xs font-mono text-muted">
                      Tidak ada paket pada filter <span className="font-semibold text-ink">"{paketFilter}"</span>.
                    </div>
                  );
                }
                return sorted.map((pkg) => {
                const isLifetime = pkg.tier === "lifetime";
                return (
                  <div
                    key={pkg.id}
                    className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between transition-all group hover:-translate-y-0.5 shadow-md ${
                      pkg.aktif
                        ? isLifetime
                          ? "border-primary/50 bg-panel ring-1 ring-primary/20 shadow-primary/5"
                          : "border-edge/90 bg-panel hover:border-tertiary/40"
                        : "border-edge/50 bg-panel-low/40 opacity-60"
                    }`}
                  >
                    {/* Ambient Glow */}
                    <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all ${
                      isLifetime ? "bg-primary/10 group-hover:bg-primary/20" : "bg-tertiary/5 group-hover:bg-tertiary/15"
                    }`} />

                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                            isLifetime 
                              ? "bg-primary/15 text-primary border-primary/30" 
                              : "bg-panel-high text-ink border-edge"
                          }`}>
                            {isLifetime && <Sparkles className="h-3 w-3" />}
                            {pkg.tier}
                          </span>
                          <h3 className="font-bold text-base text-ink mt-2 tracking-tight">{pkg.nama}</h3>
                        </div>
                        <button
                          onClick={() => handleTogglePaket(pkg)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-colors border ${
                            pkg.aktif 
                              ? "bg-tertiary/10 text-tertiary border-tertiary/30" 
                              : "bg-panel-high text-muted border-edge"
                          }`}
                        >
                          {pkg.aktif ? "AKTIF" : "OFF"}
                        </button>
                      </div>

                      <div className="font-mono text-2xl font-bold text-ink tracking-tight pt-1">
                        {formatRp(pkg.harga)}
                      </div>

                      <div className="space-y-2 text-xs border-t border-b border-edge/60 py-3 font-mono">
                        <div className="flex justify-between text-ink-dim">
                          <span>Durasi:</span>
                          <span className="font-semibold text-ink">
                            {isLifetime ? "Selamanya (Lifetime)" : `${pkg.durasi_hari || 30} Hari`}
                          </span>
                        </div>
                        <div className="flex justify-between text-ink-dim">
                          <span>Maksimal Resolusi:</span>
                          <span className={`font-semibold ${isLifetime ? "text-primary" : "text-ink"}`}>
                            {isLifetime ? "4K Ultra HD (2160p)" : "2K QHD (1440p)"}
                          </span>
                        </div>
                        <div className="flex justify-between text-ink-dim">
                          <span>Bulk ZIP & Enlarge:</span>
                          <span className="text-tertiary font-semibold flex items-center gap-1">
                            <span>Didukung</span> ✓
                          </span>
                        </div>
                      </div>

                      {pkg.catatan && (
                        <p className="text-[11px] text-muted italic bg-panel-low/60 p-2 rounded-xl border border-edge/40">
                          "{pkg.catatan}"
                        </p>
                      )}
                    </div>

                    <div className="relative mt-5 pt-3 border-t border-edge/60 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-muted flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${pkg.bawaan ? "bg-muted" : "bg-accent"}`} />
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
                          className="px-3 py-1.5 rounded-xl bg-panel-low hover:bg-panel-high text-ink font-mono text-xs transition-colors border border-edge/60"
                        >
                          Edit
                        </button>
                        {!pkg.bawaan && (
                          <button
                            onClick={() => handleDeletePackage(pkg)}
                            className="p-1.5 rounded-xl hover:bg-error/15 text-muted hover:text-error transition-colors border border-transparent hover:border-error/30"
                            title="Hapus Paket"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: TERBITKAN LISENSI */}
        {activeTab === "terbitkan" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Penerbitan Kode Lisensi Resmi</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Kunci privat ECDSA P-256 tersimpan aman di Cloudflare Worker. Kode lisensi diverifikasi offline oleh klien.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom Kiri: Form Input Generator */}
              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-6 shadow-md">
                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                <form onSubmit={handleIssueLicense} className="relative space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                      Pilih Paket Pembelian *
                    </label>
                    <select
                      value={issuePaketId}
                      onChange={(e) => setIssuePaketId(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} — {formatRp(p.harga)} ({p.tier === "lifetime" ? "Selamanya" : `${p.durasi_hari} Hari`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                        Nama Pembeli / Akun *
                      </label>
                      <input
                        type="text"
                        required
                        value={issueNama}
                        onChange={(e) => setIssueNama(e.target.value)}
                        placeholder="Misal: Mas Budi Santoso"
                        className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                        Nomor WhatsApp (Opsional)
                      </label>
                      <input
                        type="text"
                        value={issueWa}
                        onChange={(e) => setIssueWa(e.target.value)}
                        placeholder="Misal: 08123456789"
                        className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                        Metode Pembayaran
                      </label>
                      <select
                        value={issueMetode}
                        onChange={(e) => setIssueMetode(e.target.value)}
                        className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                      >
                        <option value="QRIS">QRIS Statis / Dinamis</option>
                        <option value="Transfer BCA">Transfer Bank BCA</option>
                        <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                        <option value="GoPay / OVO / Dana">Dompet Digital (E-Wallet)</option>
                        <option value="Gratis / Giveaway">Gratis / Promo / Bonus</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                        Catatan Transaksi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        placeholder="Misal: Batch 1 Promo Launching"
                        className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Ringkasan Parameter */}
                  {selectedPackageForIssue && (
                    <div className="rounded-xl border border-edge/80 bg-panel-low/80 p-4 space-y-2 text-xs font-mono shadow-sm">
                      <div className="flex justify-between items-center text-ink-dim">
                        <span>Tier Lisensi:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {selectedPackageForIssue.tier}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Tagihan Pembayaran:</span>
                        <span className="font-bold text-ink">{formatRp(selectedPackageForIssue.harga)}</span>
                      </div>
                      <div className="flex justify-between text-ink-dim">
                        <span>Masa Berlaku:</span>
                        <span className="text-ink">
                          {selectedPackageForIssue.tier === "lifetime" ? "Akses Seumur Hidup (4K Ultra HD)" : `${selectedPackageForIssue.durasi_hari} Hari (2K QHD)`}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isIssuing || !issueNama.trim()}
                    className="w-full py-3.5 rounded-xl bg-primary text-bg font-bold text-xs hover:bg-accent transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20 hover:scale-[1.01]"
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
              <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-6 shadow-md flex flex-col justify-between">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-tertiary/5 blur-2xl pointer-events-none" />
                {latestIssuedOrder ? (
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-edge/60">
                      <div className="flex items-center gap-2 text-tertiary font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Lisensi Berhasil Diterbitkan!</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted">ID: {latestIssuedOrder.id}</span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted tracking-wider block mb-1.5 font-semibold">
                        Kode Lisensi Resmi (Offline ECDSA)
                      </span>
                      <div className="rounded-xl border border-primary/30 bg-well/90 p-3.5 relative group shadow-inner">
                        <pre className="font-mono text-[11px] text-primary break-all whitespace-pre-wrap select-all font-semibold leading-relaxed">
                          {latestIssuedOrder.kode}
                        </pre>
                        <button
                          onClick={() => salinTeks(latestIssuedOrder.kode, "issued-code", "Kode lisensi disalin!")}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-high hover:bg-panel text-xs font-mono text-ink hover:text-primary transition-all border border-edge/60 shadow-sm"
                        >
                          {copiedKey === "issued-code" ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Salin Kode Saja</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted tracking-wider block mb-1.5 font-semibold">
                        Pratinjau Pesan WhatsApp ke Pembeli
                      </span>
                      <div className="rounded-xl border border-edge bg-well/80 p-3.5 text-xs text-ink-dim whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed shadow-inner">
                        {generatedWhatsAppMsg}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      <button
                        onClick={() => salinTeks(generatedWhatsAppMsg, "wa-msg", "Pesan WhatsApp lengkap disalin!")}
                        className="flex-1 py-2.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        {copiedKey === "wa-msg" ? <Check className="h-4 w-4 text-tertiary" /> : <Copy className="h-4 w-4" />}
                        <span>Salin Format WA Lengkap</span>
                      </button>

                      {latestIssuedOrder.wa && (
                        <a
                          href={`https://wa.me/${latestIssuedOrder.wa.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(generatedWhatsAppMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 rounded-xl bg-tertiary/15 border border-tertiary/30 hover:bg-tertiary/25 text-xs font-semibold text-tertiary flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <Send className="h-4 w-4" />
                          <span>Kirim ke WhatsApp Web</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative my-auto py-16 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel-low border border-edge text-muted">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-sm text-ink tracking-tight">Belum Ada Lisensi Diterbitkan di Sesi Ini</h4>
                    <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                      Isi formulir di sebelah kiri dan klik "Terbitkan Lisensi". Hasil kode ECDSA dan template pesan WhatsApp otomatis tampil di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PESANAN & TRANSAKSI */}
        {activeTab === "pesanan" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink tracking-tight">Daftar Pesanan & Riwayat Transaksi</h2>
                <p className="text-xs text-ink-dim font-mono mt-0.5">
                  Tersimpan di Cloudflare D1. Memantau pesanan aktif, kedaluwarsa, dan status pembayaran.
                </p>
              </div>

              {/* Ekspor: JSONL (arsip CLI) + CSV */}
              <div className="flex flex-wrap gap-1.5 shrink-0">
              <button onClick={handleEksporJsonl}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-mono text-ink transition-all shadow-sm hover:scale-[1.02]"
                title="Arsip JSONL untuk dicadangkan atau dibuka lagi di Impor"
              >
                <span className="rounded bg-well border border-edge px-1 py-0.5 text-[9px] leading-none">.jsonl</span>
                <span>Ekspor JSONL</span>
              </button>
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-mono text-ink transition-all shadow-sm hover:scale-[1.02] shrink-0"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                <span>Unduh CSV</span>
              </button>
              </div>
            </div>

            {/* Filter Bar + Impor CLI */}
            <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari nama, WhatsApp, ID..."
                  className="w-full rounded-xl border border-edge bg-well pl-10 pr-3.5 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <select
                  value={orderTierFilter}
                  onChange={(e) => setOrderTierFilter(e.target.value)}
                  className="rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink focus:border-primary focus:outline-none shadow-inner"
                >
                  <option value="all">Semua Tier</option>
                  <option value="bulanan">Bulanan (2K)</option>
                  <option value="lifetime">Lifetime (4K)</option>
                </select>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-xl border border-edge bg-well px-3 py-2 text-xs font-mono text-ink focus:border-primary focus:outline-none shadow-inner"
                >
                  <option value="all">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Batal">Batal</option>
                  <option value="Refund">Refund</option>
                </select>
              </div>
            </div>
            {/* Impor dari CLI — ledger JSONL */}
            <div className="rounded-xl border border-dashed border-edge bg-panel-low/50 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                <span className="rounded-lg bg-well border border-edge px-1.5 py-0.5 font-mono text-[10px] leading-none">CLI</span>
                <span>Impor dari CLI</span>
                <span className="font-mono text-[10px] text-muted font-normal">.rahasia/lisensi-terbit.jsonl → D1</span>
              </div>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">
                Cara: <code className="rounded bg-well px-1 py-0.5">node tools/lisensi.mjs sign --tier ... --key ...</code> otomatis menambah baris ke <code className="rounded bg-well px-1 py-0.5">lisensi-terbit.jsonl</code>. Pilih file itu, atau paste isinya di bawah (JSONL / array JSON / kode mentah). Idempoten — impor ulang tidak duplikasi.
              </p>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <button type="button"
                  onClick={() => document.getElementById("inp-cli-file")?.click()}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-edge bg-well px-3 text-xs font-mono text-ink hover:bg-panel-high"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Pilih file .jsonl / .csv</span>
                </button>
                <input id="inp-cli-file" type="file" accept=".jsonl,.json,.csv,.txt" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    f.text().then((t) => handleImporFile(t));
                    (e.target as HTMLInputElement).value = "";
                  }}
                />
                <span className="self-center font-mono text-[10px] text-muted">atau tempel di bawah →</span>
              </div>
              <textarea
                value={cliImporTeks}
                onChange={(e) => setCliImporTeks(e.target.value)}
                placeholder="Tempel JSONL / array JSON / atau satu baris kode payload.sig di sini…"
                rows={3}
                className="mt-2 min-h-[72px] w-full resize-y rounded-xl border border-edge bg-well px-3 py-2 font-mono text-[10px] leading-relaxed text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button"
                  onClick={handleImporCli}
                  disabled={cliSedangImpor || !cliImporTeks.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-bg hover:bg-accent disabled:opacity-40"
                >
                  {cliSedangImpor ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <span>⬆</span>}
                  <span>{cliSedangImpor ? "Mengimpor…" : "Impor ke D1"}</span>
                </button>
                <button type="button"
                  onClick={() => { setCliImporTeks(""); setCliImporHasil(null); }}
                  className="rounded-xl border border-edge px-3 py-1.5 text-xs font-mono text-muted hover:bg-panel-high"
                >
                  Bersihkan
                </button>
                {cliImporHasil && (
                  <span className="rounded-full border border-tertiary/30 bg-tertiary/10 px-2.5 py-1 font-mono text-[11px] text-tertiary">
                    +{cliImporHasil.ditambah} ditambah · {cliImporHasil.dilewati} dilewati · total {cliImporHasil.total}
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted">Riwayat impor juga muncul di tab Audit.</span>
              </div>
            </div>
            </div>

            {/* Tabel Pesanan */}
            <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel shadow-md">
              {orders.length === 0 ? (
                <div className="py-20 text-center text-xs text-muted font-mono">
                  Tidak ada pesanan yang sesuai dengan filter pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-edge bg-panel-low/70 text-muted font-mono text-[10px] uppercase tracking-wider">
                        <th className="px-5 py-3.5 font-semibold">Waktu & ID</th>
                        <th className="px-5 py-3.5 font-semibold">Pembeli</th>
                        <th className="px-5 py-3.5 font-semibold">Paket</th>
                        <th className="px-5 py-3.5 font-semibold">Masa Berlaku</th>
                        <th className="px-5 py-3.5 font-semibold">Nominal & Bayar</th>
                        <th className="px-5 py-3.5 font-semibold">Status</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Aksi</th>
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
                          <tr key={o.id} className="hover:bg-panel-low/40 transition-colors">
                            <td className="px-5 py-4">
                              <span className="font-mono text-[11px] text-ink font-medium block">{formatTgl(o.ts)}</span>
                              <span className="font-mono text-[10px] text-muted">{o.id}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-semibold text-ink block">{o.nama}</span>
                              {o.wa ? (
                                <a
                                  href={`https://wa.me/${o.wa.replace(/^0/, "62").replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-[11px] text-tertiary hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  <span>{o.wa}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="font-mono text-[10px] text-muted">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-semibold text-ink block">{o.paket_nama}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider border mt-1 ${
                                o.tier === "lifetime"
                                  ? "bg-primary/15 text-primary border-primary/25"
                                  : "bg-panel-high text-ink-dim border-edge"
                              }`}>
                                {o.tier}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-[11px]">
                              <span className="text-ink">{formatTgl(o.exp)}</span>
                              {isExpiringSoon && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  H-{Math.ceil((o.exp! - nowSec) / 86400)} kedaluwarsa
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-error font-bold mt-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                  Kedaluwarsa
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 font-mono">
                              <span className="font-bold text-ink block">{formatRp(o.harga)}</span>
                              <span className="text-[10px] text-muted">{o.metode || "QRIS"}</span>
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold border transition-colors ${
                                  o.status === "Lunas"
                                    ? "bg-tertiary/15 text-tertiary border-tertiary/30"
                                    : "bg-error/15 text-error border-error/30"
                                }`}
                              >
                                <option value="Lunas">Lunas</option>
                                <option value="Batal">Batal</option>
                                <option value="Refund">Refund</option>
                              </select>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {revealedIds.has(o.id) ? (
                                  <div className="max-w-[260px] rounded-xl border border-primary/25 bg-well px-2.5 py-2 text-left shadow-inner">
                                    <p className="font-mono text-[10px] leading-relaxed text-primary break-all select-all">{o.kode}</p>
                                  </div>
                                ) : (
                                  <span className="font-mono text-[10px] tracking-[0.18em] text-muted select-none">•••• •••• •••• ••••</span>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => toggleKode(o.id)}
                                    title={revealedIds.has(o.id) ? "Sembunyikan kode" : "Lihat kode lisensi"}
                                    className={`p-2 rounded-xl border transition-all shadow-sm ${revealedIds.has(o.id) ? "bg-primary/10 border-primary/25 text-primary" : "bg-panel-low border-edge/60 text-ink-dim hover:text-ink hover:bg-panel-high"}`}
                                    aria-label={revealedIds.has(o.id) ? "Sembunyikan kode lisensi" : "Lihat kode lisensi"}
                                  >
                                    {revealedIds.has(o.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => salinTeks(o.kode, o.id, "Kode lisensi disalin!")}
                                    title="Salin Kode Lisensi"
                                    className="p-2 rounded-xl bg-panel-low hover:bg-panel-high text-ink-dim hover:text-primary transition-all border border-edge/60 shadow-sm"
                                  >
                                    {copiedKey === o.id ? (
                                      <Check className="h-3.5 w-3.5 text-tertiary" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
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
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Template Pesan WhatsApp & SOP Sales</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Template praktis untuk membalas chat pembeli, follow up pembayaran QRIS, reminder H-7, dan penawaran upgrade lifetime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  id: "tpl-1",
                  judul: "1. Perkenalan & Pilihan Paket Lisensi",
                  keterangan: "Kirim saat ada prospek baru menanyakan harga atau cara beli.",
                  teks: `Halo kak! Selamat datang di Motion Easy 👋\n\nBerikut pilihan lisensi resmi Motion Easy Studio:\n1. 🌟 Paket Bulanan (30 Hari) — ${hargaRp(hargaLive.bulanan)}\n   ✓ Ekspor hingga 2K (1440p)\n   ✓ Fitur Bulk ZIP & Enlarge MB\n   ✓ Berlaku 30 hari\n\n2. 👑 Lifetime Pass (Akses Selamanya) — ${hargaRp(hargaLive.lifetime)} [Paling Hemat]\n   ✓ Ekspor maksimal Ultra HD 4K (2160p)\n   ✓ Fitur Bulk ZIP & Enlarge MB\n   ✓ Tanpa langganan, akses seumur hidup\n\nBoleh tahu tertarik paket yang mana kak? 😊`,
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
                  teks: `Halo kak! Semoga project motion graphics-nya lancar ya ✨\n\nKami ingin menginfokan bahwa lisensi bulanan Motion Easy kakak akan berakhir beberapa hari lagi.\n\nAgar ekspor high-res 2K dan fitur Bulk ZIP tidak terputus, kakak bisa perpanjang sekarang dengan harga tetap ${hargaRp(hargaLive.bulanan)}/30 hari, atau upgrade ke Lifetime Pass (${hargaRp(hargaLive.lifetime)}) untuk akses 4K selamanya.\n\nMau kami bantu proses sekarang kak? 😊`,
                },
                {
                  id: "tpl-5",
                  judul: "5. Penawaran Upgrade Khusus ke Lifetime Pass",
                  keterangan: "Upsell eksklusif bagi pengguna yang sudah merasakan manfaat paket bulanan.",
                  teks: `Halo kak! 🙌\n\nTerima kasih sudah aktif berkarya dengan Motion Easy! Khusus pengguna setia bulanan, hari ini kakak bisa upgrade ke *Lifetime Pass* dengan potongan spesial selisih harga!\n\nDengan Lifetime Pass:\n✓ Resolusi terbuka maksimal Ultra HD 4K (2160p)\n✓ Tidak perlu perpanjang bulanan lagi selamanya\n\nPenawaran ini terbatas ya kak. Mau kami terbitkan kode Lifetime-nya hari ini? 💎`,
                },
              ].map((tpl) => (
                <div key={tpl.id} className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 flex flex-col justify-between space-y-4 shadow-md hover:border-tertiary/40 transition-all group">
                  <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-tertiary/5 blur-xl pointer-events-none group-hover:bg-tertiary/15 transition-all" />
                  <div className="relative space-y-2">
                    <h3 className="font-bold text-sm text-ink group-hover:text-tertiary transition-colors">{tpl.judul}</h3>
                    <p className="text-[11px] text-muted">{tpl.keterangan}</p>
                    <div className="rounded-xl border border-edge bg-well/90 p-3.5 text-xs text-ink-dim whitespace-pre-wrap font-sans max-h-56 overflow-y-auto leading-relaxed shadow-inner">
                      {tpl.teks}
                    </div>
                  </div>
                  <button
                    onClick={() => salinTeks(tpl.teks, tpl.id, "Script template disalin!")}
                    className="relative w-full py-2.5 rounded-xl border border-edge bg-panel-low hover:bg-panel-high text-xs font-semibold text-ink flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-[1.01]"
                  >
                    {copiedKey === tpl.id ? <Check className="h-4 w-4 text-tertiary" /> : <Copy className="h-4 w-4" />}
                    <span>Salin Teks Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: TIM ADMIN (rata) */}
        {activeTab === "tim" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Tim Admin — rata (sederajat)</h2>
              <p className="text-xs text-ink-dim font-mono mt-1">Semua admin punya hak terbitkan lisensi / kelola paket. Owner (ADMIN_EMAILS) yang atur tim. Nonaktif/hapus → akses langsung terputus (tanpa tunggu 12 jam).</p>
            </div>
            {!isOwnerEnv && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-amber-700 leading-relaxed">Akun kamu (<b>{config?.email}</b>) statusnya Admin — bisa lihat daftar di bawah, tapi tombol tambah / nonaktifkan / hapus hanya untuk Owner ({timEnvOwners.join(", ")||"—"}). Minta Owner menambahkan tim.</span>
              </div>
            )}
            <div className="rounded-xl border border-edge/60 bg-panel p-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-ink-dim font-mono">Jika Google OAuth masih <b>Testing</b>: email tim juga harus masuk Google Cloud Console → OAuth consent screen → <b>Test users</b>. Kalau tidak, Google menolak login sebelum sampai ke panel (bukan salah panel).</p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-ink">Daftar Tim ({timRows.length} D1) + {timEnvOwners.length} Owner (secret)</h3>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-edge font-mono text-[10px] uppercase text-muted tracking-wider"><th className="px-3 py-2">Email</th><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Terakhir login</th><th className="px-3 py-2 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-edge/40">
                    {timEnvOwners.map((em)=> (
                      <tr key={"env:"+em} className="bg-tertiary/5">
                        <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-ink flex items-center gap-2 flex-wrap"><span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">Owner</span> {em} {timSelfEmail===em.toLowerCase() && <span className="text-tertiary">· kamu</span>}</td>
                        <td className="px-3 py-2.5 text-ink-dim">Owner (secret)</td>
                        <td className="px-3 py-2.5"><span className="rounded-full bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 text-[10px] font-bold text-tertiary">Aktif</span></td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-muted">bootstrap</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[10px] text-muted">—</td>
                      </tr>
                    ))}
                    {timRows.map((r)=> {
                      const self = r.email.toLowerCase()===timSelfEmail;
                      return (
                        <tr key={r.email} className={r.aktif?"" : "opacity-60 bg-error/5"}>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-ink break-all">{r.email} {self && <span className="text-tertiary">· kamu</span>}</td>
                          <td className="px-3 py-2.5 text-ink-dim">{r.nama || "—"}</td>
                          <td className="px-3 py-2.5">{r.aktif ? <span className="rounded-full bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 text-[10px] font-bold text-tertiary">Aktif</span> : <span className="rounded-full bg-error/10 border border-error/20 px-2 py-0.5 text-[10px] font-bold text-error">Nonaktif</span>}</td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{r.terakhir_login_ts ? formatTgl(r.terakhir_login_ts) : "—"}</td>
                          <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button onClick={()=>salinTeks(undanganWa(r.email, r.nama||r.email), "wa:"+r.email, "Undangan WA disalin!")} title="Salin undangan WA" className="p-1.5 rounded-lg border border-edge bg-panel-low text-ink-dim hover:text-tertiary hover:bg-tertiary/10"><MessageSquare className="h-3.5 w-3.5" /></button>
                            <button disabled={!isOwnerEnv || self} onClick={()=>handleToggleTim(r)} title={r.aktif ? "Nonaktifkan" : "Aktifkan"} className={`rounded-full px-2.5 py-1 text-[10px] font-bold border disabled:opacity-30 ${r.aktif ? "bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500/15" : "bg-tertiary/10 border-tertiary/20 text-tertiary hover:bg-tertiary/15"}`}>{r.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                            <button disabled={!isOwnerEnv || self} onClick={()=>handleRemoveTim(r.email)} title="Hapus" className="p-1.5 rounded-lg border border-error/20 bg-error/10 text-error hover:bg-error/15 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                    {timRows.length===0 && timEnvOwners.length>0 && (
                      <tr><td colSpan={5} className="px-3 py-4 text-center font-mono text-[11px] text-muted">Belum ada admin D1 — tambah di bawah.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {isOwnerEnv && (
              <form onSubmit={handleAddTim} className="rounded-2xl border border-edge/80 bg-panel p-5 space-y-3 shadow-sm">
                <h3 className="text-xs font-bold text-ink flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Tambah Admin Baru (rata)</h3>
                <p className="font-mono text-[11px] text-muted">Email wajib <b>akun Google asli</b> milik tim (verified). Setelah ditambah, suruh tim login di <code className="rounded bg-well px-1">/admin</code> pakai <b>Sign in with Google</b> dengan email itu.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="font-mono text-[10px] uppercase tracking-wider text-muted">Email Google *</label><input required type="email" value={timEmail} onChange={(e)=>setTimEmail(e.target.value)} placeholder="teman@gmail.com" className="mt-1 w-full rounded-xl border border-edge bg-well px-3 py-2.5 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none" /></div>
                  <div><label className="font-mono text-[10px] uppercase tracking-wider text-muted">Nama (opsional)</label><input value={timNama} onChange={(e)=>setTimNama(e.target.value)} placeholder="Budi" className="mt-1 w-full rounded-xl border border-edge bg-well px-3 py-2.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none" /></div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button disabled={timBusy || !timEmail.trim()} type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-bg hover:bg-accent disabled:opacity-40">
                    {timBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Tambah ke Tim
                  </button>
                  <button type="button" onClick={()=>{ setTimEmail(""); setTimNama(""); }} className="rounded-xl border border-edge px-3 py-2 text-xs font-mono text-muted hover:bg-panel-high">Bersihkan</button>
                  <span className="font-mono text-[10px] text-muted">Maks 10 · Owner hanya via secret (aman).</span>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 7: AUDIT & PENGATURAN */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Audit Log & Pengaturan Keamanan</h2>
              <p className="text-xs text-ink-dim font-mono mt-0.5">
                Mencatat seluruh aksi admin (login, terbitkan lisensi, perubahan paket) untuk transparansi dan audit forensik.
              </p>
            </div>

            {/* Aksi Keamanan: Keluar Semua Perangkat */}
            <div className="relative overflow-hidden rounded-2xl border border-error/30 bg-error/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-error/10 blur-2xl pointer-events-none" />
              <div className="relative">
                <h4 className="font-bold text-sm text-error flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Cabut Semua Sesi Aktif (Logout Semua Perangkat)
                </h4>
                <p className="text-xs text-ink-dim mt-1 max-w-xl leading-relaxed">
                  Menaikkan epoch sesi di database Cloudflare D1. Semua cookie sesi admin di perangkat mana pun akan langsung kedaluwarsa seketika.
                </p>
              </div>
              <button
                onClick={handleLogoutSemua}
                className="relative px-4 py-2.5 rounded-xl bg-error text-bg font-bold text-xs hover:bg-error/90 transition-all shadow-md hover:scale-[1.02] shrink-0"
              >
                Cabut Semua Sesi
              </button>
            </div>

            {/* Tabel Audit Log */}
            <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-panel p-5 space-y-4 shadow-md">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Riwayat Aktivitas Terakhir
              </h3>

              {auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted font-mono">
                  Belum ada catatan aktivitas admin.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-edge text-muted text-[10px] uppercase tracking-wider">
                        <th className="pb-2.5">Waktu</th>
                        <th className="pb-2.5">Admin / Pelaku</th>
                        <th className="pb-2.5">Aksi</th>
                        <th className="pb-2.5">Detail Perubahan</th>
                        <th className="pb-2.5">IP Asal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge/40">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-panel-low/40 transition-colors">
                          <td className="py-3 text-muted">{formatTgl(log.ts)}</td>
                          <td className="py-3 text-ink font-semibold">{log.email}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase">
                              {log.aksi}
                            </span>
                          </td>
                          <td className="py-3 text-ink-dim max-w-xs truncate">{log.detail}</td>
                          <td className="py-3 text-muted">{log.ip}</td>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-edge/80 bg-panel p-6 shadow-2xl relative animate-fade-in overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between pb-3.5 border-b border-edge/80">
              <h3 className="font-bold text-base text-ink flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>{editingPkgId ? "Edit Konfigurasi Paket" : "Buat Paket / Promo Baru"}</span>
              </h3>
              <button
                onClick={() => setPkgModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-panel-high text-muted hover:text-ink transition-colors border border-transparent hover:border-edge"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="relative mt-4 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                  Nama Paket *
                </label>
                <input
                  type="text"
                  required
                  value={pkgFormNama}
                  onChange={(e) => setPkgFormNama(e.target.value)}
                  placeholder="Misal: Promo Launching 90 Hari"
                  className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                    Tier Lisensi *
                  </label>
                  <select
                    disabled={!!editingPkgId}
                    value={pkgFormTier}
                    onChange={(e) => setPkgFormTier(e.target.value as any)}
                    className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink focus:border-primary focus:outline-none disabled:opacity-50 shadow-inner"
                  >
                    <option value="bulanan">Bulanan (Maks 2K)</option>
                    <option value="lifetime">Lifetime (Maks 4K)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                    Durasi (Hari)
                  </label>
                  <input
                    type="number"
                    disabled={pkgFormTier === "lifetime"}
                    value={pkgFormTier === "lifetime" ? "" : pkgFormDurasi}
                    onChange={(e) => setPkgFormDurasi(Number(e.target.value))}
                    placeholder={pkgFormTier === "lifetime" ? "Selamanya" : "30"}
                    className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                  Harga Resmi (Rupiah) *
                </label>
                <input
                  type="number"
                  required
                  value={pkgFormHarga}
                  onChange={(e) => setPkgFormHarga(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs font-mono text-ink placeholder:text-muted focus:border-primary focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-muted tracking-wider mb-1.5 font-semibold">
                  Catatan Internal / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={pkgFormCatatan}
                  onChange={(e) => setPkgFormCatatan(e.target.value)}
                  placeholder="Keterangan singkat paket..."
                  className="w-full rounded-xl border border-edge bg-well px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none shadow-inner"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPkgModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-edge text-xs text-ink-dim hover:text-ink transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPkg}
                  className="px-5 py-2.5 rounded-xl bg-primary text-bg font-bold text-xs hover:bg-accent transition-all duration-200 disabled:opacity-40 shadow-md hover:scale-[1.02]"
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
