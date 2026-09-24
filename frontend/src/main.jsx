import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import "./index.css";

// Registrasi Service Worker untuk PWA Offline-Aware (Hanya aktif di Mode Produksi)
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Service worker aktif untuk mode produksi
        })
        .catch((err) => {
          console.warn("[PWA] Catatan registrasi Service Worker:", err);
        });
    });
  } else {
    // Di mode pengembangan (dev), hapus service worker lama agar tidak mengganggu Vite hot-reload
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
