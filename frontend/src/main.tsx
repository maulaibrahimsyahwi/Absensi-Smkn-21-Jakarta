import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { initOfflineQueue } from "./services/offlineQueue";
import "./index.css";

// Registrasi Service Worker untuk PWA Offline-Aware & Installability
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // Service worker aktif
      })
      .catch((err: unknown) => {
        const errorMsg = String(err);
        if (errorMsg.includes("SSL certificate error") || errorMsg.includes("SecurityError")) {
          console.info("[PWA] Service Worker dilewati di mode local dev (sertifikat SSL self-signed). Fitur PWA offline akan aktif penuh saat deployment dengan sertifikat SSL valid.");
        } else {
          console.warn("[PWA] Catatan registrasi Service Worker:", err);
        }
      });
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  void initOfflineQueue().finally(() => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  });
}
