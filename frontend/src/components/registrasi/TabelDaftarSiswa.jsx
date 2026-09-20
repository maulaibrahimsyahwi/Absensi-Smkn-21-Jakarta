import React from "react";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  GraduationCap,
  Trash2,
  Edit2,
  Camera,
  KeyRound,
  PenTool,
  UserCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import CustomDropdown from "../CustomDropdown";
import { getJurusanInfo } from "../../constants/schoolData";

export default function TabelDaftarSiswa({
  siswaList,
  filteredSiswa,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  kelasFilter,
  setKelasFilter,
  uniqueKelas,
  selectedIds,
  isAllSelected,
  isSomeSelected,
  toggleSelectAll,
  toggleSelectSiswa,
  totalAktif,
  totalAlumni,
  totalKelasXIIAktif,
  onLuluskanTingkatXII,
  onLuluskanSelected,
  onLuluskanSingle,
  onAktifkanSingle,
  onReRecord,
  onEdit,
  onDelete,
  onResetPassword,
  onResetFace,
  onResetSignature,
  onBulkDelete,
}) {
  return (
    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col">
      {/* Title & Stats */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Daftar Siswa Terdaftar
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Total {siswaList.length} Siswa
          </span>
        </div>
      </div>

      {/* Filter Status Siswa Tabs (Semua, Aktif, Alumni) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-3.5 self-start overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Semua ({siswaList.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("Aktif")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusFilter === "Aktif"
              ? "bg-white text-emerald-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Aktif ({totalAktif})</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("Alumni")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            statusFilter === "Alumni"
              ? "bg-white text-indigo-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Alumni / Lulus ({totalAlumni})</span>
        </button>
      </div>

      {/* Search, Filter Kelas, & Tombol Cepat Luluskan Kelas XII */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIS, atau kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <CustomDropdown
            value={kelasFilter}
            onChange={setKelasFilter}
            options={[
              { value: "ALL", label: "Semua Kelas" },
              ...uniqueKelas.map((k) => ({ value: k, label: k })),
            ]}
            icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
            className="w-full sm:w-auto"
            align="right"
          />

          <button
            type="button"
            onClick={onLuluskanTingkatXII}
            disabled={totalKelasXIIAktif === 0}
            title={
              totalKelasXIIAktif > 0
                ? `Luluskan sekaligus ${totalKelasXIIAktif} siswa kelas XII yang aktif`
                : "Tidak ada siswa kelas XII yang aktif"
            }
            className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">Luluskan Kelas XII</span>
            <span className="sm:hidden">Luluskan XII</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {totalKelasXIIAktif}
            </span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Bulk Action Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-blue-900">
              Siswa Terpilih
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLuluskanSelected}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Luluskan Terpilih</span>
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Mobile Cards View (< md) */}
      <div className="md:hidden divide-y divide-slate-100 max-h-[560px] overflow-y-auto border border-slate-100 rounded-xl">
        {filteredSiswa.length === 0 ? (
          <div className="text-center py-12 text-slate-400 p-4">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="font-semibold text-slate-600 text-xs">
              Tidak ada siswa ditemukan
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Coba ubah kata kunci atau filter status/kelas.
            </p>
          </div>
        ) : (
          filteredSiswa.map((s) => {
            const jurInfo = getJurusanInfo(s.kelas);
            const isSelected = selectedIds.includes(s.id);
            const isAlumni = s.status === "Alumni";

            return (
              <div
                key={s.id}
                className={`p-3.5 transition-colors ${
                  isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectSiswa(s.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 cursor-pointer"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {s.nama}
                      </p>

                      {isAlumni ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span>Alumni</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        NIS {s.nis}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {s.kelas}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${jurInfo.badge}`}
                      >
                        {jurInfo.kode}
                      </span>
                    </div>
                  </div>

                  {s.terdaftar ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{s.sample_count || 1} Foto</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                      Belum Ada
                    </span>
                  )}
                </div>

                {/* Tombol Aksi Touch-Friendly di Mobile */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                  {isAlumni ? (
                    <button
                      type="button"
                      onClick={() => onAktifkanSingle(s)}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Aktifkan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onLuluskanSingle(s)}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Luluskan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onReRecord(s)}
                    className="py-1.5 px-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Rekam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(s)}
                    className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onResetPassword(s)}
                    className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset Password ke Default (NIS)"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Sandi</span>
                  </button>

                  {s.face_encoding && (
                    <button
                      type="button"
                      onClick={() => onResetFace(s)}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reset Biometrik Wajah"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Reset Wajah</span>
                    </button>
                  )}

                  {s.tanda_tangan && (
                    <button
                      type="button"
                      onClick={() => onResetSignature(s)}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reset Tanda Tangan"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Reset TTD</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                    title="Hapus Permanen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[560px] flex-1 border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse text-xs min-w-[580px]">
          <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 z-10">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  title="Pilih Semua Siswa pada Daftar"
                />
              </th>
              <th className="p-3">Siswa</th>
              <th className="p-3">Kelas & Status</th>
              <th className="p-3">Biometrik Wajah</th>
              <th className="p-3 text-right">Kelola / Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSiswa.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-400">
                  Tidak ada siswa ditemukan.
                </td>
              </tr>
            ) : (
              filteredSiswa.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                const isAlumni = s.status === "Alumni";

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSiswa(s.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{s.nama}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        NIS {s.nis}
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs">
                          {s.kelas}
                        </span>
                        {isAlumni ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span>Alumni</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span>Aktif</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {s.terdaftar ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>{s.sample_count || 1} Foto</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAlumni ? (
                          <button
                            title="Aktifkan Kembali Siswa Ini"
                            onClick={() => onAktifkanSingle(s)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-emerald-200 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            title="Luluskan Siswa Ini ke Status Alumni"
                            onClick={() => onLuluskanSingle(s)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-200 cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          title="Rekam Ulang Sampel Wajah"
                          onClick={() => onReRecord(s)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200/60 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        <button
                          title="Edit Data Siswa"
                          onClick={() => onEdit(s)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          title={`Reset Kata Sandi ${s.nama} ke Default (NIS ${s.nis})`}
                          onClick={() => onResetPassword(s)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors border border-amber-200 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {s.face_encoding && (
                          <button
                            title={`Reset Biometrik Wajah ${s.nama}`}
                            onClick={() => onResetFace(s)}
                            className="p-1.5 rounded-lg text-cyan-700 hover:bg-cyan-50 transition-colors border border-cyan-200 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {s.tanda_tangan && (
                          <button
                            title={`Reset Tanda Tangan Digital ${s.nama}`}
                            onClick={() => onResetSignature(s)}
                            className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors border border-purple-200 cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          title="Hapus Permanen dari Database"
                          onClick={() => onDelete(s)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
