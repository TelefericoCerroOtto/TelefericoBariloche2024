import type { Meta, ServiceStatus } from "@/types";

export type GetServiceStateResponse = {
  data: ServiceStatus;
  meta: Meta;
};

export type UpdateServiceStateResponse = GetServiceStateResponse;
