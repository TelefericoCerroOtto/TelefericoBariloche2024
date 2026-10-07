import { startLocalFeedbackStack } from "./start-local-feedback-stack.mjs";
import { rm } from "node:fs/promises";

export default async function globalSetup() {
  const stack = await startLocalFeedbackStack();
  return async () => {
    try {
      await stack.stop();
    } finally {
      const outputDir = process.env.FEEDBACK_LOCAL_OUTPUT_DIR;
      if (outputDir?.startsWith("/tmp/tb113-local-feedback-playwright-"))
        await rm(outputDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  };
}
