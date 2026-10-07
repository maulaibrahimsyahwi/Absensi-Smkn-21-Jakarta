import React from "react";
import { Link } from "react-router-dom";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../ui/Sheet";
import { PRIVACY } from "../../constants/privacy";

interface BiometricPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">{judul}</h3>
      {children}
    </section>
  );
}

export default function BiometricPrivacyModal({ isOpen, onClose }: BiometricPrivacyModalProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="md" labelledBy="privacy-title">
      <SheetHeader
        id="privacy-title"
        title="Privasi dan data wajah"
        subtitle="Sistem Presensi SMK Negeri 21 Jakarta"
        onClose={onClose}
      />

      <SheetBody>
        <div className="space-y-6 text-sm leading-6 text-slate-700">
          <p>
            Presensi memakai pengenalan wajah. Ringkasan berikut ditujukan bagi siswa dan orang tua atau
            wali. Aturan lengkapnya ada di dokumen Kebijakan Privasi.
          </p>

          <Bagian judul="Data yang disimpan">
            <p>
              Saat pendaftaran, foto wajah diubah menjadi vektor berisi 128 angka. Vektor inilah yang
              dicocokkan saat presensi. Vektor tidak bisa dibuka sebagai gambar, tetapi tetap dilindungi
              sebagai data biometrik. Foto profil disimpan terpisah dan hanya dipakai untuk kartu pelajar
              dan verifikasi oleh staf. Sistem juga mencatat waktu dan lokasi presensi.
            </p>
          </Bagian>

          <Bagian judul="Foto dari kamera">
            <p>
              Pada presensi harian, gambar dari kamera dipakai untuk pencocokan lalu dihapus dari memori.
              {PRIVACY.fotoOfflineSementara &&
                " Bila jaringan terputus, kiosk menyimpan foto sementara di perangkatnya sampai terkirim ke server, paling lama 24 jam."}
            </p>
          </Bagian>

          <Bagian judul="Untuk apa data dipakai">
            <p>
              Hanya untuk mencatat kehadiran, mencegah presensi titipan, mencatat kunjungan perpustakaan
              dan izin, serta menyusun rekap untuk Dinas Pendidikan. Data tidak dijual dan tidak diberikan
              kepada pihak komersial.
            </p>
          </Bagian>

          <Bagian judul="Hak siswa dan orang tua atau wali">
            <ul className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
              <li>Merekam ulang wajah bila penampilan berubah, atau meminta data yang keliru diperbaiki.</li>
              <li>
                Dikecualikan dari pengenalan wajah karena kondisi medis, misalnya luka atau perban di
                wajah. Kehadiran dicatat manual oleh Guru Piket.
              </li>
              <li>
                Meminta data wajah dihapus. Setelah siswa lulus atau pindah sekolah, data wajah
                dinonaktifkan lalu dihapus
                {PRIVACY.masaHapus ? ` paling lambat ${PRIVACY.masaHapus}` : ""}.
              </li>
              <li>Orang tua atau wali dapat menarik persetujuan.</li>
            </ul>
            <p>Ajukan ke Tata Usaha{PRIVACY.kontak ? ` (${PRIVACY.kontak})` : ""}.</p>
          </Bagian>

          {PRIVACY.draft && (
            <p className="text-xs text-slate-500">Dokumen lengkap masih berstatus draf.</p>
          )}
        </div>
      </SheetBody>

      <SheetFooter>
        <Link
          to="/kebijakan-privasi"
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Baca dokumen lengkap
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="press min-h-11 cursor-pointer rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Tutup
        </button>
      </SheetFooter>
    </Sheet>
  );
}
