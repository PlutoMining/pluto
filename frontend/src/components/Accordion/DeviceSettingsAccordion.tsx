import { useSocket } from "@/providers/SocketProvider";
import {
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  Button as ChakraButton,
  Divider,
  Flex,
  FormControl,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  RadioGroup,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useAccordionItemState,
  useTheme,
} from "@chakra-ui/react";
import { Device, Preset } from "@pluto/interfaces";
import { validateBitcoinAddress, validateDomain, validateTCPPort } from "@pluto/utils";
import axios from "axios";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertInterface, AlertStatus } from "../Alert/interfaces";
import { Badge, DeviceStatusBadge } from "../Badge";
import Button from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { ArrowIcon } from "../icons/ArrowIcon";
import { RestartIcon } from "../icons/RestartIcon";
import { Input } from "../Input/Input";
import { RadioButton } from "../RadioButton";
import { Select } from "../Select/Select";

interface DeviceSettingsAccordionProps {
  devices: Device[] | undefined;
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
  alert,
  setAlert,
  onOpenAlert,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);

  // Recupera i preset tramite le API
  const fetchPresets = async () => {
    try {
      const response = await fetch("/api/presets");
      if (response.ok) {
        const data: { data: Preset[] } = await response.json();
        setPresets(data.data);
      } else {
        console.error("Failed to fetch presets");
      }
    } catch (error) {
      console.error("Error fetching presets", error);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  return (
    <ChakraAccordion allowMultiple as={Flex} flexDir={"column"} gap={"1rem"}>
      {devices?.map((device) => (
        <ChakraAccordionItem
          key={`device-settings-${device.ip}`} // Prefisso specifico per ogni device
          backgroundColor={"greyscale.0"}
          borderWidth={"1px"}
          borderColor={"greyscale.200"}
          borderRadius={"1rem"}
          p={"1rem"}
        >
          <AccordionItem
            key={device.mac}
            device={device}
            presets={presets}
            setAlert={setAlert}
            alert={alert}
            onOpenAlert={onOpenAlert}
          />
        </ChakraAccordionItem>
      ))}
    </ChakraAccordion>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({
  device: deviceInfo,
  presets,
  setAlert,
  onOpenAlert,
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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRestartLoading, setIsRestartLoading] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<Preset>(
    (presets.length > 0 && presets.find((d) => d.uuid === deviceInfo?.presetUuid)) || presets[0]
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

  const handleSaveDeviceSettings = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      try {
        setIsSaving(true);
        const deviceToUpdate = {
          ...device,
          info: {
            ...device.info,
            stratumUser: `${selectedPreset.configuration.stratumUser}.${stratumUser.workerName}`,
          },
        };

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

        setDevice(updatedDevice);

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Save Successful",
          message: `The settings for device ${device.mac} have been successfully saved.`,
        });
        onOpenAlert(); // Aprire l'alert per mostrare il messaggio di successo

        // Dopo il salvataggio, mostra la modale di conferma restart
        setIsRestartModalOpen(true);
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
      } finally {
        setIsSaving(false);
      }
    },
    [device, setAlert, onOpenAlert]
  );

  const validateFieldByName = (name: string, value: string) => {
    switch (name) {
      case "stratumURL":
        return validateDomain(value, { allowIP: true });
      case "stratumPort":
        const numericRegex = /^\d+$/;
        return validateTCPPort(numericRegex.test(value) ? parseInt(value) : -1);
      case "stratumUser":
        // return validateBitcoinAddress(value);
        return !value.includes(".");
      default:
        return true;
    }
  };

  const validateField = (name: string, value: string) => {
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
  };

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
    [device]
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
      } else if (value === RadioButtonStatus.PRESET) {
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
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();

      setIsRestartLoading(true);

      const handleRestart = (mac: string) => axios.post(`/api/devices/${mac}/system/restart`);

      try {
        await handleRestart(device.mac);

        setAlert({
          status: AlertStatus.SUCCESS,
          title: "Restart Successful",
          message:
            "The device has been restarted successfully. The eventual new settings have been applied, and the miner is back online.",
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
      } finally {
        setIsRestartLoading(false);
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
          // console.log("device partially updated: ", device);
          return { ...prevDevice, tracing: e.tracing }; // Esegui solo l'aggiornamento della proprietà di interesse
        }
        // console.log("device updated: ", device);
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
        if (hasErrorFields(obj[key])) return true; // Ricorsione per oggetti annidati
      } else if (obj[key] !== "") {
        return true;
      }
    }
    return false;
  };

  const isPresetValid = useCallback(() => {
    return hasEmptyFields(device) || hasErrorFields(deviceError);
  }, [device, deviceError]);

  return (
    <>
      <AccordionButton p={0} justifyContent={"space-between"} _hover={{ backgroundColor: "none" }}>
        <Flex gap={"1rem"} alignItems={"center"}>
          <Heading fontSize={"md"} fontWeight={"bold"}>
            {device.ip}
          </Heading>
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
        </Flex>
        <Flex alignItems={"center"} gap={"0.5rem"} fontFamily={"heading"}>
          {isAccordionOpen ? "Collapse" : "View more"}
          <AccordionIcon />
        </Flex>
      </AccordionButton>
      <AccordionPanel p={0} pb={4} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"100%"}>
          <Text fontWeight={"bold"} textTransform={"uppercase"}>
            General
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 2 }} spacing={8}>
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

          <Flex gap={"1rem"}>
            <Flex flex={1}>
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
            </Flex>
            <Flex flex={1}>
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
            <Flex flex={3} flexDirection={"column"} justify={"space-between"}>
              <Text fontWeight={400} fontSize={"13px"}>
                Advanced Hardware Settings
              </Text>
              <Flex gap={"1rem"} justify={"flex-start"}>
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
              </Flex>
            </Flex>
          </Flex>

          {device.info.autofanspeed === 0 && (
            <FormControl padding={"1rem 0"} w={"100%"} px="1rem">
              <Slider
                id={`${device.mac}-fanspeed`}
                name="fanspeed"
                onChange={(val: number) =>
                  handleChange({ target: { name: "fanspeed", value: val.toString() } } as any)
                }
                defaultValue={device.info.fanspeed}
              >
                <SliderMark
                  value={0}
                  pt={"0.5rem"}
                  transform="translateX(-50%)"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  0%
                </SliderMark>
                <SliderMark
                  value={25}
                  pt={"0.5rem"}
                  transform="translateX(-50%)"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  25%
                </SliderMark>
                <SliderMark
                  value={50}
                  pt={"0.5rem"}
                  transform="translateX(-50%)"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  50%
                </SliderMark>
                <SliderMark
                  value={75}
                  pt={"0.5rem"}
                  transform="translateX(-50%)"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  75%
                </SliderMark>
                <SliderMark
                  value={100}
                  pt={"0.5rem"}
                  transform="translateX(-50%)"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  100%
                </SliderMark>
                <SliderTrack bg={theme.colors.greyscale[200]}>
                  <SliderFilledTrack bg={theme.colors.brand.secondary} />
                </SliderTrack>
                <SliderThumb
                  bg={theme.colors.brand.secondary}
                  _hover={{ bg: theme.colors.brand.secondaryDark }}
                />
              </Slider>
            </FormControl>
          )}
        </Flex>

        <Flex flexDirection={"column"} gap={"1rem"} p={"1rem 0"} w={"full"}>
          <Text fontWeight={"bold"} textTransform={"uppercase"}>
            Pool settings
          </Text>
          <RadioGroup
            defaultValue={isPresetRadioButtonSelected ? "preset" : "custom"}
            onChange={(value) => handleRadioButtonChange(value)}
          >
            <Stack spacing={8} direction="row">
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
                <Flex gap={"1rem"}>
                  <Flex flex={1}>
                    <Input
                      disabled={true}
                      type="text"
                      label="Stratum URL"
                      name="stratumURL"
                      id={`${selectedPreset.uuid}-stratumUrl`}
                      defaultValue={selectedPreset.configuration.stratumURL}
                    />
                  </Flex>
                  <Flex flex={1}>
                    <Input
                      disabled={true}
                      type="number"
                      label="Stratum Port"
                      name="stratumPort"
                      id={`${selectedPreset.uuid}-stratumPort`}
                      defaultValue={selectedPreset.configuration.stratumPort}
                    />
                  </Flex>
                  <Flex flex={2}>
                    <Input
                      disabled={true}
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
            <Flex gap={"1rem"}>
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
            </Flex>
          )}
        </Flex>
        <Flex justifyContent={"flex-start"}>
          <Button
            variant="primaryPurple"
            rightIcon={<ArrowIcon color="#fff" />}
            onClick={(e) => {
              setIsRestartModalOpen(false);
              setIsSaveModalOpen(true);
            }}
            disabled={isPresetValid()}
          >
            Save
          </Button>
        </Flex>
      </AccordionPanel>
      <Divider mb={"1rem"} mt={"1rem"} borderColor={theme.colors.greyscale[200]} />
      <Flex alignItems={"center"}>
        <Button
          variant="text"
          icon={<RestartIcon color={theme.colors.greyscale[500]} />}
          onClick={(e) => {
            setIsSaveModalOpen(false);
            setIsRestartModalOpen(true);
          }}
        >
          Restart
        </Button>
      </Flex>
      {/* Save Confirmation Modal */}
      <Modal
        isCentered
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
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
          <ModalHeader>Confirm Save</ModalHeader>
          <ModalBody>
            <Text>Do you want to save the new settings for device {device.mac}?</Text>
          </ModalBody>
          <ModalFooter gap={"1.5rem"}>
            <ChakraButton variant="secondary" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </ChakraButton>
            <ChakraButton
              variant="primaryPurple"
              onClick={(e) => {
                setIsSaveModalOpen(false); // Chiudi la modale di salvataggio
                handleSaveDeviceSettings(e); // Esegui il salvataggio
              }}
            >
              Save
            </ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Restart Confirmation Modal */}
      <Modal
        isCentered
        isOpen={isRestartModalOpen}
        onClose={() => setIsRestartModalOpen(false)}
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
          <ModalHeader>Confirm Restart</ModalHeader>
          <ModalBody>
            <Text>
              The new settings have been saved. Do you want to restart device {device.mac} to apply
              the changes?
            </Text>
          </ModalBody>
          <ModalFooter gap={"1.5rem"}>
            <ChakraButton variant="secondary" onClick={() => setIsRestartModalOpen(false)}>
              No
            </ChakraButton>
            <ChakraButton
              variant="primaryPurple"
              onClick={(e) => {
                setIsRestartModalOpen(false); // Chiudi la modale di restart
                handleRestartDevice(e); // Esegui il restart
              }}
              isLoading={isRestartLoading}
            >
              Restart
            </ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
