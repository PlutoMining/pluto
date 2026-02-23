/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

/**
 * Notification and alerting types for global settings, per-device settings,
 * and Alertmanager webhook payload (inbound).
 */

// --- Global notification settings ---

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  /** Minutes before sending the same (device, alert) again. Default 60. */
  repeatIntervalMinutes?: number;
  /** Max ntfy messages per day (e.g. 250 for ntfy.sh). null = unlimited. */
  maxMessagesPerDay?: number | null;
}

export type NotificationChannel = NtfyNotificationChannel | FutureNotificationChannel;

export interface NtfyNotificationChannel {
  type: "ntfy";
  enabled: boolean;
  config: NtfyConfig;
}

/** Placeholder for future providers (telegram, discord, etc.) */
export interface FutureNotificationChannel {
  type: "telegram" | "discord" | string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface NtfyConfig {
  serverUrl: string;
  topic: string;
  auth: NtfyAuthNone | NtfyAuthBasic | NtfyAuthToken;
}

export interface NtfyAuthNone {
  type: "none";
}

export interface NtfyAuthBasic {
  type: "basic";
  username: string;
  password?: string;
  hasPassword?: boolean;
}

export interface NtfyAuthToken {
  type: "token";
  token?: string;
  hasToken?: boolean;
}

// --- Per-device notification settings ---

export interface DeviceNotificationSettings {
  enabled: boolean;
  offline: { enabled: boolean };
  thresholds: Partial<Record<MetricKey, ThresholdConfig>>;
}

export interface ThresholdConfig {
  enabled: boolean;
  min?: number;
  max?: number;
}

/** Metric keys used for threshold alerts. Matches Prometheus metric names. */
export type MetricKey =
  | "power_watts"
  | "temperature_celsius"
  | "vr_temperature_celsius"
  | "hashrate_ghs"
  | "fanspeed_rpm"
  | "shares_rejected";

// --- Alertmanager webhook (inbound) ---
// See: https://prometheus.io/docs/alerting/latest/configuration/#webhook_config

export interface AlertmanagerWebhookPayload {
  version?: string;
  /** "firing" | "resolved" */
  status: string;
  receiver?: string;
  groupKey?: string;
  groupLabels?: Record<string, string>;
  commonLabels?: Record<string, string>;
  commonAnnotations?: Record<string, string>;
  externalURL?: string;
  alerts: AlertmanagerAlert[];
}

export interface AlertmanagerAlert {
  /** "firing" | "resolved" */
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL?: string;
  fingerprint?: string;
}
