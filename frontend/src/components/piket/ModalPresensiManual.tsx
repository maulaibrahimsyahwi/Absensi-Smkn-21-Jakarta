import React, { useState, useEffect, useRef } from "react";
import {
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  X,
  User,
  ShieldAlert,
} from "lucide-react";
import api from "../../services/api";
import { Siswa } from "../../types/auth";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../ui/Sheet";
import CustomDropdown, { DropdownOption } from "../CustomDropdown";
import Button from "../ui/Button";
import InlineAlert from "../ui/InlineAlert";
import Field, { INPUT_CLASS } from "../ui/Field";

const PILIHAN_ALASAN_OVERRIDE = [
  "Kendala Sensor Kamera / Biometrik Rusak",
  "Luka / Perban Medis pada Wajah Siswa",
  "Baterai HP Siswa Mati Total / Tidak Membawa HP",
  "Kartu Pelajar Fisik Tertinggal / Hilang",
  "Siswa Baru / Biometrik Belum Terdaftar",
  "Lainnya (Kondisi Khusus Meja Piket)",
];

const ALASAN_OPTIONS: DropdownOption[] = PILIHAN_ALASAN_OVERRIDE.map((opt) => ({
  value: opt,
  label: opt,
}));

export interface ModalPresensiManualProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function ModalPresensiManual({
  isOpen,
  onClose,
  onSuccess,
}: ModalPresensiManualProps): React.JSX.Element | null {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentList, setStudentList] = useState<Siswa[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [statusPresensi, setStatusPresensi] = useState("Hadir");
  const [alasanOverride, setAlasanOverride] = useState(
    PILIHAN_ALASAN_OVERRIDE[0],
  );
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

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
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const filtered = raw.filter(
          (s: any) => s.status !== "Alumni",
        );
        setStudentList(filtered);
        setIsDropdownOpen(filtered.length > 0);
      } catch (err) {
        console.warn("Gagal mencari data siswa:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [studentSearch, selectedStudent]);

  // Handle Select Student
  const handleSelectStudent = (siswa: Siswa) => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan sistem saat menyimpan presensi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      labelledBy="presensi-manual-title"
    >
      <SheetHeader
        id="presensi-manual-title"
        title="Presensi Manual Meja Piket"
        subtitle="Pencatatan darurat bagi siswa berkendala biometrik"
        icon={
          <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-700 border border-blue-500/20 shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <SheetBody>
          <div className="space-y-4 text-xs">
            {errorMsg && (
              <InlineAlert type="error" title="Gagal Menyimpan">
                {errorMsg}
              </InlineAlert>
            )}

            {/* Cari Siswa */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-700">
                Cari Identitas Siswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    if (selectedStudent) setSelectedStudent(null);
                  }}
                  placeholder="Ketik NIS atau nama lengkap siswa..."
                  className={`${INPUT_CLASS} pl-10 pr-9`}
                  required
                />
                {selectedStudent ? (
                  <button
                    type="button"
                    onClick={handleClearStudent}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : isSearching ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}
              </div>

              {/* Dropdown Hasil Pencarian */}
              {isDropdownOpen && studentList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-100">
                  {studentList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="w-full p-3 text-left hover:bg-blue-50/70 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 text-xs truncate">{s.nama}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          NIS: {s.nis} &bull; <span className="font-semibold text-slate-700">{s.kelas}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 shrink-0">
                        Pilih
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Kartu Siswa Terpilih */}
            {selectedStudent && (
              <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {selectedStudent.nama}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      NIS: {selectedStudent.nis} &bull; <span className="font-semibold text-slate-700">{selectedStudent.kelas}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terpilih
                </span>
              </div>
            )}

            {/* Status Presensi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Status Presensi Hari Ini <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusPresensi("Hadir")}
                  className={`press p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    statusPresensi === "Hadir"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100/70"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Hadir Tepat Waktu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusPresensi("Terlambat")}
                  className={`press p-3 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    statusPresensi === "Terlambat"
                      ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100/70"
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Terlambat Masuk</span>
                </button>
              </div>
            </div>

            {/* Alasan Override */}
            <Field label="Alasan Manual Override" required>
              <CustomDropdown
                value={alasanOverride}
                onChange={setAlasanOverride}
                options={ALASAN_OPTIONS}
                className="w-full"
              />
            </Field>

            {/* Catatan Tambahan */}
            <Field label="Catatan Saksi Petugas Piket (Opsional)">
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Rincian kondisi fisik / saksi guru piket yang bertugas..."
                className={`${INPUT_CLASS} min-h-16 py-2 text-xs font-medium focus:border-blue-500 focus:ring-blue-500/20 resize-none`}
              />
            </Field>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            icon={<UserCheck className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20"
          >
            Simpan Presensi Manual
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
