"use client";
import Link from "@/components/Link/Link";
import { CircularProgressWithDots } from "@/components/ProgressBar/CircularProgressWithDots";
import { ArrowLeftIcon } from "@/components/icons/ArrowIcon";
import { useSocket } from "@/providers/SocketProvider";
import { formatTime } from "@/utils/formatTime";
import {
  Box,
  Center,
  Container,
  Divider,
  Flex,
  Heading,
  Text,
  useMediaQuery,
  useTheme,
  VStack,
} from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MonitoringPage: React.FC = () => {
  const { id }: { id: string } = useParams();
  const theme = useTheme();
  const [device, setDevice] = useState<Device | undefined>(undefined);

  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref

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
        gap={"0.5rem"}
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
              h={{ base: "2350px", tablet: "1300px" }}
            >
              <iframe
                ref={iframeRef} // Applichiamo la ref qui
                src={`${dashboardPublicUrl}&kiosk=1&theme=light`}
                style={{ width: "100%", height: "100%", border: "none" }}
              ></iframe>
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
