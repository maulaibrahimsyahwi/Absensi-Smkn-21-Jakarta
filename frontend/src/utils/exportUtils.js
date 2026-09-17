import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Utilitas ekspor data rekapitulasi ke format spreadsheet (XLSX, XLS, atau CSV).
 *
 * @param {string} format "xlsx" | "xls" | "csv"
 * @param {string} activeTab "rekap_siswa" | "riwayat_harian" | "riwayat_perpus" | "verifikasi_izin" | "izin_piket"
 * @param {object} datasets { filteredSiswa, filteredHarian, filteredPerpus, filteredPengajuan, filteredIzinPiket }
 * @param {object} periodeInfo { periodeMode, namaBulanTerpilih, selectedTahun }
 */
export function exportSpreadsheet(
  format = "xlsx",
  activeTab,
  datasets,
  periodeInfo,
) {
  const {
    filteredSiswa = [],
    filteredHarian = [],
    filteredPerpus = [],
    filteredPengajuan = [],
    filteredIzinPiket = [],
  } = datasets;
  const { periodeMode, namaBulanTerpilih, selectedTahun } = periodeInfo;

  let headers = [];
  let rows = [];
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
      "Nama Siswa",
      "Kelas",
      "Status Kehadiran",
    ];
    rows = filteredHarian.map((item, index) => [
      index + 1,
      item.waktu,
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
      "Nama Siswa",
      "Kelas",
      "Keperluan Kunjungan",
    ];
    rows = filteredPerpus.map((item, index) => [
      index + 1,
      item.waktu,
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
  }

  try {
    const worksheetData = [headers, ...rows];
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

    const bookType = format === "xls" ? "biff8" : format;
    XLSX.writeFile(workbook, `${filename}.${format}`, { bookType });
  } catch (err) {
    console.error("Gagal mengekspor data spreadsheet:", err);
  }
}

/**
 * Utilitas ekspor data rekapitulasi ke format PDF resmi bertema SMKN 21 Jakarta.
 *
 * @param {string} activeTab "rekap_siswa" | "riwayat_harian" | "riwayat_perpus" | "verifikasi_izin" | "izin_piket"
 * @param {object} datasets { filteredSiswa, filteredHarian, filteredPerpus, filteredPengajuan, filteredIzinPiket }
 * @param {object} periodeInfo { periodeMode, namaBulanTerpilih, selectedTahun }
 */
export function exportPdf(activeTab, datasets, periodeInfo) {
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
  let orientation = "portrait";
  let headers = [];
  let rows = [];
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
      item.total_hadir,
      item.kunjungan_perpus,
      item.total_hadir > 0 ? "Aktif" : "Nir-Hadir",
    ]);
  } else if (activeTab === "riwayat_harian") {
    title = "LOG RIWAYAT PRESENSI HARIAN SISWA";
    orientation = "portrait";
    filename = `riwayat_presensi_harian_${periodeTag}.pdf`;
    headers = ["No", "Waktu Presensi", "Nama Siswa", "Kelas", "Status"];
    rows = filteredHarian.map((item, index) => [
      index + 1,
      item.waktu,
      item.nama,
      item.kelas,
      item.status,
    ]);
  } else if (activeTab === "riwayat_perpus") {
    title = "LOG KUNJUNGAN PERPUSTAKAAN SEKOLAH";
    orientation = "portrait";
    filename = `riwayat_perpustakaan_${periodeTag}.pdf`;
    headers = ["No", "Waktu Kunjungan", "Nama Siswa", "Kelas", "Keperluan"];
    rows = filteredPerpus.map((item, index) => [
      index + 1,
      item.waktu,
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
      item.created_at ? item.created_at.substring(0, 16) : "-",
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
      item.created_at ? item.created_at.substring(0, 16) : "-",
      item.nis,
      item.nama,
      item.kelas,
      item.tipe,
      item.jam_ke,
      `${item.hari}, ${item.tanggal_formatted || item.tanggal}`,
      item.alasan,
      item.petugas_piket,
    ]);
  }

  try {
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
      "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA",
      pageWidth / 2,
      12,
      { align: "center" },
    );
    doc.setFontSize(9.5);
    doc.text("DINAS PENDIDIKAN", pageWidth / 2, 16.5, { align: "center" });
    doc.setFontSize(13);
    doc.text("SMK NEGERI 21 JAKARTA", pageWidth / 2, 22.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Jl. Siaga 1 Kemayoran Gempol Jakarta Pusat 10630 | Telp: (021) 4209587",
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

    const now = new Date();
    const dateFormatted = `${now.getDate().toString().padStart(2, "0")}/${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${now.getFullYear()} ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} WIB`;
    doc.text(`Dicetak: ${dateFormatted}`, pageWidth - 14, 44, {
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
      didDrawPage: (data) => {
        // Footer Halaman
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(
          `Sistem Absensi SMKN 21 Jakarta - Halaman ${data.pageNumber} dari ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" },
        );
      },
    });

    doc.save(filename);
  } catch (err) {
    console.error("Gagal mengekspor data PDF:", err);
  }
}
