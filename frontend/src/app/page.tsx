"use client";
import { Box, Container, Flex, Heading, useMediaQuery, useTheme, VStack } from "@chakra-ui/react";
import { Device } from "@pluto/interfaces";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const OverviewPage: React.FC = () => {
  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref
  const theme = useTheme();

  useEffect(() => {
    fetchDevicesAndDashboardsAndUpdate();
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

  return (
    <Container flex="1" maxW="container.desktop" h={"100%"}>
      <Flex
        p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}
        flexDirection={"column"}
        gap={"1rem"}
      >
        <Heading fontSize={"4xl"} fontWeight={400}>
          Overview Dashboard
        </Heading>
        {dashboardPublicUrl && (
          <Box
            backgroundColor={theme.colors.greyscale[0]}
            borderRadius={"1rem"}
            p={"1rem"}
            h={{ base: "1755px", tablet: "1130px" }}
          >
            <Box backgroundColor={"#f2f3f3"} p={"1rem"} borderRadius={"1rem"} h={"100%"} w={"100%"}>
              <iframe
                ref={iframeRef} // Applichiamo la ref qui
                src={`${dashboardPublicUrl}&theme=light&transparent=true`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: "transparent",
                }} // Opzionale: stile per rimuovere il bordo
              ></iframe>
            </Box>
          </Box>
        )}
      </Flex>
    </Container>
  );
};

export default OverviewPage;
