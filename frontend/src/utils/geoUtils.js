// Utilitas Geofencing & Perhitungan Jarak GPS SMKN 21 Jakarta

export const SMKN21_COORDINATES = {
  latitude: -6.1587,
  longitude: 106.855,
  lat: -6.1587,
  lng: 106.855,
  radiusMeters: 10, // Batas radius resmi: 10 meter
  name: "SMKN 21 Jakarta",
  alamat: "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
};

/**
 * Menghitung jarak antara dua titik koordinat bumi (dalam meter) menggunakan Haversine Formula.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371e3; // Radius bumi dalam meter
  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format jarak meter ke string yang mudah dibaca.
 */
export function formatDistance(meters) {
  if (meters === Infinity || meters === null || meters === undefined) {
    return "-";
  }
  if (meters < 1000) {
    return `${meters} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Variabel penyimpan sampel GPS sebelumnya untuk mendeteksi anomali koordinat beku (Zero-Drift)
let lastGpsSample = null;

/**
 * Mendeteksi indikasi Fake GPS / Mock Location menggunakan pendekatan heuristik software (Solusi 2).
 * 1. Akurasi sintetis (accuracy <= 0 atau 0 < accuracy < 1.8 meter tanpa RTK DGPS).
 * 2. Ketiadaan data ketinggian saat mengaku akurasi sangat tinggi.
 * 3. Kebekuan koordinat (Zero-Drift): 2 pembacaan berjarak waktu menghasilkan angka float identik 100%.
 * 4. Penempelan titik presisi tepat di pusat sekolah (< 0.4 meter).
 */
export function detectMockGps(currentPos, prevPos = lastGpsSample) {
  if (!currentPos) return { isMock: false, reason: "" };

  const { latitude, longitude, accuracy, altitude, timestamp } = currentPos;

  // 1. Heuristik Akurasi Sintetis
  // Di smartphone komersial, akurasi GPS biasanya berkisar 3m - 25m.
  // Fake GPS emulator kerap menyetel accuracy tepat 0.0 atau 1.0.
  if (accuracy !== undefined && accuracy !== null) {
    if (accuracy <= 0) {
      return {
        isMock: true,
        reason:
          "Akurasi sensor GPS tidak valid (<= 0m). Terindikasi mock location.",
      };
    }
    if (accuracy > 0 && accuracy < 1.8) {
      return {
        isMock: true,
        reason: `Akurasi sensor GPS mencurigakan (${accuracy}m). Terindikasi aplikasi Fake GPS / emulator.`,
      };
    }
  }

  // 2. Heuristik Zero-Drift (Koordinat Beku)
  // Sinyal satelit asli selalu mengalami fluktuasi mikroskopis (jitter +/- 0.000005 deg).
  // Aplikasi Fake GPS memberikan angka koordinat statis persis sama 100% antar pembacaan berjarak waktu.
  if (prevPos && prevPos.latitude && prevPos.longitude) {
    const timeDiff = Math.abs(
      (timestamp || Date.now()) - (prevPos.timestamp || 0),
    );
    // Jika jeda pembacaan >= 1500ms (1.5 detik)
    if (timeDiff >= 1500) {
      const latDiff = Math.abs(latitude - prevPos.latitude);
      const lngDiff = Math.abs(longitude - prevPos.longitude);
      // Jika kedua koordinat sama persis hingga 7 angka di belakang koma (selisih < 1e-7)
      if (latDiff < 1e-7 && lngDiff < 1e-7) {
        return {
          isMock: true,
          reason:
            "Koordinat GPS membeku secara tidak wajar (Zero-Drift). Terindikasi aplikasi Fake GPS.",
        };
      }
    }
  }

  // 3. Titik Pusat Presisi 0 Meter
  // Siswa yang memilih titik sekolah di aplikasi Fake GPS sering menempatkan pin tepat di titik pusat koordinat sekolah
  const distToCenter = calculateDistanceMeters(
    latitude,
    longitude,
    SMKN21_COORDINATES.latitude,
    SMKN21_COORDINATES.longitude,
  );
  if (distToCenter !== null && distToCenter < 0.4) {
    return {
      isMock: true,
      reason:
        "Koordinat menempel persis di titik pusat peta (jarak 0 meter). Terindikasi penempatan pin Fake GPS.",
    };
  }

  return { isMock: false, reason: "" };
}

/**
 * Reset riwayat sampel GPS (berguna saat pindah halaman atau refresh)
 */
export function resetGpsSamples() {
  lastGpsSample = null;
}

/**
 * Mengambil koordinat GPS perangkat saat ini melalui HTML5 Geolocation API dengan pemeriksaan Anti-Fake GPS.
 */
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Perangkat atau browser tidak mendukung fitur GPS Geolocation.",
        ),
      );
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rawPos = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          altitude: position.coords.altitude,
          timestamp: position.timestamp || Date.now(),
        };

        const mockCheck = detectMockGps(rawPos);

        if (mockCheck.isMock) {
          reject(new Error(mockCheck.reason));
          return;
        }

        // Simpan sampel yang valid untuk deteksi zero-drift berikutnya
        lastGpsSample = rawPos;

        resolve({
          latitude: rawPos.latitude,
          longitude: rawPos.longitude,
          accuracy: Math.round(rawPos.accuracy),
          altitude: rawPos.altitude,
          timestamp: rawPos.timestamp,
          isMock: false,
        });
      },
      (error) => {
        let msg = "Gagal membaca titik lokasi perangkat.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Izin akses lokasi ditolak oleh pengguna/browser";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Sinyal GPS atau informasi lokasi tidak tersedia";
        } else if (error.code === error.TIMEOUT) {
          msg = "Waktu pencarian sinyal lokasi habis";
        }
        reject(new Error(msg));
      },
      defaultOptions,
    );
  });
}
