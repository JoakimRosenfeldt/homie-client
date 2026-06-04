export const DEFAULT_CURRENCY = "DKK";
export const MAX_LISTING_PHOTOS = 12;

type ListingStatus = "draft" | "published" | "archived";
type PropertyType = "house" | "apartment" | "room";
export type RentalArrangement = "standard" | "sublease";
export type ListingAmenity =
  | "parking"
  | "laundry"
  | "dishwasher"
  | "balcony"
  | "elevator"
  | "internetIncluded"
  | "petsAllowed"
  | "smokingAllowed";
export type ListingStepKey = "basics" | "details" | "features" | "location" | "photos" | "review";

type ListingPhoto = {
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

export type ListingExploreItem = {
  _id: string;
  title: string;
  summary?: string;
  propertyType?: PropertyType;
  rentalArrangement?: RentalArrangement;
  monthlyRent?: number;
  currency: string;
  sizeSqm?: number;
  availableFrom?: string;
  availableTo?: string;
  publicLocationLabel?: string;
  coverUrl: string | null;
  photoCount: number;
  publishedAt: number;
};

export type SavedListingItem = ListingExploreItem & {
  savedAt: number;
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
