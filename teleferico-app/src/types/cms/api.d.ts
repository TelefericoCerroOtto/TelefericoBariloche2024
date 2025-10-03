import type {
  Activity,
  ActivityTranslation,
  BusTrip,
  ComponentTranslate,
  Faq,
  Meta,
  New,
  Sector,
  ServiceStateValues,
  ServiceStatus,
  Station,
  StrapiImage,
  StrapiLocales,
  StrapiRecord,
  Ticket,
  UserRole,
  Zone,
  ZoneTranslation,
} from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";
import { type User } from "next-auth";

export type LoginUserRequest = {
  identifier: string;
  password: string;
};

export type SuccessfulLoginResponse = {
  jwt: string;
  user: User;
};

export type UnpopulatedUserResponse = {
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
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type UserResponse<T extends object = {}> = UnpopulatedUserResponse & T;

export type GetPersonalDataResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export type NewUserRequest = {
  email: string;
  password: string;
  username: string;
  name: string;
  surname: string;
  role: {
    connect: { id: number }[];
  };
};

export type NewUserResponse = UserResponse<{ role: UserRole }>;

export type GetUserResponse = UserResponse<{ role: UserRole }>;

export type UpdateUserRequest = Partial<NewUserRequest>;

export type UpdateUserResponse = UserResponse<{ role: UserRole }>;

// TODO: Check if this is true
export type DeleteUserResponse = UserResponse<{
  role: UserRole;
  localizations: string[];
}>;

export type GetRolesResponse = {
  roles: UserRole[];
};

export type GetUsersResponse = UserResponse<{ role: UserRole }>[];

export type GetServiceStateResponse = {
  data: ServiceStatus;
  meta: Meta;
};

export type UpdateServiceStateResponse = GetServiceStateResponse;

export type GetFaqResponse = {
  data: Faq;
};

export type GetFaqsResponse = {
  data: Faq[];
  meta: Meta;
};

export type GetNewResponse = {
  data: New;
};

export type GetNewsResponse = {
  data: Omit<New, "createdAt" | "publishedAt" | "body" | "locale">[];
  meta: Meta;
};

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

export type GetStationsResponse = {
  data: Station[];
  meta: Meta;
};

export type GetBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};

export type GetBusTripsResponse = {
  data: BusTrip[];
  meta: Meta;
};

export type PostBusTripRequest = {
  data: {
    depTime: string;
    arrTime: string;
    origin: {
      connect: [{ documentId: string }];
    };
    destination: {
      connect: [{ documentId: string }];
    };
  };
};

export type PostBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};

export type UpdateBusTripRequest = {
  data: Partial<{
    depTime: string;
    arrTime: string;
    origin: {
      connect: [{ documentId: string }];
    };
    destination: {
      connect: [{ documentId: string }];
    };
  }>;
};

export type UpdateBusTripResponse = {
  data: BusTrip;
  meta: Meta;
};

export type GetSectorsResponse = {
  data: Sector[];
  meta: Meta;
};

export type GetZoneResponse = {
  data: Zone;
  meta: Meta;
};

export type GetZonesResponse = {
  data: Zone[];
  meta: Meta;
};

export type UpdateZoneRequest = {
  data: Partial<Pick<Zone, "openTime" | "closeTime">>;
};

export type UpdateZoneResponse = {
  data: Omit<Zone, "zone_translations">;
  meta: Meta;
};

export type UpdateZoneTranslationRequest = {
  data: Partial<Pick<ZoneTranslation, "name" | "description">>;
};

export type UpdateZoneTranslationResponse = {
  data: Omit<ZoneTranslation, "zone">;
};

export type GetActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type GetActivitiesResponse = {
  data: Activity[];
  meta: Meta;
};

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

export type PostPostulationRequest = {
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
};

export type PostPostulationResponse = {
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
};

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

export type UploadMediaResponse = StrapiImage[];

export type GetNavbarItemsResponse = {
  data: [
    ComponentTranslate<{
      jsonValue: { items: { label: string; href: string }[] };
      rtValue: null;
    }>,
  ];
  meta: Meta;
};

export type GetPoliciesResponse = {
  data: [
    ComponentTranslate<{
      jsonValue: null;
      rtValue: BlocksContent;
    }>,
  ];
  meta: Meta;
};

export type GetFooterResponse = {
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
};

export type GetHoursoverviewResponse = {
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
};

export type GetServiceButtonResponse = {
  data: [
    ComponentTranslate<{
      jsonValue: {
        error: BlocksContent;
        button: {
          trigger: string;
          close: string;
        };
        modal: {
          items: {
            order: number;
            state: ServiceStateValues;
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
};

export type GetFormsTranslationResponse = {
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
};
