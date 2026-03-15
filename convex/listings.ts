import {
  mutationGeneric as mutation,
  queryGeneric as query,
  type GenericMutationCtx,
  type GenericQueryCtx,
} from "convex/server";
import { ConvexError, type GenericId as Id, v } from "convex/values";
import {
  DEFAULT_CURRENCY,
  MAX_LISTING_PHOTOS,
  type ListingAmenity,
  type ListingExploreItem,
  type ListingStepKey,
} from "../src/features/listings/model";
import { buildPublicLocationLabel, getCompletionState, normalizeText, requiresAvailableTo } from "../src/features/listings/validation";

const propertyTypeValidator = v.union(
  v.literal("house"),
  v.literal("apartment"),
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

function trimOrUndefined(value?: string) {
  return normalizeText(value);
}

function coercePositiveNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value >= 0 ? value : undefined;
}

type ListingRecord = {
  _id: Id<"listings">;
  _creationTime: number;
  status: "draft" | "published" | "archived";
  ownerMode: "device" | "user";
  ownerKeyHash?: string;
  ownerSubject?: string;
  title: string;
  summary?: string;
  description?: string;
  propertyType?: "house" | "apartment" | "room";
  rentalArrangement?: "standard" | "sublease";
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
  photos: {
    storageId: Id<"_storage">;
    width?: number;
    height?: number;
    mimeType?: string;
  }[];
  coverStorageId?: Id<"_storage">;
  completedSteps: string[];
  publishedAt?: number;
  lastEditedAt: number;
};

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function getOwnedListing(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  listingId: Id<"listings">,
  ownerKey: string,
) {
  const listing = (await ctx.db.get(listingId)) as ListingRecord | null;
  if (!listing) {
    throw new ConvexError("Listing not found.");
  }

  if (listing.ownerMode !== "device" || !listing.ownerKeyHash) {
    throw new ConvexError("Listing ownership is not available on this device.");
  }

  const ownerKeyHash = await sha256Hex(ownerKey);
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

async function getListingCoverUrl(ctx: GenericQueryCtx<any>, listing: ListingRecord) {
  const coverStorageId = getListingCoverStorageId(listing);
  return coverStorageId ? ctx.storage.getUrl(coverStorageId) : null;
}

function getPublishedSortTimestamp(listing: ListingRecord) {
  return listing.publishedAt ?? listing.lastEditedAt;
}

function toListingExploreItem(listing: ListingRecord, coverUrl: string | null): ListingExploreItem {
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
    coverUrl,
    photoCount: listing.photos.length,
    publishedAt: getPublishedSortTimestamp(listing),
  };
}

function ensureDraftStatus(listing: ListingRecord) {
  if (listing.status !== "draft") {
    throw new ConvexError("Only draft listings can be edited.");
  }
}

function applyBasicsPatch(payload: {
  title?: string;
  summary?: string;
  description?: string;
  propertyType?: "house" | "apartment" | "room";
  rentalArrangement?: "standard" | "sublease";
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
    new Date(listing.availableTo).getTime() < new Date(listing.availableFrom).getTime()
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

export const createDraft = mutation({
  args: {
    ownerKey: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerKeyHash = await sha256Hex(args.ownerKey);
    const timestamp = Date.now();
    const listingId = await ctx.db.insert("listings", {
      status: "draft",
      ownerMode: "device",
      ownerKeyHash,
      title: "",
      currency: DEFAULT_CURRENCY,
      amenities: [],
      photos: [],
      completedSteps: [],
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
    section: v.union(
      v.literal("basics"),
      v.literal("details"),
      v.literal("features"),
      v.literal("location"),
    ),
    payload: v.union(
      basicsPayloadValidator,
      detailsPayloadValidator,
      featuresPayloadValidator,
      locationPayloadValidator,
    ),
  },
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    let patch: Partial<ListingRecord> = {};

    if (args.section === "basics") {
      patch = applyBasicsPatch(args.payload as Parameters<typeof applyBasicsPatch>[0]);
    }

    if (args.section === "details") {
      patch = applyDetailsPatch(args.payload as Parameters<typeof applyDetailsPatch>[0]);
    }

    if (args.section === "features") {
      patch = { amenities: dedupeAmenities((args.payload as { amenities: ListingAmenity[] }).amenities) };
    }

    if (args.section === "location") {
      patch = applyLocationPatch(args.payload as Parameters<typeof applyLocationPatch>[0]);
    }

    const nextListing = { ...listing, ...patch };
    const completion = getCompletionState(toCompletionInput(nextListing as ListingRecord));

    const lastEditedAt = Date.now();
    await ctx.db.patch(args.listingId, {
      ...patch,
      completedSteps: completion.completedSteps,
      lastEditedAt,
    });

    return { completedSteps: completion.completedSteps };
  },
});

export const listMine = query({
  args: {
    ownerKey: v.string(),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const ownerKeyHash = await sha256Hex(args.ownerKey);

    const records = (args.status
      ? await ctx.db
          .query("listings")
          .withIndex("by_owner_mode_key_status", (queryBuilder) =>
            (queryBuilder as any)
              .eq("ownerMode", "device")
              .eq("ownerKeyHash", ownerKeyHash)
              .eq("status", args.status),
          )
          .collect()
      : await ctx.db
          .query("listings")
          .withIndex("by_owner_mode_key_status", (queryBuilder) =>
            (queryBuilder as any).eq("ownerMode", "device").eq("ownerKeyHash", ownerKeyHash),
          )
          .collect()) as ListingRecord[];

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
  handler: async (ctx) => {
    const records = (await ctx.db
      .query("listings")
      .withIndex("by_status", (queryBuilder) => queryBuilder.eq("status", "published"))
      .collect()) as ListingRecord[];

    return Promise.all(
      records
        .sort((left, right) => getPublishedSortTimestamp(right) - getPublishedSortTimestamp(left))
        .map(async (listing) => toListingExploreItem(listing, await getListingCoverUrl(ctx, listing))),
    );
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    if (listing.photos.length >= MAX_LISTING_PHOTOS) {
      throw new ConvexError(`You can upload up to ${MAX_LISTING_PHOTOS} photos.`);
    }

    return ctx.storage.generateUploadUrl();
  },
});

export const attachPhoto = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    storageId: v.id("_storage"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

    if (listing.photos.length >= MAX_LISTING_PHOTOS) {
      throw new ConvexError(`You can upload up to ${MAX_LISTING_PHOTOS} photos.`);
    }

    if (listing.photos.some((photo) => photo.storageId === args.storageId)) {
      return sanitizeListing(listing);
    }

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

export const reorderPhotos = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
    orderedStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    ensureDraftStatus(listing);

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

    await ctx.storage.delete(args.storageId);
    await ctx.db.patch(args.listingId, {
      photos,
      coverStorageId: photos[0]?.storageId,
      completedSteps: completion.completedSteps,
      lastEditedAt: Date.now(),
    });

    return { photoCount: photos.length };
  },
});

export const publish = mutation({
  args: {
    listingId: v.id("listings"),
    ownerKey: v.string(),
  },
  handler: async (ctx, args) => {
    const listing = await getOwnedListing(ctx, args.listingId, args.ownerKey);
    if (listing.status !== "draft") {
      throw new ConvexError("Only draft listings can be published.");
    }

    const errors = getPublishErrors(listing);
    if (errors.length > 0) {
      throw new ConvexError(errors.map((item: (typeof errors)[number]) => item.label).join(" "));
    }

    const publishedAt = Date.now();
    const completion = getCompletionState(
      toCompletionInput({
        ...listing,
        status: "published",
      }),
    );

    await ctx.db.patch(args.listingId, {
      status: "published",
      publishedAt,
      completedSteps: completion.completedSteps,
      lastEditedAt: publishedAt,
    });

    return { listingId: args.listingId, publishedAt };
  },
});

export const getDetail = query({
  args: {
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    const listing = (await ctx.db.get(args.listingId)) as ListingRecord | null;
    if (!listing || listing.status !== "published") {
      return null;
    }

    const photos = await Promise.all(
      listing.photos.map(async (photo) => ({
        storageId: photo.storageId,
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
      photos,
      coverStorageId: listing.coverStorageId ?? listing.photos[0]?.storageId,
      publishedAt: listing.publishedAt ?? listing.lastEditedAt,
    };
  },
});
