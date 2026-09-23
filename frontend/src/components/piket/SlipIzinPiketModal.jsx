import React, { useRef } from "react";
import { Printer, X, CheckCircle2, ShieldCheck } from "lucide-react";
import logoSMKN21 from "../../assets/Logo SMKN21.png";

export default function SlipIzinPiketModal({ slipData, isOpen, onClose }) {
  const printRef = useRef(null);

  if (!isOpen || !slipData) return null;

  const isIzinMasuk = slipData.tipe === "Izin Masuk";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 print:p-0 print:bg-white print:static">
      {/* Container Dialog */}
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-7 relative print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full">
        {/* Tombol Close & Print (Disembunyikan saat dicetak) */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span>Surat Izin Resmi Diterbitkan</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Surat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= AREA SLIP RESMI (MIRIP DOKUMEN FISIK ASLI) ================= */}
        <div
          ref={printRef}
          className="p-3.5 sm:p-6 bg-white border border-slate-300 rounded-xl text-slate-900 font-serif shadow-xs print:border-none print:p-0"
        >
          {/* KOP SURAT SMKN 21 JAKARTA */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 pb-3 border-b-4 border-double border-slate-900">
            {/* Logo Resmi SMKN 21 */}
            <img
              src={logoSMKN21}
              alt="Logo SMKN 21 Jakarta"
              className="w-14 h-14 sm:w-18 sm:h-18 object-contain flex-shrink-0"
            />

            {/* Nama & Alamat Sekolah */}
            <div className="text-center flex-1">
              <h2 className="text-base sm:text-xl font-extrabold uppercase tracking-tight text-slate-950 font-sans">
                SMKN 21 JAKARTA
              </h2>
              <p className="text-[10px] sm:text-xs font-medium text-slate-700 mt-0.5 font-sans leading-tight">
                Jl. Siaga 1 Kemayoran Gempol Jakarta Pusat 10630
              </p>
            </div>

            <div className="w-12 sm:w-16 flex-shrink-0"></div>
          </div>

          {/* JUDUL SURAT */}
          <div className="text-center my-4">
            <h3 className="text-xs sm:text-base font-extrabold uppercase tracking-wide underline underline-offset-4 decoration-2">
              SURAT IJIN MASUK / MENINGGALKAN KELAS
            </h3>
          </div>

          {/* ISIAN SURAT */}
          <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
            <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-2">
              <div className="flex items-baseline gap-2 flex-1 min-w-[110px]">
                <span className="font-bold w-12 sm:w-14">Hari :</span>
                <span className="font-sans font-semibold border-b border-dotted border-slate-400 pb-0.5 flex-1">
                  {slipData.hari}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-1 sm:flex-initial min-w-[140px]">
                <span className="font-bold w-18 sm:text-right">Tanggal :</span>
                <span className="font-sans font-semibold border-b border-dotted border-slate-400 pb-0.5 flex-1 sm:w-36 text-center">
                  {slipData.tanggal_formatted || slipData.tanggal}
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-bold w-24">Nama</span>
              <span className="font-bold">:</span>
              <span className="font-sans font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5 flex-1">
                {slipData.nama}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-bold w-24">Kls/Jurusan</span>
              <span className="font-bold">:</span>
              <span className="font-sans font-semibold text-slate-800 border-b border-dotted border-slate-400 pb-0.5 flex-1">
                {slipData.kelas}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-bold w-24">Keperluan</span>
              <span className="font-bold">:</span>
              <div className="font-sans text-xs sm:text-sm flex-1 leading-normal border-b border-dotted border-slate-400 pb-1">
                {isIzinMasuk ? (
                  <>
                    <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                      Ijin masuk
                    </strong>{" "}
                    /{" "}
                    <span className="line-through text-slate-400 decoration-slate-400 decoration-1.5">
                      ijin meninggalkan kelas
                    </span>
                  </>
                ) : (
                  <>
                    <span className="line-through text-slate-400 decoration-slate-400 decoration-1.5">
                      Ijin masuk
                    </span>{" "}
                    /{" "}
                    <strong className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded">
                      ijin meninggalkan kelas
                    </strong>
                  </>
                )}
                <span className="ml-1.5 font-bold">
                  jam pelajaran ke :{" "}
                  {slipData.jam_ke
                    ? slipData.jam_ke.replace(/Jam ke-/gi, "").trim()
                    : "-"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <span className="font-bold w-24 flex-shrink-0">Alasan</span>
              <span className="font-bold">:</span>
              <div className="font-sans text-slate-800 border-b border-dotted border-slate-400 pb-0.5 flex-1 italic break-words line-clamp-2">
                {slipData.alasan}
              </div>
            </div>
          </div>

          {/* KOLOM TANDA TANGAN (PETUGAS PIKET & SISWA YBS) */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-2 text-center text-xs">
            {/* Petugas Piket */}
            <div className="flex flex-col items-center">
              <p className="font-bold mb-1">Petugas Piket</p>
              {/* Paraf / Stempel Verifikasi Digital / Tanda Tangan */}
              <div className="h-16 flex items-center justify-center relative">
                {slipData.tanda_tangan_petugas ? (
                  <img
                    src={slipData.tanda_tangan_petugas}
                    alt="TTD Petugas Piket"
                    className="h-14 max-w-[130px] object-contain"
                  />
                ) : (
                  <div className="border border-emerald-600 text-emerald-700 rounded-lg px-2 py-1 text-[10px] font-sans font-bold flex items-center gap-1 uppercase rotate-[-4deg] bg-emerald-50/50 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>TERVERIFIKASI PIKET</span>
                  </div>
                )}
              </div>
              <p className="font-sans font-bold border-b border-slate-800 pb-0.5 px-3 min-w-[120px]">
                {slipData.petugas_piket || "Petugas Piket"}
              </p>
            </div>

            {/* Siswa YBS */}
            <div className="flex flex-col items-center">
              <p className="font-bold mb-1">Siswa YBS</p>
              <div className="h-16 flex items-center justify-center">
                {slipData.tanda_tangan_siswa ? (
                  <img
                    src={slipData.tanda_tangan_siswa}
                    alt="TTD Siswa"
                    className="h-14 max-w-[130px] object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-slate-300 italic font-sans">
                    (Paraf Siswa)
                  </span>
                )}
              </div>
              <p className="font-sans font-bold border-b border-slate-800 pb-0.5 px-3 min-w-[120px]">
                {slipData.nama}
              </p>
            </div>
          </div>
        </div>

        {/* Petunjuk Tambahan Bawah */}
        <p className="text-[11px] text-slate-400 text-center mt-4 print:hidden">
          * Tunjukkan surat izin digital ini kepada Guru Pengajar di kelas atau
          Satpam gerbang sekolah.
        </p>
      </div>
    </div>
  );
}
