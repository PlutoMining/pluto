"use client";
import { ChangeEvent, useEffect, useState } from "react";
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
  Container,
  Flex,
  Accordion as ChakraAccordion,
  Tooltip,
} from "@chakra-ui/react";
import axios from "axios";
import { Dashboard, Device } from "@pluto/interfaces";
import { useSocket } from "@/providers/SocketProvider";
import { DeviceStatusBadge } from "@/components/Badge";
import { SearchInput } from "@/components/Input";
import { DeviceMonitoringAccordion } from "@/components/Accordion";
import { ArrowLeftSmallIcon } from "@/components/icons/ArrowIcon";
import Link from "@/components/Link/Link";
import { formatDetailedTime, formatTime } from "@/utils/formatTime";

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

  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const response = await axios.get<{ data: Device[] }>("/api/devices/imprint", {
        params: {
          q: e.target.value,
        },
      });

      const discoveredDevices = response.data;
      setRegisteredDevices(discoveredDevices.data);
    } catch (error) {
      console.error("Error searching devices:", error);
    }
  };

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <VStack p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }} spacing={4} align="stretch">
        <Flex
          justify={{
            base: "flex-start",
            tablet: "space-between",
            desktop: "space-between",
          }}
          alignItems={{ base: "start", tablet: "center", desktop: "center" }}
          flexDir={{ base: "column", tablet: "row", desktop: "row" }}
          gap={"1rem"}
        >
          <Heading fontSize={"4xl"} fontWeight={400}>
            Monitoring
          </Heading>
          <Box w={{ base: "100%", tablet: "unset" }}>
            <SearchInput
              label="Search device"
              onChange={handleSearch}
              placeholder="Search device"
            />
          </Box>
        </Flex>

        {registeredDevices ? (
          <Box
            backgroundColor={"bg-color"}
            // borderRadius={"1rem"}
            // p={"1rem"}
            // borderWidth={"1px"}
            // borderColor={theme.colors.greyscale[200]}
          >
            <TableContainer
              borderRadius={0}
              borderWidth={"1px"}
              borderColor={"border-color"}
              display={{ base: "none", tablet: "block" }}
            >
              <Table variant="simple">
                <Thead backgroundColor={"th-bg"}>
                  <Tr>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"left"}
                    >
                      Name
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Hashrate
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Shares
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Power
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Temp
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Best difficulty
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Uptime
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"heading"}
                      textTransform={"capitalize"}
                      fontSize={"xs"}
                      textAlign={"center"}
                    >
                      Status
                    </Th>
                    <Th borderColor={"border-color"}></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {registeredDevices.map((device) => (
                    <Tr key={device.mac}>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"left"}
                      >
                        {device.info.hostname}
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        {device.info.hashRate.toFixed(2)} GH/s
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        {device.info.sharesAccepted}|
                        <Text as={"label"} color={"accent-color"}>
                          {device.info.sharesRejected}
                        </Text>
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        {device.info.power.toFixed(2)} W
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        {device.info.temp} °C
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        {device.info.bestDiff}
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        <Tooltip
                          label={formatDetailedTime(device.info.uptimeSeconds)}
                          aria-label={formatDetailedTime(device.info.uptimeSeconds)}
                        >
                          {formatTime(device.info.uptimeSeconds)}
                        </Tooltip>
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </Td>
                      <Td
                        borderColor={theme.colors.greyscale[100]}
                        fontSize={"14px"}
                        textAlign={"center"}
                      >
                        <Link
                          href={`monitoring/${device.info.hostname}`}
                          label="Dashboard"
                          fontWeight={500}
                          rightIcon={<ArrowLeftSmallIcon color="#000" />}
                          isDisabled={!device?.publicDashboardUrl}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            <Box display={{ base: "block", tablet: "none" }}>
              <DeviceMonitoringAccordion devices={registeredDevices}></DeviceMonitoringAccordion>
            </Box>
          </Box>
        ) : (
          <Text>No dashboards available.</Text>
        )}
      </VStack>
    </Container>
  );
};

export default MonitoringTablePage;
