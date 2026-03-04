/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { CloseIcon } from "../icons/CloseIcon";
import { ErrorIcon } from "../icons/ErrorIcon";
import { SuccessIcon } from "../icons/SuccessIcon";
import { WarningIcon } from "../icons/WarningIcon";
import { AlertProps, AlertStatus } from "./interfaces";

const AUTO_DISMISS_MS = 5000;

const Alert: React.FC<AlertProps> = (alertProps: AlertProps) => {
  const { isOpen, onClose, content } = alertProps;

  const [icon, setIcon] = useState<React.JSX.Element>();
  const [variantClass, setVariantClass] = useState<string>("border-border");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    switch (content.status) {
      case AlertStatus.ERROR: {
        setIcon(<ErrorIcon color="currentColor" h={"18"} />);
        setVariantClass("border-destructive text-destructive");
        break;
      }
      case AlertStatus.SUCCESS: {
        setIcon(<SuccessIcon color="currentColor" h={"18"} />);
        setVariantClass("border-emerald-500 text-emerald-500");
        break;
      }
      case AlertStatus.WARNING: {
        setIcon(<WarningIcon color="currentColor" h={"18"} />);
        setVariantClass("border-amber-500 text-amber-500");
        break;
      }
      default:
        break;
    }
  }, [content.status]);

  // Auto-dismiss after AUTO_DISMISS_MS
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  // Dismiss on any click outside the card
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // pointer-events-none on the full-width wrapper so it never blocks sidebar clicks
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 px-4">
      <div className="container">
        <div
          ref={cardRef}
          className={cn(
            "pointer-events-auto relative border bg-card p-3 text-card-foreground",
            variantClass
          )}
        >
          <div className="absolute right-2 top-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <CloseIcon h={"18"} color="currentColor" onClick={onClose} />
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("inline-flex", variantClass)}>{icon}</span>
            <div className={cn("font-heading text-sm font-medium", variantClass)}>
              {content.title}
            </div>
          </div>

          <div className="mt-1 pl-7 font-accent text-[13px] text-muted-foreground">
            {content.message}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alert;
