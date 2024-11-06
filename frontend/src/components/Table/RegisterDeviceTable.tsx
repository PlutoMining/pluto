import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToken,
  Checkbox as ChakraCheckbox,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  AccordionButton,
  Flex,
  AccordionIcon,
  Heading,
  AccordionPanel,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import { getMinerName } from "@/utils/minerMap";
import { Checkbox } from "../Checkbox";
import { useEffect, useRef, useState } from "react";

interface RegisterDeviceTableProps {
  devices: Device[];
  allChecked: boolean;
  onChange: (index: number) => void;
  checkedItems: boolean[];
  handleAllCheckbox: (value: boolean) => void;
  selectedTab: number;
}

export const RegisterDeviceTable: React.FC<RegisterDeviceTableProps> = ({
  devices,
  allChecked,
  onChange,
  checkedItems,
  handleAllCheckbox,
  selectedTab,
}) => {
  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["bg-color"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["accent-color"]);
  const [thBg] = useToken("colors", ["th-bg"]);

  const [hasScroll, setHasScroll] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (boxRef.current) {
        // Controlla se il contenuto è più grande della sua altezza visibile
        setHasScroll(boxRef.current.scrollHeight > boxRef.current.clientHeight);
      }
    };

    // Verifica lo scroll iniziale
    checkScroll();

    // Crea un ResizeObserver per monitorare i cambiamenti nelle dimensioni del contenitore
    const resizeObserver = new ResizeObserver(() => {
      checkScroll(); // Ricalcola se c'è scroll ogni volta che la dimensione cambia
    });

    // Inizia ad osservare l'elemento
    if (boxRef.current) {
      resizeObserver.observe(boxRef.current);
    }

    // Pulisci l'observer quando il componente viene smontato
    return () => {
      if (boxRef.current) {
        resizeObserver.unobserve(boxRef.current);
      }
    };
  }, []);

  return (
    <Box maxHeight={"calc(100% - 5.5rem)"} position="relative">
      <Box
        height="100%"
        overflow="auto" // Overflow al contenuto scrollabile
        ref={boxRef}
      >
        {devices && devices.length > 0 ? (
          <>
            <TableContainer overflowY={"scroll"} display={{ base: "none", tablet: "block" }}>
              <Table variant="simple" h={"100%"} borderColor={borderColor} borderWidth={"1px"}>
                <Thead>
                  <Tr>
                    <Th borderColor={borderColor} bg={thBg}>
                      <ChakraCheckbox
                        borderRadius={0}
                        alignItems="center"
                        borderColor={borderColor}
                        sx={{
                          width: "100%",
                          "& .chakra-checkbox__control": {
                            height: "1rem",
                            width: "1rem",
                            borderRadius: 0,
                            bg: "bgColor",
                            borderColor: borderColor,
                          },
                          "& .chakra-checkbox__control[data-checked]": {
                            bg: accentColor,
                            borderColor: borderColor,
                            color: borderColor,
                          },
                          "& .chakra-checkbox__control[data-checked]:hover": {
                            bg: accentColor,
                            borderColor: borderColor,
                            color: borderColor,
                          },
                          "& .chakra-checkbox__control:focus": {
                            borderColor: borderColor,
                          },
                        }}
                        isChecked={allChecked}
                        // isIndeterminate={isIndeterminate}
                        onChange={(e) => handleAllCheckbox(e.target.checked)}
                      >
                        <Text
                          fontWeight={500}
                          color={textColor}
                          fontFamily={"heading"}
                          textTransform={"capitalize"}
                          fontSize={"xs"}
                          pl={"0.5rem"}
                        >
                          Hostname
                        </Text>
                      </ChakraCheckbox>
                    </Th>
                    <Th borderColor={borderColor} bg={thBg}>
                      <Text
                        fontWeight={500}
                        color={textColor}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"xs"}
                      >
                        IP
                      </Text>
                    </Th>
                    <Th borderColor={borderColor} bg={thBg}>
                      <Text
                        fontWeight={500}
                        color={textColor}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"xs"}
                      >
                        Mac Address
                      </Text>
                    </Th>
                    <Th borderColor={borderColor} bg={thBg}>
                      <Text
                        fontWeight={500}
                        color={textColor}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"xs"}
                      >
                        Miner
                      </Text>
                    </Th>
                    <Th borderColor={borderColor} bg={thBg}>
                      <Text
                        fontWeight={500}
                        color={textColor}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"xs"}
                      >
                        Asic
                      </Text>
                    </Th>
                    <Th borderColor={borderColor} bg={thBg}>
                      <Text
                        fontWeight={500}
                        color={textColor}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"xs"}
                      >
                        FW v.
                      </Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody fontSize={"14px"}>
                  {devices?.map((device, index) => (
                    <Tr key={`tab${selectedTab}-device-${device.ip}`}>
                      <Td borderColor={borderColor}>
                        <Checkbox
                          id={device.mac}
                          name={device.mac}
                          label={device.info.hostname}
                          onChange={() => onChange(index)}
                          isChecked={checkedItems[index]}
                        />
                      </Td>
                      <Td borderColor={borderColor}>{device.ip}</Td>
                      <Td borderColor={borderColor}>{device.mac}</Td>
                      <Td borderColor={borderColor}>
                        {getMinerName(device.info.boardVersion) || device.info?.deviceModel}
                      </Td>
                      <Td borderColor={borderColor}>{device.info.ASICModel}</Td>
                      <Td borderColor={borderColor}>{device.info.version}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            <ChakraAccordion
              display={{ base: "block", tablet: "none" }}
              allowMultiple
              as={Flex}
              flexDir={"column"}
              backgroundColor={"bg-color"}
              borderWidth={"1px"}
              borderColor={"border-color"}
              borderRadius={0}
              overflow={"scroll"}
            >
              {devices?.map((device, index) => (
                <ChakraAccordionItem
                  key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
                  borderTopWidth={index > 0 ? "1px" : "0"}
                  borderBottomWidth={"0!important"}
                >
                  <AccordionButton
                    p={"1rem"}
                    justifyContent={"space-between"}
                    _hover={{ backgroundColor: "none" }}
                    as={Flex}
                    alignItems={"center"}
                    justify={"space-between"}
                    bg={"th-bg"}
                  >
                    <Flex gap={"1rem"} alignItems={"center"}>
                      <AccordionIcon />
                      <Heading
                        fontSize={"sm"}
                        fontWeight={600}
                        textTransform={"capitalize"}
                        fontFamily={"body"}
                      >
                        {device.info.hostname}
                      </Heading>
                    </Flex>

                    <ChakraCheckbox
                      borderColor={borderColor}
                      sx={{
                        "& .chakra-checkbox__control": {
                          height: "1rem",
                          width: "1rem",
                          borderRadius: 0,
                          bg: "bgColor",
                          borderColor: borderColor,
                        },
                        "& .chakra-checkbox__control[data-checked]": {
                          bg: accentColor,
                          borderColor: borderColor,
                          color: borderColor,
                        },
                        "& .chakra-checkbox__control[data-checked]:hover": {
                          bg: accentColor,
                          borderColor: borderColor,
                          color: borderColor,
                        },
                        "& .chakra-checkbox__control:focus": {
                          borderColor: borderColor,
                        },
                      }}
                      id={device.mac}
                      name={device.mac}
                      onChange={() => onChange(index)}
                      isChecked={checkedItems[index]}
                    ></ChakraCheckbox>
                  </AccordionButton>
                  <AccordionPanel
                    p={0}
                    as={Flex}
                    flexDir={"column"}
                    alignItems={"flex-start"}
                    bg={"td-bg"}
                  >
                    <Flex flexDirection={"column"} gap={"0.5rem"} w={"100%"} p={"1rem"}>
                      <Flex justify={"space-between"}>
                        <Text
                          fontWeight={500}
                          textTransform={"capitalize"}
                          fontSize={"sm"}
                          fontFamily={"heading"}
                        >
                          IP
                        </Text>
                        <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
                          {device.ip}
                        </Text>
                      </Flex>
                      <Flex justify={"space-between"}>
                        <Text
                          fontWeight={500}
                          textTransform={"capitalize"}
                          fontSize={"sm"}
                          fontFamily={"heading"}
                        >
                          Mac Address
                        </Text>
                        <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
                          {device.mac}
                        </Text>
                      </Flex>
                      <Flex justify={"space-between"}>
                        <Text
                          fontWeight={500}
                          textTransform={"capitalize"}
                          fontSize={"sm"}
                          fontFamily={"heading"}
                        >
                          Miner
                        </Text>
                        <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
                          {getMinerName(device.info.boardVersion)}
                        </Text>
                      </Flex>
                      <Flex justify={"space-between"}>
                        <Text
                          fontWeight={500}
                          textTransform={"capitalize"}
                          fontSize={"sm"}
                          fontFamily={"heading"}
                        >
                          ASIC
                        </Text>
                        <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
                          {device.info.ASICModel}
                        </Text>
                      </Flex>
                      <Flex justify={"space-between"}>
                        <Text
                          fontWeight={500}
                          textTransform={"capitalize"}
                          fontSize={"sm"}
                          fontFamily={"heading"}
                        >
                          FW v.
                        </Text>
                        <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
                          {device.info.version}
                        </Text>
                      </Flex>
                    </Flex>
                  </AccordionPanel>
                </ChakraAccordionItem>
              ))}
            </ChakraAccordion>
          </>
        ) : (
          <Text textAlign={"center"}>No device found</Text>
        )}
      </Box>

      <Box
        position="absolute"
        bottom="0"
        left="0"
        width="100%"
        height="50px"
        background={hasScroll ? `linear-gradient(to top, ${bgColor}, transparent)` : "none"}
        pointerEvents="none"
      />
    </Box>
  );
};
