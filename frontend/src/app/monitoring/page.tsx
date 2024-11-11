"use client";
import { DeviceMonitoringAccordion } from "@/components/Accordion";
import { DeviceStatusBadge } from "@/components/Badge";
import { ArrowLeftSmallIcon } from "@/components/icons/ArrowIcon";
import { SearchInput } from "@/components/Input";
import Link from "@/components/Link/Link";
import { useSocket } from "@/providers/SocketProvider";
import { formatDetailedTime, formatTime } from "@/utils/formatTime";
import {
  Box,
  Container,
  Flex,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToken,
  VStack,
} from "@chakra-ui/react";
import { Dashboard, Device } from "@pluto/interfaces";
import axios from "axios";
import NextLink from "next/link";
import { ChangeEvent, useEffect, useState } from "react";

const MonitoringTablePage: React.FC = () => {
  const [registeredDevices, setRegisteredDevices] = useState<Device[] | null>(null);

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

  const [textColor] = useToken("colors", ["body-text"]);
  const [borderColor] = useToken("colors", ["border-color"]);

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <VStack p={{ mobile: "1rem 0", tablet: "1rem" }} spacing={"1.5rem"} align="stretch">
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
          <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
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

        {registeredDevices && registeredDevices.length > 0 ? (
          <Box backgroundColor={"bg-color"}>
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
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"left"}
                      fontWeight={"400"}
                    >
                      Name
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Hashrate
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Shares
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Power
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Temp
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Best difficulty
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
                    >
                      Uptime
                    </Th>
                    <Th
                      borderColor={"border-color"}
                      color={"th-color"}
                      fontFamily={"accent"}
                      textTransform={"uppercase"}
                      fontSize={"xs"}
                      textAlign={"center"}
                      fontWeight={"400"}
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
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"left"}
                        fontWeight={"400"}
                      >
                        {device.info.hostname}
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        {(device.info.hashRate_10m || device.info.hashRate)?.toFixed(2)} GH/s
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        {device.info.sharesAccepted} |{" "}
                        <Text as={"label"} color={"primary-color"}>
                          {device.info.sharesRejected}
                        </Text>
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        {device.info.power.toFixed(2)} W
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        {device.info.temp} °C
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        {device.info.bestDiff}
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        <Tooltip
                          label={formatDetailedTime(device.info.uptimeSeconds)}
                          aria-label={formatDetailedTime(device.info.uptimeSeconds)}
                        >
                          {formatTime(device.info.uptimeSeconds)}
                        </Tooltip>
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                      >
                        <DeviceStatusBadge status={device.tracing ? "online" : "offline"} />
                      </Td>
                      <Td
                        borderColor={borderColor}
                        bg={"td-bg"}
                        fontSize={"sm"}
                        textAlign={"center"}
                        fontWeight={"400"}
                      >
                        <Link
                          as={NextLink}
                          href={`monitoring/${device.info.hostname}`}
                          label="Dashboard"
                          fontWeight={500}
                          rightIcon={<ArrowLeftSmallIcon color={textColor} />}
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
          <Text textAlign={"center"}>
            To start using Pluto, go to{" "}
            <NextLink href={"/devices"} style={{ textDecoration: "underline" }}>
              Your Devices
            </NextLink>{" "}
            and add one or more devices.
          </Text>
        )}
      </VStack>
    </Container>
  );
};

export default MonitoringTablePage;
