/**
 * Copyright (C) 2026 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

const SI_SUFFIXES = ["", "K", "M", "G", "T", "P", "E"] as const;
type SiSuffix = (typeof SI_SUFFIXES)[number];

const SUFFIX_MULTIPLIERS: Record<string, number> = {
  "": 1,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};

export function parseDifficulty(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-zA-Z])?/i
  );
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;

  const suffixRaw = (match[2] ?? "").toUpperCase();
  const suffix: SiSuffix | "" = suffixRaw in SUFFIX_MULTIPLIERS ? (suffixRaw as SiSuffix | "") : "";
  return base * SUFFIX_MULTIPLIERS[suffix];
}

function formatScaled(value: number) {
  const abs = Math.abs(value);
  if (abs === 0) return { value: "0", suffix: "" as const };

  const exp = Math.min(
    SI_SUFFIXES.length - 1,
    Math.max(0, Math.floor(Math.log10(abs) / 3))
  );

  const scaled = value / Math.pow(1000, exp);
  const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;

  const raw = scaled.toFixed(digits);
  const trimmed = raw.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return { value: trimmed, suffix: SI_SUFFIXES[exp] };
}

export function formatDifficulty(value: unknown): string {
  const parsed = parseDifficulty(value);
  if (parsed === null) return "-";
  if (!Number.isFinite(parsed)) return "-";

  const scaled = formatScaled(parsed);
  return `${scaled.value}${scaled.suffix}`;
}
