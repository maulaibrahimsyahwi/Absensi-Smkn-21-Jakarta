import React from "react";
import ConfirmSheet from "../ui/ConfirmSheet";
import InlineAlert from "../ui/InlineAlert";
import { Siswa } from "../../types/siswa";

export interface LuluskanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type?: "tingkat_xii" | "selected" | "single";
  targetSiswa?: Siswa | null;
  selectedCount?: number;
  totalKelasXII?: number;
  loading?: boolean;
}

export default function LuluskanModal({
  isOpen,
  onClose,
  onConfirm,
  type = "selected",
  targetSiswa = null,
  selectedCount = 0,
  totalKelasXII,
  loading = false,
}: LuluskanModalProps) {
  const title =
    type === "tingkat_xii"
      ? "Luluskan seluruh kelas XII?"
      : type === "single"
        ? `Luluskan ${targetSiswa?.nama}?`
        : `Luluskan ${selectedCount} siswa?`;

  return (
    <ConfirmSheet
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      danger={false}
      title={title}
      confirmLabel="Ya, luluskan"
      requireText={type === "tingkat_xii" ? "LULUSKAN" : undefined}
    >
      <p className="text-slate-700">
        {type === "tingkat_xii" ? (
          <>
            {totalKelasXII !== undefined ? (
              <>
                <b>{totalKelasXII} siswa</b> kelas XII yang berstatus aktif
              </>
            ) : (
              "Seluruh siswa kelas XII yang berstatus aktif"
            )}
          </>
        ) : type === "single" ? (
          <>
            <b>{targetSiswa?.nama}</b> ({targetSiswa?.kelas})
          </>
        ) : (
          <>
            <b>{selectedCount} siswa</b> terpilih
          </>
        )}{" "}
        akan dipindahkan statusnya menjadi <b>Alumni</b>.
      </p>
      <InlineAlert type="info">
        Seluruh riwayat presensi tetap tersimpan utuh di arsip sekolah. Siswa
        tidak dapat memindai presensi harian lagi, namun status dapat
        diaktifkan kembali kapan saja melalui daftar alumni jika diperlukan.
      </InlineAlert>
    </ConfirmSheet>
  );
}
