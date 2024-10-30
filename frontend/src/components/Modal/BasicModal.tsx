import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useTheme,
  Flex,
} from "@chakra-ui/react";
import Button from "../Button/Button";
import { useEffect } from "react";

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
  const theme = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent
        bg={theme.colors.greyscale[0]}
        borderRadius={"1rem"}
        borderWidth={"1px"}
        borderColor={theme.colors.greyscale[200]}
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
