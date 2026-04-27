import { Command } from "commander";
import { processJobs } from "./processJobs";

const program = new Command();

program
  .requiredOption("--jobs <path>", "Path to jobs JSON (e.g. jobs.example.json)")
  .option(
    "--dry-run",
    "Print what would be generated without writing files",
    false,
  )
  .parse(process.argv);

const opts = program.opts<{ jobs: string; dryRun: boolean }>();

processJobs({ jobsPath: opts.jobs, dryRun: opts.dryRun }).catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});
