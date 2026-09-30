import React, { useState, useEffect, useRef } from "react";
import {
  UserCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ShieldCheck,
  Clock,
  User,
} from "lucide-react";
import api from "../../services/api";

const PILIHAN_ALASAN_OVERRIDE = [
  "Kendala Sensor Kamera / Biometrik Rusak",
  "Luka / Perban Medis pada Wajah Siswa",
  "Baterai HP Siswa Mati Total / Tidak Membawa HP",
  "Kartu Pelajar Fisik Tertinggal / Hilang",
  "Siswa Baru / Biometrik Belum Terdaftar",
  "Lainnya (Kondisi Khusus Meja Piket)",
];

export default function ModalPresensiManual({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const [studentSearch, setStudentSearch] = useState("");
  const [studentList, setStudentList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [statusPresensi, setStatusPresensi] = useState("Hadir");
  const [alasanOverride, setAlasanOverride] = useState(
    PILIHAN_ALASAN_OVERRIDE[0],
  );
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const dropdownRef = useRef(null);

  // Search Siswa
  useEffect(() => {
    if (!studentSearch.trim() || selectedStudent) {
      setStudentList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get("/siswa", {
          params: { search: studentSearch.trim(), limit: 15 },
        });
        if (res.data && res.data.data) {
          const filtered = (res.data.data || []).filter(
            (s) => s.status !== "Alumni",
          );
          setStudentList(filtered);
          setIsDropdownOpen(filtered.length > 0);
        }
      } catch (err) {
        console.warn("Gagal mencari data siswa:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [studentSearch, selectedStudent]);

  // Handle Select Student
  const handleSelectStudent = (siswa) => {
    setSelectedStudent(siswa);
    setStudentSearch(`${siswa.nama} (${siswa.kelas})`);
    setIsDropdownOpen(false);
    setErrorMsg("");
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setStudentList([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg("Harap cari dan pilih siswa terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await api.post("/piket/presensi_manual", {
        siswa_id: selectedStudent.id,
        nis: selectedStudent.nis,
        status: statusPresensi,
        alasan_override: alasanOverride,
        catatan: catatan.trim(),
      });

      if (res.data && res.data.success) {
        if (onSuccess) {
          onSuccess(
            res.data.message || "Presensi manual darurat berhasil dicatat.",
          );
        }
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal mencatat presensi manual.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan sistem saat menyimpan presensi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm">
                Presensi Manual Meja Piket
              </h3>
              <p className="text-[11px] text-slate-400">
                Bypass Scanner Biometrik untuk Kondisi Darurat Sah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cari Siswa */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Cari Identitas Siswa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (selectedStudent) setSelectedStudent(null);
                }}
                placeholder="Ketik NIS atau nama lengkap siswa..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-xs"
                required
              />
              {selectedStudent ? (
                <button
                  type="button"
                  onClick={handleClearStudent}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : isSearching ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              ) : null}
            </div>

            {/* Dropdown Hasil Pencarian */}
            {isDropdownOpen && studentList.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                {studentList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className="w-full p-2.5 text-left hover:bg-blue-50/60 flex items-center justify-between transition cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{s.nama}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        NIS: {s.nis} • {s.kelas}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 px-2 py-0.5 rounded-full bg-blue-50">
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kartu Siswa Terpilih */}
          {selectedStudent && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {selectedStudent.nama}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    NIS: {selectedStudent.nis} • {selectedStudent.kelas}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Terverifikasi
              </span>
            </div>
          )}

          {/* Status Presensi */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Status Presensi Hari Ini <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusPresensi("Hadir")}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                  statusPresensi === "Hadir"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Hadir Tepat Waktu
              </button>
              <button
                type="button"
                onClick={() => setStatusPresensi("Terlambat")}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                  statusPresensi === "Terlambat"
                    ? "bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Terlambat Masuk
              </button>
            </div>
          </div>

          {/* Alasan Override */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Alasan Manual Override <span className="text-rose-500">*</span>
            </label>
            <select
              value={alasanOverride}
              onChange={(e) => setAlasanOverride(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-xs"
            >
              {PILIHAN_ALASAN_OVERRIDE.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Catatan Saksi Petugas Piket (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Rincian kondisi fisik / saksi guru piket yang bertugas..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-xs"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedStudent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Presensi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
