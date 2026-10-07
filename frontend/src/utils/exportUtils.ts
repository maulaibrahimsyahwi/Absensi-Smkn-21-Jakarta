import { nowWib } from "./date";
import { SCHOOL_PROFILE } from "../constants/schoolProfile";
import { getStatusPembinaan } from "../data/pelanggaranData";

export interface PeriodeInfo {
  periodeMode?: string;
  namaBulanTerpilih?: string;
  selectedTahun?: string | number;
}

export interface ExportDatasets {
  filteredSiswa?: Array<Record<string, any>>;
  filteredHarian?: Array<Record<string, any>>;
  filteredPerpus?: Array<Record<string, any>>;
  filteredPengajuan?: Array<Record<string, any>>;
  filteredIzinPiket?: Array<Record<string, any>>;
  filteredPelanggaran?: Array<Record<string, any>>;
  records?: Array<Record<string, any>>;
  stafList?: Array<Record<string, any>>;
  [key: string]: any;
}

/**
 * Sanitizer pencegah CSV Formula Injection (Excel command execution)
 */
export const csvSafe = (val: unknown): string | number => {
  if (typeof val === "number") return val;
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^([=+@\t\r]|-.)/.test(str)) {
    return `'${str}`;
  }
  return str;
};

/**
 * Helper penomoran halaman akurat setelah seluruh halaman tabel digambar oleh jsPDF
 */
const addPageNumbers = (
  doc: any,
  label = "Sistem Absensi SMKN 21 Jakarta",
): void => {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `${label} - Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }
};

/**
 * Utilitas ekspor data rekapitulasi ke format spreadsheet (XLSX, XLS, atau CSV).
 * Menggunakan dynamic import XLSX untuk menghemat ukuran bundle awal.
 */
export async function exportSpreadsheet(
  format = "xlsx",
  activeTab: string,
  datasets: ExportDatasets,
  periodeInfo: PeriodeInfo,
): Promise<void> {
  const {
    filteredSiswa = [],
    filteredHarian = [],
    filteredPerpus = [],
    filteredPengajuan = [],
    filteredIzinPiket = [],
  } = datasets;
  const { periodeMode, namaBulanTerpilih, selectedTahun } = periodeInfo;

  let headers: string[] = [];
  let rows: Array<Array<string | number>> = [];
  const periodeTag =
    periodeMode === "bulan"
      ? `${namaBulanTerpilih}_${selectedTahun}`
      : `Tahun_${selectedTahun}`;
  let filename = "";
  let sheetName = "Rekap Data";

  if (activeTab === "rekap_siswa") {
    sheetName = "Rekap Siswa";
    filename = `rekap_kehadiran_${periodeTag}`;
    headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Tepat Waktu",
      "Terlambat",
      "Sakit",
      "Izin",
      "Alpa",
      "Total Hadir",
      "Kunjungan Perpus",
      "Status Aktivitas",
    ];
    rows = filteredSiswa.map((item, index) => [
      index + 1,
      item.nis,
      item.nama,
      item.kelas,
      item.tepat_waktu,
      item.terlambat,
      item.sakit || 0,
      item.izin || 0,
      item.alpa || 0,
      item.total_hadir,
      item.kunjungan_perpus,
      item.total_hadir > 0 ? "Aktif Presensi" : "Nir-Kehadiran",
    ]);
  } else if (activeTab === "riwayat_harian") {
    sheetName = "Presensi Harian";
    filename = `riwayat_presensi_harian_${periodeTag}`;
    headers = [
      "No",
      "Waktu Presensi",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Status Kehadiran",
    ];
    rows = filteredHarian.map((item, index) => [
      index + 1,
      item.waktu,
      item.nis || "-",
      item.nama,
      item.kelas,
      item.status,
    ]);
  } else if (activeTab === "riwayat_perpus") {
    sheetName = "Kunjungan Perpus";
    filename = `riwayat_perpustakaan_${periodeTag}`;
    headers = [
      "No",
      "Waktu Kunjungan",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Keperluan Kunjungan",
    ];
    rows = filteredPerpus.map((item, index) => [
      index + 1,
      item.waktu,
      item.nis || "-",
      item.nama,
      item.kelas,
      item.keperluan,
    ]);
  } else if (activeTab === "verifikasi_izin") {
    sheetName = "Verifikasi Izin";
    filename = `pengajuan_izin_sakit_${periodeTag}`;
    headers = [
      "No",
      "Waktu Pengajuan",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Jenis",
      "Tanggal Mulai",
      "Tanggal Selesai",
      "Alasan",
      "Status Verifikasi",
      "Catatan Guru",
      "Latitude",
      "Longitude",
      "Tautan Google Maps",
    ];
    rows = filteredPengajuan.map((item, index) => [
      index + 1,
      item.created_at,
      item.nis,
      item.nama,
      item.kelas,
      item.jenis,
      item.tanggal_mulai,
      item.tanggal_selesai,
      item.alasan,
      item.status_pengajuan,
      item.catatan_guru || "-",
      item.latitude || "-",
      item.longitude || "-",
      item.latitude && item.longitude
        ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
        : "-",
    ]);
  } else if (activeTab === "izin_piket") {
    sheetName = "Izin Meja Piket";
    filename = `izin_meja_piket_${periodeTag}`;
    headers = [
      "No",
      "Waktu Diterbitkan",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Keperluan",
      "Jam Ke-",
      "Hari",
      "Tanggal",
      "Alasan",
      "Petugas Piket",
    ];
    rows = filteredIzinPiket.map((item, index) => [
      index + 1,
      item.created_at,
      item.nis,
      item.nama,
      item.kelas,
      item.tipe,
      item.jam_ke,
      item.hari,
      item.tanggal_formatted || item.tanggal,
      item.alasan,
      item.petugas_piket,
    ]);
  } else if (activeTab === "pelanggaran_siswa") {
    sheetName = "Catatan Pelanggaran";
    filename = `buku_catatan_pelanggaran_${periodeTag}`;
    headers = [
      "No",
      "Waktu Kejadian",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Kategori",
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    const rawList = datasets.filteredPelanggaran || datasets.records || [];
    const dataList = rawList.filter(
      (item) =>
        item.status_verifikasi !== "Menunggu Konfirmasi" &&
        item.status !== "Menunggu Konfirmasi",
    );
    rows = dataList.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted || item.tanggal_waktu,
      item.nis,
      item.nama_siswa || item.nama,
      item.kelas,
      item.kategori || "Pelanggaran",
      item.jenis_pelanggaran,
      item.poin,
      item.nama_penanggung_jawab || "-",
      item.keterangan || "-",
    ]);
  } else if (activeTab === "manajemen_piket") {
    sheetName = "Daftar Staf";
    filename = `daftar_staf_guru_piket_${periodeTag}`;
    headers = [
      "No",
      "Username",
      "Nama Lengkap",
      "Role / Wewenang",
      "Tanda Tangan Digital",
    ];
    const staf = datasets.stafList || [];
    rows = staf.map((item, index) => [
      index + 1,
      item.username,
      item.nama,
      item.role === "admin" ? "Administrator" : "Guru Piket",
      item.has_signature ? "Tersedia" : "Belum Ada",
    ]);
  }

  try {
    const XLSX = await import("xlsx");
    const sanitizedRows =
      format === "csv"
        ? rows.map((r) => r.map((c) => csvSafe(c)))
        : rows;
    const worksheetData = [headers, ...sanitizedRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-width kolom agar tampilan di Microsoft Excel rapi
    const colWidths = headers.map((h, colIdx) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[colIdx] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const bookType = (format === "xls" ? "biff8" : format) as any;
    XLSX.writeFile(workbook, `${filename}.${format}`, { bookType });
  } catch (err) {
    console.error("Gagal mengekspor data spreadsheet:", err);
  }
}

/**
 * Utilitas ekspor data rekapitulasi ke format PDF resmi bertema SMKN 21 Jakarta.
 * Menggunakan dynamic import jsPDF dan jspdf-autotable.
 */
export async function exportPdf(
  activeTab: string,
  datasets: ExportDatasets,
  periodeInfo: PeriodeInfo,
): Promise<void> {
  const {
    filteredSiswa = [],
    filteredHarian = [],
    filteredPerpus = [],
    filteredPengajuan = [],
    filteredIzinPiket = [],
  } = datasets;
  const { periodeMode, namaBulanTerpilih, selectedTahun } = periodeInfo;

  const periodeLabel =
    periodeMode === "bulan"
      ? `${namaBulanTerpilih} ${selectedTahun}`
      : `Tahun ${selectedTahun}`;
  const periodeTag =
    periodeMode === "bulan"
      ? `${namaBulanTerpilih}_${selectedTahun}`
      : `Tahun_${selectedTahun}`;

  let title = "";
  let orientation: "portrait" | "landscape" = "portrait";
  let headers: string[] = [];
  let rows: Array<Array<string | number>> = [];
  let filename = "";

  if (activeTab === "rekap_siswa") {
    title = "LAPORAN REKAPITULASI KEHADIRAN SISWA";
    orientation = "landscape";
    filename = `rekap_kehadiran_${periodeTag}.pdf`;
    headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Tepat Waktu",
      "Terlambat",
      "Sakit",
      "Izin",
      "Alpa",
      "Total Hadir",
      "Perpus",
      "Status",
    ];
    rows = filteredSiswa.map((item, index) => [
      index + 1,
      item.nis,
      item.nama,
      item.kelas,
      item.tepat_waktu,
      item.terlambat,
      item.sakit || 0,
      item.izin || 0,
      item.alpa || 0,
      item.total_hadir,
      item.kunjungan_perpus,
      item.total_hadir > 0 ? "Aktif" : "Nir-Hadir",
    ]);
  } else if (activeTab === "riwayat_harian") {
    title = "LOG RIWAYAT PRESENSI HARIAN SISWA";
    orientation = "portrait";
    filename = `riwayat_presensi_harian_${periodeTag}.pdf`;
    headers = ["No", "Waktu Presensi", "NIS", "Nama Siswa", "Kelas", "Status"];
    rows = filteredHarian.map((item, index) => [
      index + 1,
      item.waktu,
      item.nis || "-",
      item.nama,
      item.kelas,
      item.status,
    ]);
  } else if (activeTab === "riwayat_perpus") {
    title = "LOG KUNJUNGAN PERPUSTAKAAN SEKOLAH";
    orientation = "portrait";
    filename = `riwayat_perpustakaan_${periodeTag}.pdf`;
    headers = [
      "No",
      "Waktu Kunjungan",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Keperluan",
    ];
    rows = filteredPerpus.map((item, index) => [
      index + 1,
      item.waktu,
      item.nis || "-",
      item.nama,
      item.kelas,
      item.keperluan,
    ]);
  } else if (activeTab === "verifikasi_izin") {
    title = "LOG PENGAJUAN SURAT IZIN & SAKIT";
    orientation = "landscape";
    filename = `pengajuan_izin_sakit_${periodeTag}.pdf`;
    headers = [
      "No",
      "Tgl Pengajuan",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Jenis",
      "Tgl Mulai",
      "Tgl Selesai",
      "Alasan",
      "Status",
    ];
    rows = filteredPengajuan.map((item, index) => [
      index + 1,
      item.created_at ? String(item.created_at).substring(0, 16) : "-",
      item.nis,
      item.nama,
      item.kelas,
      item.jenis,
      item.tanggal_mulai,
      item.tanggal_selesai,
      item.alasan,
      item.status_pengajuan,
    ]);
  } else if (activeTab === "izin_piket") {
    title = "LOG SURAT IZIN MEJA PIKET (MASUK / MENINGGALKAN KELAS)";
    orientation = "landscape";
    filename = `izin_meja_piket_${periodeTag}.pdf`;
    headers = [
      "No",
      "Waktu",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Keperluan",
      "Jam Ke-",
      "Hari / Tanggal",
      "Alasan",
      "Petugas Piket",
    ];
    rows = filteredIzinPiket.map((item, index) => [
      index + 1,
      item.created_at ? String(item.created_at).substring(0, 16) : "-",
      item.nis,
      item.nama,
      item.kelas,
      item.tipe,
      item.jam_ke,
      `${item.hari}, ${item.tanggal_formatted || item.tanggal}`,
      item.alasan,
      item.petugas_piket,
    ]);
  } else if (activeTab === "pelanggaran_siswa") {
    title = "BUKU CATATAN PELANGGARAN SISWA/I SMKN 21 JAKARTA";
    orientation = "landscape";
    filename = `buku_catatan_pelanggaran_${periodeTag}.pdf`;
    headers = [
      "No",
      "Waktu Kejadian",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Kategori",
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    const rawList = datasets.filteredPelanggaran || datasets.records || [];
    const dataList = rawList.filter(
      (item) =>
        item.status_verifikasi !== "Menunggu Konfirmasi" &&
        item.status !== "Menunggu Konfirmasi",
    );
    rows = dataList.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted ||
        (item.tanggal_waktu ? String(item.tanggal_waktu).substring(0, 16) : "-"),
      item.nis,
      item.nama_siswa || item.nama,
      item.kelas,
      item.kategori || "Pelanggaran",
      item.jenis_pelanggaran,
      `${item.poin} Poin`,
      item.nama_penanggung_jawab || "-",
      item.keterangan || "-",
    ]);
  } else if (activeTab === "manajemen_piket") {
    title = "DAFTAR STAF & GURU PIKET SMKN 21 JAKARTA";
    orientation = "portrait";
    filename = `daftar_staf_guru_piket_${periodeTag}.pdf`;
    headers = [
      "No",
      "Username",
      "Nama Lengkap",
      "Role / Wewenang",
      "Status TTD",
    ];
    const staf = datasets.stafList || [];
    rows = staf.map((item, index) => [
      index + 1,
      item.username,
      item.nama,
      item.role === "admin" ? "Administrator" : "Guru Piket",
      item.has_signature ? "Tersedia" : "Belum Ada",
    ]);
  }

  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // KOP Surat Resmi SMKN 21 Jakarta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(
      SCHOOL_PROFILE.provinsi,
      pageWidth / 2,
      12,
      { align: "center" },
    );
    doc.setFontSize(9.5);
    doc.text(SCHOOL_PROFILE.dinas, pageWidth / 2, 16.5, { align: "center" });
    doc.setFontSize(13);
    doc.text(SCHOOL_PROFILE.namaResmiKop, pageWidth / 2, 22.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      SCHOOL_PROFILE.alamatKop,
      pageWidth / 2,
      27,
      { align: "center" },
    );

    // Garis KOP Ganda
    doc.setLineWidth(0.8);
    doc.line(14, 30, pageWidth - 14, 30);
    doc.setLineWidth(0.3);
    doc.line(14, 31, pageWidth - 14, 31);

    // Judul Dokumen
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, pageWidth / 2, 38, { align: "center" });

    // Metadata Periode & Tanggal Cetak
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Periode Rekapitulasi: ${periodeLabel}`, 14, 44);

    doc.text(`Dicetak: ${nowWib()}`, pageWidth - 14, 44, {
      align: "right",
    });

    // Render Tabel Resmi dengan autoTable
    autoTable(doc, {
      startY: 47,
      head: [headers],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 138], // Navy Blue SMKN 21
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        cellPadding: 2,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        valign: "middle",
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });

    // Nomor halaman akurat setelah seluruh halaman dibuat
    addPageNumbers(doc, "Sistem Absensi SMKN 21 Jakarta");

    doc.save(filename);
  } catch (err) {
    console.error("Gagal mengekspor data PDF:", err);
  }
}

export interface PelanggaranDirectOptions {
  format?: string;
  subTab?: string;
  records?: Array<Record<string, any>>;
  rekapData?: {
    daftar_siswa?: Array<Record<string, any>>;
    rekap_siswa?: Array<Record<string, any>>;
    [key: string]: any;
  } | null;
  periodeLabel?: string;
}

/**
 * Ekspor langsung untuk Buku Catatan Pelanggaran (Riwayat Transaksi & Rekap Poin Siswa).
 * Menggunakan dynamic import jsPDF & XLSX.
 */
export async function exportPelanggaranDirect({
  format = "pdf",
  subTab = "riwayat",
  records = [],
  rekapData = null,
  periodeLabel = "Semua Periode",
}: PelanggaranDirectOptions): Promise<void> {
  const isRekapPoin = subTab === "rekap_poin";
  const title = isRekapPoin
    ? "REKAPITULASI AKUMULASI POIN KEDISIPLINAN SISWA SMKN 21"
    : "BUKU CATATAN PELANGGARAN SISWA/I SMKN 21 JAKARTA";
  const filename = isRekapPoin
    ? `rekap_akumulasi_poin_siswa_${new Date().toISOString().slice(0, 10)}`
    : `buku_catatan_pelanggaran_${new Date().toISOString().slice(0, 10)}`;

  let headers: string[] = [];
  let rows: Array<Array<string | number>> = [];

  if (isRekapPoin) {
    headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Jumlah Pelanggaran",
      "Total Poin",
      "Status Pembinaan",
    ];
    const list = rekapData?.daftar_siswa || rekapData?.rekap_siswa || [];
    rows = list.map((item, index) => {
      const poin = item.poin_bersih ?? item.total_poin ?? 0;
      return [
        index + 1,
        item.nis || "-",
        item.nama_siswa || item.nama,
        item.kelas || "-",
        item.jumlah_pelanggaran || 0,
        `${poin} Poin`,
        getStatusPembinaan(poin).status,
      ];
    });
  } else {
    headers = [
      "No",
      "Waktu Kejadian",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Kategori",
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    const validRecords = records.filter(
      (item) =>
        item.status_verifikasi !== "Menunggu Konfirmasi" &&
        item.status !== "Menunggu Konfirmasi",
    );
    rows = validRecords.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted || item.tanggal_waktu || "-",
      item.nis || "-",
      item.nama_siswa || item.nama || "-",
      item.kelas || "-",
      item.kategori || "Pelanggaran",
      item.jenis_pelanggaran || "-",
      `${item.poin} Poin`,
      item.nama_penanggung_jawab || "-",
      item.keterangan || "-",
    ]);
  }

  if (format === "pdf") {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // KOP Surat Resmi SMKN 21 Jakarta
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(
        SCHOOL_PROFILE.provinsi,
        pageWidth / 2,
        12,
        { align: "center" },
      );
      doc.setFontSize(9.5);
      doc.text(SCHOOL_PROFILE.dinas, pageWidth / 2, 16.5, { align: "center" });
      doc.setFontSize(13);
      doc.text(SCHOOL_PROFILE.namaResmiKop, pageWidth / 2, 22.5, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        SCHOOL_PROFILE.alamatKop,
        pageWidth / 2,
        27,
        { align: "center" },
      );

      doc.setLineWidth(0.8);
      doc.line(14, 30, pageWidth - 14, 30);
      doc.setLineWidth(0.3);
      doc.line(14, 31, pageWidth - 14, 31);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, pageWidth / 2, 38, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Periode / Kategori: ${periodeLabel}`, 14, 44);

      doc.text(`Dicetak: ${nowWib()}`, pageWidth - 14, 44, {
        align: "right",
      });

      autoTable(doc, {
        startY: 47,
        head: [headers],
        body: rows,
        theme: "grid",
        headStyles: {
          fillColor: [190, 24, 93], // Rose/Wine SMKN 21 Pelanggaran
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          cellPadding: 2,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          valign: "middle",
          overflow: "linebreak",
        },
        alternateRowStyles: {
          fillColor: [255, 241, 242],
        },
        margin: { left: 14, right: 14, bottom: 18 },
      });

      addPageNumbers(doc, "Sistem Absensi SMKN 21 Jakarta");

      doc.save(`${filename}.pdf`);
    } catch (err) {
      console.error("Gagal mengekspor PDF Pelanggaran:", err);
    }
  } else {
    try {
      const XLSX = await import("xlsx");
      const sanitizedRows =
        format === "csv"
          ? rows.map((r) => r.map((c) => csvSafe(c)))
          : rows;
      const worksheetData = [headers, ...sanitizedRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const colWidths = headers.map((h, colIdx) => {
        const maxLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[colIdx] ?? "").length),
        );
        return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
      });
      worksheet["!cols"] = colWidths;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        isRekapPoin ? "Rekap Poin" : "Catatan Pelanggaran",
      );
      const bookType = (format === "xls" ? "biff8" : format) as any;
      XLSX.writeFile(workbook, `${filename}.${format}`, { bookType });
    } catch (err) {
      console.error("Gagal mengekspor Spreadsheet Pelanggaran:", err);
    }
  }
}
