/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const file = await fs.promises.readFile("/tmp/umbrel-app.yml", "utf-8");

  const doc = yaml.load(file);

  return NextResponse.json(doc);
}
