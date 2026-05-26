import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
