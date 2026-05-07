// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { FocalPointCanvas } from "./focal-point-canvas";

test("clicking the preview reports normalized focal-point coordinates", () => {
  const onChange = vi.fn();

  render(
    <FocalPointCanvas
      imageSrc="blob:preview"
      focalPoint={{ x: 0.5, y: 0.5 }}
      disabled={false}
      onChange={onChange}
    />,
  );

  const button = screen.getByRole("button");
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    top: 0,
    left: 0,
    right: 200,
    bottom: 100,
    toJSON: () => ({}),
  });

  fireEvent.click(button, { clientX: 50, clientY: 75 });

  expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.75 });
});
