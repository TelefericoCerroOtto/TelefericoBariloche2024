import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

import {
  assertWorkspaceJobsPathConfinement,
  createWorkspace,
  importWorkspaceFiles,
  readWorkspaceJobsText,
  resolveWorkspaceItemInputPath,
  writeWorkspaceJobsText,
} from "./workspace-store";

test("workspace store imports files and persists jobs text", async () => {
  const workspace = await createWorkspace("Workspace store test");

  const imported = await importWorkspaceFiles(workspace.id, [
    {
      relativePath: "gallery/example.txt",
      buffer: Buffer.from("fixture"),
    },
  ]);

  expect(imported.items).toHaveLength(1);
  expect(imported.items[0]?.sourcePath).toBe("gallery/example.txt");

  const inputPath = await resolveWorkspaceItemInputPath(
    workspace.id,
    "gallery/example.txt",
  );
  const fileContent = await readFile(inputPath, "utf8");
  expect(fileContent).toBe("fixture");

  const jobsText = '{"jobs":[]}\n';
  await writeWorkspaceJobsText(workspace.id, jobsText);
  expect(await readWorkspaceJobsText(workspace.id)).toBe(jobsText);
});

test("workspace store rejects item paths that escape the workspace imports root", async () => {
  const workspace = await createWorkspace("Workspace path guard test");

  await expect(
    resolveWorkspaceItemInputPath(workspace.id, "../outside.png"),
  ).rejects.toThrow(/workspace imports root/i);
});

test.each(["../../escape", "nested/job"])(
  "workspace store rejects unsafe job names when resolving processed output (%s)",
  async (unsafeJobName) => {
    const workspace = await createWorkspace("Workspace output path guard test");

    expect(() =>
      assertWorkspaceJobsPathConfinement(workspace.id, {
        jobs: [
          {
            name: unsafeJobName,
            inputDir: "./imports",
            outputDir: "./processed",
            jobSubdir: true,
            preserveFolders: true,
            collisionPolicy: "suffix",
            defaults: {
              format: "webp",
              quality: 82,
              alignTo: 2,
              capToBase: true,
            },
            images: [{ file: "gallery/source.png", outputs: [{ name: "safe-slot", ratio: "1:1", mp: 1 }] }],
          },
        ],
      }),
    ).toThrow(/unsafe|workspace processed root/i);
  },
);
