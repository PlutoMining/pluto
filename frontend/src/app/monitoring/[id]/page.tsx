"use client";
import { DeviceStatusBadge } from "@/components/Badge";
import Link from "@/components/Link/Link";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { ArrowLeftIcon } from "@/components/icons/ArrowIcon";
import { useSocket } from "@/providers/SocketProvider";
import { formatTime } from "@/utils/formatTime";
import { Box, Container, Flex, Heading, Text, useTheme } from "@chakra-ui/react";
import { Device, Preset } from "@pluto/interfaces";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MonitoringPage: React.FC = () => {
  const { id }: { id: string } = useParams();
  const theme = useTheme();
  const [device, setDevice] = useState<Device | undefined>(undefined);

  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref

  const [preset, setPreset] = useState<Partial<Preset> | undefined>(undefined);

  useEffect(() => {
    fetchDevicesAndDashboardsAndUpdate();
    fetchDevice();
  }, []);

  const { isConnected, socket } = useSocket();

  useEffect(() => {
    const listener = (e: Device) => {
      setDevice(e);
    };

    if (isConnected) {
      socket.on("stat_update", listener);
      socket.on("error", listener);

      return () => {
        socket.off("stat_update", listener);
        socket.off("error", listener);
      };
    }
  }, [isConnected, socket, device]);

  const fetchDevicesAndDashboardsAndUpdate = async () => {
    try {
      const dashboardResponse = await axios.get("/api/dashboards");
      const fetchedDashboards: any[] = dashboardResponse.data;

      setDashboardPublicUrl(fetchedDashboards?.find((d) => d.name === id)?.publicUrl);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const fetchDevice = async () => {
    try {
      const response = await axios.get("/api/devices/imprint");
      const imprintedDevices: Device[] = response.data.data;

      const device = imprintedDevices?.find((d) => d.info.hostname === id);
      setDevice(device);

      if (device?.presetUuid) {
        const response = await fetch("/api/presets");
        if (response.ok) {
          const data: { data: Preset[] } = await response.json();
          const newData = data.data.find((p) => p.uuid === device.presetUuid);
          if (newData) {
            setPreset(newData);
          }
        }
      }

      return device;
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Flex
        p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}
        flexDirection={"column"}
        gap={"1rem"}
      >
        <Link
          href={"/monitoring"}
          label="Go back"
          leftIcon={<ArrowLeftIcon color={theme.colors.greyscale[900]} />}
        />
        <Heading fontSize={"4xl"} fontWeight={400} textTransform="capitalize">
          {id} Dashboard
        </Heading>
        {dashboardPublicUrl ? (
          <Flex flexDirection={"column"} gap={"1rem"}>
            <Flex
              backgroundColor={theme.colors.greyscale[0]}
              borderRadius={"1rem"}
              p={"1rem"}
              flexDir={"column"}
              gap={"1rem"}
            >
              <Heading fontSize={"1rem"} fontWeight={500}>
                General Info
              </Heading>
              <Flex gap={"1rem"}>
                <Flex
                  flex={1}
                  backgroundColor={theme.colors.greyscale[100]}
                  borderRadius={"0.5rem"}
                  justify={"space-between"}
                  p={"1rem"}
                >
                  <Heading fontSize={"1rem"} fontWeight={700}>
                    Device Status
                  </Heading>
                  <DeviceStatusBadge status={device?.tracing ? "online" : "offline"} />
                </Flex>
                <Flex
                  flex={1}
                  backgroundColor={theme.colors.greyscale[100]}
                  borderRadius={"0.5rem"}
                  justify={"space-between"}
                  p={"1rem"}
                >
                  <Heading fontSize={"1rem"} fontWeight={700}>
                    Pool Info
                  </Heading>
                  <Heading fontSize={"1rem"} fontWeight={500}>
                    {preset ? preset.name : "Custom"}
                  </Heading>
                </Flex>
              </Flex>
            </Flex>

            <Box backgroundColor={theme.colors.greyscale[0]} borderRadius={"1rem"} p={"1rem"}>
              <Flex
                backgroundColor={theme.colors.brand.secondary}
                p={"1rem"}
                borderRadius={"1rem"}
                justify={"space-between"}
                gap={"1rem"}
                flexDirection={{ mobile: "column", tablet: "row" }}
                flexWrap={{ mobile: "nowrap", tablet: "wrap" }}
              >
                <Flex
                  flex={1}
                  flexDir={"column"}
                  gap={"0.5rem"}
                  borderRight={"1px solid rgba(#fff, 0.25)"}
                  borderRightWidth={"1px"}
                  borderColor={theme.colors.greyscale[0]}
                  marginRight={"1rem"}
                >
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Hash Rate
                  </Heading>
                  <Heading color={theme.colors.greyscale[0]} fontSize={"2rem"} fontWeight={700}>
                    {device?.info.hashRate.toFixed(2)} GH/s
                  </Heading>
                </Flex>

                <Flex
                  flex={1}
                  flexDir={"column"}
                  gap={"0.5rem"}
                  borderRight={"1px solid rgba(#fff, 0.25)"}
                  borderRightWidth={"1px"}
                  borderColor={theme.colors.greyscale[0]}
                  marginRight={"1rem"}
                >
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Shares
                  </Heading>
                  <Heading color={theme.colors.greyscale[0]} fontSize={"2rem"} fontWeight={700}>
                    {device?.info.sharesAccepted}
                  </Heading>
                  <Text
                    fontSize={"14px"}
                    fontWeight={400}
                    opacity={"0.75"}
                    color={theme.colors.greyscale[0]}
                  >
                    Rejected {device?.info.sharesRejected}
                  </Text>
                </Flex>

                <Flex
                  flex={1}
                  flexDir={"column"}
                  gap={"0.5rem"}
                  borderRight={"1px solid rgba(#fff, 0.25)"}
                  borderRightWidth={"1px"}
                  borderColor={theme.colors.greyscale[0]}
                  marginRight={"1rem"}
                >
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Uptime
                  </Heading>
                  <Heading color={theme.colors.greyscale[0]} fontSize={"2rem"} fontWeight={700}>
                    {formatTime(device?.info.uptimeSeconds || 0)}
                  </Heading>
                </Flex>

                <Flex flex={1} flexDir={"column"} gap={"0.5rem"}>
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Best difficulty
                  </Heading>
                  <Flex gap={"0.5rem"} alignItems={"baseline"}>
                    <Heading color={theme.colors.greyscale[0]} fontSize={"2rem"} fontWeight={700}>
                      {device?.info.bestDiff}
                    </Heading>
                    <Heading color={theme.colors.greyscale[0]} fontSize={"1rem"}>
                      all time best
                    </Heading>
                  </Flex>
                  <Text
                    fontSize={"14px"}
                    fontWeight={400}
                    opacity={"0.75"}
                    color={theme.colors.greyscale[0]}
                  >
                    Since system boot: {device?.info.bestSessionDiff}
                  </Text>
                </Flex>
              </Flex>
            </Box>

            <Box
              backgroundColor={theme.colors.greyscale[0]}
              borderRadius={"1rem"}
              p={"1rem"}
              h={{ base: "2385px", tablet: "1340px" }}
            >
              <Box
                backgroundColor={"#f2f3f3"}
                p={"1rem"}
                borderRadius={"1rem"}
                h={"100%"}
                w={"100%"}
              >
                <iframe
                  ref={iframeRef} // Applichiamo la ref qui
                  src={`${dashboardPublicUrl}&kiosk=1&theme=light`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                ></iframe>
              </Box>
            </Box>
          </Flex>
        ) : (
          <Flex w={"100%"} alignItems={"center"} flexDirection={"column"} m={"2rem auto"}>
            <CircularProgressWithDots />
          </Flex>
        )}
      </Flex>
    </Container>
  );
};

export default MonitoringPage;
