import { Link } from "react-router-dom";
import { FolderOpen, CheckCircle2 } from "lucide-react";

export default function Proyek() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-panel">
          <FolderOpen className="h-8 w-8 text-edge" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Proyek Saya — Segera Hadir</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-dim">
          Fitur simpan &amp; muat ulang proyek animasi sedang disiapkan. Sementara
          itu, hasil kerjamu tetap lengkap: tiap animasi bisa langsung diekspor
          ke MP4 dari Studio.
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left">
          <li className="flex items-start gap-2 text-xs text-ink-dim">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" />
            <span>Preview realtime — tidak ada yang perlu disimpan</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-ink-dim">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" />
            <span>Export MP4 langsung dari Studio</span>
          </li>
          <li className="flex items-start gap-2 text-xs text-ink-dim">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" />
            <span>Simpan proyek &amp; aset menyusul di pembaruan berikutnya</span>
          </li>
        </ul>
        <Link
          to="/studio"
          className="mt-5 inline-flex rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-deep shadow"
        >
          Buka Studio
        </Link>
      </div>
    </div>
  );
}
