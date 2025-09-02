import type {
  Activity,
  ActivityTranslation,
  BusTrip,
  ComponentTranslate,
  Faq,
  Meta,
  New,
  Sector,
  ServiceStatus,
  StrapiLocales,
  StrapiRecord,
  Ticket,
  UserRole,
  Zone,
  ZoneTranslation,
} from "@/types";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import { User } from "next-auth";
// import { BlocksContent } from "@strapi/blocks-react-renderer";

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
  data: ServiceStatus;
  meta: Meta;
}

export type UpdateServiceStateResponse = GetServiceStateResponse;

export type GetFaqResponse = {
  data: Faq;
};

export interface GetFaqsResponse {
  data: Faq[];
  meta: Meta;
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

export type GetTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export type GetTicketsResponse = {
  data: Ticket[];
  meta: Meta;
};

export type PostAccessTicketRequest = {
  data: {
    name: string;
    price: number;
    lifting_mean: "cablecar" | "road&funicular";
  };
};

export type PostAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export type UpdateAccessTicketRequest = {
  data: {
    name?: string;
    price?: number;
    lifting_mean?: "cablecar" | "road&funicular";
  };
};

export type UpdateAccessTicketResponse = {
  data: Ticket;
  meta: Meta;
};

export interface GetBusTripsResponse {
  data: BusTrip[];
  meta: Meta;
}

export interface GetSectorsResponse {
  data: Sector[];
  meta: Meta;
}

export interface GetZoneResponse {
  data: Zone;
  meta: Meta;
}

export interface GetZonesResponse {
  data: Zone[];
  meta: Meta;
}

export interface UpdateZoneRequest {
  data: Partial<Pick<Zone, "openTime" | "closeTime">>;
}

export interface UpdateZoneResponse {
  data: Omit<Zone, "zone_translations">;
  meta: Meta;
}

export interface UpdateZoneTranslationRequest {
  data: Partial<Pick<ZoneTranslation, "name" | "description">>;
}

export interface UpdateZoneTranslationResponse {
  data: Omit<ZoneTranslation, "zone">;
}

export interface GetActivityResponse {
  data: Activity;
  meta: Meta;
}

export interface GetActivitiesResponse {
  data: Activity[];
  meta: Meta;
}

export type PostActivityRequest = {
  data: Pick<Activity, "price" | "minAge" | "season">;
};

export type PostActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type UpdateActivityRequest = {
  data: Partial<Pick<Activity, "price" | "minAge" | "season">>;
};

export type UpdateActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type PostActivityTranslationRequest = {
  data: Pick<ActivityTranslation, "name" | "description" | "requirements"> & {
    activity: {
      connect: [{ documentId: string }];
    };
  };
};

export type PostActivityTranslationResponse = {
  data: ActivityTranslation;
  meta: Meta;
};

export type UpdateActivityTranslationRequest = {
  data: Partial<
    Pick<ActivityTranslation, "name" | "description" | "requirements">
  > & {
    activity?: {
      connect: [{ documentId: string }];
    };
  };
};

export type UpdateActivityTranslationResponse = {
  data: ActivityTranslation;
  meta: Meta;
};

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

export interface GetNavbarItemsResponse {
  data: [
    ComponentTranslate<{
      jsonValue: { items: { label: string; href: string }[] };
      rtValue: null;
    }>,
  ];
  meta: Meta;
}

export interface GetPoliciesResponse {
  data: [
    ComponentTranslate<{
      jsonValue: null;
      rtValue: BlocksContent;
    }>,
  ];
  meta: Meta;
}

export interface GetFooterResponse {
  data: [
    ComponentTranslate<{
      jsonValue: {
        socialitems: {
          ig: string;
          fb: string;
          tt: string;
        };
        menuitems: {
          jobs: string;
          contact: string;
          policies: string;
          faqs: string;
        };
        contact: {
          title: string;
          direction: string;
        };
      };
      rtValue: BlocksContent;
    }>,
  ];
  meta: Meta;
}

export interface GetHoursoverviewResponse {
  data: [
    ComponentTranslate<{
      jsonValue: {
        title: string;
        desc: BlocksContent;
        items: Array<{
          id: number;
          tag: string;
          title: string;
          desc: BlocksContent;
          alt: string;
        }>;
      };
      rtValue: null;
    }>,
  ];
  meta: Meta;
}

export interface GetServiceButtonResponse {
  data: [
    ComponentTranslate<{
      jsonValue: {
        error: BlocksContent;
        button: {
          trigger: string;
          close: string;
        };
        modal: {
          states: {
            order: number;
            state: string;
            stateLegend: string;
            title: string;
            stateDesc: string;
          }[];
          disclaimer: BlocksContent;
        };
      };
      rtValue: null;
    }>,
  ];
  meta: Meta;
}

export interface GetFormsTranslationResponse {
  data: [
    ComponentTranslate<{
      jsonValue: {
        fields: {
          firstName: {
            label: string;
            placeholder: string;
          };
          lastName: {
            label: string;
            placeholder: string;
          };
          genre: {
            label: string;
            placeholder: string;
            items: {
              male: string;
              female: string;
              other: string;
            };
          };
          sector: {
            label: string;
            placeholder: string;
            items: {
              tech: string;
              marketing: string;
              finances: string;
              engineer: string;
              tourism: string;
            };
          };
          email: {
            label: string;
            placeholder: string;
          };
          name: {
            label: string;
            placeholder: string;
          };
          age: {
            label: string;
            placeholder: string;
          };
          consultation: {
            label: string;
            placeholder: string;
          };
          campNo: {
            label: string;
            placeholder: string;
          };
          cv: {
            label: string;
            placeholder: string;
          };
        };
        buttons: {
          send: string;
        };
      };
      rtValue: null;
    }>,
  ];
  meta: Meta;
}
