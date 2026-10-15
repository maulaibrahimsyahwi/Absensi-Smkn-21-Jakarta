import React, { useState, useEffect } from "react";
import { ExternalLink, ZoomIn, ZoomOut, Loader2, AlertCircle } from "lucide-react";
import Sheet, { SheetHeader, SheetFooter } from "../../ui/Sheet";
import Button from "../../ui/Button";
import api, { getFileUrl } from "../../../services/api";

export interface SuratLightboxItem {
  nama: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  surat_bukti?: string;
  [key: string]: unknown;
}

interface SuratLightboxModalProps {
  item: SuratLightboxItem | null;
  onClose: () => void;
}

export default function SuratLightboxModal({
  item,
  onClose,
}: SuratLightboxModalProps) {
  const [zoomed, setZoomed] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setZoomed(false);
    setHasError(false);

    if (!item?.surat_bukti) {
      setBlobUrl("");
      return;
    }

    const rawSrc = getFileUrl(item.surat_bukti);
    if (rawSrc.startsWith("data:") || rawSrc.startsWith("blob:")) {
      setBlobUrl(rawSrc);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Ambil dokumen via axios dengan baseURL kosong agar mengarah ke /static/uploads/... bukan /api/static/...
    api
      .get(rawSrc, { baseURL: "", responseType: "blob" })
      .then((res) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback: sertakan token pada URL langsung jika fetch blob gagal
        const token =
          localStorage.getItem("smkn21_auth_token") ||
          localStorage.getItem("token") ||
          "";
        const tokenizedUrl = token
          ? `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
          : rawSrc;
        setBlobUrl(tokenizedUrl);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [item?.surat_bukti]);

  const token =
    localStorage.getItem("smkn21_auth_token") ||
    localStorage.getItem("token") ||
    "";
  const rawUrl = item ? getFileUrl(item.surat_bukti) : "";
  const externalTabUrl = token
    ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
    : rawUrl;

  return (
    <Sheet
      isOpen={Boolean(item)}
      onClose={onClose}
      size="xl"
      tall
      labelledBy="surat-title"
    >
      {item && (
        <>
          <SheetHeader
            id="surat-title"
            title={`Surat bukti ${item.nama}`}
            subtitle={`${item.jenis} \u00b7 ${item.tanggal_mulai} s/d ${item.tanggal_selesai}`}
            onClose={onClose}
          />
          <div className="min-h-0 flex-1 overflow-auto bg-slate-900/5 p-3 sm:p-4 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold">Memuat dokumen medis terproteksi...</p>
              </div>
            ) : hasError || !blobUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-xs font-semibold text-slate-700">Gagal memuat berkas surat.</p>
                <a
                  href={externalTabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-bold mt-1"
                >
                  Buka langsung di tab baru
                </a>
              </div>
            ) : (
              <img
                src={blobUrl}
                alt={`Foto surat keterangan ${item.nama}`}
                onError={() => setHasError(true)}
                onClick={() => setZoomed((z) => !z)}
                className={`rounded-lg shadow-xs select-none transition-transform duration-200 ${
                  zoomed
                    ? "w-[220%] max-w-none cursor-zoom-out sm:w-[160%]"
                    : "mx-auto max-h-[65dvh] w-auto max-w-full cursor-zoom-in object-contain"
                }`}
              />
            )}
          </div>
          <SheetFooter>
            <a
              href={externalTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" /> Tab baru
            </a>
            <Button
              variant="primary"
              disabled={loading || hasError}
              icon={
                zoomed ? (
                  <ZoomOut className="h-4 w-4" />
                ) : (
                  <ZoomIn className="h-4 w-4" />
                )
              }
              onClick={() => setZoomed((z) => !z)}
            >
              {zoomed ? "Perkecil" : "Perbesar"}
            </Button>
          </SheetFooter>
        </>
      )}
    </Sheet>
  );
}
