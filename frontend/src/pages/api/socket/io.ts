/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

// pages/api/socket.js
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";

export default function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.IO server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected");

      // Connect to backend Socket.IO
      const wsRoot = process.env.BACKEND_DESTINATION_HOST!;

      const backendSocket = ClientIO(wsRoot, {
        path: "/socket/io",
        // transports: ["websocket"], // Use WebSocket only
        reconnectionAttempts: 5, // Limit the number of reconnection attempts
        reconnectionDelay: 1000, // Set a delay between reconnection attempts
      });

      // Log to monitor the connection state of backendSocket
      backendSocket.on("connect", () => {
        console.log("backendSocket successfully connected to the backend");
      });

      backendSocket.on("connect_error", (error) => {
        console.error("Connection error to backendSocket:", error);
      });

      backendSocket.on("disconnect", (reason) => {
        console.warn("backendSocket disconnected:", reason);
      });

      // Forward events from the backend to the client
      backendSocket.on("stat_update", (data) => {
        socket.emit("stat_update", data);
      });

      backendSocket.on("device_removed", (data) => {
        socket.emit("device_removed", data);
      });

      backendSocket.on("error", (data) => {
        socket.emit("error", data);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected");
        // backendSocket.disconnect();
      });
    });
  } else {
    console.log("Socket.IO server already initialized");
  }
  res.end();
}
