import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createElement,
  type ButtonHTMLAttributes,
  type ChangeEventHandler,
  type FocusEventHandler,
  type ReactNode,
} from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace, refresh, signIn, update } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn,
  useSession: () => ({ update }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/es-AR/login",
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/shared", () => ({
  ButtonDos: ({
    children,
    fullWidth: _fullWidth,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) =>
    createElement("button", props, children),
  FormError: ({ message }: { message: string }) =>
    createElement("div", null, message),
}));

vi.mock("@heroui/react", () => ({
  Alert: () => null,
  Input: ({
    id,
    isDisabled,
    label,
    name,
    onBlur,
    onChange,
    type,
    value,
  }: {
    id: string;
    isDisabled?: boolean;
    label: ReactNode;
    name: string;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    type?: string;
    value?: string;
  }) => createElement(
    "label",
    { htmlFor: id },
    label,
    createElement("input", {
      disabled: isDisabled,
      id,
      name,
      onBlur,
      onChange,
      type,
      value,
    }),
  ),
  Spinner: () => createElement("span", null, "Loading"),
}));

import LoginForm from "./LoginForm";

describe("LoginForm hydration gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn.mockResolvedValue({ error: null });
    update.mockResolvedValue(undefined);
  });

  it("server-renders identifier, password, and submit controls disabled", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(createElement(LoginForm));

    expect(container.querySelector("form")).toHaveAttribute(
      "data-login-hydrated",
      "false",
    );
    expect(
      container.querySelector<HTMLInputElement>("#identifier")?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>("#password")?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
  });

  it("enables controls after hydration", async () => {
    render(createElement(LoginForm));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Acceder" })).toBeEnabled(),
    );
    expect(screen.getByLabelText("Correo Electrónico")).toBeEnabled();
    expect(screen.getByLabelText("Contraseña")).toBeEnabled();
    expect(document.querySelector("form")).toHaveAttribute(
      "data-login-hydrated",
      "true",
    );
  });

  it("preserves the credentials sign-in and successful navigation flow", async () => {
    render(createElement(LoginForm));
    const identifier = screen.getByLabelText("Correo Electrónico");
    const password = screen.getByLabelText("Contraseña");
    const submit = screen.getByRole("button", { name: "Acceder" });
    await waitFor(() => expect(submit).toBeEnabled());

    fireEvent.change(identifier, { target: { value: "admin@real-auth.invalid" } });
    fireEvent.change(password, { target: { value: "synthetic-password" } });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("credentials", {
        identifier: "admin@real-auth.invalid",
        password: "synthetic-password",
        redirect: false,
      }),
    );
    expect(update).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
