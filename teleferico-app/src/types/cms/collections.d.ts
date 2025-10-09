import type {
  DynamicZone,
  Image,
  ImageFormats,
  RendereableBlocks,
  ServiceStateValues,
  StrapiLocales,
  StrapiRecord,
  UnpopulatedUserResponse,
} from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type UserRoles =
  | "Public"
  | "Authenticated"
  | "Administrator"
  | "Media Manager"
  | "Recruiter"
  | "Operations Supervisor";

export interface UserRole {
  id: number;
  documentId: string;
  name: UserRoles;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: null;
}

export type ComponentTranslationKeys =
  | "policies"
  | "navbar"
  | "footer"
  | "hoursoverview"
  | "servicebutton"
  | "forms"
  | "schedules";

export type ComponentTranslation<
  T extends {
    jsonValue: unknown;
    rtValue: BlocksContent | null;
    key?: ComponentTranslationKeys;
  },
> = StrapiRecord<
  T & {
    key: ComponentTranslationKeys;
  }
>;

export type ServiceStatus = StrapiRecord<{
  state: ServiceStateValues;
  locale: null;
}>;

export type StrapiImage = StrapiRecord<{
  name: string;
  alternativeText: string;
  caption: unknown;
  width: number;
  height: number;
  formats: ImageFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: unknown;
  provider: string;
  provider_metadata: unknown;
}>;

export type Faq = StrapiRecord<{
  question: string;
  answer: string;
  featured: boolean;
}>;

export type New = StrapiRecord<{
  locale: StrapiLocales;
  title: string;
  body: BlocksContent;
  highlighted: boolean;
  brief: BlocksContent;
  date: string; // format: yyyy-mm-dd
  cover: Image;
}>;

export type Ticket = StrapiRecord<{
  name: string;
  description: string | null;
  price: number;
  lifting_mean: "cablecar" | "road&funicular";
}>;

export type ZoneTranslation = StrapiRecord<{
  name: string;
  description: string | null;
  zone: Zone;
}>;

export type Zone = StrapiRecord<{
  openTime: string; // format: hh:mm:ss
  closeTime: string; // format: hh:mm:ss
  label: string;
  isOpen: boolean;
  locale: null;
  zone_translations: ZoneTranslation[];
}>;

export type StationTranslation = StrapiRecord<{
  name: string;
  station: Station;
}>;

export type Station = StrapiRecord<{
  key: string;
  station_translations: StationTranslation[];
  locale: null;
}>;

export type BusTrip = StrapiRecord<{
  depTime: string;
  arrTime: string;
  origin: Station;
  destination: Station;
  locale: null;
}>;

export type ActivityTranslation = StrapiRecord<{
  name: string;
  description: string | null;
  requirements: string | null;
}>;

export type Activity = StrapiRecord<{
  // label: string;
  price: number;
  minAge: number;
  season: "summer" | "autumn" | "winter" | "spring" | "allSeasons";
  zone: Zone;
  activity_translations: ActivityTranslation[];
  locale: null;
}>;

export type SectorName = StrapiRecord<{ name: string }>;

export type Sector = StrapiRecord<{
  key: string;
  sector_names: SectorName[];
  locale: null;
}>;

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

export type PageContent = StrapiRecord<{
  blocks: DynamicZone<RendereableBlocks>;
  createdAt: string;
  documentId: string;
  id: number;
  locale: StrapiLocales;
  publishedAt: string;
  route: string;
  updatedAt: string;
}>;
