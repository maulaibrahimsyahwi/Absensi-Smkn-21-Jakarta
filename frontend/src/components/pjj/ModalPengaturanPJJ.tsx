import React, { useState, useEffect, useMemo } from "react";
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Laptop,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  DAFTAR_KELAS_SMKN21,
  JURUSAN_SMKN21,
  KELAS_PER_JURUSAN,
} from "../../constants/schoolData";
import CustomDatePicker from "../CustomDatePicker";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../ui/Sheet";
import Button from "../ui/Button";
import { todayWib } from "../../utils/date";

export interface ModalPengaturanPJJProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (data?: any) => void;
}

const TINGKAT = ["X", "XI", "XII"] as const;
const kelasDi = (t: string) =>
  DAFTAR_KELAS_SMKN21.filter((k) => k.startsWith(`${t} `));

const PRESET = {
  SEMUA_PJJ: {
    tingkat: ["X", "XI", "XII"],
    ket: "Seluruh Siswa Pembelajaran Daring",
  },
  X_XI_PJJ: {
    tingkat: ["X", "XI"],
    ket: "Kelas X & XI PJJ (Kelas XII masuk sekolah)",
  },
  XII_ONLY_PJJ: {
    tingkat: ["XII"],
    ket: "Hanya Kelas XII PJJ (Kelas X & XI masuk sekolah)",
  },
} as const;

export default function ModalPengaturanPJJ({
  isOpen,
  onClose,
  onUpdated,
}: ModalPengaturanPJJProps): React.JSX.Element | null {
  const { isAdmin, todayStatus } = useAuth();
  const holidayStatus = todayStatus as any;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [isActive, setIsActive] = useState(false);
  const [kelasAktif, setKelasAktif] = useState<string[]>([]);
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // UI Accordion State per Jurusan
  const [expandedJurusan, setExpandedJurusan] = useState<
    Record<string, boolean>
  >({
    PPLG: false,
    AKL: false,
    MPLB: false,
    BR: false,
  });

  const todayStr = useMemo(() => todayWib(), [isOpen]);

  const defaultSchoolDayStr = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    while (dt.getDay() === 0 || dt.getDay() === 6) {
      dt.setDate(dt.getDate() + 1);
    }
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }, [todayStr]);

  // Derived Scope dari satu sumber kebenaran: kelasAktif
  const scope = useMemo(() => {
    const penuh = TINGKAT.filter((t) => {
      const l = kelasDi(t);
      return l.length > 0 && l.every((k) => kelasAktif.includes(k));
    });
    const tercakup = penuh.reduce((n, t) => n + kelasDi(t).length, 0);
    const tipe =
      kelasAktif.length === DAFTAR_KELAS_SMKN21.length
        ? "semua"
        : kelasAktif.length > 0 && tercakup === kelasAktif.length
          ? "tingkat"
          : "kelas";
    return { tingkat: penuh as unknown as string[], tipe };
  }, [kelasAktif]);

  // Fetch status PJJ saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    api
      .get("/pjj/status")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setIsActive(Boolean(d.is_active));

          const kelasServer: string[] = Array.isArray(d.kelas_aktif)
            ? d.kelas_aktif
            : [];
          setKelasAktif(
            kelasServer.length
              ? kelasServer
              : (Array.isArray(d.tingkat_aktif) ? d.tingkat_aktif : []).flatMap(
                  kelasDi,
                ),
          );

          let initialMulai = d.tanggal_mulai || defaultSchoolDayStr;
          if (initialMulai < todayStr) {
            initialMulai = defaultSchoolDayStr;
          }
          let initialSelesai = d.tanggal_selesai || initialMulai;
          if (initialSelesai < initialMulai) {
            initialSelesai = initialMulai;
          }

          setTanggalMulai(initialMulai);
          setTanggalSelesai(initialSelesai);
          setKeterangan(d.keterangan || "");
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil status PJJ:", err);
        setErrorMsg("Gagal memuat konfigurasi PJJ terkini dari server.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, todayStr, defaultSchoolDayStr]);

  const applyPreset = (name: keyof typeof PRESET) => {
    setErrorMsg("");
    setIsActive(true);
    setKelasAktif(PRESET[name].tingkat.flatMap(kelasDi));
    setKeterangan(PRESET[name].ket);
  };

  const toggleTingkat = (t: string) => {
    const l = kelasDi(t);
    setKelasAktif((prev) =>
      l.every((k) => prev.includes(k))
        ? prev.filter((k) => !l.includes(k))
        : Array.from(new Set([...prev, ...l])),
    );
  };

  const toggleKelas = (k: string) => {
    setKelasAktif((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  };

  const toggleJurusan = (kodeJurusan: string) => {
    const listKelas =
      (KELAS_PER_JURUSAN as Record<string, string[]>)[kodeJurusan] || [];
    const allSelected = listKelas.every((k) => kelasAktif.includes(k));
    if (allSelected) {
      setKelasAktif((prev) => prev.filter((k) => !listKelas.includes(k)));
    } else {
      setKelasAktif((prev) => Array.from(new Set([...prev, ...listKelas])));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg(
        "Akses ditolak: Hanya akun Administrator yang memiliki hak mengubah konfigurasi Mode PJJ.",
      );
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (isActive) {
        if (kelasAktif.length === 0) {
          setErrorMsg("Pilih minimal satu kelas untuk mode daring.");
          setSubmitting(false);
          return;
        }
        if (!tanggalMulai) {
          setErrorMsg("Tanggal mulai daring wajib dipilih.");
          setSubmitting(false);
          return;
        }
        if (!tanggalSelesai) {
          setErrorMsg("Tanggal selesai daring wajib dipilih.");
          setSubmitting(false);
          return;
        }
        if (tanggalMulai < todayStr) {
          setErrorMsg(
            "Tanggal mulai daring tidak boleh merupakan hari yang sudah berlalu.",
          );
          setSubmitting(false);
          return;
        }
        if (tanggalSelesai < tanggalMulai) {
          setErrorMsg(
            "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
          );
          setSubmitting(false);
          return;
        }

        // Cek jika hari libur sekolah resmi
        if (
          holidayStatus &&
          !holidayStatus.is_school_day &&
          tanggalMulai === holidayStatus.tanggal
        ) {
          const reason =
            holidayStatus.holiday_event?.nama ||
            (holidayStatus.is_weekend
              ? `Libur Akhir Pekan (${holidayStatus.nama_hari})`
              : "Hari Libur Sekolah");
          setErrorMsg(
            `Mode PJJ tidak dapat diaktifkan pada tanggal libur: ${holidayStatus.tanggal} (${reason}). Seluruh kegiatan belajar diliburkan.`,
          );
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        is_active: isActive,
        tipe_lingkup: scope.tipe,
        tingkat_aktif: scope.tingkat,
        kelas_aktif: kelasAktif,
        tanggal_mulai: tanggalMulai || todayStr,
        tanggal_selesai: tanggalSelesai || todayStr,
        keterangan:
          keterangan.trim() || (isActive ? "Mode PJJ Daring" : "Normal PTM"),
      };

      const res = await api.post("/pjj/settings", payload);
      if (res.data?.success) {
        setSuccessMsg(
          res.data.message || "Pengaturan Mode PJJ berhasil disimpan!",
        );
        if (onUpdated) {
          onUpdated(res.data.data);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(
          res.data?.message || "Server tidak menyimpan pengaturan. Coba lagi.",
        );
      }
    } catch (err: any) {
      console.error("Gagal memperbarui pengaturan PJJ:", err);
      setErrorMsg(
        err.response?.data?.message ||
          "Gagal menyimpan konfigurasi PJJ ke server.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="lg">
      <SheetHeader
        title="Pengaturan Mode Daring (PJJ)"
        subtitle="Pembelajaran Jarak Jauh Berdasarkan Kelas & Tingkat"
        icon={<Laptop className="w-5 h-5 text-indigo-600" />}
        onClose={onClose}
      />

      <SheetBody className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {holidayStatus && !holidayStatus.is_school_day && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 text-amber-950 rounded-2xl text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Hari Libur Sekolah ({holidayStatus.tanggal})</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong className="text-amber-950 font-extrabold underline decoration-amber-400">
                {holidayStatus.holiday_event?.nama ||
                  (holidayStatus.is_weekend
                    ? `Libur Akhir Pekan (${holidayStatus.nama_hari})`
                    : "Hari Libur Sekolah")}
              </strong>{" "}
              Seluruh kegiatan presensi dan operasional belajar diliburkan.
            </p>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs">Memuat konfigurasi PJJ...</p>
          </div>
        ) : (
          <form id="pjj-form" onSubmit={handleSubmit}>
            <fieldset disabled={!isAdmin} className="min-w-0 space-y-4">
              {/* TOGGLE STATUS UTAMA */}
              <div
                className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-4 ${
                  isActive
                    ? "bg-indigo-50/70 border-indigo-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isActive ? (
                      <Wifi className="w-5 h-5" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Status Pembelajaran Daring{" "}
                      <span className="text-xs font-semibold text-indigo-600 ml-1">
                        {isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isActive
                        ? "Siswa pada kelas terpilih diizinkan presensi dari rumah"
                        : "Seluruh siswa wajib presensi langsung di sekolah"}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Mode daring"
                    checked={isActive}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsActive(val);
                      if (val && kelasAktif.length === 0) {
                        applyPreset("SEMUA_PJJ");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isActive && (
                <>
                  {/* 1. TOGGLE PER TINGKAT (X, XI, XII) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tingkat Kelas
                    </label>

                    <div className="grid grid-cols-3 gap-2.5">
                      {TINGKAT.map((tingkat) => {
                        const isTingkatActive = scope.tingkat.includes(tingkat);
                        return (
                          <button
                            key={tingkat}
                            type="button"
                            onClick={() => toggleTingkat(tingkat)}
                            className={`min-h-11 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isTingkatActive
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>Kelas {tingkat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. RINCIAN PER JURUSAN & KELAS */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    <div className="bg-slate-100/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>
                        {kelasAktif.length} dari {DAFTAR_KELAS_SMKN21.length}{" "}
                        Kelas
                      </span>
                    </div>

                    {Object.entries(KELAS_PER_JURUSAN).map(
                      ([kodeJurusan, listKelas]) => {
                        const jurInfo = (JURUSAN_SMKN21 as any[]).find(
                          (j) => j.kode === kodeJurusan,
                        ) || {
                          nama: kodeJurusan,
                        };
                        const isExpanded = expandedJurusan[kodeJurusan];
                        const selectedInJurusan = listKelas.filter((k) =>
                          kelasAktif.includes(k),
                        ).length;
                        const allInJurusan =
                          listKelas.length === selectedInJurusan;

                        return (
                          <div key={kodeJurusan} className="bg-white">
                            <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleJurusan(kodeJurusan)}
                                  className="min-h-11 min-w-11 inline-flex items-center justify-center text-slate-500 hover:text-indigo-600 cursor-pointer"
                                  title={
                                    allInJurusan
                                      ? "Hapus semua kelas"
                                      : "Pilih semua kelas"
                                  }
                                >
                                  {allInJurusan ? (
                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-300" />
                                  )}
                                </button>
                                <div
                                  onClick={() =>
                                    setExpandedJurusan((prev) => ({
                                      ...prev,
                                      [kodeJurusan]: !prev[kodeJurusan],
                                    }))
                                  }
                                  className="cursor-pointer min-w-0"
                                >
                                  <span className="font-bold text-xs text-slate-800">
                                    {kodeJurusan}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-1.5 truncate hidden sm:inline">
                                    {jurInfo.nama}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                    selectedInJurusan > 0
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {selectedInJurusan} / {listKelas.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedJurusan((prev) => ({
                                      ...prev,
                                      [kodeJurusan]: !prev[kodeJurusan],
                                    }))
                                  }
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Kelas Grid saat Accordion Terbuka */}
                            {isExpanded && (
                              <div className="p-3.5 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {listKelas.map((kelas) => {
                                  const isSelected = kelasAktif.includes(kelas);
                                  return (
                                    <button
                                      key={kelas}
                                      type="button"
                                      onClick={() => toggleKelas(kelas)}
                                      className={`min-h-10 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{kelas}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* 3. PERIODE WAKTU & KETERANGAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tanggal Mulai <span className="text-rose-500">*</span>
                      </label>
                      <CustomDatePicker
                        className="w-full"
                        value={tanggalMulai}
                        onChange={(val: string) => {
                          setTanggalMulai(val);
                          if (tanggalSelesai && val > tanggalSelesai) {
                            setTanggalSelesai(val);
                          }
                        }}
                        minDate={todayStr}
                        disableWeekends={true}
                        placeholder="Pilih tanggal mulai..."
                        align="left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tanggal Selesai <span className="text-rose-500">*</span>
                      </label>
                      <CustomDatePicker
                        className="w-full"
                        value={tanggalSelesai}
                        onChange={(val: string) => setTanggalSelesai(val)}
                        minDate={tanggalMulai || todayStr}
                        disableWeekends={true}
                        placeholder="Pilih tanggal selesai..."
                        align="right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan Kebijakan Daring
                    </label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Persiapan Ruang Ujian LSP / Cuaca Ekstrem / Renovasi Lab"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </fieldset>
          </form>
        )}
      </SheetBody>

      <SheetFooter className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        {isAdmin ? (
          <Button
            type="submit"
            form="pjj-form"
            variant="primary"
            loading={submitting}
            disabled={loading}
          >
            Simpan Perubahan
          </Button>
        ) : (
          <span className="text-xs text-amber-600 font-semibold px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
            Mode Lihat (Hanya Admin)
          </span>
        )}
      </SheetFooter>
    </Sheet>
  );
}
