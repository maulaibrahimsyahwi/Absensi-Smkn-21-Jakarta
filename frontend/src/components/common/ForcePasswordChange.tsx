import React from "react";
import { useAuth } from "../../context/AuthContext";
import Sheet, { SheetBody, SheetHeader } from "../ui/Sheet";
import TabUbahPassword from "../profile/TabUbahPassword";

/**
 * Komponen pemaksa ganti kata sandi default (Force Password Change).
 * Muncul jika user.must_change_password bernilai true, dan tidak dapat ditutup
 * sampai siswa/staf berhasil memperbarui kata sandi menjadi kata sandi pribadi yang aman.
 */
export default function ForcePasswordChange() {
  const { user, updateUserProfile } = useAuth();

  const mustChange = Boolean(user?.must_change_password);

  return (
    <Sheet
      isOpen={mustChange}
      onClose={() => {}}
      closeOnBackdrop={false}
      size="sm"
      labelledBy="force-pw-title"
    >
      <SheetHeader
        id="force-pw-title"
        title="Ganti kata sandi Anda"
        hideClose
        onClose={() => {}}
        subtitle="Kata sandi akun Anda masih menggunakan bawaan (NIS/NIP). Silakan buat kata sandi baru agar akun tetap terlindungi."
      />
      <SheetBody>
        <TabUbahPassword
          user={user}
          onSuccess={() => updateUserProfile({ must_change_password: false })}
        />
      </SheetBody>
    </Sheet>
  );
}
