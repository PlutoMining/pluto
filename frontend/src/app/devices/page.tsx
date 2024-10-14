"use client";
import { DeviceAccordion } from "@/components/Accordion/DeviceAccordion";
import { DeviceStatusBadge } from "@/components/Badge";
import Button from "@/components/Button/Button";
import { AddIcon } from "@/components/icons/AddIcon";
import { BasicModal } from "@/components/Modal/BasicModal";
import { RegisterDevicesModal } from "@/components/Modal/RegisterDevicesModal";
import { useSocket } from "@/providers/SocketProvider";
import { getMinerName } from "@/utils/minerMap";
import {
  Box,
  Container,
  Flex,
  Heading,
  Link,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useTheme,
  VStack,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";

const DevicePage: React.FC = () => {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isConfirmationModalOpen,
    onOpen: onConfirmationModalOpen,
    onClose: onConfirmationModalClose,
  } = useDisclosure();

  // const [checkedItems, setCheckedItems] = React.useState<boolean[]>([]);
  const [deviceIdToRemove, setDeviceIdToRemove] = useState<string | null>(null); // Nuovo stato per memorizzare l'ID del dispositivo da eliminare

  // const allChecked = checkedItems.every(Boolean);
  // const isIndeterminate = checkedItems.some(Boolean) && !allChecked;

  const theme = useTheme();

  useEffect(() => {
    fetchRegisteredDevices();
  }, []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setRegisteredDevices((prevDevices) => {
        if (!prevDevices) return prevDevices;

        // Trova l'indice del dispositivo da aggiornare
        const deviceIndex = prevDevices.findIndex((device) => device.mac === e.mac);

        if (deviceIndex === -1) {
          // Se il dispositivo non è trovato, opzionalmente puoi aggiungerlo
          return prevDevices;
        }

        // Crea una nuova lista di dispositivi con l'aggiornamento
        const updatedDevices = [...prevDevices];
        updatedDevices[deviceIndex] = {
          ...updatedDevices[deviceIndex], // Mantieni i dati esistenti
          ...e, // Aggiorna con i nuovi dati da e
        };

        return updatedDevices;
      });
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket]);

  const fetchRegisteredDevices = async () => {
    try {
      const response = await axios.get("/api/devices/imprint");
      let imprintedDevices: Device[] = response.data.data;

      setRegisteredDevices(imprintedDevices || []);
      // setCheckedItems(Array.from({ length: imprintedDevices.length }, () => false));
      return imprintedDevices;
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const putListenDevices = async (imprintedDevices?: Device[]) => {
    try {
      const response = await axios.put("/api/devices/listen", {
        macs: imprintedDevices?.map((d) => d.mac),
      });
    } catch (error) {
      console.error("Error updating devices to listen:", error);
    }
  };

  // Aggiorna per accettare l'ID del dispositivo da eliminare
  const removeRegisteredDevice = (deviceId: string) => {
    setDeviceIdToRemove(deviceId); // Imposta l'ID del dispositivo che vuoi eliminare
    onConfirmationModalOpen(); // Apri la modale di conferma
  };

  const handleConfirmDelete = useCallback(async () => {
    if (deviceIdToRemove) {
      try {
        const imprintedDevices = await fetchRegisteredDevices();

        // Filtra l'array degli imprinted devices per escludere il device che stai rimuovendo
        const updatedDevices = imprintedDevices?.filter(
          (device) => device.mac !== deviceIdToRemove
        );

        // Esegui l'unlisten con i dispositivi filtrati
        await putListenDevices(updatedDevices);

        // Ora esegui il delete del dispositivo
        await axios.delete(`/api/devices/imprint/${deviceIdToRemove}`);

        setRegisteredDevices(imprintedDevices!.filter((d) => d.mac !== deviceIdToRemove));

        onConfirmationModalClose();
      } catch (error) {
        console.error("Error deleting device:", error);
      }
    }
  }, [deviceIdToRemove]);

  const handleDevicesChanged = async () => {
    const imprintedDevices = await fetchRegisteredDevices();
    await putListenDevices(imprintedDevices);
  };

  const formatTime = (seconds: number) => {
    const oneDayInSeconds = 86400;
    const oneHourInSeconds = 3600;
    const oneMinuteInSeconds = 60;

    if (seconds === 0) {
      return "-";
    } else if (seconds >= oneDayInSeconds) {
      const days = Math.floor(seconds / oneDayInSeconds);
      return `${days} ${days > 1 ? "days" : "day"}`;
    } else if (seconds >= oneHourInSeconds) {
      const hours = Math.floor(seconds / oneHourInSeconds);
      return `${hours} ${hours > 1 ? "hours" : "hour"}`;
    } else if (seconds >= oneMinuteInSeconds) {
      const minutes = Math.floor(seconds / oneMinuteInSeconds);
      return `${minutes} ${minutes > 1 ? "minutes" : "minute"}`;
    } else {
      return "< 1 minute"; // Se il tempo è inferiore a un minuto, mostra "meno di 1 minuto"
    }
  };

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Box p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}>
        <Flex as="form" flexDir={"column"} gap={"2rem"}>
          <VStack spacing={4} align="stretch">
            <Flex alignItems={"center"} justify={"space-between"} gap={"1rem"}>
              <Heading fontSize={"4xl"} fontWeight={400}>
                Your devices
              </Heading>
              <Button
                variant={"primaryBlack"}
                onClick={onOpen}
                rightIcon={<AddIcon color={theme.colors.greyscale[100]} />}
              >
                Add a new device
              </Button>
            </Flex>
            {registeredDevices ? (
              <>
                {registeredDevices && registeredDevices.length > 0 ? (
                  <Box
                    backgroundColor={theme.colors.greyscale[0]}
                    borderRadius={"1rem"}
                    p={"1rem"}
                    borderWidth={"1px"}
                    borderColor={theme.colors.greyscale[200]}
                  >
                    <Box
                      backgroundColor={theme.colors.greyscale[0]}
                      borderRadius={"0.5rem"}
                      borderWidth={"1px"}
                      borderColor={theme.colors.greyscale[200]}
                      as={Flex}
                      flexDir={"column"}
                      gap={"1rem"}
                    >
                      <TableContainer display={{ base: "none", tablet: "block" }}>
                        <Table variant="simple">
                          <Thead backgroundColor={theme.colors.greyscale[100]}>
                            <Tr>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                {/* <Checkbox
                            isChecked={allChecked}
                            isIndeterminate={isIndeterminate}
                            onChange={(e) => handleAllCheckbox(e.target.checked)}
                          > */}
                                <Text
                                  pl={"0.5rem"}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Hostname
                                </Text>
                                {/* </Checkbox> */}
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Date added
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
                                  ASIC
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
                                  Uptime
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
                              <Th borderColor={theme.colors.greyscale[100]}>
                                <Text
                                  fontWeight={500}
                                  color={theme.colors.greyscale[500]}
                                  fontFamily={"heading"}
                                  textTransform={"capitalize"}
                                  fontSize={"12px"}
                                >
                                  Status
                                </Text>
                              </Th>
                              <Th borderColor={theme.colors.greyscale[100]}></Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {registeredDevices.map((device, index) => (
                              <Tr key={`registered-device-${device.mac}`}>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {/* <Checkbox
                              isChecked={checkedItems[index]}
                              onChange={() => handleCheckbox(index)}
                            > */}
                                  <Text pl={"0.5rem"}>{device.info.hostname}</Text>
                                  {/* </Checkbox> */}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {new Date(device.createdAt!).toLocaleDateString()}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>{device.ip}</Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {getMinerName(device.info.boardVersion)}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {device.info.ASICModel}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {formatTime(device.info.uptimeSeconds)}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  {device.info.version}
                                </Td>
                                <Td borderColor={theme.colors.greyscale[100]}>
                                  <DeviceStatusBadge
                                    status={device.tracing ? "online" : "offline"}
                                  />
                                </Td>
                                <Td
                                  borderColor={theme.colors.greyscale[100]}
                                  fontFamily={"heading"}
                                  textDecoration={"underline"}
                                  fontWeight={"600"}
                                >
                                  {/* Pass the device ID to the removeRegisteredDevice function */}
                                  <Link onClick={() => removeRegisteredDevice(device.mac)}>
                                    Remove
                                  </Link>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>

                      <Box display={{ base: "block", tablet: "none" }}>
                        <DeviceAccordion devices={registeredDevices}></DeviceAccordion>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <VStack>
                    <Text>Looks like you haven&lsquo;t added any devices yet!</Text>
                    <Text>To get started with monitoring, please add your first device.</Text>
                    <Button variant={"primaryPurple"} onClick={onOpen}>
                      Add a new device
                    </Button>
                  </VStack>
                )}
              </>
            ) : (
              <Spinner />
            )}

            <RegisterDevicesModal
              isOpen={isOpen}
              onClose={onClose}
              onDevicesChanged={handleDevicesChanged}
            />

            <BasicModal
              isOpen={isConfirmationModalOpen}
              onClose={onConfirmationModalClose}
              title={"Device removal"}
              body={"Are you sure you want to remove this device?"}
              primaryActionLabel={"Proceed"}
              primaryAction={handleConfirmDelete}
              secondaryActionLabel={"Cancel"}
              secondaryAction={onConfirmationModalClose}
            />
          </VStack>
        </Flex>
      </Box>
    </Container>
  );
};

export default DevicePage;
