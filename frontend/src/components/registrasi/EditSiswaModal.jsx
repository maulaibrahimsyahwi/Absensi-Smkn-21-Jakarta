import React, { useState, useMemo, useEffect } from "react";
import { X, GraduationCap, User, Hash } from "lucide-react";
import CustomDropdown from "../CustomDropdown";
import {
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
} from "../../constants/schoolData";

export default function EditSiswaModal({
  editingSiswa,
  setEditingSiswa,
  handleUpdateSiswa,
  groups,
  siswaList = [],
}) {
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    if (
      editingSiswa?.kelas &&
      !DAFTAR_KELAS_SMKN21.includes(editingSiswa.kelas)
    ) {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  }, [editingSiswa?.id]);

  // Kelompok opsi dropdown cerdas
  const availableGroups = useMemo(() => {
    const existingClasses = new Set(DAFTAR_KELAS_SMKN21);
    const extraClasses = [];
    (siswaList || []).forEach((s) => {
      if (
        s.kelas &&
        !existingClasses.has(s.kelas) &&
        !extraClasses.includes(s.kelas)
      ) {
        extraClasses.push(s.kelas);
      }
    });

    const baseGroups = groups || KELAS_GROUPS_DROPDOWN;
    const finalGroups = [...baseGroups];

    if (extraClasses.length > 0) {
      finalGroups.push({
        group: "Kelas Tambahan Terdaftar",
        badge: "AKTIF",
        badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
        options: extraClasses.map((k) => ({ value: k, label: k })),
      });
    }

    finalGroups.push({
      group: "Opsi Tambahan",
      badge: "+",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      options: [
        {
          value: "__CUSTOM__",
          label: "+ Kelas Baru...",
        },
      ],
    });

    return finalGroups;
  }, [groups, siswaList]);

  if (!editingSiswa) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200/90 w-full max-w-md sm:max-w-lg shadow-2xl p-5 sm:p-7 relative my-auto overflow-visible">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Edit Data Siswa
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingSiswa(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Edit */}
        <form onSubmit={handleUpdateSiswa}>
          <div className="space-y-4 mb-6">
            {/* NIS */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <span>Nomor Induk Siswa (NIS)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={editingSiswa.nis}
                onChange={(e) =>
                  setEditingSiswa({
                    ...editingSiswa,
                    nis: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="Contoh: 20241001"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:border-slate-300 transition-all"
              />
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <span>Nama Lengkap Siswa</span>
              </label>
              <input
                type="text"
                required
                value={editingSiswa.nama}
                onChange={(e) =>
                  setEditingSiswa({ ...editingSiswa, nama: e.target.value })
                }
                placeholder="Masukkan nama lengkap siswa"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:border-slate-300 transition-all"
              />
            </div>

            {/* Jenis Kelamin & Panggilan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jenis Kelamin & Panggilan Sistem
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingSiswa({
                      ...editingSiswa,
                      jenis_kelamin: "Laki-laki",
                    })
                  }
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    (editingSiswa.jenis_kelamin || "Laki-laki") === "Laki-laki"
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>👦 Laki-laki (Siswa)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingSiswa({
                      ...editingSiswa,
                      jenis_kelamin: "Perempuan",
                    })
                  }
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    editingSiswa.jenis_kelamin === "Perempuan"
                      ? "bg-pink-50 border-pink-500 text-pink-700 shadow-xs ring-2 ring-pink-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>👧 Perempuan (Siswi)</span>
                </button>
              </div>
            </div>

            {/* Kelas & Jurusan */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>Kelas & Jurusan SMKN 21</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(!isCustomMode);
                  }}
                  className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {isCustomMode
                    ? "← Pilih dari Dropdown"
                    : "+ Ketik Kelas Baru"}
                </button>
              </div>

              {isCustomMode ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X PPLG atau X PPLG 3"
                    value={editingSiswa.kelas || ""}
                    onChange={(e) =>
                      setEditingSiswa({
                        ...editingSiswa,
                        kelas: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold uppercase border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50/20 font-mono tracking-wide"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400">
                    Format: Tingkat (X/XI/XII) spasi Jurusan/Rombel. Contoh:{" "}
                    <strong className="text-slate-600">X PPLG</strong> atau{" "}
                    <strong className="text-slate-600">X PPLG 3</strong>
                  </p>
                </div>
              ) : (
                <CustomDropdown
                  value={editingSiswa.kelas}
                  onChange={(newVal) => {
                    if (newVal === "__CUSTOM__") {
                      setIsCustomMode(true);
                      setEditingSiswa({
                        ...editingSiswa,
                        kelas: "",
                      });
                    } else {
                      setEditingSiswa({
                        ...editingSiswa,
                        kelas: newVal,
                      });
                    }
                  }}
                  groups={availableGroups}
                  className="w-full"
                  placeholder="Pilih Kelas & Jurusan"
                  icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingSiswa(null)}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/25 cursor-pointer active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
