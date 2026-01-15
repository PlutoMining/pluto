"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type ModalVariant = "center" | "sheet";

export function Modal({
  open,
  onClose,
  children,
  variant = "center",
  overlayClassName,
  contentClassName,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: ModalVariant;
  overlayClassName?: string;
  contentClassName?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn("absolute inset-0 bg-black/40 backdrop-blur-sm", overlayClassName)}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute",
          variant === "center"
            ? "inset-0 flex items-center justify-center p-4"
            : "inset-0 flex items-start justify-center p-4 pt-6",
          contentClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

