import { type ReactNode } from "react";

interface StrapiError {
  status: number;
  name: string;
  message: string;
  details?: unknown;
}

interface ErrorResponse {
  data?: null;
  error: StrapiError;
}

export interface UserRole {
  id: number;
  documentId: string;
  name: "AdminMaster" | "Note Manager";
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string | null;
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
  locale?: string | string[];
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
  link?: { label: string; href: string };
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
