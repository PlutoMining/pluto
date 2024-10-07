import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  useTheme,
  Flex,
  Text,
  Button as ChakraButton,
  Stack,
  RadioGroup,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { RadioButton } from "../RadioButton";

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
  const theme = useTheme();

  const [radioButtonValue, setRadioButtonValue] = useState<RadioButtonValues>(
    RadioButtonValues.ONLY_SAVE
  );

  const handleRadioButtonChange = useCallback((value: string) => {
    setRadioButtonValue(value as RadioButtonValues);
  }, []);

  const handleAction = useCallback(() => {
    onClose(radioButtonValue);
  }, [onClose, radioButtonValue]);

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
        bg={"#fff"}
        borderColor={"#E1DEE3"}
        borderWidth={"1px"}
        borderRadius={"1rem"}
        p={"1rem"}
        color={"greyscale.900"}
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
          <ChakraButton variant="secondary" onClick={() => onClose("")}>
            Cancel
          </ChakraButton>
          <ChakraButton variant="primaryPurple" onClick={handleAction}>
            Confirm
          </ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
