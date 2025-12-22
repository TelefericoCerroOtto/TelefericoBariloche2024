import {
  CreateBusTripFormData,
  GetBusTripResponse,
  PostBusTripRequest,
  UpdateBusTripFormData,
} from "@/types";
import { TimeValueToStrapiTime } from "../formats";

export const getBusTripAdapter = (
  busTrip: GetBusTripResponse,
): UpdateBusTripFormData => {
  const { origin, destination, depTime, arrTime, documentId } = busTrip.data;

  const [depHour, depMins] = depTime.split(":").map(Number);
  const [arrHour, arrMins] = arrTime.split(":").map(Number);

  const formData: UpdateBusTripFormData = {
    origin: origin.documentId,
    destination: destination.documentId,
    depTime: {
      hour: depHour,
      mins: depMins,
    },
    arrTime: {
      hour: arrHour,
      mins: arrMins,
    },
    documentId,
  };

  return formData;
};

export const createBusTripAdapter = (
  values: CreateBusTripFormData,
): PostBusTripRequest => {
  const reqBody: PostBusTripRequest = {
    data: {
      origin: { connect: [{ documentId: values.origin }] },
      destination: { connect: [{ documentId: values.destination }] },
      depTime: TimeValueToStrapiTime(values.depTime),
      arrTime: TimeValueToStrapiTime(values.arrTime),
    },
  };

  return reqBody;
};

export const updateBusTripAdapter = createBusTripAdapter;
