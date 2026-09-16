import React from "react";
import { X, GraduationCap } from "lucide-react";
import CustomDropdown from "../CustomDropdown";

export default function EditSiswaModal({
  editingSiswa,
  setEditingSiswa,
  handleUpdateSiswa,
  groups,
}) {
  if (!editingSiswa) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Edit Data Siswa</h3>
          <button
            onClick={() => setEditingSiswa(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4 cursor-pointer" />
          </button>
        </div>
        <form onSubmit={handleUpdateSiswa}>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Induk Siswa (NIS)
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
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                type="text"
                required
                value={editingSiswa.nama}
                onChange={(e) =>
                  setEditingSiswa({ ...editingSiswa, nama: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kelas & Jurusan SMKN 21
              </label>
              <CustomDropdown
                value={editingSiswa.kelas}
                onChange={(newVal) =>
                  setEditingSiswa({
                    ...editingSiswa,
                    kelas: newVal,
                  })
                }
                groups={groups}
                className="w-full"
                placeholder="Pilih Kelas & Jurusan"
                icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setEditingSiswa(null)}
              className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
