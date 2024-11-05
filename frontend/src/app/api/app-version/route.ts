import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import yaml from "js-yaml";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const file = await fs.promises.readFile("/tmp/umbrel-app.yml", "utf-8");

  const doc = yaml.load(file);

  return NextResponse.json(doc);
}
