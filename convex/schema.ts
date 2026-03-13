import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const propertyTypeValidator = v.union(
  v.literal("house"),
  v.literal("apartment"),
  v.literal("room"),
);

const rentalArrangementValidator = v.union(
  v.literal("standard"),
  v.literal("sublease"),
);

const listingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const ownerModeValidator = v.union(v.literal("device"), v.literal("user"));

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

const completedStepValidator = v.union(
  v.literal("basics"),
  v.literal("details"),
  v.literal("features"),
  v.literal("location"),
  v.literal("photos"),
  v.literal("review"),
);

export default defineSchema({
  listings: defineTable({
    status: listingStatusValidator,
    ownerMode: ownerModeValidator,
    ownerKeyHash: v.optional(v.string()),
    ownerSubject: v.optional(v.string()),
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
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    publicLocationLabel: v.optional(v.string()),
    photos: v.array(
      v.object({
        storageId: v.id("_storage"),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        mimeType: v.optional(v.string()),
      }),
    ),
    coverStorageId: v.optional(v.id("_storage")),
    completedSteps: v.array(completedStepValidator),
    publishedAt: v.optional(v.number()),
    lastEditedAt: v.number(),
  })
    .index("by_owner_mode_key_status", ["ownerMode", "ownerKeyHash", "status"])
    .index("by_status", ["status"]),
});
