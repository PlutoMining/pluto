"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { DeviceAccordion } from "@/components/Accordion/DeviceAccordion";
import Button from "@/components/Button/Button";
import { DeviceTable } from "@/components/Table/DeviceTable";
import { AddIcon } from "@/components/icons/AddIcon";
import { BasicModal } from "@/components/Modal/BasicModal";
import { RegisterDevicesModal } from "@/components/Modal/RegisterDevicesModal";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { useSocket } from "@/providers/SocketProvider";
import {
  Box,
  Container,
  Fade,
  Flex,
  Heading,
  Text,
  useDisclosure,
  useTheme,
  useToken,
  VStack,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Alert from "@/components/Alert/Alert";

const DevicePage: React.FC = () => {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isConfirmationModalOpen,
    onOpen: onConfirmationModalOpen,
    onClose: onConfirmationModalClose,
  } = useDisclosure();

  const [deviceIdToRemove, setDeviceIdToRemove] = useState<string | null>(null); // Nuovo stato per memorizzare l'ID del dispositivo da eliminare

  const [alert, setAlert] = useState<AlertInterface>();
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

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
  }, [isConnected, socket, registeredDevices]);

  const fetchRegisteredDevices = async () => {
    try {
      const response = await axios.get("/api/devices/imprint");
      let imprintedDevices: Device[] = response.data.data;
      setRegisteredDevices([...imprintedDevices]);
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
  const removeRegisteredDevice = useCallback((deviceId: string) => {
    setDeviceIdToRemove(deviceId); // Imposta l'ID del dispositivo che vuoi eliminare
    onConfirmationModalOpen(); // Apri la modale di conferma
  }, []);

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

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Save Successful",
          message: `Device ${
            imprintedDevices!.filter((d) => d.mac === deviceIdToRemove)[0].mac
          } has been correctly removed.`,
        });

        setRegisteredDevices(imprintedDevices!.filter((d) => d.mac !== deviceIdToRemove));

        onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo

        onConfirmationModalClose();
      } catch (error) {
        console.error("Error deleting device:", error);
        setAlert({
          status: AlertStatus.ERROR,
          title: "Remove failed.",
          message: `${error} Please try again.`,
        });
        onOpenAlert(); // Aprire l'alert per mostrare il messaggio di errore
      }
    }
  }, [deviceIdToRemove, registeredDevices]);

  const handleDevicesChanged = async () => {
    const imprintedDevices = await fetchRegisteredDevices();
    await putListenDevices(imprintedDevices);
  };

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  const [ctaIconColor] = useToken("colors", ["cta-primary-icon-color"]);

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}
      <Box p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1.5rem" }}>
        <Flex as="form" flexDir={"column"} gap={"2rem"}>
          <VStack spacing={"1.5rem"} align="stretch">
            <Flex alignItems={"center"} justify={"space-between"} gap={"1rem"}>
              <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
                Your devices
              </Heading>
              <Button
                variant={"primary"}
                onClick={onOpen}
                rightIcon={<AddIcon color={ctaIconColor} />}
                label="Add device"
              ></Button>
            </Flex>
            {registeredDevices ? (
              <>
                {registeredDevices && registeredDevices.length > 0 ? (
                  <Box
                    backgroundColor={"item-bg"}
                    borderRadius={0}
                    borderWidth={"1px"}
                    borderColor={"border-color"}
                    as={Flex}
                    flexDir={"column"}
                    gap={"1rem"}
                  >
                    <DeviceTable
                      devices={registeredDevices}
                      removeDeviceFunction={removeRegisteredDevice}
                    ></DeviceTable>

                    <Box display={{ base: "block", tablet: "none" }}>
                      <DeviceAccordion
                        removeFunction={removeRegisteredDevice}
                        devices={registeredDevices}
                      ></DeviceAccordion>
                    </Box>
                  </Box>
                ) : (
                  <VStack>
                    <Text>Looks like you haven&lsquo;t added any devices yet!</Text>
                    <Text>To get started with monitoring, please add your first device.</Text>
                    <Button variant={"primary"} onClick={onOpen} label="Add a new device"></Button>
                  </VStack>
                )}
              </>
            ) : (
              <Flex w={"100%"} alignItems={"center"} flexDirection={"column"} m={"2rem auto"}>
                <CircularProgressWithDots />
              </Flex>
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
