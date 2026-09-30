import React, { useState } from "react";
import { Printer, X, FileText, Calendar, Clock, MapPin, UserCheck, AlertTriangle } from "lucide-react";

export default function ModalCetakSuratPanggilan({
  isOpen,
  onClose,
  siswa,
  totalPoin = 0,
  pelanggaranList = [],
  statusPembinaan = "Peringatan",
}) {
  if (!isOpen || !siswa) return null;

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 2);
  const defaultJadwalTanggal = nextDay.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [nomorSurat, setNomorSurat] = useState(
    `421.5/0${Math.floor(Math.random() * 80 + 20)}/SMKN.21/${new Date().getFullYear()}`,
  );
  const [jadwalHariTanggal, setJadwalHariTanggal] = useState(defaultJadwalTanggal);
  const [jadwalWaktu, setJadwalWaktu] = useState("08.30 WIB s/d selesai");
  const [jadwalRuangan, setJadwalRuangan] = useState("Ruang Bimbingan & Konseling (BK) SMKN 21");
  const [menghadap, setMenghadap] = useState("Guru BK & Tim Kesiswaan SMKN 21 Jakarta");
  const [catatanKhusus, setCatatanKhusus] = useState(
    "Mengingat pentingnya koordinasi pembinaan kedisiplinan putra/putri Bapak/Ibu, dimohon kehadiran tepat waktu dan tidak dapat diwakilkan.",
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Toolbar (Disembunyikan saat Print) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm">
                Pratinjau Surat Pemanggilan Resmi Orang Tua / Wali
              </h3>
              <p className="text-[11px] text-slate-300">
                Format Standar Kedinasan SMKN 21 Jakarta • {statusPembinaan} ({totalPoin} Poin)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Berkas (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Setting Cepat Jadwal Pemanggilan (Print: Hidden) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex flex-wrap gap-3 items-center print:hidden">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">No. Surat:</span>
            <input
              type="text"
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono w-44"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Jadwal:</span>
            <input
              type="text"
              value={jadwalHariTanggal}
              onChange={(e) => setJadwalHariTanggal(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs w-48"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Pukul:</span>
            <input
              type="text"
              value={jadwalWaktu}
              onChange={(e) => setJadwalWaktu(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs w-36"
            />
          </div>
        </div>

        {/* Paper Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-8 text-slate-900 font-serif leading-relaxed text-[13px]">
            {/* KOP SURAT RESMI SMKN 21 */}
            <div className="border-b-4 border-slate-900 pb-3 mb-6 text-center relative">
              <h4 className="text-[12px] sm:text-[13px] font-semibold tracking-wide uppercase text-slate-800">
                Pemerintah Provinsi Daerah Khusus Ibukota Jakarta
              </h4>
              <h3 className="text-[13px] sm:text-[14px] font-semibold tracking-wide uppercase text-slate-800">
                Dinas Pendidikan
              </h3>
              <h2 className="text-[17px] sm:text-[20px] font-black tracking-wider uppercase text-slate-950 font-sans mt-0.5">
                Sekolah Menengah Kejuruan Negeri 21 Jakarta
              </h2>
              <p className="text-[11px] text-slate-600 font-sans mt-1">
                Jl. Siaga Utama, Kemayoran, Jakarta Pusat 10610 • Telepon: (021) 4245582
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                Laman: smkn21jakarta.sch.id • Pos-el: smkn21jakarta@gmail.com • NPSN: 20101584
              </p>
              <div className="mt-2 border-b border-slate-900 w-full"></div>
            </div>

            {/* Header Surat */}
            <div className="flex justify-between items-start mb-6 text-xs">
              <div className="space-y-1">
                <p>
                  <span className="inline-block w-20">Nomor</span>:{" "}
                  <span className="font-mono font-semibold">{nomorSurat}</span>
                </p>
                <p>
                  <span className="inline-block w-20">Lampiran</span>: 1 (satu) Berkas Rekam Disiplin
                </p>
                <p>
                  <span className="inline-block w-20">Perihal</span>:{" "}
                  <span className="font-bold underline">
                    Pemanggilan Orang Tua / Wali Murid ({statusPembinaan})
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p>Jakarta, {todayStr}</p>
                <p className="mt-2 text-left">
                  Kepada Yth.
                  <br />
                  Bapak / Ibu Orang Tua / Wali dari:
                  <br />
                  <span className="font-bold text-slate-950">{siswa.nama}</span>
                  <br />
                  di Tempat
                </p>
              </div>
            </div>

            {/* Isi Surat */}
            <div className="space-y-3.5 text-justify text-slate-800 mb-6">
              <p>Dengan hormat,</p>
              <p>
                Sehubungan dengan evaluasi ketertiban dan kedisiplinan peserta didik di lingkungan
                Sekolah Menengah Kejuruan Negeri 21 Jakarta, kami memberitahukan bahwa putra/putri
                Bapak/Ibu:
              </p>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1 font-sans my-2">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="col-span-2 font-bold text-slate-900">: {siswa.nama}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">NIS / NISN</span>
                  <span className="col-span-2">: {siswa.nis} / {siswa.nisn || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Kelas / Jurusan</span>
                  <span className="col-span-2 font-semibold">: {siswa.kelas}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">Akumulasi Poin</span>
                  <span className="col-span-2 font-bold text-rose-700">
                    : {totalPoin} Poin (Status: {statusPembinaan})
                  </span>
                </div>
              </div>

              <p>
                Berdasarkan Buku Saku Tata Tertib Peserta Didik SMKN 21 Jakarta, akumulasi poin
                tersebut telah mencapai ambang batas tindak lanjut <strong>{statusPembinaan}</strong>.
                Oleh karena itu, kami mengharapkan kehadiran Bapak/Ibu Orang Tua/Wali pada:
              </p>

              {/* Rincian Pertemuan */}
              <div className="pl-6 space-y-1.5 text-xs font-sans">
                <div className="grid grid-cols-4">
                  <span className="text-slate-600">Hari / Tanggal</span>
                  <span className="col-span-3 font-semibold">: {jadwalHariTanggal}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-600">Pukul</span>
                  <span className="col-span-3 font-semibold">: {jadwalWaktu}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-600">Tempat</span>
                  <span className="col-span-3 font-semibold">: {jadwalRuangan}</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="text-slate-600">Menghadap</span>
                  <span className="col-span-3 font-semibold">: {menghadap}</span>
                </div>
              </div>

              <p>{catatanKhusus}</p>
              <p>
                Demikian surat pemanggilan ini kami sampaikan. Atas perhatian, kehadiran, dan
                kerja sama Bapak/Ibu demi masa depan pendidikan putra/putri kita, kami ucapkan
                terima kasih.
              </p>
            </div>

            {/* Kolom Tanda Tangan Resmi */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs font-sans">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold text-slate-800">Orang Tua / Wali Siswa</p>
                <div className="h-20"></div>
                <p className="border-b border-slate-900 mx-12 font-bold"></p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tanda Tangan & Nama Terang</p>
              </div>
              <div>
                <p>Jakarta, {todayStr}</p>
                <p className="font-semibold text-slate-800">Koordinator Bimbingan Konseling / Kesiswaan</p>
                <div className="h-20"></div>
                <p className="border-b border-slate-900 mx-12 font-bold text-slate-900">
                  Tim Ketertiban & BK SMKN 21
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">NIP. 19780512 200801 1 012</p>
              </div>
            </div>

            {/* Tanda Tangan Mengetahui Kepala Sekolah */}
            <div className="text-center pt-8 text-xs font-sans">
              <p>Mengetahui,</p>
              <p className="font-semibold text-slate-800">Kepala SMK Negeri 21 Jakarta</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900 underline">
                Drs. H. Syamsuddin, M.Pd.
              </p>
              <p className="text-[11px] text-slate-600">NIP. 19680315 199303 1 004</p>
            </div>

            {/* Catatan Dokumen */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-sans flex justify-between items-center">
              <span>Dicetak otomatis melalui Sistem Kedisiplinan Terintegrasi SMKN 21 Jakarta</span>
              <span>Dokumen Sah Administrasi Kesiswaan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

