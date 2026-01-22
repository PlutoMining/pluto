/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import OverviewClient from "./OverviewClient";
import { SocketProvider } from "@/providers/SocketProvider";

export default function OverviewPage() {
  // Overview is under the (static) group, but we still want real-time online/offline
  // status updates via websocket.
  return (
    <SocketProvider>
      <OverviewClient />
    </SocketProvider>
  );
}
