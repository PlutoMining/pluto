import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Text,
  Button as ChakraButton,
  useToken,
} from "@chakra-ui/react";

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
          <ChakraButton variant="outlined" onClick={() => onClose(false)}>
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
