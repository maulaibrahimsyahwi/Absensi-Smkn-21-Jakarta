import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "./components/Navbar";

// Lazy-loaded page components for route-level code splitting
const Home = React.lazy(() => import("./pages/Home"));
const AbsensiHarian = React.lazy(() => import("./pages/AbsensiHarian"));
const AbsensiPerpus = React.lazy(() => import("./pages/AbsensiPerpus"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const RegistrasiSiswa = React.lazy(() => import("./pages/RegistrasiSiswa"));
const PengajuanIzin = React.lazy(() => import("./pages/PengajuanIzin"));
const GuruPiket = React.lazy(() => import("./pages/GuruPiket"));

// Shared loading fallback shown while lazy chunks are being fetched
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm font-medium">Memuat halaman...</span>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  // Mode kiosk layar penuh untuk kamera absensi (tanpa navbar & tanpa footer)
  const isKioskMode =
    location.pathname === "/harian" || location.pathname === "/perpus";

  return (
    <div
      className={`min-h-screen font-sans ${
        isKioskMode
          ? "bg-black overflow-hidden h-screen w-screen"
          : "bg-slate-50 flex flex-col text-slate-800"
      }`}
    >
      {!isKioskMode && <Navbar />}

      <main
        className={
          isKioskMode
            ? "h-screen w-screen overflow-hidden"
            : "flex-1 flex flex-col"
        }
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/harian" element={<AbsensiHarian />} />
            <Route path="/perpus" element={<AbsensiPerpus />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/registrasi" element={<RegistrasiSiswa />} />
            <Route path="/izin" element={<PengajuanIzin />} />
            <Route path="/piket" element={<GuruPiket />} />
          </Routes>
        </Suspense>
      </main>

      {!isKioskMode && (
        <footer className="py-6 border-t border-slate-200 bg-white/80 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <p className="font-medium text-slate-600">
              SMKN 21 Jakarta &copy; {new Date().getFullYear()} • Sistem
              Presensi
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
