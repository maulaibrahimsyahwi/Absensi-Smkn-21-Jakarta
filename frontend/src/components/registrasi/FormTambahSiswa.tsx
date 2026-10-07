import React, { useState, useEffect } from "react";
import Webcam from "react-webcam";
import {
  UserPlus,
  Camera,
  X,
  RefreshCw,
} from "lucide-react";
import { Siswa } from "../../types/siswa";
import SegmentedControl from "../ui/SegmentedControl";
import Button from "../ui/Button";
import Field, { INPUT_CLASS } from "../ui/Field";
import KelasPicker from "./KelasPicker";

export interface FormTambahSiswaProps {
  nis: string;
  setNis: (v: string) => void;
  nama: string;
  setNama: (v: string) => void;
  kelas: string;
  setKelas: (v: string) => void;
  jenisKelamin?: string;
  setJenisKelamin?: (v: string) => void;
  samples: string[];
  currentSlot: number;
  setCurrentSlot: (slot: number) => void;
  webcamRef: React.RefObject<any>;
  takeSamplePhoto: () => void;
  removeSample: (idx: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  reRecordingSiswa: Siswa | null;
  onCancelReRecord: () => void;
  siswaList?: Siswa[];
}

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
  siswaList = [],
}: FormTambahSiswaProps) {
  const [consent, setConsent] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState("");
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setConsent(false);
  }, [reRecordingSiswa]);

  // Otomatis pindah ke slot kosong berikutnya setelah foto diambil
  useEffect(() => {
    const next = [0, 1, 2].find((i) => !samples[i]);
    if (next !== undefined) setCurrentSlot(next);
  }, [samples.length, setCurrentSlot]);

  const shoot = () => {
    takeSamplePhoto();
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
  };

  const ready = samples.length >= 3 && consent;

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
        <div className="space-y-4 mb-5">
          {/* NIS Input */}
          <Field
            label="Nomor Induk Siswa (NIS)"
            required
            hint="4-18 digit angka. NIS digunakan sebagai kredensial login default."
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={18}
              minLength={4}
              required
              placeholder="Contoh: 20261001"
              value={nis}
              onChange={(e) => setNis(e.target.value.replace(/\D/g, ""))}
              disabled={reRecordingSiswa !== null}
              className={`${INPUT_CLASS} font-mono`}
            />
            {nis.length > 0 && nis.length < 4 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                * NIS minimal 4 digit angka
              </p>
            )}

            {!reRecordingSiswa &&
              nis.length >= 3 &&
              (() => {
                const matched = siswaList.find((s) => s.nis === nis);
                if (!matched) return null;
                const hasNoBiometric = !matched.terdaftar;
                return (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                      hasNoBiometric
                        ? "bg-blue-50/80 border-blue-200 text-blue-800"
                        : "bg-amber-50/80 border-amber-200 text-amber-800"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="font-bold truncate">{matched.nama}</p>
                      <p className="text-[11px] text-slate-500">
                        {matched.kelas} &bull;{" "}
                        {hasNoBiometric
                          ? "Terdaftar Dapodik (Belum ada foto wajah)"
                          : "Sudah terdaftar di sistem"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNama(matched.nama);
                        setKelas(matched.kelas);
                        if (setJenisKelamin)
                          setJenisKelamin(matched.jenis_kelamin || "Laki-laki");
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
                    >
                      Isi Otomatis
                    </button>
                  </div>
                );
              })()}
          </Field>

          {/* Nama Lengkap */}
          <Field
            label="Nama Lengkap Siswa"
            required
            hint="Sesuai dokumen resmi sekolah atau ijazah."
          >
            <input
              type="text"
              required
              minLength={3}
              placeholder="Contoh: Muhammad Rizky Pratama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={reRecordingSiswa !== null}
              className={INPUT_CLASS}
            />
          </Field>

          {/* Jenis Kelamin via SegmentedControl */}
          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-700">
              Jenis Kelamin <span className="text-rose-500">*</span>
            </p>
            <SegmentedControl
              ariaLabel="Pilih jenis kelamin"
              value={jenisKelamin as "Laki-laki" | "Perempuan"}
              onChange={(val) => setJenisKelamin && setJenisKelamin(val)}
              options={[
                { value: "Laki-laki", label: "Laki-laki (Siswa)" },
                { value: "Perempuan", label: "Perempuan (Siswi)" },
              ]}
            />
          </div>

          {/* Pemilih Kelas dengan KelasPicker */}
          <KelasPicker
            value={kelas}
            onChange={setKelas}
            siswaList={siswaList}
            disabled={reRecordingSiswa !== null}
            resetKey={reRecordingSiswa?.id}
          />
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
                facingMode: facing,
                width: 640,
                height: 480,
              }}
              onUserMedia={() => setCamError("")}
              onUserMediaError={() =>
                setCamError(
                  "Kamera tidak dapat diakses. Izinkan akses kamera pada pengaturan browser.",
                )
              }
              className="w-full h-full object-cover"
            />
            {camError && (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center text-sm text-slate-200">
                {camError}
              </div>
            )}
            {flash && (
              <div className="absolute inset-0 bg-white animate-in fade-in duration-75 pointer-events-none" />
            )}

            {/* Switch Camera Button (Front/Back) */}
            <button
              type="button"
              onClick={() =>
                setFacing((f) => (f === "user" ? "environment" : "user"))
              }
              aria-label="Ganti kamera depan atau belakang"
              className="press absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Viewfinder guides */}
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
            onClick={shoot}
            className="w-full mt-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer min-h-11"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil Foto {currentSlot + 1}</span>
          </button>
        </div>

        {/* 3 Slot Sampel Wajah (Multi-Sample Preview) */}
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
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
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlot(idx)}
                  aria-label={`Foto ${idx + 1}${photo ? " (terisi)" : " (kosong)"}`}
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
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Hapus foto ${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSample(idx);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            removeSample(idx);
                          }
                        }}
                        className="absolute top-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-transform shadow-xs cursor-pointer"
                        title="Hapus Sampel Ini"
                      >
                        <X className="w-4 h-4" />
                      </span>
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Persetujuan Perekaman Biometrik (UU PDP No. 27/2022 Pasal 25) */}
        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs leading-relaxed text-slate-700">
            Persetujuan orang tua / wali untuk perekaman data biometrik wajah
            siswa ini sudah diterima (sesuai UU PDP No. 27/2022 Pasal 25).
          </span>
        </label>

        {/* Submit Button Sticky */}
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] -mx-4 mt-4 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 xl:bottom-0 border-t border-slate-100">
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!ready}
            className="w-full min-h-12"
          >
            {reRecordingSiswa ? "Perbarui Wajah" : "Simpan Siswa"}
          </Button>
        </div>
      </form>
    </div>
  );
}
