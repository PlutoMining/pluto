import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Divider,
  Flex,
  Heading,
  Text,
  Badge as ChakraBadge,
  useToken,
} from "@chakra-ui/react";
import { Preset } from "@pluto/interfaces";
import { MouseEvent } from "react";
import Button from "../Button/Button";
import { DeleteIcon } from "../icons/DeleteIcon";
import { DuplicateIcon } from "../icons/DuplicateIcon";
import Link from "../Link/Link";
import { Input } from "../Input";

interface PresetProps {
  preset: Preset;
  onDuplicate: (uuid: string) => (e: MouseEvent<HTMLButtonElement>) => void;
  onDelete: (uuid: string) => void;
  isDuplicateDisabled: boolean;
  index: number;
}

export const PresetAccordion: React.FC<PresetProps> = ({
  preset,
  onDuplicate,
  onDelete,
  index,
  isDuplicateDisabled,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [badgeColor] = useToken("colors", ["badge-color"]);
  const [badgeBg] = useToken("colors", ["badge-bg"]);

  return (
    <AccordionItem
      key={`preset-${preset.uuid}`} // Prefisso specifico per il preset
      backgroundColor={"td-bg"}
      borderWidth={"1px"}
      borderColor={borderColor}
    >
      <AccordionButton p={"1rem"} _hover={{ backgroundColor: "none" }} bg={"th-bg"}>
        <Flex gap={"0.5rem"} alignItems={"center"}>
          <AccordionIcon />
          <Heading fontSize={"md"} fontWeight={500} color={textColor}>
            #{++index}
          </Heading>
          <Heading fontSize={"md"} fontWeight={"bold"}>
            {preset.name}
          </Heading>
        </Flex>
      </AccordionButton>
      <AccordionPanel p={0} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider borderColor={"border-color"} />
        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem"} w={"100%"}>
          <Text fontFamily={"heading"} fontWeight={"bold"} textTransform={"capitalize"}>
            Settings
          </Text>
          <Flex gap={"1rem"} flexDir={{ base: "column", tablet: "row" }}>
            <Flex flex={1}>
              <Input
                isDisabled={true}
                type="text"
                label="Stratum URL"
                name="stratumURL"
                id={`${preset.uuid}-stratumUrl`}
                defaultValue={preset.configuration.stratumURL}
              />
            </Flex>
            <Flex flex={1}>
              <Input
                isDisabled={true}
                type="number"
                label="Stratum Port"
                name="stratumPort"
                id={`${preset.uuid}-stratumPort`}
                defaultValue={preset.configuration.stratumPort}
              />
            </Flex>
            <Flex flex={2}>
              <Input
                isDisabled={true}
                type="text"
                label="Stratum User"
                name="stratumUser"
                id={`${preset.uuid}-stratumUser`}
                defaultValue={preset.configuration.stratumUser}
              />
            </Flex>
          </Flex>
          <Text fontFamily={"heading"} fontWeight={"bold"} textTransform={"capitalize"}>
            Associated Devices
          </Text>

          {preset.associatedDevices && preset.associatedDevices.length > 0 ? (
            <Flex gap={"1rem"} flexWrap={"wrap"}>
              {preset.associatedDevices?.map((device) => (
                <ChakraBadge
                  key={device.mac}
                  backgroundColor={badgeBg}
                  color={badgeColor}
                  border={`1px solid ${badgeColor}`}
                  fontSize={"13px"}
                  borderRadius={0}
                  padding={"4px 6px"}
                >
                  <Flex alignItems={"center"} gap={"0.25rem"} p={"5px 8px"} height={"21.5px"}>
                    <Text fontWeight={500} textTransform={"capitalize"}>
                      {device.info.hostname}
                    </Text>
                    {" - "}
                    <Link
                      href={device.ip}
                      label={device.ip}
                      fontFamily="body"
                      fontWeight={400}
                      textDecoration="underline"
                      isDisabled={device.tracing ? false : true}
                    />
                  </Flex>
                </ChakraBadge>
              ))}
            </Flex>
          ) : (
            <Text textAlign={"center"} fontSize={"12px"}>
              No associated device
            </Text>
          )}
        </Flex>
      </AccordionPanel>
      <Divider borderColor={borderColor} />
      <Flex alignItems={"center"} p={"0.5rem 1rem"}>
        <Button
          variant="text"
          onClick={onDuplicate(preset.uuid)}
          icon={<DuplicateIcon h={"18"} />}
          disabled={isDuplicateDisabled}
          label="Duplicate"
        ></Button>
        <Button
          variant="text"
          onClick={() => onDelete(preset.uuid)}
          disabled={preset.associatedDevices && preset.associatedDevices.length > 0}
          icon={<DeleteIcon h={"18"} />}
          label="Delete"
        ></Button>
      </Flex>
    </AccordionItem>
  );
};
