"use client";

import theme from "@/theme/theme";
import { ChakraProvider } from "@chakra-ui/react";
import { SocketProvider } from "./SocketProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <SocketProvider>{children}</SocketProvider>
    </ChakraProvider>
  );
}
