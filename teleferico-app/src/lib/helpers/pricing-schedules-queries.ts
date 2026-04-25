import { i18n } from "@/i18n";
import type { Locales } from "@/types";

export const getPricingScheduleTicketsQuery = (locale: Locales) => ({
  sort: ["sortOrder:asc", "id:asc"],
  locale,
});

export const getPricingScheduleActivitiesQuery = (locale: Locales) => ({
  sort: ["sortOrder:asc", "id:asc"],
  filters: {
    isActive: { $eq: true },
  },
  populate: {
    activity_translations: {
      filters: {
        locale: {
          $eq: locale,
        },
      },
      fields: ["name", "description", "requirements"],
    },
  },
});

export const getPricingScheduleZonesQuery = (locale: Locales) => ({
  sort: ["sortOrder:asc", "id:asc"],
  populate: {
    zone_translations: {
      filters: {
        locale: {
          $eq: locale ?? i18n.defaultLocale,
        },
      },
    },
  },
});

export const getPricingScheduleBusTripsQuery = (locale: Locales) => ({
  filters: {
    isVisible: {
      $eq: true,
    },
  },
  populate: {
    origin: {
      populate: {
        station_translations: {
          filters: {
            locale: {
              $eq: locale ?? i18n.defaultLocale,
            },
          },
        },
      },
    },
    destination: {
      populate: {
        station_translations: {
          filters: {
            locale: {
              $eq: locale ?? i18n.defaultLocale,
            },
          },
        },
      },
    },
  },
});
