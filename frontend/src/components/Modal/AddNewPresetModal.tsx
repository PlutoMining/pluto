/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import React from "react";
import { PresetEditor } from "../PresetEditor";
import { Modal } from "@/components/ui/modal";

interface AddNewPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseSuccessfully: () => void;
  presetId?: string;
}

export const AddNewPresetModal: React.FC<AddNewPresetModalProps> = ({
  isOpen,
  onClose,
  onCloseSuccessfully,
  presetId,
}) => {
  return (
    <Modal open={isOpen} onClose={onClose} variant="sheet">
      <div className="w-full max-w-[1440px] border border-border bg-card text-card-foreground">
        <div className="relative mx-auto max-h-[calc(100vh-8rem)] overflow-y-auto p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <h2 className="font-heading text-4xl font-bold uppercase">Add a new preset</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-primary hover:opacity-80"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-6">
            <PresetEditor
              onCloseModal={onClose}
              onCloseSuccessfullyModal={onCloseSuccessfully}
              presetId={presetId}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
