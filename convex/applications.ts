import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { enforceRateLimit, getActiveDeviceHash, isBlocked } from "./lib/device";
import { optionalBoundedText } from "./lib/validation";
import { applicationStatusValidator, profileValidator } from "./lib/validators";

const listingSnapshotValidator = v.object({
  title: v.string(),
  locationLabel: v.optional(v.string()),
});
const profilePhotoValidator = v.object({
  storageId: v.id("_storage"),
  url: v.union(v.string(), v.null()),
});
const hostProfileSnapshotValidator = v.union(
  v.object({
    kind: v.literal("sharedHome"),
    name: v.string(),
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

const applicationViewValidator = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  listingId: v.id("listings"),
  listingSnapshot: listingSnapshotValidator,
  profileSnapshot: profileValidator,
  profilePhotos: v.array(profilePhotoValidator),
  note: v.optional(v.string()),
  status: applicationStatusValidator,
  submittedAt: v.number(),
  shortlistedAt: v.optional(v.number()),
  declinedAt: v.optional(v.number()),
  withdrawnAt: v.optional(v.number()),
  closedAt: v.optional(v.number()),
  lastTransitionAt: v.number(),
});
const hostApplicationViewValidator = v.object({
  _id: v.id("applications"),
  _creationTime: v.number(),
  listingId: v.id("listings"),
  listingSnapshot: listingSnapshotValidator,
  profileSnapshot: hostProfileSnapshotValidator,
  profilePhotoUrls: v.array(v.string()),
  note: v.optional(v.string()),
  status: applicationStatusValidator,
  submittedAt: v.number(),
  shortlistedAt: v.optional(v.number()),
  declinedAt: v.optional(v.number()),
  withdrawnAt: v.optional(v.number()),
  closedAt: v.optional(v.number()),
  lastTransitionAt: v.number(),
});

type ApplicationViewInput = {
  _id: typeof applicationViewValidator.type["_id"];
  _creationTime: number;
  listingId: typeof applicationViewValidator.type["listingId"];
  listingSnapshot?: typeof listingSnapshotValidator.type;
  profileSnapshot: typeof profileValidator.type;
  note?: string;
  status: typeof applicationStatusValidator.type;
  submittedAt: number;
  shortlistedAt?: number;
  declinedAt?: number;
  withdrawnAt?: number;
  closedAt?: number;
  lastTransitionAt: number;
};

async function getListingSnapshot(ctx: QueryCtx, application: ApplicationViewInput) {
  if (application.listingSnapshot) return application.listingSnapshot;
  const listing = await ctx.db.get(application.listingId);
  return {
    title: listing?.title || "Listing",
    locationLabel: listing?.publicLocationLabel,
  };
}

async function toApplicationView(ctx: QueryCtx, application: ApplicationViewInput) {
  const photoStorageIds = application.profileSnapshot.kind === "sharedHome"
    ? application.profileSnapshot.photoStorageIds
    : [];
  return {
    _id: application._id,
    _creationTime: application._creationTime,
    listingId: application.listingId,
    listingSnapshot: await getListingSnapshot(ctx, application),
    profileSnapshot: application.profileSnapshot,
    profilePhotos: await Promise.all(photoStorageIds.map(async (storageId) => ({
      storageId,
      url: await ctx.storage.getUrl(storageId),
    }))),
    note: application.note,
    status: application.status,
    submittedAt: application.submittedAt,
    shortlistedAt: application.shortlistedAt,
    declinedAt: application.declinedAt,
    withdrawnAt: application.withdrawnAt,
    closedAt: application.closedAt,
    lastTransitionAt: application.lastTransitionAt,
  };
}

async function toHostApplicationView(
  ctx: QueryCtx,
  application: ApplicationViewInput,
) {
  const photoStorageIds = application.profileSnapshot.kind === "sharedHome"
    ? application.profileSnapshot.photoStorageIds
    : [];
  const resolvedUrls = await Promise.all(
    photoStorageIds.map((storageId) => ctx.storage.getUrl(storageId)),
  );
  const profileSnapshot = application.profileSnapshot.kind === "sharedHome"
    ? {
        kind: "sharedHome" as const,
        name: application.profileSnapshot.name,
        introduction: application.profileSnapshot.introduction,
        occupationOrStudy: application.profileSnapshot.occupationOrStudy,
        moveInDate: application.profileSnapshot.moveInDate,
        expectedStay: application.profileSnapshot.expectedStay,
        budget: application.profileSnapshot.budget,
        householdHabits: application.profileSnapshot.householdHabits,
      }
    : application.profileSnapshot;
  return {
    _id: application._id,
    _creationTime: application._creationTime,
    listingId: application.listingId,
    listingSnapshot: await getListingSnapshot(ctx, application),
    profileSnapshot,
    profilePhotoUrls: resolvedUrls.filter((url): url is string => url !== null),
    note: application.note,
    status: application.status,
    submittedAt: application.submittedAt,
    shortlistedAt: application.shortlistedAt,
    declinedAt: application.declinedAt,
    withdrawnAt: application.withdrawnAt,
    closedAt: application.closedAt,
    lastTransitionAt: application.lastTransitionAt,
  };
}

export async function closeOutstandingForListing(
  ctx: MutationCtx,
  listingId: typeof applicationViewValidator.type["listingId"],
) {
  const [pending, shortlisted] = await Promise.all([
    ctx.db
      .query("applications")
      .withIndex("by_listing_and_status", (queryBuilder) =>
        queryBuilder.eq("listingId", listingId).eq("status", "pending"),
      )
      .take(50),
    ctx.db
      .query("applications")
      .withIndex("by_listing_and_status", (queryBuilder) =>
        queryBuilder.eq("listingId", listingId).eq("status", "shortlisted"),
      )
      .take(50),
  ]);
  const closedAt = Date.now();
  await Promise.all(
    [...pending, ...shortlisted].map((application) =>
      ctx.db.patch(application._id, { status: "closed", closedAt, lastTransitionAt: closedAt }),
    ),
  );
  if (pending.length > 0 || shortlisted.length > 0) {
    await ctx.scheduler.runAfter(0, internal.applications.continueClosingForListing, {
      listingId,
    });
  }
}

export const continueClosingForListing = internalMutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await closeOutstandingForListing(ctx, args.listingId);
    return null;
  },
});

export const submit = mutation({
  args: { listingId: v.id("listings"), ownerKey: v.string(), note: v.optional(v.string()) },
  returns: v.object({ applicationId: v.id("applications"), submittedAt: v.number() }),
  handler: async (ctx, args) => {
    const applicantKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published" || listing.moderationState === "takenDown") {
      throw new ConvexError("This listing is not accepting applications.");
    }
    if (!listing.ownerKeyHash || listing.ownerKeyHash === applicantKeyHash) {
      throw new ConvexError("You cannot apply to your own listing.");
    }
    if (await isBlocked(ctx, applicantKeyHash, listing.ownerKeyHash)) {
      throw new ConvexError("Contact is blocked between these devices.");
    }

    const duplicate = await ctx.db
      .query("applications")
      .withIndex("by_applicant_and_listing", (queryBuilder) =>
        queryBuilder.eq("applicantKeyHash", applicantKeyHash).eq("listingId", args.listingId),
      )
      .unique();
    if (duplicate) {
      throw new ConvexError("You already applied to this listing.");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", applicantKeyHash))
      .unique();
    if (!profile) {
      throw new ConvexError("Complete your profile before applying.");
    }

    const submittedAt = Date.now();
    optionalBoundedText(args.note, { field: "Application note", maximum: 2_000 });
    await enforceRateLimit(ctx, {
      action: "submitApplication",
      ownerKeyHash: applicantKeyHash,
      limit: 20,
      windowMs: 60 * 60 * 1_000,
      now: submittedAt,
    });
    const applicationId = await ctx.db.insert("applications", {
      listingId: args.listingId,
      applicantKeyHash,
      hostKeyHash: listing.ownerKeyHash,
      profileSnapshot: profile.profile,
      listingSnapshot: {
        title: listing.title,
        locationLabel: listing.publicLocationLabel,
      },
      note: args.note?.trim() || undefined,
      status: "pending",
      submittedAt,
      lastTransitionAt: submittedAt,
    });
    if (profile.profile.kind === "sharedHome") {
      await Promise.all(profile.profile.photoStorageIds.map((storageId) =>
        ctx.db.insert("applicationPhotoReferences", {
          applicationId,
          applicantKeyHash,
          storageId,
          createdAt: submittedAt,
        })));
    }
    return { applicationId, submittedAt };
  },
});

export const listMine = query({
  args: { ownerKey: v.string(), status: v.optional(applicationStatusValidator) },
  returns: v.array(applicationViewValidator),
  handler: async (ctx, args) => {
    const applicantKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const applications = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_applicant_and_status", (queryBuilder) =>
            queryBuilder.eq("applicantKeyHash", applicantKeyHash).eq("status", args.status!),
          )
          .order("desc")
          .take(100)
      : await ctx.db
          .query("applications")
          .withIndex("by_applicant", (queryBuilder) =>
            queryBuilder.eq("applicantKeyHash", applicantKeyHash),
          )
          .order("desc")
          .take(100);
    return Promise.all(applications.map((application) => toApplicationView(ctx, application)));
  },
});

export const listForHost = query({
  args: { ownerKey: v.string(), status: v.optional(applicationStatusValidator) },
  returns: v.array(hostApplicationViewValidator),
  handler: async (ctx, args) => {
    const hostKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const applications = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_host_and_status", (queryBuilder) =>
            queryBuilder.eq("hostKeyHash", hostKeyHash).eq("status", args.status!),
          )
          .order("desc")
          .take(100)
      : await ctx.db
          .query("applications")
          .withIndex("by_host", (queryBuilder) => queryBuilder.eq("hostKeyHash", hostKeyHash))
          .order("desc")
          .take(100);
    return Promise.all(applications.map((application) => toHostApplicationView(ctx, application)));
  },
});

export const withdraw = mutation({
  args: { applicationId: v.id("applications"), ownerKey: v.string() },
  returns: v.object({ status: v.literal("withdrawn"), withdrawnAt: v.number() }),
  handler: async (ctx, args) => {
    const applicantKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.applicantKeyHash !== applicantKeyHash) {
      throw new ConvexError("Application not found.");
    }
    if (application.status !== "pending" && application.status !== "shortlisted") {
      throw new ConvexError("This application can no longer be withdrawn.");
    }
    const withdrawnAt = Date.now();
    await ctx.db.patch(application._id, {
      status: "withdrawn",
      withdrawnAt,
      lastTransitionAt: withdrawnAt,
    });
    const status: "withdrawn" = "withdrawn";
    return { status, withdrawnAt };
  },
});

export const decide = mutation({
  args: {
    applicationId: v.id("applications"),
    ownerKey: v.string(),
    decision: v.union(v.literal("shortlisted"), v.literal("declined")),
  },
  returns: v.object({
    status: v.union(v.literal("shortlisted"), v.literal("declined")),
    conversationId: v.optional(v.id("conversations")),
    transitionedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const hostKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.hostKeyHash !== hostKeyHash) {
      throw new ConvexError("Application not found.");
    }
    if (application.status !== "pending") {
      throw new ConvexError("Only pending applications can be reviewed.");
    }
    if (await isBlocked(ctx, application.applicantKeyHash, hostKeyHash)) {
      throw new ConvexError("Contact is blocked between these devices.");
    }

    const transitionedAt = Date.now();
    if (args.decision === "declined") {
      await ctx.db.patch(application._id, {
        status: "declined",
        declinedAt: transitionedAt,
        lastTransitionAt: transitionedAt,
      });
      const status: "declined" = "declined";
      return { status, transitionedAt };
    }

    await ctx.db.patch(application._id, {
      status: "shortlisted",
      shortlistedAt: transitionedAt,
      lastTransitionAt: transitionedAt,
    });
    const conversationId = await ctx.db.insert("conversations", {
      applicationId: application._id,
      listingId: application.listingId,
      applicantKeyHash: application.applicantKeyHash,
      hostKeyHash,
      listingSnapshot: application.listingSnapshot,
      createdAt: transitionedAt,
    });
    const status: "shortlisted" = "shortlisted";
    return { status, conversationId, transitionedAt };
  },
});

export const undoDecision = mutation({
  args: { applicationId: v.id("applications"), ownerKey: v.string() },
  returns: v.object({ status: v.literal("pending"), transitionedAt: v.number() }),
  handler: async (ctx, args) => {
    const hostKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.hostKeyHash !== hostKeyHash) {
      throw new ConvexError("Application not found.");
    }
    if (application.status !== "declined" && application.status !== "shortlisted") {
      throw new ConvexError("There is no host decision to undo.");
    }

    if (application.status === "shortlisted") {
      const conversation = await ctx.db
        .query("conversations")
        .withIndex("by_application", (queryBuilder) =>
          queryBuilder.eq("applicationId", application._id),
        )
        .unique();
      if (conversation) {
        const message = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (queryBuilder) =>
            queryBuilder.eq("conversationId", conversation._id),
          )
          .first();
        if (message) {
          throw new ConvexError("A shortlist with messages can no longer be undone.");
        }
        await ctx.db.delete(conversation._id);
      }
    }

    const transitionedAt = Date.now();
    await ctx.db.patch(application._id, {
      status: "pending",
      shortlistedAt: undefined,
      declinedAt: undefined,
      lastTransitionAt: transitionedAt,
    });
    const status: "pending" = "pending";
    return { status, transitionedAt };
  },
});
