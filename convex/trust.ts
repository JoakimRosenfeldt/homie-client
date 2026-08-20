import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { enforceRateLimit, getActiveDeviceHash } from "./lib/device";
import { reportReasonValidator } from "./lib/validators";
import { optionalBoundedText } from "./lib/validation";

const reportTargetValidator = v.union(
  v.object({ kind: v.literal("listing"), listingId: v.id("listings") }),
  v.object({ kind: v.literal("conversation"), conversationId: v.id("conversations") }),
);

export const createReport = mutation({
  args: {
    ownerKey: v.string(),
    target: reportTargetValidator,
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.object({ reportId: v.id("reports"), createdAt: v.number() }),
  handler: async (ctx, args) => {
    const reporterKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);

    if (args.target.kind === "listing") {
      const listing = await ctx.db.get(args.target.listingId);
      if (!listing || listing.status === "draft") {
        throw new ConvexError("Listing not found.");
      }
      if (listing.ownerKeyHash === reporterKeyHash) {
        throw new ConvexError("You cannot report your own listing.");
      }
    } else {
      const conversation = await ctx.db.get(args.target.conversationId);
      if (
        !conversation ||
        (conversation.applicantKeyHash !== reporterKeyHash &&
          conversation.hostKeyHash !== reporterKeyHash)
      ) {
        throw new ConvexError("Conversation not found.");
      }
    }

    const createdAt = Date.now();
    optionalBoundedText(args.details, { field: "Report details", maximum: 2_000 });
    await enforceRateLimit(ctx, {
      action: "createReport",
      ownerKeyHash: reporterKeyHash,
      limit: 10,
      windowMs: 24 * 60 * 60 * 1000,
      now: createdAt,
    });
    const reportId = await ctx.db.insert("reports", {
      reporterKeyHash,
      target: args.target,
      reason: args.reason,
      details: args.details?.trim() || undefined,
      status: "pending",
      createdAt,
    });
    return { reportId, createdAt };
  },
});

export const blockConversation = mutation({
  args: { ownerKey: v.string(), conversationId: v.id("conversations") },
  returns: v.object({ blocked: v.boolean() }),
  handler: async (ctx, args) => {
    const blockerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.applicantKeyHash !== blockerKeyHash && conversation.hostKeyHash !== blockerKeyHash)
    ) {
      throw new ConvexError("Conversation not found.");
    }
    const blockedKeyHash =
      conversation.applicantKeyHash === blockerKeyHash
        ? conversation.hostKeyHash
        : conversation.applicantKeyHash;
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (queryBuilder) =>
        queryBuilder
          .eq("blockerKeyHash", blockerKeyHash)
          .eq("blockedKeyHash", blockedKeyHash),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("blocks", {
        blockerKeyHash,
        blockedKeyHash,
        conversationId: conversation._id,
        createdAt: Date.now(),
      });
    }
    return { blocked: true };
  },
});

export const unblockConversation = mutation({
  args: { ownerKey: v.string(), conversationId: v.id("conversations") },
  returns: v.object({ blocked: v.boolean() }),
  handler: async (ctx, args) => {
    const blockerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.applicantKeyHash !== blockerKeyHash && conversation.hostKeyHash !== blockerKeyHash)
    ) {
      throw new ConvexError("Conversation not found.");
    }
    const blockedKeyHash = conversation.applicantKeyHash === blockerKeyHash
      ? conversation.hostKeyHash
      : conversation.applicantKeyHash;
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (queryBuilder) =>
        queryBuilder
          .eq("blockerKeyHash", blockerKeyHash)
          .eq("blockedKeyHash", blockedKeyHash),
      )
      .take(100);
    await Promise.all(blocks.map((block) => ctx.db.delete(block._id)));
    const remaining = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (queryBuilder) =>
        queryBuilder
          .eq("blockerKeyHash", blockerKeyHash)
          .eq("blockedKeyHash", blockedKeyHash),
      )
      .first();
    return { blocked: remaining !== null };
  },
});
