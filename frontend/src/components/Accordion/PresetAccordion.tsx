import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Divider,
  Flex,
  Heading,
  Text,
  useTheme,
  Badge as ChakraBadge,
} from "@chakra-ui/react";
import { Preset } from "@pluto/interfaces";
import { MouseEvent } from "react";
import { Badge } from "../Badge";
import Button from "../Button/Button";
import { DeleteIcon } from "../icons/DeleteIcon";
import { DuplicateIcon } from "../icons/DuplicateIcon";
import Link from "../Link/Link";

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
  const theme = useTheme();

  return (
    <AccordionItem
      key={`preset-${preset.uuid}`} // Prefisso specifico per il preset
      backgroundColor={"greyscale.0"}
      borderWidth={"1px"}
      borderColor={"greyscale.200"}
      borderRadius={"1rem"}
      p={"1rem"}
    >
      <AccordionButton p={0} justifyContent={"space-between"} _hover={{ backgroundColor: "none" }}>
        <Flex gap={"0.5rem"} alignItems={"center"}>
          <Heading fontSize={"md"} fontWeight={500} color={theme.colors.greyscale[300]}>
            #{++index}
          </Heading>
          <Heading fontSize={"md"} fontWeight={"bold"}>
            {preset.name}
          </Heading>
        </Flex>

        <Flex alignItems={"center"} gap={"0.5rem"} fontFamily={"heading"}>
          View more
          <AccordionIcon />
        </Flex>
      </AccordionButton>
      <AccordionPanel p={0} pb={4} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider mb={"1rem"} mt={"1rem"} borderColor={theme.colors.greyscale[200]} />
        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"100%"}>
          <Text fontFamily={"heading"} fontWeight={"bold"} textTransform={"capitalize"}>
            Settings
          </Text>

          <Flex gap={"1rem"} flexWrap={"wrap"}>
            <Badge
              title={"Stratum URL:"}
              label={preset.configuration.stratumURL}
              color={theme.colors.greyscale[200]}
            ></Badge>
            <Badge
              title={"Stratum Port:"}
              label={preset.configuration.stratumPort}
              color={theme.colors.greyscale[200]}
            ></Badge>
            <Badge
              title={"Stratum User:"}
              label={preset.configuration.stratumUser}
              color={theme.colors.greyscale[200]}
            ></Badge>
            {/* <Badge
              title={"Stratum Password:"}
              label={preset.configuration.stratumPassword}
              color={theme.colors.greyscale[200]}
            ></Badge> */}
          </Flex>

          <Text fontFamily={"heading"} fontWeight={"bold"} textTransform={"capitalize"}>
            Associated Devices
          </Text>

          {preset.associatedDevices && preset.associatedDevices.length > 0 ? (
            <Flex gap={"1rem"} flexWrap={"wrap"}>
              {preset.associatedDevices?.map((device) => (
                <ChakraBadge
                  key={device.mac}
                  bg={theme.colors.greyscale[200]}
                  color={theme.colors.greyscale[500]}
                  fontSize={"13px"}
                  borderRadius={"6px"}
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
      <Divider mb={"1rem"} mt={"1rem"} borderColor={theme.colors.greyscale[200]} />
      <Flex alignItems={"center"}>
        <Button
          variant="text"
          onClick={onDuplicate(preset.uuid)}
          icon={<DuplicateIcon h={"18"} color={theme.colors.greyscale[500]} />}
          disabled={isDuplicateDisabled}
          label="Duplicate"
        ></Button>
        <Button
          variant="text"
          onClick={() => onDelete(preset.uuid)}
          disabled={preset.associatedDevices && preset.associatedDevices.length > 0}
          icon={<DeleteIcon h={"18"} color={theme.colors.greyscale[500]} />}
          label="Delete"
        ></Button>
      </Flex>
    </AccordionItem>
  );
};
