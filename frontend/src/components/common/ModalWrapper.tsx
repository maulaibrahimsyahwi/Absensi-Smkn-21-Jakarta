import React, { ReactNode, useId } from "react";
import Sheet, { SheetHeader } from "../ui/Sheet";

export interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
  showCloseButton = true,
  closeOnBackdrop = true,
  className = "",
}: ModalWrapperProps) {
  const titleId = useId();
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      widthClass={maxWidth}
      closeOnBackdrop={closeOnBackdrop}
      labelledBy={title ? titleId : undefined}
    >
      {(title || showCloseButton) && (
        <SheetHeader
          id={titleId}
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          hideClose={!showCloseButton}
        />
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${className}`}>
        {children}
      </div>
    </Sheet>
  );
}
