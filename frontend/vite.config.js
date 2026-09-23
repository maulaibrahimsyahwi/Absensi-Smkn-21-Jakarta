import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.match(/\/react\//)
            ) {
              return "vendor-react";
            }
            if (id.includes("lucide-react")) {
              return "vendor-ui";
            }
            if (id.includes("axios")) {
              return "vendor-utils";
            }
            if (id.includes("xlsx")) {
              return "vendor-xlsx";
            }
          }
        },
      },
    },
  },
});
