import type { Request } from "express";
import * as alertsController from "@/controllers/alerts.controller";

jest.mock("@/services/notifications.service", () => ({
  processAlertmanagerWebhook: jest.fn(),
}));

jest.mock("@/config/environment", () => ({
  config: { alertmanagerWebhookSecret: undefined as string | undefined },
}));

jest.mock("@pluto/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const notificationsService = jest.requireMock("@/services/notifications.service");
const environment = jest.requireMock("@/config/environment");

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("alerts.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    environment.config.alertmanagerWebhookSecret = undefined;
  });

  describe("postAlertmanagerWebhook", () => {
    it("returns 200 and processes webhook when payload valid", async () => {
      const payload = {
        status: "firing",
        alerts: [{ status: "firing", labels: { alertname: "DeviceOffline" }, annotations: {} }],
      };
      const req = { body: payload } as unknown as Request;
      const res = createMockResponse();
      notificationsService.processAlertmanagerWebhook.mockResolvedValue(undefined);

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(notificationsService.processAlertmanagerWebhook).toHaveBeenCalledTimes(1);
      expect(notificationsService.processAlertmanagerWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ status: "firing", alerts: expect.any(Array) })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "OK" });
    });

    it("returns 401 when secret configured and Authorization missing", async () => {
      environment.config.alertmanagerWebhookSecret = "secret123";
      const req = { headers: {}, body: {} } as unknown as Request;
      const res = createMockResponse();

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(notificationsService.processAlertmanagerWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 401 when secret configured and Bearer token wrong", async () => {
      environment.config.alertmanagerWebhookSecret = "secret123";
      const req = {
        headers: { authorization: "Bearer wrong" },
        body: { alerts: [] },
      } as unknown as Request;
      const res = createMockResponse();

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(notificationsService.processAlertmanagerWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 200 when secret matches", async () => {
      environment.config.alertmanagerWebhookSecret = "secret123";
      const req = {
        headers: { authorization: "Bearer secret123" },
        body: { alerts: [{ status: "firing", labels: {}, annotations: {} }] },
      } as unknown as Request;
      const res = createMockResponse();
      notificationsService.processAlertmanagerWebhook.mockResolvedValue(undefined);

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(notificationsService.processAlertmanagerWebhook).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when payload has no alerts array", async () => {
      const req = { body: {} } as unknown as Request;
      const res = createMockResponse();

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(notificationsService.processAlertmanagerWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid webhook payload" });
    });

    it("returns 500 when processAlertmanagerWebhook throws", async () => {
      const req = {
        body: { alerts: [{ status: "firing", labels: {}, annotations: {} }] },
      } as unknown as Request;
      const res = createMockResponse();
      notificationsService.processAlertmanagerWebhook.mockRejectedValue(new Error("ntfy down"));

      await alertsController.postAlertmanagerWebhook(req, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to process alert" });
    });
  });
});
