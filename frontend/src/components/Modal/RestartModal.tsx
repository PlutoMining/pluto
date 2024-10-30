import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Text,
  Button as ChakraButton,
} from "@chakra-ui/react";

interface RestartModalProps {
  isOpen: boolean;
  onClose: (arg0: boolean) => void;
  size?: string;
}

export const RestartModal: React.FC<RestartModalProps> = ({ isOpen, onClose }) => {
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
        bg={"#fff"}
        borderColor={"#E1DEE3"}
        borderWidth={"1px"}
        borderRadius={"1rem"}
        p={"1rem"}
        color={"greyscale.900"}
      >
        <ModalHeader>Restart Device</ModalHeader>
        <ModalBody>
          <Text>Do you want to restart this device?</Text>
        </ModalBody>
        <ModalFooter gap={"1.5rem"}>
          <ChakraButton variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </ChakraButton>
          <ChakraButton variant="primary" onClick={() => onClose(true)}>
            Restart
          </ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
