import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { Providers } from "@/providers";
import { Box, Container } from "@chakra-ui/react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pluto",
  description: "WIP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ overflow: "initial" }}>
        <Providers>
          <Box height={"100vh"} bg={"brand.purple0"}>
            <NavBar />
            <Box
              height={{
                base: "calc(100vh - 7.25rem)",
                tablet: "calc(100vh - 9.5rem)",
                tabletL: "calc(100vh - 8.5rem)",
              }}
            >
              <Box
                h={"100%"}
                borderRadius={"1rem"}
                bg={"greyscale.100"}
                overflowY={"scroll"}
                sx={{
                  scrollbarWidth: {
                    tablet: "none",
                  },
                  "&::-webkit-scrollbar": {
                    display: {
                      tablet: "none",
                    },
                  },
                }}
              >
                {children}
              </Box>
            </Box>
            <Footer />
          </Box>
        </Providers>
      </body>
    </html>
  );
}
