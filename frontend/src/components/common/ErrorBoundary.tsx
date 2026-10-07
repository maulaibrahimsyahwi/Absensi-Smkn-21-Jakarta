import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  fullscreen?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_KEY = "smkn21_chunk_reload_ts";

function isChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || error.toString()).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

function tryChunkReload(): boolean {
  try {
    const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    // Cegah reload loop: hanya izinkan auto-reload sekali per 30 detik
    if (!last || now - Number(last) > 30000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // ignore sessionStorage errors
  }
  return false;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    if (isChunkError(error)) {
      const reloaded = tryChunkReload();
      if (reloaded) return;
    }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const isFullscreen = this.props.fullscreen !== false;
      const isChunk = isChunkError(this.state.error);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className={`${
            isFullscreen
              ? "min-h-screen bg-slate-50 flex items-center justify-center p-4"
              : "p-6 sm:p-10 flex items-center justify-center w-full"
          }`}
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
              {isChunk ? "Pembaruan Tersedia" : "Terjadi Kendala Tampilan"}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
              {isChunk
                ? "Versi aplikasi baru telah diperbarui di server. Silakan muat ulang halaman untuk memuat versi terbaru."
                : "Halaman ini mengalami kendala teknis sementara. Anda dapat mencoba lagi atau kembali ke halaman utama."}
            </p>

            {/* Error detail hanya di mode Development */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left overflow-auto max-h-32 text-xs font-mono text-rose-700">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={isChunk ? () => window.location.reload() : this.handleRetry}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer min-h-[40px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isChunk ? "Muat Ulang" : "Coba Lagi"}</span>
              </button>
              <a
                href="/"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition min-h-[40px]"
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
