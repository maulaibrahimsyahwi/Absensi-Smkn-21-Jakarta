import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route Guard Component
 * Memastikan pengguna telah terautentikasi dan memiliki role yang sesuai.
 *
 * @param {Array<string>} allowedRoles - Daftar role yang diperbolehkan (misal ['admin', 'piket'])
 * @param {React.ReactNode} children - Komponen halaman yang dilindungi
 */
export default function ProtectedRoute({
  allowedRoles,
  requireBiometric = false,
  children,
}) {
  const { user, role, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Jika belum login, alihkan ke halaman login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Jika ada pembatasan role dan role pengguna tidak diizinkan
  if (
    allowedRoles &&
    Array.isArray(allowedRoles) &&
    !allowedRoles.includes(role)
  ) {
    // Alihkan siswa ke Portal Siswa
    if (role === "siswa") {
      return <Navigate to="/portal-siswa" replace />;
    }
    // Alihkan guru piket ke Beranda Guru Piket
    if (role === "piket") {
      return <Navigate to="/portal-piket" replace />;
    }
    // Alihkan admin ke Beranda Admin
    if (role === "admin") {
      return <Navigate to="/portal-admin" replace />;
    }
    // Default fallback
    return <Navigate to="/" replace />;
  }

  // 3. Khusus Siswa: Wajib memiliki data biometrik wajah resmi untuk mengakses fitur operasional
  if (role === "siswa" && requireBiometric && !user?.terdaftar) {
    return (
      <Navigate
        to="/portal-siswa"
        state={{
          biometricLocked: true,
          from: location.pathname,
        }}
        replace
      />
    );
  }

  // 4. Izin akses diberikan
  return children;
}
