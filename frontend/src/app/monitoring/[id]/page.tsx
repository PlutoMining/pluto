"use client";
import { Badge, DeviceStatusBadge } from "@/components/Badge";
import Link from "@/components/Link/Link";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { ArrowLeftIcon } from "@/components/icons/ArrowIcon";
import { useSocket } from "@/providers/SocketProvider";
import { formatTime } from "@/utils/formatTime";
import { restyleIframe } from "@/utils/iframe";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  useColorMode,
  useTheme,
  useToken,
} from "@chakra-ui/react";
import { Device, Preset } from "@pluto/interfaces";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";

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
      if (e.mac !== device?.mac) return;
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

  const [primaryColor] = useToken("colors", ["primary-color"]);
  const [bgColor] = useToken("colors", ["bg-color"]);
  const [borderColor] = useToken("colors", ["border-color"]);
  const [badgeColor] = useToken("colors", ["badge-color"]);
  const [badgeBg] = useToken("colors", ["badge-bg"]);
  const [dashboardBgBadge] = useToken("colors", ["dashboard-bg-section"]);
  const [textColor] = useToken("colors", ["body-text"]);
  const [errorColor] = useToken("colors", ["error-color"]);
  const [graphBgColor] = useToken("colors", ["dashboard-bg-section"]);

  const { colorMode } = useColorMode();

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Flex
        p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}
        flexDirection={"column"}
        gap={"1rem"}
      >
        <Link
          as={NextLink}
          href={"/monitoring"}
          label="Go back"
          leftIcon={<ArrowLeftIcon color={primaryColor} />}
        />
        <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
          {id} Dashboard
        </Heading>
        {dashboardPublicUrl ? (
          <Flex flexDirection={"column"} gap={"1rem"}>
            <Flex
              backgroundColor={bgColor}
              p={"1rem"}
              flexDir={"column"}
              gap={"1rem"}
              border={`1px solid ${borderColor}`}
            >
              <Heading fontSize={"32px"} fontWeight={500}>
                General Info
              </Heading>
              <Flex gap={"1rem"} flexDir={{ base: "column", tablet: "row" }}>
                <Flex
                  flex={1}
                  backgroundColor={dashboardBgBadge}
                  borderRadius={0}
                  justify={"space-between"}
                  alignItems={"center"}
                  p={"1rem"}
                >
                  <Heading
                    fontSize={"lg"}
                    fontWeight={500}
                    textTransform={"uppercase"}
                    color={"dashboard-title"}
                    fontFamily={"accent"}
                  >
                    / Device Status
                  </Heading>
                  <DeviceStatusBadge
                    status={device?.tracing ? "online" : "offline"}
                    invert={true}
                  />
                </Flex>
                <Flex
                  flex={1}
                  backgroundColor={dashboardBgBadge}
                  borderRadius={0}
                  justify={"space-between"}
                  alignItems={"center"}
                  p={"1rem"}
                >
                  <Heading
                    fontSize={"lg"}
                    fontWeight={500}
                    textTransform={"uppercase"}
                    color={"dashboard-title"}
                    fontFamily={"accent"}
                  >
                    / Pool Info
                  </Heading>
                  <Heading fontSize={"1rem"} fontWeight={500}>
                    <Badge label={`${preset ? preset.name : "Custom"}`}></Badge>
                  </Heading>
                </Flex>
              </Flex>
            </Flex>

            <Flex
              backgroundColor={bgColor}
              p={"1rem"}
              borderRadius={"0"}
              border={`1px solid ${borderColor}`}
              justify={"space-between"}
              gap={"1rem"}
              flexDirection={{ base: "column", tablet: "row" }}
              flexWrap={{ base: "nowrap", tablet: "wrap" }}
            >
              <Flex
                flex={1}
                flexDir={{ base: "row", tablet: "column" }}
                justify={{ base: "space-between", tablet: "flex-start" }}
                alignItems={{ base: "center", tablet: "flex-start" }}
                gap={"1rem"}
                backgroundColor={dashboardBgBadge}
                p={"1rem"}
              >
                <Heading
                  fontSize={"lg"}
                  fontWeight={500}
                  textTransform={"uppercase"}
                  color={"dashboard-title"}
                  fontFamily={"accent"}
                >
                  / Hash Rate
                </Heading>
                <Heading fontSize={{ base: "20px", tablet: "32px" }} fontWeight={700}>
                  {(device?.info.hashRate_10m || device?.info.hashRate)?.toFixed(2)} GH/s
                </Heading>
              </Flex>

              <Flex
                flex={1}
                flexDir={{ base: "row", tablet: "column" }}
                justify={{ base: "space-between", tablet: "flex-start" }}
                alignItems={{ base: "center", tablet: "flex-start" }}
                gap={"1rem"}
                backgroundColor={dashboardBgBadge}
                p={"1rem"}
              >
                <Flex
                  flexDir={{ base: "row", tablet: "column" }}
                  justify={{ base: "space-between", tablet: "flex-start" }}
                  alignItems={{ base: "center", tablet: "flex-start" }}
                  w={"100%"}
                  gap={"1rem"}
                >
                  <Heading
                    fontSize={"lg"}
                    fontWeight={500}
                    textTransform={"uppercase"}
                    color={"dashboard-title"}
                    fontFamily={"accent"}
                  >
                    / Shares
                  </Heading>
                  <Flex flexDir={"column"} alignItems={{ base: "flex-end", tablet: "flex-start" }}>
                    <Heading fontSize={{ base: "20px", tablet: "32px" }} fontWeight={700}>
                      {device?.info.sharesAccepted}
                    </Heading>

                    <Flex alignItems={"center"} gap={"0.5rem"}>
                      <Badge
                        bg={errorColor}
                        color={textColor}
                        label={device?.info.sharesRejected}
                        fontWeight="500"
                      ></Badge>
                      <Text fontSize={"12px"} fontWeight={400}>
                        rejected
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>

              <Flex
                flex={1}
                flexDir={{ base: "row", tablet: "column" }}
                justify={{ base: "space-between", tablet: "flex-start" }}
                alignItems={{ base: "center", tablet: "flex-start" }}
                gap={"1rem"}
                backgroundColor={dashboardBgBadge}
                p={"1rem"}
              >
                <Heading
                  fontSize={"lg"}
                  fontWeight={500}
                  textTransform={"uppercase"}
                  color={"dashboard-title"}
                  fontFamily={"accent"}
                >
                  / Uptime
                </Heading>
                <Heading fontSize={{ base: "20px", tablet: "32px" }} fontWeight={700}>
                  {formatTime(device?.info.uptimeSeconds || 0)}
                </Heading>
              </Flex>

              <Flex
                flex={1}
                flexDir={{ base: "row", tablet: "column" }}
                justify={{ base: "space-between", tablet: "flex-start" }}
                alignItems={{ base: "center", tablet: "flex-start" }}
                gap={"1rem"}
                backgroundColor={dashboardBgBadge}
                p={"1rem"}
                w={"100%"}
              >
                <Flex
                  gap={"1rem"}
                  flexDir={{ base: "row", tablet: "column" }}
                  justify={{ base: "space-between", tablet: "flex-start" }}
                  alignItems={{ base: "center", tablet: "flex-start" }}
                  w={"100%"}
                >
                  <Heading
                    fontSize={"lg"}
                    fontWeight={500}
                    textTransform={"uppercase"}
                    color={"dashboard-title"}
                    fontFamily={"accent"}
                  >
                    / Best difficulty
                  </Heading>
                  <Flex flexDir={"column"} alignItems={{ base: "flex-end", tablet: "flex-start" }}>
                    <Flex gap={"0.5rem"} alignItems={"baseline"}>
                      <Heading fontSize={{ base: "20px", tablet: "28px" }} fontWeight={700}>
                        {device?.info.bestDiff}
                      </Heading>
                      <Heading fontSize={"1rem"}>all time best</Heading>
                    </Flex>
                    <Flex alignItems={"center"} gap={"0.5rem"}>
                      <Badge
                        color={primaryColor}
                        label={device?.info.sharesRejected}
                        fontWeight="500"
                      ></Badge>
                      <Text fontSize={"12px"} fontWeight={400}>
                        since system boot
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
            </Flex>

            <Box backgroundColor={bgColor} h={{ base: "2135px", tablet: "1200px" }}>
              <Box h={"100%"} w={"100%"}>
                <iframe
                  onLoad={restyleIframe(iframeRef, bgColor, textColor, graphBgColor)}
                  ref={iframeRef}
                  src={`${dashboardPublicUrl}&kiosk=1&theme=${
                    colorMode === "dark" ? "dark" : "light"
                  }&refresh=5s`}
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
