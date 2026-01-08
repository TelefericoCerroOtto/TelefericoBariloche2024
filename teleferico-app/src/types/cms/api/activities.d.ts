import type { Activity, ActivityTranslation, Meta } from "@/types";

export type GetActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type GetActivitiesResponse = {
  data: Activity[];
  meta: Meta;
};

export type PostActivityRequest = {
  data: Pick<Activity, "price" | "minAge" | "season" | "available">;
};

export type PostActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type UpdateActivityRequest = {
  data: Partial<Pick<Activity, "price" | "minAge" | "season" | "available">>;
};

export type UpdateActivityResponse = {
  data: Activity;
  meta: Meta;
};

export type PostActivityTranslationRequest = {
  data: Pick<ActivityTranslation, "name" | "description"> &
    Partial<Pick<ActivityTranslation, "requirements">> & {
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
