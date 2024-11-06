"use client";
import { restyleIframe } from "@/utils/iframe";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  useColorMode,
  useMediaQuery,
  useTheme,
  useToken,
  VStack,
} from "@chakra-ui/react";
import { Device, DeviceInfo } from "@pluto/interfaces";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const OverviewPage: React.FC = () => {
  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const [poolPreset, setPoolPreset] = useState<DeviceInfo[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref

  useEffect(() => {
    fetchDevicesAndDashboardsAndUpdate();
    fetchDevices();
  }, []);

  const fetchDevicesAndDashboardsAndUpdate = async () => {
    try {
      const dashboardResponse = await axios.get("/api/dashboards");
      const fetchedDashboards: any[] = dashboardResponse.data;

      setDashboardPublicUrl(fetchedDashboards?.find((d) => d.name === "overview")?.publicUrl);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await axios.get("/api/devices/imprint");
      const imprintedDevices: Device[] = response.data.data;

      const result = imprintedDevices.reduce<DeviceInfo[]>((acc, device) => {
        const { stratumURL, sharesAccepted, sharesRejected } = device.info;

        // Verifica se lo stratumURL esiste già nell'accumulatore
        const existingEntry = acc.find((entry) => entry.stratumURL === stratumURL);

        if (existingEntry) {
          // Se esiste già, somma i valori di sharesAccepted e sharesRejected
          existingEntry.sharesAccepted += sharesAccepted;
          existingEntry.sharesRejected += sharesRejected;
        } else {
          // Altrimenti, aggiungi un nuovo entry
          acc.push({
            stratumURL,
            sharesAccepted,
            sharesRejected,
          } as DeviceInfo);
        }

        return acc;
      }, []); // Inizialmente l'accumulatore è un array vuoto
      setPoolPreset(result);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  const [bgColor] = useToken("colors", ["bg-color"]);
  const [graphBgColor] = useToken("colors", ["dashboard-section-bg"]);

  const [textColor] = useToken("colors", ["body-color"]);

  const { colorMode } = useColorMode();

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Flex
        p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}
        flexDirection={"column"}
        gap={"1rem"}
      >
        <Heading fontSize={"4xl"} fontWeight={"700"} textTransform={"uppercase"}>
          Overview Dashboard
        </Heading>

        {dashboardPublicUrl && (
          <Box backgroundColor={"bg-color"} h={{ base: "1450px", tablet: "860px" }}>
            <Box borderRadius={"1rem"} h={"100%"} w={"100%"}>
              <iframe
                key={colorMode} // Forza il ri-rendering quando colorMode cambia
                onLoad={restyleIframe(iframeRef, bgColor, textColor, graphBgColor)}
                ref={iframeRef}
                src={`${dashboardPublicUrl}&theme=${colorMode}&refresh=5s`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: "transparent",
                }}
              ></iframe>
            </Box>
          </Box>
        )}

        {/*
        SHARES BY POOL - CUSTOM
         <Flex
          flexDir="column"
          backgroundColor={theme.colors.greyscale[0]}
          borderRadius={"1rem"}
          p={"1rem"}
          gap={"1rem"}
        >
          <Heading fontSize={"1rem"}>Shares by Pool</Heading>
          <Flex
            flexDir={{ base: "column", tablet: "row" }}
            gap={"1rem"}
            backgroundColor={theme.colors.greyscale[100]}
            borderRadius={"1rem"}
            p={"1rem"}
            w={{ base: "100%", tablet: "fit-content" }}
          >
            {poolPreset.map((d, i) => (
              <Flex
                flexDir={"column"}
                gap={"1rem"}
                p={"0 1rem"}
                borderLeft={{ base: "none", tablet: i != 0 ? "1px solid #8F8D91" : "none" }}
                paddingLeft={{ base: "none", tablet: i != 0 ? "2rem" : 0 }}
                borderTop={{ base: i != 0 ? "1px solid #8F8D91" : "none", tablet: "none" }}
                paddingTop={{ base: i != 0 ? "1rem" : 0, tablet: 0 }}
              >
                <Heading fontSize={"1rem"} mb={"0.5rem"} fontWeight={500}>
                  {d.stratumURL}
                </Heading>
                <Flex justify={"space-between"}>
                  <Heading fontWeight={700} fontSize={"1rem"}>
                    Accepted:
                  </Heading>
                  <Heading fontWeight={700} fontSize={"1rem"} color={theme.colors.alert.success}>
                    {d.sharesAccepted}
                  </Heading>
                </Flex>
                <Flex justify={"space-between"}>
                  <Heading fontWeight={700} fontSize={"1rem"}>
                    Rejected:
                  </Heading>
                  <Heading fontWeight={700} fontSize={"1rem"} color={theme.colors.alert.error}>
                    {d.sharesRejected}
                  </Heading>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex> */}
      </Flex>
    </Container>
  );
};

export default OverviewPage;
