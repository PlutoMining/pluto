import { useSocket } from "@/providers/SocketProvider";
import {
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Box,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  Divider,
  Flex,
  Grid,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
  useAccordionItemState,
  useDisclosure,
  useTheme,
} from "@chakra-ui/react";
import { Device, Preset } from "@pluto/interfaces";
import { validateDomain, validateTCPPort } from "@pluto/utils";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertInterface, AlertStatus } from "../Alert/interfaces";
import { DeviceStatusBadge } from "../Badge";
import Button from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { ArrowIcon, ArrowRightUpIcon } from "../icons/ArrowIcon";
import { RestartIcon } from "../icons/RestartIcon";
import { Input } from "../Input/Input";
import { RadioButton } from "../RadioButton";
import { Select } from "../Select/Select";
import Link from "../Link/Link";
import { SaveAndRestartModal } from "../Modal";
import { RadioButtonValues } from "../Modal/SaveAndRestartModal";
import { RestartModal } from "../Modal/RestartModal";
import { CloseIcon } from "../icons/CloseIcon";
import { SelectPresetModal } from "../Modal/SelectPresetModal";

interface DeviceSettingsAccordionProps {
  devices: Device[] | undefined;
  presets: Preset[];
  alert?: AlertInterface;
  setAlert: React.Dispatch<React.SetStateAction<AlertInterface | undefined>>;
  onOpenAlert: () => void;
}

interface AccordionItemProps {
  device: Device;
  presets: Preset[];
  alert?: AlertInterface;
  setAlert: React.Dispatch<React.SetStateAction<AlertInterface | undefined>>;
  onOpenAlert: () => void;
  handleCheckboxChange: (mac: string, isChecked: boolean) => void;
  checkedItems: { mac: String; value: boolean }[];
}

enum RadioButtonStatus {
  PRESET = "preset",
  CUSTOM = "custom",
}

interface StratumUser {
  workerName: string;
  stratumUser: string;
}

export const DeviceSettingsAccordion: React.FC<DeviceSettingsAccordionProps> = ({
  devices,
  presets,
  alert,
  setAlert,
  onOpenAlert,
}) => {
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();

  const [isSelectPoolPresetOpen, setIsSelectPoolPresetModalOpen] = useState(false);

  const theme = useTheme();

  const [checkedFetchedItems, setCheckedFetchedItems] = useState<{ mac: string; value: boolean }[]>(
    []
  );

  const [activeIndex, setActiveIndex] = useState<number | number[]>([]);

  const allChecked =
    checkedFetchedItems.length > 0 && checkedFetchedItems.every((item) => item.value);

  const handleAllCheckbox = useCallback(
    (value: boolean) => {
      const newValues = devices
        ? Array.from({ length: devices.length || 0 }, (_, i) => ({
            mac: devices[i].mac,
            value: value,
          }))
        : [];
      setCheckedFetchedItems(newValues);
    },
    [devices]
  );

  const handleRestartSelected = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      onCloseModal();

      // setCheckedFetchedItems([]);

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        if (checkedFetchedItems && checkedFetchedItems.length > 0) {
          await Promise.all(
            checkedFetchedItems.filter((d) => d.value).map((d) => handleRestart(d.mac))
          );

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
    [checkedFetchedItems, onOpenAlert, setAlert]
  );

  const handleCloseSuccessfully = async (uuid: string) => {
    setIsSelectPoolPresetModalOpen(false);

    const handleSavePreset = (mac: string, d: Device) =>
      axios.patch<{ message: string; data: Device }>(`/api/devices/${mac}/system`, d);

    try {
      if (devices) {
        await Promise.all(
          devices
            .filter((device) =>
              checkedFetchedItems.some((item) => item.mac === device.mac && item.value === true)
            )
            .map((d) => {
              handleSavePreset(d.mac, { ...d, presetUuid: uuid });
            })
        );
      }

      setAlert({
        status: AlertStatus.SUCCESS,
        title: "Save Successful",
        message: "All the selected devices have been successfully saved.",
      });
      onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo
    } catch (error) {
      let errorMessage = "An error occurred while saving the device settings.";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }

      setAlert({
        status: AlertStatus.ERROR,
        title: "Save Failed",
        message: `${errorMessage} Please try again.`,
      });
      onOpenAlert(); // Aprire l'alert per mostrare il messaggio di errore
    }
  };

  const handleCheckboxChange = useCallback((mac: string, isChecked: boolean) => {
    setCheckedFetchedItems((prevItems) => {
      // Controlla se l'elemento con il MAC esiste già
      const existingItem = prevItems.find((item) => item.mac === mac);

      if (existingItem) {
        // Se esiste, aggiorna il valore
        return prevItems.map((item) => (item.mac === mac ? { ...item, value: isChecked } : item));
      } else {
        // Se non esiste, aggiungi un nuovo elemento
        return [...prevItems, { mac, value: isChecked }];
      }
    });

    // Chiudi l'accordion se la checkbox è selezionata
    if (isChecked) {
      setActiveIndex([]); // Chiude l'accordion
    }
  }, []);

  return (
    <>
      <Flex
        flexDirection={"column"}
        gap={"1rem"}
        borderWidth={"1px"}
        borderColor={"greyscale.200"}
        borderRadius={"1rem"}
        backgroundColor={theme.colors.greyscale[0]}
        p={"1rem"}
      >
        <Flex justify={"space-between"} gap={"1rem"} alignItems={"center"}>
          <Checkbox
            id={"select-all-devices"}
            name={"select-all-devices"}
            label={
              checkedFetchedItems.filter((d) => d.value === true).length === 0
                ? `Select all`
                : `${checkedFetchedItems.filter((d) => d.value === true).length} of ${
                    devices?.length
                  } selected`
            }
            isChecked={allChecked}
            onChange={(e) => handleAllCheckbox(e.target.checked)}
          ></Checkbox>
          <Flex alignItems={"center"} gap={"1rem"}>
            <Button
              onClick={() => setIsSelectPoolPresetModalOpen(true)}
              variant="text"
              icon={<ArrowRightUpIcon color={theme.colors.greyscale[500]} />}
              disabled={
                checkedFetchedItems.length <= 1 ||
                checkedFetchedItems.filter((item) => item.value === true).length <= 1
              }
              label="Select Pool Preset"
            ></Button>
            <Button
              onClick={onOpenModal}
              variant="outlined"
              icon={<RestartIcon color={theme.colors.greyscale[500]} />}
              disabled={
                checkedFetchedItems.length <= 1 ||
                checkedFetchedItems.filter((item) => item.value === true).length <= 1
              }
              label="Restart selected devices"
            ></Button>
          </Flex>
        </Flex>
        <ChakraAccordion
          allowMultiple
          as={Flex}
          flexDir={"column"}
          borderWidth={"1px"}
          borderColor={"greyscale.200"}
          borderRadius={"1rem"}
          // p={"1rem"}
          backgroundColor={theme.colors.greyscale[0]}
          index={activeIndex}
          onChange={setActiveIndex}
        >
          <Flex
            backgroundColor={theme.colors.greyscale[100]}
            justify={"space-between"}
            p={"1rem"}
            borderTopRadius={"1rem"}
          >
            <Text
              fontWeight={500}
              color={theme.colors.greyscale[500]}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"12px"}
              textAlign={"center"}
              p={0}
              as={Flex}
              flex={10}
            >
              Hostname
            </Text>
            <Text
              fontWeight={500}
              color={theme.colors.greyscale[500]}
              fontFamily={"heading"}
              textTransform={"capitalize"}
              fontSize={"12px"}
              textAlign={"center"}
              p={0}
              as={Flex}
              flex={2}
            >
              Status
            </Text>
          </Flex>
          {devices?.map((device) => (
            <ChakraAccordionItem
              key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
              // backgroundColor={"greyscale.0"}
              p={"0.5rem 1rem"}
            >
              <AccordionItem
                key={device.mac}
                device={device}
                presets={presets}
                setAlert={setAlert}
                alert={alert}
                onOpenAlert={onOpenAlert}
                handleCheckboxChange={handleCheckboxChange}
                checkedItems={checkedFetchedItems}
              />
            </ChakraAccordionItem>
          ))}
        </ChakraAccordion>
      </Flex>
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
          <ModalHeader>Restart the selected devices?</ModalHeader>
          <Box pos={"absolute"} top={"1rem"} right={"1rem"} cursor={"pointer"}>
            <CloseIcon color={"greyscale.900"} onClick={onCloseModal} />
          </Box>
          <ModalBody>
            <Text>
              Keep in mind that restarting devices may result in the loss of an entire block of
              transactions.
            </Text>
          </ModalBody>
          <ModalFooter gap={"1.5rem"}>
            <Button variant="secondary" onClick={onCloseModal} label="Cancel"></Button>
            <Button
              type="submit"
              variant="primaryPurple"
              onClick={handleRestartSelected}
              label="Restart"
            ></Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <SelectPresetModal
        isOpen={isSelectPoolPresetOpen}
        onClose={() => setIsSelectPoolPresetModalOpen(false)}
        devices={
          (devices &&
            devices.filter((device) =>
              checkedFetchedItems.some((item) => item.mac === device.mac && item.value === true)
            )) ||
          []
        }
        presets={presets}
        onCloseSuccessfully={handleCloseSuccessfully}
      />
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({
  device: deviceInfo,
  presets,
  setAlert,
  onOpenAlert,
  handleCheckboxChange,
  checkedItems,
}) => {
  const { isOpen: isAccordionOpen } = useAccordionItemState(); // Hook per sapere se l'accordion è aperto o chiuso
  const [device, setDevice] = useState<Device>({
    ...deviceInfo,
    info: deviceInfo.info,
  });
  const [deviceError, setDeviceError] = useState<any>({
    hostname: "",
    stratumURL: "",
    stratumPort: "",
    stratumUser: "",
    workerName: "",
    fanspeed: "",
  });

  const [isSaveAndRestartModalOpen, setIsSaveAndRestartModalOpen] = useState(false);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<Preset | undefined>(
    (presets.length > 0 && presets.find((d) => d.uuid === deviceInfo?.presetUuid)) ||
      presets[0] ||
      undefined
  );
  const [isPresetRadioButtonSelected, setIsPresetRadioButtonSelected] = useState<boolean>(
    deviceInfo?.presetUuid ? true : false
  );
  const [stratumUser, setStratumUser] = useState<StratumUser>({
    workerName: "",
    stratumUser: "",
  });

  const theme = useTheme();
  const { isConnected, socket } = useSocket();

  const parseString = (input: string) => {
    const dotIndex = input.indexOf(".");

    setStratumUser({
      workerName: dotIndex === -1 ? device.info.hostname : input.substring(dotIndex + 1),
      stratumUser: dotIndex === -1 ? input : input.substring(0, dotIndex),
    });
  };

  useEffect(() => {
    if (presets && isAccordionOpen && isPresetRadioButtonSelected && !selectedPreset) {
      setSelectedPreset(presets[0]);
    }

    if (device) {
      parseString(device.info.stratumUser);
    }
  }, [isAccordionOpen, presets, isPresetRadioButtonSelected, selectedPreset]);

  const handleSaveOrSaveAndRestartDeviceSettings = useCallback(
    async (shouldRestart: boolean) => {
      try {
        const deviceToUpdate = selectedPreset
          ? {
              ...device,
              info: {
                ...device.info,
                stratumUser: `${selectedPreset.configuration.stratumUser}.${stratumUser.workerName}`,
              },
            }
          : device;

        const {
          data: { data: updatedDestDevice },
        } = await axios.patch<{ message: string; data: Device }>(
          `/api/devices/${deviceToUpdate.mac}/system`,
          deviceToUpdate
        );
        const {
          data: { data: updatedDevice },
        } = await axios.patch<{ message: string; data: Device }>(
          `/api/devices/imprint/${device.mac}`,
          {
            device: updatedDestDevice,
          }
        );

        if (updatedDevice) {
          setDevice(updatedDevice);

          setAlert({
            status: AlertStatus.SUCCESS,
            title: "Save Successful",
            message: `The settings for device ${device.mac} have been successfully saved.`,
          });
          onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo

          // Se il salvataggio è andato a buon fine e serve il restart, esegui subito il restart
          if (shouldRestart) {
            handleRestartDevice(true);
          }
        }
      } catch (error) {
        let errorMessage = "An error occurred while saving the device settings.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Save Failed",
          message: `${errorMessage} Please try again.`,
        });
        onOpenAlert(); // Aprire l'alert per mostrare il messaggio di errore
      }
    },
    [device, setAlert, onOpenAlert]
  );

  const validateFieldByName = useCallback((name: string, value: string) => {
    switch (name) {
      case "stratumURL":
        return validateDomain(value, { allowIP: true });
      case "stratumPort":
        const numericRegex = /^\d+$/;
        return validateTCPPort(numericRegex.test(value) ? Number(value) : -1);
      case "stratumUser":
        // return validateBitcoinAddress(value);
        return !value.includes(".");
      case "fanspeed":
        return validatePercentage(value);
      default:
        return true;
    }
  }, []);

  const validatePercentage = (value: string) => {
    return parseInt(value) <= 100 && parseInt(value) >= 0;
  };

  const validateField = useCallback(
    (name: string, value: string) => {
      const label =
        value === ""
          ? `${name} is required.`
          : validateFieldByName(name, value)
          ? ""
          : `${name} is not correct.`;

      setDeviceError((prevDevice: any) => ({
        ...prevDevice,
        [name]: label,
      }));
    },
    [validateFieldByName]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      validateField(name, value);

      const isCheckbox = type === "checkbox";

      const updatedDevice = {
        ...device,
        info: {
          ...device.info,
          [name]: isCheckbox
            ? (e.target as HTMLInputElement).checked
              ? 1
              : 0
            : name === "stratumPort"
            ? value.replace(/\D/g, "") // Mantieni solo numeri nell'input
            : ["wifiPass", "stratumPassword"].includes(name)
            ? value
            : parseInt(value) || value,
        },
      };

      setDevice(updatedDevice);
    },
    [device, validateField]
  );

  const handleChangeOnStratumUser = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      validateField(name, value);

      setStratumUser({ ...stratumUser, [name]: value });

      const updatedDevice = {
        ...device,
        info: {
          ...device.info,
          [name]: name === "workerName" ? value : `${value}.${stratumUser.workerName}`,
        },
      };

      setDevice(updatedDevice);
    },
    [device, stratumUser]
  );

  const handleRadioButtonChange = useCallback(
    (value: string) => {
      setIsPresetRadioButtonSelected(value === RadioButtonStatus.PRESET ? true : false);

      if (value === RadioButtonStatus.CUSTOM && device.presetUuid) {
        const updatedDevice = {
          ...device,
          presetUuid: null,
        };

        setDevice(updatedDevice);
      } else if (value === RadioButtonStatus.PRESET && selectedPreset) {
        const updatedDevice = {
          ...device,
          presetUuid: selectedPreset?.uuid || presets[0].uuid,
          info: {
            ...device.info,
            stratumUser: `${selectedPreset.configuration.stratumUser}.${stratumUser.workerName}`,
          },
        };

        setDevice(updatedDevice);
      }
    },
    [selectedPreset, device, presets]
  );

  const handleRestartDevice = useCallback(
    async (hasSaveBeenPerformedAlso: boolean) => {
      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        await handleRestart(device.mac);

        setAlert({
          status: AlertStatus.SUCCESS,
          title: `${hasSaveBeenPerformedAlso ? "Save and " : ""}Restart went successfully`,
          message: `The device has been ${
            hasSaveBeenPerformedAlso ? "saved and " : ""
          }restarted successfully. ${
            hasSaveBeenPerformedAlso
              ? "The new settings have been applied, and the miner is back online."
              : ""
          }`,
        });

        onOpenAlert();
      } catch (error) {
        let errorMessage = "An error occurred while attempting to restart the device.";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        }

        setAlert({
          status: AlertStatus.ERROR,
          title: "Restart Failed",
          message: `${errorMessage} Please try again or contact support if the issue persists.`,
        });
        onOpenAlert();
        setIsRestartModalOpen(false);
      }
    },
    [device.mac, onOpenAlert, setAlert]
  );

  const handleChangeOnSelectPreset = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const preset = presets.find((p) => p.uuid === e.target.value);
      if (preset) {
        setSelectedPreset(preset);

        const updatedDevice = {
          ...device,
          presetUuid: preset?.uuid || null,
          info: {
            ...device.info,
            stratumUser: `${preset.configuration.stratumUser}.${stratumUser.workerName}`,
          },
        };

        setDevice(updatedDevice);
      }
    },
    [presets]
  );

  useEffect(() => {
    const listener = (e: Device) => {
      setDevice((prevDevice) => {
        if (!prevDevice || prevDevice.mac !== e.mac) return prevDevice;

        // Solo aggiorna i dati se l'accordion è aperto
        if (isAccordionOpen) {
          return { ...prevDevice, tracing: e.tracing }; // Esegui solo l'aggiornamento della proprietà di interesse
        }
        return e;
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
  }, [isAccordionOpen, isConnected, socket]);

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
        if (hasErrorFields(obj[key])) {
          return true; // Ricorsione per oggetti annidati
        }
      } else if (obj[key] !== "") {
        if (key === "fanspeed" && !(device.info.autofanspeed === 0)) {
          return false;
        }
        return true;
      }
    }
    return false;
  };

  const isPresetValid = useCallback(() => {
    return hasEmptyFields(device) || hasErrorFields(deviceError);
  }, [device, deviceError]);

  const handleSaveAndRestartModalClose = useCallback(async (value: string) => {
    // Funzione di callback per gestire il valore restituito dalla modale
    if (value !== "") {
      const shouldRestart = value === RadioButtonValues.SAVE_AND_RESTART ? true : false;
      await handleSaveOrSaveAndRestartDeviceSettings(shouldRestart);
    }
    setIsSaveAndRestartModalOpen(false);
  }, []);

  const handleRestartModalClose = useCallback(async (value: boolean) => {
    // Funzione di callback per gestire il valore restituito dalla modale
    if (value) {
      handleRestartDevice(false);
    }
    setIsRestartModalOpen(false);
  }, []);

  const handleRestartOpenModal = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRestartModalOpen(true);
  };
  return (
    <>
      <AccordionButton p={0} justifyContent={"space-between"} _hover={{ backgroundColor: "none" }}>
        <Flex gap={"1rem"} alignItems={"center"} justify={"space-between"} w={"100%"}>
          <Flex alignItems={"center"} gap={"0.25rem"} flex={10}>
            <Flex alignItems={"center"} gap={"0.5rem"} fontFamily={"heading"}>
              <Checkbox
                id={device.mac}
                name={device.mac}
                isChecked={checkedItems.find((d) => d.mac === device.mac)?.value}
                onChange={(e) => handleCheckboxChange(device.mac, e.target.checked)}
              ></Checkbox>
              <AccordionIcon />
            </Flex>
            <Text fontSize={"md"} fontWeight={400} textTransform={"capitalize"}>
              {device.info.hostname}
            </Text>
            {" - "}
            <Link
              href={`http://${device.ip}`}
              isExternal={true}
              label={device.ip}
              fontSize={"md"}
              fontWeight={400}
              textDecoration="underline"
              isDisabled={device.tracing ? false : true}
            />
          </Flex>
          <Flex alignItems={"center"} gap={"1rem"} flex={2}>
            <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
            <Flex alignItems={"center"}>
              <Flex
                onClick={handleRestartOpenModal}
                alignItems={"center"}
                gap={"0.5rem"}
                cursor="pointer"
                background="none"
                color={theme.colors.greyscale[900]}
                fontSize={"13px"}
                lineHeight="1.5rem"
                fontWeight={400}
                fontFamily={theme.fonts.heading}
                padding={"0.5rem 1rem"}
                borderRadius="6px"
                _hover={{ backgroundColor: "#5C009940" }}
                _focus={{
                  bg: "#5C009966",
                }}
                _disabled={{
                  opacity: 0.3,
                }}
              >
                <RestartIcon color={theme.colors.greyscale[900]} />
                Restart
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </AccordionButton>
      <AccordionPanel p={0} pb={4} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider mb={"1rem"} mt={"1rem"} borderColor={theme.colors.greyscale[200]} />
        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"100%"}>
          <Text fontWeight={"bold"} textTransform={"uppercase"}>
            General
          </Text>
          <SimpleGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }} spacing={"1rem"}>
            <Input
              label="Hostname"
              name="hostname"
              id={`${device.mac}-hostname`}
              placeholder="hostname"
              defaultValue={device.info.hostname}
              onChange={handleChange}
              error={deviceError.hostname}
            />
            <Input
              label="Worker Name"
              name="workerName"
              id={`${device.mac}-workerName`}
              placeholder="worker name"
              defaultValue={stratumUser.workerName}
              onChange={handleChangeOnStratumUser}
              error={deviceError.workerName}
            />
          </SimpleGrid>
        </Flex>

        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"100%"}>
          <Text fontWeight={"bold"} textTransform={"uppercase"}>
            Hardware settings
          </Text>
          <Flex flexDir={{ mobile: "column", tablet: "column", desktop: "row" }} gap={"1rem"}>
            <Flex flex={2} flexDir={{ mobile: "column", tablet: "row" }} gap={"1rem"}>
              <Select
                id={`${device.mac}-frequency`}
                label="Frequency"
                name="frequency"
                onChange={handleChange}
                value={device.info.frequency}
                optionValues={[
                  { value: 400, label: "400" },
                  { value: 425, label: "425" },
                  { value: 450, label: "450" },
                  { value: 475, label: "475" },
                  { value: 490, label: "490 (default)" },
                  { value: 500, label: "500" },
                  { value: 525, label: "525" },
                  { value: 550, label: "550" },
                  { value: 575, label: "575" },
                ]}
              />
              <Select
                id={`${device.mac}-coreVoltage`}
                label="Core Voltage"
                name="coreVoltage"
                onChange={handleChange}
                value={device.info.coreVoltage}
                optionValues={[
                  { value: 1100, label: "1100" },
                  { value: 1150, label: "1150" },
                  { value: 1166, label: "1166 (default)" },
                  { value: 1200, label: "1200" },
                  { value: 1250, label: "1250" },
                  { value: 1300, label: "1300" },
                ]}
              />
            </Flex>

            <Flex flex={3} flexDirection={"column"} justify={"space-between"} gap={"0.25rem"}>
              <Text fontWeight={400} fontSize={"13px"}>
                Advanced Hardware Settings
              </Text>
              <Flex
                gap={"0.5rem"}
                justify={"flex-start"}
                alignItems={"center"}
                flexDir={{ mobile: "column", tablet: "row", desktop: "row" }}
              >
                <Checkbox
                  id={`${device.mac}-flipscreen`}
                  name="flipscreen"
                  label="Flip Screen"
                  defaultChecked={device.info.flipscreen === 1}
                  onChange={handleChange}
                />
                <Checkbox
                  id={`${device.mac}-invertfanpolarity`}
                  name="invertfanpolarity"
                  label="Invert Fan Polarity"
                  defaultChecked={device.info.invertfanpolarity === 1}
                  onChange={handleChange}
                />
                <Checkbox
                  id={`${device.mac}-autofanspeed`}
                  name="autofanspeed"
                  label="Automatic Fan Control"
                  defaultChecked={device.info.autofanspeed === 1}
                  onChange={handleChange}
                />
                <Box w={"100%"}>
                  <Input
                    name="fanspeed"
                    id={`${device.mac}-fanspeed`}
                    placeholder=""
                    type="number"
                    defaultValue={device.info.fanspeed || 0}
                    onChange={handleChange}
                    isDisabled={device.info.autofanspeed === 1}
                    rightAddon={"%"}
                    error={deviceError.fanspeed}
                  />
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"full"}>
          <Text fontWeight={"bold"} textTransform={"uppercase"}>
            Pool settings
          </Text>
          <RadioGroup
            defaultValue={isPresetRadioButtonSelected ? "preset" : "custom"}
            onChange={(value) => handleRadioButtonChange(value)}
          >
            <Stack spacing={"1rem"} direction="row">
              <RadioButton
                id={`${device.mac}-${RadioButtonStatus.PRESET}`}
                value={RadioButtonStatus.PRESET}
                label="Preset"
                disabled={presets.length == 0}
              ></RadioButton>
              <RadioButton
                id={`${device.mac}-${RadioButtonStatus.CUSTOM}`}
                value={RadioButtonStatus.CUSTOM}
                label="Custom"
              ></RadioButton>
            </Stack>
          </RadioGroup>
          {isPresetRadioButtonSelected ? (
            <Flex flexDir={"column"} gap={"1rem"}>
              <Select
                id={`${device.mac}-preset`}
                label="Select preset"
                name="preset"
                onChange={(val) => handleChangeOnSelectPreset(val)}
                value={device?.presetUuid || undefined}
                optionValues={presets.map((preset) => ({ value: preset.uuid, label: preset.name }))}
              />
              {selectedPreset && (
                <Flex gap={"1rem"} flexDir={{ base: "column", tablet: "row" }}>
                  <Flex flex={1}>
                    <Input
                      isDisabled={true}
                      type="text"
                      label="Stratum URL"
                      name="stratumURL"
                      id={`${selectedPreset.uuid}-stratumUrl`}
                      defaultValue={selectedPreset.configuration.stratumURL}
                    />
                  </Flex>
                  <Flex flex={1}>
                    <Input
                      isDisabled={true}
                      type="number"
                      label="Stratum Port"
                      name="stratumPort"
                      id={`${selectedPreset.uuid}-stratumPort`}
                      defaultValue={selectedPreset.configuration.stratumPort}
                    />
                  </Flex>
                  <Flex flex={2}>
                    <Input
                      isDisabled={true}
                      type="text"
                      label="Stratum User"
                      name="stratumUser"
                      id={`${selectedPreset.uuid}-stratumUser`}
                      defaultValue={selectedPreset.configuration.stratumUser}
                      rightAddon={`.${stratumUser.workerName}`}
                    />
                  </Flex>
                </Flex>
              )}
            </Flex>
          ) : (
            <Grid
              templateColumns={{
                mobile: "repeat(1, 1fr)",
                tablet: "repeat(2, 1fr)",
                desktop: "repeat(2, 1fr) 2fr repeat(1, 1fr)",
              }}
              gap={"1rem"}
            >
              <Flex flex={1}>
                <Input
                  type="text"
                  label="Stratum URL"
                  name="stratumURL"
                  id={`${device.mac}-stratumUrl`}
                  placeholder="Add your stratum URL"
                  defaultValue={device.info.stratumURL}
                  onChange={handleChange}
                  error={deviceError.stratumURL}
                />
              </Flex>
              <Flex flex={1}>
                <Input
                  type="number"
                  label="Stratum Port"
                  name="stratumPort"
                  id={`${device.mac}-stratumPort`}
                  placeholder="Add your stratum port"
                  defaultValue={device.info.stratumPort}
                  onChange={handleChange}
                  error={deviceError.stratumPort}
                />
              </Flex>
              <Flex flex={2}>
                <Input
                  type="text"
                  label="Stratum User"
                  name="stratumUser"
                  id={`${device.mac}-stratumUser`}
                  placeholder="Add your stratum user"
                  defaultValue={stratumUser.stratumUser}
                  onChange={handleChangeOnStratumUser}
                  rightAddon={`.${stratumUser.workerName}`}
                  error={deviceError.stratumUser}
                />
              </Flex>
              <Flex flex={1}>
                <Input
                  type="password"
                  label="Stratum Password"
                  name="stratumPassword"
                  id={`${device.mac}-stratumPassword`}
                  placeholder="Add your stratum password"
                  defaultValue={device.info.stratumPassword}
                  error={deviceError.stratumPassword}
                  onChange={handleChange}
                />
              </Flex>
            </Grid>
          )}
        </Flex>
        <Flex justifyContent={"flex-start"}>
          <Button
            variant="primaryPurple"
            rightIcon={<ArrowIcon color="#fff" />}
            onClick={() => setIsSaveAndRestartModalOpen(true)}
            disabled={isPresetValid()}
            label="Save"
          ></Button>
        </Flex>
      </AccordionPanel>
      <RestartModal isOpen={isRestartModalOpen} onClose={handleRestartModalClose} />
      <SaveAndRestartModal
        isOpen={isSaveAndRestartModalOpen}
        onClose={handleSaveAndRestartModalClose}
      />
    </>
  );
};
