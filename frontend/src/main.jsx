import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import "./index.css";

// Registrasi Service Worker untuk PWA Offline-Aware
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (import.meta.env.DEV) {
          console.log("[PWA] Service Worker aktif:", reg.scope);
        }
      })
      .catch((err) => {
        console.warn("[PWA] Catatan registrasi Service Worker:", err);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
