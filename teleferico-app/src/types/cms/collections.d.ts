import type {
  DynamicZone,
  RendereableBlocks,
  ServiceStateValues,
  StrapiBlocksPayload,
  StrapiFile,
  StrapiImage,
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

export type Faq = StrapiRecord<{
  question: string;
  answer: string;
  featured: boolean;
}>;

export type New = StrapiRecord<{
  locale: StrapiLocales;
  title: string;
  body: StrapiBlocksPayload;
  highlighted: boolean;
  brief: StrapiBlocksPayload;
  date: string; // format: yyyy-mm-dd
  cover: StrapiImage;
}>;

export type LiftingMean = "cablecar" | "road&funicular";

export type Ticket = StrapiRecord<{
  name: string;
  description: string | null;
  price: number;
  lifting_mean: LiftingMean;
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

export type Season = "summer" | "autumn" | "winter" | "spring" | "allSeasons";

export type Activity = StrapiRecord<{
  // label: string;
  price: number;
  minAge: number;
  season: Season;
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

export type PostulationStatus = "unreviewed" | "hired" | "discarded";

export type Genders = "male" | "female" | "other";

export type Postulation = StrapiRecord<{
  name: string;
  surname: string;
  gender: Genders;
  age: number;
  email: string;
  resume: StrapiFile;
  sector: Sector;
  campNo: number | null;
  note: string | null;
  postulation_status: PostulationStatus;
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
