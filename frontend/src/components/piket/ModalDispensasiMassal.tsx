import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import api from "../../services/api";
import { DAFTAR_KELAS_SMKN21 } from "../../constants/schoolData";
import { Siswa } from "../../types/auth";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../ui/Sheet";
import CustomDropdown, { DropdownOption } from "../CustomDropdown";
import Button from "../ui/Button";
import InlineAlert from "../ui/InlineAlert";
import Field, { INPUT_CLASS } from "../ui/Field";

export interface ModalDispensasiMassalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const TIPE_IZIN_OPTIONS: DropdownOption[] = [
  { value: "Izin Meninggalkan Kelas", label: "Izin Meninggalkan Kelas" },
  { value: "Izin Masuk", label: "Izin Masuk (Terlambat Khusus)" },
];

export default function ModalDispensasiMassal({
  isOpen,
  onClose,
  onSuccess,
}: ModalDispensasiMassalProps): React.JSX.Element | null {
  const [allStudents, setAllStudents] = useState<Siswa[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(
    new Set(),
  );

  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [tipeIzin, setTipeIzin] = useState("Izin Meninggalkan Kelas");
  const [jamKe, setJamKe] = useState("1 - Selesai");
  const [guruPendamping, setGuruPendamping] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const kelasOptions: DropdownOption[] = useMemo(
    () => [
      { value: "ALL", label: "Semua Kelas" },
      ...DAFTAR_KELAS_SMKN21.map((k) => ({ value: k, label: k })),
    ],
    [],
  );

  // Ambil daftar siswa aktif
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingStudents(true);
    api
      .get("/siswa", { params: { limit: 1000 } })
      .then((res) => {
        if (isMounted && res.data) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
          const activeOnly = raw.filter((s: any) => s.status !== "Alumni");
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
  }, [isOpen]);

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

  const toggleSelectStudent = (id: number | string) => {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
          onSuccess(
            res.data.message ||
              `Dispensasi diterbitkan untuk ${selectedIds.size} siswa.`,
          );
        }
        onClose();
      } else {
        setErrorMsg(
          res.data?.message || "Gagal menerbitkan dispensasi massal.",
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kendala saat menerbitkan dispensasi massal.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      labelledBy="dispensasi-massal-title"
    >
      <SheetHeader
        id="dispensasi-massal-title"
        title="Dispensasi Massal Delegasi & Lomba"
        subtitle="LKS, O2SN, Paskibra, OSIS, atau Tugas Resmi Sekolah"
        icon={
          <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-700 border border-purple-500/20 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <SheetBody>
          <div className="space-y-4 text-xs">
            {errorMsg && (
              <InlineAlert type="error" title="Perhatian">
                {errorMsg}
              </InlineAlert>
            )}

            {/* Form Informasi Kegiatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Nama Kegiatan / Delegasi" required>
                <input
                  type="text"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="Contoh: LKS Web Tech Wilayah Jakarta Pusat"
                  className={INPUT_CLASS}
                  required
                />
              </Field>

              <Field label="Guru Pendamping / Pembina" required>
                <input
                  type="text"
                  value={guruPendamping}
                  onChange={(e) => setGuruPendamping(e.target.value)}
                  placeholder="Nama guru penanggung jawab"
                  className={INPUT_CLASS}
                  required
                />
              </Field>

              <Field label="Keperluan Dispensasi">
                <CustomDropdown
                  value={tipeIzin}
                  onChange={setTipeIzin}
                  options={TIPE_IZIN_OPTIONS}
                  className="w-full"
                />
              </Field>

              <Field label="Jam Pelajaran Ke-">
                <input
                  type="text"
                  value={jamKe}
                  onChange={(e) => setJamKe(e.target.value)}
                  placeholder="Contoh: 1 - Selesai atau 3 s/d 6"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            {/* Area Pemilihan Siswa Delegasi */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Pilih Siswa Delegasi
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                      {selectedIds.size} Terpilih
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Centang siswa yang berpartisipasi dalam tugas delegasi ini
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="press px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Pilih Semua ({filteredStudents.length})
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="press px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Kelas & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau NIS siswa..."
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
                <div>
                  <CustomDropdown
                    value={filterKelas}
                    onChange={setFilterKelas}
                    options={kelasOptions}
                    placeholder="Filter Kelas"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Daftar Siswa (Elevated Checklist Cards) */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-56 overflow-y-auto overscroll-contain bg-slate-50/40 divide-y divide-slate-100/90 shadow-inner">
                {loadingStudents ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">
                      Memuat data siswa SMKN 21...
                    </span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada data siswa yang cocok dengan kriteria pencarian.
                  </div>
                ) : (
                  filteredStudents.map((s) => {
                    const isChecked = selectedIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSelectStudent(s.id)}
                        className={`p-3 flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? "bg-purple-50/90 hover:bg-purple-100/70"
                            : "hover:bg-slate-100/70 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                              isChecked
                                ? "bg-purple-600 border-purple-600 text-white shadow-xs shadow-purple-600/30"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">
                              {s.nama}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {s.nis} &bull;{" "}
                              <span className="font-semibold text-slate-700">
                                {s.kelas}
                              </span>
                            </p>
                          </div>
                        </div>
                        {isChecked && (
                          <span className="text-[10px] font-extrabold text-purple-700 px-2 py-0.5 rounded-full bg-purple-100/80 border border-purple-200 shrink-0">
                            Terpilih
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <span className="text-xs text-slate-500 font-medium">
              Total <b>{selectedIds.size} slip E-Dispensasi</b> akan otomatis
              dibuat resmi.
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
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
                disabled={selectedIds.size === 0}
                icon={<UserCheck className="w-4 h-4" />}
                className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20"
              >
                Terbitkan ({selectedIds.size} Siswa)
              </Button>
            </div>
          </div>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
