import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../../services/api";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  PenLine,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Search,
  RefreshCw,
  Lock,
  Calendar,
} from "lucide-react";

export default function ManajemenPiketTab() {
  const [stafList, setStafList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState(null);

  // Modal State: Tambah Guru Piket
  const [showAddModal, setShowAddModal] = useState(false);
  const [addNama, setAddNama] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("piket123");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Modal State: Edit Guru Piket
  const [editingStaf, setEditingStaf] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Modal State: Reset Password
  const [resetStaf, setResetStaf] = useState(null);
  const [resetNewPass, setResetNewPass] = useState("piket123");
  const [resetLoading, setResetLoading] = useState(false);

  // Modal State: Konfirmasi Hapus
  const [deletingStaf, setDeletingStaf] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStafList = async () => {
    setLoading(true);
    try {
      const res = await api.get("/staf");
      if (res.data && res.data.success) {
        setStafList(res.data.data || []);
      }
    } catch (err) {
      console.error("Gagal mengambil data staf guru piket:", err);
      showNotification("error", "Gagal memuat daftar akun staf guru piket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStafList();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filter staf pencarian (hanya menampilkan role piket untuk operasional guru piket, admin tetap ditampilkan sebagai referensi)
  const filteredStaf = stafList.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.nama.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term)
    );
  });

  const totalGuruPiket = stafList.filter((s) => s.role === "piket").length;
  const guruDenganTtd = stafList.filter(
    (s) => s.role === "piket" && s.has_signature,
  ).length;

  // Handle Tambah Guru Piket
  const handleCreateStaf = async (e) => {
    e.preventDefault();
    setAddError("");

    if (!addNama.trim()) {
      setAddError("Nama lengkap guru beserta gelar wajib diisi.");
      return;
    }
    if (!addUsername.trim()) {
      setAddError("Username / NIP akun wajib diisi.");
      return;
    }
    if (!addPassword.trim() || addPassword.length < 4) {
      setAddError("Kata sandi awal minimal 4 karakter.");
      return;
    }

    setAddLoading(true);
    try {
      const res = await api.post("/staf", {
        nama: addNama.trim(),
        username: addUsername.trim(),
        password: addPassword.trim(),
        role: "piket",
      });
      if (res.data && res.data.success) {
        showNotification(
          "success",
          res.data.message || "Akun Guru Piket berhasil ditambahkan!",
        );
        setShowAddModal(false);
        setAddNama("");
        setAddUsername("");
        setAddPassword("piket123");
        fetchStafList();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal menambahkan akun guru piket.";
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Edit Guru Piket
  const handleOpenEdit = (staf) => {
    setEditingStaf(staf);
    setEditNama(staf.nama);
    setEditUsername(staf.username);
    setEditPassword("");
    setEditError("");
  };

  const handleUpdateStaf = async (e) => {
    e.preventDefault();
    if (!editingStaf) return;
    setEditError("");

    setEditLoading(true);
    try {
      const payload = {
        nama: editNama.trim(),
        username: editUsername.trim(),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      const res = await api.put(`/staf/${editingStaf.id}`, payload);
      if (res.data && res.data.success) {
        showNotification(
          "success",
          `Data akun ${editNama} berhasil diperbarui.`,
        );
        setEditingStaf(null);
        fetchStafList();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal memperbarui data akun staf.";
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Reset Kata Sandi
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetStaf) return;
    setResetLoading(true);
    try {
      const res = await api.post(`/staf/${resetStaf.id}/reset_password`, {
        new_password: resetNewPass.trim() || "piket123",
      });
      if (res.data && res.data.success) {
        showNotification(
          "success",
          `Kata sandi ${resetStaf.nama} berhasil direset ke: ${resetNewPass}`,
        );
        setResetStaf(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal mereset kata sandi.";
      showNotification("error", msg);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Reset Tanda Tangan
  const handleResetSignature = async (staf) => {
    if (
      !window.confirm(
        `Reset tanda tangan digital untuk ${staf.nama}? Guru ini dapat menggambar tanda tangan baru saat login.`,
      )
    ) {
      return;
    }
    try {
      const res = await api.post(`/staf/${staf.id}/reset_signature`);
      if (res.data && res.data.success) {
        showNotification(
          "success",
          `Tanda tangan digital ${staf.nama} berhasil direset.`,
        );
        fetchStafList();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal mereset tanda tangan.";
      showNotification("error", msg);
    }
  };

  // Handle Hapus Akun Guru Piket
  const handleDeleteStaf = async () => {
    if (!deletingStaf) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/staf/${deletingStaf.id}`);
      if (res.data && res.data.success) {
        showNotification(
          "success",
          res.data.message || "Akun berhasil dihapus.",
        );
        setDeletingStaf(null);
        fetchStafList();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus akun.";
      showNotification("error", msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notifikasi */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold shadow-md animate-in fade-in duration-200 border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Info & Action Card */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Manajemen Akun Guru Piket
                </h3>
                <p className="text-xs text-blue-200">
                  SMKN 21 Jakarta • Master Pengguna & Tanda Tangan Petugas
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-100/90 mt-2.5 max-w-xl leading-relaxed">
              Setiap guru memiliki akun personal masing-masing. Saat guru piket
              login, nama beliau otomatis tertera di formulir Meja Piket,
              pengesahan izin, dan e-slip surat izin yang dicetak.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setAddNama("");
                setAddUsername("");
                setAddPassword("piket123");
                setAddError("");
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-blue-700 font-bold text-xs sm:text-sm shadow-md hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Tambah Guru Piket</span>
            </button>
          </div>
        </div>

        {/* 3 Metrik Cepat Staf */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-blue-200 block font-medium">
              Total Guru Piket
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              {totalGuruPiket} Akun
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <span className="text-[11px] text-emerald-300 block font-medium">
              Tanda Tangan Aktif
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              {guruDenganTtd} Guru
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-amber-200 block font-medium">
              Belum Ada TTD
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              {totalGuruPiket - guruDenganTtd} Guru
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian & Refresh */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama guru atau username/NIP..."
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={fetchStafList}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
          title="Segarkan daftar"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`}
          />
          <span className="hidden sm:inline">Muat Ulang</span>
        </button>
      </div>

      {/* Tabel Data Staf / Guru Piket */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden min-h-[380px]">
        {loading ? (
          <div className="py-16 min-h-[380px] flex flex-col items-center justify-center text-center text-slate-400">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              Memuat data akun staf guru piket...
            </p>
          </div>
        ) : filteredStaf.length === 0 ? (
          <div className="py-16 min-h-[380px] flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="font-bold text-slate-700 text-sm">
              Tidak Ada Akun Guru Piket
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm
                ? "Tidak ada akun yang sesuai dengan pencarian."
                : "Belum ada akun guru piket yang ditambahkan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                  <th className="py-3 px-4">Username / NIP</th>
                  <th className="py-3 px-4">Peran</th>
                  <th className="py-3 px-4">Tanda Tangan Digital</th>
                  <th className="py-3 px-4">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaf.map((staf) => {
                  const isPrimaryAdmin =
                    staf.username === "admin" || staf.role === "admin";
                  return (
                    <tr
                      key={staf.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Nama Guru */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isPrimaryAdmin
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {staf.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {staf.nama}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: #{staf.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Username / NIP */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {staf.username}
                      </td>

                      {/* Peran */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isPrimaryAdmin
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isPrimaryAdmin ? "Admin Utama" : "Guru Piket"}
                        </span>
                      </td>

                      {/* Status Tanda Tangan Digital */}
                      <td className="py-3 px-4">
                        {staf.has_signature ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span>Tersedia</span>
                            </span>
                            {!isPrimaryAdmin && (
                              <button
                                type="button"
                                onClick={() => handleResetSignature(staf)}
                                title="Reset tanda tangan agar guru dapat menandatangani ulang"
                                className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold underline cursor-pointer"
                              >
                                Reset TTD
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Belum Dibuat
                          </span>
                        )}
                      </td>

                      {/* Tanggal Terdaftar */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {staf.created_at || "Bawaan Sistem"}
                      </td>

                      {/* Tombol Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Data */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staf)}
                            title="Edit nama / username"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Reset Kata Sandi */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetStaf(staf);
                              setResetNewPass("piket123");
                            }}
                            title="Reset Kata Sandi Akun"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Hapus (Hanya untuk guru piket, dilarang hapus admin utama) */}
                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeletingStaf(staf)}
                              title="Hapus Akun Guru Piket"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL TAMBAH GURU PIKET ================= */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">
                      Tambah Guru Piket Baru
                    </h4>
                    <p className="text-xs text-blue-200">
                      Pendaftaran akun resmi SMKN 21
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateStaf} className="p-5 space-y-4">
                {addError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Beserta Gelar{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addNama}
                    onChange={(e) => setAddNama(e.target.value)}
                    placeholder="Contoh: Drs. H. Mulyadi, M.Pd"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nama ini akan otomatis tertera di Surat Izin Siswa.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username / NIP Akun <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="Contoh: 197805122005011002 atau mulyadi"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Digunakan oleh guru untuk masuk ke sistem.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Awal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Default: piket123"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Guru dapat mengubah kata sandi ini kapan saja di Profil.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {addLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Daftarkan Guru Piket</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ================= MODAL EDIT GURU PIKET ================= */}
      {editingStaf &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">
                      Edit Akun Guru Piket
                    </h4>
                    <p className="text-xs text-slate-400">
                      ID: #{editingStaf.id} • {editingStaf.role.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStaf(null)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStaf} className="p-5 space-y-4">
                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Beserta Gelar
                  </label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username / NIP Akun
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Baru (Kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tetap"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaf(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {editLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Perubahan</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ================= MODAL RESET KATA SANDI ================= */}
      {resetStaf &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-amber-50">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Reset Kata Sandi Akun
                  </h4>
                  <p className="text-xs text-slate-500">{resetStaf.nama}</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="p-5 space-y-4">
                <p className="text-xs text-slate-600">
                  Atur ulang kata sandi akun guru piket ini agar guru dapat
                  login kembali jika lupa kata sandinya.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="text"
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Contoh: piket123"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStaf(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {resetLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Reset Sandi Sekarang</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ================= MODAL KONFIRMASI HAPUS ================= */}
      {deletingStaf &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-bold text-slate-900">
                  Hapus Akun Guru Piket?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus akun{" "}
                  <strong>{deletingStaf.nama}</strong> ({deletingStaf.username}
                  )? Guru ini tidak akan dapat login kembali.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingStaf(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStaf}
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Ya, Hapus Akun</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
