// ====================================================================
// Service Worker - Sistem Absensi & Presensi SMKN 21 Jakarta
// Memberikan kemampuan PWA Offline-Aware & Cache Cepat
// ====================================================================

const CACHE_NAME = "smkn21-absensi-cache-v1";

// Aset statis inti yang dicache saat instalasi service worker
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/icons.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// 1. Install Event: Pra-cache aset inti
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate Event: Bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Event: Strategi caching cerdas
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan cache request non-GET atau request WebSocket/Chrome Extension
  if (request.method !== "GET" || url.protocol.startsWith("chrome-extension")) {
    return;
  }

  // Lewati semua request internal Vite / HMR / Dev modules agar tidak mengganggu hot reload
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.includes(".vite") ||
    url.pathname.endsWith(".jsx") ||
    url.searchParams.has("t")
  ) {
    return;
  }

  // A. Panggilan API Backend (/api/): Network-First
  // Jika offline, kembalikan respons JSON ramah agar aplikasi frontend tidak crash
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            message:
              "Koneksi offline. Silakan periksa jaringan internet / Wi-Fi sekolah Anda.",
            is_offline: true,
          }),
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
    return;
  }

  // B. Navigasi Halaman HTML (SPA Route Fallback)
  // Jika siswa membuka halaman (misal: /portal-siswa) saat offline,
  // sajikan cached index.html shell agar React Router tetap bisa merender halaman
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache jika fetch berhasil
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          return caches.match("/index.html").then((cached) => {
            return cached || caches.match("/");
          });
        }),
    );
    return;
  }

  // C. Aset Statis (JS, CSS, Gambar, Font, SVG)
  // Gunakan Stale-While-Revalidate untuk performa loading 0 detik
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Gagal ambil dari jaringan, andalkan cachedResponse
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
