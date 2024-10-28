"use client";
import { Badge, DeviceStatusBadge } from "@/components/Badge";
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

      if (device) {
        console.log(
          device.info.hashRate / ((device.info.power * device.info.uptimeSeconds) / 3600)
        );

        console.log(
          device.info.hashRate / 1000 / ((device.info.power * device.info.uptimeSeconds) / 3600)
        );
      }

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
              <Flex gap={"1rem"} flexDir={{ base: "column", tablet: "row" }}>
                <Flex
                  flex={1}
                  border={`1px solid ${theme.colors.greyscale[200]}`}
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
                  border={`1px solid ${theme.colors.greyscale[200]}`}
                  borderRadius={"0.5rem"}
                  justify={"space-between"}
                  p={"1rem"}
                >
                  <Heading fontSize={"1rem"} fontWeight={700}>
                    Pool Info
                  </Heading>
                  <Heading fontSize={"1rem"} fontWeight={500}>
                    <Badge
                      color={theme.colors.greyscale[500]}
                      bg={theme.colors.greyscale[200]}
                      label={`${preset ? preset.name : "Custom"}`}
                    ></Badge>
                  </Heading>
                </Flex>
              </Flex>
            </Flex>

            <Flex
              backgroundColor={theme.colors.brand.secondary}
              p={"1rem"}
              borderRadius={"1rem"}
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
                gap={"0.5rem"}
                borderRight={"1px solid rgba(#fff, 0.25)"}
                borderRightWidth={{ base: 0, tablet: "1px" }}
                borderColor={theme.colors.greyscale[0]}
                marginRight={{ base: 0, tablet: "1rem" }}
                borderBottomWidth={{ base: "1px", tablet: 0 }}
                paddingBottom={{ base: "1rem", tablet: 0 }}
              >
                <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                  Hash Rate
                </Heading>
                <Heading
                  color={theme.colors.greyscale[0]}
                  fontSize={{ base: "20px", tablet: "28px" }}
                  fontWeight={700}
                >
                  {device?.info.hashRate.toFixed(2)} GH/s
                </Heading>
              </Flex>

              <Flex
                flexDir={"column"}
                borderRight={"1px solid rgba(#fff, 0.25)"}
                borderRightWidth={{ base: 0, tablet: "1px" }}
                borderColor={theme.colors.greyscale[0]}
                marginRight={{ base: 0, tablet: "1rem" }}
                borderBottomWidth={{ base: "1px", tablet: 0 }}
                paddingBottom={{ base: "1rem", tablet: 0 }}
                flex={1}
              >
                <Flex
                  flexDir={{ base: "row", tablet: "column" }}
                  justify={{ base: "space-between", tablet: "flex-start" }}
                  alignItems={{ base: "center", tablet: "flex-start" }}
                  gap={"0.5rem"}
                >
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Shares
                  </Heading>
                  <Heading
                    color={theme.colors.greyscale[0]}
                    fontSize={{ base: "20px", tablet: "28px" }}
                    fontWeight={700}
                  >
                    {device?.info.sharesAccepted}
                  </Heading>
                </Flex>
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
                flexDir={{ base: "row", tablet: "column" }}
                justify={{ base: "space-between", tablet: "flex-start" }}
                alignItems={{ base: "center", tablet: "flex-start" }}
                gap={"0.5rem"}
                borderRight={"1px solid rgba(#fff, 0.25)"}
                borderRightWidth={{ base: 0, tablet: "1px" }}
                borderColor={theme.colors.greyscale[0]}
                marginRight={{ base: 0, tablet: "1rem" }}
                borderBottomWidth={{ base: "1px", tablet: 0 }}
                paddingBottom={{ base: "1rem", tablet: 0 }}
              >
                <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                  Uptime
                </Heading>
                <Heading
                  color={theme.colors.greyscale[0]}
                  fontSize={{ base: "20px", tablet: "28px" }}
                  fontWeight={700}
                >
                  {formatTime(device?.info.uptimeSeconds || 0)}
                </Heading>
              </Flex>

              <Flex flexDir={"column"} flex={1}>
                <Flex
                  gap={"0.5rem"}
                  flexDir={{ base: "row", tablet: "column" }}
                  justify={{ base: "space-between", tablet: "flex-start" }}
                  alignItems={{ base: "center", tablet: "flex-start" }}
                >
                  <Heading color={theme.colors.greyscale[0]} fontSize={"14px"} fontWeight={500}>
                    Best difficulty
                  </Heading>
                  <Flex gap={"0.5rem"} alignItems={"baseline"}>
                    <Heading
                      color={theme.colors.greyscale[0]}
                      fontSize={{ base: "20px", tablet: "28px" }}
                      fontWeight={700}
                    >
                      {device?.info.bestDiff}
                    </Heading>
                    <Heading color={theme.colors.greyscale[0]} fontSize={"1rem"}>
                      all time best
                    </Heading>
                  </Flex>
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

            <Box
              backgroundColor={theme.colors.greyscale[0]}
              borderRadius={"1rem"}
              p={"1rem"}
              h={{ base: "2135px", tablet: "1200px" }}
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
                  src={`${dashboardPublicUrl}&kiosk=1&theme=light&refresh=5s`}
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
