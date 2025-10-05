/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Flex,
  Text,
  Stack,
  RadioGroup,
  useToken,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { RadioButton } from "../RadioButton";
import Button from "../Button/Button";

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

  const handleRadioButtonChange = useCallback((value: string) => {
    setRadioButtonValue(value as RadioButtonValues);
  }, []);

  const handleAction = useCallback(() => {
    onClose(radioButtonValue);
  }, [onClose, radioButtonValue]);

  const [bgColor] = useToken("colors", ["item-bg"]);
  const [borderColor] = useToken("colors", ["border-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["accent-color"]);

  return (
    <Modal
      isCentered
      isOpen={isOpen}
      onClose={() => onClose("")}
      motionPreset="slideInBottom"
      blockScrollOnMount={false}
      returnFocusOnClose={false}
    >
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="3px" />
      <ModalContent
        bg={bgColor}
        borderColor={borderColor}
        borderWidth={"1px"}
        p={"1rem"}
        color={textColor}
      >
        <ModalHeader fontFamily={"heading"} fontWeight={400} fontSize={"4xl"}>
          Save or Save&Restart the device?
        </ModalHeader>
        <ModalBody as={Flex} flexDir={"column"} gap={"1rem"} fontWeight={400} fontSize={"md"}>
          <Text>
            Please choose whether to save the changes only or save and restart the device to apply
            them. Keep in mind that restarting the device may result in the loss of an entire block
            of transactions.
          </Text>
          <Text fontWeight={500}>Choose your preference</Text>

          <RadioGroup defaultValue="only-save" onChange={(value) => handleRadioButtonChange(value)}>
            <Stack spacing={8} direction="row">
              <RadioButton id="only-save" value="only-save" label="Only Save"></RadioButton>
              <RadioButton
                id="save-and-restart"
                value="save-and-restart"
                label="Save&Restart"
              ></RadioButton>
            </Stack>
          </RadioGroup>
        </ModalBody>
        <ModalFooter gap={"1.5rem"}>
          <Button label="Cancel" variant="outlined" onClick={() => onClose("")} />
          <Button label="Confirm" variant="primary" onClick={handleAction} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
