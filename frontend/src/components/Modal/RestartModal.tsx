/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import Button from "../Button/Button";
import { Modal } from "@/components/ui/modal";

interface RestartModalProps {
  isOpen: boolean;
  onClose: (arg0: boolean) => void;
  size?: string;
}

export const RestartModal: React.FC<RestartModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal open={isOpen} onClose={() => onClose(false)}>
      <div className="w-full max-w-lg border border-border bg-card p-4 text-card-foreground">
        <h2 className="font-heading text-lg font-medium">Restart Device</h2>
        <p className="mt-3 font-body text-sm text-muted-foreground">
          Do you want to restart this device?
        </p>
        <div className="mt-6 flex items-center justify-end gap-4">
          <Button label="Cancel" variant="outlined" onClick={() => onClose(false)} />
          <Button label="Restart" variant="primary" onClick={() => onClose(true)} />
        </div>
      </div>
    </Modal>
  );
};
