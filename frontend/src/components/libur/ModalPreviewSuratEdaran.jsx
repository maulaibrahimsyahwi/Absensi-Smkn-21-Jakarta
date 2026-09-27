import React from "react";
import {
  FileText,
  Download,
  ExternalLink,
  X,
  Calendar,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

export default function ModalPreviewSuratEdaran({
  isOpen,
  onClose,
  suratData,
}) {
  if (!isOpen || !suratData || !suratData.lampiran_surat) return null;

  const isPdf =
    suratData.lampiran_surat.startsWith("data:application/pdf") ||
    suratData.nama_file_surat?.toLowerCase().endsWith(".pdf");

  const isImage =
    suratData.lampiran_surat.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp)$/i.test(suratData.nama_file_surat || "");

  const handleDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = suratData.lampiran_surat;
      link.download =
        suratData.nama_file_surat ||
        `Surat_Edaran_${suratData.nama?.replace(/\s+/g, "_") || "SMKN21"}.${isPdf ? "pdf" : "png"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Gagal mengunduh dokumen:", err);
    }
  };

  const handleOpenNewTab = () => {
    try {
      const win = window.open();
      if (win) {
        if (isPdf) {
          win.document.write(
            `<iframe src="${suratData.lampiran_surat}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
          );
        } else {
          win.document.write(
            `<img src="${suratData.lampiran_surat}" style="max-width:100%; height:auto; display:block; margin:auto;" />`,
          );
        }
        win.document.title = suratData.nama || "Surat Edaran Resmi";
      }
    } catch (err) {
      console.error("Gagal membuka tab baru:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-purple-300 shrink-0">
              <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  Surat Edaran Resmi
                </span>
                {suratData.tipe_hari === "masuk_khusus" ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Wajib Hadir
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Sekolah Libur
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight truncate mt-0.5">
                {suratData.nama || "Dokumen Surat Edaran"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Buka Dokumen di Tab Baru"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Unduh Berkas Surat Edaran"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Tutup Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Info Tanggal & Keterangan */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-semibold">
              Masa Berlaku:{" "}
              {suratData.tanggal_mulai === suratData.tanggal_selesai
                ? suratData.tanggal_mulai
                : `${suratData.tanggal_mulai} s/d ${suratData.tanggal_selesai}`}
            </span>
          </div>
          {suratData.nama_file_surat && (
            <span className="text-[11px] font-mono text-slate-500 truncate">
              Berkas: {suratData.nama_file_surat}
            </span>
          )}
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <div className="w-full h-full min-h-[60vh] flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-inner">
              <iframe
                src={suratData.lampiran_surat}
                title={suratData.nama || "Surat Edaran PDF"}
                className="w-full flex-1 min-h-[60vh]"
              />
            </div>
          ) : isImage ? (
            <div className="max-w-full max-h-[70vh] flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <img
                src={suratData.lampiran_surat}
                alt={suratData.nama || "Foto Surat Edaran"}
                className="max-h-[65vh] w-auto object-contain rounded-xl select-auto"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-3 bg-white rounded-2xl border border-slate-200 max-w-md">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Format Berkas Tidak Dapat Ditampilkan Langsung
              </p>
              <p className="text-xs text-slate-500">
                Silakan unduh dokumen untuk melihat isi surat edaran lengkap di
                perangkat Anda.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Dokumen</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 truncate hidden sm:block">
            Dokumen resmi SMKN 21 Jakarta &bull; Disdik Provinsi DKI Jakarta
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Berkas</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
