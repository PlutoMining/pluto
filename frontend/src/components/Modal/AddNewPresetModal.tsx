import {
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useTheme,
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
  const theme = useTheme();

  return (
    <Modal onClose={onClose} size={"full)"} isOpen={isOpen}>
      <ModalOverlay />
      <ModalContent
        bg={theme.colors.greyscale[0]}
        borderRadius={"1rem"}
        height={"calc(100% - 8rem)"}
      >
        <Box maxW="container.2xl" margin={"0 auto"} p={"2rem"}>
          <ModalHeader p={0} fontFamily={"heading"} fontWeight={400} fontSize={"2rem"}>
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
