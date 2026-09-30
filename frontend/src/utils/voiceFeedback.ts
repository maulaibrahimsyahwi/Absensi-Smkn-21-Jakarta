/**
 * Voice Feedback Synthesizer Bahasa Indonesia di Gerbang SMKN 21 Jakarta.
 * Menggunakan Web Speech API (speechSynthesis) dengan lokal 'id-ID'
 * untuk memberikan konfirmasi audio yang jelas bagi siswa dan guru piket di gerbang.
 */

const VOICE_MUTE_KEY = "smkn21_voice_muted";

export function isVoiceMuted(): boolean {
  try {
    return localStorage.getItem(VOICE_MUTE_KEY) === "true";
  } catch (_e) {
    return false;
  }
}

export function setVoiceMuted(muted: boolean): void {
  try {
    localStorage.setItem(VOICE_MUTE_KEY, muted ? "true" : "false");
  } catch (_e) {}
}

export function toggleVoiceMuted(): boolean {
  const current = isVoiceMuted();
  setVoiceMuted(!current);
  return !current;
}

/**
 * Mengucapkan teks dalam Bahasa Indonesia
 */
export function speakIndonesian(text: string, priority = false): void {
  if (isVoiceMuted()) return;
  if (typeof window === 'undefined' || !("speechSynthesis" in window)) return;

  try {
    if (priority) {
      window.speechSynthesis.cancel(); // Hentikan ucapan sebelumnya jika prioritas
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1.05; // Sedikit lebih cepat agar antrean gerbang mengalir lancar
    utterance.pitch = 1.0;

    // Cari suara spesifik Bahasa Indonesia jika browser menyediakannya
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(
      (v) => v.lang === "id-ID" || v.lang.startsWith("id"),
    );
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("SpeechSynthesis error:", err);
  }
}

/**
 * Konfirmasi Presensi Berhasil Tepat Waktu
 */
export function speakAttendanceSuccess(nama?: string | null, status = "Tepat Waktu"): void {
  const cleanName = nama ? nama.split(" ")[0] : "Siswa";
  if (status.includes("Terlambat")) {
    speakIndonesian(
      `Presensi tercatat terlambat. Selamat pagi, ${cleanName}. Silakan ambil slip keterlambatan di meja piket.`,
    );
  } else if (status.includes("Dispensasi Medis")) {
    speakIndonesian(
      `Dispensasi medis terverifikasi. Presensi berhasil, selamat pagi ${cleanName}.`,
    );
  } else {
    speakIndonesian(
      `Presensi berhasil. Selamat pagi, ${cleanName}. Anda tercatat ${status}.`,
    );
  }
}

/**
 * Peringatan Terdeteksi Proxy / 1 HP Bergantian
 */
export function speakProxyWarning(): void {
  speakIndonesian(
    "Peringatan keamanan: Perangkat ini terdeteksi digunakan bergantian untuk presensi.",
    true,
  );
}

/**
 * Peringatan Wajah Tidak Cocok
 */
export function speakMismatchWarning(): void {
  speakIndonesian(
    "Wajah tidak cocok dengan akun. Silakan coba lagi dengan pencahayaan cukup.",
    true,
  );
}

/**
 * Peringatan Jam Perangkat Tidak Akurat (Anti-NTP)
 */
export function speakTimeTamperedWarning(): void {
  speakIndonesian(
    "Jam perangkat Anda tidak akurat. Harap aktifkan pengaturan waktu otomatis.",
    true,
  );
}
