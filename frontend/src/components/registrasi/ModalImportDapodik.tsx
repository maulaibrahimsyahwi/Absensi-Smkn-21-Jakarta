import React, { useState, useRef, useMemo, useId } from "react";
import {
  UploadCloud,
  Download,
  CheckCircle2,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import {
  downloadDapodikTemplate,
  parseDapodikFile,
  ParseDapodikResult,
} from "../../utils/dapodikUtils";
import api from "../../services/api";
import { Siswa } from "../../types/siswa";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "../ui/Sheet";
import Button from "../ui/Button";
import InlineAlert from "../ui/InlineAlert";
import { normalizeKelas } from "../../utils/kelas";

export interface ModalImportDapodikProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingSiswaList?: Siswa[];
}

const CHUNK = 200;

export default function ModalImportDapodik({
  isOpen,
  onClose,
  onSuccess,
  existingSiswaList = [],
}: ModalImportDapodikProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParseDapodikResult | null>(null);
  const [parseError, setParseError] = useState<string>("");
  const [updateExisting, setUpdateExisting] = useState<boolean>(false); // bawaan MATI
  const [importing, setImporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setParseError("");
    setImportResult(null);
    setProgress(0);
  };

  const handleFileChange = async (selectedFile?: File) => {
    if (!selectedFile) return;

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();
    if (!validExtensions.includes(ext)) {
      setParseError(
        "Format file tidak didukung. Mohon gunakan file .xlsx, .xls, atau .csv.",
      );
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
    } catch (err: any) {
      setParseError(err.message || "Gagal memproses file spreadsheet.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const existingByNis = useMemo(
    () => new Map(existingSiswaList.map((s) => [String(s.nis).trim(), s])),
    [existingSiswaList],
  );

  const diff = useMemo(() => {
    const d = { conflict: 0, changed: 0, kelasChanged: 0, fresh: 0 };
    for (const r of parsedData?.validRows ?? []) {
      const ex = existingByNis.get(String(r.nis).trim());
      if (!ex) {
        d.fresh++;
        continue;
      }
      d.conflict++;
      const kelasDiff =
        normalizeKelas(ex.kelas || "") !== normalizeKelas(r.kelas || "");
      if (kelasDiff) d.kelasChanged++;
      if (
        kelasDiff ||
        ex.nama !== r.nama ||
        (ex.jenis_kelamin || "") !== (r.jenis_kelamin || "")
      ) {
        d.changed++;
      }
    }
    return d;
  }, [parsedData, existingByNis]);

  const handleImportSubmit = async () => {
    if (!parsedData) return;
    const rows = parsedData.validRows;
    const total = { added: 0, updated: 0, skipped: 0 };
    let done = 0;
    setImporting(true);
    setParseError("");
    setProgress(0);

    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const res = await api.post("/siswa/batch_import", {
          students: chunk,
          update_existing: updateExisting,
        });

        if (!res.data?.success) {
          throw new Error(res.data?.message || "Gagal mengimpor data.");
        }

        total.added += res.data.stats?.added || 0;
        total.updated += res.data.stats?.updated || 0;
        total.skipped += res.data.stats?.skipped || 0;
        done = Math.min(rows.length, i + CHUNK);
        setProgress(done);
      }

      setImportResult({
        message: `${total.added} siswa baru ditambahkan, ${total.updated} data diperbarui, ${total.skipped} baris dilewati.`,
        stats: total,
      });
      onSuccess?.();
    } catch (err: any) {
      setParseError(
        `${err.response?.data?.message || err.message} ${done} dari ${rows.length} baris telah tersimpan.`,
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      tall
      labelledBy={titleId}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SheetHeader
          id={titleId}
          title="Import Data Siswa (Dapodik / Excel)"
          subtitle="Unggah master data siswa secara massal menggunakan file spreadsheet"
          onClose={onClose}
        />

        <SheetBody>
          <div className="space-y-4">
            {parseError && <InlineAlert type="error">{parseError}</InlineAlert>}

            {/* Template Download Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
              <div>
                <p className="font-bold text-xs sm:text-sm text-blue-950">
                  Format Template Spreadsheet Standar
                </p>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Kolom wajib: NIS, Nama, Kelas, Jenis Kelamin (L/P), dan NISN.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<Download className="h-4 w-4 text-blue-600" />}
                onClick={downloadDapodikTemplate}
              >
                Unduh Format Excel (.xlsx)
              </Button>
            </div>

            {/* Dropzone File Upload */}
            {!parsedData && !importResult && (
              <label
                htmlFor="dapodik-file"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all focus-within:ring-2 focus-within:ring-blue-500/30 ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <input
                  id="dapodik-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-blue-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                  {file ? file.name : "Klik atau seret file Excel/CSV ke sini"}
                </p>
                <p className="text-xs text-slate-400">
                  Mendukung file .xlsx, .xls, atau .csv (maksimal 5 MB)
                </p>
                {parsing && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Menganalisis isi data file...</span>
                  </div>
                )}
              </label>
            )}

            {/* Pratinjau Hasil Pembacaan File */}
            {parsedData && !importResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {file?.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {parsedData.validRows.length} baris valid siap diproses
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    disabled={importing}
                  >
                    Ganti File
                  </Button>
                </div>

                {/* Diff Conflict Card */}
                {diff.conflict > 0 && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 select-none">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs leading-relaxed text-slate-700">
                      <b className="block text-sm text-slate-900 font-bold mb-0.5">
                        Perbarui {diff.conflict} siswa yang NIS-nya sudah ada
                      </b>
                      {diff.changed} siswa memiliki perbedaan data dari sistem saat
                      ini ({diff.kelasChanged} siswa mengalami perubahan kelas).
                      Jika opsi ini tidak dicentang, baris data tersebut akan
                      dilewati.
                    </span>
                  </label>
                )}

                {/* Progress Bar */}
                {importing && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span>Mengunggah data ke server...</span>
                      <span>
                        {progress} / {parsedData.validRows.length}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{
                          width: `${
                            (progress /
                              (parsedData.validRows.length || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Ringkasan Baris Bermasalah jika ada */}
                {parsedData.invalidRows && parsedData.invalidRows.length > 0 && (
                  <details className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                    <summary className="cursor-pointer font-bold text-slate-800">
                      {parsedData.invalidRows.length} baris tidak valid dilewati
                      (klik untuk rincian)
                    </summary>
                    <ul className="mt-2.5 max-h-36 space-y-1 overflow-y-auto text-slate-600 font-mono text-[11px]">
                      {parsedData.invalidRows
                        .slice(0, 100)
                        .map((r: any, i: number) => (
                          <li key={i}>
                            Baris {r.row ?? r.rowNumber ?? i + 2}:{" "}
                            {String(r.reason ?? r.message ?? "format salah")}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {/* Hasil Sukses Impor */}
            {importResult && (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Impor Data Siswa Selesai
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  {importResult.message}
                </p>
                <div className="pt-2">
                  <Button variant="primary" onClick={onClose}>
                    Selesai & Tutup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            {importResult ? "Tutup" : "Batal"}
          </Button>
          {!importResult && parsedData && (
            <Button
              variant="primary"
              onClick={handleImportSubmit}
              loading={importing}
              disabled={parsedData.validRows.length === 0}
            >
              Impor {parsedData.validRows.length} Siswa
            </Button>
          )}
        </SheetFooter>
      </div>
    </Sheet>
  );
}
