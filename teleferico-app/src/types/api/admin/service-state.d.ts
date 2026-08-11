import type { ServiceStateValues, ServiceStatus } from "@/types";

export type ServiceStateAdminRequestPayload = {
  state: ServiceStateValues;
};

export type ServiceStateAdminApiResponse = {
  ok: boolean;
  message: string;
  data?: ServiceStatus;
};
