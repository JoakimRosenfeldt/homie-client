import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { closeOutstandingForListing } from "./applications";
import { enforceRateLimit, getActiveDeviceHash } from "./lib/device";
import {
  attachUploadedFile,
  createUploadSession,
  deleteOwnedUploadedFile,
} from "./lib/uploads";
import {
  PUBLISHED_SEARCH_STATE_KEY,
  PUBLISHED_SEARCH_VERSION,
  removePublishedSearch,
  toPublishedSearchValue,
  upsertPublishedSearch,
} from "./lib/publishedSearch";
import {
  boundedArray,
  boundedNumber,
  boundedText,
  optionalBoundedNumber,
  optionalBoundedText,
} from "./lib/validation";
import { enqueueMatchingPushes } from "./savedSearches";

const DEFAULT_CURRENCY = "DKK";
const MAX_LISTING_PHOTOS = 12;
const MAX_EXPLORE_CATALOG = 5_000;
const MAX_MAP_PINS = 100;
type ListingAmenity =
  | "parking"
  | "laundry"
  | "dishwasher"
  | "balcony"
  | "elevator"
  | "internetIncluded"
  | "petsAllowed"
  | "smokingAllowed";
type ListingStepKey = "basics" | "details" | "features" | "location" | "photos" | "review";

function normalizeText(value?: string | null) {
  return value?.trim() || undefined;
}

function buildPublicLocationLabel(input: { neighborhood?: string; city?: string; countryCode?: string }) {
  const parts = [normalizeText(input.neighborhood), normalizeText(input.city)];
  const unique = parts.filter(
    (part, index, list): part is string => Boolean(part) && list.indexOf(part) === index,
  );
  return unique.length > 0 ? unique.join(", ") : normalizeText(input.countryCode);
}

function requiresAvailableTo(rentalArrangement?: "standard" | "sublease") {
  return rentalArrangement === "sublease";
}

function parseDateOnly(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day) return undefined;
  return date.getTime();
}

const propertyTypeValidator = v.union(
  v.literal("house"),
  v.literal("apartment"),
  v.literal("studio"),
  v.literal("room"),
);

const rentalArrangementValidator = v.union(
  v.literal("standard"),
  v.literal("sublease"),
);

const amenityValidator = v.union(
  v.literal("parking"),
  v.literal("laundry"),
  v.literal("dishwasher"),
  v.literal("balcony"),
  v.literal("elevator"),
  v.literal("internetIncluded"),
  v.literal("petsAllowed"),
  v.literal("smokingAllowed"),
);

const basicsPayloadValidator = v.object({
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  description: v.optional(v.string()),
  propertyType: v.optional(propertyTypeValidator),
  rentalArrangement: v.optional(rentalArrangementValidator),
  contentLanguage: v.optional(v.union(v.literal("en"), v.literal("da"))),
});

const detailsPayloadValidator = v.object({
  monthlyRent: v.optional(v.number()),
  deposit: v.optional(v.number()),
  currency: v.optional(v.string()),
  utilitiesIncluded: v.optional(v.boolean()),
  sizeSqm: v.optional(v.number()),
  bedroomCount: v.optional(v.number()),
  bathroomCount: v.optional(v.number()),
  furnished: v.optional(v.boolean()),
  availableFrom: v.optional(v.string()),
  availableTo: v.optional(v.string()),
  minLeaseMonths: v.optional(v.number()),
  maxLeaseMonths: v.optional(v.number()),
});

const featuresPayloadValidator = v.object({
  amenities: v.array(amenityValidator),
});

const locationPayloadValidator = v.object({
  addressLine1: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  city: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  publicLocationLabel: v.optional(v.string()),
});

function validateBasicsPayload(payload: typeof basicsPayloadValidator.type) {
  optionalBoundedText(payload.title, { field: "Title", maximum: 120 });
  optionalBoundedText(payload.summary, { field: "Summary", maximum: 240 });
  optionalBoundedText(payload.description, { field: "Description", maximum: 8_000 });
}

function validateDetailsPayload(payload: typeof detailsPayloadValidator.type) {
  optionalBoundedNumber(payload.monthlyRent, {
    field: "Monthly rent", minimum: 0, maximum: 10_000_000,
  });
  optionalBoundedNumber(payload.deposit, {
    field: "Deposit", minimum: 0, maximum: 10_000_000,
  });
  optionalBoundedText(payload.currency, { field: "Currency", maximum: 3 });
  optionalBoundedNumber(payload.sizeSqm, {
    field: "Size", minimum: 0, maximum: 10_000,
  });
  optionalBoundedNumber(payload.bedroomCount, {
    field: "Bedroom count", minimum: 0, maximum: 100,
  });
  optionalBoundedNumber(payload.bathroomCount, {
    field: "Bathroom count", minimum: 0, maximum: 100,
  });
  optionalBoundedText(payload.availableFrom, { field: "Available from", maximum: 100 });
  optionalBoundedText(payload.availableTo, { field: "Available to", maximum: 100 });
  if (payload.availableFrom && parseDateOnly(payload.availableFrom) === undefined) {
    throw new ConvexError("Available from must be a real date in YYYY-MM-DD format.");
  }
  if (payload.availableTo && parseDateOnly(payload.availableTo) === undefined) {
    throw new ConvexError("Available to must be a real date in YYYY-MM-DD format.");
  }
  optionalBoundedNumber(payload.minLeaseMonths, {
    field: "Minimum lease", minimum: 0, maximum: 120,
  });
  optionalBoundedNumber(payload.maxLeaseMonths, {
    field: "Maximum lease", minimum: 0, maximum: 120,
  });
}

function validateLocationPayload(payload: typeof locationPayloadValidator.type) {
  optionalBoundedText(payload.addressLine1, { field: "Address", maximum: 200 });
  optionalBoundedText(payload.addressLine2, { field: "Address details", maximum: 200 });
  optionalBoundedText(payload.postalCode, { field: "Postal code", maximum: 32 });
  optionalBoundedText(payload.city, { field: "City", maximum: 120 });
  optionalBoundedText(payload.countryCode, { field: "Country code", maximum: 2 });
  optionalBoundedText(payload.neighborhood, { field: "Neighborhood", maximum: 120 });
  optionalBoundedText(payload.publicLocationLabel, {
    field: "Public location label", maximum: 160,
  });
}

const listingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("paused"),
  v.literal("rented"),
  v.literal("archived"),
);
const coordinateValidator = v.object({ latitude: v.number(), longitude: v.number() });
const completedStepValidator = v.union(
  v.literal("basics"),
  v.literal("details"),
  v.literal("features"),
  v.literal("location"),
  v.literal("photos"),
  v.literal("review"),
);
const exploreItemValidator = v.object({
  _id: v.id("listings"),
  title: v.string(),
  summary: v.optional(v.string()),
  propertyType: v.optional(propertyTypeValidator),
  rentalArrangement: v.optional(rentalArrangementValidator),
  monthlyRent: v.optional(v.number()),
  currency: v.string(),
  sizeSqm: v.optional(v.number()),
  availableFrom: v.optional(v.string()),
  availableTo: v.optional(v.string()),
  publicLocationLabel: v.optional(v.string()),
  publicCoordinate: v.optional(coordinateValidator),
  contentLanguage: v.optional(v.union(v.literal("en"), v.literal("da"))),
  coverUrl: v.union(v.string(), v.null()),
  photoCount: v.number(),
  publishedAt: v.number(),
});
const draftValidator = v.object({
  _id: v.id("listings"),
  _creationTime: v.number(),
  status: listingStatusValidator,
  ownerMode: v.union(v.literal("device"), v.literal("user")),
  ownerKeyHash: v.optional(v.string()),
  ownerSubject: v.optional(v.string()),
  title: v.string(),
  summary: v.optional(v.string()),
  description: v.optional(v.string()),
  propertyType: v.optional(propertyTypeValidator),
  rentalArrangement: v.optional(rentalArrangementValidator),
  contentLanguage: v.optional(v.union(v.literal("en"), v.literal("da"))),
  monthlyRent: v.optional(v.number()),
  deposit: v.optional(v.number()),
  currency: v.string(),
  utilitiesIncluded: v.optional(v.boolean()),
  sizeSqm: v.optional(v.number()),
  bedroomCount: v.optional(v.number()),
  bathroomCount: v.optional(v.number()),
  furnished: v.optional(v.boolean()),
  availableFrom: v.optional(v.string()),
  availableTo: v.optional(v.string()),
  minLeaseMonths: v.optional(v.number()),
  maxLeaseMonths: v.optional(v.number()),
  amenities: v.array(amenityValidator),
  addressLine1: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  city: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  neighborhood: v.optional(v.string()),
  publicLocationLabel: v.optional(v.string()),
  exactCoordinate: v.optional(coordinateValidator),
  publicCoordinate: v.optional(coordinateValidator),
  publicCoordinateAngle: v.optional(v.number()),
  photos: v.array(v.object({
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    url: v.optional(v.union(v.string(), v.null())),
  })),
  coverStorageId: v.optional(v.id("_storage")),
  completedSteps: v.array(completedStepValidator),
  moderationState: v.optional(v.union(v.literal("active"), v.literal("takenDown"))),
  moderationReason: v.optional(v.string()),
  takenDownAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),
  lifecycleChangedAt: v.optional(v.number()),
  lastEditedAt: v.number(),
  completion: v.object({
    completedSteps: v.array(completedStepValidator),
    checklist: v.array(v.object({
      key: v.string(),
      label: v.string(),
      step: v.union(
        v.literal("basics"),
        v.literal("details"),
        v.literal("features"),
        v.literal("location"),
        v.literal("photos"),
      ),
      complete: v.boolean(),
    })),
    canPublish: v.boolean(),
  }),
});
const mineItemValidator = v.object({
  _id: v.id("listings"),
  status: listingStatusValidator,
  title: v.string(),
  summary: v.optional(v.string()),
  propertyType: v.optional(propertyTypeValidator),
  rentalArrangement: v.optional(rentalArrangementValidator),
  monthlyRent: v.optional(v.number()),
  currency: v.string(),
  publicLocationLabel: v.optional(v.string()),
  completedSteps: v.array(completedStepValidator),
  coverUrl: v.union(v.string(), v.null()),
  photoCount: v.number(),
  lastEditedAt: v.number(),
  publishedAt: v.optional(v.number()),
});
const detailValidator = v.object({
  _id: v.id("listings"),
  status: v.literal("published"),
  title: v.string(),
  summary: v.optional(v.string()),
  description: v.optional(v.string()),
  propertyType: v.optional(propertyTypeValidator),
  rentalArrangement: v.optional(rentalArrangementValidator),
  monthlyRent: v.optional(v.number()),
  deposit: v.optional(v.number()),
  currency: v.string(),
  utilitiesIncluded: v.optional(v.boolean()),
  sizeSqm: v.optional(v.number()),
  bedroomCount: v.optional(v.number()),
  bathroomCount: v.optional(v.number()),
  furnished: v.optional(v.boolean()),
  availableFrom: v.optional(v.string()),
  availableTo: v.optional(v.string()),
  minLeaseMonths: v.optional(v.number()),
  maxLeaseMonths: v.optional(v.number()),
  amenities: v.array(amenityValidator),
  publicLocationLabel: v.optional(v.string()),
  publicCoordinate: v.optional(coordinateValidator),
  contentLanguage: v.optional(v.union(v.literal("en"), v.literal("da"))),
  photos: v.array(v.object({
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    url: v.union(v.string(), v.null()),
  })),
  publishedAt: v.number(),
});

const exploreResultValidator = v.object({
  items: v.array(exploreItemValidator),
  total: v.number(),
  truncated: v.boolean(),
  continueCursor: v.string(),
  isDone: v.boolean(),
  scanned: v.number(),
});

function trimOrUndefined(value?: string) {
  return normalizeText(value);
}

function coercePositiveNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value >= 0 ? value : undefined;
}

function randomAngle() {
  // Convex mutations replace Math.random with a private, seeded strong PRNG.
  return Math.random() * Math.PI * 2;
}

function getPublicCoordinate(
  exactCoordinate: { latitude: number; longitude: number },
  angle: number,
) {
  if (
    exactCoordinate.latitude < -90 ||
    exactCoordinate.latitude > 90 ||
    exactCoordinate.longitude < -180 ||
    exactCoordinate.longitude > 180
  ) {
    throw new ConvexError("The exact coordinate is invalid.");
  }
  const latitudeOffset = (250 * Math.cos(angle)) / 111_320;
  const longitudeScale = Math.max(Math.cos((exactCoordinate.latitude * Math.PI) / 180), 0.01);
  const longitudeOffset = (250 * Math.sin(angle)) / (111_320 * longitudeScale);
  const longitude = exactCoordinate.longitude + longitudeOffset;
  return {
    latitude: Math.max(-90, Math.min(90, exactCoordinate.latitude + latitudeOffset)),
    longitude: ((longitude + 180) % 360 + 360) % 360 - 180,
  };
}

type ListingRecord = Doc<"listings">;
type SavedListingRecord = Doc<"savedListings">;
type PublishedSearchValue = Omit<Doc<"publishedListingSearch">, "_id" | "_creationTime">;
type ExploreSort = "newest" | "rentAsc" | "rentDesc" | "distance";
type ExploreCursor = {
  version: 1;
  criteria: string;
  sort: ExploreSort;
  value: number | null;
  listingId: string;
};

function isExploreSort(value: unknown): value is ExploreSort {
  return value === "newest" || value === "rentAsc" ||
    value === "rentDesc" || value === "distance";
}

function getExploreCriteria(input: {
  sort: ExploreSort;
  area?: string;
  propertyTypes?: ("house" | "apartment" | "studio" | "room")[];
  rentalArrangements?: ("standard" | "sublease")[];
  minimumRent?: number;
  maximumRent?: number;
  viewport?: { north: number; south: number; east: number; west: number };
  origin?: { latitude: number; longitude: number };
}) {
  return JSON.stringify({
    sort: input.sort,
    area: input.area,
    propertyTypes: [...(input.propertyTypes ?? [])].sort(),
    rentalArrangements: [...(input.rentalArrangements ?? [])].sort(),
    minimumRent: input.minimumRent,
    maximumRent: input.maximumRent,
    viewport: input.viewport,
    origin: input.origin,
  });
}

function parseExploreCursor(value: string | null | undefined, criteria: string) {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" || parsed === null ||
      !("version" in parsed) || parsed.version !== 1 ||
      !("criteria" in parsed) || parsed.criteria !== criteria ||
      !("sort" in parsed) || !isExploreSort(parsed.sort) ||
      !("value" in parsed) ||
      !(parsed.value === null || (typeof parsed.value === "number" && Number.isFinite(parsed.value))) ||
      !("listingId" in parsed) || typeof parsed.listingId !== "string"
    ) {
      throw new Error("Invalid cursor");
    }
    return {
      version: 1 as const,
      criteria: parsed.criteria,
      sort: parsed.sort,
      value: parsed.value,
      listingId: parsed.listingId,
    } satisfies ExploreCursor;
  } catch {
    throw new ConvexError("Explore cursor is invalid for these filters.");
  }
}

function getDistance(
  coordinate: PublishedSearchValue["publicCoordinate"],
  origin: { latitude: number; longitude: number } | undefined,
) {
  if (!coordinate || !origin) return null;
  const toRadians = Math.PI / 180;
  const latitudeDelta = (coordinate.latitude - origin.latitude) * toRadians;
  const longitudeDelta = (coordinate.longitude - origin.longitude) * toRadians;
  const originLatitude = origin.latitude * toRadians;
  const coordinateLatitude = coordinate.latitude * toRadians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(coordinateLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getExploreSortValue(
  item: PublishedSearchValue,
  sort: ExploreSort,
  origin: { latitude: number; longitude: number } | undefined,
) {
  if (sort === "newest") return -item.publishedAt;
  if (sort === "rentAsc") return item.monthlyRent ?? null;
  if (sort === "rentDesc") return item.monthlyRent === undefined ? null : -item.monthlyRent;
  return getDistance(item.publicCoordinate, origin);
}

function compareExplorePosition(
  left: { value: number | null; listingId: string },
  right: { value: number | null; listingId: string },
) {
  const leftValue = left.value ?? Number.POSITIVE_INFINITY;
  const rightValue = right.value ?? Number.POSITIVE_INFINITY;
  if (leftValue !== rightValue) return leftValue - rightValue;
  return left.listingId.localeCompare(right.listingId);
}

function getExplorePosition(
  item: PublishedSearchValue,
  sort: ExploreSort,
  origin: { latitude: number; longitude: number } | undefined,
) {
  return {
    value: getExploreSortValue(item, sort, origin),
    listingId: String(item.listingId),
  };
}

async function loadPublishedSearchCatalog(ctx: QueryCtx) {
  const state = await ctx.db
    .query("publishedSearchState")
    .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", PUBLISHED_SEARCH_STATE_KEY))
    .first();
  if (state?.status === "complete" && state.version === PUBLISHED_SEARCH_VERSION) {
    const projections = await ctx.db
      .query("publishedListingSearch")
      .withIndex("by_published_at")
      .take(MAX_EXPLORE_CATALOG + 1);
    if (projections.length > MAX_EXPLORE_CATALOG) {
      throw new ConvexError("Explore has reached its safe catalog capacity.");
    }
    return projections.map((projection): PublishedSearchValue => ({
      listingId: projection.listingId,
      title: projection.title,
      summary: projection.summary,
      propertyType: projection.propertyType,
      rentalArrangement: projection.rentalArrangement,
      monthlyRent: projection.monthlyRent,
      currency: projection.currency,
      sizeSqm: projection.sizeSqm,
      availableFrom: projection.availableFrom,
      availableTo: projection.availableTo,
      publicLocationLabel: projection.publicLocationLabel,
      normalizedLocation: projection.normalizedLocation,
      publicCoordinate: projection.publicCoordinate,
      contentLanguage: projection.contentLanguage,
      coverStorageId: projection.coverStorageId,
      photoCount: projection.photoCount,
      publishedAt: projection.publishedAt,
    }));
  }
  const listings = await ctx.db
    .query("listings")
    .withIndex("by_status_and_published_at", (queryBuilder) =>
      queryBuilder.eq("status", "published"))
    .take(MAX_EXPLORE_CATALOG + 1);
  if (listings.length > MAX_EXPLORE_CATALOG) {
    throw new ConvexError("Explore migration has reached its safe catalog capacity.");
  }
  return listings.map(toPublishedSearchValue);
}

type CompletionItem = {
  key: string;
  label: string;
  step: Exclude<ListingStepKey, "review">;
  complete: boolean;
};

type CompletionInput = Pick<
  ListingRecord,
  | "title"
  | "description"
  | "propertyType"
  | "rentalArrangement"
  | "monthlyRent"
  | "sizeSqm"
  | "availableFrom"
  | "availableTo"
  | "amenities"
  | "addressLine1"
  | "postalCode"
  | "city"
  | "countryCode"
  | "exactCoordinate"
  | "photos"
  | "status"
>;

function getCompletionState(listing: CompletionInput) {
  const validDate = (value?: string) => parseDateOnly(value) !== undefined;
  const checklist: CompletionItem[] = [
    { key: "title", label: "Add a listing title", step: "basics", complete: Boolean(normalizeText(listing.title)) },
    { key: "description", label: "Write a full description", step: "basics", complete: Boolean(normalizeText(listing.description)) },
    { key: "propertyType", label: "Choose a property type", step: "basics", complete: Boolean(listing.propertyType) },
    { key: "rentalArrangement", label: "Choose a rental arrangement", step: "basics", complete: Boolean(listing.rentalArrangement) },
    { key: "monthlyRent", label: "Set the monthly rent", step: "details", complete: (listing.monthlyRent ?? 0) > 0 },
    { key: "sizeSqm", label: "Add the size in sqm", step: "details", complete: (listing.sizeSqm ?? 0) > 0 },
    { key: "availableFrom", label: "Set when the home is available", step: "details", complete: validDate(listing.availableFrom) },
    { key: "availableTo", label: "Subleases need an end date", step: "details", complete: listing.rentalArrangement !== "sublease" || validDate(listing.availableTo) },
    {
      key: "address",
      label: "Add the private address",
      step: "location",
      complete: Boolean(listing.addressLine1 && listing.postalCode && listing.city && listing.countryCode),
    },
    {
      key: "coordinate",
      label: "Confirm the address location",
      step: "location",
      complete: Boolean(listing.exactCoordinate),
    },
    { key: "photo", label: "Upload at least 1 photo", step: "photos", complete: listing.photos.length > 0 },
  ];
  const completedSteps: ListingStepKey[] = [];
  for (const step of ["basics", "details", "location", "photos"] as const) {
    if (checklist.filter((item) => item.step === step).every((item) => item.complete)) {
      completedSteps.push(step);
    }
  }
  if (listing.amenities.length > 0) completedSteps.push("features");
  if (listing.status === "published") completedSteps.push("review");
  return { checklist, completedSteps, canPublish: checklist.every((item) => item.complete) };
}

async function getOwnedListing(
  ctx: MutationCtx | QueryCtx,
  listingId: Id<"listings">,
  ownerKey: string,
) {
  const listing = await ctx.db.get(listingId);
  if (!listing) {
    throw new ConvexError("Listing not found.");
  }

  if (listing.ownerMode !== "device" || !listing.ownerKeyHash) {
    throw new ConvexError("Listing ownership is not available on this device.");
  }

  const ownerKeyHash = await getActiveDeviceHash(ctx, ownerKey);
  if (ownerKeyHash !== listing.ownerKeyHash) {
    throw new ConvexError("This draft belongs to a different device.");
  }

  return listing;
}

function dedupeAmenities(amenities: ListingAmenity[]) {
  return Array.from(new Set(amenities));
}

function sanitizeListing(listing: ListingRecord) {
  const completion = getCompletionState(toCompletionInput(listing));

  return {
    ...listing,
    _id: listing._id,
    photos: listing.photos.map((photo) => ({
      storageId: photo.storageId,
      width: photo.width,
      height: photo.height,
      mimeType: photo.mimeType,
    })),
    completion,
    completedSteps: completion.completedSteps,
  };
}

function getListingCoverStorageId(listing: ListingRecord) {
  return listing.coverStorageId ?? listing.photos[0]?.storageId;
}

async function getListingCoverUrl(ctx: QueryCtx, listing: ListingRecord) {
  const coverStorageId = getListingCoverStorageId(listing);
  return coverStorageId ? ctx.storage.getUrl(coverStorageId) : null;
}

function getPublishedSortTimestamp(listing: ListingRecord) {
  return listing.publishedAt ?? listing.lastEditedAt;
}

function getSafePublicCoordinate(listing: ListingRecord) {
  return listing.publicCoordinateAngle === undefined ? undefined : listing.publicCoordinate;
}

function toListingExploreItem(listing: ListingRecord, coverUrl: string | null) {
  return {
    _id: listing._id,
    title: listing.title,
    summary: listing.summary,
    propertyType: listing.propertyType,
    rentalArrangement: listing.rentalArrangement,
    monthlyRent: listing.monthlyRent,
    currency: listing.currency,
    sizeSqm: listing.sizeSqm,
    availableFrom: listing.availableFrom,
    availableTo: listing.availableTo,
    publicLocationLabel: listing.publicLocationLabel,
    publicCoordinate: getSafePublicCoordinate(listing),
    contentLanguage: listing.contentLanguage,
    coverUrl,
    photoCount: listing.photos.length,
    publishedAt: getPublishedSortTimestamp(listing),
  };
}

async function toSavedListingItem(
  ctx: QueryCtx,
  savedListing: SavedListingRecord,
) {
  const listing = await ctx.db.get(savedListing.listingId);
  if (!listing || listing.status !== "published") {
    return null;
  }

  return {
    ...toListingExploreItem(listing, await getListingCoverUrl(ctx, listing)),
    savedAt: savedListing.savedAt,
  };
}

async function getSavedListingRecord(
  ctx: MutationCtx | QueryCtx,
  ownerKeyHash: string,
  listingId: Id<"listings">,
) {
  return await ctx.db
    .query("savedListings")
    .withIndex("by_owner_key_listing", (queryBuilder) =>
      queryBuilder.eq("ownerKeyHash", ownerKeyHash).eq("listingId", listingId),
    )
    .unique();
}

function ensureDraftStatus(listing: ListingRecord) {
  if (listing.status !== "draft" && listing.status !== "paused") {
    throw new ConvexError("Only draft or paused listings can be edited.");
  }
}

function applyBasicsPatch(payload: {
  title?: string;
  summary?: string;
  description?: string;
  propertyType?: "house" | "apartment" | "studio" | "room";
  rentalArrangement?: "standard" | "sublease";
  contentLanguage?: "en" | "da";
}) {
  const patch: Partial<ListingRecord> = {};

  if ("title" in payload) {
    patch.title = trimOrUndefined(payload.title) ?? "";
  }

  if ("summary" in payload) {
    patch.summary = trimOrUndefined(payload.summary);
  }

  if ("description" in payload) {
    patch.description = trimOrUndefined(payload.description);
  }

  if ("propertyType" in payload) {
    patch.propertyType = payload.propertyType;
  }

  if ("rentalArrangement" in payload) {
    patch.rentalArrangement = payload.rentalArrangement;
  }

  if ("contentLanguage" in payload) {
    patch.contentLanguage = payload.contentLanguage;
  }

  return patch;
}

function applyDetailsPatch(payload: {
  monthlyRent?: number;
  deposit?: number;
  currency?: string;
  utilitiesIncluded?: boolean;
  sizeSqm?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  furnished?: boolean;
  availableFrom?: string;
  availableTo?: string;
  minLeaseMonths?: number;
  maxLeaseMonths?: number;
}) {
  const patch: Partial<ListingRecord> = {};

  if ("monthlyRent" in payload) {
    patch.monthlyRent = coercePositiveNumber(payload.monthlyRent);
  }

  if ("deposit" in payload) {
    patch.deposit = coercePositiveNumber(payload.deposit);
  }

  if ("currency" in payload) {
    patch.currency = trimOrUndefined(payload.currency) ?? DEFAULT_CURRENCY;
  }

  if ("utilitiesIncluded" in payload) {
    patch.utilitiesIncluded = payload.utilitiesIncluded;
  }

  if ("sizeSqm" in payload) {
    patch.sizeSqm = coercePositiveNumber(payload.sizeSqm);
  }

  if ("bedroomCount" in payload) {
    patch.bedroomCount = coercePositiveNumber(payload.bedroomCount);
  }

  if ("bathroomCount" in payload) {
    patch.bathroomCount = coercePositiveNumber(payload.bathroomCount);
  }

  if ("furnished" in payload) {
    patch.furnished = payload.furnished;
  }

  if ("availableFrom" in payload) {
    patch.availableFrom = trimOrUndefined(payload.availableFrom);
  }

  if ("availableTo" in payload) {
    patch.availableTo = trimOrUndefined(payload.availableTo);
  }

  if ("minLeaseMonths" in payload) {
    patch.minLeaseMonths = coercePositiveNumber(payload.minLeaseMonths);
  }

  if ("maxLeaseMonths" in payload) {
    patch.maxLeaseMonths = coercePositiveNumber(payload.maxLeaseMonths);
  }

  return patch;
}

function applyLocationPatch(payload: {
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  neighborhood?: string;
  publicLocationLabel?: string;
}) {
  const patch: Partial<ListingRecord> = {};
  const neighborhood = trimOrUndefined(payload.neighborhood);
  const city = trimOrUndefined(payload.city);
  const countryCode = trimOrUndefined(payload.countryCode)?.toUpperCase();

  if ("addressLine1" in payload) {
    patch.addressLine1 = trimOrUndefined(payload.addressLine1);
  }

  if ("addressLine2" in payload) {
    patch.addressLine2 = trimOrUndefined(payload.addressLine2);
  }

  if ("postalCode" in payload) {
    patch.postalCode = trimOrUndefined(payload.postalCode);
  }

  if ("city" in payload) {
    patch.city = city;
  }

  if ("countryCode" in payload) {
    patch.countryCode = countryCode;
  }

  if ("neighborhood" in payload) {
    patch.neighborhood = neighborhood;
  }

  if ("publicLocationLabel" in payload || "neighborhood" in payload || "city" in payload || "countryCode" in payload) {
    patch.publicLocationLabel =
      trimOrUndefined(payload.publicLocationLabel) ??
      buildPublicLocationLabel({ neighborhood, city, countryCode });
  }

  return patch;
}

function toCompletionInput(listing: ListingRecord) {
  return {
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    rentalArrangement: listing.rentalArrangement,
    monthlyRent: listing.monthlyRent,
    sizeSqm: listing.sizeSqm,
    availableFrom: listing.availableFrom,
    availableTo: listing.availableTo,
    amenities: listing.amenities,
    addressLine1: listing.addressLine1,
    postalCode: listing.postalCode,
    city: listing.city,
    countryCode: listing.countryCode,
    exactCoordinate: listing.exactCoordinate,
    photos: listing.photos.map((photo) => ({
      storageId: photo.storageId,
      width: photo.width,
      height: photo.height,
      mimeType: photo.mimeType,
    })),
    status: listing.status,
  };
}

function getPublishErrors(listing: ListingRecord) {
  const completion = getCompletionState(toCompletionInput(listing));

  const missing = completion.checklist.filter((item: (typeof completion.checklist)[number]) => !item.complete);

  if (listing.minLeaseMonths && listing.maxLeaseMonths && listing.minLeaseMonths > listing.maxLeaseMonths) {
    missing.push({
      key: "leaseDuration",
      label: "Minimum lease length must be shorter than the maximum lease length.",
      step: "details",
      complete: false,
    });
  }

  if (
    listing.availableFrom &&
    listing.availableTo &&
    parseDateOnly(listing.availableTo)! < parseDateOnly(listing.availableFrom)!
  ) {
    missing.push({
      key: "availableTo",
      label: "Available to must be after available from.",
      step: "details",
      complete: false,
    });
  }

  if (requiresAvailableTo(listing.rentalArrangement) && !listing.availableTo) {
    missing.push({
      key: "availableTo",
      label: "Subleases need an end date.",
      step: "details",
      complete: false,
    });
  }

  return missing;
}

function validateListingForPublishing(listing: ListingRecord) {
  boundedText(listing.title, { field: "Title", maximum: 120 });
  optionalBoundedText(listing.summary, { field: "Summary", maximum: 240 });
  boundedText(listing.description ?? "", { field: "Description", maximum: 8_000 });
  boundedText(listing.currency, { field: "Currency", maximum: 3 });
  boundedText(listing.addressLine1 ?? "", { field: "Address", maximum: 200 });
  boundedText(listing.postalCode ?? "", { field: "Postal code", maximum: 32 });
  boundedText(listing.city ?? "", { field: "City", maximum: 120 });
  boundedText(listing.countryCode ?? "", {
    field: "Country code", minimum: 2, maximum: 2,
  });
  boundedNumber(listing.monthlyRent ?? Number.NaN, {
    field: "Monthly rent", minimum: 1, maximum: 10_000_000,
  });
  boundedNumber(listing.sizeSqm ?? Number.NaN, {
    field: "Size", minimum: 1, maximum: 10_000,
  });
  boundedArray(listing.amenities, { field: "Amenities", maximum: 8 });
  boundedArray(listing.photos, { field: "Photos", maximum: MAX_LISTING_PHOTOS });
  if (parseDateOnly(listing.availableFrom) === undefined ||
    (listing.availableTo && parseDateOnly(listing.availableTo) === undefined)) {
    throw new ConvexError("Availability must use real dates in YYYY-MM-DD format.");
  }
}

export const createDraft = mutation({
  args: {
    ownerKey: v.string(),
  },
  returns: v.object({ listingId: v.id("listings") }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_owner_mode_key_status", (queryBuilder) =>
        queryBuilder.eq("ownerMode", "device").eq("ownerKeyHash", ownerKeyHash),
      )
      .take(21);
    if (listings.length >= 20) {
      throw new ConvexError("A device can keep up to 20 listings.");
    }
    const timestamp = Date.now();
    const listingId = await ctx.db.insert("listings", {
      status: "draft",
      ownerMode: "device",
      ownerKeyHash,
      title: "",
      contentLanguage: "en",
      currency: DEFAULT_CURRENCY,
      amenities: [],
      photos: [],
      completedSteps: [],
      moderationState: "active",
      lifecycleChangedAt: timestamp,
      lastEditedAt: timestamp,
    });

    return { listingId };
  },
});

export const getDraft = query({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  returns: draftValidator,
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    const draft = sanitizeListing(listing);
    return {
      ...draft,
      photos: await Promise.all(
        listing.photos.map(async (photo) => ({
          storageId: photo.storageId,
          width: photo.width,
          height: photo.height,
          mimeType: photo.mimeType,
          url: await ctx.storage.getUrl(photo.storageId),
        })),
      ),
    };
  },
});

export const saveSection = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    input: v.union(
      v.object({ section: v.literal("basics"), payload: basicsPayloadValidator }),
      v.object({ section: v.literal("details"), payload: detailsPayloadValidator }),
      v.object({ section: v.literal("features"), payload: featuresPayloadValidator }),
      v.object({ section: v.literal("location"), payload: locationPayloadValidator }),
    ),
  },
  returns: v.object({ completedSteps: v.array(completedStepValidator) }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    let patch: Partial<ListingRecord>;
    switch (args.input.section) {
      case "basics":
        validateBasicsPayload(args.input.payload);
        patch = applyBasicsPatch(args.input.payload);
        break;
      case "details":
        validateDetailsPayload(args.input.payload);
        patch = applyDetailsPatch(args.input.payload);
        break;
      case "features":
        boundedArray(args.input.payload.amenities, { field: "Amenities", maximum: 8 });
        patch = { amenities: dedupeAmenities(args.input.payload.amenities) };
        break;
      case "location": {
        validateLocationPayload(args.input.payload);
        patch = applyLocationPatch(args.input.payload);
        if (
          "addressLine1" in args.input.payload ||
          "addressLine2" in args.input.payload ||
          "postalCode" in args.input.payload ||
          "city" in args.input.payload ||
          "countryCode" in args.input.payload
        ) {
          patch.exactCoordinate = undefined;
          patch.publicCoordinate = undefined;
          patch.publicCoordinateAngle = undefined;
        }
        break;
      }
    }

    const nextListing: ListingRecord = { ...listing, ...patch };
    const completion = getCompletionState(toCompletionInput(nextListing));

    const lastEditedAt = Date.now();
    await ctx.db.patch(args.listingId, {
      ...patch,
      completedSteps: completion.completedSteps,
      lastEditedAt,
    });

    return { completedSteps: completion.completedSteps };
  },
});

export const removeDraft = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  returns: v.object({ listingId: v.id("listings") }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    if (listing.status !== "draft") {
      throw new ConvexError("Only draft listings can be removed.");
    }

    await Promise.all(listing.photos.map((photo) => deleteOwnedUploadedFile(ctx, {
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
      storageId: photo.storageId,
    })));
    await ctx.db.delete(args.listingId);

    return { listingId: args.listingId };
  },
});

export const listMine = query({
  args: {
    ownerKey: v.string(),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("paused"),
      v.literal("rented"),
      v.literal("archived"),
    )),
  },
  returns: v.array(mineItemValidator),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);

    const requestedStatus = args.status;
    const records = requestedStatus
      ? await ctx.db
          .query("listings")
          .withIndex("by_owner_mode_key_status", (queryBuilder) =>
            queryBuilder
              .eq("ownerMode", "device")
              .eq("ownerKeyHash", ownerKeyHash)
              .eq("status", requestedStatus),
          )
          .take(100)
      : await ctx.db
          .query("listings")
          .withIndex("by_owner_mode_key_status", (queryBuilder) =>
            queryBuilder.eq("ownerMode", "device").eq("ownerKeyHash", ownerKeyHash),
          )
          .take(100);

    return Promise.all(
      records
        .sort((left, right) => right.lastEditedAt - left.lastEditedAt)
        .map(async (listing) => {
          const coverUrl = await getListingCoverUrl(ctx, listing);
          return {
            _id: listing._id,
            status: listing.status,
            title: listing.title,
            summary: listing.summary,
            propertyType: listing.propertyType,
            rentalArrangement: listing.rentalArrangement,
            monthlyRent: listing.monthlyRent,
            currency: listing.currency,
            publicLocationLabel: listing.publicLocationLabel,
            completedSteps: listing.completedSteps,
            coverUrl,
            photoCount: listing.photos.length,
            lastEditedAt: listing.lastEditedAt,
            publishedAt: listing.publishedAt,
          };
        }),
    );
  },
});

export const listPublished = query({
  args: {},
  returns: v.array(exploreItemValidator),
  handler: async (ctx) => {
    const records = await ctx.db
      .query("listings")
      .withIndex("by_status_and_published_at", (queryBuilder) =>
        queryBuilder.eq("status", "published"),
      )
      .order("desc")
      .take(100);

    return Promise.all(
      records
        .sort((left, right) => getPublishedSortTimestamp(right) - getPublishedSortTimestamp(left))
        .map(async (listing) => toListingExploreItem(listing, await getListingCoverUrl(ctx, listing))),
    );
  },
});

export const backfillPublishedSearch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({ migrated: v.number(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("publishedSearchState")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", PUBLISHED_SEARCH_STATE_KEY))
      .first();
    if (
      args.cursor === null &&
      state?.version === PUBLISHED_SEARCH_VERSION &&
      state.status === "complete"
    ) {
      return { migrated: 0, isDone: true };
    }
    const now = Date.now();
    if (!state) {
      await ctx.db.insert("publishedSearchState", {
        key: PUBLISHED_SEARCH_STATE_KEY,
        version: PUBLISHED_SEARCH_VERSION,
        status: "backfilling",
        cursor: args.cursor ?? undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(state._id, {
        version: PUBLISHED_SEARCH_VERSION,
        status: "backfilling",
        cursor: args.cursor ?? undefined,
        updatedAt: now,
      });
    }
    const page = await ctx.db
      .query("listings")
      .withIndex("by_status_and_published_at", (queryBuilder) =>
        queryBuilder.eq("status", "published"))
      .paginate({ cursor: args.cursor, numItems: 50 });
    for (const listing of page.page) {
      await upsertPublishedSearch(ctx, listing);
    }
    const currentState = await ctx.db
      .query("publishedSearchState")
      .withIndex("by_key", (queryBuilder) => queryBuilder.eq("key", PUBLISHED_SEARCH_STATE_KEY))
      .first();
    if (!currentState) throw new ConvexError("Published search migration state was lost.");
    await ctx.db.patch(currentState._id, {
      status: page.isDone ? "complete" : "backfilling",
      cursor: page.isDone ? undefined : page.continueCursor,
      updatedAt: Date.now(),
    });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.listings.backfillPublishedSearch, {
        cursor: page.continueCursor,
      });
    }
    return { migrated: page.page.length, isDone: page.isDone };
  },
});

export const explore = query({
  args: {
    filters: v.optional(v.object({
      area: v.optional(v.string()),
      propertyTypes: v.optional(v.array(propertyTypeValidator)),
      rentalArrangements: v.optional(v.array(rentalArrangementValidator)),
      minimumRent: v.optional(v.number()),
      maximumRent: v.optional(v.number()),
    })),
    sort: v.optional(v.union(
      v.literal("newest"),
      v.literal("rentAsc"),
      v.literal("rentDesc"),
      v.literal("distance"),
    )),
    viewport: v.optional(v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    })),
    origin: v.optional(coordinateValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: exploreResultValidator,
  handler: async (ctx, args) => {
    const requestedLimit = Math.min(Math.max(Math.floor(args.limit ?? 100), 1), 100);
    optionalBoundedText(args.filters?.area, { field: "Explore area", maximum: 160 });
    boundedArray(args.filters?.propertyTypes ?? [], {
      field: "Explore property types", maximum: 4,
    });
    boundedArray(args.filters?.rentalArrangements ?? [], {
      field: "Explore rental arrangements", maximum: 2,
    });
    optionalBoundedNumber(args.filters?.minimumRent, {
      field: "Minimum rent", minimum: 0, maximum: 10_000_000,
    });
    optionalBoundedNumber(args.filters?.maximumRent, {
      field: "Maximum rent", minimum: 0, maximum: 10_000_000,
    });
    if (args.filters?.minimumRent !== undefined && args.filters.maximumRent !== undefined &&
      args.filters.minimumRent > args.filters.maximumRent) {
      throw new ConvexError("Minimum rent cannot exceed maximum rent.");
    }
    if (args.viewport) {
      boundedNumber(args.viewport.north, { field: "Viewport north", minimum: -90, maximum: 90 });
      boundedNumber(args.viewport.south, { field: "Viewport south", minimum: -90, maximum: 90 });
      boundedNumber(args.viewport.east, { field: "Viewport east", minimum: -180, maximum: 180 });
      boundedNumber(args.viewport.west, { field: "Viewport west", minimum: -180, maximum: 180 });
      if (args.viewport.north < args.viewport.south) {
        throw new ConvexError("Viewport north must be above south.");
      }
    }
    if (args.origin) {
      boundedNumber(args.origin.latitude, { field: "Origin latitude", minimum: -90, maximum: 90 });
      boundedNumber(args.origin.longitude, {
        field: "Origin longitude", minimum: -180, maximum: 180,
      });
    }
    const sort = args.sort ?? "newest";
    if (sort === "distance" && !args.origin) {
      throw new ConvexError("Distance sorting requires a location origin.");
    }
    const candidates = await loadPublishedSearchCatalog(ctx);
    const filters = args.filters;
    const area = filters?.area?.trim().toLocaleLowerCase();
    const inViewport = (coordinate: PublishedSearchValue["publicCoordinate"]) => {
      if (!args.viewport) return true;
      if (!coordinate) return false;
      const longitudeMatches = args.viewport.west <= args.viewport.east
        ? coordinate.longitude >= args.viewport.west && coordinate.longitude <= args.viewport.east
        : coordinate.longitude >= args.viewport.west || coordinate.longitude <= args.viewport.east;
      return coordinate.latitude >= args.viewport.south &&
        coordinate.latitude <= args.viewport.north && longitudeMatches;
    };
    const matches = candidates.filter((listing) => {
      if (area && !listing.normalizedLocation?.includes(area)) return false;
      if (filters?.propertyTypes?.length &&
        (!listing.propertyType || !filters.propertyTypes.includes(listing.propertyType))) return false;
      if (filters?.rentalArrangements?.length &&
        (!listing.rentalArrangement || !filters.rentalArrangements.includes(listing.rentalArrangement))) return false;
      if (filters?.minimumRent !== undefined && (listing.monthlyRent ?? 0) < filters.minimumRent) return false;
      if (filters?.maximumRent !== undefined &&
        (listing.monthlyRent ?? Number.POSITIVE_INFINITY) > filters.maximumRent) return false;
      return inViewport(listing.publicCoordinate);
    });
    matches.sort((left, right) => compareExplorePosition(
      getExplorePosition(left, sort, args.origin),
      getExplorePosition(right, sort, args.origin),
    ));
    const criteria = getExploreCriteria({
      sort,
      area,
      propertyTypes: filters?.propertyTypes,
      rentalArrangements: filters?.rentalArrangements,
      minimumRent: filters?.minimumRent,
      maximumRent: filters?.maximumRent,
      viewport: args.viewport,
      origin: args.origin,
    });
    const cursor = parseExploreCursor(args.cursor, criteria);
    const remaining = cursor
      ? matches.filter((item) => compareExplorePosition(
          getExplorePosition(item, sort, args.origin),
          cursor,
        ) > 0)
      : matches;
    const selected = remaining.slice(0, requestedLimit);
    const items = await Promise.all(
      selected.map(async (listing) => ({
        _id: listing.listingId,
        title: listing.title,
        summary: listing.summary,
        propertyType: listing.propertyType,
        rentalArrangement: listing.rentalArrangement,
        monthlyRent: listing.monthlyRent,
        currency: listing.currency,
        sizeSqm: listing.sizeSqm,
        availableFrom: listing.availableFrom,
        availableTo: listing.availableTo,
        publicLocationLabel: listing.publicLocationLabel,
        publicCoordinate: listing.publicCoordinate,
        contentLanguage: listing.contentLanguage,
        coverUrl: listing.coverStorageId
          ? await ctx.storage.getUrl(listing.coverStorageId)
          : null,
        photoCount: listing.photoCount,
        publishedAt: listing.publishedAt,
      })),
    );
    const isDone = selected.length === remaining.length;
    const last = selected.at(-1);
    const continueCursor = !isDone && last
      ? JSON.stringify({
          version: 1,
          criteria,
          sort,
          ...getExplorePosition(last, sort, args.origin),
        } satisfies ExploreCursor)
      : "";
    return {
      items,
      total: matches.length,
      truncated: matches.length > MAX_MAP_PINS,
      continueCursor,
      isDone,
      scanned: candidates.length,
    };
  },
});

export const listSaved = query({
  args: {
    ownerKey: v.string(),
  },
  returns: v.array(v.object({ ...exploreItemValidator.fields, savedAt: v.number() })),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const savedListings = await ctx.db
      .query("savedListings")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .take(100);

    const items = await Promise.all(
      savedListings
        .sort((left, right) => right.savedAt - left.savedAt)
        .map((savedListing) => toSavedListingItem(ctx, savedListing)),
    );

    return items.filter((item) => item !== null);
  },
});

export const listSavedIds = query({
  args: {
    ownerKey: v.string(),
  },
  returns: v.array(v.id("listings")),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const savedListings = await ctx.db
      .query("savedListings")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .take(100);

    const ids = await Promise.all(
      savedListings.map(async (savedListing) => {
        const listing = await ctx.db.get(savedListing.listingId);
        return listing?.status === "published" ? savedListing.listingId : null;
      }),
    );

    return ids.filter((listingId): listingId is Id<"listings"> => listingId !== null);
  },
});

export const setSaved = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    isSaved: v.boolean(),
  },
  returns: v.object({ isSaved: v.boolean() }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const savedListing = await getSavedListingRecord(ctx, ownerKeyHash, args.listingId);

    if (!args.isSaved) {
      if (savedListing) {
        await ctx.db.delete(savedListing._id);
      }

      return { isSaved: false };
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      throw new ConvexError("Only published listings can be saved.");
    }

    if (!savedListing) {
      await ctx.db.insert("savedListings", {
        ownerKeyHash,
        listingId: args.listingId,
        savedAt: Date.now(),
      });
    }

    return { isSaved: true };
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  returns: v.object({ uploadUrl: v.string(), uploadSessionId: v.id("fileUploads") }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    if (listing.photos.length >= MAX_LISTING_PHOTOS) {
      throw new ConvexError(`You can upload up to ${MAX_LISTING_PHOTOS} photos.`);
    }

    return createUploadSession(ctx, {
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
    });
  },
});

export const attachPhoto = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    uploadSessionId: v.id("fileUploads"),
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  returns: v.object({ coverStorageId: v.optional(v.id("_storage")) }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    if (listing.photos.length >= MAX_LISTING_PHOTOS) {
      throw new ConvexError(`You can upload up to ${MAX_LISTING_PHOTOS} photos.`);
    }

    if (listing.photos.some((photo) => photo.storageId === args.storageId)) {
      return { coverStorageId: listing.coverStorageId ?? listing.photos[0]?.storageId };
    }

    await attachUploadedFile(ctx, {
      uploadSessionId: args.uploadSessionId,
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
      storageId: args.storageId,
    });
    optionalBoundedNumber(args.width, { field: "Photo width", minimum: 1, maximum: 100_000 });
    optionalBoundedNumber(args.height, { field: "Photo height", minimum: 1, maximum: 100_000 });
    optionalBoundedText(args.mimeType, { field: "Photo MIME type", maximum: 100 });

    const photos = [
      ...listing.photos,
      {
        storageId: args.storageId,
        width: args.width,
        height: args.height,
        mimeType: args.mimeType,
      },
    ];
    const coverStorageId = listing.coverStorageId ?? photos[0]?.storageId;
    const completion = getCompletionState(
      toCompletionInput({
        ...listing,
        photos,
        coverStorageId,
      }),
    );
    await ctx.db.patch(args.listingId, {
      photos,
      coverStorageId,
      completedSteps: completion.completedSteps,
      lastEditedAt: Date.now(),
    });

    return { coverStorageId };
  },
});

export const discardPhotoUpload = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    uploadSessionId: v.id("fileUploads"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);
    if (listing.photos.some((photo) => photo.storageId === args.storageId)) {
      throw new ConvexError("Attached listing photos must be removed from the draft.");
    }
    await attachUploadedFile(ctx, {
      uploadSessionId: args.uploadSessionId,
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
      storageId: args.storageId,
    });
    await deleteOwnedUploadedFile(ctx, {
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
      storageId: args.storageId,
    });
    return null;
  },
});

export const reorderPhotos = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    orderedStorageIds: v.array(v.id("_storage")),
  },
  returns: v.object({ coverStorageId: v.optional(v.id("_storage")) }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    boundedArray(args.orderedStorageIds, { field: "Photo order", maximum: MAX_LISTING_PHOTOS });
    if (args.orderedStorageIds.length !== listing.photos.length) {
      throw new ConvexError("Photo order does not match the draft.");
    }

    const currentById = new Map(listing.photos.map((photo) => [photo.storageId, photo]));
    const reordered = args.orderedStorageIds.map((storageId) => {
      const photo = currentById.get(storageId);
      if (!photo) {
        throw new ConvexError("Photo order includes an unknown image.");
      }

      return photo;
    });

    const uniqueIds = new Set(args.orderedStorageIds);
    if (uniqueIds.size !== listing.photos.length) {
      throw new ConvexError("Photo order contains duplicates.");
    }

    await ctx.db.patch(args.listingId, {
      photos: reordered,
      coverStorageId: reordered[0]?.storageId,
      lastEditedAt: Date.now(),
    });

    return { coverStorageId: reordered[0]?.storageId };
  },
});

export const removePhoto = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.object({ photoCount: v.number() }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    const target = listing.photos.find((photo) => photo.storageId === args.storageId);
    if (!target) {
      throw new ConvexError("Photo not found.");
    }

    const photos = listing.photos.filter((photo) => photo.storageId !== args.storageId);
    const completion = getCompletionState(
      toCompletionInput({
        ...listing,
        photos,
      }),
    );

    await deleteOwnedUploadedFile(ctx, {
      ownerKeyHash: listing.ownerKeyHash!,
      purpose: "listingPhoto",
      listingId: listing._id,
      storageId: args.storageId,
    });
    await ctx.db.patch(args.listingId, {
      photos,
      coverStorageId: photos[0]?.storageId,
      completedSteps: completion.completedSteps,
      lastEditedAt: Date.now(),
    });

    return { photoCount: photos.length };
  },
});

const geocodePreparationValidator = v.object({
  ownerKeyHash: v.string(),
  address: v.string(),
  addressFingerprint: v.string(),
  publicLocationLabel: v.optional(v.string()),
});

function listingAddressFingerprint(listing: Pick<
  ListingRecord,
  "addressLine1" | "addressLine2" | "postalCode" | "city" | "countryCode"
>) {
  return [
    listing.addressLine1,
    listing.addressLine2,
    listing.postalCode,
    listing.city,
    listing.countryCode,
  ].map((part) => normalizeText(part) ?? "").join("\u001f");
}

export const prepareGeocode = internalMutation({
  args: { listingId: v.id("listings"), ownerKey: v.string() },
  returns: geocodePreparationValidator,
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);
    if (!listing.addressLine1 || !listing.postalCode || !listing.city || !listing.countryCode) {
      throw new ConvexError("Complete the private address before confirming its location.");
    }
    const now = Date.now();
    await enforceRateLimit(ctx, {
      action: "geocodeListing",
      ownerKeyHash: listing.ownerKeyHash!,
      limit: 20,
      windowMs: 60 * 60 * 1_000,
      now,
    });
    const addressFingerprint = listingAddressFingerprint(listing);
    return {
      ownerKeyHash: listing.ownerKeyHash!,
      address: [
        listing.addressLine1,
        listing.addressLine2,
        `${listing.postalCode} ${listing.city}`,
        listing.countryCode,
      ].filter(Boolean).join(", "),
      addressFingerprint,
      publicLocationLabel: listing.publicLocationLabel,
    };
  },
});

export const applyGeocode = internalMutation({
  args: {
    listingId: v.id("listings"),
    ownerKeyHash: v.string(),
    addressFingerprint: v.string(),
    exactCoordinate: coordinateValidator,
  },
  returns: v.object({
    publicCoordinate: coordinateValidator,
    publicLocationLabel: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.ownerKeyHash !== args.ownerKeyHash ||
      listingAddressFingerprint(listing) !== args.addressFingerprint) {
      throw new ConvexError("The address changed while its location was being confirmed.");
    }
    ensureDraftStatus(listing);
    const angle = listing.publicCoordinateAngle ?? randomAngle();
    const publicCoordinate = getPublicCoordinate(args.exactCoordinate, angle);
    await ctx.db.patch(listing._id, {
      exactCoordinate: args.exactCoordinate,
      publicCoordinate,
      publicCoordinateAngle: angle,
      lastEditedAt: Date.now(),
    });
    return { publicCoordinate, publicLocationLabel: listing.publicLocationLabel };
  },
});

type GeocodePreparation = typeof geocodePreparationValidator.type;
type GeocodeResult = {
  publicCoordinate: { latitude: number; longitude: number };
  publicLocationLabel?: string;
};

export const geocodeLocation = action({
  args: { listingId: v.id("listings"), ownerKey: v.string() },
  returns: v.object({
    publicCoordinate: coordinateValidator,
    publicLocationLabel: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<GeocodeResult> => {
    const preparation: GeocodePreparation = await ctx.runMutation(
      internal.listings.prepareGeocode,
      args,
    );
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", preparation.address);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: { "User-Agent": "Homie rental listing geocoder" },
    });
    if (!response.ok) {
      throw new ConvexError("The address service is unavailable. Try again shortly.");
    }
    const body: unknown = await response.json();
    const first = Array.isArray(body) ? body[0] : undefined;
    if (!first || typeof first !== "object" || !("lat" in first) || !("lon" in first)) {
      throw new ConvexError("We could not locate that address. Check it and try again.");
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ConvexError("The address service returned an invalid location.");
    }
    return ctx.runMutation(internal.listings.applyGeocode, {
      listingId: args.listingId,
      ownerKeyHash: preparation.ownerKeyHash,
      addressFingerprint: preparation.addressFingerprint,
      exactCoordinate: { latitude, longitude },
    });
  },
});

export const publish = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  returns: v.object({ listingId: v.id("listings"), publishedAt: v.number() }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    if (listing.status !== "draft") {
      throw new ConvexError("Only draft listings can be published.");
    }

    const errors = getPublishErrors(listing);
    if (errors.length > 0) {
      throw new ConvexError(errors.map((item: (typeof errors)[number]) => item.label).join(" "));
    }
    validateListingForPublishing(listing);

    if (!listing.ownerKeyHash) {
      throw new ConvexError("Listing ownership is unavailable.");
    }
    const [published, paused] = await Promise.all([
      ctx.db
        .query("listings")
        .withIndex("by_owner_mode_key_status", (queryBuilder) =>
          queryBuilder
            .eq("ownerMode", "device")
            .eq("ownerKeyHash", listing.ownerKeyHash)
            .eq("status", "published"),
        )
        .take(5),
      ctx.db
        .query("listings")
        .withIndex("by_owner_mode_key_status", (queryBuilder) =>
          queryBuilder
            .eq("ownerMode", "device")
            .eq("ownerKeyHash", listing.ownerKeyHash)
            .eq("status", "paused"),
        )
        .take(5),
    ]);
    if (published.length + paused.length >= 5) {
      throw new ConvexError("A device can have at most 5 active listings.");
    }

    const publishedAt = Date.now();
    await enforceRateLimit(ctx, {
      action: "publishListing",
      ownerKeyHash: listing.ownerKeyHash,
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
      now: publishedAt,
    });
    const completion = getCompletionState(
      toCompletionInput({
        ...listing,
        status: "published",
      }),
    );
    const publishedListing: ListingRecord = {
      ...listing,
      status: "published",
      publishedAt,
      lifecycleChangedAt: publishedAt,
      completedSteps: completion.completedSteps,
      lastEditedAt: publishedAt,
    };

    await ctx.db.patch(args.listingId, {
      status: "published",
      publishedAt,
      lifecycleChangedAt: publishedAt,
      completedSteps: completion.completedSteps,
      lastEditedAt: publishedAt,
    });
    await upsertPublishedSearch(ctx, publishedListing);
    await enqueueMatchingPushes(ctx, publishedListing);

    return { listingId: args.listingId, publishedAt };
  },
});

export const getDetail = query({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.union(v.null(), detailValidator),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return null;
    }

    const photos = await Promise.all(
      listing.photos.map(async (photo) => ({
        width: photo.width,
        height: photo.height,
        mimeType: photo.mimeType,
        url: await ctx.storage.getUrl(photo.storageId),
      })),
    );

    return {
      _id: listing._id,
      status: "published" as const,
      title: listing.title,
      summary: listing.summary,
      description: listing.description,
      propertyType: listing.propertyType,
      rentalArrangement: listing.rentalArrangement,
      monthlyRent: listing.monthlyRent,
      deposit: listing.deposit,
      currency: listing.currency,
      utilitiesIncluded: listing.utilitiesIncluded,
      sizeSqm: listing.sizeSqm,
      bedroomCount: listing.bedroomCount,
      bathroomCount: listing.bathroomCount,
      furnished: listing.furnished,
      availableFrom: listing.availableFrom,
      availableTo: listing.availableTo,
      minLeaseMonths: listing.minLeaseMonths,
      maxLeaseMonths: listing.maxLeaseMonths,
      amenities: listing.amenities,
      publicLocationLabel: listing.publicLocationLabel,
      publicCoordinate: getSafePublicCoordinate(listing),
      contentLanguage: listing.contentLanguage,
      photos,
      publishedAt: listing.publishedAt ?? listing.lastEditedAt,
    };
  },
});

export const setLifecycle = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("paused"),
      v.literal("rented"),
      v.literal("archived"),
    ),
  },
  returns: v.object({
    listingId: v.id("listings"),
    status: v.union(
      v.literal("published"),
      v.literal("paused"),
      v.literal("rented"),
      v.literal("archived"),
    ),
    changedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    if (listing.moderationState === "takenDown") {
      throw new ConvexError("A taken-down listing cannot change status.");
    }
    const allowed =
      (listing.status === "published" && ["paused", "rented", "archived"].includes(args.status)) ||
      (listing.status === "paused" && ["published", "rented", "archived"].includes(args.status)) ||
      (listing.status === "rented" && args.status === "archived");
    if (!allowed) {
      throw new ConvexError(`Cannot change a ${listing.status} listing to ${args.status}.`);
    }
    if (args.status === "published" && listing.ownerKeyHash) {
      const errors = getPublishErrors(listing);
      if (errors.length > 0) {
        throw new ConvexError(errors.map((item) => item.label).join(" "));
      }
      validateListingForPublishing(listing);
      const published = await ctx.db
        .query("listings")
        .withIndex("by_owner_mode_key_status", (queryBuilder) =>
          queryBuilder
            .eq("ownerMode", "device")
            .eq("ownerKeyHash", listing.ownerKeyHash)
            .eq("status", "published"),
        )
        .take(5);
      if (published.length >= 5) {
        throw new ConvexError("A device can have at most 5 active listings.");
      }
    }
    const changedAt = Date.now();
    await ctx.db.patch(listing._id, {
      status: args.status,
      lifecycleChangedAt: changedAt,
      lastEditedAt: changedAt,
    });
    if (args.status === "published") {
      await upsertPublishedSearch(ctx, {
        ...listing,
        status: "published",
        lifecycleChangedAt: changedAt,
        lastEditedAt: changedAt,
      });
    } else {
      await removePublishedSearch(ctx, listing._id);
    }
    if (args.status === "rented" || args.status === "archived") {
      await closeOutstandingForListing(ctx, listing._id);
    }
    return { listingId: listing._id, status: args.status, changedAt };
  },
});
