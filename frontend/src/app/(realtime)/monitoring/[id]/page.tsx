/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import MonitoringClient from "./MonitoringClient";

export default function MonitoringPage({
  params,
}: {
  params: { id: string };
}) {
  return <MonitoringClient id={params.id} />;
}
