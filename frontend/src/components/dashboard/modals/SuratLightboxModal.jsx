import React from "react";
import { X } from "lucide-react";

export default function SuratLightboxModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Foto Surat Bukti {item.nama}
            </h3>
            <p className="text-[11px] text-slate-500">
              {item.jenis} • {item.tanggal_mulai} s/d {item.tanggal_selesai}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[200px] sm:min-h-[300px]">
          <img
            src={item.surat_bukti}
            alt="Foto Surat Keterangan"
            className="max-h-[55vh] sm:max-h-[70vh] object-contain rounded-lg shadow-sm"
          />
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
