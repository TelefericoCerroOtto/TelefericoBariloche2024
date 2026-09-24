// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { blockRendererMock } = vi.hoisted(() => ({
  blockRendererMock: vi.fn((props?: { content?: unknown; className?: string }) => (
    <div
      data-testid="rich-text"
      className={props?.className}
      data-content={JSON.stringify(props?.content)}
    >
      <p>
        Special <strong>offer</strong> <em>today</em>{" "}
        <a href="https://example.test/pricing">details</a>
      </p>
      <h3>Included details</h3>
      <ul>
        <li>First detail</li>
      </ul>
      <blockquote>Visitor quote</blockquote>
      <pre>
        <code>Example</code>
      </pre>
    </div>
  )),
}));

vi.mock("@/components", () => ({
  BlockRendererClient: blockRendererMock,
  CustomLink: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import EditorialAlert from "../EditorialAlert";

const richText = [
  {
    type: "paragraph",
    children: [
      { type: "text", text: "Special offer", bold: true },
      {
        type: "link",
        url: "/pricing",
        children: [{ type: "text", text: "details" }],
      },
    ],
  },
] as const;

describe("EditorialAlert", () => {
  beforeEach(() => blockRendererMock.mockClear());

  it.each([
    ["default", "text-foreground/70", "bg-background"],
    ["promotion", "text-background", "bg-foreground"],
    ["warning", "text-background", "bg-custom-red"],
    ["info", "text-background", "bg-[#3B70CB]"],
  ] as const)(
    "renders the distinct editorial treatment for %s variant",
    (variant, iconColor, surfaceClass) => {
      render(
        <EditorialAlert
          id={12}
          title="Visitor notice"
          description={richText as never}
          variant={variant}
          epigraph="Visitor note"
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Visitor notice", level: 2 }),
      ).toBeTruthy();
      const section = screen.getByRole("region", { name: "Visitor notice" });
      const article = section.querySelector("article");
      expect(article?.dataset.variant).toBe(variant);
      expect(article?.className).toContain(surfaceClass);
      expect(article?.className).toContain("rounded-lg");
      expect(article?.className).not.toContain("rounded-3xl");
      expect(article?.className).toContain("max-w-[1536px]");
      expect(article?.className).toContain("p-3");
      expect(article?.className).toContain("sm:grid-cols-[2.75rem_minmax(0,1fr)]");
      expect(article?.className).toContain("md:grid-cols-[2.75rem_minmax(0,1fr)_auto]");
      if (variant !== "warning") {
        expect(article?.className).not.toContain("bg-custom-red");
      }
      const iconBadge = section.querySelector("span[aria-hidden='true']");
      expect(iconBadge?.className).toContain(
        variant === "promotion"
          ? "bg-background/10"
          : variant === "warning"
            ? "bg-background/10"
            : variant === "info"
              ? "bg-foreground/25"
              : "bg-foreground/5",
      );
      expect(iconBadge?.className).toContain("rounded-md");
      expect(iconBadge?.className).toContain("h-11 w-11");
      const heading = screen.getByRole("heading", {
        name: "Visitor notice",
        level: 2,
      });
      expect(heading.className).toContain("text-xl");
      expect(heading.className).toContain("sm:text-2xl");
      const epigraph = screen.getByText("Visitor note");
      expect(epigraph.className).toContain(
        variant === "default" ? "text-foreground/70" : "text-background",
      );
      if (variant === "warning" || variant === "info") {
        expect(epigraph.className).not.toContain("text-background/");
      }
      expect(section.querySelector("[role='alert']")).toBeNull();
      expect(
        section.querySelector("svg")?.classList.contains(iconColor),
      ).toBe(true);
      if (variant === "warning" || variant === "info") {
        expect(article?.className).toContain("text-background");
        expect(article?.className).not.toContain("text-background/");
        expect(section.querySelector("svg")?.getAttribute("class")).not.toContain(
          "text-background/",
        );
      }
      expect(iconBadge?.getAttribute("aria-hidden")).toBe("true");
      expect(screen.getByTestId("rich-text").textContent).toContain("Special offer");
      expect(blockRendererMock.mock.calls[0]?.[0]?.content).toBe(richText);
      const richTextContainer = screen.getByTestId("rich-text");
      expect(richTextContainer.dataset.content).toBe(JSON.stringify(richText));
      expect(richTextContainer.querySelector("strong")?.textContent).toBe("offer");
      expect(richTextContainer.querySelector("em")?.textContent).toBe("today");
      expect(richTextContainer.querySelector("ul li")?.textContent).toBe("First detail");
      expect(richTextContainer.querySelector("blockquote")?.textContent).toBe("Visitor quote");
      if (variant !== "default") {
        expect(article?.className).toContain("text-background");
        expect(richTextContainer.className).toContain("prose-invert");
        for (const selectorClass of [
          "[&_p]:!text-background",
          "[&_h3]:!text-background",
          "[&_strong]:!text-background",
          "[&_em]:!text-background",
          "[&_li]:!text-background",
          "[&_li::marker]:!text-background",
          "[&_blockquote]:!text-background",
          "[&_a]:!text-background",
          "[&_code]:!text-background",
          "[&_pre]:!text-background",
          "[&_ol]:!text-background",
          "[&_ul]:!text-background",
          "[&_td]:!text-background",
          "[&_th]:!text-background",
        ]) {
          expect(richTextContainer.className).toContain(selectorClass);
        }
        expect(richTextContainer.className).not.toContain("text-background/");
        expect(richTextContainer.querySelector("a")?.textContent).toBe("details");
      } else {
        expect(richTextContainer.className).toContain("[&_a]:text-foreground");
        expect(richTextContainer.className).not.toContain("text-primary");
      }
      expect(screen.getByRole("link", { name: "details" })).toBeTruthy();
    },
  );

  it("renders optional epigraph and safe CTA while rejecting unsafe schemes", () => {
    const { rerender } = render(
      <EditorialAlert
        id={13}
        title="Visitor notice"
        description={richText as never}
        variant="info"
        epigraph="Important update"
        link={{ label: "Read more", href: "/visit" }}
      />,
    );

    expect(screen.getByText("Important update")).toBeTruthy();
    const epigraph = screen.getByText("Important update");
    expect(epigraph.className).toContain("text-background");
    expect(epigraph.className).not.toContain("text-background/");

    for (const variant of ["default", "promotion", "warning", "info"] as const) {
      rerender(
        <EditorialAlert
          id={13}
          title="Visitor notice"
          description={richText as never}
          variant={variant}
          link={{ label: "Read more", href: "/visit" }}
        />,
      );
      const cta = screen.getByRole("link", { name: "Read more" });
      expect(cta.getAttribute("href")).toBe("/visit");
      expect(cta.className).toContain("text-sm");
      expect(cta.className).not.toContain("text-xl");
      expect(cta.className).toContain("font-bold");
      expect(cta.className).toContain("min-h-11");
      expect(cta.className).toContain("rounded-md");
      expect(cta.className).toContain("px-4 py-2");

      if (variant === "default") {
        expect(cta.className).toContain("border-foreground/40");
        expect(cta.className).toContain("focus-visible:ring-primary");
      } else if (variant === "promotion") {
        expect(cta.className).toContain("bg-[hsl(0_88%_49%)]");
        expect(cta.className).toContain("border-[hsl(0_88%_49%)]");
        expect(cta.className).toContain("focus-visible:ring-[hsl(0_88%_49%)]");
        expect(cta.className).not.toContain("bg-primary");
        expect(cta.className).toContain("text-white");
        expect(cta.className).not.toContain("text-black");
        expect(cta.className).toContain("focus-visible:ring-offset-foreground");
      } else if (variant === "warning") {
        expect(cta.className).toContain("bg-foreground");
        expect(cta.className).toContain("text-background");
        expect(cta.className).toContain("focus-visible:ring-background");
        expect(cta.className).toContain("focus-visible:ring-offset-custom-red");
      } else {
        expect(cta.className).toContain("bg-foreground");
        expect(cta.className).toContain("text-background");
        expect(cta.className).toContain("focus-visible:ring-background");
        expect(cta.className).toContain("focus-visible:ring-offset-[#3B70CB]");
      }
    }

    rerender(
      <EditorialAlert
        id={13}
        title="Visitor notice"
        description={richText as never}
        variant="warning"
        link={{ label: "Unsafe", href: "javascript:alert(1)" }}
      />,
    );

    expect(screen.queryByRole("link", { name: "Unsafe" })).toBeNull();
  });
});
