import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
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
          }
        },
      },
    },
  },
});
