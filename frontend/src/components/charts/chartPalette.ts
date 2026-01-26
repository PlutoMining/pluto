/**
 * Color reference
 * - Source: "Color palette.pdf" (design asset).
 * - This file keeps a small, code-friendly representation of the palette.
 * - For the full palette list, see `frontend/docs/color-palette.md`.
 */

// UI/chart palette (uses CSS theme tokens)
export const CHART_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Palette groups (hex) for deterministic usage in custom visuals.
export const PLUTO_PRIMARY = ["#13FFEB", "#00685B", "#009888", "#00CBB8", "#D1FAF5", "#D3F2F2"];
export const PLUTO_SECONDARY = ["#0077C1", "#3E91DE", "#62ADFC", "#82C9FF", "#A1E6FF"];
export const PLUTO_ALERT = ["#77C926", "#FFBE4D", "#EE2B34"];

// Heat ramp used for the miner grid in Overview.
export const PLUTO_HEAT = [
  "#16FE7D",
  "#4FFB5F",
  "#7AF948",
  "#B0F72B",
  "#E6F40E",
  "#FFD101",
  "#FFA502",
  "#FF7203",
  "#FF3F04",
  "#FF0F05",
];

export const PLUTO_PRIMARY_SECONDARY = [...PLUTO_PRIMARY, ...PLUTO_SECONDARY];

// Ordered from light → dark, for stepped ramps.
export const PLUTO_PRIMARY_SCALE = ["#D3F2F2", "#D1FAF5", "#13FFEB", "#00CBB8", "#009888", "#00685B"];

function parseHexColor(hex: string) {
  const normalized = hex.trim();
  const m = /^#([0-9a-fA-F]{6})$/.exec(normalized);
  if (!m) return null;
  const v = m[1];
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

export function contrastTextColor(bg: string) {
  const rgb = parseHexColor(bg);
  if (!rgb) return null;

  // Relative luminance (sRGB)
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum > 0.58 ? "#000000" : "#FFFFFF";
}

export function computeLinearBreakpoints(min: number, max: number, steps: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (steps <= 1) return [];
  if (max <= min) return [];

  const range = max - min;
  const out: number[] = [];
  for (let i = 1; i < steps; i += 1) {
    out.push(min + (range * i) / steps);
  }
  return out;
}

export function steppedColor(value: unknown, breakpoints: number[], colors: string[]): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return colors[0] ?? "hsl(var(--muted))";

  for (let i = 0; i < breakpoints.length; i += 1) {
    if (num <= breakpoints[i]) return colors[Math.min(i, colors.length - 1)] ?? "hsl(var(--muted))";
  }

  return colors[Math.min(breakpoints.length, colors.length - 1)] ?? "hsl(var(--muted))";
}
