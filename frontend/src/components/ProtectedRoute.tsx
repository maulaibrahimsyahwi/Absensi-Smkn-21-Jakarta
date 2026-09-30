import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

export interface ProtectedRouteProps {
  allowedRoles?: Array<UserRole | string>;
  requireBiometric?: boolean;
  allowOnHoliday?: boolean;
  children: ReactNode;
}

/**
 * Route Guard Component
 * Memastikan pengguna telah terautentikasi dan memiliki role yang sesuai.
 */
export default function ProtectedRoute({
  allowedRoles,
  requireBiometric = false,
  allowOnHoliday = false,
  children,
}: ProtectedRouteProps) {
  const { user, role, isAuthenticated, todayStatus } = useAuth();
  const location = useLocation();

  // 1. Jika belum login, alihkan ke halaman login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Proteksi Hari Libur untuk Akun Siswa & Guru Piket
  const isSchoolHoliday = todayStatus && !(todayStatus as { is_school_day?: boolean }).is_school_day;

  if (
    (role === "siswa" || role === "piket") &&
    isSchoolHoliday &&
    !allowOnHoliday &&
    location.pathname !== "/libur"
  ) {
    return <Navigate to="/libur" replace />;
  }

  // 3. Jika pengguna siswa/piket berada di /libur tapi hari ini sekolah aktif
  if (
    location.pathname === "/libur" &&
    todayStatus &&
    (todayStatus as { is_school_day?: boolean }).is_school_day
  ) {
    if (role === "siswa") return <Navigate to="/portal-siswa" replace />;
    if (role === "piket") return <Navigate to="/portal-piket" replace />;
    if (role === "admin") return <Navigate to="/portal-admin" replace />;
  }

  // 4. Jika ada pembatasan role dan role pengguna tidak diizinkan
  if (
    allowedRoles &&
    Array.isArray(allowedRoles) &&
    role &&
    !allowedRoles.includes(role)
  ) {
    // Alihkan siswa ke Portal Siswa (atau /libur jika sedang libur)
    if (role === "siswa") {
      return (
        <Navigate to={isSchoolHoliday ? "/libur" : "/portal-siswa"} replace />
      );
    }
    // Alihkan guru piket ke Beranda Guru Piket (atau /libur jika sedang libur)
    if (role === "piket") {
      return (
        <Navigate to={isSchoolHoliday ? "/libur" : "/portal-piket"} replace />
      );
    }
    // Alihkan admin ke Beranda Admin
    if (role === "admin") {
      return <Navigate to="/portal-admin" replace />;
    }
    // Default fallback
    return <Navigate to="/" replace />;
  }

  // 5. Khusus Siswa: Wajib memiliki data biometrik wajah resmi untuk mengakses fitur operasional
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

  // 6. Izin akses diberikan
  return <>{children}</>;
}
