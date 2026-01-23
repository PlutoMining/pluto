import { render, screen } from "@testing-library/react";

import { MetaLogo, RedditLogo } from "@/components/icons/FooterIcons";

describe("FooterIcons", () => {
  it("sets rel when opening in a new tab", () => {
    render(
      <div>
        <MetaLogo url="https://example.com/meta" target="_blank" />
        <RedditLogo url="https://example.com/reddit" target="_blank" />
      </div>
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("rel", "noreferrer");
    expect(links[1]).toHaveAttribute("rel", "noreferrer");
  });

  it("omits rel when target is not _blank", () => {
    render(
      <div>
        <MetaLogo url="https://example.com/meta" target="_self" />
        <RedditLogo url="https://example.com/reddit" />
      </div>
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).not.toHaveAttribute("rel");
    expect(links[1]).not.toHaveAttribute("rel");
  });
});
