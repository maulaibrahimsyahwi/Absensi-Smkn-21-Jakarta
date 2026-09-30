import time
import threading

# Thread-safe in-memory monotonic state bus
_lock = threading.Lock()
_start_time = time.time()
_current_version = int(_start_time)

# Default modules tracked
_modules_timestamp = {
    "presensi": _start_time,
    "izin": _start_time,
    "piket": _start_time,
    "pelanggaran": _start_time,
    "siswa": _start_time,
    "pjj": _start_time,
    "libur": _start_time,
    "staf": _start_time,
}


def notify_data_changed(module_name="all"):
    """
    Menaikkan monotonic version dan memperbarui timestamp modul terkait
    secara thread-safe. Mengembalikan nomor versi terbaru.
    Mendukung string tunggal (misal 'presensi') atau list (misal ['izin', 'presensi']).
    """
    global _current_version
    now = time.time()
    with _lock:
        _current_version += 1
        if isinstance(module_name, (list, tuple, set)):
            for mod in module_name:
                mod_key = str(mod).strip().lower()
                _modules_timestamp[mod_key] = now
        else:
            mod_key = str(module_name).strip().lower()
            if mod_key == "all":
                for k in _modules_timestamp:
                    _modules_timestamp[k] = now
            else:
                _modules_timestamp[mod_key] = now
        return _current_version


def get_realtime_state():
    """
    Mengembalikan snapshot state realtime saat ini tanpa query SQL:
    - version: integer monotonic counter
    - timestamp: epoch timestamp saat ini
    - modules: dictionary timestamp pembaruan terakhir per modul
    """
    with _lock:
        return {
            "version": _current_version,
            "timestamp": time.time(),
            "modules": dict(_modules_timestamp)
        }

