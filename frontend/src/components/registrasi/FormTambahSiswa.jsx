import React, { useState, useMemo, useEffect } from "react";
import Webcam from "react-webcam";
import {
  UserPlus,
  Camera,
  GraduationCap,
  X,
  Loader2,
  PenTool,
  ArrowLeft,
} from "lucide-react";
import CustomDropdown from "../CustomDropdown";
import {
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
} from "../../constants/schoolData";

export default function FormTambahSiswa({
  nis,
  setNis,
  nama,
  setNama,
  kelas,
  setKelas,
  jenisKelamin = "Laki-laki",
  setJenisKelamin,
  samples,
  currentSlot,
  setCurrentSlot,
  webcamRef,
  takeSamplePhoto,
  removeSample,
  onSubmit,
  submitting,
  reRecordingSiswa,
  onCancelReRecord,
  siswaList,
}) {
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Jika sedang re-record atau nilai kelas awal tidak ada di master baku, aktifkan custom mode jika perlu
  useEffect(() => {
    if (kelas && !DAFTAR_KELAS_SMKN21.includes(kelas)) {
      setIsCustomMode(true);
    }
  }, [reRecordingSiswa]);

  // Kelompok opsi dropdown cerdas: Master bawaan + Kelas Tambahan yang sudah ada di DB + Opsi Ketik Baru
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

    const groups = [...KELAS_GROUPS_DROPDOWN];

    if (extraClasses.length > 0) {
      groups.push({
        group: "Kelas Tambahan Terdaftar",
        badge: "AKTIF",
        badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
        options: extraClasses.map((k) => ({ value: k, label: k })),
      });
    }

    groups.push({
      group: "Opsi Tambahan",
      badge: "+",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      options: [
        {
          value: "__CUSTOM__",
          label: "+ Ketik Kelas Baru...",
        },
      ],
    });

    return groups;
  }, [siswaList]);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            {reRecordingSiswa
              ? `Rekam Ulang Wajah ${reRecordingSiswa.nama}`
              : "Daftarkan Siswa & Sampel Wajah"}
          </h2>
        </div>
        {reRecordingSiswa && (
          <button
            type="button"
            onClick={onCancelReRecord}
            className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
          >
            Batal
          </button>
        )}
      </div>

      <form onSubmit={onSubmit}>
        <div className="space-y-3.5 mb-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Nomor Induk Siswa (NIS)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Hanya angka (4-18 digit)
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="Contoh: 20261001"
              value={nis}
              onChange={(e) => setNis(e.target.value.replace(/\D/g, ""))}
              disabled={reRecordingSiswa !== null}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 disabled:bg-slate-100 font-mono"
            />
            {nis.length > 0 && nis.length < 4 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                * NIS minimal 4 digit angka
              </p>
            )}
            {!reRecordingSiswa &&
              siswaList.some((s) => s.nis === nis) &&
              nis.length >= 4 && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  * NIS {nis} sudah terdaftar di database
                </p>
              )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Nama Lengkap Siswa
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Minimal 3 karakter
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="Contoh: Muhammad Rizky Pratama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={reRecordingSiswa !== null}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 disabled:bg-slate-100"
            />
            {nama.trim().length > 0 && nama.trim().length < 3 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                * Nama minimal 3 karakter huruf
              </p>
            )}
          </div>

          {/* Pilihan Gender / Jenis Kelamin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Jenis Kelamin & Panggilan
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Pilih Siswa (Cowo) / Siswi (Cewe)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenisKelamin && setJenisKelamin("Laki-laki")}
                disabled={reRecordingSiswa !== null}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  jenisKelamin === "Laki-laki"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>👦 Laki-laki (Siswa)</span>
              </button>
              <button
                type="button"
                onClick={() => setJenisKelamin && setJenisKelamin("Perempuan")}
                disabled={reRecordingSiswa !== null}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  jenisKelamin === "Perempuan"
                    ? "bg-pink-50 border-pink-500 text-pink-700 shadow-xs ring-2 ring-pink-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>👧 Perempuan (Siswi)</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Menentukan sapaan resmi di sistem (Siswa untuk laki-laki, Siswi untuk perempuan).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Kelas & Jurusan SMKN 21
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(!isCustomMode);
                  if (!isCustomMode) {
                    setKelas("");
                  }
                }}
                disabled={reRecordingSiswa !== null}
                className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                {isCustomMode ? "Pilih dari Dropdown" : "+ Ketik Kelas Baru"}
              </button>
            </div>

            {isCustomMode ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder="Contoh: X PPLG atau X PPLG 3"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value.toUpperCase())}
                  disabled={reRecordingSiswa !== null}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold uppercase border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50/20 font-mono tracking-wide"
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
                value={kelas}
                onChange={(val) => {
                  if (val === "__CUSTOM__") {
                    setIsCustomMode(true);
                    setKelas("");
                  } else {
                    setKelas(val);
                  }
                }}
                groups={availableGroups}
                disabled={reRecordingSiswa !== null}
                className="w-full"
                placeholder="Pilih Kelas & Jurusan SMKN 21"
                icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
              />
            )}
          </div>
        </div>

        {/* Area Kamera */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              Kamera Perekam Sampel
            </label>
            <span className="text-[11px] text-blue-600 font-semibold">
              Foto {currentSlot + 1} dari 3
            </span>
          </div>

          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: "user",
                width: 640,
                height: 480,
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between p-1">
                <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
              </div>
              <div className="flex justify-between p-1">
                <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
              </div>
            </div>

            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span className="bg-black/70 text-slate-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                {currentSlot === 0
                  ? "Tampak Depan"
                  : currentSlot === 1
                    ? "Sedikit Miring Kiri"
                    : "Sedikit Miring Kanan"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={takeSamplePhoto}
            className="w-full mt-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil Foto {currentSlot + 1}</span>
          </button>
        </div>

        {/* 3 Slot Sampel Wajah (Multi-Sample Preview) */}
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">
              Sampel Terkumpul ({samples.length}/3)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => {
              const photo = samples[idx];
              const isCurrent = currentSlot === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentSlot(idx)}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${
                    isCurrent
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50"
                      : photo
                        ? "border-emerald-400 bg-white"
                        : "border-dashed border-slate-300 bg-white"
                  }`}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo}
                        alt={`Sampel ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSample(idx);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 active:scale-90 transition-transform shadow-sm cursor-pointer"
                        title="Hapus Sampel Ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                        #{idx + 1}
                      </span>
                    </>
                  ) : (
                    <div className="text-center p-1">
                      <Camera className="w-4 h-4 mx-auto text-slate-300 mb-1" />
                      <span className="text-[10px] font-semibold text-slate-400">
                        Foto {idx + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || samples.length === 0}
          className="w-full py-3 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>{reRecordingSiswa ? `Perbarui Wajah` : `Simpan`}</span>
          )}
        </button>
      </form>
    </div>
  );
}
