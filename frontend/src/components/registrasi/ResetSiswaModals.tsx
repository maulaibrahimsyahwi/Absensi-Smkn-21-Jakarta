import React from "react";
import ConfirmSheet from "../ui/ConfirmSheet";
import InlineAlert from "../ui/InlineAlert";
import { Siswa } from "../../types/siswa";

export interface ResetSiswaModalsProps {
  resettingPasswordSiswa: Siswa | null;
  setResettingPasswordSiswa: (s: Siswa | null) => void;
  handleResetPasswordConfirm: () => void;
  resettingFaceSiswa: Siswa | null;
  setResettingFaceSiswa: (s: Siswa | null) => void;
  handleResetFaceConfirm: () => void;
  resettingSignatureSiswa: Siswa | null;
  setResettingSignatureSiswa: (s: Siswa | null) => void;
  handleResetSignatureConfirm: () => void;
  resetting2faSiswa?: Siswa | null;
  setResetting2faSiswa?: (s: Siswa | null) => void;
  handleReset2faConfirm?: () => void;
  loading: boolean;
}

type Kind = "password" | "face" | "signature" | "2fa";

const META: Record<
  Kind,
  {
    title: string;
    confirm: string;
    danger: boolean;
    body: (s: Siswa) => React.ReactNode;
  }
> = {
  password: {
    title: "Reset kata sandi siswa?",
    confirm: "Ya, reset",
    danger: false,
    body: (s) => (
      <div className="space-y-3">
        <p>
          Kata sandi untuk <b>{s.nama}</b> ({s.kelas}) akan dikembalikan ke
          default awal (NIS: <span className="font-mono font-bold">{s.nis}</span>).
        </p>
        <InlineAlert type="warning">
          NIS bukan rahasia. Siswa akan diwajibkan mengganti kata sandi baru saat
          pertama kali masuk ke portal.
        </InlineAlert>
      </div>
    ),
  },
  face: {
    title: "Reset biometrik wajah?",
    confirm: "Ya, reset wajah",
    danger: true,
    body: (s) => (
      <div className="space-y-3">
        <p>
          Seluruh sampel dan vektor biometrik wajah milik <b>{s.nama}</b> akan
          dihapus dari sistem.
        </p>
        <InlineAlert type="info">
          Perekaman sampel wajah baru hanya dapat dilakukan oleh Petugas Admin
          atau Tata Usaha sekolah.
        </InlineAlert>
      </div>
    ),
  },
  signature: {
    title: "Reset tanda tangan digital?",
    confirm: "Ya, reset TTD",
    danger: false,
    body: (s) => (
      <div className="space-y-3">
        <p>
          Tanda tangan digital milik <b>{s.nama}</b> akan dihapus. Siswa dapat
          membuat tanda tangan baru saat membuka portal atau mengajukan surat
          izin.
        </p>
      </div>
    ),
  },
  "2fa": {
    title: "Reset autentikasi 2FA?",
    confirm: "Ya, reset 2FA",
    danger: true,
    body: (s) => (
      <div className="space-y-3">
        <p>
          Autentikasi dua faktor (2FA) untuk akun <b>{s.nama}</b> akan
          dinonaktifkan (berguna jika siswa kehilangan HP atau ganti perangkat).
        </p>
        <InlineAlert type="warning">
          Pastikan Anda telah memverifikasi identitas fisik siswa secara langsung
          sebelum melakukan reset.
        </InlineAlert>
      </div>
    ),
  },
};

export default function ResetSiswaModals(p: ResetSiswaModalsProps) {
  const active: {
    kind: Kind;
    siswa: Siswa;
    close: () => void;
    confirm: () => void;
  } | null = p.resettingPasswordSiswa
    ? {
        kind: "password",
        siswa: p.resettingPasswordSiswa,
        close: () => p.setResettingPasswordSiswa(null),
        confirm: p.handleResetPasswordConfirm,
      }
    : p.resettingFaceSiswa
      ? {
          kind: "face",
          siswa: p.resettingFaceSiswa,
          close: () => p.setResettingFaceSiswa(null),
          confirm: p.handleResetFaceConfirm,
        }
      : p.resettingSignatureSiswa
        ? {
            kind: "signature",
            siswa: p.resettingSignatureSiswa,
            close: () => p.setResettingSignatureSiswa(null),
            confirm: p.handleResetSignatureConfirm,
          }
        : p.resetting2faSiswa
          ? {
              kind: "2fa",
              siswa: p.resetting2faSiswa,
              close: () => p.setResetting2faSiswa?.(null),
              confirm: () => p.handleReset2faConfirm?.(),
            }
          : null;

  if (!active) return null;
  const m = META[active.kind];

  return (
    <ConfirmSheet
      isOpen={true}
      onClose={active.close}
      onConfirm={active.confirm}
      loading={p.loading}
      title={m.title}
      confirmLabel={m.confirm}
      danger={m.danger}
    >
      {m.body(active.siswa)}
    </ConfirmSheet>
  );
}
