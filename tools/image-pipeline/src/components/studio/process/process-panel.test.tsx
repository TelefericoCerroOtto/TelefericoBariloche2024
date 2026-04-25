// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { ProcessPanel } from "./process-panel";

test("shows processing feedback for dry runs and locks both actions", () => {
  render(
    <ProcessPanel
      logs={[]}
      outputs={[]}
      isRunning
      pendingMode="dryRun"
      onRun={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Ejecutando simulación...");
  expect(screen.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Simulando..." })).toBeDisabled();
});
