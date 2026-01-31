import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { SearchInput } from "@/components/Input/SearchInput";

describe("SearchInput", () => {
  it("renders input and calls onChange", () => {
    const onChange = jest.fn();
    const { container } = render(
      <SearchInput label="Search" placeholder="Find" onChange={onChange} />
    );

    const input = screen.getByPlaceholderText("Find");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalled();

    expect(container.querySelector("svg")).not.toBeNull();
  });
});
