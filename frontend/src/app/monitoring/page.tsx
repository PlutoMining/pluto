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
} from "@chakra-ui/react";
import axios from "axios";
import { Dashboard, Device } from "@pluto/interfaces";
import { useSocket } from "@/providers/SocketProvider";
import { DeviceStatusBadge } from "@/components/Badge";
import { SearchInput } from "@/components/Input";
import { DeviceMonitoringAccordion } from "@/components/Accordion";
import { ArrowLeftSmallIcon } from "@/components/icons/ArrowIcon";
import Link from "@/components/Link/Link";
import { formatTime } from "@/utils/formatTime";

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
              display={{ base: "none", tablet: "block" }}
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
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.hostname}
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.hashRate.toFixed(2)} GH/s
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.sharesAccepted}|
                        <Text as={"label"} color={theme.colors.brand.secondary}>
                          {device.info.sharesRejected}
                        </Text>
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.power.toFixed(2)} W
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.temp} °C
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {device.info.bestDiff}
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        {formatTime(device.info.uptimeSeconds)}
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </Td>
                      <Td borderColor={theme.colors.greyscale[100]} fontSize={"14px"}>
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
