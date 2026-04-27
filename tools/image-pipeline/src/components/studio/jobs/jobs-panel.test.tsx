// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { JobsPanel } from "./jobs-panel";

test("shows pending jobs feedback and disables related controls", () => {
  render(
    <JobsPanel
      jobsText='{"version":1}'
      isBusy
      pendingAction="generate"
      onChange={vi.fn()}
      onGenerate={vi.fn(async () => undefined)}
      onValidate={vi.fn(async () => undefined)}
      onRehydrate={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Generando jobs.json...");
  expect(screen.getByRole("button", { name: "Generando..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Validar JSON" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Guardar y recargar" })).toBeDisabled();
  expect(screen.getByLabelText("jobs.json")).toBeDisabled();
});
