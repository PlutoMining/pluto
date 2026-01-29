import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Checkbox } from "@/components/Checkbox/Checkbox";

describe("Checkbox", () => {
  it("renders label and triggers onChange", () => {
    const onChange = jest.fn();

    render(
      <Checkbox id="agree" name="agree" label="Agree" defaultChecked={false} onChange={onChange} />
    );

    expect(screen.getByText("Agree")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not render label when omitted", () => {
    const onChange = jest.fn();

    render(<Checkbox id="x" name="x" onChange={onChange} />);

    expect(screen.queryByText("Agree")).toBeNull();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("supports column layout", () => {
    const onChange = jest.fn();
    render(
      <Checkbox
        id="col"
        name="col"
        label="Column"
        flexDir="column"
        defaultChecked={false}
        onChange={onChange}
      />
    );

    const wrapper = screen.getByText("Column").closest("label");
    expect(wrapper?.className).toContain("flex-col");
  });
});
