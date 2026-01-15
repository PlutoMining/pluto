/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import Button from "../Button/Button";
import { Modal } from "@/components/ui/modal";

interface BasicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  primaryAction: () => void;
  primaryActionLabel: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  size?: string;
}

export const BasicModal: React.FC<BasicModalProps> = ({
  isOpen,
  onClose,
  title,
  body,
  primaryAction,
  primaryActionLabel,
  secondaryAction,
  secondaryActionLabel,
}) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg border border-border bg-card p-4 text-card-foreground">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-heading text-lg font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {body ? <div className="mt-3 font-body text-sm text-muted-foreground">{body}</div> : null}

        <div className="mt-6 flex items-center justify-end gap-4">
          {secondaryActionLabel ? (
            <Button
              onClick={secondaryAction || onClose}
              variant="outlined"
              label={secondaryActionLabel}
            />
          ) : null}
          <Button variant="primary" onClick={primaryAction} label={primaryActionLabel} />
        </div>
      </div>
    </Modal>
  );
};
