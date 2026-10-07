import React, { useRef, useState, useEffect } from "react";
import { RotateCcw, Undo2 } from "lucide-react";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "./ui/Sheet";
import Button from "./ui/Button";
import SignaturePad, { SignaturePadHandle } from "./ui/SignaturePad";

export interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64PNG: string) => void;
  title?: string;
  subtitle?: string;
  description?: string;
  signerName?: string;
  initialSignature?: string | null;
  initialImage?: string | null;
}

export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = "Tanda tangan digital",
  subtitle,
  description,
  signerName,
  initialSignature = null,
  initialImage = null,
}: SignaturePadModalProps) {
  const sub =
    description ||
    subtitle ||
    (signerName
      ? `Tanda tangan digital untuk ${signerName}`
      : "Goreskan tanda tangan dengan jari atau mouse.");
  const existing = initialSignature || initialImage;
  const sigRef = useRef<SignaturePadHandle>(null);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValid(false);
      sigRef.current?.clear();
    }
  }, [isOpen]);

  const handleSave = () => {
    const dataUrl = sigRef.current?.toDataURL();
    if (!dataUrl) return;
    onSave(dataUrl);
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="md" labelledBy="sig-title">
      <SheetHeader
        id="sig-title"
        title={title}
        subtitle={sub}
        onClose={onClose}
      />
      <SheetBody>
        {existing && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-500">
            <img
              src={existing}
              alt=""
              className="h-10 max-w-[7rem] object-contain"
            />{" "}
            Tanda tangan ini akan diganti.
          </div>
        )}
        <div className="mb-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Undo2 className="h-3.5 w-3.5" />}
            onClick={() => sigRef.current?.undo()}
          >
            Urungkan
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => sigRef.current?.clear()}
          >
            Bersihkan
          </Button>
        </div>

        <SignaturePad
          ref={sigRef}
          onChange={setValid}
          className="h-60 sm:h-64"
        />

        {!valid && (
          <p className="mt-2 text-xs text-slate-500">
            Goreskan tanda tangan secara lengkap (minimal panjang goresan
            terdeteksi).
          </p>
        )}
      </SheetBody>
      <SheetFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!valid}>
          Simpan tanda tangan
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
