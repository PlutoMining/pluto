import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

// Override the global auto-mock from jest.setup.ts with a deterministic mock that
// executes formatter callbacks so we actually cover chart code paths.
jest.mock("recharts", () => {
  const passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children);

  return {
    __esModule: true,
    ResponsiveContainer: passthrough,
    LineChart: passthrough,
    AreaChart: passthrough,
    BarChart: passthrough,
    CartesianGrid: () => null,
    YAxis: () => null,
    Line: () => null,
    Area: () => null,
    Bar: () => null,
    XAxis: ({ tickFormatter, dataKey }: any) => {
      const text = tickFormatter ? tickFormatter(0) : dataKey ?? "x";
      return React.createElement("div", { "data-testid": "x-axis" }, String(text));
    },
    Tooltip: ({ formatter, labelFormatter, content }: any) => {
      const parts: string[] = [];
      if (labelFormatter) parts.push(String(labelFormatter(0)));
      if (formatter) {
        const r1 = formatter(1.2345, "a");
        const r2 = formatter("bad", "a");
        const r3 = formatter(1.2345, "missing");
        parts.push(JSON.stringify(r1));
        parts.push(JSON.stringify(r2));
        parts.push(JSON.stringify(r3));
      }
      if (content) {
        const payload = [{ payload: { name: "row-1", value: 12.345 } }];
        const payloadBadNumber = [{ payload: { name: "row-bad", value: "bad" } }];
        const payloadMissing = [{ payload: undefined }];

        // Cover early returns.
        content({ active: false, payload });
        content({ active: true, payload: [] });
        content({ active: true, payload: payloadMissing });

        // Cover both numeric and non-numeric number formatting.
        content({ active: true, payload: payloadBadNumber });
        const node = content({ active: true, payload });
        return React.createElement("div", { "data-testid": "tooltip" }, parts.join(" | "), node);
      }
      return React.createElement("div", { "data-testid": "tooltip" }, parts.join(" | "));
    },
    PieChart: passthrough,
    Cell: () => null,
    Pie: ({ onMouseEnter, children }: any) => {
      if (onMouseEnter) {
        onMouseEnter({}, 1);
        onMouseEnter({}, "x");
      }
      return React.createElement("div", { "data-testid": "pie" }, children);
    },
    Treemap: ({ content, data, nameKey, dataKey, children }: any) => {
      const nodes: any[] = [];
      if (typeof content === "function") {
        // Covers `nodeProps ?? {}` and other defensive branches.
        nodes.push(content(undefined));

        nodes.push(
          content({
            x: 0,
            y: 0,
            width: 100,
            height: 40,
            index: 0,
            depth: 1,
            name: "big",
            tooltipIndex: 0,
          })
        );
        nodes.push(
          content({
            x: 0,
            y: 0,
            width: 20,
            height: 10,
            index: 1,
            depth: 1,
            name: "small",
            tooltipIndex: 1,
          })
        );
        nodes.push(
          content({
            x: 0,
            y: 0,
            width: NaN,
            height: 10,
            index: 2,
            depth: 1,
            name: "invalid",
            tooltipIndex: 2,
          })
        );
        nodes.push(content({ x: 0, y: 0, width: 10, height: 10, depth: 0 }));

        // Cover value/payload precedence in TreemapChartCard.
        nodes.push(
          content({
            x: 0,
            y: 0,
            width: 100,
            height: 40,
            index: 3,
            depth: 1,
            name: "withValue",
            tooltipIndex: 3,
            value: 123,
          })
        );
        nodes.push(
          content({
            x: 0,
            y: 0,
            width: 100,
            height: 40,
            index: 4,
            depth: 1,
            name: "withPayload",
            tooltipIndex: 4,
            payload: { [dataKey]: 456 },
          })
        );
      }

      const rendered = (data ?? []).map((row: any) =>
        React.createElement("div", { key: String(row[nameKey]) }, `${row[nameKey]}:${row[dataKey]}`)
      );

      return React.createElement(
        "div",
        { "data-testid": "treemap" },
        nodes,
        rendered,
        children
      );
    },
  };
});

import { TIME_RANGES } from "@/lib/prometheus";
import { TimeRangeSelect } from "@/components/charts/TimeRangeSelect";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { AreaChartCard } from "@/components/charts/AreaChartCard";
import { MultiLineChartCard } from "@/components/charts/MultiLineChartCard";
import { TreemapChartCard } from "@/components/charts/TreemapChartCard";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { PieChartCard } from "@/components/charts/PieChartCard";
import { computeLinearBreakpoints, contrastTextColor, steppedColor } from "@/components/charts/chartPalette";

describe("charts coverage", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("TimeRangeSelect calls onChange and highlights active value", () => {
    const onChange = jest.fn();
    render(<TimeRangeSelect value={TIME_RANGES[0].key} onChange={onChange} />);

    const active = screen.getByRole("button", { name: TIME_RANGES[0].label });
    expect(active.className).toContain("bg-primary");

    const next = screen.getByRole("button", { name: TIME_RANGES[1].label });
    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith(TIME_RANGES[1].key);
  });

  it("renders chart cards and executes tooltip/formatter callbacks", () => {
    // Cover chartPalette utility branches.
    expect(contrastTextColor("hsl(var(--chart-1))")).toBeNull();
    expect(contrastTextColor("#FFFFFF")).toBe("#000000");
    expect(contrastTextColor("#000000")).toBe("#FFFFFF");

    expect(computeLinearBreakpoints(NaN, 1, 2)).toEqual([]);
    expect(computeLinearBreakpoints(0, 1, 1)).toEqual([]);
    expect(computeLinearBreakpoints(2, 1, 2)).toEqual([]);
    expect(computeLinearBreakpoints(0, 10, 3)).toHaveLength(2);

    expect(steppedColor("bad", [], [])).toBe("hsl(var(--muted))");
    expect(steppedColor(0, [1], [])).toBe("hsl(var(--muted))");
    expect(steppedColor(0, [1], ["#fff"])).toBe("#fff");
    expect(steppedColor(10, [1, 2], [])).toBe("hsl(var(--muted))");
    expect(steppedColor(10, [1, 2], ["a", "b", "c"])).toBe("c");

    render(
      <div>
        <LineChartCard title="Line" points={[{ t: 0, v: 1 }]} unit="W" curve="step" showDots={true} />
        <LineChartCard title="LineNoUnit" points={[{ t: 0, v: 1 }]} curve="step" showDots={false} />
        <AreaChartCard title="Area" points={[{ t: 0, v: 1 }]} unit="TH" curve="stepAfter" />
        <AreaChartCard title="AreaNoUnit" points={[{ t: 0, v: 1 }]} curve="stepAfter" />
        <MultiLineChartCard
          title="Multi"
          unit="V"
          valueDigits={1}
          series={[
            // Cover legend style branches (solid vs dashed).
            { key: "a", label: "A", color: "red", strokeDasharray: "3 3", points: [{ t: 0, v: 1.5 }] },
            { key: "b", label: "B", color: "blue", points: [{ t: 0, v: 2.5 }] },
          ]}
        />
        <MultiLineChartCard
          title="MultiAutoColors"
          valueDigits={1}
          series={[
            { key: "a", label: "A", points: [{ t: 0, v: 1.5 }] },
            { key: "b", label: "B", points: [{ t: 0, v: 2.5 }] },
          ]}
        />
        <MultiLineChartCard
          title="MultiFallbackColor"
          valueDigits={1}
          colors={[]}
          series={[{ key: "a", label: "A", points: [{ t: 0, v: 1.5 }] }]}
        />
        <MultiLineChartCard
          title="MultiNoUnit"
          valueDigits={1}
          series={[{ key: "a", label: "A", color: "red", points: [{ t: 0, v: 1.5 }] }]}
        />
        <TreemapChartCard
          title="Tree"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          data={[{ name: "row-1", value: 12.345 }]}
          renderTooltip={(row) => `extra:${row.name}`}
        />
        <TreemapChartCard
          title="TreeHexCategorical"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          colors={["#FFFFFF", "#000000"]}
          data={[{ name: "row-1", value: 1 }]}
        />
        <TreemapChartCard
          title="TreeNoColors"
          nameKey="name"
          valueKey="value"
          colors={[]}
          data={[{ name: "row-1", value: 1 }]}
        />
        <TreemapChartCard
          title="TreeSteppedAuto"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          colorMode="stepped"
          colors={["#FFFFFF", "#000000"]}
          data={[
            { name: "row-1", value: 1 },
            { name: "row-2", value: 10 },
          ]}
        />
        <TreemapChartCard
          title="TreeSteppedSingle"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          colorMode="stepped"
          colors={["#FFFFFF", "#000000"]}
          data={[{ name: "row-1", value: 1 }]}
        />
        <TreemapChartCard
          title="TreeSteppedNoData"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          colorMode="stepped"
          colors={["#FFFFFF", "#000000"]}
          data={undefined as any}
        />
        <TreemapChartCard
          title="TreeSteppedExplicit"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          colorMode="stepped"
          breakpoints={[0]}
          colors={["#FFFFFF", "#000000"]}
          data={[
            { name: "row-1", value: 1 },
            { name: "row-2", value: 10 },
          ]}
        />
        <TreemapChartCard
          title="TreeNoExtra"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          data={[{ name: "row-bad", value: "bad" }] as any}
        />
        <PieChartCard
          title="Pie"
          nameKey="name"
          valueKey="value"
          valueDigits={1}
          data={[
            { name: "row-1", value: 12.345 },
            { name: "row-2", value: 0 },
          ]}
          centerLabelKey="name"
          centerLabelTitle="Active"
          renderTooltip={(row) => `tip:${row.name}`}
        />
        <PieChartCard
          title="PieNoCenter"
          nameKey="name"
          valueKey="value"
          data={[{ name: "row-1", value: 12.345 }]}
        />
        <PieChartCard
          title="PieNoHeader"
          nameKey="name"
          valueKey="value"
          data={[]}
          hideHeader={true}
          centerLabel="Static"
        />
        <BarChartCard title="Bar" data={[{ x: "A", y: 1 }]} xKey="x" yKey="y" />
      </div>
    );

    expect(screen.getByText("Line")).toBeInTheDocument();
    expect(screen.getByText("LineNoUnit")).toBeInTheDocument();
    expect(screen.getByText("Area")).toBeInTheDocument();
    expect(screen.getByText("AreaNoUnit")).toBeInTheDocument();
    expect(screen.getByText("Multi")).toBeInTheDocument();
    expect(screen.getByText("MultiNoUnit")).toBeInTheDocument();
    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByText("TreeNoExtra")).toBeInTheDocument();
    expect(screen.getByText("Pie")).toBeInTheDocument();
    expect(screen.getByText("PieNoCenter")).toBeInTheDocument();
    expect(screen.getByText("Bar")).toBeInTheDocument();

    // MultiLineChartCard legend labels are real DOM.
    expect(screen.getAllByText("A")).not.toHaveLength(0);
    expect(screen.getAllByText("B")).not.toHaveLength(0);

    // Ensure our Tooltip mock ran (and thus exercised formatter closures).
    expect(screen.getAllByTestId("tooltip")).not.toHaveLength(0);

    // Treemap content should render the label for the big node.
    expect(screen.getAllByText("big")).not.toHaveLength(0);

    // Treemap + Pie both format 12.3, so assert at least one occurrence.
    expect(screen.getAllByText("12.3")).not.toHaveLength(0);
    expect(screen.getByText("extra:row-1")).toBeInTheDocument();

    // PieChartCard center label / tooltip branch.
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("row-2")).toBeInTheDocument();
    expect(screen.getAllByText("12.3")).not.toHaveLength(0);
    expect(screen.getByText("tip:row-1")).toBeInTheDocument();
    expect(screen.getByText("Static")).toBeInTheDocument();
  });
});
