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

  return (
    <Modal onClose={onClose} size={"full)"} isOpen={isOpen}>
      <ModalOverlay />
      <ModalContent
        bg={bgColor}
        height={{
          base: "calc(100vh - 7.25rem)",
          tablet: "calc(100vh - 9.5rem)",
          tabletL: "calc(100vh - 8.5rem)",
        }}
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
          <ModalCloseButton />
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
