/**
 * Satu sumber pengaturan untuk pages/KebijakanPrivasi.tsx dan components/.../BiometricPrivacyModal.tsx.
 * Ubah di sini, bukan di masing-masing berkas.
 */
export const PRIVACY = {
  /** false setelah Kepala Sekolah menandatangani dan nomor dokumen resmi terbit. */
  draft: true,
  /** false bila antrean offline kiosk tidak menyimpan foto. */
  fotoOfflineSementara: true,
  /** Kanal permintaan subjek data, mis. email atau nomor TU. */
  kontak: "",
  /** Mis. "90 hari setelah status siswa menjadi Alumni". */
  masaHapus: "",
};

export default PRIVACY;
