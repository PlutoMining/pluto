import { APP_NAV, getPageTitle } from "@/components/AppShell/nav";

describe("AppShell nav", () => {
  it("keeps nav label 'Overview' but shows 'Overview Dashboard' in header", () => {
    expect(APP_NAV[0]?.label).toBe("Overview");
    expect(getPageTitle("/")).toBe("Overview Dashboard");
  });

  it("formats monitoring dashboard titles", () => {
    expect(getPageTitle("/monitoring/rig-1")).toBe("rig-1 Dashboard");
    expect(getPageTitle("/monitoring/rig%201")).toBe("rig 1 Dashboard");

    // malformed escape should fall back to the raw id
    expect(getPageTitle("/monitoring/%E0%A4%A")).toBe("%E0%A4%A Dashboard");
  });
});
