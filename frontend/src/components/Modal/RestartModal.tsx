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
  Text,
  useToken,
} from "@chakra-ui/react";
import Button from "../Button/Button";

interface RestartModalProps {
  isOpen: boolean;
  onClose: (arg0: boolean) => void;
  size?: string;
}

export const RestartModal: React.FC<RestartModalProps> = ({ isOpen, onClose }) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["item-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  return (
    <Modal
      isCentered
      isOpen={isOpen}
      onClose={() => onClose(false)}
      motionPreset="slideInBottom"
      blockScrollOnMount={false}
      returnFocusOnClose={false}
    >
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="3px" />
      <ModalContent
        bg={bgColor}
        borderColor={borderColor}
        borderWidth={"1px"}
        borderRadius={0}
        p={"1rem"}
        color={textColor}
      >
        <ModalHeader>Restart Device</ModalHeader>
        <ModalBody>
          <Text>Do you want to restart this device?</Text>
        </ModalBody>
        <ModalFooter gap={"1.5rem"}>
          <Button label="Cancel" variant="outlined" onClick={() => onClose(false)} />
          <Button label="Restart" variant="primary" onClick={() => onClose(true)} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
