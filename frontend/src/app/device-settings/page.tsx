"use client";
import { DeviceSettingsAccordion } from "@/components/Accordion";
import Alert from "@/components/Alert/Alert";
import { AlertInterface, AlertStatus } from "@/components/Alert/interfaces";
import Button from "@/components/Button/Button";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { RestartIcon } from "@/components/icons/RestartIcon";
import { SearchInput } from "@/components/Input";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import {
  Box,
  Container,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useTheme,
  useToken,
  VStack,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

const SettingsPage = () => {
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();
  const {
    isOpen: isOpenAlert,
    onOpen: onOpenAlert,
    onClose: onCloseAlert,
  } = useDisclosure({ defaultIsOpen: false });

  const [alert, setAlert] = useState<AlertInterface>();
  const [imprintedDevices, setImprintedDevices] = useState<Device[] | undefined>();

  useEffect(() => {
    fetchImprintedDevices();
  }, []);

  const fetchImprintedDevices = async () => {
    try {
      const response = await axios.get<{ data: Device[] }>("/api/devices/imprint");
      const imprintedDevices = response.data.data;

      setImprintedDevices(imprintedDevices);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const handleRestartAll = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();

      onCloseModal();

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        if (imprintedDevices && imprintedDevices.length > 0) {
          await Promise.all(imprintedDevices.map((d) => handleRestart(d.mac)));

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Restart Successful",
            message:
              "All devices have been restarted successfully. The eventual new settings have been applied, and the miners are back online.",
          });

          onOpenAlert();
        } else {
          setAlert({
            status: AlertStatus.WARNING,
            title: "No Devices Available",
            message: "There are no registered devices to restart at this moment.",
          });
          onOpenAlert();
        }
      } catch (error) {
        let errorMessage = "An error occurred while attempting to restart the devices.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Restart Failed",
          message: `${errorMessage} Please try again or contact support if the issue persists.`,
        });
        onOpenAlert();
      }
    },
    [imprintedDevices, onCloseModal, onOpenAlert]
  );

  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const response = await axios.get<{ data: Device[] }>("/api/devices/imprint", {
        params: {
          q: e.target.value,
        },
      });

      const discoveredDevices = response.data;
      setImprintedDevices(discoveredDevices.data);
    } catch (error) {
      console.error("Error searching devices:", error);
    }
  };

  const closeAlert = useCallback(() => {
    setAlert(undefined);
    onCloseAlert();
  }, [onCloseAlert]);

  const [itemBg] = useToken("colors", ["item-bg"]);

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      {alert && (
        <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
      )}

      <Box p={{ mobile: "1rem 0", tablet: "1rem" }}>
        <Flex as="form" flexDir={"column"} gap={"2rem"}>
          <VStack spacing={4} align="stretch">
            <Flex
              justify={{
                mobile: "flex-start",
                tablet: "space-between",
                desktop: "space-between",
              }}
              alignItems={{ mobile: "start", tablet: "center", desktop: "center" }}
              flexDir={{ mobile: "column", tablet: "row", desktop: "row" }}
              gap={"1.5rem"}
            >
              <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
                Device settings
              </Heading>
              <Flex
                gap={"1rem"}
                alignItems={"center"}
                w={{ mobile: "100%", tablet: "unset", desktop: "unset" }}
              >
                <SearchInput
                  label="Search device"
                  onChange={handleSearch}
                  placeholder="Search device"
                />
                <Box>
                  <Button
                    variant="primary"
                    icon={<RestartIcon color={itemBg} />}
                    onClick={onOpenModal}
                    label="Restart all"
                  ></Button>
                </Box>
              </Flex>
            </Flex>

            {imprintedDevices ? (
              <>
                {imprintedDevices.length > 0 ? (
                  <DeviceSettingsAccordion
                    fetchedDevices={imprintedDevices}
                    setAlert={setAlert}
                    alert={alert}
                    onOpenAlert={onOpenAlert}
                  />
                ) : (
                  <Text textAlign={"center"}>No devices available.</Text>
                )}
              </>
            ) : (
              // <DeviceSettingsTable devices={imprintedDevices}></DeviceSettingsTable>
              <Flex w={"100%"} alignItems={"center"} flexDirection={"column"} m={"2rem auto"}>
                <CircularProgressWithDots />
              </Flex>
            )}
          </VStack>
        </Flex>
      </Box>

      <Modal
        isCentered
        onClose={onCloseModal}
        isOpen={isOpenModal}
        motionPreset="slideInBottom"
        blockScrollOnMount={false}
        returnFocusOnClose={false}
      >
        <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="3px" />
        <ModalContent
          bg={"item-bg"}
          borderColor={"border-color"}
          borderWidth={"1px"}
          borderRadius={0}
          p={"1rem"}
          color={"body-text"}
        >
          <ModalHeader>Restart all devices?</ModalHeader>
          <Box pos={"absolute"} top={"1rem"} right={"1rem"} cursor={"pointer"}>
            <CloseIcon color={"body-text"} onClick={onCloseModal} />
          </Box>
          <ModalBody>
            <Text>
              Keep in mind that restarting the device may result in the loss of an entire block of
              transactions.
            </Text>
          </ModalBody>
          <ModalFooter gap={"1.5rem"}>
            <Button variant="outlined" onClick={onCloseModal} label="Cancel"></Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleRestartAll}
              label="Restart"
            ></Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default SettingsPage;
