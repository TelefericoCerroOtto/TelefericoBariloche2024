import type {
  Image,
  ImageFormats,
  ServiceStateValues,
  StrapiLocales,
  StrapiRecord,
} from "@/types";
import { roles } from "@/utils/roles";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export interface UserRole {
  id: number;
  documentId: string;
  name: (typeof roles)[number];
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: null;
}

type ComponentTranslate<
  T extends { jsonValue: unknown; rtValue: BlocksContent | null },
> = StrapiRecord<T & { key: string }>;

export type ServiceStatus = StrapiRecord<{
  state: ServiceStateValues;
  locale: null;
}>;

export type StrapiImage = StrapiRecord<{
  name: string;
  alternativeText: string;
  caption: unkown;
  width: number;
  height: number;
  formats: ImageFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: unkown;
  provider: string;
  provider_metadata: unkown;
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
