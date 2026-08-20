import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getActiveDeviceHash } from "./lib/device";
import {
  attachUploadedFile,
  createUploadSession,
  deleteOwnedUploadedFile,
  requireOwnedUploadedFile,
} from "./lib/uploads";
import { boundedArray, boundedNumber, boundedText, optionalBoundedText } from "./lib/validation";
import { profileValidator } from "./lib/validators";

const profileRecordValidator = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  profile: profileValidator,
  profilePhotos: v.array(v.object({
    storageId: v.id("_storage"),
    url: v.union(v.string(), v.null()),
  })),
  updatedAt: v.number(),
});

function validateProfile(profile: typeof profileValidator.type) {
  if (profile.kind === "sharedHome") {
    boundedText(profile.name, { field: "Name", maximum: 100 });
    boundedArray(profile.photoStorageIds, { field: "Profile photos", maximum: 6 });
    if (new Set(profile.photoStorageIds).size !== profile.photoStorageIds.length) {
      throw new ConvexError("Profile photos cannot contain duplicates.");
    }
    boundedText(profile.introduction, { field: "Introduction", maximum: 2_000 });
    boundedText(profile.occupationOrStudy, { field: "Occupation or study", maximum: 200 });
    boundedText(profile.moveInDate, { field: "Move-in date", maximum: 100 });
    boundedText(profile.expectedStay, { field: "Expected stay", maximum: 100 });
    boundedNumber(profile.budget, { field: "Budget", minimum: 1, maximum: 10_000_000 });
    boundedArray(profile.householdHabits, { field: "Household habits", maximum: 20 });
    for (const habit of profile.householdHabits) {
      boundedText(habit, { field: "Household habit", maximum: 100 });
    }
    return;
  }

  boundedNumber(profile.householdSize, {
    field: "Household size",
    minimum: 1,
    maximum: 50,
    integer: true,
  });
  boundedText(profile.employmentOrStudy, { field: "Employment or study", maximum: 200 });
  optionalBoundedText(profile.incomeRangeUnverified, { field: "Income range", maximum: 100 });
  boundedText(profile.moveInDate, { field: "Move-in date", maximum: 100 });
  optionalBoundedText(profile.note, { field: "Profile note", maximum: 2_000 });
}

async function deleteUnreferencedProfilePhotos(
  ctx: MutationCtx,
  ownerKeyHash: string,
  storageIds: Id<"_storage">[],
) {
  if (storageIds.length === 0) return;
  const legacyApplications = await ctx.db
    .query("applications")
    .withIndex("by_applicant", (queryBuilder) =>
      queryBuilder.eq("applicantKeyHash", ownerKeyHash))
    .take(201);
  for (const storageId of storageIds) {
    const reference = await ctx.db
      .query("applicationPhotoReferences")
      .withIndex("by_storage_id", (queryBuilder) => queryBuilder.eq("storageId", storageId))
      .first();
    const legacyReference = legacyApplications.some((application) =>
      application.profileSnapshot.kind === "sharedHome" &&
      application.profileSnapshot.photoStorageIds.includes(storageId));
    if (reference || legacyReference || legacyApplications.length > 200) continue;
    await deleteOwnedUploadedFile(ctx, {
      ownerKeyHash,
      purpose: "profilePhoto",
      storageId,
    });
  }
}

export const generatePhotoUploadUrl = mutation({
  args: { ownerKey: v.string() },
  returns: v.object({ uploadUrl: v.string(), uploadSessionId: v.id("fileUploads") }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    return createUploadSession(ctx, { ownerKeyHash, purpose: "profilePhoto" });
  },
});

export const attachPhoto = mutation({
  args: {
    ownerKey: v.string(),
    uploadSessionId: v.id("fileUploads"),
    storageId: v.id("_storage"),
  },
  returns: v.object({ storageId: v.id("_storage"), url: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    await attachUploadedFile(ctx, {
      ownerKeyHash,
      purpose: "profilePhoto",
      uploadSessionId: args.uploadSessionId,
      storageId: args.storageId,
    });
    return { storageId: args.storageId, url: await ctx.storage.getUrl(args.storageId) };
  },
});

export const discardPhotoUpload = mutation({
  args: {
    ownerKey: v.string(),
    uploadSessionId: v.id("fileUploads"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    await attachUploadedFile(ctx, {
      ownerKeyHash,
      purpose: "profilePhoto",
      uploadSessionId: args.uploadSessionId,
      storageId: args.storageId,
    });
    await deleteOwnedUploadedFile(ctx, {
      ownerKeyHash,
      purpose: "profilePhoto",
      storageId: args.storageId,
    });
    return null;
  },
});

export const upsert = mutation({
  args: { ownerKey: v.string(), profile: profileValidator },
  returns: v.object({ profileId: v.id("profiles"), updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    validateProfile(args.profile);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .unique();
    const nextPhotoIds = args.profile.kind === "sharedHome" ? args.profile.photoStorageIds : [];
    const legacyPhotoIds = new Set(
      existing?.profile.kind === "sharedHome" ? existing.profile.photoStorageIds : [],
    );
    await Promise.all(
      nextPhotoIds.map(async (storageId) => {
        if (!legacyPhotoIds.has(storageId)) {
          await requireOwnedUploadedFile(ctx, {
            ownerKeyHash,
            purpose: "profilePhoto",
            storageId,
          });
        }
      }),
    );
    const updatedAt = Date.now();

    if (existing) {
      if (existing.profile.kind === "sharedHome") {
        const nextIds = new Set(nextPhotoIds);
        await deleteUnreferencedProfilePhotos(
          ctx,
          ownerKeyHash,
          existing.profile.photoStorageIds.filter((storageId) => !nextIds.has(storageId)),
        );
      }
      await ctx.db.patch(existing._id, { profile: args.profile, updatedAt });
      return { profileId: existing._id, updatedAt };
    }

    const profileId = await ctx.db.insert("profiles", {
      ownerKeyHash,
      profile: args.profile,
      updatedAt,
    });
    return { profileId, updatedAt };
  },
});

export const removePhoto = mutation({
  args: { ownerKey: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const record = await ctx.db
      .query("profiles")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .unique();
    await deleteUnreferencedProfilePhotos(ctx, ownerKeyHash, [args.storageId]);
    if (record?.profile.kind === "sharedHome" &&
      record.profile.photoStorageIds.includes(args.storageId)) {
      await ctx.db.patch(record._id, {
        profile: {
          ...record.profile,
          photoStorageIds: record.profile.photoStorageIds.filter(
            (storageId) => storageId !== args.storageId,
          ),
        },
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const getMine = query({
  args: { ownerKey: v.string() },
  returns: v.union(v.null(), profileRecordValidator),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const record = await ctx.db
      .query("profiles")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .unique();
    if (!record) {
      return null;
    }
    return {
      _id: record._id,
      _creationTime: record._creationTime,
      profile: record.profile,
      profilePhotos: record.profile.kind === "sharedHome"
        ? await Promise.all(record.profile.photoStorageIds.map(async (storageId) => ({
            storageId,
            url: await ctx.storage.getUrl(storageId),
          })))
        : [],
      updatedAt: record.updatedAt,
    };
  },
});
