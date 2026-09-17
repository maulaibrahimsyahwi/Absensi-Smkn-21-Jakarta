import axios from "axios";

/**
 * Client HTTP terpusat untuk komunikasi dengan server backend SMKN 21 Jakarta.
 * Menggunakan Axios instance dengan konfigurasi timeout dan base URL dinamis.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

export default api;
