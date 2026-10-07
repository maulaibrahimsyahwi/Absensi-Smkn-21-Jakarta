import React, { useState, useEffect } from "react";
import { ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import Sheet, { SheetHeader, SheetFooter } from "../../ui/Sheet";
import Button from "../../ui/Button";
import { getFileUrl } from "../../../services/api";

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
  useEffect(() => setZoomed(false), [item]);
  const src = item ? getFileUrl(item.surat_bukti) : "";

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
          <div className="min-h-0 flex-1 overflow-auto bg-slate-900/5 p-3 sm:p-4">
            <img
              src={src}
              alt={`Foto surat keterangan ${item.nama}`}
              onClick={() => setZoomed((z) => !z)}
              className={`rounded-lg shadow-xs select-none ${
                zoomed
                  ? "w-[220%] max-w-none cursor-zoom-out sm:w-[160%]"
                  : "mx-auto max-h-[65dvh] w-auto max-w-full cursor-zoom-in object-contain"
              }`}
            />
          </div>
          <SheetFooter>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" /> Tab baru
            </a>
            <Button
              variant="primary"
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
