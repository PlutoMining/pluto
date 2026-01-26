import type { Request, Response } from "express";

import { checkIfRestarting } from "@/middlewares/checkIfRestarting";

describe("checkIfRestarting", () => {
  const mockRes = () =>
    ({
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }) as unknown as Response;

  it("blocks requests when restarting", () => {
    const req = { app: { locals: { isRestarting: true } } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    checkIfRestarting(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when not restarting", () => {
    const req = { app: { locals: { isRestarting: false } } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    checkIfRestarting(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
