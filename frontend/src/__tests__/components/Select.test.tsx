import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Select } from "@/components/Select/Select";

describe("Select", () => {
  it("renders options and forwards onChange when allowCustom is false", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Preset"
        name="preset"
        id="preset"
        optionValues={[
          { label: "One", value: 1 },
          { label: "Two", value: 2 },
        ]}
        onChange={onChange}
        defaultValue={1}
      />
    );

    const select = screen.getByRole("combobox", { name: "Preset" });
    fireEvent.change(select, { target: { value: "2" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((select as HTMLSelectElement).value).toBe("2");
  });

  it("supports entering a numeric custom value and emits a synthetic change", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Fan"
        name="fan"
        id="fan"
        allowCustom={true}
        optionValues={[{ label: "Auto", value: "0" }]}
        onChange={onChange}
        defaultValue={"0"}
      />
    );

    const select = screen.getByRole("combobox", { name: "Fan" });
    fireEvent.change(select, { target: { value: "__custom__" } });
    expect(onChange).not.toHaveBeenCalled();

    const custom = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(custom, { target: { value: "42" } });

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.target.name).toBe("fan");
    expect(last.target.value).toBe("42");

    const callsBeforeInvalid = onChange.mock.calls.length;
    fireEvent.change(custom, { target: { value: "42.5" } });
    // non-integer values should be ignored by emitCustomValue
    expect(onChange).toHaveBeenCalledTimes(callsBeforeInvalid);

    // cover the onBlur -> commitCustomValue path (empty value should be ignored)
    fireEvent.blur(custom, { target: { value: "" } });
  });

  it("commits the custom value on blur", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Speed"
        name="speed"
        id="speed"
        allowCustom={true}
        optionValues={[{ label: "Auto", value: "0" }]}
        onChange={onChange}
        defaultValue={"0"}
      />
    );

    const select = screen.getByRole("combobox", { name: "Speed" });
    fireEvent.change(select, { target: { value: "__custom__" } });

    const custom = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(custom, { target: { value: "88" } });

    const before = onChange.mock.calls.length;
    fireEvent.blur(custom, { target: { value: "88" } });
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(before);
  });

  it("opens and closes the custom editor with keyboard controls", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Mode"
        name="mode"
        id="mode"
        allowCustom={true}
        optionValues={[{ label: "One", value: "1" }]}
        onChange={onChange}
        defaultValue={"1"}
      />
    );

    const select = screen.getByRole("combobox", { name: "Mode" });
    fireEvent.change(select, { target: { value: "__custom__" } });
    const custom = screen.getByRole("spinbutton");
    expect(custom).toBeInTheDocument();

    fireEvent.keyDown(custom, { key: "Escape" });
    expect(screen.queryByRole("spinbutton")).toBeNull();

    fireEvent.change(select, { target: { value: "__custom__" } });
    const custom2 = screen.getByRole("spinbutton");

    fireEvent.change(custom2, { target: { value: "77" } });
    fireEvent.keyDown(custom2, { key: "Enter" });

    expect(onChange).toHaveBeenCalled();
    // select should now include/hold the custom value
    expect((select as HTMLSelectElement).value).toBe("77");
  });

  it("closes custom mode when selecting a predefined option", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Level"
        name="level"
        id="level"
        allowCustom={true}
        optionValues={[
          { label: "One", value: "1" },
          { label: "Two", value: "2" },
        ]}
        onChange={onChange}
        defaultValue={"1"}
      />
    );

    const select = screen.getByRole("combobox", { name: "Level" });
    fireEvent.change(select, { target: { value: "__custom__" } });
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "2" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("shows the custom editor when a controlled value is not in the base options", () => {
    const onChange = jest.fn();

    render(
      <Select
        label="Speed"
        name="speed"
        id="speed"
        allowCustom={true}
        optionValues={[{ label: "10", value: 10 }]}
        onChange={onChange}
        value={99}
      />
    );

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: "Speed" });
    expect((select as HTMLSelectElement).value).toBe("99");
    expect(screen.getByRole("option", { name: "99 (custom)" })).toBeInTheDocument();
  });
});
