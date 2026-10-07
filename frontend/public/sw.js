// ====================================================================
// Service Worker - Sistem Absensi & Presensi SMKN 21 Jakarta
// Memberikan kemampuan PWA Offline-Aware, Cache Cepat, & Background Sync
// ====================================================================

const CACHE_NAME = "smkn21-absensi-cache-v3";

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

// 1. Install Event: Pra-cache aset inti (satu aset 404 tidak menggagalkan seluruh SW)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(CORE_ASSETS.map((a) => cache.add(a).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate Event: Bersihkan cache versi lama (termasuk unggahan lama di v2)
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

  // JANGAN pernah meng-cache unggahan dinamis pengguna (surat izin, bukti, foto profil di /static/uploads/)
  if (url.pathname.startsWith("/static/uploads/")) {
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
  // Hanya simpan respons sukses (ok), jangan simpan 404/500 ke cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
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
  // Gunakan Stale-While-Revalidate untuk performa loading cepat
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
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    }),
  );
});

// ====================================================================
// 4. PWA Background Sync: Membangunkan Tab Aplikasi untuk Sinkronisasi
// ====================================================================
// Pengiriman payload dilakukan oleh thread utama aplikasi karena token autentikasi
// tersimpan di sesi aman/localStorage yang tidak dapat diakses secara langsung oleh Service Worker.
self.addEventListener("sync", (event) => {
  if (event.tag !== "sync-attendance-queue") return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (clients.length === 0) {
        throw new Error("Tidak ada tab aktif untuk sinkronisasi antrean");
      }
      clients.forEach((client) => {
        client.postMessage({ type: "OFFLINE_SYNC_REQUEST" });
      });
    })(),
  );
});
