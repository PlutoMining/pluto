"use client";

import * as React from "react";

import { SocketProvider } from "@/providers/SocketProvider";

export default function RealtimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SocketProvider>{children}</SocketProvider>;
}
