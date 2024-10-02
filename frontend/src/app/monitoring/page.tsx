"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useTheme,
  VStack,
  Link,
  Container,
} from "@chakra-ui/react";
import axios from "axios";
import { Dashboard, Device } from "@pluto/interfaces";
import { useSocket } from "@/providers/SocketProvider";
import { DeviceStatusBadge } from "@/components/Badge";

const MonitoringTablePage: React.FC = () => {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);

  const theme = useTheme();

  useEffect(() => {
    fetchDevicesAndDashboardsAndUpdate();
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

  const fetchDevicesAndDashboardsAndUpdate = async () => {
    try {
      const deviceResponse = await axios.get<{ data: Device[] }>("/api/devices/imprint");
      let fetchedDevices = deviceResponse.data.data;

      const dashboardResponse = await axios.get<Dashboard[]>("/api/dashboards");
      const fetchedDashboards = dashboardResponse.data;

      const updatedDevices = fetchedDevices.map<Device & { publicDashboardUrl?: string }>(
        (device, index) => ({
          ...device,
          publicDashboardUrl: fetchedDashboards[index % fetchedDashboards.length]?.publicUrl,
        })
      );

      // console.log(updatedDevices);

      setRegisteredDevices(updatedDevices || []);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
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
    <Container flex="1" maxW="container.2xl" h={"100%"}>
      <VStack p={8} spacing={4} align="stretch">
        <Heading>Dashboards</Heading>
        {registeredDevices ? (
          <Box
            backgroundColor={theme.colors.greyscale[0]}
            borderRadius={"1rem"}
            p={"1rem"}
            borderWidth={"1px"}
            borderColor={theme.colors.greyscale[200]}
          >
            <TableContainer
              borderRadius={"1rem"}
              borderWidth={"1px"}
              borderColor={theme.colors.greyscale[200]}
            >
              <Table variant="simple">
                <Thead backgroundColor={theme.colors.greyscale[100]}>
                  <Tr>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Name
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Hashrate
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Shares
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Power
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Temp
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
                        color={theme.colors.greyscale[500]}
                        fontFamily={"heading"}
                        textTransform={"capitalize"}
                        fontSize={"12px"}
                      >
                        Best difficulty
                      </Text>
                    </Th>
                    <Th borderColor={theme.colors.greyscale[100]}>
                      <Text
                        pl={"0.5rem"}
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
                        pl={"0.5rem"}
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
                  {registeredDevices.map((device) => (
                    <Tr key={device.mac}>
                      <Td borderColor={theme.colors.greyscale[100]}>{device.info.hostname}</Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        {device.info.hashRate.toFixed(2)} GH/s
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        {device.info.sharesAccepted}|
                        <Text as={"label"} color={theme.colors.brand.secondary}>
                          {device.info.sharesRejected}
                        </Text>
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        {device.info.power.toFixed(2)} W
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]}>{device.info.temp} °C</Td>
                      <Td borderColor={theme.colors.greyscale[100]}>{device.info.bestDiff}</Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        {formatTime(device.info.uptimeSeconds)}
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]}>
                        <Link
                          href={`monitoring/${device.info.hostname}`}
                          fontWeight={500}
                          textDecoration={"underline"}
                          opacity={!device?.publicDashboardUrl ? "0.3" : "1"}
                          pointerEvents={!device?.publicDashboardUrl ? "none" : "auto"}
                        >
                          {device.info.hostname}
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Text>No dashboards available.</Text>
        )}
      </VStack>
    </Container>
  );
};

export default MonitoringTablePage;
