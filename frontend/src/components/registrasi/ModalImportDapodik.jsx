import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  FileCheck,
  Check,
  Info,
} from "lucide-react";
import { downloadDapodikTemplate, parseDapodikFile } from "../../utils/dapodikUtils";
import api from "../../services/api";

export default function ModalImportDapodik({
  isOpen,
  onClose,
  onSuccess,
  existingSiswaList = [],
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setParseError("Format file tidak didukung. Mohon gunakan file .xlsx, .xls, atau .csv.");
      return;
    }

    setFile(selectedFile);
    setParseError("");
    setParsedData(null);
    setImportResult(null);
    setParsing(true);

    try {
      const result = await parseDapodikFile(selectedFile);
      setParsedData(result);
    } catch (err) {
      setParseError(err.message || "Gagal memproses file spreadsheet.");
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setParseError("");
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportSubmit = async () => {
    if (!parsedData || parsedData.validRows.length === 0) return;

    setImporting(true);
    setParseError("");

    try {
      const payload = {
        students: parsedData.validRows,
        update_existing: updateExisting,
      };

      const res = await api.post("/siswa/batch_import", payload);

      if (res.data && res.data.success) {
        setImportResult(res.data);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setParseError(res.data?.message || "Gagal mengimpor data ke server.");
      }
    } catch (err) {
      setParseError(
        err.response?.data?.message || "Terjadi kesalahan jaringan saat proses import.",
      );
    } finally {
      setImporting(false);
    }
  };

  // Hitung jumlah siswa yang NIS-nya sudah ada di database saat ini
  const existingNisSet = new Set(existingSiswaList.map((s) => String(s.nis).trim()));
  const conflictCount = parsedData
    ? parsedData.validRows.filter((r) => existingNisSet.has(String(r.nis).trim())).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Import Data Siswa Dapodik
              </h3>
              <p className="text-xs text-slate-500">
                Unggah file Excel atau CSV berstandar Dapodik untuk pendaftaran massal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700">
          {/* Download Template Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-start sm:items-center gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Belum memiliki format? </span>
                <span className="text-slate-500">
                  Gunakan template standar dengan kolom NIS, Nama Lengkap, Kelas, dan Jenis Kelamin.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadDapodikTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template</span>
            </button>
          </div>

          {/* Area Upload File / Drag and Drop */}
          {!file && !importResult && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 mx-auto flex items-center justify-center mb-3 shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Pilih atau Tarik File Spreadsheet ke Sini
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV (.csv) hasil ekspor Dapodik
              </p>
              <span className="inline-block px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors">
                Jelajahi File
              </span>
            </div>
          )}

          {/* Loading Parsing */}
          {parsing && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Membaca dan memvalidasi lembar kerja...
              </p>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Kendala Pemrosesan</p>
                <p className="mt-0.5 text-rose-600">{parseError}</p>
              </div>
            </div>
          )}

          {/* File Terpilih & Preview Data */}
          {parsedData && !importResult && (
            <div className="space-y-3">
              {/* File Info Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {file?.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(file?.size ? (file.size / 1024).toFixed(1) : 0)} KB &bull;{" "}
                      {parsedData.totalDetected} baris terdeteksi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Ganti File
                </button>
              </div>

              {/* Status Ringkasan */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                  <span className="text-slate-500 text-[11px] block">Siap Diimpor</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {parsedData.validRows.length} Siswa
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <span className="text-slate-500 text-[11px] block">Sudah Ada di Sistem</span>
                  <span className="text-base font-extrabold text-amber-700">
                    {conflictCount} Siswa
                  </span>
                </div>
                <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[11px] block">Baris Dilewati/Error</span>
                  <span className="text-base font-extrabold text-slate-700">
                    {parsedData.invalidRows.length} Baris
                  </span>
                </div>
              </div>

              {/* Opsi Perbarui Data */}
              {conflictCount > 0 && (
                <label className="flex items-start gap-2.5 p-3 bg-amber-50/40 border border-amber-200/70 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">
                      Perbarui data jika NIS sudah terdaftar ({conflictCount} siswa)
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Jika dicentang, nama, kelas, dan jenis kelamin siswa yang sudah ada akan disinkronkan dengan data file terbaru tanpa menghapus riwayat presensi.
                    </p>
                  </div>
                </label>
              )}

              {/* Pratinjau Tabel (Maksimal 6 Baris Pertama) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">
                    Pratinjau Data (Contoh Baris Teratas)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Menampilkan {Math.min(parsedData.validRows.length, 6)} dari {parsedData.validRows.length} data
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">NIS</th>
                          <th className="px-3 py-2">Nama Lengkap</th>
                          <th className="px-3 py-2">Kelas</th>
                          <th className="px-3 py-2">Jenis Kelamin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.validRows.slice(0, 6).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono text-slate-700">{item.nis}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{item.nama}</td>
                            <td className="px-3 py-2 font-bold text-slate-700">{item.kelas}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.jenis_kelamin === "Perempuan"
                                    ? "bg-pink-50 text-pink-700 border border-pink-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {item.jenis_kelamin === "Perempuan" ? "Siswi" : "Siswa"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tampilan Hasil Sukses Import */}
          {importResult && (
            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900">
                  Import Data Berhasil!
                </h4>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  {importResult.message}
                </p>
              </div>

              {/* Rincian Angka */}
              <div className="grid grid-cols-3 gap-2 pt-2 max-w-sm mx-auto text-xs">
                <div className="p-2.5 bg-white border border-emerald-200/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Ditambahkan</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {importResult.stats?.added || 0}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Diperbarui</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {importResult.stats?.updated || 0}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-emerald-200/80 rounded-xl">
                  <span className="text-slate-400 text-[10px] block">Dilewati</span>
                  <span className="text-base font-extrabold text-slate-600">
                    {importResult.stats?.skipped || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Aksi Modal */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {importResult ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Selesai & Tutup
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!parsedData || parsedData.validRows.length === 0 || importing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Import {parsedData ? `${parsedData.validRows.length} Siswa` : "Data"}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
