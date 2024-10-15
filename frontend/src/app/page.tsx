"use client";
import { Box, Heading, useMediaQuery, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const OverviewPage: React.FC = () => {
  const [dashboardPublicUrl, setDashboardPublicUrl] = useState<string>();
  const iframeRef = useRef<HTMLIFrameElement>(null); // Inizializziamo la ref
  const [isNotMobile] = useMediaQuery("(min-width: 860px)");

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
    <VStack p={8} spacing={4} align="stretch" height={"100%"}>
      <Heading fontSize={"4xl"} fontWeight={400}>
        Overview Dashboard
      </Heading>
      {dashboardPublicUrl && (
        <Box minHeight={!isNotMobile ? "3150px" : "1850px"} position={"relative"}>
          <iframe
            ref={iframeRef} // Applichiamo la ref qui
            src={`${dashboardPublicUrl}&theme=light`}
            style={{ width: "100%", height: "100%", border: "none", position: "absolute" }} // Opzionale: stile per rimuovere il bordo
          ></iframe>
        </Box>
      )}
    </VStack>
  );
};

export default OverviewPage;
