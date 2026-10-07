import React from "react";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../../ui/Sheet";
import Button from "../../ui/Button";

const QUICK_REASONS = [
  {
    label: "Foto tidak terbaca",
    text: "Foto surat tidak terbaca jelas, mohon unggah ulang.",
  },
  {
    label: "Surat tidak sesuai",
    text: "Surat keterangan tidak sesuai dengan alasan yang diajukan.",
  },
  {
    label: "Tanggal tidak cocok",
    text: "Tanggal pada surat tidak sesuai dengan periode pengajuan.",
  },
  {
    label: "Tanda tangan kosong",
    text: "Tanda tangan orang tua / dokter tidak ada pada surat.",
  },
];

export interface RejectIzinItem {
  id: number;
  nama: string;
  kelas: string;
  jenis: string;
  alasan?: string;
  [key: string]: unknown;
}

interface RejectIzinModalProps {
  item: RejectIzinItem | null;
  rejectNote: string;
  setRejectNote: (note: string) => void;
  verifyingId?: number | null;
  onConfirmReject: (id: number, note: string) => void;
  onClose: () => void;
}

export default function RejectIzinModal({
  item,
  rejectNote,
  setRejectNote,
  verifyingId,
  onConfirmReject,
  onClose,
}: RejectIzinModalProps) {
  const busy = item ? verifyingId === item.id : false;
  const append = (t: string) =>
    setRejectNote(rejectNote.trim() ? `${rejectNote.trim()} ${t}` : t);

  return (
    <Sheet
      isOpen={Boolean(item)}
      onClose={onClose}
      size="md"
      labelledBy="reject-title"
    >
      {item && (
        <>
          <SheetHeader
            id="reject-title"
            title={`Tolak pengajuan ${item.jenis.toLowerCase()}?`}
            subtitle={`${item.nama} (${item.kelas})`}
            onClose={onClose}
          />
          <SheetBody>
            <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs">
              <span className="mb-1 block font-semibold text-slate-500">
                Alasan pengajuan siswa:
              </span>
              <p className="italic leading-relaxed text-slate-800 break-words">
                "{item.alasan}"
              </p>
            </div>
            <label
              htmlFor="reject-note"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Catatan untuk siswa
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => append(r.text)}
                  className="press min-h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              id="reject-note"
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Pilih alasan di atas atau tulis sendiri..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-rose-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            />
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={!rejectNote.trim()}
              onClick={() => onConfirmReject(item.id, rejectNote)}
            >
              Konfirmasi tolak
            </Button>
          </SheetFooter>
        </>
      )}
    </Sheet>
  );
}
