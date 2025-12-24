import type { User, UserRole } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type UserResponse<T extends object = {}> = Omit<
  User,
  "faved_postulations" | "role"
> &
  T;

export type GetPersonalDataResponse = User;

export type NewUserRequest = {
  email: string;
  password: string;
  username: string;
  name: string;
  surname: string;
  role: {
    connect: { id: number }[];
  };
};

export type NewUserResponse = UserResponse<{ role: UserRole }>;

export type GetUserResponse = UserResponse<{ role: UserRole }>;

export type UpdateUserRequest = Partial<NewUserRequest>;

export type UpdateUserResponse = UserResponse<{ role: UserRole }>;

// TODO: Check if this is true
export type DeleteUserResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export type GetRolesResponse = {
  roles: UserRole[];
};

export type GetUsersResponse = UserResponse<{ role: UserRole }>[];
