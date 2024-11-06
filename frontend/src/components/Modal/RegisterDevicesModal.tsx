import {
  Box,
  Checkbox as ChakraCheckbox,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  Table,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useTheme,
  VStack,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Divider,
  useToken,
} from "@chakra-ui/react";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Input } from "../Input/Input";
import { getMinerName } from "@/utils/minerMap";
import { Device } from "@pluto/interfaces";
import { isValidIp, isValidMac } from "@pluto/utils";
import axios from "axios";
import Button from "../Button/Button";
import { Checkbox } from "../Checkbox";
import { AddIcon } from "../icons/AddIcon";
import { CircularProgressWithDots } from "../ProgressBar/CircularProgressWithDots";

interface RegisterDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
}

function ModalBodyContent({
  onClose,
  onDevicesChanged,
}: {
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
}) {
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [searchError, setSearchError] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    ipAddress: "",
    macAddress: "",
  });

  const [ipAndMacAddress, setIpAndMacAddress] = useState({
    ipAddress: "",
    macAddress: "",
  });

  const [checkedFetchedItems, setCheckedFetchedItems] = React.useState<boolean[]>([]);

  const allChecked = checkedFetchedItems.every(Boolean);

  useEffect(() => {
    setIpAndMacAddress({ ipAddress: "", macAddress: "" });
    setSearchError(null);
    setDiscoveredDevices(null);
    if (tabIndex === 1) {
      getDiscoverDevices();
    }
  }, [tabIndex]);

  const getDiscoverDevices = async () => {
    try {
      setIsLoadingData(true);

      // Effettua la chiamata per ottenere le imprinted devices
      const imprintedResponse = await axios.get("/api/devices/imprint");
      const imprintedDevices: Device[] = imprintedResponse.data?.data;

      // Effettua la chiamata per ottenere le discovered devices
      const discoveredResponse = await axios.get("/api/devices/discover");
      if (discoveredResponse.status === 200) {
        const discoveredDevices: Device[] = discoveredResponse.data;

        // Filtra i discoveredDevices escludendo quelli già imprinted
        const filteredDiscoveredDevices = discoveredDevices.filter(
          (device) => !imprintedDevices.some((imprinted) => imprinted.mac === device.mac)
        );

        // Aggiorna lo stato con i dispositivi filtrati
        setDiscoveredDevices([...filteredDiscoveredDevices]);
        setCheckedFetchedItems(
          Array.from({ length: filteredDiscoveredDevices.length }, () => false)
        );
      } else {
        console.error("Error discovering devices:", discoveredResponse.status);
      }
    } catch (error) {
      console.error("Error discovering devices:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const searchDevice = useCallback(async () => {
    if (hasErrorFields(errors) || hasEmptyFields(ipAndMacAddress)) return;

    try {
      setIsLoadingData(true);

      const response = await axios.get("/api/devices/discover", {
        params: {
          ip: ipAndMacAddress.ipAddress,
          mac: ipAndMacAddress.macAddress,
        },
      });

      const discoveredDevices: Device[] = response.data;

      if (discoveredDevices.length === 1) {
        discoveredDevices[0].mac = ipAndMacAddress.macAddress;
      }

      setDiscoveredDevices(discoveredDevices || []);
    } catch (error) {
      console.error("Error discovering devices:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [ipAndMacAddress]);

  const registerDevice = async () => {
    try {
      const response = await axios.patch(`/api/devices/imprint`, {
        mac: discoveredDevices?.find((d) => d.ip === ipAndMacAddress.ipAddress)?.mac,
      });
      await onDevicesChanged();
      onClose();
    } catch (error) {
      console.error("Error registering device:", error);
    }
  };

  const registerDevices = async () => {
    try {
      // Filtra i dispositivi selezionati
      const selectedDevices = discoveredDevices?.filter((_, index) => checkedFetchedItems[index]);

      if (selectedDevices && selectedDevices.length > 0) {
        // Registra i dispositivi selezionati inviando le informazioni necessarie, in sequenza
        for (const device of selectedDevices) {
          const response = await axios.patch(`/api/devices/imprint`, {
            mac: device.mac,
          });
        }

        // Chiamata di callback per notificare che i dispositivi sono stati modificati
        await onDevicesChanged();
        onClose();
      } else {
        console.warn("No devices selected to register");
      }
    } catch (error) {
      console.error("Error registering devices:", error);
    }
  };

  const handleAllCheckbox = (value: boolean) => {
    setCheckedFetchedItems(Array.from({ length: checkedFetchedItems.length }, () => value));
  };

  const handleCheckbox = (index: number) => {
    setCheckedFetchedItems((checkedFetchedItems) =>
      checkedFetchedItems.map((value: boolean, i: number) => (i === index ? !value : value))
    );
  };

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const isValid = name === "ipAddress" ? isValidIp(value) : isValidMac(value);

    const errorLabel = value === "" ? `${name} is required` : isValid ? "" : `${name} is not valid`;

    setErrors({ ...errors, [name]: errorLabel });
    setIpAndMacAddress((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);
  //   return ipAndMacAddress.ipAddress === "" || ipAndMacAddress.macAddress === ""
  // };

  const hasEmptyFields = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasEmptyFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] === "") {
        return true;
      }
    }
    return false;
  };

  const hasErrorFields = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (hasErrorFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] !== "") {
        return true;
      }
    }
    return false;
  };

  const areManuallySearchFieldsValid = useCallback(() => {
    return hasErrorFields(errors) || hasEmptyFields(ipAndMacAddress);
  }, [errors, ipAndMacAddress]);

  const [borderColor] = useToken("colors", ["border-color"]);
  const [bgColor] = useToken("colors", ["input-bg"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [accentColor] = useToken("colors", ["accent-color"]);
  const [thBg] = useToken("colors", ["th-bg"]);
  const [thColor] = useToken("colors", ["th-color"]);
  const [primaryColor] = useToken("colors", ["primary-color"]);

  return (
    <Box p={0} pt={"1rem"} height={"100%"}>
      <Flex
        flexDir={"column"}
        gap={"2rem"}
        borderRadius={0}
        p={"1rem"}
        borderWidth={"1px"}
        borderColor={"border-color"}
        h={"100%"}
      >
        <VStack spacing={4} align="stretch" h={"100%"}>
          <Tabs onChange={(index) => setTabIndex(index)} variant="unstyled" h={"100%"}>
            <TabList>
              <Tab
                fontFamily={"heading"}
                fontSize={"sm"}
                _selected={{
                  _after: {
                    content: '""',
                    width: "32px",
                    height: "2px",
                    backgroundColor: "accent-color",
                    display: "block",
                    position: "absolute",
                    bottom: "8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: "3px",
                  },
                  fontWeight: 700,
                }}
                position="relative"
              >
                Manually
              </Tab>
              <Tab
                fontFamily={"heading"}
                fontSize={"sm"}
                _selected={{
                  _after: {
                    content: '""',
                    width: "32px",
                    height: "2px",
                    backgroundColor: "accent-color",
                    display: "block",
                    position: "absolute",
                    bottom: "8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: "3px",
                  },
                  fontWeight: 700,
                }}
                position="relative"
              >
                Auto discovery
              </Tab>
            </TabList>

            <TabPanels height={"calc(100% - 2.5rem)"}>
              <TabPanel>
                <VStack alignItems={"start"} spacing={"1rem"}>
                  <Flex w={"100%"} gap={"1rem"} flexDirection={{ base: "column", mobileL: "row" }}>
                    <Flex flex={1}>
                      <Input
                        label="IP Address"
                        name="ipAddress"
                        id="ipAddress"
                        placeholder="IP address"
                        value={ipAndMacAddress.ipAddress}
                        onChange={handleChange}
                        error={errors.ipAddress}
                      />
                    </Flex>
                    <Flex flex={1}>
                      <Input
                        label="MAC Address"
                        name="macAddress"
                        id="macAddress"
                        placeholder="MAC Address"
                        value={ipAndMacAddress.macAddress}
                        onChange={handleChange}
                        error={errors.macAddress}
                      />
                    </Flex>
                  </Flex>

                  {/* Mostra errore di ricerca */}
                  {searchError && <Text color="error-color">{searchError}</Text>}

                  <Flex align={"start"}>
                    <Button
                      variant="primary"
                      onClick={searchDevice}
                      isLoading={isLoadingData}
                      disabled={areManuallySearchFieldsValid()}
                      label="Search"
                    ></Button>
                  </Flex>
                  <Box w={"100%"}>
                    {discoveredDevices && (
                      <Box>
                        {discoveredDevices.length > 0 && ipAndMacAddress.macAddress ? (
                          <Flex flexDir={"column"} gap={"1rem"} mt={"1rem"}>
                            <Text
                              color={"text-color"}
                              fontFamily={"heading"}
                              fontSize={"sm"}
                              fontWeight={"700"}
                            >
                              Result for {ipAndMacAddress.macAddress}
                            </Text>
                            <Box>
                              <TableContainer display={{ base: "none", tablet: "block" }}>
                                <Table
                                  variant="simple"
                                  h={"100%"}
                                  borderColor={borderColor}
                                  borderWidth={"1px"}
                                >
                                  <Thead>
                                    <Tr>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        Hostname
                                      </Th>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        IP
                                      </Th>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        Mac Address
                                      </Th>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        Miner
                                      </Th>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        Asic
                                      </Th>
                                      <Th
                                        bg={thBg}
                                        borderColor={borderColor}
                                        fontWeight={500}
                                        color={thColor}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"xs"}
                                      >
                                        FW v.
                                      </Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {discoveredDevices.map((device, index) => (
                                      <Tr key={`tab0-device-${device.ip}`}>
                                        <Td borderColor={borderColor}>{device.info.hostname}</Td>
                                        <Td borderColor={borderColor}>{device.ip}</Td>
                                        <Td borderColor={borderColor}>{device.mac}</Td>
                                        <Td borderColor={borderColor}>
                                          {getMinerName(device.info.boardVersion) ||
                                            device.info?.deviceModel}
                                        </Td>
                                        <Td borderColor={borderColor}>{device.info.ASICModel}</Td>
                                        <Td borderColor={borderColor}>{device.info.version}</Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              </TableContainer>

                              <Box
                                display={{ base: "block", tablet: "none" }}
                                height={"calc(100% - 6rem)"}
                                position="relative"
                                overflow={"scroll"}
                              >
                                <Box
                                  height="100%"
                                  overflow="auto" // Overflow al contenuto scrollabile
                                  paddingBottom="50px" // Spazio per la sfumatura
                                >
                                  <ChakraAccordion
                                    allowMultiple
                                    as={Flex}
                                    flexDir={"column"}
                                    backgroundColor={"td-bg"}
                                    borderWidth={"1px"}
                                    borderColor={"border-color"}
                                    borderRadius={0}
                                  >
                                    {discoveredDevices?.map((device, index) => (
                                      <ChakraAccordionItem
                                        key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
                                        borderTopWidth={index > 0 ? "1px" : "0"}
                                        borderBottomWidth={"0!important"}
                                      >
                                        <AccordionButton
                                          p={"1rem"}
                                          justifyContent={"space-between"}
                                          _hover={{ backgroundColor: "none" }}
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
                                        </AccordionButton>
                                        <AccordionPanel
                                          p={0}
                                          as={Flex}
                                          flexDir={"column"}
                                          alignItems={"flex-start"}
                                        >
                                          <Flex
                                            p={"1rem"}
                                            flexDirection={"column"}
                                            gap={"0.5rem"}
                                            w={"100%"}
                                          >
                                            <Flex justify={"space-between"}>
                                              <Text
                                                fontWeight={500}
                                                textTransform={"capitalize"}
                                                fontSize={"sm"}
                                                fontFamily={"heading"}
                                              >
                                                IP
                                              </Text>
                                              <Text
                                                fontWeight={400}
                                                fontSize={"sm"}
                                                fontFamily={"body"}
                                              >
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
                                              <Text
                                                fontWeight={400}
                                                fontSize={"sm"}
                                                fontFamily={"body"}
                                              >
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
                                              <Text
                                                fontWeight={400}
                                                fontSize={"sm"}
                                                fontFamily={"body"}
                                              >
                                                {getMinerName(device.info.boardVersion) ||
                                                  device.info?.deviceModel}
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
                                              <Text
                                                fontWeight={400}
                                                fontSize={"sm"}
                                                fontFamily={"body"}
                                              >
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
                                              <Text
                                                fontWeight={400}
                                                fontSize={"sm"}
                                                fontFamily={"body"}
                                              >
                                                {device.info.version}
                                              </Text>
                                            </Flex>
                                          </Flex>
                                        </AccordionPanel>
                                      </ChakraAccordionItem>
                                    ))}
                                  </ChakraAccordion>
                                </Box>
                              </Box>
                            </Box>
                            <Flex align={"start"}>
                              <Flex gap={"1rem"}>
                                <Button
                                  variant="outlined"
                                  onClick={onClose}
                                  label="Cancel"
                                ></Button>
                                <Button
                                  variant="primary"
                                  onClick={() => registerDevice()}
                                  rightIcon={<AddIcon color={bgColor} />}
                                  disabled={discoveredDevices.length !== 1}
                                  label="Add device"
                                ></Button>
                              </Flex>
                            </Flex>
                          </Flex>
                        ) : (
                          <Text>No device found</Text>
                        )}
                      </Box>
                    )}
                  </Box>
                </VStack>
              </TabPanel>
              <TabPanel height={"100%"}>
                {isLoadingData ? (
                  <Flex
                    w={"100%"}
                    alignItems={"center"}
                    flexDirection={"column"}
                    gap={"1rem"}
                    m={"2rem auto"}
                  >
                    <CircularProgressWithDots />
                    <Heading fontWeight={400} fontSize={"24px"}>
                      Looking for Devices...
                    </Heading>
                  </Flex>
                ) : (
                  <VStack h={"100%"}>
                    {discoveredDevices && discoveredDevices.length > 0 ? (
                      <Box as={Flex} flexDir={"column"} gap={"1rem"} w={"100%"} h={"100%"}>
                        <Flex alignItems={"center"} justify={"space-between"} gap={"1rem"}>
                          <Text fontSize="12px">
                            “{discoveredDevices?.length}” new devices found
                          </Text>
                          <ChakraCheckbox
                            borderRadius={0}
                            display={{ base: "flex", tablet: "none" }}
                            gap={"0.5rem"}
                            flexDirection="row-reverse" // Posiziona il testo a sinistra e la checkbox a destra
                            alignItems="center" // Allinea verticalmente checkbox e testo
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
                            isChecked={allChecked}
                            onChange={(e) => handleAllCheckbox(e.target.checked)}
                          >
                            <Text fontSize="xs">Select all</Text>
                          </ChakraCheckbox>
                        </Flex>

                        <Box
                          display={{ base: "none", tablet: "block" }}
                          height={"calc(100% - 5.5rem)"}
                          position="relative" // Aggiungi il posizionamento relativo al contenitore principale
                        >
                          <Box
                            height="100%"
                            overflow="auto" // Overflow al contenuto scrollabile
                            paddingBottom="50px" // Spazio per la sfumatura
                          >
                            <TableContainer overflowY={"scroll"}>
                              <Table
                                variant="simple"
                                h={"100%"}
                                borderColor={borderColor}
                                borderWidth={"1px"}
                              >
                                <Thead>
                                  <Tr>
                                    <Th borderColor={borderColor} bg={thBg}>
                                      <ChakraCheckbox
                                        borderRadius={0}
                                        alignItems="center" // Allinea verticalmente checkbox e testo
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
                                  {discoveredDevices?.map((device, index) => (
                                    <Tr key={`tab1-device-${device.ip}`}>
                                      <Td borderColor={borderColor}>
                                        <Checkbox
                                          id={device.mac}
                                          name={device.mac}
                                          label={device.info.hostname}
                                          onChange={() => handleCheckbox(index)}
                                          isChecked={checkedFetchedItems[index]}
                                        />
                                      </Td>
                                      <Td borderColor={borderColor}>{device.ip}</Td>
                                      <Td borderColor={borderColor}>{device.mac}</Td>
                                      <Td borderColor={borderColor}>
                                        {getMinerName(device.info.boardVersion) ||
                                          device.info?.deviceModel}
                                      </Td>
                                      <Td borderColor={borderColor}>{device.info.ASICModel}</Td>
                                      <Td borderColor={borderColor}>{device.info.version}</Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </Box>
                          {/* <Box
                            position="absolute"
                            bottom="0"
                            left="0"
                            width="100%"
                            height="50px"
                            background={`linear-gradient(to top, ${bgColor}, transparent)`}
                            pointerEvents="none"
                          /> */}
                        </Box>
                        <Box
                          display={{ base: "block", tablet: "none" }}
                          height={"calc(100% - 6rem)"}
                          position="relative"
                          overflow={"scroll"}
                        >
                          <Box
                            height="100%"
                            overflow="auto" // Overflow al contenuto scrollabile
                            paddingBottom="50px" // Spazio per la sfumatura
                          >
                            {discoveredDevices && discoveredDevices.length > 0 ? (
                              <ChakraAccordion
                                allowMultiple
                                as={Flex}
                                flexDir={"column"}
                                backgroundColor={"bg-color"}
                                borderWidth={"1px"}
                                borderColor={"border-color"}
                                borderRadius={0}
                                overflow={"scroll"}
                              >
                                {discoveredDevices?.map((device, index) => (
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
                                        onChange={() => handleCheckbox(index)}
                                        isChecked={checkedFetchedItems[index]}
                                      ></ChakraCheckbox>
                                    </AccordionButton>
                                    <AccordionPanel
                                      p={0}
                                      as={Flex}
                                      flexDir={"column"}
                                      alignItems={"flex-start"}
                                      bg={"td-bg"}
                                    >
                                      <Flex
                                        flexDirection={"column"}
                                        gap={"0.5rem"}
                                        w={"100%"}
                                        p={"1rem"}
                                      >
                                        <Flex justify={"space-between"}>
                                          <Text
                                            fontWeight={500}
                                            textTransform={"capitalize"}
                                            fontSize={"sm"}
                                            fontFamily={"heading"}
                                          >
                                            IP
                                          </Text>
                                          <Text
                                            fontWeight={400}
                                            fontSize={"sm"}
                                            fontFamily={"body"}
                                          >
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
                                          <Text
                                            fontWeight={400}
                                            fontSize={"sm"}
                                            fontFamily={"body"}
                                          >
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
                                          <Text
                                            fontWeight={400}
                                            fontSize={"sm"}
                                            fontFamily={"body"}
                                          >
                                            {getMinerName(device.info.boardVersion) ||
                                              device.info?.deviceModel}
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
                                          <Text
                                            fontWeight={400}
                                            fontSize={"sm"}
                                            fontFamily={"body"}
                                          >
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
                                          <Text
                                            fontWeight={400}
                                            fontSize={"sm"}
                                            fontFamily={"body"}
                                          >
                                            {device.info.version}
                                          </Text>
                                        </Flex>
                                      </Flex>
                                    </AccordionPanel>
                                  </ChakraAccordionItem>
                                ))}
                              </ChakraAccordion>
                            ) : (
                              <Text textAlign={"center"}>No device found</Text>
                            )}
                          </Box>
                          {/* <Box
                            position="absolute"
                            bottom="0"
                            left="0"
                            width="100%"
                            height="50px"
                            background={`linear-gradient(to top, ${bgColor}, transparent)`}
                            pointerEvents="none"
                          /> */}
                        </Box>
                        <Flex align={"start"}>
                          <Flex gap={"1rem"}>
                            <Button variant="outlined" onClick={onClose} label="Cancel"></Button>
                            <Button
                              variant="primary"
                              onClick={() => registerDevices()}
                              rightIcon={<AddIcon color={bgColor} />}
                              disabled={
                                checkedFetchedItems.filter((el) => el === true).length === 0
                              }
                              label={`Add ${
                                checkedFetchedItems.filter((el) => el === true).length > 0
                                  ? checkedFetchedItems.filter((el) => el === true).length
                                  : ""
                              } device`}
                            ></Button>
                          </Flex>
                        </Flex>
                      </Box>
                    ) : (
                      <Text>No device found.</Text>
                    )}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Flex>
    </Box>
  );
}

export const RegisterDevicesModal: React.FC<RegisterDevicesModalProps> = ({
  isOpen,
  onClose,
  onDevicesChanged,
}) => {
  const [primaryColor] = useToken("colors", ["primary-color"]);

  return (
    <Modal onClose={onClose} size={"full)"} isOpen={isOpen}>
      <ModalOverlay boxShadow={"0px -39px 39px 0px #00988817"} />
      <ModalContent
        bg={"bg-color"}
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
          overflow={"hidden"}
        >
          <ModalHeader p={0} fontFamily={"heading"} fontWeight={400} fontSize={"2rem"}>
            Add a new Device
          </ModalHeader>
          <ModalCloseButton color={primaryColor} />
          <ModalBody p={0} height={"calc(100% - 5rem)"}>
            <ModalBodyContent
              onClose={onClose}
              onDevicesChanged={onDevicesChanged}
            ></ModalBodyContent>
          </ModalBody>
        </Box>
      </ModalContent>
    </Modal>
  );
};
