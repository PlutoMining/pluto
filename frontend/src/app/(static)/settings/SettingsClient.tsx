"use client";
/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
 */

import type {
  NotificationSettings,
  NtfyAuthBasic,
  NtfyAuthNone,
  NtfyAuthToken,
  NtfyConfig,
  NtfyNotificationChannel,
} from "@pluto/interfaces";
import { Select } from "@/components/Select";
import { useTheme } from "next-themes";
import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import axios from "axios";
import Button from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";

type ColorMode = "system" | "light" | "dark";

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  channels: [],
};

export default function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [selectedColorMode, setSelectedColorMode] = useState<ColorMode>("system");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [ntfyEnabled, setNtfyEnabled] = useState(false);
  const [ntfyServerUrl, setNtfyServerUrl] = useState("https://ntfy.sh");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [ntfyAuthType, setNtfyAuthType] = useState<"none" | "basic" | "token">("none");
  const [ntfyUsername, setNtfyUsername] = useState("");
  const [ntfyPassword, setNtfyPassword] = useState("");
  const [ntfyToken, setNtfyToken] = useState("");
  const [repeatIntervalMinutes, setRepeatIntervalMinutes] = useState(60);
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const colorModes = [
    { value: "system", label: "System Theme" },
    { value: "dark", label: "Dark Theme" },
    { value: "light", label: "Light Theme" },
  ];

  useEffect(() => {
    if (theme === "system" || theme === "light" || theme === "dark") {
      setSelectedColorMode(theme);
    }
  }, [theme]);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const { data } = await axios.get<{ data: NotificationSettings }>(
        "/api/settings/notifications"
      );
      const s = data.data ?? DEFAULT_NOTIFICATION_SETTINGS;
      setNotificationSettings(s);
      const ntfy = s.channels?.find((c) => c.type === "ntfy") as NtfyNotificationChannel | undefined;
      if (ntfy) {
        setNtfyEnabled(ntfy.enabled);
        setNtfyServerUrl(ntfy.config?.serverUrl ?? "https://ntfy.sh");
        setNtfyTopic(ntfy.config?.topic ?? "");
        const auth = ntfy.config?.auth;
        if (auth?.type === "basic") {
          setNtfyAuthType("basic");
          setNtfyUsername((auth as NtfyAuthBasic).username ?? "");
        } else if (auth?.type === "token") {
          setNtfyAuthType("token");
        } else {
          setNtfyAuthType("none");
        }
      }
      setRepeatIntervalMinutes(s.repeatIntervalMinutes ?? 60);
      setMaxMessagesPerDay(s.maxMessagesPerDay ?? null);
    } catch {
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, []);

  useEffect(() => {
    loadNotificationSettings();
  }, [loadNotificationSettings]);

  const handleColorModeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const next: ColorMode = val === "light" || val === "dark" || val === "system" ? val : "system";
    setSelectedColorMode(next);
    setTheme(next);
  }, [setTheme]);

  const handleSaveNotifications = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const auth: NtfyAuthNone | NtfyAuthBasic | NtfyAuthToken =
        ntfyAuthType === "basic"
          ? { type: "basic", username: ntfyUsername, password: ntfyPassword || undefined }
          : ntfyAuthType === "token"
            ? { type: "token", token: ntfyToken || undefined }
            : { type: "none" };
      const config: NtfyConfig = { serverUrl: ntfyServerUrl, topic: ntfyTopic, auth };
      const ntfyChannel: NtfyNotificationChannel = {
        type: "ntfy",
        enabled: ntfyEnabled,
        config,
      };
      const otherChannels = (notificationSettings.channels ?? []).filter((c) => c.type !== "ntfy");
      const hasEnabledChannel = ntfyEnabled || otherChannels.some((c) => (c as { enabled?: boolean }).enabled);
      await axios.put("/api/settings/notifications", {
        enabled: hasEnabledChannel,
        channels: [ntfyChannel, ...otherChannels],
        repeatIntervalMinutes,
        maxMessagesPerDay,
      });
      setSaveStatus("success");
      await loadNotificationSettings();
    } catch {
      setSaveStatus("error");
    }
  }, [
    ntfyEnabled,
    ntfyServerUrl,
    ntfyTopic,
    ntfyAuthType,
    ntfyUsername,
    ntfyPassword,
    ntfyToken,
    notificationSettings.enabled,
    notificationSettings.channels,
    repeatIntervalMinutes,
    maxMessagesPerDay,
    loadNotificationSettings,
  ]);

  const generateSecretTopic = useCallback(() => {
    const bytes = new Uint8Array(12);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    }
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    setNtfyTopic(`pluto-alerts-${hex}`);
  }, []);

  const handleTestNotification = useCallback(async () => {
    setTestStatus("sending");
    try {
      await axios.post("/api/settings/notifications/test");
      setTestStatus("success");
    } catch {
      setTestStatus("error");
    }
  }, []);

  return (
    <div className="flex-1 py-6">
      <div className="mx-auto w-full max-w-[var(--pluto-content-max)] px-4 md:px-8">
        <form className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 md:max-w-[640px]">
            <h2 className="font-heading text-lg font-medium uppercase text-muted-foreground">
              System settings
            </h2>
            <Select
              id="color-mode"
              label="Theme"
              name="theme"
              onChange={handleColorModeChange}
              value={selectedColorMode}
              optionValues={colorModes}
            />
          </div>

          <div className="flex flex-col gap-6 md:max-w-[640px]">
            <h2 className="font-heading text-lg font-medium uppercase text-muted-foreground">
              Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure a global notification channel (ntfy) for device alerts.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ntfyEnabled}
                onChange={(e) => setNtfyEnabled(e.target.checked)}
                className="h-4 w-4 rounded border border-input accent-primary"
              />
              <span className="text-sm">Enable ntfy channel</span>
            </label>
            <Input
              name="ntfyServerUrl"
              id="ntfyServerUrl"
              label="ntfy server URL"
              value={ntfyServerUrl}
              onChange={(e) => setNtfyServerUrl(e.target.value)}
              placeholder="https://ntfy.sh"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    name="ntfyTopic"
                    id="ntfyTopic"
                    label="Topic"
                    value={ntfyTopic}
                    onChange={(e) => setNtfyTopic(e.target.value)}
                    placeholder="pluto-alerts"
                  />
                </div>
                <Button
                  variant="outlined"
                  label="Generate secret"
                  onClick={generateSecretTopic}
                  type="button"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The topic is the secret: only subscribers with this topic see messages. Use a long
                random value (e.g. Generate secret) and do not share the subscription URL, since
                alerts may contain device identifiers.
              </p>
            </div>
            <h3 className="text-sm font-medium text-foreground">Alert throttling</h3>
            <div className="flex flex-col gap-1.5">
              <Select
                id="repeat-interval"
                label="Remind again after"
                name="repeatInterval"
                value={String(repeatIntervalMinutes)}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setRepeatIntervalMinutes(Number(e.target.value) || 60)
                }
                optionValues={[
                  { value: "15", label: "15 minutes" },
                  { value: "60", label: "1 hour" },
                  { value: "120", label: "2 hours" },
                  { value: "240", label: "4 hours" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                For the same device and same alert, no duplicate notification until this time has
                passed. Resolved alerts are always sent.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Select
                id="max-messages-per-day"
                label="Max notifications per day (ntfy.sh)"
                name="maxMessagesPerDay"
                value={maxMessagesPerDay == null ? "unlimited" : String(maxMessagesPerDay)}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value;
                  setMaxMessagesPerDay(v === "unlimited" ? null : Number(v) || null);
                }}
                optionValues={[
                  { value: "unlimited", label: "Unlimited" },
                  { value: "250", label: "250 (ntfy.sh free tier)" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Cap how many messages are sent to ntfy per day. Set to 250 to stay within ntfy.sh
                free tier.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                label={saveStatus === "saving" ? "Saving…" : "Save"}
                onClick={handleSaveNotifications}
                disabled={saveStatus === "saving"}
              />
              <Button
                variant="outlined"
                label={
                  testStatus === "sending"
                    ? "Sending…"
                    : testStatus === "success"
                      ? "Sent"
                      : testStatus === "error"
                        ? "Failed"
                        : "Test"
                }
                onClick={handleTestNotification}
                disabled={testStatus === "sending"}
              />
            </div>
            {saveStatus === "success" && (
              <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
            )}
            {saveStatus === "error" && (
              <p className="text-sm text-red-600 dark:text-red-400">Failed to save settings.</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
