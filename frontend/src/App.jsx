import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded page components for route-level code splitting
const Home = React.lazy(() => import("./pages/Home"));
const AbsensiHarian = React.lazy(() => import("./pages/AbsensiHarian"));
const AbsensiPerpus = React.lazy(() => import("./pages/AbsensiPerpus"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const RegistrasiSiswa = React.lazy(() => import("./pages/RegistrasiSiswa"));
const PengajuanIzin = React.lazy(() => import("./pages/PengajuanIzin"));
const GuruPiket = React.lazy(() => import("./pages/GuruPiket"));
const Login = React.lazy(() => import("./pages/Login"));
const PortalSiswa = React.lazy(() => import("./pages/PortalSiswa"));
const PortalPiket = React.lazy(() => import("./pages/PortalPiket"));
const PortalAdmin = React.lazy(() => import("./pages/PortalAdmin"));
const CatatPelanggaran = React.lazy(() => import("./pages/CatatPelanggaran"));
const HalamanLibur = React.lazy(() => import("./pages/HalamanLibur"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

import RouteAwareSkeleton from "./components/common/Skeleton";
import OfflineBanner from "./components/common/OfflineBanner";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";
import BottomNav from "./components/BottomNav";

function AppLayout() {
  const location = useLocation();
  // Mode kiosk layar penuh untuk kamera absensi (tanpa navbar & tanpa footer)
  const isKioskMode =
    location.pathname === "/harian" || location.pathname === "/perpus";
  // Halaman yang menyembunyikan navbar standar (kiosk kamera dan halaman pengumuman libur mandiri)
  const hideNavbar = isKioskMode || location.pathname === "/libur";
  // Footer ditampilkan di semua rute termasuk halaman libur, kecuali kiosk kamera layar penuh
  const hideFooter = isKioskMode;

  return (
    <div
      className={`min-h-screen font-sans ${
        isKioskMode
          ? "bg-black overflow-hidden h-screen w-screen"
          : "bg-slate-50 flex flex-col text-slate-800 w-full max-w-full overflow-x-hidden"
      }`}
    >
      <OfflineBanner />
      {!hideNavbar && <Navbar />}

      <main
        className={
          isKioskMode
            ? "h-screen w-screen overflow-hidden"
            : "flex-1 flex flex-col w-full max-w-full overflow-x-hidden pb-20 md:pb-6"
        }
      >
        <Suspense fallback={<RouteAwareSkeleton />}>
          <Routes>
            {/* Rute Publik Terbatas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Rute Presensi & Perpustakaan (Wajib Login: Siswa, Piket, Admin; Siswa Wajib Biometrik) */}
            <Route
              path="/harian"
              element={
                <ProtectedRoute
                  allowedRoles={["siswa", "piket", "admin"]}
                  requireBiometric={true}
                >
                  <AbsensiHarian />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perpus"
              element={
                <ProtectedRoute
                  allowedRoles={["siswa", "piket", "admin"]}
                  requireBiometric={true}
                >
                  <AbsensiPerpus />
                </ProtectedRoute>
              }
            />

            {/* Rute Terproteksi Khusus Siswa */}
            <Route
              path="/portal-siswa"
              element={
                <ProtectedRoute allowedRoles={["siswa"]}>
                  <PortalSiswa />
                </ProtectedRoute>
              }
            />

            {/* Rute Terproteksi Pengajuan Izin (Siswa, Piket, Admin; Siswa Wajib Biometrik) */}
            <Route
              path="/izin"
              element={
                <ProtectedRoute
                  allowedRoles={["siswa", "piket", "admin"]}
                  requireBiometric={true}
                >
                  <PengajuanIzin />
                </ProtectedRoute>
              }
            />

            {/* Rute Pencatatan & Pengakuan Pelanggaran (Siswa Mandiri, Guru Piket, Admin) */}
            <Route
              path="/pelanggaran"
              element={
                <ProtectedRoute
                  allowedRoles={["siswa", "piket", "admin"]}
                  requireBiometric={true}
                >
                  <CatatPelanggaran />
                </ProtectedRoute>
              }
            />

            {/* Rute Terproteksi Guru Piket & Admin */}
            <Route
              path="/portal-piket"
              element={
                <ProtectedRoute allowedRoles={["piket", "admin"]}>
                  <PortalPiket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/piket"
              element={
                <ProtectedRoute allowedRoles={["piket", "admin"]}>
                  <GuruPiket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "piket"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Rute Terproteksi KHUSUS ADMIN (Manajemen Data & Biometrik Seluruh Siswa) */}
            <Route
              path="/portal-admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PortalAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrasi"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <RegistrasiSiswa />
                </ProtectedRoute>
              }
            />

            {/* Rute Khusus Pengumuman Libur Sekolah (Siswa, Guru Piket, Admin) */}
            <Route
              path="/libur"
              element={
                <ProtectedRoute
                  allowedRoles={["siswa", "piket", "admin"]}
                  allowOnHoliday={true}
                >
                  <HalamanLibur />
                </ProtectedRoute>
              }
            />

            {/* Rute Catch-All 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!hideNavbar && <BottomNav />}
      {!hideNavbar && <PwaInstallPrompt />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}
