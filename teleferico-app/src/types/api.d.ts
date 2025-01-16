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
  data?: any;
  error: Error;
}

export interface User {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale?: string | string[];
  nickname: string;
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
