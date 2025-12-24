import type { User } from "@/types";

export type LoginUserRequest = {
  identifier: string;
  password: string;
};

export type SuccessfulLoginResponse = {
  jwt: string;
  user: Omit<User, "faved_postulations" | "role">;
};
