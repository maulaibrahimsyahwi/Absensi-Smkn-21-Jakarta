import React, { ReactNode } from "react";
import {
  Home,
  BarChart3,
  Camera,
  Users,
  ClipboardCheck,
  ShieldAlert,
  FileText,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { User, UserRole } from "../types";

export interface NavEntry {
  to: string;
  label: string;
  shortLabel: string;
  desc?: string;
  icon: (props?: { className?: string }) => ReactNode;
  isPrimary?: boolean;
  color?: string;
}

export interface NavConfigOptions {
  user?: User | null;
  role?: UserRole | string | null;
}

export function getNavEntries({ user, role }: NavConfigOptions): NavEntry[] {
  if (!user || !role) return [];

  if (role === "siswa") {
    const isAlumni = user.status === "Alumni";
    if (isAlumni) {
      return [
        {
          to: "/portal-siswa",
          label: "Portal Alumni",
          shortLabel: "Beranda",
          desc: "Rekap kelulusan & riwayat pribadi",
          icon: (p) => <GraduationCap className={p?.className || "w-5 h-5"} />,
          color: "amber",
        },
      ];
    }
    if (!user.terdaftar) {
      return [
        {
          to: "/portal-siswa",
          label:
            user.jenis_kelamin === "Perempuan"
              ? "Portal Siswi"
              : "Portal Siswa",
          shortLabel: "Beranda",
          desc: "Rekap & status biometrik wajah",
          icon: (p) => <GraduationCap className={p?.className || "w-5 h-5"} />,
          color: "blue",
        },
      ];
    }
    return [
      {
        to: "/portal-siswa",
        label:
          user.jenis_kelamin === "Perempuan"
            ? "Portal Siswi"
            : "Portal Siswa",
        shortLabel: "Beranda",
        desc: "Rekap, tanda tangan & riwayat pribadi",
        icon: (p) => <GraduationCap className={p?.className || "w-5 h-5"} />,
        color: "blue",
      },
      {
        to: "/harian",
        label: "Presensi Mandiri",
        shortLabel: "Absen Wajah",
        desc: "Scan wajah & GPS sekolah",
        icon: (p) => <Camera className={p?.className || "w-5 h-5"} />,
        isPrimary: true,
        color: "emerald",
      },
      {
        to: "/izin",
        label: "Pengajuan Izin",
        shortLabel: "Izin/Sakit",
        desc: "Kirim surat izin sakit / keperluan",
        icon: (p) => <FileText className={p?.className || "w-5 h-5"} />,
        color: "rose",
      },
      {
        to: "/pelanggaran",
        label: "Buku Saku Siswa",
        shortLabel: "Buku Saku",
        desc: "Buku saku catatan pelanggaran",
        icon: (p) => <BookOpen className={p?.className || "w-5 h-5"} />,
        color: "rose",
      },
    ];
  }

  if (role === "piket") {
    return [
      {
        to: "/portal-piket",
        label: "Beranda Piket",
        shortLabel: "Beranda",
        desc: "Pusat piket harian",
        icon: (p) => <Home className={p?.className || "w-5 h-5"} />,
        color: "blue",
      },
      {
        to: "/piket",
        label: "Meja Guru Piket",
        shortLabel: "Meja Piket",
        desc: "Penerbitan surat izin masuk & keluar",
        icon: (p) => <ClipboardCheck className={p?.className || "w-5 h-5"} />,
        color: "blue",
      },
      {
        to: "/harian",
        label: "Scan Kiosk",
        shortLabel: "Scan Kiosk",
        desc: "Scan siswa yang lupa bawa HP",
        icon: (p) => <Camera className={p?.className || "w-5 h-5"} />,
        isPrimary: true,
        color: "emerald",
      },
      {
        to: "/pelanggaran",
        label: "Catat Pelanggaran",
        shortLabel: "Pelanggaran",
        desc: "Catat pelanggaran siswa yang ditegur",
        icon: (p) => <ShieldAlert className={p?.className || "w-5 h-5"} />,
        color: "rose",
      },
      {
        to: "/dashboard",
        label: "Dashboard Piket",
        shortLabel: "Dashboard",
        desc: "Verifikasi izin & rekapitulasi piket",
        icon: (p) => <BarChart3 className={p?.className || "w-5 h-5"} />,
        color: "blue",
      },
    ];
  }

  // Admin
  return [
    {
      to: "/portal-admin",
      label: "Beranda Admin",
      shortLabel: "Beranda",
      desc: "Ringkasan statistik & pusat manajemen",
      icon: (p) => <Home className={p?.className || "w-5 h-5"} />,
      color: "purple",
    },
    {
      to: "/dashboard",
      label: "Dashboard Rekap",
      shortLabel: "Dashboard",
      desc: "Rekapitulasi presensi & operasional siswa",
      icon: (p) => <BarChart3 className={p?.className || "w-5 h-5"} />,
      color: "blue",
    },
    {
      to: "/harian",
      label: "Scan Kiosk",
      shortLabel: "Scan Kiosk",
      desc: "Terminal presensi wajah mandiri",
      icon: (p) => <Camera className={p?.className || "w-5 h-5"} />,
      isPrimary: true,
      color: "emerald",
    },
    {
      to: "/registrasi",
      label: "Data & Wajah Siswa",
      shortLabel: "Data Siswa",
      desc: "Registrasi biometrik & manajemen siswa",
      icon: (p) => <Users className={p?.className || "w-5 h-5"} />,
      color: "indigo",
    },
    {
      to: "/piket",
      label: "Meja Guru Piket",
      shortLabel: "Meja Piket",
      desc: "Penerbitan surat izin masuk & keluar",
      icon: (p) => <ClipboardCheck className={p?.className || "w-5 h-5"} />,
      color: "blue",
    },
    {
      to: "/pelanggaran",
      label: "Catat Pelanggaran",
      shortLabel: "Pelanggaran",
      desc: "Buku catatan pelanggaran siswa",
      icon: (p) => <ShieldAlert className={p?.className || "w-5 h-5"} />,
      color: "rose",
    },
    {
      to: "/izin",
      label: "Surat Izin / Sakit",
      shortLabel: "Surat Izin",
      desc: "Portal mandiri pengajuan izin siswa",
      icon: (p) => <FileText className={p?.className || "w-5 h-5"} />,
      color: "rose",
    },
  ];
}
