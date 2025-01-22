import { type ReactNode } from "react";

export interface LoginUserRequest {
  identifier: string;
  password: string;
}

interface Error {
  status: number;
  name: string;
  message: string;
}

interface ErrorResponse {
  data?: null;
  error: Error;
}

export interface UserRole {
  id: number;
  documentId: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string | null;
}

export interface UserResponse {
  id: string;
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

export interface SuccessfulLoginResponse {
  jwt: string;
  user: User;
}

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
