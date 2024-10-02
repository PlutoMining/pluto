"use client";
import Link from "@/components/Link/Link";
import { ArrowLeftIcon } from "@/components/icons/ArrowIcon";
import { Box, Heading, Text, useMediaQuery, useTheme, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MonitoringPage: React.FC = () => {
  const { id }: { id: string } = useParams();
  const theme = useTheme();

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

      setDashboardPublicUrl(fetchedDashboards?.find((d) => d.name === id)?.publicUrl);
    } catch (error) {
      console.error("Error discovering devices:", error);
    }
  };

  return (
    <VStack p={8} spacing={4} align="stretch" height={"100%"}>
      <Link
        href={"/monitoring"}
        label="Go back"
        leftIcon={<ArrowLeftIcon color={theme.colors.greyscale[900]} />}
      />

      <Heading>
        <Text style={{ textTransform: "capitalize" }}>{id} Dashboard</Text>
      </Heading>
      {dashboardPublicUrl && (
        <Box minHeight={!isNotMobile ? "3950px" : "1750px"} position={"relative"}>
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

export default MonitoringPage;
