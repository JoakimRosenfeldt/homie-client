import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { sha256Hex } from "./lib/device";
import { deleteOwnedUploadedFile } from "./lib/uploads";
import { removePublishedSearch } from "./lib/publishedSearch";

function nextStage(stage: Doc<"deletionJobs">["stage"]): Doc<"deletionJobs">["stage"] {
  switch (stage) {
    case "savedListings": return "savedSearches";
    case "savedSearches": return "pushQueue";
    case "pushQueue": return "pushTokens";
    case "pushTokens": return "reports";
    case "reports": return "blocksAsBlocker";
    case "blocksAsBlocker": return "blocksAsBlocked";
    case "blocksAsBlocked": return "messages";
    case "messages": return "applicantConversations";
    case "applicantConversations": return "hostConversations";
    case "hostConversations": return "applicantApplications";
    case "applicantApplications": return "hostApplications";
    case "hostApplications": return "hostedListings";
    case "hostedListings": return "profile";
    case "profile": return "fileUploads";
    case "fileUploads": return "rateLimits";
    case "rateLimits": return "done";
    case "done": return "done";
  }
}

async function scheduleNext(ctx: MutationCtx, ownerKeyHash: string) {
  await ctx.scheduler.runAfter(0, internal.privacy.continueDeletion, { ownerKeyHash });
}

function redactProfileSnapshot(profile: Doc<"applications">["profileSnapshot"]) {
  if (profile.kind === "sharedHome") {
    return {
      kind: "sharedHome" as const,
      name: "Deleted applicant",
      photoStorageIds: [],
      introduction: "",
      occupationOrStudy: "",
      moveInDate: "",
      expectedStay: "",
      budget: 0,
      householdHabits: [],
    };
  }
  return {
    kind: "privateRental" as const,
    householdSize: 0,
    employmentOrStudy: "",
    moveInDate: "",
  };
}

async function redactConversationBatch(
  ctx: MutationCtx,
  ownerKeyHash: string,
  role: "applicant" | "host",
) {
  const conversation = role === "applicant"
    ? await ctx.db
        .query("conversations")
        .withIndex("by_applicant_and_deleted_at", (queryBuilder) =>
          queryBuilder.eq("applicantKeyHash", ownerKeyHash).eq("applicantDeletedAt", undefined),
        )
        .first()
    : await ctx.db
        .query("conversations")
        .withIndex("by_host_and_deleted_at", (queryBuilder) =>
          queryBuilder.eq("hostKeyHash", ownerKeyHash).eq("hostDeletedAt", undefined),
        )
        .first();
  if (!conversation) {
    return false;
  }
  const latestMessage = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (queryBuilder) =>
      queryBuilder.eq("conversationId", conversation._id),
    )
    .order("desc")
    .first();
  const deletedAt = Date.now();
  await ctx.db.patch(
    conversation._id,
    role === "applicant"
      ? {
          applicantDeletedAt: deletedAt,
          applicantKeyHash: `deleted:${conversation._id}:applicant`,
          applicantUnreadCount: 0,
          lastMessageAt: latestMessage?.createdAt,
          lastMessagePreview: latestMessage?.body.slice(0, 160),
        }
      : {
          hostDeletedAt: deletedAt,
          hostKeyHash: `deleted:${conversation._id}:host`,
          hostUnreadCount: 0,
          lastMessageAt: latestMessage?.createdAt,
          lastMessagePreview: latestMessage?.body.slice(0, 160),
        },
  );
  return true;
}

async function redactApplicationBatch(
  ctx: MutationCtx,
  ownerKeyHash: string,
  role: "applicant" | "host",
) {
  const application = role === "applicant"
    ? await ctx.db
        .query("applications")
        .withIndex("by_applicant_and_deleted_at", (queryBuilder) =>
          queryBuilder.eq("applicantKeyHash", ownerKeyHash).eq("applicantDeletedAt", undefined),
        )
        .first()
    : await ctx.db
        .query("applications")
        .withIndex("by_host_and_deleted_at", (queryBuilder) =>
          queryBuilder.eq("hostKeyHash", ownerKeyHash).eq("hostDeletedAt", undefined),
        )
        .first();
  if (!application) return false;
  const deletedAt = Date.now();
  if (role === "applicant") {
    const photoReferences = await ctx.db
      .query("applicationPhotoReferences")
      .withIndex("by_application", (queryBuilder) =>
        queryBuilder.eq("applicationId", application._id))
      .take(10);
    await Promise.all(photoReferences.map((reference) => ctx.db.delete(reference._id)));
  }
  await ctx.db.patch(
    application._id,
    role === "applicant"
      ? {
          applicantDeletedAt: deletedAt,
          applicantKeyHash: `deleted:${application._id}:applicant`,
          profileSnapshot: redactProfileSnapshot(application.profileSnapshot),
          note: undefined,
          status: "closed",
          closedAt: deletedAt,
          lastTransitionAt: deletedAt,
        }
      : {
          hostDeletedAt: deletedAt,
          hostKeyHash: `deleted:${application._id}:host`,
          status: "closed",
          closedAt: deletedAt,
          lastTransitionAt: deletedAt,
        },
  );
  return true;
}

async function deleteHostedListingBatch(ctx: MutationCtx, ownerKeyHash: string) {
  const listing = await ctx.db
    .query("listings")
    .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
    .first();
  if (!listing) {
    return false;
  }
  const listingSnapshot = {
    title: listing.title || "Listing",
    locationLabel: listing.publicLocationLabel,
  };
  const [applicationsWithoutSnapshot, conversationsWithoutSnapshot] = await Promise.all([
    ctx.db
      .query("applications")
      .withIndex("by_listing_and_snapshot", (queryBuilder) =>
        queryBuilder.eq("listingId", listing._id).eq("listingSnapshot", undefined))
      .take(50),
    ctx.db
      .query("conversations")
      .withIndex("by_listing_and_snapshot", (queryBuilder) =>
        queryBuilder.eq("listingId", listing._id).eq("listingSnapshot", undefined))
      .take(50),
  ]);
  if (applicationsWithoutSnapshot.length > 0 || conversationsWithoutSnapshot.length > 0) {
    await Promise.all([
      ...applicationsWithoutSnapshot.map((application) =>
        ctx.db.patch(application._id, { listingSnapshot })),
      ...conversationsWithoutSnapshot.map((conversation) =>
        ctx.db.patch(conversation._id, { listingSnapshot })),
    ]);
    return true;
  }
  const [saves, pushes] = await Promise.all([
    ctx.db
      .query("savedListings")
      .withIndex("by_listing", (queryBuilder) => queryBuilder.eq("listingId", listing._id))
      .take(50),
    ctx.db
      .query("pushQueue")
      .withIndex("by_listing", (queryBuilder) => queryBuilder.eq("listingId", listing._id))
      .take(50),
  ]);
  if (saves.length > 0 || pushes.length > 0) {
    await Promise.all([
      ...saves.map((save) => ctx.db.delete(save._id)),
      ...pushes.map((push) => ctx.db.delete(push._id)),
    ]);
    return true;
  }
  await Promise.all(listing.photos.map((photo) => deleteOwnedUploadedFile(ctx, {
    ownerKeyHash,
    purpose: "listingPhoto",
    listingId: listing._id,
    storageId: photo.storageId,
  })));
  await removePublishedSearch(ctx, listing._id);
  await ctx.db.delete(listing._id);
  return true;
}

export const deleteMyData = mutation({
  args: { ownerKey: v.string(), confirmation: v.literal("DELETE") },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await sha256Hex(args.ownerKey);
    const deleted = await ctx.db
      .query("deletedDevices")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .unique();
    if (!deleted) {
      await ctx.db.insert("deletedDevices", { ownerKeyHash, deletedAt: Date.now() });
    }
    const existingJob = await ctx.db
      .query("deletionJobs")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .unique();
    if (!existingJob) {
      await ctx.db.insert("deletionJobs", {
        ownerKeyHash,
        stage: "savedListings",
        updatedAt: Date.now(),
      });
      await scheduleNext(ctx, ownerKeyHash);
    }
    return { accepted: true };
  },
});

export const continueDeletion = internalMutation({
  args: { ownerKeyHash: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("deletionJobs")
      .withIndex("by_owner_key", (queryBuilder) =>
        queryBuilder.eq("ownerKeyHash", args.ownerKeyHash),
      )
      .unique();
    if (!job) {
      return null;
    }

    let didWork = false;
    switch (job.stage) {
      case "savedListings": {
        const records = await ctx.db.query("savedListings").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "savedSearches": {
        const records = await ctx.db.query("savedSearches").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "pushQueue": {
        const records = await ctx.db.query("pushQueue").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "pushTokens": {
        const records = await ctx.db.query("pushTokens").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "reports": {
        const records = await ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.patch(record._id, {
          reporterKeyHash: `deleted:${record._id}`,
          details: undefined,
        })));
        didWork = records.length > 0;
        break;
      }
      case "blocksAsBlocker": {
        const records = await ctx.db.query("blocks").withIndex("by_blocker", (q) => q.eq("blockerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "blocksAsBlocked": {
        const records = await ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.patch(record._id, {
          blockedKeyHash: `deleted:${record._id}`,
        })));
        didWork = records.length > 0;
        break;
      }
      case "messages": {
        const records = await ctx.db
          .query("messages")
          .withIndex("by_sender_and_deleted_at", (q) =>
            q.eq("senderKeyHash", args.ownerKeyHash).eq("senderDeletedAt", undefined))
          .take(50);
        const senderDeletedAt = Date.now();
        await Promise.all(records.map((record) => ctx.db.patch(record._id, {
          body: "Message removed by sender",
          clientMessageId: `deleted:${record._id}`,
          senderKeyHash: `deleted:${record._id}`,
          senderDeletedAt,
        })));
        didWork = records.length > 0;
        break;
      }
      case "applicantConversations": didWork = await redactConversationBatch(ctx, args.ownerKeyHash, "applicant"); break;
      case "hostConversations": didWork = await redactConversationBatch(ctx, args.ownerKeyHash, "host"); break;
      case "applicantApplications": didWork = await redactApplicationBatch(ctx, args.ownerKeyHash, "applicant"); break;
      case "hostApplications": didWork = await redactApplicationBatch(ctx, args.ownerKeyHash, "host"); break;
      case "hostedListings": didWork = await deleteHostedListingBatch(ctx, args.ownerKeyHash); break;
      case "profile": {
        const record = await ctx.db.query("profiles").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).unique();
        if (record) {
          if (record.profile.kind === "sharedHome") {
            await Promise.all(record.profile.photoStorageIds.map((storageId) =>
              deleteOwnedUploadedFile(ctx, {
                ownerKeyHash: args.ownerKeyHash,
                purpose: "profilePhoto",
                storageId,
              })));
          }
          await ctx.db.delete(record._id);
        }
        didWork = record !== null;
        break;
      }
      case "fileUploads": {
        const records = await ctx.db.query("fileUploads")
          .withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash))
          .take(50);
        for (const record of records) {
          if (record.state === "attached" && record.storageId) {
            await deleteOwnedUploadedFile(ctx, {
              ownerKeyHash: args.ownerKeyHash,
              purpose: record.purpose,
              listingId: record.listingId,
              storageId: record.storageId,
            });
          }
          await ctx.db.delete(record._id);
        }
        didWork = records.length > 0;
        break;
      }
      case "rateLimits": {
        const records = await ctx.db.query("rateLimits").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", args.ownerKeyHash)).take(50);
        await Promise.all(records.map((record) => ctx.db.delete(record._id)));
        didWork = records.length > 0;
        break;
      }
      case "done": await ctx.db.delete(job._id); return null;
    }

    if (!didWork) {
      await ctx.db.patch(job._id, { stage: nextStage(job.stage), updatedAt: Date.now() });
    }
    await scheduleNext(ctx, args.ownerKeyHash);
    return null;
  },
});
