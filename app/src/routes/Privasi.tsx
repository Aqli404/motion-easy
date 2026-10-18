import { ShieldCheck, Lock, MessageCircle, Ban, FileCheck2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PAYMENT_LINKS } from "../config/konfig";

export default function Privasi() {
  const wa = PAYMENT_LINKS.whatsapp
    ? `https://wa.me/${PAYMENT_LINKS.whatsapp}`
    : "";

  const tidakDikumpulkan = [
    "Nama, email, atau nomor telepon — tidak pernah kita minta",
    "Akun / kata sandi — tidak ada sistem akun di aplikasi ini",
    "Cookie pelacak atau iklan — tidak ada",
    "Brief, prompt, atau hasil animasi — tidak pernah diunggah ke kami",
  ];

  const tersimpan = [
    "Kode lisensi (di browser pembeli, via localStorage) — bisa dihapus kapan pun lewat tombol \"Hapus Lisensi\" di menu Aktivasi",
    "Setelan tampilan kecil di beberapa halaman",
  ];

  const ketentuan = [
    "Kode lisensi bersifat personal. Setelah diterbitkan, kode tidak dapat dikembalikan uangnya (digital & mudah disalin).",
    "Premium aktif di browser tempat kode diaktifkan. Ganti browser/HP? Tempel kode yang sama lagi — simpan pesannya baik-baik.",
    "Menyebarluaskan kode ke orang lain tidak diperbolehkan; kami berhak berhenti menerbitkan kode untuk pembeli yang melanggar.",
    "Export MP4 hanya tersedia di Chrome & Edge desktop (WebCodecs). Browser lain tetap bisa melihat preview.",
    "Layanan diberikan apa adanya; fitur bisa berubah seiring waktu. Harga dapat berubah dengan pemberitahuan di halaman ini.",
    "Kode lisensi diverifikasi ECDSA di perangkat — aplikasi tidak memerlukan server untuk berjalan, dan tidak mengirim data animasimu ke mana pun.",
  ];

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h2 className="text-sm font-semibold">Privasi &amp; Ketentuan</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
            Diperbarui 18 Oktober 2026 · berlaku untuk motion-easy (workers.dev)
          </p>
        </div>

        {/* Ringkasan */}
        <div className="rounded-xl border border-secondary/50 bg-secondary/5 p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <ShieldCheck className="h-4 w-4" /> Ringkas dalam satu kalimat
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">
            Motion Easy bekerja sepenuhnya di perangkat pengguna: brief, prompt,
            animasi, dan video diproses di browser — <strong>kami tidak
            mengumpulkan data pribadi apa pun</strong>. Satu-satunya data yang
            tersimpan adalah kode lisensi di browser pembeli.
          </p>
        </div>

        {/* Yang tidak dikumpulkan */}
        <section className="rounded-xl border border-edge bg-panel-low p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <Ban className="h-4 w-4 text-error" /> Yang TIDAK kami kumpulkan
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-ink-dim">
            {tidakDikumpulkan.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Yang tersimpan */}
        <section className="rounded-xl border border-edge bg-panel-low p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <Lock className="h-4 w-4 text-primary" /> Yang tersimpan &amp; di mana
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-ink-dim">
            {tersimpan.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-well px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
            Menghapus data: menu Aktivasi Lisensi → "Hapus Lisensi Perangkat Ini",
            atau bersihkan data situs lewat pengaturan browser.
          </p>
        </section>

        {/* Alur AI */}
        <section className="rounded-xl border border-edge bg-panel-low p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <FileCheck2 className="h-4 w-4 text-tertiary" /> Tentang prompt &amp; AI
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">
            Alur AI bersifat <strong>Bawa-AI-sendiri</strong>: kamu menyalin prompt
            dari app ke layanan AI pilihanmu (ChatGPT / Gemini / Claude), lalu
            menempel balasannya. Kami tidak melihat, tidak menyimpan, dan tidak
            meneruskan teks prompt maupun keluaran AI. Video MP4 di-encode lokal via
            WebCodecs di perangkatmu.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Host situs ini adalah Cloudflare (Workers). Sebagai pemilik infrastruktur,
            Cloudflare mencatat permintaan teknis standar untuk anti-penyalahgunaan —
            kami tidak mengonsentrasikan atau menjual log tersebut.
          </p>
        </section>

        {/* Ketentuan */}
        <section className="rounded-xl border border-edge bg-panel-low p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <FileCheck2 className="h-4 w-4 text-secondary" /> Ketentuan penggunaan
          </h3>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-ink-dim">
            {ketentuan.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-muted">{i + 1}.</span>
                {t}
              </li>
            ))}
          </ol>
        </section>

        {/* Kontak */}
        <section className="rounded-xl border border-edge bg-panel-low p-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <MessageCircle className="h-4 w-4 text-tertiary" /> Kontak
          </h3>
          <p className="mt-2 text-xs text-ink-dim">
            Pertanyaan, saran, atau masalah teknis →{" "}
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="text-secondary underline">
                WhatsApp admin
              </a>
            ) : (
              <span className="text-muted">(nomor belum tersedia)</span>
            )}
            . Waktu balas umumnya di jam kerja Indonesia Barat.
          </p>
          <p className="mt-3 font-mono text-[10px] text-muted">
            Kembali ke halaman utama:{" "}
            <Link to="/" className="underline hover:text-muted">
              Beranda
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
