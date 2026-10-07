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
const KebijakanPrivasi = React.lazy(() => import("./pages/KebijakanPrivasi"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

import RouteAwareSkeleton from "./components/common/Skeleton";
import OfflineBanner from "./components/common/OfflineBanner";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";
import BottomNav from "./components/BottomNav";
import IdleLockScreen from "./components/common/IdleLockScreen";
import ModalSessionConflict from "./components/common/ModalSessionConflict";
import ForcePasswordChange from "./components/common/ForcePasswordChange";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { FULLSCREEN_ROUTES, NO_BOTTOM_NAV_ROUTES } from "./utils/navVisibility";
import { useAuth } from "./context/AuthContext";

function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isKioskMode = FULLSCREEN_ROUTES.includes(location.pathname);
  const hideNavbar = isKioskMode || location.pathname === "/libur";
  const showBottomNav = isAuthenticated && !NO_BOTTOM_NAV_ROUTES.includes(location.pathname);

  return (
    <div
      className={`font-sans ${
        isKioskMode
          ? "h-screen w-screen overflow-hidden bg-black"
          : "flex min-h-dvh w-full max-w-full flex-col overflow-x-clip bg-slate-50 text-slate-800"
      }`}
    >
      <ForcePasswordChange />
      <IdleLockScreen />
      <ModalSessionConflict />
      <OfflineBanner />
      {!hideNavbar && <Navbar />}

      <main
        className={
          isKioskMode
            ? "h-screen w-screen overflow-hidden"
            : `flex w-full max-w-full flex-1 flex-col overflow-x-clip ${
                showBottomNav
                  ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6"
                  : "pb-6"
              }`
        }
      >
        <div key={location.pathname} className="flex flex-1 flex-col animate-in fade-in duration-300">
          <ErrorBoundary resetKey={location.pathname} fullscreen={!isKioskMode}>
            <Suspense fallback={<RouteAwareSkeleton />}>
              <Routes>
            {/* Rute Publik Terbatas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />

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
        </ErrorBoundary>
        </div>
      </main>

      {showBottomNav && <BottomNav />}
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
