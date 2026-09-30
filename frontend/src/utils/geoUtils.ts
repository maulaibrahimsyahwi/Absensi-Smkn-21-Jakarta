// Utilitas Geofencing & Perhitungan Jarak GPS SMKN 21 Jakarta

export type LatLngTuple = [number, number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}

export type PointInput = LatLngTuple | GeoPoint | { lat: number; lng: number };

export const SMKN21_POLYGON: LatLngTuple[] = [
  [-6.1582, 106.8547], // Sudut Barat Laut (Gerbang Utama / Akses Jl. Siaga I)
  [-6.1582, 106.8554], // Sudut Timur Laut (Batas Gedung Utara)
  [-6.1588, 106.85545], // Sudut Timur (Batas Lab / Bengkel Kejuruan)
  [-6.1592, 106.85535], // Sudut Tenggara (Batas Lapangan / Area Belakang)
  [-6.1592, 106.85465], // Sudut Barat Daya (Batas Gedung Selatan / Gg. Swadaya III)
  [-6.1587, 106.85455], // Sudut Barat (Batas Parkir / Kelas Barat)
];

export const SMKN21_COORDINATES = {
  latitude: -6.1587,
  longitude: 106.855,
  lat: -6.1587,
  lng: 106.855,
  radiusMeters: 50, // Radius toleransi cadangan GPS indoor drift: 50 meter
  polygon: SMKN21_POLYGON,
  name: "SMKN 21 Jakarta",
  alamat: "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
};

/**
 * Menentukan apakah suatu titik koordinat [lat, lon] berada di dalam area poligon
 * menggunakan algoritma Ray-Casting (Even-Odd Rule).
 */
export function isPointInPolygon(point: PointInput | null | undefined, polygon: Array<LatLngTuple | GeoPoint>): boolean {
  if (!point || !polygon || polygon.length < 3) return false;

  const lat = Number(
    Array.isArray(point)
      ? point[0]
      : 'latitude' in point
      ? point.latitude
      : (point as { lat: number }).lat
  );
  const lon = Number(
    Array.isArray(point)
      ? point[1]
      : 'longitude' in point
      ? point.longitude
      : (point as { lng: number }).lng
  );
  if (isNaN(lat) || isNaN(lon)) return false;

  let inside = false;
  const n = polygon.length;
  let p1 = polygon[0];
  for (let i = 1; i <= n; i++) {
    const p2 = polygon[i % n];
    const p1Lat = Number(Array.isArray(p1) ? p1[0] : (p1 as GeoPoint).latitude);
    const p1Lon = Number(Array.isArray(p1) ? p1[1] : (p1 as GeoPoint).longitude);
    const p2Lat = Number(Array.isArray(p2) ? p2[0] : (p2 as GeoPoint).latitude);
    const p2Lon = Number(Array.isArray(p2) ? p2[1] : (p2 as GeoPoint).longitude);

    if (lon > Math.min(p1Lon, p2Lon)) {
      if (lon <= Math.max(p1Lon, p2Lon)) {
        if (lat <= Math.max(p1Lat, p2Lat)) {
          let latInters = p1Lat;
          if (p1Lon !== p2Lon) {
            latInters =
              ((lon - p1Lon) * (p2Lat - p1Lat)) / (p2Lon - p1Lon) + p1Lat;
          }
          if (p1Lat === p2Lat || lat <= latInters) {
            inside = !inside;
          }
        }
      }
    }
    p1 = p2;
  }
  return inside;
}

/**
 * Menghitung jarak antara dua titik koordinat bumi (dalam meter) menggunakan Haversine Formula.
 */
export function calculateDistanceMeters(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number {
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
  const toRad = (deg: number) => (deg * Math.PI) / 180;

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
export function formatDistance(meters?: number | null): string {
  if (meters === Infinity || meters === null || meters === undefined) {
    return "-";
  }
  if (meters < 1000) {
    return `${meters} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface GpsPositionSample {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  timestamp?: number;
  isMock?: boolean;
}

// Variabel penyimpan sampel GPS sebelumnya untuk mendeteksi anomali koordinat beku (Zero-Drift)
let lastGpsSample: GpsPositionSample | null = null;

export interface MockDetectionResult {
  isMock: boolean;
  reason: string;
}

/**
 * Mendeteksi indikasi Fake GPS / Mock Location menggunakan pendekatan heuristik software.
 */
export function detectMockGps(
  currentPos?: GpsPositionSample | null,
  prevPos: GpsPositionSample | null = lastGpsSample
): MockDetectionResult {
  if (!currentPos) return { isMock: false, reason: "" };

  const { latitude, longitude, accuracy, timestamp } = currentPos;

  // 1. Heuristik Akurasi Sintetis
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
        reason: `Akurasi sensor Lokasi mencurigakan (${accuracy}m). Terindikasi aplikasi Fake GPS`,
      };
    }
  }

  // 2. Heuristik Zero-Drift (Koordinat Beku)
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
          reason: "Lokasi Koordinat Anda tidak wajar",
        };
      }
    }
  }

  // 3. Titik Pusat Presisi 0 Meter
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
export function resetGpsSamples(): void {
  lastGpsSample = null;
}

/**
 * Mengambil koordinat GPS perangkat saat ini melalui HTML5 Geolocation API dengan pemeriksaan Anti-Fake GPS.
 */
export function getCurrentLocation(options: PositionOptions = {}): Promise<GpsPositionSample> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new Error(
          "Perangkat atau browser tidak mendukung fitur GPS Geolocation.",
        ),
      );
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rawPos: GpsPositionSample = {
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
          accuracy: Math.round(rawPos.accuracy || 0),
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
