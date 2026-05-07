import type { BusTrip, Meta } from "@/types";

export type GetBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};

export type GetBusTripsResponse = {
  data: BusTrip[];
  meta: Meta;
};

export type PostBusTripRequest = {
  data: Pick<BusTrip, "depTime" | "arrTime" | "isVisible"> & {
    origin: {
      connect: [{ documentId: string }];
    };
    destination: {
      connect: [{ documentId: string }];
    };
  };
};

export type PostBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};

export type UpdateBusTripRequest = {
  data: Partial<
    Pick<BusTrip, "depTime" | "arrTime" | "isVisible"> & {
      origin: {
        connect: [{ documentId: string }];
      };
      destination: {
        connect: [{ documentId: string }];
      };
    }
  >;
};

export type UpdateBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};
