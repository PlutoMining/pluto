import { useSocket } from "@/providers/SocketProvider";
import {
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Accordion as ChakraAccordion,
  AccordionItem as ChakraAccordionItem,
  Divider,
  Flex,
  Heading,
  Link,
  Text,
  useTheme,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import { useEffect, useState } from "react";
import { DeviceStatusBadge } from "../Badge";
import { getMinerName } from "@/utils/minerMap";

interface DeviceAccordionProps {
  devices: Device[] | undefined;
  removeFunction: (deviceId: string) => void;
}

interface AccordionItemProps {
  device: Device;
  removeFunction: (deviceId: string) => void;
}

export const DeviceAccordion: React.FC<DeviceAccordionProps> = ({
  devices: deviceList,
  removeFunction,
}) => {
  const [devices, setDevices] = useState<Device[]>(deviceList || []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setDevices((prevDevices) => {
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
  }, [isConnected, socket, devices]);

  return (
    <>
      {devices && devices.length > 0 ? (
        <ChakraAccordion
          allowMultiple
          as={Flex}
          flexDir={"column"}
          backgroundColor={"greyscale.0"}
          //   borderWidth={"1px"}
          borderColor={"greyscale.200"}
          borderRadius={"1rem"}
        >
          {devices?.map((device, index) => (
            <ChakraAccordionItem
              key={`device-settings-${device.mac}`} // Prefisso specifico per ogni device
              borderTopWidth={index > 0 ? "1px" : "0"}
              borderBottomWidth={"0!important"}
              padding={"1rem"}
            >
              <AccordionItem key={device.mac} device={device} removeFunction={removeFunction} />
            </ChakraAccordionItem>
          ))}
        </ChakraAccordion>
      ) : (
        <Text textAlign={"center"}>No device found</Text>
      )}
    </>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ device, removeFunction }) => {
  const theme = useTheme();

  const formatTime = (seconds: number) => {
    const oneDayInSeconds = 86400;
    const oneHourInSeconds = 3600;
    const oneMinuteInSeconds = 60;

    if (seconds === 0) {
      return "-";
    } else if (seconds >= oneDayInSeconds) {
      const days = Math.floor(seconds / oneDayInSeconds);
      return `${days} d`;
    } else if (seconds >= oneHourInSeconds) {
      const hours = Math.floor(seconds / oneHourInSeconds);
      return `${hours} h`;
    } else if (seconds >= oneMinuteInSeconds) {
      const minutes = Math.floor(seconds / oneMinuteInSeconds);
      return `${minutes} min`;
    } else {
      return "< 1 min"; // Se il tempo è inferiore a un minuto, mostra "meno di 1 minuto"
    }
  };

  return (
    <>
      <AccordionButton p={0} justifyContent={"space-between"} _hover={{ backgroundColor: "none" }}>
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
          <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
        </Flex>

        {/* Pass the device ID to the removeRegisteredDevice function */}
        <Link
          fontFamily={"heading"}
          fontWeight={500}
          textDecoration={"underline"}
          fontSize={"14px"}
          onClick={() => removeFunction(device.mac)}
        >
          Remove
        </Link>
      </AccordionButton>
      <AccordionPanel p={0} pb={4} as={Flex} flexDir={"column"} alignItems={"flex-start"}>
        <Divider mb={"1rem"} mt={"1rem"} borderColor={theme.colors.greyscale[200]} />

        <Flex flexDirection={"column"} gap={"0.5rem"} w={"100%"}>
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Data added
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {new Date(device.createdAt!).toLocaleDateString()}
            </Text>
          </Flex>
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
          <Flex justify={"space-between"}>
            <Text
              fontWeight={500}
              textTransform={"capitalize"}
              fontSize={"sm"}
              fontFamily={"heading"}
            >
              Uptime
            </Text>
            <Text fontWeight={400} fontSize={"sm"} fontFamily={"body"}>
              {formatTime(device.info.uptimeSeconds)}
            </Text>
          </Flex>
        </Flex>
      </AccordionPanel>
    </>
  );
};
