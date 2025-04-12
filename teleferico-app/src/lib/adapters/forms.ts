import type {
  NewUserFormData,
  NewUserRequest,
  PostPostulationRequest,
  PostulationFormData,
  UpdateUserFormData,
  UpdateUserRequest,
} from "@/types";
import { cleanObject } from "@/utils/clean-object";

export const newUserAdapter = (user: NewUserFormData): NewUserRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { role, id: _, ...data } = user;
  const adaptedUser = { ...data, role: { connect: [{ id: parseInt(role) }] } };
  return adaptedUser;
};

export const updateUserAdapter = (
  user: UpdateUserFormData,
): UpdateUserRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { id: _, ...data } = user;
  const cleanedData = cleanObject(data);
  const adaptedUser = {
    ...cleanedData,
  };
  console.log("adaptedUser", adaptedUser);
  return adaptedUser;
};

export const postPostulationAdapter = (
  postulation: PostulationFormData,
): PostPostulationRequest => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { sector, resume: _, ...props } = postulation;

  const adaptedPostulation: PostPostulationRequest = {
    data: {
      ...props,
      sector: { connect: [{ documentId: sector }] },
    },
  };

  return adaptedPostulation;
};
