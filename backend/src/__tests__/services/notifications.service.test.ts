import type { NtfyNotificationChannel } from "@pluto/interfaces";
import * as notificationsService from "@/services/notifications.service";

jest.mock("@pluto/db", () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("@pluto/logger", () => ({
  logger: { error: jest.fn() },
}));

const db = jest.requireMock("@pluto/db");

describe("notifications.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotificationSettings", () => {
    it("returns default when nothing stored", async () => {
      db.findOne.mockResolvedValue(null);

      const result = await notificationsService.getNotificationSettings();

      expect(result).toEqual({ enabled: false, channels: [] });
    });

    it("returns sanitized settings without raw password or token", async () => {
      const stored = {
        enabled: true,
        channels: [
          {
            type: "ntfy",
            enabled: true,
            config: {
              serverUrl: "https://ntfy.sh",
              topic: "alerts",
              auth: { type: "basic", username: "u", password: "secret" },
            },
          } as NtfyNotificationChannel,
        ],
      };
      db.findOne.mockResolvedValue(stored);

      const result = await notificationsService.getNotificationSettings();

      expect(result.enabled).toBe(true);
      expect(result.channels).toHaveLength(1);
      const ch = result.channels[0] as NtfyNotificationChannel;
      expect(ch.type).toBe("ntfy");
      expect(ch.config.auth).toEqual({ type: "basic", username: "u", hasPassword: true });
      expect((ch.config.auth as { password?: string }).password).toBeUndefined();
    });

    it("sanitizes token auth to hasToken", async () => {
      const stored = {
        enabled: true,
        channels: [
          {
            type: "ntfy",
            enabled: true,
            config: {
              serverUrl: "https://ntfy.sh",
              topic: "alerts",
              auth: { type: "token", token: "secret-token" },
            },
          } as NtfyNotificationChannel,
        ],
      };
      db.findOne.mockResolvedValue(stored);

      const result = await notificationsService.getNotificationSettings();

      const ch = result.channels[0] as NtfyNotificationChannel;
      expect(ch.config.auth).toEqual({ type: "token", hasToken: true });
      expect((ch.config.auth as { token?: string }).token).toBeUndefined();
    });
  });

  describe("putNotificationSettings", () => {
    it("merges credentials when password omitted", async () => {
      const existing = {
        enabled: true,
        channels: [
          {
            type: "ntfy",
            enabled: true,
            config: {
              serverUrl: "https://ntfy.sh",
              topic: "alerts",
              auth: { type: "basic", username: "u", password: "existing-pass" },
            },
          } as NtfyNotificationChannel,
        ],
      };
      db.findOne.mockResolvedValue(existing);
      db.updateOne.mockImplementation((_a: string, _b: string, _c: string, doc: unknown) =>
        Promise.resolve(doc)
      );

      const incoming = {
        enabled: true,
        channels: [
          {
            type: "ntfy",
            enabled: true,
            config: {
              serverUrl: "https://ntfy.sh",
              topic: "alerts",
              auth: { type: "basic", username: "u" },
            },
          } as NtfyNotificationChannel,
        ],
      };

      await notificationsService.putNotificationSettings(incoming);

      expect(db.updateOne).toHaveBeenCalled();
      const merged = (db.updateOne as jest.Mock).mock.calls[0][3];
      const ntfy = merged.channels[0] as NtfyNotificationChannel;
      expect(ntfy.config.auth).toMatchObject({ type: "basic", username: "u" });
      expect((ntfy.config.auth as { password?: string }).password).toBe("existing-pass");
    });

    it("writes to correct list and object key", async () => {
      db.findOne.mockResolvedValue(null);
      db.updateOne.mockResolvedValue({});

      await notificationsService.putNotificationSettings({
        enabled: false,
        channels: [],
      });

      expect(db.findOne).toHaveBeenCalledWith("pluto_core", "settings:notifications", "global");
      expect(db.updateOne).toHaveBeenCalledWith(
        "pluto_core",
        "settings:notifications",
        "global",
        expect.any(Object)
      );
    });
  });

  describe("sendTestNotification", () => {
    it("does nothing when settings disabled or no channels", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
      db.findOne.mockResolvedValue({ enabled: false, channels: [] });

      await notificationsService.sendTestNotification();

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("sends POST to ntfy when enabled channel exists", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
      db.findOne.mockResolvedValue({
        enabled: true,
        channels: [
          {
            type: "ntfy",
            enabled: true,
            config: {
              serverUrl: "https://ntfy.sh",
              topic: "pluto-test",
              auth: { type: "none" },
            },
          } as NtfyNotificationChannel,
        ],
      });

      await notificationsService.sendTestNotification();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://ntfy.sh/pluto-test",
        expect.objectContaining({
          method: "POST",
          body: "Notification test from Pluto.",
          headers: expect.objectContaining({
            Title: "Pluto test",
            "Content-Type": "text/plain",
          }),
        })
      );
      fetchSpy.mockRestore();
    });
  });
});
