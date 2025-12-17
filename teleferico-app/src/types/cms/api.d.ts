import type {
  Activity,
  ActivityTranslation,
  BusTrip,
  ComponentTranslation,
  Faq,
  Meta,
  New,
  PageContent,
  Postulation,
  Sector,
  ServiceStateValues,
  ServiceStatus,
  Station,
  StrapiFile,
  StrapiImage,
  StrapiRecord,
  Ticket,
  User,
  UserRole,
  Zone,
  ZoneTranslation,
} from "@/types";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export type LoginUserRequest = {
  identifier: string;
  password: string;
};

export type SuccessfulLoginResponse = {
  jwt: string;
  user: Omit<User, "faved_postulations" | "role">;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type UserResponse<T extends object = {}> = Omit<
  User,
  "faved_postulations" | "role"
> &
  T;

export type GetPersonalDataResponse = User;

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

export type GetPageResponse = {
  data: PageContent[];
  meta: Meta;
};

export type GetServiceStateResponse = {
  data: ServiceStatus;
  meta: Meta;
};

export type UpdateServiceStateResponse = GetServiceStateResponse;

export type GetFaqResponse = {
  data: Faq;
  meta: Meta;
};

export type GetFaqsResponse = {
  data: Faq[];
  meta: Meta;
};

export type CreateFaqRequest = {
  data: Pick<Faq, "question" | "answer" | "featured">;
};

export type CreateFaqResponse = {
  data: Faq;
  meta: Meta;
};

export type UpdateFaqRequest = {
  data: Partial<Pick<Faq, "question" | "answer" | "featured">>;
};

export type UpdateFaqResponse = {
  data: Faq;
  meta: Meta;
};

export type GetNewResponse = {
  data: New;
  meta: Meta;
};

export type GetNewsResponse = {
  data: Omit<New, "createdAt" | "publishedAt" | "body" | "locale">[];
  meta: Meta;
};

export type CreateNewRequest = {
  data: Pick<New, "title" | "body" | "brief" | "date" | "highlighted"> & {
    cover: number;
  };
};

export type CreateNewResponse = {
  data: New;
  meta: Meta;
};

export type UpdateNewRequest = {
  data: Partial<
    Pick<New, "title" | "body" | "brief" | "date" | "highlighted"> & {
      cover: number;
    }
  >;
};

export type UpdateNewResponse = {
  data: New;
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
  data: Partial<Pick<Zone, "openTime" | "closeTime" | "isOpen">>;
};

export type UpdateZoneResponse = {
  data: Omit<Zone, "zone_translations">;
  meta: Meta;
};

export type UpdateZoneTranslationRequest = {
  data: Partial<Pick<ZoneTranslation, "name" | "description">> & {
    zone: { connect: [{ documentId: string }] };
  };
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
    activity: {
      connect: [{ documentId: string }];
    };
  };
};

export type UpdateActivityTranslationResponse = {
  data: ActivityTranslation;
  meta: Meta;
};

export type GetPostulationResponse = {
  data: Postulation;
  meta: Meta;
};

export type GetPostulationsResponse = {
  data: Postulation[];
  meta: Meta;
};

export type PostPostulationRequest = {
  data: Pick<
    Postulation,
    | "name"
    | "surname"
    | "gender"
    | "age"
    | "email"
    | "campNo"
    | "note"
    | "postulation_status"
  > & {
    sector: {
      connect: [{ documentId: string }];
    };
    resume: number;
  };
};

export type PostPostulationResponse = {
  data: StrapiRecord<Omit<Postulation, "faved_by" | "sector" | "resume">>;
  meta: Meta;
};

export type UpdatePostulationRequest = {
  data: Partial<
    Pick<Postulation, "postulation_status"> & {
      faved_by:
        | {
            connect: number[];
          }
        | {
            disconnect: number[];
          };
    }
  >;
};

export type UpdatePostulationResponse = {
  data: StrapiRecord<Omit<Postulation, "faved_by" | "sector" | "resume">>;
  meta: Meta;
};

export type UploadMediaResponse<T extends StrapiImage | StrapiFile> = T[];

export type GetNavbarItemsResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: { items: { label: string; href: string }[] };
      rtValue: null;
      key: "navbar";
    }>,
  ];
  meta: Meta;
};

export type GetPoliciesResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: null;
      rtValue: BlocksContent;
      key: "policies";
    }>,
  ];
  meta: Meta;
};

export type GetFooterResponse = {
  data: [
    ComponentTranslation<{
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
      key: "footer";
    }>,
  ];
  meta: Meta;
};

export type GetHoursoverviewResponse = {
  data: [
    ComponentTranslation<{
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
      key: "hoursoverview";
    }>,
  ];
  meta: Meta;
};

export type GetServiceButtonResponse = {
  data: [
    ComponentTranslation<{
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
      key: "servicebutton";
    }>,
  ];
  meta: Meta;
};

export type GetFormsTranslationResponse = {
  data: [
    ComponentTranslation<{
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
          gender: {
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
      key: "forms";
    }>,
  ];
  meta: Meta;
};

export type GetSchedulesTranslationResponse = {
  data: [
    ComponentTranslation<{
      jsonValue: {
        header: { epigraph: string; title: string; legend: string };
        components: {
          Loading: { title: string; legend: string };
          Error: { title: string; legend: string; button: string };
          Empty: { title: string; legend: string };
          TimeRow: {
            opens: string;
            closes: string;
          };
        };
        badge: {
          open: string;
          closed: string;
        };
      };
      rtValue: null;
      key: "schedules";
    }>,
  ];
  meta: Meta;
};
