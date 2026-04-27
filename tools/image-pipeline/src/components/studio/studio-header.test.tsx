// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { StudioHeader } from "./studio-header";

test("never renders processing banners in the header", () => {
  render(
    <StudioHeader
      status="Estudio listo."
      workspacesCount={2}
      itemCount={8}
      profileCount={3}
      onManageProfiles={vi.fn()}
    />,
  );

  expect(screen.queryByText("Generando jobs.json...")).not.toBeInTheDocument();
  expect(screen.getByText("Estudio listo.")).toBeInTheDocument();
});
