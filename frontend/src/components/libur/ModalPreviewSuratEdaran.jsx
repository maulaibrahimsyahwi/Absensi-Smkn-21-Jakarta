import React from "react";
import { X, ExternalLink, FileText, Download } from "lucide-react";

export default function ModalPreviewSuratEdaran({
  isOpen,
  onClose,
  suratData,
}) {
  if (!isOpen || !suratData) return null;

  const url = suratData.lampiran_surat || suratData.url || "";
  const nama = suratData.nama || suratData.judul || "Surat Edaran Resmi";
  const namaFile =
    suratData.nama_file_surat || suratData.filename || "Dokumen Lampiran";
  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Preview */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">
                {nama}
              </h3>
              <p className="text-xs text-purple-200 truncate">{namaFile}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Buka dokumen di jendela baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buka</span>
              </a>
            )}
            {url && (
              <a
                href={url}
                download
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[380px]">
          {isPdf ? (
            <iframe
              src={url}
              title={nama}
              className="w-full h-[65vh] rounded-2xl border border-slate-200 bg-white shadow-xs"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full max-h-[70vh] p-2">
              <img
                src={url}
                alt={nama}
                className="max-w-full max-h-[68vh] rounded-2xl object-contain shadow-md border border-slate-200"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
