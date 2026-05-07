import os from "node:os";
import path from "node:path";

import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Redirect .studio/ to a tmpdir so tests never pollute the project directory.
// Workspace IDs are UUIDs, so parallel test files don't collide.
// No cleanup needed — the OS manages tmpdir lifecycle.
process.env.IMAGE_PIPELINE_STUDIO_ROOT = path.join(os.tmpdir(), "image-pipeline-test-studio");

afterEach(() => {
  cleanup();
});
