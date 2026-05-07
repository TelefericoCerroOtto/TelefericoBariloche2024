// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import {
  FOCAL_POINT_BUSY_LABEL,
  PREVIEW_REFRESH_BUSY_LABEL,
} from "@/components/studio/busy-labels";

import { PreviewPanel } from "./preview/preview-panel";
import { StudioHeader } from "./studio-header";
import { AssignmentPanel } from "./workspace/assignment-panel";
import { WorkspaceTree } from "./workspace/workspace-tree";

test("renders the preview refresh status only in the preview panel", () => {
  render(
    <>
      <StudioHeader
        status="Estudio listo."
        workspacesCount={1}
        itemCount={1}
        profileCount={1}
        onManageProfiles={vi.fn()}
      />
      <WorkspaceTree
        items={[]}
        selectedItemIds={[]}
        busyLabel={PREVIEW_REFRESH_BUSY_LABEL}
        onToggleSelected={vi.fn()}
        onSetActive={vi.fn()}
        onSetSelected={vi.fn()}
      />
      <AssignmentPanel
        registry={null}
        selectedItems={[]}
        isBusy={false}
        busyLabel={PREVIEW_REFRESH_BUSY_LABEL}
        onBulkAssign={vi.fn(async () => undefined)}
        onAssignActive={vi.fn(async () => undefined)}
      />
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
      />
    </>,
  );

  expect(screen.getAllByText(PREVIEW_REFRESH_BUSY_LABEL)).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent(PREVIEW_REFRESH_BUSY_LABEL);
});

test("does not render the focal point status in generic studio surfaces", () => {
  render(
    <>
      <StudioHeader
        status="Estudio listo."
        workspacesCount={1}
        itemCount={1}
        profileCount={1}
        onManageProfiles={vi.fn()}
      />
      <WorkspaceTree
        items={[]}
        selectedItemIds={[]}
        busyLabel={FOCAL_POINT_BUSY_LABEL}
        onToggleSelected={vi.fn()}
        onSetActive={vi.fn()}
        onSetSelected={vi.fn()}
      />
      <AssignmentPanel
        registry={null}
        selectedItems={[]}
        isBusy={false}
        busyLabel={FOCAL_POINT_BUSY_LABEL}
        onBulkAssign={vi.fn(async () => undefined)}
        onAssignActive={vi.fn(async () => undefined)}
      />
    </>,
  );

  expect(screen.queryByText(FOCAL_POINT_BUSY_LABEL)).not.toBeInTheDocument();
});
