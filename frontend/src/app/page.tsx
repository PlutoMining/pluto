"use client";
import { Box, Container, Heading, useMediaQuery, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const OverviewPage: React.FC = () => {
  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref

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
      <Box p={{ mobile: "1rem 0", tablet: "1rem", desktop: "1rem" }}>
        <Heading fontSize={"4xl"} fontWeight={400}>
          Overview Dashboard
        </Heading>
        {dashboardPublicUrl && (
          <Box position={"relative"} height={"100vh"}>
            <iframe
              ref={iframeRef} // Applichiamo la ref qui
              src={`${dashboardPublicUrl}&theme=light&kiosk`}
              style={{ width: "100%", height: "100%", border: "none", position: "absolute" }} // Opzionale: stile per rimuovere il bordo
            ></iframe>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default OverviewPage;
