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
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    const dataList = datasets.filteredPelanggaran || datasets.records || [];
    rows = dataList.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted || item.tanggal_waktu,
      item.nis,
      item.nama_siswa || item.nama,
      item.kelas,
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
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    const dataList = datasets.filteredPelanggaran || datasets.records || [];
    rows = dataList.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted ||
        (item.tanggal_waktu ? item.tanggal_waktu.substring(0, 16) : "-"),
      item.nis,
      item.nama_siswa || item.nama,
      item.kelas,
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

/**
 * Ekspor langsung untuk Buku Catatan Pelanggaran (Riwayat Transaksi & Rekap Poin Siswa).
 */
export function exportPelanggaranDirect({
  format = "pdf",
  subTab = "riwayat",
  records = [],
  rekapData = null,
  periodeLabel = "Semua Periode",
}) {
  const isRekapPoin = subTab === "rekap_poin";
  const title = isRekapPoin
    ? "REKAPITULASI AKUMULASI POIN KEDISIPLINAN SISWA SMKN 21"
    : "BUKU CATATAN PELANGGARAN SISWA/I SMKN 21 JAKARTA";
  const filename = isRekapPoin
    ? `rekap_akumulasi_poin_siswa_${new Date().toISOString().slice(0, 10)}`
    : `buku_catatan_pelanggaran_${new Date().toISOString().slice(0, 10)}`;

  let headers = [];
  let rows = [];

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
    const list = rekapData?.daftar_siswa || [];
    rows = list.map((item, index) => {
      let statusLabel = "Baik / Aman (0-15 Poin)";
      if (item.total_poin >= 100)
        statusLabel = "Sanksi Keras / Panggilan Orang Tua (100+ Poin)";
      else if (item.total_poin >= 50)
        statusLabel = "Peringatan Keras / SP-2 (50-99 Poin)";
      else if (item.total_poin >= 26)
        statusLabel = "Peringatan Tertulis / SP-1 (26-49 Poin)";
      else if (item.total_poin >= 16)
        statusLabel = "Bimbingan Wali Kelas (16-25 Poin)";
      return [
        index + 1,
        item.nis || "-",
        item.nama_siswa || item.nama,
        item.kelas || "-",
        item.jumlah_pelanggaran || 0,
        `${item.total_poin} Poin`,
        statusLabel,
      ];
    });
  } else {
    headers = [
      "No",
      "Waktu Kejadian",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Jenis Pelanggaran",
      "Poin",
      "Guru Penegur",
      "Keterangan",
    ];
    rows = records.map((item, index) => [
      index + 1,
      item.tanggal_waktu_formatted || item.tanggal_waktu || "-",
      item.nis || "-",
      item.nama_siswa || item.nama || "-",
      item.kelas || "-",
      item.jenis_pelanggaran || "-",
      `${item.poin} Poin`,
      item.nama_penanggung_jawab || "-",
      item.keterangan || "-",
    ]);
  }

  if (format === "pdf") {
    try {
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
        "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA",
        pageWidth / 2,
        12,
        { align: "center" },
      );
      doc.setFontSize(9.5);
      doc.text("DINAS PENDIDIKAN", pageWidth / 2, 16.5, { align: "center" });
      doc.setFontSize(13);
      doc.text("SMK NEGERI 21 JAKARTA", pageWidth / 2, 22.5, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "Jl. Siaga 1 Kemayoran Gempol Jakarta Pusat 10630 | Telp: (021) 4209587",
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
        didDrawPage: (data) => {
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

      doc.save(`${filename}.pdf`);
    } catch (err) {
      console.error("Gagal mengekspor PDF Pelanggaran:", err);
    }
  } else {
    try {
      const worksheetData = [headers, ...rows];
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
      const bookType = format === "xls" ? "biff8" : format;
      XLSX.writeFile(workbook, `${filename}.${format}`, { bookType });
    } catch (err) {
      console.error("Gagal mengekspor Spreadsheet Pelanggaran:", err);
    }
  }
}
