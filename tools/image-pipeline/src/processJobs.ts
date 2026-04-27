import { executeJobs } from "./core/render";

export type {
  CollisionPolicy,
  Defaults,
  ImageJob,
  JobConfig,
  JobsRoot,
  OutputJob,
  OutputJobWithId,
} from "./core/types";

export async function processJobs(params: {
  jobsPath: string;
  dryRun?: boolean;
}) {
  await executeJobs(params);
}
