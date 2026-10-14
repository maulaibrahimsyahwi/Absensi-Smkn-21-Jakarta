from datetime import datetime
from flask import request
from models import db, AuditLog

def record_audit_log(user_id, role, user_name="Sistem", action="ACTION", target_type=None, target_id=None, keterangan=None, ip_address=None, **kwargs):
    """
    Mencatat jejak audit (audit trail) untuk tindakan administratif atau kedisiplinan penting.
    
    Parameters:
    - user_id: ID pengguna yang melakukan aksi
    - role: Peran pengguna ('admin', 'piket', 'staf', 'siswa')
    - user_name: Nama lengkap pengguna
    - action: Jenis aksi (e.g. 'VERIFIKASI_IZIN', 'SESSION_OVERRIDDEN', 'RESET_PASSWORD', 'CATAT_PELANGGARAN')
    - target_type: Objek yang diubah (e.g. 'PengajuanIzin', 'PelanggaranSiswa', 'Siswa', 'User')
    - target_id: ID atau NIS objek terkait
    - keterangan: Rincian keterangan audit (alias: details)
    - ip_address: IP address pemohon (opsional, jika kosong diambil dari request)
    """
    if not keterangan and 'details' in kwargs:
        keterangan = kwargs['details']
    try:
        if not ip_address:
            try:
                # Menggunakan request.remote_addr yang telah divalidasi dan disanitasi oleh ProxyFix
                ip_address = request.remote_addr if request else "127.0.0.1"
            except Exception:
                ip_address = "127.0.0.1"
        if not ip_address:
            ip_address = "127.0.0.1"

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
