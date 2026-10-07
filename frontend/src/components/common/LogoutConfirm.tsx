import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConfirmSheet from "../ui/ConfirmSheet";

export interface LogoutConfirmProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutConfirm({ isOpen, onClose }: LogoutConfirmProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleConfirm = () => {
    onClose();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <ConfirmSheet
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Keluar dari akun?"
      confirmLabel="Ya, keluar"
      danger={false}
    >
      <p className="text-slate-600 text-sm">
        Anda perlu masuk kembali untuk membuka portal.
      </p>
    </ConfirmSheet>
  );
}
