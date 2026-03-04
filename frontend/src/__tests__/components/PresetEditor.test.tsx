import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";

import { PresetEditor } from "@/components/PresetEditor/PresetEditor";

jest.mock("axios");
jest.mock("uuid", () => ({ v4: () => "uuid-1" }));

jest.mock("@pluto/utils", () => ({
  validateDomain: jest.fn(),
  validateTCPPort: jest.fn(),
}));

const axiosMock = axios as unknown as {
  post: jest.Mock;
};

const utilsMock = jest.requireMock("@pluto/utils") as {
  validateDomain: jest.Mock;
  validateTCPPort: jest.Mock;
};

const fillRequiredFields = () => {
  fireEvent.change(screen.getByPlaceholderText("Enter preset name"), {
    target: { value: "My Preset" },
  });
  fireEvent.change(screen.getByLabelText("Pool URL"), {
    target: { value: "stratum+tcp://pool.example.com:3333" },
  });
  fireEvent.change(screen.getByLabelText("Pool User"), {
    target: { value: "user" },
  });
  fireEvent.change(screen.getByLabelText("Pool Password"), {
    target: { value: "pass" },
  });
};

describe("PresetEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.post = jest.fn();

    // default: validations pass
    utilsMock.validateDomain.mockReturnValue(true);
    utilsMock.validateTCPPort.mockReturnValue(true);

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));
  });

  it("validates inputs and saves preset successfully", async () => {
    const onCloseModal = jest.fn();
    const onCloseSuccessfullyModal = jest.fn();

    // First, fail a couple of validations to cover error branches.
    utilsMock.validateDomain.mockReturnValueOnce(false).mockReturnValue(true);

    axiosMock.post.mockResolvedValue({ data: {} });

    render(
      <PresetEditor
        onCloseModal={onCloseModal}
        onCloseSuccessfullyModal={onCloseSuccessfullyModal}
      />
    );

    const save = screen.getByRole("button", { name: "Save Preset" });
    expect(save).toBeDisabled();

    // invalid domain
    fireEvent.change(screen.getByLabelText("Pool URL"), { target: { value: "bad" } });
    expect(await screen.findByText("poolUrl is not correct.")).toBeInTheDocument();

    // invalid poolUser (contains a '.')
    fireEvent.change(screen.getByLabelText("Pool User"), { target: { value: "user.worker" } });
    expect(await screen.findByText("poolUser is not correct.")).toBeInTheDocument();

    fillRequiredFields();

    await waitFor(() => expect(save).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCloseModal).toHaveBeenCalledTimes(1);

    fireEvent.click(save);

    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledTimes(1));
    expect(axiosMock.post.mock.calls[0][0]).toBe("/api/presets");
    expect(axiosMock.post.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        uuid: "uuid-1",
        name: "My Preset",
        configuration: {
          pools: {
            groups: [
              {
                pools: [
                  {
                    url: "stratum+tcp://pool.example.com:3333",
                    user: "user",
                    password: "pass",
                  },
                ],
              },
            ],
          },
        },
      })
    );
    expect(onCloseSuccessfullyModal).toHaveBeenCalledTimes(1);
  });

  it("shows required validation when a field is cleared", async () => {
    render(
      <PresetEditor onCloseModal={jest.fn()} onCloseSuccessfullyModal={jest.fn()} />
    );

    const input = screen.getByLabelText("Pool URL");
    fireEvent.change(input, { target: { value: "pool.example.com" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(await screen.findByText("poolUrl is required.")).toBeInTheDocument();
  });

  it("keeps Save disabled when there are validation errors but no empty fields", async () => {
    utilsMock.validateDomain.mockReturnValue(false);

    render(
      <PresetEditor onCloseModal={jest.fn()} onCloseSuccessfullyModal={jest.fn()} />
    );

    fillRequiredFields();

    const save = screen.getByRole("button", { name: "Save Preset" });
    await waitFor(() => expect(save).toBeDisabled());
    expect(await screen.findByText("poolUrl is not correct.")).toBeInTheDocument();
  });

  it("shows an alert when save fails and allows dismissing it", async () => {
    const onCloseModal = jest.fn();
    const onCloseSuccessfullyModal = jest.fn();

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    axiosMock.post.mockRejectedValue(new Error("nope"));

    const { container } = render(
      <PresetEditor
        onCloseModal={onCloseModal}
        onCloseSuccessfullyModal={onCloseSuccessfullyModal}
      />
    );

    fillRequiredFields();
    const save = screen.getByRole("button", { name: "Save Preset" });
    await waitFor(() => expect(save).not.toBeDisabled());

    fireEvent.click(save);

    expect(await screen.findByText("Error Saving Preset")).toBeInTheDocument();
    expect(onCloseSuccessfullyModal).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    const closeSvg = container.querySelector("div.absolute.right-2.top-2 svg") as SVGSVGElement;
    expect(closeSvg).not.toBeNull();
    fireEvent.click(closeSvg);

    await waitFor(() => {
      expect(screen.queryByText("Error Saving Preset")).toBeNull();
    });

    errorSpy.mockRestore();
  });

  it("fetches presets when presetId is provided and blocks duplicate preset names", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    let jsonCalled = false;

    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => {
        jsonCalled = true;
        return {
          data: [
          {
            uuid: "preset-1",
            name: "Existing",
            configuration: {
              pools: {
                groups: [
                  {
                    pools: [
                      {
                        url: "stratum+tcp://pool.example.com:3333",
                        user: "user",
                        password: "pass",
                      },
                    ],
                  },
                ],
              },
            },
            associatedDevices: [],
          },
          {
            uuid: "preset-2",
            name: "Other",
            configuration: {
              pools: {
                groups: [
                  {
                    pools: [
                      {
                        url: "stratum+tcp://pool2.example.com:3333",
                        user: "user2",
                        password: "pass2",
                      },
                    ],
                  },
                ],
              },
            },
            associatedDevices: [],
          },
          ],
        };
      },
    }));

    render(
      <PresetEditor
        presetId="preset-1"
        onCloseModal={jest.fn()}
        onCloseSuccessfullyModal={jest.fn()}
      />
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith("/api/presets"));

    // Ensure fetchPreset awaited response.json() and set presets.
    await waitFor(() => {
      expect(jsonCalled).toBe(true);
    });

    fireEvent.change(screen.getByPlaceholderText("Enter preset name"), {
      target: { value: "Existing" },
    });

    expect(
      await screen.findByText(/A preset called "Existing" already exists\./)
    ).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("logs when preset fetch fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (global as any).fetch = jest.fn(async () => ({ ok: false }));

    render(
      <PresetEditor
        presetId="preset-1"
        onCloseModal={jest.fn()}
        onCloseSuccessfullyModal={jest.fn()}
      />
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to fetch presets"));
    errorSpy.mockRestore();
  });

  it("logs when preset fetch throws", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");

    (global as any).fetch = jest.fn(async () => {
      throw err;
    });

    render(
      <PresetEditor
        presetId="preset-1"
        onCloseModal={jest.fn()}
        onCloseSuccessfullyModal={jest.fn()}
      />
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Error fetching presets", err));
    errorSpy.mockRestore();
  });
});
