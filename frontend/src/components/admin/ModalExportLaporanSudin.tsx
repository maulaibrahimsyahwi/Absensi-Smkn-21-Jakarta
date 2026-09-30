import React, { useState, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Loader2,
  Building2,
  AlertCircle,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";

interface SudinRekapPerKelas {
  kelas: string;
  total_siswa: number;
  hari_efektif: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total_absen: number;
  persentase_kehadiran: number | string;
}

interface SudinRingkasan {
  total_siswa: number;
  total_kelas: number;
  total_hadir: number;
  total_sakit: number;
  total_izin: number;
  total_alpa: number;
  total_absen: number;
  persentase_kehadiran: number | string;
}

interface SudinMeta {
  pemerintah: string;
  dinas: string;
  sudin: string;
  sekolah: string;
  npsn: string;
  alamat: string;
  nama_bulan: string;
  tahun: number;
  hari_efektif: number;
}

interface SudinResponse {
  success: boolean;
  meta: SudinMeta;
  ringkasan_sekolah: SudinRingkasan;
  rekap_per_kelas: SudinRekapPerKelas[];
  message?: string;
}

interface ModalExportLaporanSudinProps {
  isOpen: boolean;
  onClose: () => void;
}

const BULAN_OPTIONS = [
  { val: 1, label: "Januari" },
  { val: 2, label: "Februari" },
  { val: 3, label: "Maret" },
  { val: 4, label: "April" },
  { val: 5, label: "Mei" },
  { val: 6, label: "Juni" },
  { val: 7, label: "Juli" },
  { val: 8, label: "Agustus" },
  { val: 9, label: "September" },
  { val: 10, label: "Oktober" },
  { val: 11, label: "November" },
  { val: 12, label: "Desember" },
];

export default function ModalExportLaporanSudin({
  isOpen,
  onClose,
}: ModalExportLaporanSudinProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [bulan, setBulan] = useState(currentMonth);
  const [tahun, setTahun] = useState(currentYear);
  const [hariEfektif, setHariEfektif] = useState(22);
  const [kepalaSekolah, setKepalaSekolah] = useState("Drs. H. Supriyadi, M.Pd.");
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState(
    "19680512 199403 1 005",
  );
  const [namaPetugas, setNamaPetugas] = useState("Pengelola Presensi SMKN 21");

  const [data, setData] = useState<SudinResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get<SudinResponse>("/rekap/laporan_sudin", {
        params: {
          bulan,
          tahun,
          hari_efektif: hariEfektif,
        },
      });
      if (res.data?.success) {
        setData(res.data);
      } else {
        setErrorMsg(res.data?.message || "Gagal memuat rekap bulanan Sudin.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan saat memuat data laporan Sudin.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, bulan, tahun, hariEfektif]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (!data?.rekap_per_kelas) return;
    setExporting(true);
    try {
      const meta = data.meta;
      const rekap = data.rekap_per_kelas;
      const summary = data.ringkasan_sekolah;

      const aoaData: (string | number)[][] = [
        [meta.pemerintah],
        [meta.dinas],
        [meta.sudin],
        [meta.sekolah],
        [`NPSN: ${meta.npsn} | Alamat: ${meta.alamat}`],
        [],
        ["LAPORAN REKAPITULASI KEHADIRAN PESERTA DIDIK BULANAN"],
        [
          `Periode: Bulan ${meta.nama_bulan} ${meta.tahun} | Hari Efektif Belajar (HEB): ${meta.hari_efektif} Hari`,
        ],
        [],
        [
          "No",
          "Kelas / Konsentrasi Keahlian",
          "Jumlah Siswa",
          "Hari Efektif",
          "Hadir (H)",
          "Sakit (S)",
          "Izin (I)",
          "Alpa (A)",
          "Total Absen (S+I+A)",
          "Persentase Kehadiran (%)",
        ],
      ];

      rekap.forEach((item, idx) => {
        aoaData.push([
          idx + 1,
          item.kelas,
          item.total_siswa,
          item.hari_efektif,
          item.hadir,
          item.sakit,
          item.izin,
          item.alpa,
          item.total_absen,
          `${item.persentase_kehadiran}%`,
        ]);
      });

      // Total Row
      aoaData.push([
        "",
        "TOTAL / RATA-RATA KESELURUHAN",
        summary.total_siswa,
        meta.hari_efektif,
        summary.total_hadir,
        summary.total_sakit,
        summary.total_izin,
        summary.total_alpa,
        summary.total_absen,
        `${summary.persentase_kehadiran}%`,
      ]);

      // Signatures
      aoaData.push([]);
      aoaData.push([]);
      aoaData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Jakarta, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
      ]);
      aoaData.push([
        "",
        "Mengetahui,",
        "",
        "",
        "",
        "",
        "",
        "Petugas Pengelola Presensi,",
      ]);
      aoaData.push(["", "Kepala SMK Negeri 21 Jakarta", "", "", "", "", "", ""]);
      aoaData.push([]);
      aoaData.push([]);
      aoaData.push([]);
      aoaData.push([
        "",
        kepalaSekolah,
        "",
        "",
        "",
        "",
        "",
        namaPetugas,
      ]);
      aoaData.push([
        "",
        `NIP. ${nipKepalaSekolah}`,
        "",
        "",
        "",
        "",
        "",
        "SMK Negeri 21 Jakarta",
      ]);

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 24 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Sudin_${meta.nama_bulan}_${meta.tahun}`);
      XLSX.writeFile(
        wb,
        `Laporan_Bulanan_Sudin_Disdik_${meta.nama_bulan}_${meta.tahun}_SMKN21.xlsx`,
      );
    } catch (err: unknown) {
      console.error("Gagal mengekspor Excel:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Gagal membuat berkas Excel: " + msg);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!data?.rekap_per_kelas) return;
    setExporting(true);
    try {
      const meta = data.meta;
      const rekap = data.rekap_per_kelas;
      const summary = data.ringkasan_sekolah;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Kop Surat Resmi Pemprov DKI & Sudin Disdik
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(meta.pemerintah, pageWidth / 2, 13, { align: "center" });

      doc.setFontSize(13);
      doc.text(meta.dinas, pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(11);
      doc.text(meta.sudin, pageWidth / 2, 23, { align: "center" });

      doc.setFontSize(14);
      doc.text(meta.sekolah, pageWidth / 2, 28, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `NPSN: ${meta.npsn} | ${meta.alamat}`,
        pageWidth / 2,
        33,
        { align: "center" },
      );

      // Garis Ganda Pemisah Kop
      doc.setLineWidth(0.8);
      doc.setDrawColor(20, 20, 20);
      doc.line(14, 36, pageWidth - 14, 36);
      doc.setLineWidth(0.2);
      doc.line(14, 37.2, pageWidth - 14, 37.2);

      // Judul Laporan
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(
        "LAPORAN BULANAN REKAPITULASI KEHADIRAN PESERTA DIDIK",
        pageWidth / 2,
        44,
        { align: "center" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        `Periode: Bulan ${meta.nama_bulan} ${meta.tahun}  |  Hari Efektif Belajar (HEB): ${meta.hari_efektif} Hari`,
        pageWidth / 2,
        49,
        { align: "center" },
      );

      // Table headers & rows
      const tableHeaders = [
        "No",
        "Kelas / Konsentrasi Keahlian",
        "Siswa",
        "HEB",
        "Hadir (H)",
        "Sakit (S)",
        "Izin (I)",
        "Alpa (A)",
        "Total Absen",
        "% Hadir",
      ];

      const tableRows: (string | number)[][] = rekap.map((item, idx) => [
        idx + 1,
        item.kelas,
        item.total_siswa,
        item.hari_efektif,
        item.hadir,
        item.sakit,
        item.izin,
        item.alpa,
        item.total_absen,
        `${item.persentase_kehadiran}%`,
      ]);

      // Baris Total
      tableRows.push([
        "",
        "TOTAL / RATA-RATA",
        summary.total_siswa,
        meta.hari_efektif,
        summary.total_hadir,
        summary.total_sakit,
        summary.total_izin,
        summary.total_alpa,
        summary.total_absen,
        `${summary.persentase_kehadiran}%`,
      ]);

      autoTable(doc, {
        startY: 53,
        head: [tableHeaders],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 138], // Navy Blue Sudin
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "center",
          valign: "middle",
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", fontStyle: "bold" },
          2: { halign: "center", cellWidth: 16 },
          3: { halign: "center", cellWidth: 14 },
          4: { halign: "center", cellWidth: 20 },
          5: { halign: "center", cellWidth: 18 },
          6: { halign: "center", cellWidth: 18 },
          7: { halign: "center", cellWidth: 18 },
          8: { halign: "center", cellWidth: 22 },
          9: { halign: "center", fontStyle: "bold", cellWidth: 22 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, bottom: 45 },
      });

      // Sign-off block
      const lastTableFinalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 53;
      const finalY = lastTableFinalY + 8;
      const pageHeight = doc.internal.pageSize.getHeight();
      const signY = finalY > pageHeight - 35 ? 15 : finalY;
      if (finalY > pageHeight - 35) {
        doc.addPage();
      }

      const tglStr = `Jakarta, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);

      // Kiri: Kepala Sekolah
      doc.text("Mengetahui,", 25, signY);
      doc.text("Kepala SMK Negeri 21 Jakarta", 25, signY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(kepalaSekolah, 25, signY + 22);
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${nipKepalaSekolah}`, 25, signY + 26);

      // Kanan: Petugas Presensi
      doc.text(tglStr, pageWidth - 80, signY);
      doc.text("Pengelola Sistem Presensi,", pageWidth - 80, signY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(namaPetugas, pageWidth - 80, signY + 22);
      doc.setFont("helvetica", "normal");
      doc.text("SMK Negeri 21 Jakarta", pageWidth - 80, signY + 26);

      doc.save(
        `Laporan_Bulanan_Sudin_Disdik_${meta.nama_bulan}_${meta.tahun}_SMKN21.pdf`,
      );
    } catch (err: unknown) {
      console.error("Gagal mengekspor PDF:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Gagal membuat dokumen PDF: " + msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Ekspor Laporan Bulanan Standar Sudin Disdik DKI
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Format Rekapitulasi Suku Dinas Pendidikan Wilayah II Jakarta Pusat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pengaturan Parameter Laporan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bulan Pelaporan
              </label>
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {BULAN_OPTIONS.map((b) => (
                  <option key={b.val} value={b.val}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tahun
              </label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Hari Efektif (HEB)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={hariEfektif}
                onChange={(e) => setHariEfektif(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kepala Sekolah
              </label>
              <input
                type="text"
                value={kepalaSekolah}
                onChange={(e) => setKepalaSekolah(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ringkasan Angka Sekolah */}
          {data?.ringkasan_sekolah && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">
                  Total Siswa Terdata
                </span>
                <p className="text-xl font-black text-blue-900 mt-0.5">
                  {data.ringkasan_sekolah.total_siswa}
                </p>
                <p className="text-[10px] text-blue-600 truncate">
                  {data.ringkasan_sekolah.total_kelas} Rombongan Belajar
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  Total Hadir (H)
                </span>
                <p className="text-xl font-black text-emerald-900 mt-0.5">
                  {data.ringkasan_sekolah.total_hadir}
                </p>
                <p className="text-[10px] text-emerald-600 truncate">
                  Termasuk PJJ / PKL
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">
                  Total Absen (S+I+A)
                </span>
                <p className="text-xl font-black text-amber-900 mt-0.5">
                  {data.ringkasan_sekolah.total_absen}
                </p>
                <p className="text-[10px] text-amber-700 truncate">
                  S:{data.ringkasan_sekolah.total_sakit} I:
                  {data.ringkasan_sekolah.total_izin} A:
                  {data.ringkasan_sekolah.total_alpa}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                  % Kehadiran Sekolah
                </span>
                <p className="text-xl font-black text-indigo-900 mt-0.5">
                  {data.ringkasan_sekolah.persentase_kehadiran}%
                </p>
                <p className="text-[10px] text-indigo-600 truncate">
                  Standar Sudin &gt; 95%
                </p>
              </div>
            </div>
          )}

          {/* Pratinjau Tabel Per Kelas */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Pratinjau Matriks Kehadiran Per Kelas
              </span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>

            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-center w-8">No</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-2 py-2 text-center">Siswa</th>
                    <th className="px-2 py-2 text-center">Hadir</th>
                    <th className="px-2 py-2 text-center">Sakit</th>
                    <th className="px-2 py-2 text-center">Izin</th>
                    <th className="px-2 py-2 text-center">Alpa</th>
                    <th className="px-2 py-2 text-center font-bold">Absen</th>
                    <th className="px-3 py-2 text-center font-bold">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.rekap_per_kelas?.map((item, idx) => (
                    <tr key={item.kelas} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1.5 font-bold text-slate-800">
                        {item.kelas}
                      </td>
                      <td className="px-2 py-1.5 text-center">{item.total_siswa}</td>
                      <td className="px-2 py-1.5 text-center text-emerald-700 font-semibold">
                        {item.hadir}
                      </td>
                      <td className="px-2 py-1.5 text-center text-blue-600">
                        {item.sakit}
                      </td>
                      <td className="px-2 py-1.5 text-center text-amber-600">
                        {item.izin}
                      </td>
                      <td className="px-2 py-1.5 text-center text-rose-600">
                        {item.alpa}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold text-slate-700">
                        {item.total_absen}
                      </td>
                      <td className="px-3 py-1.5 text-center font-bold text-indigo-700">
                        {item.persentase_kehadiran}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              Dokumen telah dilengkapi Kop Surat Resmi DKI Jakarta & format baku Sudin.
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                disabled={loading || exporting || !data?.rekap_per_kelas}
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                disabled={loading || exporting || !data?.rekap_per_kelas}
                onClick={handleExportPDF}
                className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh PDF Resmi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
