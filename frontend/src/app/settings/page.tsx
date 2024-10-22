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
  Fade,
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
  const [isRestartAllLoading, setIsRestartAllLoading] = useState<boolean>(false);

  const theme = useTheme();

  const [imprintedDevices, setImprintedDevices] = useState<Device[] | undefined>();

  useEffect(() => {
    fetchImprintedDevices();
  }, []);

  const fetchImprintedDevices = async () => {
    try {
      const response = await axios.get<{ data: Device[] }>("/api/devices/imprint");
      const imprintedDevices = response.data.data;

      console.log(imprintedDevices[0].info.hashRate / 1000 / imprintedDevices[0].info.power);
      setImprintedDevices(imprintedDevices);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const handleRestartAll = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();

      setIsRestartAllLoading(true);
      onCloseModal();

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        if (imprintedDevices && imprintedDevices.length > 0) {
          await Promise.all(imprintedDevices.map((d) => handleRestart(d.mac)));

          window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });

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

        setIsRestartAllLoading(false);
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

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      {alert && (
        <Fade in={isOpenAlert}>
          <Alert isOpen={isOpenAlert} onOpen={onOpenAlert} onClose={closeAlert} content={alert} />
        </Fade>
      )}

      <Box p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}>
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
              gap={"1rem"}
            >
              <Heading fontSize={"4xl"} fontWeight={400}>
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
                    variant="primaryBlack"
                    icon={<RestartIcon color={theme.colors.greyscale[0]} />}
                    onClick={onOpenModal}
                  >
                    Restart all
                  </Button>
                </Box>
              </Flex>
            </Flex>

            {imprintedDevices ? (
              <DeviceSettingsAccordion
                devices={imprintedDevices}
                setAlert={setAlert}
                alert={alert}
                onOpenAlert={onOpenAlert}
              />
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
          bg={"#fff"}
          borderColor={"#E1DEE3"}
          borderWidth={"1px"}
          borderRadius={"1rem"}
          p={"1rem"}
          color={"greyscale.900"}
        >
          <ModalHeader>Do you want to save the new settings and restart?</ModalHeader>
          <Box pos={"absolute"} top={"1rem"} right={"1rem"} cursor={"pointer"}>
            <CloseIcon color={"greyscale.900"} onClick={onCloseModal} />
          </Box>
          <ModalBody>
            <Text>
              To apply the new settings, the miners needs to restart. Do you want to proceed?
            </Text>
          </ModalBody>
          <ModalFooter gap={"1.5rem"}>
            <Button variant="secondary" onClick={onCloseModal}>
              Go back
            </Button>
            <Button type="submit" variant="primaryPurple" onClick={handleRestartAll}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default SettingsPage;
