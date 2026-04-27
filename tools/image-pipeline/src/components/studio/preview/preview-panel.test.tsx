// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { PreviewPanel } from "./preview-panel";

test("shows a loading overlay and disables focal-point inputs while refreshing", () => {
  render(
    <PreviewPanel
      activeItem={{
        id: "item-1",
        displayName: "hero.jpg",
        sourcePath: "hero.jpg",
        groupPath: "root",
        focalPoint: { x: 0.5, y: 0.5 },
        profileId: "profile-1",
        slotIds: ["slot-1"],
      }}
      activeSlotId="slot-1"
      availableSlots={[]}
      previewUrl="blob:preview"
      previewMeta={{ baseW: 1200, baseH: 800, outW: 800, outH: 600 }}
      isLoading
      isInteractionDisabled
      onSelectSlot={vi.fn()}
      onFocalPointChange={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Actualizando vista previa...");
  expect(screen.getByLabelText("Posición X")).toBeDisabled();
  expect(screen.getByLabelText("Posición Y")).toBeDisabled();
});

test("updates focal coordinates only when the draft value is committed", async () => {
  const onFocalPointChange = vi.fn(async () => undefined);

  render(
    <PreviewPanel
      activeItem={{
        id: "item-1",
        displayName: "hero.jpg",
        sourcePath: "hero.jpg",
        groupPath: "root",
        focalPoint: { x: 0.5, y: 0.5 },
        profileId: "profile-1",
        slotIds: ["slot-1"],
      }}
      activeSlotId="slot-1"
      availableSlots={[]}
      previewUrl="blob:preview"
      previewMeta={{ baseW: 1200, baseH: 800, outW: 800, outH: 600 }}
      isLoading={false}
      isInteractionDisabled={false}
      onSelectSlot={vi.fn()}
      onFocalPointChange={onFocalPointChange}
    />,
  );

  const inputX = screen.getByLabelText("Posición X");

  fireEvent.change(inputX, { target: { value: "650" } });
  expect(onFocalPointChange).not.toHaveBeenCalled();

  fireEvent.blur(inputX);

  expect(onFocalPointChange).toHaveBeenCalledOnce();
  expect(onFocalPointChange).toHaveBeenCalledWith({ x: 650 / 1200, y: 0.5 });
});

test("resets draft inputs when switching to another item with the same focal coordinates", () => {
  const props = {
    activeSlotId: "slot-1",
    availableSlots: [],
    previewUrl: "blob:preview",
    previewMeta: { baseW: 1200, baseH: 800, outW: 800, outH: 600 },
    isLoading: false,
    isInteractionDisabled: false,
    onSelectSlot: vi.fn(),
    onFocalPointChange: vi.fn(async () => undefined),
  };

  const { rerender } = render(
    <PreviewPanel
      {...props}
      activeItem={{
        id: "item-1",
        displayName: "hero.jpg",
        sourcePath: "hero.jpg",
        groupPath: "root",
        focalPoint: { x: 0.5, y: 0.5 },
        profileId: "profile-1",
        slotIds: ["slot-1"],
      }}
    />,
  );

  const inputX = screen.getByLabelText("Posición X") as HTMLInputElement;
  fireEvent.change(inputX, { target: { value: "650" } });
  expect(inputX.value).toBe("650");

  rerender(
    <PreviewPanel
      {...props}
      activeItem={{
        id: "item-2",
        displayName: "another-hero.jpg",
        sourcePath: "another-hero.jpg",
        groupPath: "root",
        focalPoint: { x: 0.5, y: 0.5 },
        profileId: "profile-1",
        slotIds: ["slot-1"],
      }}
    />,
  );

  expect(screen.getByLabelText("Posición X")).toHaveValue(600);
});
