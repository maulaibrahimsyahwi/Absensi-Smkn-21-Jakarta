import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Camera,
  FileText,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  User,
  Lock,
  X,
  Sun,
  Flag,
  Clock,
  HeartPulse,
} from "lucide-react";
import { Skeleton } from "../components/common/Skeleton";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  getStatusPembinaan,
  getKategoriPelanggaran,
} from "../data/pelanggaranData";
import SignaturePadModal from "../components/SignaturePadModal";
import ProfileModal from "../components/ProfileModal";
import ToastNotification, {
  ToastNotificationData,
} from "../components/common/ToastNotification";
import NotificationDropdown from "../components/NotificationDropdown";
import { playNotificationSound } from "../utils/audioUtils";
import ModalPreviewSuratEdaran from "../components/libur/ModalPreviewSuratEdaran";
import { useRealtimeSubscription } from "../services/realtimeService";
import { Pelanggaran } from "../types/pelanggaran";
import { LiburEvent } from "../types/libur";
import { useCountUp } from "../hooks/useCountUp";

interface RekapStatistik {
  total_hadir: number;
  tepat_waktu: number;
  terlambat: number;
  sakit: number;
  izin: number;
}

interface PengajuanIzinItem {
  id: string | number;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  status_pengajuan: "Menunggu" | "Disetujui" | "Ditolak";
  catatan_guru?: string;
  [key: string]: any;
}

interface PersonalDataResponse {
  siswa?: any;
  statistik?: RekapStatistik;
  riwayat_pengajuan?: PengajuanIzinItem[];
  status_hari_ini?: {
    is_holiday?: boolean;
    is_school_day?: boolean;
    is_special_school_day?: boolean;
    message?: string;
    holiday_event?: LiburEvent;
  };
  [key: string]: any;
}

interface NotificationBanner {
  type: "success" | "error" | "info";
  message: string;
}

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  purple: "bg-purple-50 text-purple-700 ring-purple-100",
} as const;

function StatCard({
  label,
  value,
  tone,
  icon,
  index,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  index: number;
}) {
  const n = useCountUp(value);
  return (
    <div
      className="rise-in card-lift rounded-2xl border border-slate-200/80 bg-white p-4"
      style={{ "--i": index } as React.CSSProperties}
    >
      <span
        className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ring-1 ${TONES[tone]}`}
      >
        {icon}
      </span>
      <p className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {n}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function PortalSiswaSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat portal siswa"
      className="mx-auto max-w-6xl space-y-4 px-3.5 py-5 pb-28 sm:px-6 sm:py-8 lg:pb-8"
    >
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-3xl" />
    </div>
  );
}

export default function PortalSiswa(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, saveSignature, updateUserProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [personalData, setPersonalData] = useState<PersonalDataResponse | null>(
    null,
  );
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profil");
  const [notification, setNotification] =
    useState<ToastNotificationData | null>(null);
  const [pelanggaranList, setPelanggaranList] = useState<Pelanggaran[]>([]);
  const [notifikasiList, setNotifikasiList] = useState<any[]>([]);
  const [previewSuratData, setPreviewSuratData] = useState<LiburEvent | null>(
    null,
  );
  const prevNotifIdsRef = useRef<(string | number)[] | null>(null);

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

  // Tangani peringatan saat pengguna dialihkan dari rute operasional yang terkunci
  useEffect(() => {
    if (location.state?.biometricLocked) {
      setNotification({
        type: "error",
        message:
          "Lakukan perekaman biometrik wajah melalui Admin / Tata Usaha terlebih dahulu",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const prevPengajuanRef = useRef<PengajuanIzinItem[] | null>(null);

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

        // Sinkronisasi status & profil siswa ke AuthContext & localStorage jika ada perubahan dari admin
        if (
          newRekap.siswa &&
          (newRekap.siswa.status !== user?.status ||
            newRekap.siswa.jenis_kelamin !== user?.jenis_kelamin ||
            newRekap.siswa.kelas !== user?.kelas ||
            newRekap.siswa.nama !== user?.nama)
        ) {
          updateUserProfile({
            status: newRekap.siswa.status,
            kelas: newRekap.siswa.kelas,
            nama: newRekap.siswa.nama,
            jenis_kelamin: newRekap.siswa.jenis_kelamin,
          });
        }

        // Jika hari ini libur, kunci portal siswa dan alihkan ke Halaman Libur Mandiri
        if (
          newRekap.status_hari_ini &&
          !newRekap.status_hari_ini.is_school_day
        ) {
          navigate("/libur", { replace: true });
          return;
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
            (item: any) => !oldIds.includes(item.id),
          );
          if (freshItems.length > 0) {
            const topItem = freshItems[0];
            const isDanger = freshItems.some(
              (i: any) => i.category === "danger",
            );
            const isSuccess = freshItems.some(
              (i: any) => i.category === "success",
            );
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
        prevNotifIdsRef.current = incomingNotifs.map((n: any) => n.id);
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
  }, [user]);

  // Sinkronisasi data otomatis secara realtime lintas tab & perangkat
  useRealtimeSubscription(
    ["presensi", "izin", "pelanggaran", "piket", "siswa", "pjj", "libur"],
    () => {
      fetchPersonalData(true);
    },
  );

  // Hitung akumulasi poin bersih: Total pelanggaran dikurangi prestasi terkonfirmasi
  const { totalPoinPelanggaran, totalPoinPrestasi, netPoinKedisiplinan } =
    useMemo(() => {
      let violation = 0;
      let prestasi = 0;

      for (const item of pelanggaranList) {
        if (
          item.status_verifikasi === "Ditolak" ||
          item.status_verifikasi === "Menunggu Konfirmasi"
        ) {
          continue;
        }
        const p = Number(item.poin) || 0;
        if (item.kategori === "Prestasi") {
          prestasi += p;
        } else {
          violation += p;
        }
      }

      return {
        totalPoinPelanggaran: violation,
        totalPoinPrestasi: prestasi,
        netPoinKedisiplinan: Math.max(0, violation - prestasi),
      };
    }, [pelanggaranList]);

  const statusKedisiplinan = useMemo(() => {
    return getStatusPembinaan(netPoinKedisiplinan);
  }, [netPoinKedisiplinan]);

  // State Notifikasi Izin / Sakit yang telah disetujui / ditolak
  const [dismissedNotifIds, setDismissedNotifIds] = useState<
    (string | number)[]
  >(() => {
    try {
      const raw = localStorage.getItem(`read_izin_notif_${user?.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotif = (notifId: string | number) => {
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

  const handleSaveSignature = async (sigBase64: string) => {
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
        message: res.message || "Gagal menyimpan tanda tangan digital",
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
      const diffMs = tglExp.getTime() - now.getTime();
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

  if (loading && !personalData) {
    return <PortalSiswaSkeleton />;
  }

  return (
    <div className="min-h-screen py-5 sm:py-8 px-3.5 sm:px-6 max-w-6xl mx-auto space-y-3 sm:space-y-4">
      {/* Toast Notification Terpadu */}
      <ToastNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Header Profil Siswa */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-blue-900/20 relative">
        {/* Dekorasi blur diisolasi dalam wrapper overflow-hidden tersendiri agar tidak memotong dropdown notifikasi */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>

        {/* Konten Header: Responsif Mobile & Tablet */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sisi Kiri: Foto Profil & Info Siswa */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner flex-shrink-0 overflow-hidden">
              {user?.foto_profil ? (
                <img
                  src={user.foto_profil}
                  alt={
                    user?.nama ||
                    (user?.jenis_kelamin === "Perempuan"
                      ? "Foto Profil Siswi"
                      : "Foto Profil Siswa")
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-8 h-8 sm:w-11 sm:h-11 text-blue-200" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1">
                {isAlumni ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/40 text-[10px] sm:text-[11px] font-extrabold tracking-wide uppercase text-amber-200 shadow-2xs">
                    <span>Alumni / Telah Lulus</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/30 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-blue-200">
                    <span>
                      {user?.jenis_kelamin === "Perempuan"
                        ? "Siswi Aktif SMKN 21"
                        : "Siswa Aktif SMKN 21"}
                    </span>
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate sm:whitespace-normal">
                {user?.nama ||
                  (user?.jenis_kelamin === "Perempuan"
                    ? "Nama Siswi"
                    : "Nama Siswa")}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 font-medium truncate">
                {user?.nis} &bull; {user?.kelas}
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Dropdown Notifikasi & Profil (Desktop) */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <button
              type="button"
              onClick={() => openProfile("profil")}
              title="Profil Pengguna & Pengaturan Akun"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer"
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
                  setNotification({
                    type: "error",
                    message:
                      "Perekaman biometrik wajah wajib dilakukan melalui Administrator / Tata Usaha Sekolah",
                  });
                } else if (notif.action_url) {
                  navigate(notif.action_url);
                }
              }}
            />
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
                Selamat atas kelulusan Anda! Akun alumni aktif selama{" "}
                <strong>1 tahun</strong> untuk melihat arsip presensi, riwayat
                izin, dan catatan kedisiplinan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Peringatan Biometrik Wajah Belum Terdaftar (Khusus Siswa Aktif) */}
      {!user?.terdaftar && !isAlumni && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-slate-50 border border-rose-500/30 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-600 text-white flex-shrink-0 shadow-md shadow-rose-600/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900">
                  Biometrik Wajah Belum Terdaftar
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Akun belum memiliki rekaman biometrik wajah resmi. Silakan
                hubungi <strong>Admin atau Petugas Tata Usaha</strong> untuk
                aktivasi akun.
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
                Wajib dibuat sebelum mengajukan surat izin/sakit atau keperluan
                presensi resmi.
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

      {/* Banner Informasi Hari Libur Sekolah / Libur Semester */}
      {personalData?.status_hari_ini?.is_holiday && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-amber-500/5 border border-purple-500/30 text-slate-800 flex items-start sm:items-center justify-between gap-3.5 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-md shadow-purple-600/20">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {personalData.status_hari_ini.holiday_event?.nama ||
                    "Hari Libur Sekolah"}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  {personalData.status_hari_ini.holiday_event?.kategori ===
                  "libur_semester"
                    ? "Libur Semester"
                    : "Libur Resmi"}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {personalData.status_hari_ini.message ||
                  "Hari ini operasional sekolah dan presensi harian diliburkan."}
              </p>
              {personalData.status_hari_ini.holiday_event?.lampiran_surat && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSuratData(
                        personalData.status_hari_ini!.holiday_event!,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span> Lihat Surat Edaran Resmi</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner Kegiatan Masuk Khusus (Upacara / Event Sekolah di Luar Hari Normal) */}
      {personalData?.status_hari_ini?.is_special_school_day && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/5 border border-amber-500/40 text-slate-800 flex items-start sm:items-center justify-between gap-3.5 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 shadow-md shadow-amber-500/20">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Wajib Hadir:{" "}
                  {personalData.status_hari_ini.holiday_event?.nama ||
                    "Kegiatan Khusus Sekolah"}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                  Masuk Khusus
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {personalData.status_hari_ini.holiday_event?.keterangan ||
                  "Kegiatan wajib sekolah. Siswa diharapkan hadir dan melakukan presensi."}
              </p>
              {personalData.status_hari_ini.holiday_event?.lampiran_surat && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewSuratData(
                        personalData.status_hari_ini!.holiday_event!,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span> Lihat Surat Edaran Resmi</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tombol Aksi Cepat Siswa (Tampil di Smartphone, Tablet, & Desktop) */}
      {!isAlumni && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {user?.terdaftar ? (
            <Link
              to="/harian"
              className="card-lift press group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-blue-300"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white shrink-0">
                  <Camera className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    Presensi Harian
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {personalData?.status_hari_ini?.is_holiday
                      ? "Sedang Libur"
                      : personalData?.status_hari_ini?.is_special_school_day
                        ? "Masuk Khusus"
                        : "Scan wajah mandiri"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
            </Link>
          ) : (
            <div
              onClick={() =>
                setNotification({
                  type: "error",
                  message:
                    "Lakukan perekaman biometrik wajah melalui Admin / Tata Usaha terlebih dahulu",
                })
              }
              className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 cursor-not-allowed select-none opacity-80"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-200/70 text-slate-500 shrink-0">
                  <Camera className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-600 truncate">
                      Presensi Harian
                    </h3>
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Wajib biometrik wajah
                  </p>
                </div>
              </div>
            </div>
          )}

          {user?.terdaftar ? (
            <Link
              to="/izin"
              className="card-lift press group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-amber-300"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white shrink-0">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    Surat Izin / Sakit
                  </h3>
                  <p className="text-xs text-slate-500 truncate">Formulir mandiri</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
            </Link>
          ) : (
            <div
              onClick={() =>
                setNotification({
                  type: "error",
                  message:
                    "Lakukan perekaman biometrik wajah melalui Admin / Tata Usaha terlebih dahulu",
                })
              }
              className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 cursor-not-allowed select-none opacity-80"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-200/70 text-slate-500 shrink-0">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-600 truncate">
                      Surat Izin / Sakit
                    </h3>
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Wajib biometrik wajah
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Catat / Pengakuan Pelanggaran Mandiri Siswa */}
          <Link
            to="/pelanggaran"
            className="card-lift press group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-rose-300"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  Catat Pelanggaran
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Formulir pengakuan mandiri
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
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
              Akumulasi presensi Anda selama terdaftar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            index={0}
            label="Tepat Waktu"
            value={stat.tepat_waktu}
            tone="emerald"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            index={1}
            label="Terlambat"
            value={stat.terlambat}
            tone="amber"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            index={2}
            label="Sakit"
            value={stat.sakit}
            tone="blue"
            icon={<HeartPulse className="h-4 w-4" />}
          />
          <StatCard
            index={3}
            label="Izin"
            value={stat.izin}
            tone="purple"
            icon={<FileText className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Riwayat Pengajuan Izin Saya */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Riwayat Pengajuan Izin Mandiri
        </h2>

        {personalData?.riwayat_pengajuan &&
        personalData.riwayat_pengajuan.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {personalData.riwayat_pengajuan.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase flex-shrink-0 ${
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
                  <p className="text-xs text-slate-600 italic break-words">
                    "{item.alasan}"
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
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
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-[150px] sm:max-w-xs truncate">
                      "{item.catatan_guru}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            Belum ada riwayat pengajuan surat izin mandiri
          </div>
        )}
      </div>

      {/* Buku Saku Kedisiplinan & Poin Pelanggaran Saya */}
      <div
        id="buku-kedisiplinan"
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 scroll-mt-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Buku Saku & Poin Kedisiplinan Saya
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {totalPoinPrestasi > 0 && (
              <div className="text-left sm:text-right pr-3 border-r border-slate-200">
                <span className="text-xl sm:text-2xl font-black text-emerald-600">
                  {totalPoinPrestasi} Poin
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Poin Prestasi
                </span>
              </div>
            )}
            <div className="text-left sm:text-right">
              <span
                className={`text-xl sm:text-2xl font-black ${netPoinKedisiplinan > 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {netPoinKedisiplinan} Poin
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {totalPoinPrestasi > 0
                  ? "Poin Bersih Pelanggaran"
                  : "Total Poin Pelanggaran"}
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold border border-rose-200 shadow-2xs transition"
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
                        TTD Pengakuan{" "}
                        {user?.jenis_kelamin === "Perempuan"
                          ? "Siswi"
                          : "Siswa"}
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
            Tidak ada catatan pelanggaran. Pertahankan kedisiplinan Anda.
          </div>
        )}
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={handleSaveSignature}
        title={`Tanda Tangan Digital ${user?.jenis_kelamin === "Perempuan" ? "Siswi" : "Siswa"}`}
        subtitle={`Goreskan tanda tangan digital ${user?.nama || (user?.jenis_kelamin === "Perempuan" ? "Siswi" : "Siswa")} untuk verifikasi perizinan.`}
        initialSignature={user?.tanda_tangan}
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

      {/* Modal Pratinjau Surat Edaran Resmi */}
      <ModalPreviewSuratEdaran
        isOpen={Boolean(previewSuratData)}
        onClose={() => setPreviewSuratData(null)}
        suratData={previewSuratData}
      />
    </div>
  );
}
