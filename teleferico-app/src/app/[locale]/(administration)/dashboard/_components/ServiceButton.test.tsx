import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceButton from "./ServiceButton";

const mocks = vi.hoisted(() => ({
  useServiceState: vi.fn(),
}));

vi.mock("@/hooks", () => ({ useServiceState: mocks.useServiceState }));
vi.mock("@/components", () => ({
  DropdownCablecarMenu: ({
    children,
  }: {
    children: (_isLoading: boolean) => ReactNode;
  }) => createElement("div", { "data-testid": "change-menu" }, children(false)),
}));
vi.mock("@heroui/react", () => ({
  Button: ({ children }: { children: ReactNode }) =>
    createElement("button", null, children),
  Tooltip: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));

describe("ServiceButton", () => {
  beforeEach(() => {
    mocks.useServiceState.mockReset();
    mocks.useServiceState.mockReturnValue({
      serviceState: { data: { state: "conditional" } },
      isError: false,
      isLoading: false,
    });
  });

  it.each([
    "Operations Supervisor",
    "Digital Experience Operator",
    "Media Manager",
    "Recruiter",
    "Authenticated",
    "Public",
  ] as const)("shows the actual state without an edit menu to %s", (role) => {
    render(<ServiceButton currentRole={role} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Estado del servicio: Condicional",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("change-menu")).not.toBeInTheDocument();
  });

  it("keeps the change menu available to Administrator", () => {
    render(<ServiceButton currentRole="Administrator" />);

    expect(screen.getByTestId("change-menu")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Estado del servicio" }),
    ).toBeInTheDocument();
  });

  it("does not present an invented state when the read fails", () => {
    mocks.useServiceState.mockReturnValue({
      serviceState: undefined,
      isError: true,
      isLoading: false,
    });

    render(<ServiceButton currentRole="Digital Experience Operator" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Estado del servicio: No disponible",
    );
  });
});
