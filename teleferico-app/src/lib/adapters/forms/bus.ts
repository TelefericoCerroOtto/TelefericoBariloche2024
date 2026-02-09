import {
  CreateBusTripFormData,
  GetBusTripResponse,
  PostBusTripRequest,
  UpdateBusTripFormData,
  UpdateBusTripRequest,
} from "@/types";
import { TimeValueToStrapiTime } from "../formats";

export const getBusTripAdapter = (
  busTrip: GetBusTripResponse,
): UpdateBusTripFormData => {
  const { origin, destination, depTime, arrTime, isVisible, documentId } =
    busTrip.data;

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
    isVisible,
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
      isVisible: values.isVisible,
    },
  };

  return reqBody;
};

export const updateBusTripAdapter = (
  values: Partial<UpdateBusTripFormData>,
): UpdateBusTripRequest => {
  const reqBody: UpdateBusTripRequest = { data: {} };

  if (values.origin) {
    reqBody.data.origin = { connect: [{ documentId: values.origin }] };
  }

  if (values.destination) {
    reqBody.data.destination = {
      connect: [{ documentId: values.destination }],
    };
  }

  if (values.depTime) {
    reqBody.data.depTime = TimeValueToStrapiTime(values.depTime);
  }

  if (values.arrTime) {
    reqBody.data.arrTime = TimeValueToStrapiTime(values.arrTime);
  }

  if (values.isVisible !== undefined && values.isVisible !== null) {
    reqBody.data.isVisible = values.isVisible;
  }

  return reqBody;
};
