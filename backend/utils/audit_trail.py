from datetime import datetime
from flask import request
from models import db, AuditLog

def record_audit_log(user_id, role, user_name, action, target_type=None, target_id=None, keterangan=None, ip_address=None):
    """
    Mencatat jejak audit (audit trail) untuk tindakan administratif atau kedisiplinan penting.
    
    Parameters:
    - user_id: ID pengguna yang melakukan aksi
    - role: Peran pengguna ('admin', 'piket', 'staf')
    - user_name: Nama lengkap pengguna
    - action: Jenis aksi (e.g. 'VERIFIKASI_IZIN', 'HAPUS_PELANGGARAN', 'RESET_PASSWORD', 'CATAT_PELANGGARAN')
    - target_type: Objek yang diubah (e.g. 'PengajuanIzin', 'PelanggaranSiswa', 'Siswa')
    - target_id: ID atau NIS objek terkait
    - keterangan: Rincian keterangan audit
    - ip_address: IP address pemohon (opsional, jika kosong diambil dari request)
    """
    try:
        if not ip_address and request:
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                ip_address = forwarded.split(",")[0].strip()
            else:
                ip_address = request.remote_addr or "127.0.0.1"

        log_entry = AuditLog(
            user_id=user_id,
            role=role or "staf",
            user_name=user_name or "Sistem",
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            keterangan=keterangan,
            ip_address=ip_address,
            created_at=datetime.now()
        )
        db.session.add(log_entry)
        db.session.commit()
        return log_entry
    except Exception as e:
        db.session.rollback()
        print(f"[AUDIT] Gagal menyimpan audit log: {e}")
        return None
