import { roles } from "@/utils/roles";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import type {
  Image,
  Meta,
  Navbar,
  Policies,
  ServiceStateValues,
  StrapiLocales,
  StrapiRecord,
} from "./index";

export interface UserRole {
  id: number;
  documentId: string;
  name: (typeof roles)[number];
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: StrapiLocales | null;
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
  locale?: StrapiLocales | StrapiLocales[];
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

// TODO: Check if this is true
export type DeleteUserResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export interface GetRolesResponse {
  roles: UserRole[];
}

export type GetUsersResponse = UserResponse<{ role: UserRole }>[];

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

export interface GetNavbarItems {
  data: StrapiRecord<{ components: [Navbar] }>;
  meta: Meta;
}

export interface GetFaqResponse {
  id: number;
  documentId: string;
  question: string;
  answer: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: StrapiLocales;
}

export interface GetFaqsResponse {
  data: GetFaqResponse[];
  meta: Meta;
}

export interface New {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: StrapiLocales;
  title: string;
  body: BlocksContent;
  highlighted: boolean;
  brief: BlocksContent;
  date: string; // format: yyyy-mm-dd
  cover: Image;
}

export interface GetNewResponse {
  data: New;
}

export interface GetNewsResponse {
  data: Omit<
    New,
    "createdAt" | "updatedAt" | "publishedAt" | "body" | "locale"
  >[];
  meta: Meta;
}

export interface GetPoliciesResponse {
  data: StrapiRecord<{
    components: [Policies];
  }>;
  meta: object;
}

export type LiftingMean = StrapiRecord<{
  name: string;
  description: string | null;
}>;

export type Ticket = StrapiRecord<{
  name: string;
  description: string | null;
  price: number;
  lifting_mean: LiftingMean;
}>;

export type GetTicketsResponse = {
  data: Ticket[];
  meta: Meta;
};

export type ZoneDescription = StrapiRecord<{
  name: string;
  description: string;
}>;

export type Zone = StrapiRecord<{
  openTime: string; // format: hh:mm:ss:mmmm
  closeTime: string; // format: hh:mm:ss:mmmm
  label: string;
  locale: null;
  zone_descriptions: ZoneDescription[];
}>;

export type Station = StrapiRecord<{
  label: string;
  zone: Zone;
  locale: null;
}>;

export type BusTrip = StrapiRecord<{
  depTime: string;
  arrTime: string;
  locale: null;
  origin: Station;
  destination: Station;
}>;

export interface GetBusTripsResponse {
  data: BusTrip[];
  meta: Meta;
}

export interface GetZonesResponse {
  data: Zone[];
  meta: Meta;
}

export type ActivityDescription = StrapiRecord<{
  name: string;
  description: string | null;
  requirements: string | null;
}>;

export type Activity = StrapiRecord<{
  label: string;
  price: number;
  minAge: number;
  season: "summer" | "autumn" | "winter" | "spring" | "all";
  zone: Zone;
  activity_descriptions: ActivityDescription[];
  locale: null;
}>;

export interface GetActivitiesResponse {
  data: Activity[];
  meta: Meta;
}

export type Sector = StrapiRecord<{ name: string; locale: null }>;

export type Postulation = StrapiRecord<{
  name: string;
  surname: string;
  genre: string;
  age: number;
  email: string;
  resume: unknown;
  sector: Sector;
  faved_by: UnpopulatedUserResponse[];
  locale: null;
}>;

export interface PostPostulationRequest {
  data: {
    name: string;
    surname: string;
    genre: string;
    age: number;
    email: string;
    note?: string;
    campNo?: number;
    sector: {
      connect: [{ documentId: string }];
    };
  };
}

export interface PostPostulationResponse {
  data: StrapiRecord<{
    name: string;
    surname: string;
    genre: string;
    age: number;
    email: string;
    resume: unknown;
    locale: null;
    campNo: string | null;
    note: string | null;
  }>;
  meta: Meta;
}

export type UploadResumeResponse = [
  StrapiRecord<{
    name: string;
    alternativeText: null;
    caption: null;
    width: null;
    height: null;
    formats: null;
    hash: string;
    ext: string;
    mime: "application/pdf";
    size: number;
    url: string;
    previewUrl: null;
    provider: string;
    provider_metadata: null;
    locale: null;
  }>,
];
