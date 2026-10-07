import React, { useState, useEffect, useId } from "react";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "./Sheet";
import Button from "./Button";
import { INPUT_CLASS } from "./Field";

export interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireText?: string;
  danger?: boolean;
  children: React.ReactNode;
}

export default function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title,
  subtitle,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  requireText,
  danger = true,
  children,
}: ConfirmSheetProps) {
  const [typed, setTyped] = useState("");
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      setTyped("");
    }
  }, [isOpen]);

  const matchesRequirement =
    !requireText || typed.trim().toUpperCase() === requireText.trim().toUpperCase();

  const handleConfirm = () => {
    if (!matchesRequirement || loading) return;
    onConfirm();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} size="md" labelledBy={titleId}>
      <div className="flex min-h-0 flex-1 flex-col">
        <SheetHeader
          id={titleId}
          title={title}
          subtitle={subtitle}
          onClose={onClose}
        />
        <SheetBody>
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {children}

            {requireText && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Untuk konfirmasi keamanan, ketik{" "}
                  <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                    {requireText}
                  </span>{" "}
                  di bawah ini:
                </p>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={`Ketik "${requireText}"`}
                  className={`${INPUT_CLASS} font-mono uppercase`}
                  autoFocus
                />
              </div>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
            disabled={!matchesRequirement || loading}
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </div>
    </Sheet>
  );
}
