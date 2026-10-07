// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OneImageProps } from "../../shared/types";

vi.mock("@/hooks", () => ({
  useLocale: () => ({ locale: "es-AR" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

import { Spotlight } from "./Spotlight";

function makeProps(overrides: Partial<OneImageProps> = {}): OneImageProps {
  return {
    variant: "spotlight",
    title: "Visitor experience",
    titleCase: "uppercase",
    bgColor: "none",
    description: [
      {
        type: "paragraph",
        children: [{ type: "text", text: "Explore the mountain." }],
      },
    ] as never,
    epigraph: "A memorable journey",
    desktopImages: [] as unknown as OneImageProps["desktopImages"],
    mobileImages: [] as unknown as OneImageProps["mobileImages"],
    ...overrides,
  };
}

describe("Spotlight", () => {
  it("renders title, divider, epigraph, description, then the navigational CTA", () => {
    const { container } = render(
      <Spotlight
        {...makeProps({
          link: {
            label: "Plan your visit",
            href: "https://example.test/visit",
          },
        })}
      />,
    );

    const content = container.querySelector(".max-w-xl");
    expect(content).not.toBeNull();
    expect(
      Array.from(content!.children).map((element) => element.tagName),
    ).toEqual(["H2", "DIV", "P", "P", "A"]);

    const divider = content!.children[1];
    expect(divider.getAttribute("aria-hidden")).toBe("true");
    expect(divider.className).toContain("block");
    expect(divider.className).toContain("w-12");
    expect(divider.className).not.toContain("md:hidden");

    const epigraph = screen.getByText("A memorable journey");
    expect(epigraph.className).not.toContain("rounded-full");
    expect(epigraph.className.split(/\s+/)).not.toContain("italic");

    const cta = screen.getByRole("link", { name: /Plan your visit/ });
    expect(cta.getAttribute("href")).toBe("https://example.test/visit");
    expect(cta.className).toContain("rounded-full");
    expect(cta.className).toContain("hover:shadow-md");
    expect(cta.className).not.toContain("hover:border-red-300");
    expect(cta.className).not.toContain("hover:bg-red-50");
    expect(cta.className).not.toContain("hover:text-red-800");
    expect(cta.className).toContain("focus-visible:ring-2");
    expect(cta.className).toContain("not-italic");
  });

  it("omits the divider and epigraph when the optional epigraph is absent", () => {
    const { container } = render(
      <Spotlight {...makeProps({ epigraph: null, link: null })} />,
    );

    expect(container.querySelector(".max-w-xl")?.children).toHaveLength(2);
    expect(screen.queryByText("A memorable journey")).toBeNull();
    expect(
      container.querySelector(".max-w-xl div[aria-hidden='true']"),
    ).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Explore the mountain.")).toBeTruthy();
  });
});
