/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { useCallback, useState } from "react";
import { RadioButton } from "../RadioButton";
import Button from "../Button/Button";
import { Modal } from "@/components/ui/modal";

interface SaveAndRestartModalProps {
  isOpen: boolean;
  onClose: (arg0: string) => void;
  size?: string;
}

export enum RadioButtonValues {
  ONLY_SAVE = "only-save",
  SAVE_AND_RESTART = "save-and-restart",
}

export const SaveAndRestartModal: React.FC<SaveAndRestartModalProps> = ({ isOpen, onClose }) => {
  const [radioButtonValue, setRadioButtonValue] = useState<RadioButtonValues>(
    RadioButtonValues.ONLY_SAVE
  );

  const handleCancel = useCallback(() => {
    onClose("");
  }, [onClose]);

  const handleRadioButtonChange = useCallback((value: string) => {
    setRadioButtonValue(value as RadioButtonValues);
  }, []);

  const handleAction = useCallback(() => {
    onClose(radioButtonValue);
  }, [onClose, radioButtonValue]);

  return (
    <Modal open={isOpen} onClose={handleCancel}>
      <div className="w-full max-w-2xl border border-border bg-card p-4 text-card-foreground">
        <h2 className="font-heading text-2xl font-medium">Save or Save&Restart the device?</h2>

        <div className="mt-3 flex flex-col gap-3 font-body text-sm text-muted-foreground">
          <p>
            Please choose whether to save the changes only or save and restart the device to apply
            them. Keep in mind that restarting the device may result in the loss of an entire block
            of transactions.
          </p>
          <p className="font-heading text-foreground">Choose your preference</p>

          <div className="flex flex-wrap gap-8">
            <RadioButton
              id="only-save"
              name="save-action"
              value="only-save"
              label="Only Save"
              checked={radioButtonValue === RadioButtonValues.ONLY_SAVE}
              onChange={handleRadioButtonChange}
            />
            <RadioButton
              id="save-and-restart"
              name="save-action"
              value="save-and-restart"
              label="Save&Restart"
              checked={radioButtonValue === RadioButtonValues.SAVE_AND_RESTART}
              onChange={handleRadioButtonChange}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <Button label="Cancel" variant="outlined" onClick={handleCancel} />
          <Button label="Confirm" variant="primary" onClick={handleAction} />
        </div>
      </div>
    </Modal>
  );
};
