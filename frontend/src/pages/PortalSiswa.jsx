import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  FileText,
  PenLine,
  UserCheck,
  Building2,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Eye,
  KeyRound,
  ShieldAlert,
  PlusCircle,
  Bell,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  getStatusPembinaan,
  getKategoriPelanggaran,
} from "../data/pelanggaranData";
import SignaturePadModal from "../components/SignaturePadModal";
import SelfFaceEnrollModal from "../components/SelfFaceEnrollModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
import ProfileModal from "../components/ProfileModal";
import NotificationDropdown from "../components/NotificationDropdown";
import { playNotificationSound } from "../utils/audioUtils";

export default function PortalSiswa() {
  const navigate = useNavigate();
  const { user, isSiswa, logout, saveSignature, updateUserProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [personalData, setPersonalData] = useState(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profil");
  const [notification, setNotification] = useState(null);
  const [pelanggaranList, setPelanggaranList] = useState([]);
  const [notifikasiList, setNotifikasiList] = useState([]);
  const prevNotifIdsRef = useRef(null);

  const openProfile = (tab = "profil") => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
  };

  // Jika bukan siswa, redirect ke halaman sesuai
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const prevPengajuanRef = useRef(null);

  const fetchPersonalData = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    try {
      const [resRekap, resPelanggaran, resNotif] = await Promise.allSettled([
        api.get("/siswa/me/rekap", {
          params: { siswa_id: user.id, nis: user.nis },
        }),
        api.get("/pelanggaran", {
          params: { siswa_id: user.id, nis: user.nis },
        }),
        api.get("/siswa/notifikasi"),
      ]);

      if (
        resRekap.status === "fulfilled" &&
        resRekap.value?.data &&
        resRekap.value.data.success
      ) {
        const newRekap = resRekap.value.data;
        const newPengajuan = newRekap.riwayat_pengajuan || [];

        // Sinkronisasi status siswa ke AuthContext & localStorage jika ada perubahan dari admin
        if (
          newRekap.siswa &&
          newRekap.siswa.status &&
          newRekap.siswa.status !== user?.status
        ) {
          updateUserProfile({
            status: newRekap.siswa.status,
            kelas: newRekap.siswa.kelas,
            nama: newRekap.siswa.nama,
          });
        }

        prevPengajuanRef.current = newPengajuan;
        setPersonalData(newRekap);
      }

      if (
        resPelanggaran.status === "fulfilled" &&
        resPelanggaran.value?.data &&
        resPelanggaran.value.data.success
      ) {
        setPelanggaranList(resPelanggaran.value.data.data || []);
      }

      if (
        resNotif.status === "fulfilled" &&
        resNotif.value?.data &&
        resNotif.value.data.success
      ) {
        const incomingNotifs = resNotif.value.data.notifikasi || [];
        setNotifikasiList(incomingNotifs);

        // Deteksi notifikasi baru secara realtime untuk trigger chime & toast
        if (prevNotifIdsRef.current !== null) {
          const oldIds = prevNotifIdsRef.current;
          const freshItems = incomingNotifs.filter(
            (item) => !oldIds.includes(item.id),
          );
          if (freshItems.length > 0) {
            const topItem = freshItems[0];
            const isDanger = freshItems.some((i) => i.category === "danger");
            const isSuccess = freshItems.some((i) => i.category === "success");
            if (isDanger) {
              playNotificationSound("error");
              setNotification({
                type: "error",
                message: `${topItem.judul}: ${topItem.pesan}`,
              });
            } else if (isSuccess) {
              playNotificationSound("success");
              setNotification({
                type: "success",
                message: `${topItem.judul}: ${topItem.pesan}`,
              });
            } else {
              playNotificationSound("info");
              setNotification({
                type: "info",
                message: `${topItem.judul}: ${topItem.pesan}`,
              });
            }
          }
        }
        prevNotifIdsRef.current = incomingNotifs.map((n) => n.id);
      }
    } catch (err) {
      if (!isSilent) {
        console.error("Gagal memuat rekap pribadi siswa:", err);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Real-time synchronization: polling berkala, broadcast channel, dan window focus
  useEffect(() => {
    fetchPersonalData(false);

    // 1. Silent polling setiap 5 detik saat tab aktif
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchPersonalData(true);
      }
    }, 5000);

    // 2. BroadcastChannel listener (instant sync antar-tab)
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_absensi_channel");
        bc.onmessage = (event) => {
          if (
            event.data?.type === "IZIN_VERIFIED" ||
            event.data?.type === "PJJ_UPDATED" ||
            event.data?.type === "PELANGGARAN_RECORDED" ||
            event.data?.type === "PIKET_ISSUED"
          ) {
            fetchPersonalData(true);
          }
        };
      }
    } catch {
      // ignore
    }

    // 3. Storage event listener (sync jika tab guru verifikasi di browser yang sama)
    const handleStorage = (e) => {
      if (
        e.key === "smkn21_last_izin_update" ||
        e.key === "smkn21_pjj_updated" ||
        e.key === "smkn21_last_pelanggaran_update" ||
        e.key === "smkn21_last_piket_update"
      ) {
        fetchPersonalData(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Focus listener (refresh instan saat siswa berpindah kembali ke tab ini)
    const handleFocus = () => {
      fetchPersonalData(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  const totalPoinPelanggaran = useMemo(() => {
    return pelanggaranList.reduce(
      (acc, curr) => acc + (Number(curr.poin) || 0),
      0,
    );
  }, [pelanggaranList]);

  const statusKedisiplinan = useMemo(() => {
    return getStatusPembinaan(totalPoinPelanggaran);
  }, [totalPoinPelanggaran]);

  // State Notifikasi Izin / Sakit yang telah disetujui / ditolak
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const raw = localStorage.getItem(`read_izin_notif_${user?.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotif = (notifId) => {
    setDismissedNotifIds((prev) => {
      const next = [...prev, notifId];
      if (user?.id) {
        localStorage.setItem(
          `read_izin_notif_${user.id}`,
          JSON.stringify(next),
        );
      }
      return next;
    });
  };

  const handleDismissAllNotif = () => {
    const all = (personalData?.riwayat_pengajuan || [])
      .filter(
        (n) =>
          n.status_pengajuan === "Disetujui" ||
          n.status_pengajuan === "Ditolak",
      )
      .map((n) => n.id);
    setDismissedNotifIds(all);
    if (user?.id) {
      localStorage.setItem(`read_izin_notif_${user.id}`, JSON.stringify(all));
    }
  };

  const notifikasiIzinList = useMemo(() => {
    const all = personalData?.riwayat_pengajuan || [];
    return all.filter((item) => {
      if (item.status_pengajuan === "Menunggu") return true;
      return !dismissedNotifIds.includes(item.id);
    });
  }, [personalData, dismissedNotifIds]);

  const handleSaveSignature = async (sigBase64) => {
    const res = await saveSignature(sigBase64);
    if (res.success) {
      setNotification({
        type: "success",
        message: "Tanda tangan digital Anda berhasil disimpan!",
      });
      fetchPersonalData();
    } else {
      setNotification({
        type: "error",
        message: res.message,
      });
    }
  };

  const stat = personalData?.statistik || {
    total_hadir: 0,
    tepat_waktu: 0,
    terlambat: 0,
    sakit: 0,
    izin: 0,
  };

  const isAlumni =
    user?.status === "Alumni" || personalData?.siswa?.status === "Alumni";

  // Hitung masa aktif akun alumni (1 tahun sejak tanggal_lulus)
  const alumniExpInfo = useMemo(() => {
    if (!isAlumni) return null;
    const tglLulusStr =
      user?.tanggal_lulus || personalData?.siswa?.tanggal_lulus;
    if (!tglLulusStr) return null;
    try {
      const tglLulus = new Date(tglLulusStr);
      const tglExp = new Date(tglLulus);
      tglExp.setFullYear(tglExp.getFullYear() + 1);
      const now = new Date();
      const diffMs = tglExp - now;
      const sisaHari = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        tanggalLulus: tglLulus.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        tanggalKadaluarsa: tglExp.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        sisaHari,
      };
    } catch {
      return null;
    }
  }, [isAlumni, user?.tanggal_lulus, personalData?.siswa?.tanggal_lulus]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Profil Siswa */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/20 relative">
        {/* Dekorasi blur diisolasi dalam wrapper overflow-hidden tersendiri agar tidak memotong dropdown notifikasi */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>

        {/* Pojok Kanan Atas: Tombol Profil Pengguna & Dropdown Notifikasi */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
          <button
            type="button"
            onClick={() => openProfile("profil")}
            title="Profil Pengguna & Pengaturan Akun"
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer"
          >
            {user?.foto_profil ? (
              <img
                src={user.foto_profil}
                alt={user?.nama || "Profil"}
                className="w-5 h-5 rounded-lg object-cover border border-white/40 shadow-xs"
              />
            ) : (
              <User className="w-4 h-4 text-blue-200" />
            )}
            <span>Profil</span>
          </button>

          <NotificationDropdown
            notifications={
              notifikasiList.length > 0
                ? notifikasiList
                : personalData?.riwayat_pengajuan || []
            }
            variant="header"
            align="right"
            role="siswa"
            userId={user?.id}
            onNavigate={(target) => {
              if (typeof target === "string") {
                navigate(target);
              }
            }}
            onActionClick={(notif) => {
              if (notif.action_url === "modal_face") {
                setIsFaceModalOpen(true);
              } else if (notif.action_url) {
                navigate(notif.action_url);
              }
            }}
          />
        </div>

        {/* Bagian Kiri: Diturunkan & Disejajarkan ke Tengah Vertikal */}
        <div className="relative z-10 pt-10 sm:pt-4 sm:pb-2 flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner flex-shrink-0 overflow-hidden">
            {user?.foto_profil ? (
              <img
                src={user.foto_profil}
                alt={user?.nama || "Foto Profil Siswa"}
                className="w-full h-full object-cover"
              />
            ) : (
              <GraduationCap className="w-9 h-9 sm:w-11 sm:h-11 text-blue-200" />
            )}
          </div>
          <div>
            <div className="mb-1">
              {isAlumni ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/40 text-[11px] font-extrabold tracking-wide uppercase text-amber-200 shadow-2xs">
                  <span>Alumni / Telah Lulus</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/30 text-[11px] font-bold tracking-wide uppercase text-blue-200">
                  <span>Siswa Aktif SMKN 21</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {user?.nama || "Nama Siswa"}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 font-medium">
              NIS {user?.nis} &bull; Kelas {user?.kelas}
            </p>
          </div>
        </div>
      </div>

      {/* Banner Informasi Khusus Alumni / Siswa yang Sudah Lulus */}
      {isAlumni && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-500/30 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-white flex-shrink-0 shadow-md shadow-amber-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900">
                  Alumni / Telah Lulus
                </h3>

                {alumniExpInfo && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {alumniExpInfo.sisaHari} Hari Tersisa (s/d{" "}
                    {alumniExpInfo.tanggalKadaluarsa})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Selamat atas kelulusan Anda dari SMKN 21 Jakarta! Akun alumni
                Anda diberikan masa akses aktif selama{" "}
                <strong>1 tahun sejak kelulusan</strong> untuk melihat arsip
                riwayat presensi, pengajuan izin, dan buku saku kedisiplinan.
                Fitur operasional presensi mandiri dan perizinan harian sekolah
                telah dinonaktifkan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Wajib Tanda Tangan Digital jika siswa belum memiliki tanda tangan (Khusus Siswa Aktif) */}
      {!user?.tanda_tangan && !isAlumni && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Tanda Tangan Digital Wajib Dimiliki</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                  Wajib
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Setiap siswa SMKN 21 wajib memiliki tanda tangan digital sebelum
                mengajukan surat izin/sakit atau keperluan presensi resmi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSignModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Buat Sekarang</span>
          </button>
        </div>
      )}

      {/* Tombol Aksi Cepat (HANYA MUNCUL UNTUK SISWA AKTIF) */}
      {!isAlumni && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/harian"
            className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Presensi Harian</h3>
                <p className="text-[11px] text-emerald-100">
                  Scan wajah mandiri
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/izin"
            className="group bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Surat Izin / Sakit</h3>
                <p className="text-[11px] text-amber-100">Formulir mandiri</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/pelanggaran"
            className="group bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Catat Pelanggaran</h3>
                <p className="text-[11px] text-rose-100">
                  Buku saku kedisiplinan
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* Ringkasan Kehadiran Saya */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Rekap Kehadiran Saya
            </h2>
            <p className="text-xs text-slate-500">
              Akumulasi presensi Anda selama terdaftar di SMKN 21
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPersonalData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Tepat Waktu
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">
              {stat.tepat_waktu}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
              Terlambat
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-700">
              {stat.terlambat}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/60">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
              Sakit
            </p>
            <p className="text-2xl sm:text-3xl font-black text-blue-700">
              {stat.sakit}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/60">
            <p className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
              Izin
            </p>
            <p className="text-2xl sm:text-3xl font-black text-purple-700">
              {stat.izin}
            </p>
          </div>
        </div>
      </div>

      {/* Riwayat Pengajuan Izin Saya */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Riwayat Pengajuan Izin Mandiri
        </h2>

        {personalData?.riwayat_pengajuan?.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {personalData.riwayat_pengajuan.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        item.jenis === "Sakit"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {item.jenis}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {item.tanggal_mulai} s/d {item.tanggal_selesai}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "{item.alasan}"
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status_pengajuan === "Disetujui"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status_pengajuan === "Ditolak"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status_pengajuan}
                  </span>
                  {item.catatan_guru && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      "{item.catatan_guru}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            Belum ada riwayat pengajuan surat izin mandiri.
          </div>
        )}
      </div>

      {/* Buku Saku Kedisiplinan & Poin Pelanggaran Saya */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Buku Saku & Poin Kedisiplinan Saya
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-rose-600">
                {totalPoinPelanggaran} Poin
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Poin Pelanggaran
              </span>
            </div>
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusKedisiplinan.badge}`}
            >
              {statusKedisiplinan.status}
            </span>
          </div>
        </div>

        {/* Status Pembinaan Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${statusKedisiplinan.badge}`}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{statusKedisiplinan.desc}</span>
          </div>
          <Link
            to="/pelanggaran"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-800 hover:bg-slate-50 rounded-xl font-bold shadow-xs transition-colors whitespace-nowrap text-xs cursor-pointer border border-slate-200/70"
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Formulir Pelanggaran</span>
          </Link>
        </div>

        {/* Tabel / List Riwayat Pelanggaran Siswa */}
        {pelanggaranList.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {pelanggaranList.map((item) => {
              const kat = getKategoriPelanggaran(item.poin);
              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${kat.badge}`}
                      >
                        {item.poin} Poin
                      </span>
                      <span className="text-xs font-semibold text-slate-500 font-mono">
                        {item.tanggal_waktu_formatted}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {item.jenis_pelanggaran}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Guru / Tendik Penegur{" "}
                      <span className="font-semibold text-slate-600">
                        {item.nama_penanggung_jawab}
                      </span>
                    </p>
                  </div>

                  {item.tanda_tangan_siswa && (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] text-slate-400 block mb-0.5">
                        TTD Pengakuan Siswa
                      </span>
                      <div className="h-10 w-20 border border-slate-200 bg-white rounded-lg p-0.5 flex items-center justify-center shadow-2xs">
                        <img
                          src={item.tanda_tangan_siswa}
                          alt="TTD"
                          className="max-h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            Selamat! Tidak ada catatan pelanggaran tata tertib. Pertahankan
            kedisiplinan Anda.
          </div>
        )}
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={handleSaveSignature}
        title="Tanda Tangan Digital Siswa"
        subtitle={`Goreskan tanda tangan digital ${user?.nama || "Siswa"} untuk verifikasi perizinan.`}
        initialSignature={user?.tanda_tangan}
      />

      {/* Self Face Biometric Enroll Modal */}
      <SelfFaceEnrollModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        user={user}
        onSuccess={(msg) => {
          updateUserProfile({ terdaftar: true });
          setNotification({ type: "success", message: msg });
          fetchPersonalData();
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={user}
        onSuccess={(msg) => {
          setNotification({ type: "success", message: msg });
        }}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          fetchPersonalData();
        }}
        initialTab={profileModalTab}
      />
    </div>
  );
}
