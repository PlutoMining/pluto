import {
  Box,
  Button as ChakraButton,
  Checkbox as ChakraCheckbox,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
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
} from "@chakra-ui/react";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Input } from "../Input/Input";

import axios from "axios";
import Button from "../Button/Button";
import { AddIcon } from "../icons/AddIcon";
import { Device } from "@pluto/interfaces";
import { getMinerName } from "@/utils/minerMap";
import { Checkbox } from "../Checkbox";
import { isValidIp, isValidMac } from "@pluto/utils";

interface RegisterDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
}

function ModalBodyContent({
  onClose,
  onDevicesChanged,
  theme,
}: {
  onClose: () => void;
  onDevicesChanged: () => Promise<void>;
  theme: any;
}) {
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [deviceIp, setDeviceIp] = useState("");
  const [deviceMac, setDeviceMac] = useState("");

  const [isIpValid, setIsIpValid] = useState(true);
  const [isMacValid, setIsMacValid] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [checkedFetchedItems, setCheckedFetchedItems] = React.useState<boolean[]>([]);

  const allChecked = checkedFetchedItems.every(Boolean);
  // const isIndeterminate = checkedFetchedItems.some(Boolean) && !allChecked;

  useEffect(() => {
    setDeviceIp("");
    setDeviceMac("");
    setIsIpValid(true);
    setIsMacValid(true);
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
    // Verifica che entrambi i campi siano compilati e validi
    if (!isValidIp(deviceIp)) {
      setIsIpValid(false);
      setSearchError("Please enter a valid IP address.");
      return;
    }
    if (!isValidMac(deviceMac)) {
      setIsMacValid(false);
      setSearchError("Please enter a valid MAC address.");
      return;
    }

    setSearchError(null); // Rimuove l'errore se entrambi i campi sono validi

    try {
      setIsLoadingData(true);

      const response = await axios.get("/api/devices/discover", {
        params: {
          ip: deviceIp,
          mac: deviceMac,
        },
      });

      const discoveredDevices: Device[] = response.data;

      if (discoveredDevices.length === 1) {
        discoveredDevices[0].mac = deviceMac;
      }

      setDiscoveredDevices(discoveredDevices || []);
    } catch (error) {
      console.error("Error discovering devices:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [deviceIp, deviceMac]);

  const registerDevice = async () => {
    try {
      const response = await axios.patch(`/api/devices/imprint`, {
        mac: discoveredDevices?.find((d) => d.ip === deviceIp)?.mac,
      });
      await onDevicesChanged();
      onClose();
    } catch (error) {
      console.error("Error registering device:", error);
    }
  };

  // @remarks removed because promise.all generates race condition on patch
  // const registerDevices = async () => {
  //   try {
  //     // Filtra i dispositivi selezionati
  //     const selectedDevices = fetchedDevices?.filter((_, index) => checkedFetchedItems[index]);

  //     if (selectedDevices && selectedDevices.length > 0) {
  //       // Registra i dispositivi selezionati inviando le informazioni necessarie
  //       const responses = await Promise.all(
  //         selectedDevices.map((device) =>
  //           axios.patch(`/api/devices/imprint`, {
  //             mac: device.mac,
  //           })
  //         )
  //       );

  //       // Chiamata di callback per notificare che i dispositivi sono stati modificati
  //       await onDevicesChanged();
  //       onClose();
  //     } else {
  //       console.warn("No devices selected to register");
  //     }
  //   } catch (error) {
  //     console.error("Error registering devices:", error);
  //   }
  // };

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

  const handleSetIpInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDeviceIp(e.target.value);
    setIsIpValid(isValidIp(e.target.value)); // Valida l'IP durante l'inserimento
  }, []);

  const handleSetMacInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDeviceMac(e.target.value);
    setIsMacValid(isValidMac(e.target.value)); // Valida il MAC durante l'inserimento
  }, []);

  return (
    <>
      <Box
        backgroundColor={theme.colors.greyscale[0]}
        borderRadius={"1rem"}
        p={"1rem"}
        borderWidth={"1px"}
        borderColor={theme.colors.greyscale[200]}
      >
        <Tabs onChange={(index) => setTabIndex(index)} variant="unstyled">
          <TabList>
            <Tab
              fontFamily={"heading"}
              fontSize={"sm"}
              _selected={{
                _after: {
                  content: '""',
                  width: "32px",
                  height: "2px",
                  backgroundColor: theme.colors.brand.secondary,
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
                  backgroundColor: theme.colors.brand.secondary,
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

          <TabPanels>
            <TabPanel>
              <VStack alignItems={"start"} spacing={"1rem"}>
                <HStack>
                  <Input
                    label="IP Address"
                    name="ip_address"
                    id="ip_address"
                    placeholder="IP address"
                    value={deviceIp}
                    onChange={handleSetIpInputChange}
                    isInvalid={!isIpValid}
                  />
                  <Input
                    label="MAC Address"
                    name="mac_address"
                    id="mac_address"
                    placeholder="MAC Address"
                    value={deviceMac}
                    onChange={handleSetMacInputChange}
                    isInvalid={!isMacValid}
                  />
                </HStack>

                {/* Mostra errore di ricerca */}
                {searchError && <Text color="red.500">{searchError}</Text>}

                <Flex align={"start"}>
                  <Button variant="primaryPurple" onClick={searchDevice} isLoading={isLoadingData}>
                    Search
                  </Button>
                </Flex>

                {isLoadingData ? (
                  <Spinner />
                ) : (
                  <Box w={"100%"}>
                    {discoveredDevices && (
                      <Box>
                        {discoveredDevices.length > 0 ? (
                          <Flex flexDir={"column"} gap={"1rem"} mt={"1rem"}>
                            <Text
                              color={theme.colors.greyscale[900]}
                              fontFamily={"heading"}
                              fontSize={"sm"}
                              fontWeight={"700"}
                            >
                              Result for {deviceIp}
                            </Text>
                            <TableContainer>
                              <Table variant="simple">
                                <Thead backgroundColor={theme.colors.greyscale[100]}>
                                  <Tr>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        Hostname
                                      </Text>
                                    </Th>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        IP
                                      </Text>
                                    </Th>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        Mac Address
                                      </Text>
                                    </Th>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        Miner
                                      </Text>
                                    </Th>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        Asic
                                      </Text>
                                    </Th>
                                    <Th borderColor={theme.colors.greyscale[100]}>
                                      <Text
                                        fontWeight={500}
                                        color={theme.colors.greyscale[500]}
                                        fontFamily={"heading"}
                                        textTransform={"capitalize"}
                                        fontSize={"12px"}
                                      >
                                        FW v.
                                      </Text>
                                    </Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {discoveredDevices.map((device, index) => (
                                    <Tr key={`tab0-device-${device.ip}`}>
                                      <Td borderColor={theme.colors.greyscale[100]}>
                                        {device.info.hostname}
                                      </Td>
                                      <Td borderColor={theme.colors.greyscale[100]}>{device.ip}</Td>
                                      <Td borderColor={theme.colors.greyscale[100]}>
                                        {device.mac}
                                      </Td>
                                      <Td borderColor={theme.colors.greyscale[100]}>
                                        {getMinerName(device.info.boardVersion)}
                                      </Td>
                                      <Td borderColor={theme.colors.greyscale[100]}>
                                        {device.info.ASICModel}
                                      </Td>
                                      <Td borderColor={theme.colors.greyscale[100]}>
                                        {device.info.version}
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                            <Flex align={"start"}>
                              <Flex gap={"1rem"}>
                                <Button variant="secondary" onClick={onClose}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="primaryPurple"
                                  onClick={() => registerDevice()}
                                  rightIcon={<AddIcon color={theme.colors.greyscale[100]} />}
                                  disabled={discoveredDevices.length !== 1}
                                >
                                  Add device
                                </Button>
                              </Flex>
                            </Flex>
                          </Flex>
                        ) : (
                          <Text>No device found</Text>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>
            <TabPanel>
              {isLoadingData ? (
                <Spinner color="orange" />
              ) : (
                <VStack>
                  {discoveredDevices ? (
                    <Box as={Flex} flexDir={"column"} gap={"1rem"} w={"100%"}>
                      <Text>“{discoveredDevices?.length}” new devices found</Text>
                      <TableContainer>
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <ChakraCheckbox
                                  borderColor={theme.colors.greyscale[900]}
                                  borderRadius={"3px"}
                                  size="lg"
                                  sx={{
                                    "& .chakra-checkbox__control": {
                                      bg: theme.colors.greyscale[0], // colore di sfondo (hex)
                                      borderColor: theme.colors.greyscale[900], // colore del bordo (hex)
                                    },
                                    "& .chakra-checkbox__control[data-checked]": {
                                      bg: theme.colors.brand.secondary, // colore quando è selezionato (checked)
                                      borderColor: theme.colors.greyscale[900], // colore bordo quando è selezionato
                                      color: theme.colors.greyscale[0], // colore di sfondo (hex)
                                      boxShadow: "inset 0 0 0 2px white", // spazio bianco tra bordo e riempimento
                                    },
                                  }}
                                  isChecked={allChecked}
                                  // isIndeterminate={isIndeterminate}
                                  onChange={(e) => handleAllCheckbox(e.target.checked)}
                                >
                                  <Text
                                    fontWeight={500}
                                    color={theme.colors.greyscale[500]}
                                    fontFamily={"heading"}
                                    textTransform={"capitalize"}
                                    fontSize={"12px"}
                                    pl={"0.5rem"}
                                  >
                                    Hostname
                                  </Text>
                                </ChakraCheckbox>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  IP
                                </Text>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Mac Address
                                </Text>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Miner
                                </Text>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Asic
                                </Text>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  FW v.
                                </Text>
                              </Th>
                            </Tr>
                          </Thead>
                          <Tbody fontSize={"14px"}>
                            {discoveredDevices?.map((device, index) => (
                              <Tr key={`tab1-device-${device.ip}`}>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  <Checkbox
                                    id={device.mac}
                                    name={device.mac}
                                    label={device.info.hostname}
                                    onChange={() => handleCheckbox(index)}
                                    isChecked={checkedFetchedItems[index]}
                                    size="md"
                                  />
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>{device.ip}</Td>
                                <Td borderColor={theme.colors.greyscale[100]}>{device.mac}</Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {getMinerName(device.info.boardVersion)}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {device.info.ASICModel}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {device.info.version}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}></Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                      <Flex align={"start"}>
                        <Flex gap={"1rem"}>
                          <Button variant="secondary" onClick={onClose}>
                            Cancel
                          </Button>
                          <Button
                            variant="primaryPurple"
                            onClick={() => registerDevices()}
                            rightIcon={<AddIcon color={theme.colors.greyscale[100]} />}
                            disabled={checkedFetchedItems.filter((el) => el === true).length === 0}
                          >
                            Add{" "}
                            {checkedFetchedItems.filter((el) => el === true).length > 0
                              ? checkedFetchedItems.filter((el) => el === true).length
                              : ""}{" "}
                            device
                          </Button>
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
      </Box>
    </>
  );
}

export const RegisterDevicesModal: React.FC<RegisterDevicesModalProps> = ({
  isOpen,
  onClose,
  onDevicesChanged,
}) => {
  const theme = useTheme();
  return (
    <Modal onClose={onClose} size={"full"} isOpen={isOpen}>
      <ModalOverlay />
      <ModalContent bg={theme.colors.greyscale[0]} borderRadius={"1rem"} marginTop={"5rem"}>
        <ModalHeader>
          <Heading fontSize={"4xl"}>Add a new Device</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ModalBodyContent
            onClose={onClose}
            theme={theme}
            onDevicesChanged={onDevicesChanged}
          ></ModalBodyContent>
        </ModalBody>
        <ModalFooter>
          <ChakraButton onClick={onClose}>Close</ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
