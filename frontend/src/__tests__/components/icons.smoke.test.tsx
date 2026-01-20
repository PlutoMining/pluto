import fs from "fs";
import path from "path";
import React from "react";
import { cleanup, render } from "@testing-library/react";

function listTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      out.push(fullPath);
    }
  }
  return out;
}

describe("icons smoke", () => {
  it("renders all icon components", () => {
    const iconsDir = path.resolve(__dirname, "../../components/icons");
    const iconFiles = listTsxFiles(iconsDir);

    for (const file of iconFiles) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(file);
      const candidates = new Set<any>();

      if (mod?.default) candidates.add(mod.default);
      Object.values(mod ?? {}).forEach((v) => candidates.add(v));

      for (const candidate of candidates) {
        if (typeof candidate !== "function") continue;

        render(React.createElement(candidate, { color: "black" }));
        cleanup();
      }
    }
  });
});
