import React from "react";
import { Link } from "react-router-dom";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xs ring-8 ring-indigo-50/50">
          <FileQuestion className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-slate-800 tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-xl font-bold text-slate-700 mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Tautan yang Anda tuju mungkin salah ketik, telah dihapus, atau sedang
          dipindahkan ke alamat lain.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Home className="w-4 h-4" /> Beranda Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
