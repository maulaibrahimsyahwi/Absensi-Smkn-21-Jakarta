import { useState, useEffect, useCallback } from "react";
import {
  getCurrentLocation,
  calculateDistanceMeters,
  isPointInPolygon,
} from "../utils/geoUtils";

/**
 * Custom hook untuk mengelola status geofencing GPS,
 * perhitungan jarak ke titik target (SMKN 21), verifikasi batas poligon pagar sekolah,
 * simulasi testing lokal, serta flags status validitas GPS.
 *
 * @param {Object} targetCoordinates - { latitude, longitude, radiusMeters, polygon }
 */
export function useGeofence(targetCoordinates) {
  const [geoState, setGeoState] = useState({
    loading: true,
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceMeters: null,
    isWithinRadius: false,
    insidePolygon: false,
    error: null,
    simulated: false,
    isMock: false,
  });

  const checkGeofence = useCallback(async () => {
    setGeoState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const loc = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const dist = calculateDistanceMeters(
        loc.latitude,
        loc.longitude,
        targetCoordinates.latitude,
        targetCoordinates.longitude,
      );

      // Verifikasi ganda: Poligon Batas Pagar Lahan Sekolah ATAU Toleransi Radius Cadangan (50m)
      const targetPoly = targetCoordinates.polygon || [];
      const inPoly = isPointInPolygon(
        [loc.latitude, loc.longitude],
        targetPoly,
      );
      const radiusLimit = targetCoordinates.radiusMeters || 50;
      const isWithin = inPoly || (dist !== null && dist <= radiusLimit);

      setGeoState({
        loading: false,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        distanceMeters: dist,
        isWithinRadius: isWithin,
        insidePolygon: inPoly,
        error: null,
        simulated: false,
        isMock: loc.isMock || false,
      });
    } catch (err) {
      setGeoState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Gagal memperoleh titik koordinat GPS",
      }));
    }
  }, [
    targetCoordinates.latitude,
    targetCoordinates.longitude,
    targetCoordinates.radiusMeters,
    targetCoordinates.polygon,
  ]);

  useEffect(() => {
    checkGeofence();
  }, [checkGeofence]);

  const toggleSimulation = () => {
    setGeoState((prev) => {
      const nextSim = !prev.simulated;
      if (nextSim) {
        return {
          loading: false,
          simulated: true,
          isWithinRadius: true,
          distanceMeters: 8,
          accuracy: 5,
          error: null,
          latitude: targetCoordinates.latitude,
          longitude: targetCoordinates.longitude,
          isMock: false,
        };
      } else {
        checkGeofence();
        return { ...prev, simulated: false };
      }
    });
  };

  // Status Validitas GPS
  const isGpsValid =
    !geoState.loading && (geoState.isWithinRadius || geoState.simulated);
  const isGpsWaiting = geoState.loading;
  const isGpsBlocked =
    !geoState.loading && !geoState.isWithinRadius && !geoState.simulated;

  return {
    geoState,
    setGeoState,
    checkGeofence,
    toggleSimulation,
    isGpsValid,
    isGpsWaiting,
    isGpsBlocked,
  };
}

export default useGeofence;
