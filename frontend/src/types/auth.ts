export type UserRole = 'admin' | 'piket' | 'siswa';

export interface User {
  id: number | string;
  username: string;
  nama: string;
  role: UserRole;
  foto?: string | null;
  foto_profil?: string | null;
  tanda_tangan?: string | null;
  signature_url?: string | null;
  terdaftar?: boolean;
  nis?: string;
  nisn?: string;
  kelas?: string;
  jurusan?: string;
  jenis_kelamin?: 'L' | 'P' | 'Laki-laki' | 'Perempuan' | string;
  status?: string;
  two_factor_enabled?: boolean;
  is_2fa_enabled?: boolean;
  [key: string]: unknown;
}

export type AuthUser = User;

export interface Siswa {
  id: number;
  nis: string;
  nisn?: string;
  nama: string;
  kelas: string;
  jurusan?: string;
  jenis_kelamin?: 'L' | 'P' | 'Laki-laki' | 'Perempuan' | string;
  kontak_ortu?: string;
  nomor_hp_ortu?: string;
  status?: 'Aktif' | 'Alumni' | string;
  terdaftar?: boolean;
  sample_count?: number;
  face_encoding?: string | boolean | null;
  tanda_tangan?: string | boolean | null;
  medical_exemption_until?: string | null;
  medical_exemption_alasan?: string | null;
  is_medical_exempt?: boolean;
  medical_exempt_reason?: string | null;
  foto?: string | null;
  has_face_embedding?: boolean;
  has_totp?: boolean;
  created_at?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  isSessionExpiredModalOpen?: boolean;
  closeSessionExpiredModal?: () => void;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  require_2fa?: boolean;
  temp_token?: string;
}
