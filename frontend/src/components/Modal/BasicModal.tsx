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
  ModalCloseButton,
  Flex,
  useToken,
} from "@chakra-ui/react";
import Button from "../Button/Button";

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
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["item-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent
        bg={bgColor}
        borderRadius={0}
        borderWidth={"1px"}
        borderColor={borderColor}
        color={textColor}
      >
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        {body && <ModalBody>{body}</ModalBody>}
        <ModalFooter as={Flex} gap={"1rem"}>
          {secondaryActionLabel && (
            <Button
              onClick={secondaryAction || onClose}
              variant="outlined"
              label={secondaryActionLabel}
            ></Button>
          )}
          <Button variant="primary" onClick={primaryAction} label={primaryActionLabel}></Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
