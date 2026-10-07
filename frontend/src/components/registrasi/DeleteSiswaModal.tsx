import React from "react";
import ConfirmSheet from "../ui/ConfirmSheet";
import InlineAlert from "../ui/InlineAlert";
import { Siswa } from "../../types/siswa";

export interface DeleteSiswaModalProps {
  deletingSiswa: Siswa | null;
  setDeletingSiswa: (siswa: Siswa | null) => void;
  confirmDeleteSiswa: () => void;
  isBulk?: boolean;
  selectedCount?: number;
  confirmBulkDelete?: () => void;
  onCloseBulk?: () => void;
  loading?: boolean;
}

export default function DeleteSiswaModal({
  deletingSiswa,
  setDeletingSiswa,
  confirmDeleteSiswa,
  isBulk = false,
  selectedCount = 0,
  confirmBulkDelete,
  onCloseBulk,
  loading = false,
}: DeleteSiswaModalProps) {
  const close = () =>
    isBulk && onCloseBulk ? onCloseBulk() : setDeletingSiswa(null);
  const confirm = () =>
    isBulk && confirmBulkDelete ? confirmBulkDelete() : confirmDeleteSiswa();

  return (
    <ConfirmSheet
      isOpen={Boolean(deletingSiswa || isBulk)}
      onClose={close}
      onConfirm={confirm}
      loading={loading}
      title={
        isBulk
          ? `Hapus ${selectedCount} siswa?`
          : `Hapus ${deletingSiswa?.nama}?`
      }
      confirmLabel={isBulk ? `Hapus ${selectedCount} siswa` : "Ya, hapus"}
      requireText={isBulk ? "HAPUS" : undefined}
      danger={true}
    >
      <InlineAlert type="error">
        Data siswa beserta seluruh riwayat presensi harian, perpustakaan, dan
        izin sakit akan <b>terhapus permanen</b> dan tidak bisa dipulihkan.
      </InlineAlert>
      {!isBulk && deletingSiswa && (
        <p className="mt-2 text-slate-700">
          <b>{deletingSiswa.nama}</b> ({deletingSiswa.kelas}), NIS:{" "}
          <span className="font-mono font-bold text-slate-900">
            {deletingSiswa.nis}
          </span>
        </p>
      )}
      <p className="mt-2 text-slate-600">
        Jika siswa sudah menyelesaikan masa sekolah, pilih{" "}
        <b>Luluskan ke alumni</b> agar seluruh riwayat kehadirannya tetap
        tersimpan.
      </p>
    </ConfirmSheet>
  );
}
