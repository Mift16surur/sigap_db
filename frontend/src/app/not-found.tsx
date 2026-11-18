import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-500 mb-4">Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
