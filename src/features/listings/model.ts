export const DEFAULT_CURRENCY = "DKK";
export const MAX_LISTING_PHOTOS = 12;

export const PROPERTY_TYPE_OPTIONS = [
  {
    value: "house",
    label: "House",
    description: "A full home, villa, or townhouse rental.",
  },
  {
    value: "apartment",
    label: "Apartment",
    description: "A flat or apartment in a shared or private building.",
  },
  {
    value: "room",
    label: "Room",
    description: "A private room in a home or apartment.",
  },
] as const;

export const RENTAL_ARRANGEMENT_OPTIONS = [
  {
    value: "standard",
    label: "Standard rental",
    description: "A normal lease without a fixed move-out handoff.",
  },
  {
    value: "sublease",
    label: "Sublease",
    description: "A temporary rental that needs a clear end date.",
  },
] as const;

export const LISTING_AMENITY_OPTIONS = [
  { value: "parking", label: "Parking" },
  { value: "laundry", label: "Laundry" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "balcony", label: "Balcony" },
  { value: "elevator", label: "Elevator" },
  { value: "internetIncluded", label: "Internet included" },
  { value: "petsAllowed", label: "Pets allowed" },
  { value: "smokingAllowed", label: "Smoking allowed" },
] as const;

export const LISTING_STEP_META = [
  { key: "basics", title: "Basics", shortTitle: "Basics" },
  { key: "details", title: "Details", shortTitle: "Details" },
  { key: "features", title: "Features", shortTitle: "Features" },
  { key: "location", title: "Location", shortTitle: "Location" },
  { key: "photos", title: "Photos", shortTitle: "Photos" },
  { key: "review", title: "Review", shortTitle: "Review" },
] as const;

export type ListingStatus = "draft" | "published" | "archived";
export type PropertyType = (typeof PROPERTY_TYPE_OPTIONS)[number]["value"];
export type RentalArrangement = (typeof RENTAL_ARRANGEMENT_OPTIONS)[number]["value"];
export type ListingAmenity = (typeof LISTING_AMENITY_OPTIONS)[number]["value"];
export type ListingStepKey = (typeof LISTING_STEP_META)[number]["key"];

export type ListingPhoto = {
  storageId: string;
  width?: number;
  height?: number;
  mimeType?: string;
  url?: string | null;
};

type ListingBaseFields = {
  title: string;
  summary?: string;
  description?: string;
  propertyType?: PropertyType;
  rentalArrangement?: RentalArrangement;
  monthlyRent?: number;
  deposit?: number;
  currency: string;
  utilitiesIncluded?: boolean;
  sizeSqm?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  furnished?: boolean;
  availableFrom?: string;
  availableTo?: string;
  minLeaseMonths?: number;
  maxLeaseMonths?: number;
  amenities: ListingAmenity[];
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  neighborhood?: string;
  publicLocationLabel?: string;
  photos: ListingPhoto[];
  coverStorageId?: string;
};

export type ListingCompletionItem = {
  key:
    | "title"
    | "description"
    | "propertyType"
    | "rentalArrangement"
    | "monthlyRent"
    | "sizeSqm"
    | "availableFrom"
    | "availableTo"
    | "leaseDuration"
    | "address"
    | "photo";
  label: string;
  step: Exclude<ListingStepKey, "review">;
  complete: boolean;
};

export type ListingCompletionState = {
  completedSteps: ListingStepKey[];
  checklist: ListingCompletionItem[];
  canPublish: boolean;
};

export type ListingDraft = ListingBaseFields & {
  _id: string;
  _creationTime: number;
  status: ListingStatus;
  ownerMode: "device" | "user";
  lastEditedAt: number;
  publishedAt?: number;
  completion: ListingCompletionState;
};

export type ListingDetail = Pick<
  ListingBaseFields,
  | "title"
  | "summary"
  | "description"
  | "propertyType"
  | "rentalArrangement"
  | "monthlyRent"
  | "deposit"
  | "currency"
  | "utilitiesIncluded"
  | "sizeSqm"
  | "bedroomCount"
  | "bathroomCount"
  | "furnished"
  | "availableFrom"
  | "availableTo"
  | "minLeaseMonths"
  | "maxLeaseMonths"
  | "amenities"
  | "publicLocationLabel"
  | "photos"
  | "coverStorageId"
> & {
  _id: string;
  status: "published";
  publishedAt: number;
};

export type ListingMineItem = {
  _id: string;
  status: ListingStatus;
  title: string;
  summary?: string;
  propertyType?: PropertyType;
  rentalArrangement?: RentalArrangement;
  monthlyRent?: number;
  currency: string;
  publicLocationLabel?: string;
  completedSteps: string[];
  coverUrl: string | null;
  photoCount: number;
  lastEditedAt: number;
  publishedAt?: number;
};

export type ListingBasicsInput = Partial<
  Pick<
  ListingBaseFields,
  "title" | "summary" | "description" | "propertyType" | "rentalArrangement"
  >
>;

export type ListingDetailsInput = Partial<
  Pick<
  ListingBaseFields,
  | "monthlyRent"
  | "deposit"
  | "currency"
  | "utilitiesIncluded"
  | "sizeSqm"
  | "bedroomCount"
  | "bathroomCount"
  | "furnished"
  | "availableFrom"
  | "availableTo"
  | "minLeaseMonths"
  | "maxLeaseMonths"
  >
>;

export type ListingFeaturesInput = {
  amenities: ListingAmenity[];
};

export type ListingLocationInput = Partial<
  Pick<
  ListingBaseFields,
  | "addressLine1"
  | "addressLine2"
  | "postalCode"
  | "city"
  | "countryCode"
  | "neighborhood"
  | "publicLocationLabel"
  >
>;

export type ListingSectionPayload =
  | ListingBasicsInput
  | ListingDetailsInput
  | ListingFeaturesInput
  | ListingLocationInput;
