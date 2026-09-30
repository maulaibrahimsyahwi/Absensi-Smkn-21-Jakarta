import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import api from "../../services/api";
import { DAFTAR_KELAS_SMKN21 } from "../../constants/schoolData";

export default function ModalDispensasiMassal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [tipeIzin, setTipeIzin] = useState("Izin Meninggalkan Kelas");
  const [jamKe, setJamKe] = useState("1 - Selesai");
  const [guruPendamping, setGuruPendamping] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Ambil daftar siswa aktif
  useEffect(() => {
    let isMounted = true;
    setLoadingStudents(true);
    api
      .get("/siswa", { params: { limit: 1000 } })
      .then((res) => {
        if (isMounted && res.data?.data) {
          const activeOnly = res.data.data.filter((s) => s.status !== "Alumni");
          setAllStudents(activeOnly);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat daftar siswa:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStudents(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter siswa
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const matchKelas = filterKelas === "ALL" || s.kelas === filterKelas;
      const matchSearch =
        !search.trim() ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search.trim());
      return matchKelas && matchSearch;
    });
  }, [allStudents, filterKelas, search]);

  const toggleSelectStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setErrorMsg("Pilih minimal satu siswa delegasi.");
      return;
    }
    if (!namaKegiatan.trim()) {
      setErrorMsg("Nama kegiatan / lomba delegasi wajib diisi.");
      return;
    }
    if (!guruPendamping.trim()) {
      setErrorMsg("Nama guru pendamping / pembina wajib diisi.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await api.post("/piket/dispensasi_massal", {
        siswa_ids: Array.from(selectedIds),
        nama_kegiatan: namaKegiatan.trim(),
        tipe: tipeIzin,
        jam_ke: jamKe.trim(),
        guru_pendamping: guruPendamping.trim(),
        keterangan: keterangan.trim(),
      });

      if (res.data?.success) {
        if (onSuccess) {
          onSuccess(res.data.message || `Dispensasi diterbitkan untuk ${selectedIds.size} siswa.`);
        }
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal menerbitkan dispensasi massal.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Terjadi kendala saat menerbitkan dispensasi massal.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm">
                Penerbitan Dispensasi Massal Delegasi / Lomba
              </h3>
              <p className="text-[11px] text-slate-400">
                LKS, O2SN, FL2SN, Paskibra, atau Tugas Resmi Sekolah
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Informasi Kegiatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Nama Kegiatan / Delegasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={namaKegiatan}
                onChange={(e) => setNamaKegiatan(e.target.value)}
                placeholder="Contoh: LKS Web Tech Wilayah Jakpus"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Guru Pendamping / Pembina <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={guruPendamping}
                onChange={(e) => setGuruPendamping(e.target.value)}
                placeholder="Nama guru / pembina penanggung jawab"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Keperluan Dispensasi
              </label>
              <select
                value={tipeIzin}
                onChange={(e) => setTipeIzin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-xs"
              >
                <option value="Izin Meninggalkan Kelas">Izin Meninggalkan Kelas</option>
                <option value="Izin Masuk">Izin Masuk</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Jam Pelajaran Ke-
              </label>
              <input
                type="text"
                value={jamKe}
                onChange={(e) => setJamKe(e.target.value)}
                placeholder="Contoh: 1 - Selesai atau 3 s/d 6"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 text-xs"
              />
            </div>
          </div>

          {/* Area Pemilihan Siswa Delegasi */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Pilih Siswa Delegasi ({selectedIds.size} Terpilih)
                </label>
                <span className="text-[10px] text-slate-500">
                  Centang siswa yang berpartisipasi dalam delegasi ini
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  Pilih Semua Tampak
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Filter Kelas & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau NIS siswa..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Semua Kelas</option>
                  {DAFTAR_KELAS_SMKN21.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Daftar Siswa (Checklist Box) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-50/50 divide-y divide-slate-100">
              {loadingStudents ? (
                <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Memuat data siswa...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada data siswa yang cocok dengan filter.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isChecked = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelectStudent(s.id)}
                      className={`p-2.5 flex items-center justify-between transition cursor-pointer ${
                        isChecked ? "bg-purple-50/80" : "hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            {s.nama}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            NIS: {s.nis} • {s.kelas}
                          </p>
                        </div>
                      </div>
                      {isChecked && (
                        <span className="text-[10px] font-bold text-purple-700 px-2 py-0.5 rounded-full bg-purple-100">
                          Terpilih
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Tombol Simpan */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-semibold">
              Total {selectedIds.size} slip E-Dispensasi akan otomatis dibuat.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || selectedIds.size === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menerbitkan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Terbitkan ({selectedIds.size} Siswa)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

