/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { CloseIcon } from "../icons/CloseIcon";
import { ErrorIcon } from "../icons/ErrorIcon";
import { SuccessIcon } from "../icons/SuccessIcon";
import { WarningIcon } from "../icons/WarningIcon";
import { AlertProps, AlertStatus } from "./interfaces";

const Alert: React.FC<AlertProps> = (alertProps: AlertProps) => {
  const { isOpen, onClose, content } = alertProps;

  const [icon, setIcon] = useState<React.JSX.Element>();
  const [variantClass, setVariantClass] = useState<string>("border-border");

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-50 px-4">
      <div className="container">
        <div className={cn("relative border bg-card p-3 text-card-foreground", variantClass)}>
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
