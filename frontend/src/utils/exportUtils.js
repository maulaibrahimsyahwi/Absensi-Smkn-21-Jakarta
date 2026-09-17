import * as XLSX from "xlsx";

/**
 * Utilitas ekspor data rekapitulasi ke format spreadsheet (XLSX, XLS, atau CSV).
 *
 * @param {string} format "xlsx" | "xls" | "csv"
 * @param {string} activeTab "rekap_siswa" | "riwayat_harian" | "riwayat_perpus" | "verifikasi_izin"
 * @param {object} datasets { filteredSiswa, filteredHarian, filteredPerpus, filteredPengajuan }
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
    const { filteredIzinPiket = [] } = datasets;
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
    console.error("Gagal mengekspor data:", err);
  }
}
