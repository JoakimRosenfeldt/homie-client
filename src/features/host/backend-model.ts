import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import type { TranslationKey } from "@/i18n";

export { api };

export type HostApplication = FunctionReturnType<typeof api.applications.listForHost>[number];
export type HostListing = FunctionReturnType<typeof api.listings.listMine>[number];
export type HostListingDraft = FunctionReturnType<typeof api.listings.getDraft>;
export type HostListingStatus = HostListing["status"];
export type HostPropertyType = NonNullable<HostListingDraft["propertyType"]>;
export type HostAmenity = HostListingDraft["amenities"][number];

export const LISTING_STEPS = [
  "basics",
  "details",
  "features",
  "location",
  "photos",
  "review",
] as const;

export type ListingStep = (typeof LISTING_STEPS)[number];

export const LISTING_STEP_LABEL_KEYS: Record<ListingStep, TranslationKey> = {
  basics: "newListing.step.basics",
  details: "newListing.step.details",
  features: "newListing.step.features",
  location: "newListing.step.location",
  photos: "newListing.step.photos",
  review: "newListing.step.review",
};

export const PROPERTY_TYPES: readonly { value: HostPropertyType; labelKey: TranslationKey }[] = [
  { value: "room", labelKey: "newListing.type.room" },
  { value: "studio", labelKey: "newListing.type.studio" },
  { value: "apartment", labelKey: "newListing.type.apartment" },
  { value: "house", labelKey: "newListing.type.house" },
];

export const AMENITIES: readonly { value: HostAmenity; labelKey: TranslationKey }[] = [
  { value: "parking", labelKey: "newListing.amenity.parking" },
  { value: "laundry", labelKey: "newListing.amenity.laundry" },
  { value: "dishwasher", labelKey: "newListing.amenity.dishwasher" },
  { value: "balcony", labelKey: "newListing.amenity.balcony" },
  { value: "elevator", labelKey: "newListing.amenity.elevator" },
  { value: "internetIncluded", labelKey: "newListing.amenity.internetIncluded" },
  { value: "petsAllowed", labelKey: "newListing.amenity.petsAllowed" },
  { value: "smokingAllowed", labelKey: "newListing.amenity.smokingAllowed" },
];

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

const HOST_LISTING_STATUS_KEYS = {
  draft: "hostDashboard.status.draft",
  published: "hostDashboard.status.published",
  paused: "hostDashboard.status.paused",
  rented: "hostDashboard.status.rented",
  archived: "hostDashboard.status.archived",
} satisfies Record<HostListingStatus, TranslationKey>;

const APPLICATION_STATUS_KEYS = {
  pending: "hostApplications.status.pending",
  shortlisted: "hostApplications.status.shortlisted",
  declined: "hostApplications.status.declined",
  withdrawn: "hostApplications.status.withdrawn",
  closed: "hostApplications.status.closed",
} satisfies Record<HostApplication["status"], TranslationKey>;

export function hostListingStatusLabel(status: HostListingStatus, translate: Translate) {
  return translate(HOST_LISTING_STATUS_KEYS[status]);
}

export function formatHostRent(
  amount: number | undefined,
  currency: string,
  translate: Translate,
  formatCurrency: (value: number, currency?: string) => string,
) {
  return amount === undefined
    ? translate("hostDashboard.rentMissing")
    : formatCurrency(amount, currency);
}

export function applicantName(
  application: HostApplication,
  translate: Translate,
  formatNumber: (value: number) => string,
) {
  const profile = application.profileSnapshot;
  return profile.kind === "sharedHome"
    ? profile.name
    : translate("hostApplications.householdOf", { count: formatNumber(profile.householdSize) });
}

export function applicantSummary(application: HostApplication) {
  const profile = application.profileSnapshot;
  if (profile.kind === "sharedHome") return profile.introduction;
  return profile.note ?? profile.employmentOrStudy;
}

export function applicantProfileRows(
  application: HostApplication,
  translate: Translate,
  formatCurrency: (value: number, currency?: string) => string,
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string,
  formatNumber: (value: number) => string,
) {
  const profile = application.profileSnapshot;
  if (profile.kind === "sharedHome") {
    return [
      { label: translate("hostApplicant.row.profileType"), value: translate("hostApplicant.row.sharedHome") },
      { label: translate("hostApplicant.row.introduction"), value: profile.introduction },
      { label: translate("hostApplicant.row.workStudy"), value: profile.occupationOrStudy },
      { label: translate("hostApplicant.row.moveIn"), value: formatDateOnly(profile.moveInDate, formatDate) },
      { label: translate("hostApplicant.row.expectedStay"), value: profile.expectedStay },
      { label: translate("hostApplicant.row.monthlyBudget"), value: formatCurrency(profile.budget) },
      {
        label: translate("hostApplicant.row.habits"),
        value: profile.householdHabits.length > 0
          ? profile.householdHabits.join(", ")
          : translate("hostApplicant.row.noneProvided"),
      },
      {
        label: translate("hostApplicant.row.photos"),
        value: translate(
          application.profilePhotoUrls.length === 1
            ? "hostApplicant.row.photo.one"
            : "hostApplicant.row.photo.other",
          { count: formatNumber(application.profilePhotoUrls.length) },
        ),
      },
    ];
  }

  return [
    { label: translate("hostApplicant.row.profileType"), value: translate("hostApplicant.row.privateRental") },
    { label: translate("hostApplicant.row.householdSize"), value: formatNumber(profile.householdSize) },
    { label: translate("hostApplicant.row.workStudy"), value: profile.employmentOrStudy },
    { label: translate("hostApplicant.row.incomeRange"), value: profile.incomeRangeUnverified ?? translate("hostApplicant.row.notProvided") },
    { label: translate("hostApplicant.row.moveIn"), value: formatDateOnly(profile.moveInDate, formatDate) },
    { label: translate("hostApplicant.row.profileNote"), value: profile.note ?? translate("hostApplicant.noNote") },
  ];
}

export function applicationStatusDetail(status: HostApplication["status"], translate: Translate) {
  return translate(APPLICATION_STATUS_KEYS[status]);
}

function formatDateOnly(
  value: string,
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string,
) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return value;
  const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  return formatDate(date, { day: "numeric", month: "short", year: "numeric" });
}
