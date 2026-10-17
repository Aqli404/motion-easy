import { Link } from "react-router-dom";
import { FolderOpen } from "lucide-react";

export default function Proyek() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-panel">
          <FolderOpen className="h-8 w-8 text-edge" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Belum Ada Proyek</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Proyek yang kamu buat di Studio akan tersimpan di browser — Fase 6.
        </p>
        <Link
          to="/studio"
          className="mt-5 inline-flex rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-deep shadow"
        >
          Tulis Prompt Pertama
        </Link>
      </div>
    </div>
  );
}
