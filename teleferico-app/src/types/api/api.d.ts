import { roles } from "@/utils/roles";
import { type ReactNode } from "react";
import type { Link, Locale, Meta, ServiceStateValues } from "./index";

export interface UserRole {
  id: number;
  documentId: string;
  name: (typeof roles)[number];
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: Locales | null;
}

export interface LoginUserRequest {
  identifier: string;
  password: string;
}

export interface SuccessfulLoginResponse {
  jwt: string;
  user: User;
}

export interface UnpopulatedUserResponse {
  id: number;
  documentId: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale?: Locales | Locales[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type UserResponse<T extends object = {}> = UnpopulatedUserResponse & T;

export type GetPersonalDataResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export interface NewUserRequest {
  email: string;
  password: string;
  username: string;
  name: string;
  surname: string;
  role: {
    connect: { id: number }[];
  };
}

export type NewUserResponse = UserResponse<{ role: UserRole }>;

export type GetUserResponse = UserResponse<{ role: UserRole }>;

export type UpdateUserRequest = Partial<NewUserRequest>;

export type UpdateUserResponse = UserResponse<{ role: UserRole }>;

// Check if this is true
export type DeleteUserResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export interface GetRolesResponse {
  roles: UserRole[];
}

export type GetUsersResponse = UserResponse<{ role: UserRole }>[];

export interface ImageType {
  src: string;
  alt: string;
}

export interface GetServiceStateResponse {
  data: {
    id: number;
    documentId: string;
    state: ServiceStateValues;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    locale?: Locale | Locale[];
  };
  meta: Meta;
}

export type UpdateServiceStateResponse = GetServiceStateResponse;

export interface ImageTextBlock {
  id: number;
  variant:
    | "default"
    | "defaultFW"
    | "panoramic"
    | "horizontal"
    | "ladder"
    | "miniatures";
  images: Array<ImageType & { order: number }>;
  title: string;
  description: ReactNode;
  link?: Link;
  isInverted?: boolean;
  isTitleHighlighted?: boolean;
}

export interface New {
  id: string;
  images: {
    cover: ImageType;
    thumbnail: ImageType;
  };
  title: string;
  legend: string;
  body: string;
  summary: string;
  pubDate: Date;
  featured: boolean;
}
