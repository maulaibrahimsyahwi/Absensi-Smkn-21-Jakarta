// Utilitas Geofencing & Perhitungan Jarak GPS SMKN 21 Jakarta

export const SMKN21_COORDINATES = {
  lat: -6.1587,
  lng: 106.855,
  radiusMeters: 50, // Batas radius resmi: 50 meter
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

/**
 * Mengambil koordinat GPS perangkat saat ini melalui HTML5 Geolocation API.
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
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let msg = "Gagal membaca titik lokasi perangkat.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Izin akses lokasi (GPS) ditolak oleh pengguna/browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Sinyal GPS atau informasi lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Waktu pencarian sinyal lokasi GPS habis.";
        }
        reject(new Error(msg));
      },
      defaultOptions,
    );
  });
}
