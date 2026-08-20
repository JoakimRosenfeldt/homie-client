import { v } from "convex/values";

export const propertyTypeValidator = v.union(
  v.literal("house"),
  v.literal("apartment"),
  v.literal("studio"),
  v.literal("room"),
);

export const coordinateValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

export const profileValidator = v.union(
  v.object({
    kind: v.literal("sharedHome"),
    name: v.string(),
    photoStorageIds: v.array(v.id("_storage")),
    introduction: v.string(),
    occupationOrStudy: v.string(),
    moveInDate: v.string(),
    expectedStay: v.string(),
    budget: v.number(),
    householdHabits: v.array(v.string()),
  }),
  v.object({
    kind: v.literal("privateRental"),
    householdSize: v.number(),
    employmentOrStudy: v.string(),
    incomeRangeUnverified: v.optional(v.string()),
    moveInDate: v.string(),
    note: v.optional(v.string()),
  }),
);

export const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("shortlisted"),
  v.literal("declined"),
  v.literal("withdrawn"),
  v.literal("closed"),
);

export const reportReasonValidator = v.union(
  v.literal("scam"),
  v.literal("inaccurate"),
  v.literal("unavailable"),
  v.literal("discriminatory"),
  v.literal("other"),
);
