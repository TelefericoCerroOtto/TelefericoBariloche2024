// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getImagePropsMock } = vi.hoisted(() => ({
  getImagePropsMock: vi.fn(),
}));

vi.mock("next/image", () => ({ getImageProps: getImagePropsMock }));

import NewsDetailImage from "./NewsDetailImage";
import type { Image as StrapiImageComponent, StrapiImage } from "@/types";

const createImage = (url: string, alternativeText: string) =>
  ({
    url,
    alternativeText,
    formats: {},
  }) as StrapiImage;

const createImageComponent = (url: string, alt: string) =>
  ({
    image: createImage(url, "Nested media alternative text"),
    alt,
  }) as StrapiImageComponent;

const renderImage = (props: ComponentProps<typeof NewsDetailImage>) =>
  renderToStaticMarkup(<NewsDetailImage {...props} />);

describe("NewsDetailImage", () => {
  beforeEach(() => {
    getImagePropsMock.mockReset();
    getImagePropsMock.mockImplementation(({ src, alt, sizes }) => ({
      props: {
        src: `optimized:${src}`,
        srcSet: `optimized:${src} 100w`,
        alt,
        sizes,
      },
    }));
  });

  it("uses the matching optional image at each breakpoint and prefers desktop alt text", () => {
    const cover = createImage("/cover.jpg", "Cover alternative text");
    const mobile = createImageComponent("/mobile.jpg", "Mobile alt text");
    const desktop = createImageComponent("/desktop.jpg", "Desktop alt text");

    const markup = renderImage({
      cover,
      detailImageMobile: mobile,
      detailImageDesktop: desktop,
    });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/desktop.jpg",
      "/mobile.jpg",
    ]);
    expect(markup).toContain(
      '<source media="(min-width: 768px)" srcSet="optimized:/desktop.jpg 100w"',
    );
    expect(markup).toContain(
      '<source media="(max-width: 767px)" srcSet="optimized:/mobile.jpg 100w"',
    );
    expect(markup).toContain('alt="Desktop alt text"');
    expect(markup).toContain("object-cover");
  });

  it("falls back to cover for both breakpoints when optional images are absent", () => {
    const cover = createImage("/cover.jpg", "Cover alternative text");

    const markup = renderImage({ cover });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/cover.jpg",
      "/cover.jpg",
    ]);
    expect(markup.match(/optimized:\/cover\.jpg 100w/g)).toHaveLength(2);
    expect(markup).toContain('alt="Cover alternative text"');
  });

  it("falls back to cover on mobile without replacing the desktop image", () => {
    const markup = renderImage({
      cover: createImage("/cover.jpg", "Cover alternative text"),
      detailImageDesktop: createImageComponent("/desktop.jpg", "Desktop alt"),
    });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/desktop.jpg",
      "/cover.jpg",
    ]);
    expect(markup).toContain("optimized:/desktop.jpg 100w");
    expect(markup).toContain("optimized:/cover.jpg 100w");
  });

  it("falls back to cover on desktop without replacing the mobile image", () => {
    const markup = renderImage({
      cover: createImage("/cover.jpg", "Cover alternative text"),
      detailImageMobile: createImageComponent("/mobile.jpg", "Mobile alt"),
    });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/cover.jpg",
      "/mobile.jpg",
    ]);
    expect(markup).toContain("optimized:/cover.jpg 100w");
    expect(markup).toContain("optimized:/mobile.jpg 100w");
    expect(markup).toContain('alt="Mobile alt"');
  });

  it("falls back to mobile, then cover alt text when the desktop alt is empty", () => {
    const markup = renderImage({
      cover: createImage("/cover.jpg", "Cover alternative text"),
      detailImageMobile: createImageComponent("/mobile.jpg", "Mobile alt"),
      detailImageDesktop: createImageComponent("/desktop.jpg", ""),
    });

    expect(markup).toContain('alt="Mobile alt"');
  });

  it("uses the existing generic alt text when every asset has empty alt text", () => {
    const markup = renderImage({
      cover: createImage("/cover.jpg", ""),
    });

    expect(markup).toContain('alt="News cover image"');
  });

  it("uses the cover alt when the component media is missing despite a stale component alt", () => {
    const desktopWithoutMedia = {
      alt: "Stale desktop alt",
    } as StrapiImageComponent;
    const markup = renderImage({
      cover: createImage("/cover.jpg", "Cover alt"),
      detailImageDesktop: desktopWithoutMedia,
    });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/cover.jpg",
      "/cover.jpg",
    ]);
    expect(markup).toContain('alt="Cover alt"');
    expect(markup).not.toContain("Stale desktop alt");
  });

  it("falls back to the cover on mobile when its component has no nested media", () => {
    const mobileWithoutMedia = {
      alt: "Mobile semantic alt",
    } as StrapiImageComponent;
    const markup = renderImage({
      cover: createImage("/cover.jpg", "Cover alt"),
      detailImageMobile: mobileWithoutMedia,
      detailImageDesktop: createImageComponent("/desktop.jpg", "Desktop alt"),
    });

    expect(getImagePropsMock.mock.calls.map(([props]) => props.src)).toEqual([
      "/desktop.jpg",
      "/cover.jpg",
    ]);
    expect(markup).toContain('alt="Desktop alt"');
  });
});
