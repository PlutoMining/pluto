import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { RadioButton } from "@/components/RadioButton";

describe("RadioButton", () => {
  it("renders a labelled radio and respects defaultChecked (uncontrolled)", () => {
    const onChange = jest.fn();

    render(
      <>
        <RadioButton
          id="mode-auto"
          name="mode"
          value="auto"
          label="Auto"
          defaultChecked
        />
        <RadioButton
          id="mode-manual"
          name="mode"
          value="manual"
          label="Manual"
          onChange={onChange}
        />
      </>
    );

    const radio = screen.getByLabelText("Auto");
    expect(radio).toBeInTheDocument();
    expect(radio).toHaveAttribute("id", "mode-auto");
    expect(radio).toHaveAttribute("name", "mode");
    expect(radio).toHaveAttribute("value", "auto");
    expect(radio).toBeChecked();

    fireEvent.click(screen.getByLabelText("Manual"));
    expect(onChange).toHaveBeenCalledWith("manual");
  });

  it("calls onChange but does not update checked when controlled", () => {
    const onChange = jest.fn();

    render(
      <RadioButton
        id="mode-manual"
        name="mode"
        value="manual"
        label="Manual"
        checked={false}
        onChange={onChange}
      />
    );

    const radio = screen.getByRole("radio");
    expect(radio).not.toBeChecked();

    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith("manual");
    expect(radio).not.toBeChecked();
  });

  it("renders disabled state", () => {
    render(
      <RadioButton
        id="mode-off"
        name="mode"
        value="off"
        label="Off"
        disabled
      />
    );

    const radio = screen.getByRole("radio");
    expect(radio).toBeDisabled();
  });
});
