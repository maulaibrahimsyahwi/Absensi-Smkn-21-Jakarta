import * as XLSX from "xlsx";

/**
 * Utilitas untuk pembuatan template dan parsing data Dapodik / Excel siswa SMKN 21.
 * Didesain tanpa ketergantungan emoji, bersih, dan profesional.
 */

/**
 * Mengunduh template Excel berstandar format ekspor Dapodik.
 */
export function downloadDapodikTemplate() {
  const wb = XLSX.utils.book_new();

  // Data header dan contoh baris siswa SMKN 21
  const wsData = [
    ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin"],
    ["10241", "Ahmad Rizky Pratama", "X TJKT 1", "L"],
    ["10242", "Annisa Fitria", "X TJKT 1", "P"],
    ["10243", "Bagus Tri Saputra", "X PPLG 1", "L"],
    ["10244", "Dewi Lestari", "X PPLG 1", "P"],
    ["10245", "Fajar Hidayat", "XI MPLB 2", "L"],
    ["10246", "Siti Nurhaliza", "XII AKL 1", "P"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Atur lebar kolom agar rapi saat dibuka di Microsoft Excel
  ws["!cols"] = [
    { wch: 14 }, // NIS
    { wch: 28 }, // Nama Lengkap
    { wch: 16 }, // Kelas
    { wch: 20 }, // Jenis Kelamin
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa Dapodik");
  XLSX.writeFile(wb, "Template_Dapodik_Siswa_SMKN21.xlsx");
}

/**
 * Membaca dan memetakan file Excel/CSV siswa.
 * Fleksibel terhadap penamaan header kolom Dapodik umum.
 *
 * @param {File} file File yang diunggah pengguna (.xlsx, .xls, .csv)
 * @returns {Promise<{ validRows: Array, invalidRows: Array, totalDetected: number }>}
 */
export function parseDapodikFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("File tidak memiliki lembar kerja (worksheet).");
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        // Konversi sheet ke array of objects
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          throw new Error(
            "Lembar kerja kosong atau tidak memiliki baris data.",
          );
        }

        const validRows = [];
        const invalidRows = [];

        rawJson.forEach((row, index) => {
          // Cari kolom secara fleksibel dan case-insensitive
          let rawNis = "";
          let rawNama = "";
          let rawKelas = "";
          let rawJk = "";

          for (const key of Object.keys(row)) {
            const cleanKey = key
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const val = String(row[key] ?? "").trim();

            if (
              cleanKey === "nis" ||
              cleanKey === "nipd" ||
              cleanKey === "noinduk" ||
              cleanKey === "nomorinduk" ||
              cleanKey === "nisn" ||
              cleanKey === "idsiswa"
            ) {
              if (!rawNis) rawNis = val;
            } else if (
              cleanKey === "nama" ||
              cleanKey === "namalengkap" ||
              cleanKey === "namasiswa" ||
              cleanKey === "namapesertadidik" ||
              cleanKey === "pesertadidik"
            ) {
              if (!rawNama) rawNama = val;
            } else if (
              cleanKey === "kelas" ||
              cleanKey === "rombel" ||
              cleanKey === "rombonganbelajar" ||
              cleanKey === "tingkat" ||
              cleanKey === "jurusan"
            ) {
              if (!rawKelas) rawKelas = val;
            } else if (
              cleanKey === "jeniskelamin" ||
              cleanKey === "jk" ||
              cleanKey === "gender" ||
              cleanKey === "kelamin" ||
              cleanKey === "lp" ||
              cleanKey === "sex"
            ) {
              if (!rawJk) rawJk = val;
            }
          }

          // Bersihkan format NIS jika terbaca sebagai float (misal: 10231.0)
          if (rawNis.endsWith(".0")) {
            rawNis = rawNis.replace(/\.0$/, "");
          }

          // Lewati baris yang benar-benar kosong di Excel
          if (!rawNis && !rawNama && !rawKelas) {
            return;
          }

          // Normalisasi Jenis Kelamin
          const jkLower = rawJk.toLowerCase();
          let jenisKelamin = "Laki-laki";
          if (
            jkLower === "p" ||
            jkLower === "perempuan" ||
            jkLower === "wanita" ||
            jkLower === "f" ||
            jkLower === "siswi"
          ) {
            jenisKelamin = "Perempuan";
          }

          // Validasi data
          const errors = [];
          if (!rawNis) {
            errors.push("NIS kosong");
          } else if (rawNis.length < 2 || rawNis.length > 30) {
            errors.push("Panjang NIS tidak valid (2-30 karakter)");
          }

          if (!rawNama) {
            errors.push("Nama kosong");
          } else if (rawNama.length < 3) {
            errors.push("Nama terlalu pendek (minimal 3 karakter)");
          }

          const parsedItem = {
            index: index + 2, // nomor baris di spreadsheet (baris 1 = header)
            nis: rawNis,
            nama: rawNama,
            kelas: (rawKelas || "UMUM").toUpperCase(),
            jenis_kelamin: jenisKelamin,
          };

          if (errors.length > 0) {
            invalidRows.push({
              ...parsedItem,
              errorMessages: errors.join(", "),
            });
          } else {
            validRows.push(parsedItem);
          }
        });

        resolve({
          validRows,
          invalidRows,
          totalDetected: validRows.length + invalidRows.length,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca file dari penyimpanan lokal."));
    };

    reader.readAsArrayBuffer(file);
  });
}
