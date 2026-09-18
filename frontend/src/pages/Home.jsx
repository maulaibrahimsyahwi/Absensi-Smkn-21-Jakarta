import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Home Component
 * Mengarahkan pengguna langsung ke portal yang sesuai berdasarkan status autentikasi dan peran.
 * Tamu yang belum login otomatis dialihkan ke /login sehingga modul operasional sekolah tidak tampil di awal.
 */
export default function Home() {
  const { isAuthenticated, role, loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Jika belum login, langsung alihkan ke halaman login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Jika sudah login, alihkan ke dashboard / meja kerja sesuai role
  if (role === "siswa") {
    return <Navigate to="/portal-siswa" replace />;
  }

  if (role === "piket") {
    return <Navigate to="/portal-piket" replace />;
  }

  // Role Admin
  return <Navigate to="/portal-admin" replace />;
}
