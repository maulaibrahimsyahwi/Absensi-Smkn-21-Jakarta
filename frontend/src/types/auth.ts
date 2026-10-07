import type { HolidayStatusResponse } from './libur';

export type UserRole = 'admin' | 'piket' | 'siswa';
export type JenisKelamin = 'Laki-laki' | 'Perempuan' | 'L' | 'P';
export type StatusSiswa = 'Aktif' | 'Alumni';

export interface ServiceResult {
  success: boolean;
  message?: string;
}

export interface BaseUser {
  id: number;
  username: string;
  nama: string;
  foto_profil?: string | null;
  tanda_tangan?: string | null;
  has_signature?: boolean;
  two_factor_enabled?: boolean;
  // Field opsional pada base untuk mempermudah akses sebelum narrowing
  nis?: string;
  nisn?: string;
  kelas?: string;
  jurusan?: string;
  jenis_kelamin?: JenisKelamin;
  status?: StatusSiswa;
  tanggal_lulus?: string | null;
  is_alumni_expired?: boolean;
  terdaftar?: boolean;
  must_change_password?: boolean;
}

export interface StaffUser extends BaseUser {
  role: 'admin' | 'piket';
}

export interface StudentUser extends BaseUser {
  role: 'siswa';
  nis: string;
  kelas: string;
}

export type User = StaffUser | StudentUser;
export type AuthUser = User;

/**
 * Normalisasi objek user dari respon server / localStorage ke tipe User yang konsisten.
 */
export function normalizeUser(raw: Record<string, unknown>): User {
  const role = (raw.role as UserRole) || 'siswa';
  const base: BaseUser = {
    id: Number(raw.id),
    username: String(raw.username ?? raw.nis ?? ''),
    nama: String(raw.nama ?? ''),
    foto_profil: (raw.foto_profil ?? raw.foto ?? null) as string | null,
    tanda_tangan: (raw.tanda_tangan ?? raw.signature_url ?? null) as string | null,
    has_signature: Boolean(raw.has_signature ?? raw.signature_url ?? raw.tanda_tangan),
    two_factor_enabled: Boolean(raw.two_factor_enabled ?? raw.is_2fa_enabled),
    status: (raw.status as StatusSiswa) || 'Aktif',
    terdaftar: Boolean(raw.terdaftar ?? raw.face_encoding),
    must_change_password: Boolean(raw.must_change_password),
  };

  if (role === 'siswa') {
    return {
      ...base,
      role: 'siswa',
      nis: String(raw.nis ?? raw.username ?? ''),
      kelas: String(raw.kelas ?? ''),
      jurusan: raw.jurusan ? String(raw.jurusan) : undefined,
      jenis_kelamin: (raw.jenis_kelamin as JenisKelamin) || 'Laki-laki',
    } as StudentUser;
  }

  return {
    ...base,
    role: role as 'admin' | 'piket',
  } as StaffUser;
}

/**
 * Entitas Siswa SMKN 21 Jakarta (Sesuai skema database `siswa`).
 * Catatan UU PDP: Nilai embedding biometrik wajah (face_encoding) tidak dikirimkan ke klien.
 */
export interface Siswa {
  id: number;
  nis: string;
  nisn?: string;
  nama: string;
  kelas: string;
  jurusan?: string;
  jenis_kelamin: JenisKelamin;
  status?: StatusSiswa;
  tanggal_lulus?: string | null;
  is_alumni_expired?: boolean;
  terdaftar?: boolean;
  sample_count?: number;
  has_signature?: boolean;
  tanda_tangan?: string | null;
  foto_profil?: string | null;
  two_factor_enabled?: boolean;
  must_change_password?: boolean;
  is_deleted?: boolean;
  medical_exemption_until?: string | null;
  medical_exemption_alasan?: string | null;
  created_at?: string;
}

export type LoginResponse =
  | {
      success: true;
      token: string;
      session_token?: string;
      user: User;
      must_change_password?: boolean;
      require_2fa?: false;
      requires_2fa?: false;
      message?: string;
    }
  | {
      success: false;
      requires_2fa: true;
      role?: UserRole;
      message: string;
      temp_token?: string;
    }
  | {
      success: false;
      message: string;
      requires_2fa?: false;
      require_2fa?: false;
    };

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPiket: boolean;
  isSiswa: boolean;
  initializing: boolean;
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  saveSignature: (signatureBase64: string, password?: string) => Promise<ServiceResult>;
  updateFotoProfil: (fotoUrl: string) => Promise<ServiceResult>;
  deleteFotoProfil: () => Promise<ServiceResult>;
  updateUserProfile: (patchData: Partial<User>) => void;
  updateName: (newName: string) => Promise<ServiceResult>;
  loadingAuth: boolean;
  todayStatus: HolidayStatusResponse | null;
  loadingTodayStatus: boolean;
  refreshTodayStatus: () => Promise<void>;
  isSessionExpiredModalOpen?: boolean;
  closeSessionExpiredModal?: () => void;
}
