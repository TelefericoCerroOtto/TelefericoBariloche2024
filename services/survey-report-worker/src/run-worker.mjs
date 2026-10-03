import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL(".", import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = join(outputDirectory, "browsers");

const require = createRequire(import.meta.url);
const {
  createPlaywrightPdfRenderer,
  startConfiguredReportWorkerFromEnvironment,
} = require("./server.cjs");

let server;
try {
  server = startConfiguredReportWorkerFromEnvironment(process.env, {
    renderer: createPlaywrightPdfRenderer({
      fontPath: join(outputDirectory, "assets", "fonts", "DejaVuSans.ttf"),
    }),
  });
} catch {
  process.stderr.write(
    "Report worker startup failed: configuration unavailable.\n",
  );
  process.exitCode = 1;
}

if (server) {
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
