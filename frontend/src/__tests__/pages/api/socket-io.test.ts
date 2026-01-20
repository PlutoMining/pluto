import handler from "@/pages/api/socket/io";

jest.mock("socket.io", () => {
  const serverOn = jest.fn();
  const server = { on: serverOn };
  return {
    Server: jest.fn(() => server),
    __serverOn: serverOn,
  };
});

jest.mock("socket.io-client", () => {
  const listeners: Record<string, any> = {};
  const backendSocket = {
    on: jest.fn((event: string, cb: any) => {
      listeners[event] = cb;
      return backendSocket;
    }),
  };

  return {
    io: jest.fn(() => backendSocket),
    __listeners: listeners,
    __backendSocket: backendSocket,
  };
});

describe("pages/api/socket/io", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    const client = jest.requireMock("socket.io-client");
    Object.keys(client.__listeners).forEach((k) => delete client.__listeners[k]);

    process.env.BACKEND_DESTINATION_HOST = "http://backend";

    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("initializes the socket server once", () => {
    const req = {} as any;
    const res = {
      socket: {
        server: {},
      },
      end: jest.fn(),
    } as any;

    handler(req, res);
    handler(req, res);

    expect(consoleLogSpy).toHaveBeenNthCalledWith(1, "Initializing Socket.IO server...");
    expect(consoleLogSpy).toHaveBeenNthCalledWith(2, "Socket.IO server already initialized");

    const { Server } = jest.requireMock("socket.io");
    expect(Server).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalledTimes(2);
  });

  it("wires backend events to client socket", () => {
    const clientListeners: Record<string, any> = {};
    const clientSocket = {
      emit: jest.fn(),
      on: jest.fn((event: string, cb: any) => {
        clientListeners[event] = cb;
      }),
    };

    const { __serverOn } = jest.requireMock("socket.io");

    const req = {} as any;
    const res = {
      socket: {
        server: {},
      },
      end: jest.fn(),
    } as any;

    handler(req, res);

    expect(consoleLogSpy).toHaveBeenNthCalledWith(1, "Initializing Socket.IO server...");

    // Grab the connection callback registered on the Server.
    expect(__serverOn).toHaveBeenCalledWith("connection", expect.any(Function));
    const onConnection = __serverOn.mock.calls[0][1];

    onConnection(clientSocket);

    expect(consoleLogSpy).toHaveBeenNthCalledWith(2, "Client connected");

    const client = jest.requireMock("socket.io-client");
    client.__listeners.stat_update({ x: 1 });
    client.__listeners.device_removed({ y: 2 });
    client.__listeners.error({ z: 3 });

    // Cover backend socket lifecycle logs.
    client.__listeners.connect();
    client.__listeners.connect_error(new Error("nope"));
    client.__listeners.disconnect("transport close");

    // Cover client disconnect log.
    clientListeners.disconnect();

    expect(clientSocket.emit).toHaveBeenCalledWith("stat_update", { x: 1 });
    expect(clientSocket.emit).toHaveBeenCalledWith("device_removed", { y: 2 });
    expect(clientSocket.emit).toHaveBeenCalledWith("error", { z: 3 });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "backendSocket successfully connected to the backend"
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Connection error to backendSocket:",
      expect.any(Error)
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "backendSocket disconnected:",
      "transport close"
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("Client disconnected");
  });
});
