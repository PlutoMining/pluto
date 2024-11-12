"use client";
import axios from "axios";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { io as ClientIO } from "socket.io-client";
import { Device } from "@pluto/interfaces";

type SocketContextType = {
  socket: any | null;
  isConnected: boolean;
  devices: Device[] | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  devices: null,
});

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);

  useEffect(() => {
    const wsRoot = "/";

    const fetchDevices = async () => {
      try {
        const response = await axios.get("/api/devices/imprint"); // Supponiamo che l'endpoint di discovery sia questo
        const discoveredDevicesDTO: { data: Device[]; message: string } = response.data;

        setDevices(discoveredDevicesDTO.data);
      } catch (error) {
        console.error("Error listing imprinted devices:", error);
      }
    };
    if (devices) {
      const socketInstance = ClientIO(wsRoot, {
        path: "/api/socket/io",
        // transports: ["websocket"], // Usa solo WebSocket
        reconnectionAttempts: 5, // Limita il numero di tentativi di riconnessione
        reconnectionDelay: 1000, // Imposta un ritardo tra i tentativi di riconnessione
      });

      socketInstance.on("connect", () => {
        console.log("Connected to WebSocket");
        setIsConnected(true);
      });

      socketInstance.on("disconnect", (reason) => {
        console.warn("Disconnected from WebSocket:", reason);
        setIsConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Connection error:", error);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
      fetchDevices(); // Chiamata al discovery solo se ipAddress non è impostato
    }
  }, [devices]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, devices }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
