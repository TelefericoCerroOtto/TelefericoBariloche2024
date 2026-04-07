import type { FocalPoint, JobsRoot, OutputJobWithId } from "@/core/types";

export type StudioSlot = OutputJobWithId;

export type StudioProfile = {
  id: string;
  label: string;
  slots: StudioSlot[];
};

export type SlotProfileRegistry = {
  version: 1;
  updatedAt: string;
  profiles: StudioProfile[];
};

export type WorkspaceItem = {
  id: string;
  sourcePath: string;
  displayName: string;
  groupPath: string;
  focalPoint?: FocalPoint;
  profileId?: string;
  slotIds: string[];
};

export type WorkspaceManifest = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  importsDir: "imports";
  jobsFile: "jobs.json";
  processedDir: "processed";
  items: WorkspaceItem[];
};

export type WorkspaceSummary = {
  id: string;
  title: string;
  updatedAt: string;
  itemCount: number;
};

export type WorkspacePayload = {
  workspace: WorkspaceManifest;
  jobsText: string;
};

export type JobsDocument = {
  root: JobsRoot;
  text: string;
};
