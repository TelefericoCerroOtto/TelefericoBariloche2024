import { expect, test } from "vitest";

import { createWorkspace } from "@/lib/server/workspace-store";
import { POST } from "./route";

test("import route rejects non-image uploads with a validation error", async () => {
  const workspace = await createWorkspace("Import route validation");
  const formData = new FormData();
  formData.append("files", new File(["notes"], "notes.txt", { type: "text/plain" }));

  const response = await POST(
    new Request("http://localhost/api/import", { method: "POST", body: formData }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/image files/i),
  });
});
