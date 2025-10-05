/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import {
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useToken,
} from "@chakra-ui/react";
import React from "react";
import { PresetEditor } from "../PresetEditor";

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
  const [bgColor] = useToken("colors", ["item-bg"]);
  const [primaryColor] = useToken("colors", ["primary-color"]);

  return (
    <Modal onClose={onClose} size={"full)"} isOpen={isOpen}>
      <ModalOverlay boxShadow={"0px -39px 39px 0px #00988817"} />
      <ModalContent
        bg={bgColor}
        borderRadius={0}
        height={{
          base: "calc(100% - 8.5rem)",
          tablet: "calc(100% - 10.5rem)",
          tabletL: "calc(100% - 9.5rem)",
        }}
        top={"1.5rem"}
        overflow={"scroll"}
        borderColor={"border-color"}
        borderTopWidth={"1px"}
        borderBottomWidth={"1px"}
      >
        <Box
          maxW="container.desktop"
          margin={"0 auto"}
          p={"2rem"}
          w={"100%"}
          h={"100%"}
          overflow={"scroll"}
        >
          <ModalHeader
            fontSize={"4xl"}
            fontWeight={"700"}
            textTransform={"uppercase"}
            fontFamily={"heading"}
            p={0}
          >
            Add a new preset
          </ModalHeader>
          <ModalCloseButton color={primaryColor} />
          <ModalBody overflow={"scroll"} p={0}>
            <PresetEditor
              onCloseModal={onClose}
              onCloseSuccessfullyModal={onCloseSuccessfully}
              presetId={presetId}
            />
          </ModalBody>
        </Box>
      </ModalContent>
    </Modal>
  );
};
