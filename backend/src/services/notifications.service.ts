/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import { findOne, updateOne } from "@pluto/db";
import { randomBytes } from "crypto";
import type {
  AlertmanagerAlert,
  AlertmanagerWebhookPayload,
  NotificationSettings,
  NotificationChannel,
  NtfyConfig,
  NtfyNotificationChannel,
} from "@pluto/interfaces";
import { logger } from "@pluto/logger";

const SETTINGS_DB = "pluto_core";
const SETTINGS_LIST_KEY = "settings:notifications";
const SETTINGS_OBJECT_KEY = "global";

const THROTTLE_LIST_KEY = "notifications:throttle";
const THROTTLE_OBJECT_KEY = "state";

const DEFAULT_REPEAT_INTERVAL_MINUTES = 60;

interface ThrottleState {
  lastSent?: Record<string, string>;
  dailyCount?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredNotificationSettings extends NotificationSettings {
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  channels: [],
};

function createInitialSettingsWithSecretTopic(): StoredNotificationSettings {
  const secret = randomBytes(12).toString("hex");
  const topic = `pluto-alerts-${secret}`;
  const now = new Date().toISOString();
  const ntfyChannel: NtfyNotificationChannel = {
    type: "ntfy",
    enabled: false,
    config: {
      serverUrl: "https://ntfy.sh",
      topic,
      auth: { type: "none" },
    },
  };
  return {
    enabled: false,
    channels: [ntfyChannel],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Return settings safe for API response: no raw password/token, only hasPassword/hasToken.
 */
function sanitizeForResponse(settings: NotificationSettings): NotificationSettings {
  return {
    ...settings,
    channels: settings.channels.map((ch): NotificationChannel => {
      if (ch.type !== "ntfy") return ch;
      const ntfy = ch as NtfyNotificationChannel;
      const config: NtfyConfig = { ...ntfy.config, auth: { ...ntfy.config.auth } };
      const auth = config.auth;
      if (auth.type === "basic") {
        const hasPassword = !!(auth.password ?? auth.hasPassword);
        config.auth = { type: "basic", username: auth.username, hasPassword };
      } else if (auth.type === "token") {
        const hasToken = !!(auth.token ?? auth.hasToken);
        config.auth = { type: "token", hasToken };
      }
      return { ...ntfy, config };
    }),
  };
}

/**
 * Merge credentials: if incoming channel omits password/token, keep existing from stored.
 */
function mergeCredentials(
  incoming: NotificationSettings,
  stored: NotificationSettings | null
): NotificationSettings {
  if (!stored || !stored.channels.length) return incoming;
  return {
    ...incoming,
    channels: incoming.channels.map((ch, i): NotificationChannel => {
      if (ch.type !== "ntfy") return ch;
      const existing = stored.channels[i] as NtfyNotificationChannel | undefined;
      if (!existing || existing.type !== "ntfy") return ch;
      const inc = ch as NtfyNotificationChannel;
      const auth = inc.config.auth;
      if (auth.type === "basic" && auth.password === undefined && existing.config.auth.type === "basic") {
        return {
          ...inc,
          config: {
            ...inc.config,
            auth: { ...auth, password: existing.config.auth.password, hasPassword: existing.config.auth.hasPassword ?? !!existing.config.auth.password },
          },
        };
      }
      if (auth.type === "token" && auth.token === undefined && existing.config.auth.type === "token") {
        return {
          ...inc,
          config: {
            ...inc.config,
            auth: { ...auth, token: existing.config.auth.token, hasToken: existing.config.auth.hasToken ?? !!existing.config.auth.token },
          },
        };
      }
      return ch;
    }),
  };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  let raw = await findOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY
  );
  if (!raw) {
    const initial = createInitialSettingsWithSecretTopic();
    await updateOne<StoredNotificationSettings>(
      SETTINGS_DB,
      SETTINGS_LIST_KEY,
      SETTINGS_OBJECT_KEY,
      initial
    );
    raw = initial;
  }
  const settings: NotificationSettings = raw ?? DEFAULT_SETTINGS;
  return sanitizeForResponse(settings);
}

export async function putNotificationSettings(
  incoming: NotificationSettings
): Promise<NotificationSettings> {
  const stored = await findOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY
  );
  const merged = mergeCredentials(incoming, stored ?? null);
  await updateOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY,
    merged
  );
  return sanitizeForResponse(merged);
}

/**
 * Send a plain text message to ntfy. Does not log credentials.
 */
async function sendNtfy(config: NtfyConfig, title: string, body: string): Promise<void> {
  const url = `${config.serverUrl.replace(/\/$/, "")}/${config.topic}`;
  const headers: Record<string, string> = {
    "Content-Type": "text/plain",
    Title: title,
    Priority: "default",
  };
  if (config.auth.type === "basic" && config.auth.username) {
    const token = config.auth.password
      ? Buffer.from(`${config.auth.username}:${config.auth.password}`).toString("base64")
      : "";
    if (token) headers.Authorization = `Basic ${token}`;
  } else if (config.auth.type === "token" && config.auth.token) {
    headers.Authorization = `Bearer ${config.auth.token}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) {
    throw new Error(`ntfy returned ${res.status}: ${res.statusText}`);
  }
}

export type SendTestResult = { sent: boolean; reason?: string };

export async function sendTestNotification(): Promise<SendTestResult> {
  const raw = await findOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY
  );
  const settings = raw ?? DEFAULT_SETTINGS;
  if (!settings.enabled || !settings.channels.length) {
    logger.warn("Test notification skipped: global notifications disabled or no channels configured");
    return { sent: false, reason: "Global notifications are disabled or no channels configured. Enable ntfy in Settings → Notifications and save." };
  }
  const ntfyChannels = settings.channels.filter(
    (ch): ch is NtfyNotificationChannel => ch.type === "ntfy" && !!ch.enabled
  );
  if (ntfyChannels.length === 0) {
    logger.warn("Test notification skipped: no enabled ntfy channel");
    return { sent: false, reason: "No enabled ntfy channel. Add an ntfy channel, enable it, and save." };
  }
  for (const ntfyCh of ntfyChannels) {
    const topic = ntfyCh.config?.topic?.trim();
    if (!topic) {
      logger.warn("Test notification skipped: ntfy topic is empty");
      return { sent: false, reason: "ntfy topic is empty. Set a topic in Settings → Notifications and save." };
    }
    try {
      logger.info("Sending test notification to ntfy", { serverUrl: ntfyCh.config.serverUrl, topic });
      await sendNtfy(ntfyCh.config, "Pluto test", "Notification test from Pluto.");
      logger.info("Test notification sent successfully", { topic });
      return { sent: true };
    } catch (err) {
      logger.error("Failed to send test notification to ntfy", { error: err, serverUrl: ntfyCh.config.serverUrl, topic: ntfyCh.config.topic });
      throw err;
    }
  }
  return { sent: false, reason: "No ntfy channel could be used." };
}

/**
 * Send alert message to all enabled ntfy channels. Used by webhook handler.
 * Does not log credentials.
 */
export async function sendAlertToChannels(title: string, body: string): Promise<void> {
  const raw = await findOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY
  );
  const settings = raw ?? DEFAULT_SETTINGS;
  if (!settings.enabled || !settings.channels.length) return;
  for (const ch of settings.channels) {
    if (ch.type !== "ntfy" || !ch.enabled) continue;
    const ntfyCh = ch as NtfyNotificationChannel;
    try {
      await sendNtfy(ntfyCh.config, title, body);
    } catch (err) {
      logger.error("Failed to send alert to ntfy channel", { error: err });
      // Continue to other channels
    }
  }
}

async function getThrottleState(): Promise<ThrottleState> {
  const state = await findOne<ThrottleState>(
    SETTINGS_DB,
    THROTTLE_LIST_KEY,
    THROTTLE_OBJECT_KEY
  );
  return {
    lastSent: state?.lastSent ?? {},
    dailyCount: state?.dailyCount ?? {},
  };
}

async function updateThrottleState(updates: { lastSent?: Record<string, string>; dailyCount?: Record<string, number> }): Promise<void> {
  const current = await getThrottleState();
  const lastSent = { ...current.lastSent, ...updates.lastSent };
  const dailyCount = { ...current.dailyCount };
  if (updates.dailyCount) {
    for (const [date, count] of Object.entries(updates.dailyCount)) {
      dailyCount[date] = (current.dailyCount?.[date] ?? 0) + count;
    }
  }
  await updateOne<ThrottleState>(
    SETTINGS_DB,
    THROTTLE_LIST_KEY,
    THROTTLE_OBJECT_KEY,
    { lastSent, dailyCount }
  );
}

function formatSingleAlert(alert: AlertmanagerAlert, payload: AlertmanagerWebhookPayload): { title: string; body: string } {
  const status = alert.status || payload.status || "firing";
  const title = alert.labels?.alertname ?? payload.commonLabels?.alertname ?? "Pluto Alert";
  const lines: string[] = [`Status: ${status}`];
  if (alert.labels && Object.keys(alert.labels).length > 0) {
    lines.push("Labels: " + Object.entries(alert.labels).map(([k, v]) => `${k}="${v}"`).join(", "));
  }
  if (alert.annotations?.description) lines.push(alert.annotations.description);
  if (alert.annotations?.summary) lines.push(alert.annotations.summary);
  return { title, body: lines.join("\n") };
}

/**
 * Process Alertmanager webhook with per-alert throttling and daily cap.
 * Resolved alerts are always sent (and do not count toward daily cap). Firing alerts are throttled
 * by repeatIntervalMinutes and optional maxMessagesPerDay.
 */
export async function processAlertmanagerWebhook(payload: AlertmanagerWebhookPayload): Promise<void> {
  const raw = await findOne<StoredNotificationSettings>(
    SETTINGS_DB,
    SETTINGS_LIST_KEY,
    SETTINGS_OBJECT_KEY
  );
  const settings = raw ?? DEFAULT_SETTINGS;
  if (!settings.enabled || !settings.channels.length) return;

  const repeatIntervalMinutes = settings.repeatIntervalMinutes ?? DEFAULT_REPEAT_INTERVAL_MINUTES;
  const maxMessagesPerDay = settings.maxMessagesPerDay ?? null;
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  for (const alert of payload.alerts ?? []) {
    const deviceMac = alert.labels?.device_mac ?? payload.commonLabels?.device_mac ?? "";
    const alertname = alert.labels?.alertname ?? payload.commonLabels?.alertname ?? "unknown";
    const throttleKey = `${deviceMac}:${alertname}`;
    const { title, body } = formatSingleAlert(alert, payload);

    if (alert.status === "resolved") {
      await sendAlertToChannels(title, body);
      continue;
    }

    const state = await getThrottleState();
    const lastSentAt = state.lastSent?.[throttleKey];
    if (lastSentAt) {
      const elapsedMinutes = (now - new Date(lastSentAt).getTime()) / (60 * 1000);
      if (elapsedMinutes < repeatIntervalMinutes) {
        logger.debug("Alert throttled (repeat interval)", { throttleKey, repeatIntervalMinutes, elapsedMinutes });
        continue;
      }
    }

    if (maxMessagesPerDay != null) {
      const countToday = state.dailyCount?.[today] ?? 0;
      if (countToday >= maxMessagesPerDay) {
        logger.debug("Alert skipped (daily cap reached)", { throttleKey, maxMessagesPerDay, countToday });
        continue;
      }
    }

    await sendAlertToChannels(title, body);
    await updateThrottleState({
      lastSent: { [throttleKey]: new Date(now).toISOString() },
      dailyCount: { [today]: 1 },
    });
  }
}
