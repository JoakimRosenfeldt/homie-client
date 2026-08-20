import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { closeOutstandingForListing } from "./applications";
import { reportReasonValidator } from "./lib/validators";
import { boundedText } from "./lib/validation";
import { removePublishedSearch } from "./lib/publishedSearch";

const reportTargetValidator = v.union(
  v.object({ kind: v.literal("listing"), listingId: v.id("listings") }),
  v.object({ kind: v.literal("conversation"), conversationId: v.id("conversations") }),
);

export const listPendingReports = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("reports"),
      reporterKeyHash: v.string(),
      target: reportTargetValidator,
      reason: reportReasonValidator,
      details: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (queryBuilder) => queryBuilder.eq("status", "pending"))
      .order("asc")
      .take(Math.min(Math.max(args.limit ?? 50, 1), 100));
    return reports.map((report) => ({
      _id: report._id,
      reporterKeyHash: report.reporterKeyHash,
      target: report.target,
      reason: report.reason,
      details: report.details,
      createdAt: report.createdAt,
    }));
  },
});

export const applyTakedown = internalMutation({
  args: {
    listingId: v.id("listings"),
    reason: v.string(),
    reportId: v.optional(v.id("reports")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new ConvexError("Listing not found.");
    }
    const takenDownAt = Date.now();
    await ctx.db.patch(listing._id, {
      status: "archived",
      moderationState: "takenDown",
      moderationReason: args.reason.trim(),
      takenDownAt,
      lifecycleChangedAt: takenDownAt,
      lastEditedAt: takenDownAt,
    });
    await removePublishedSearch(ctx, listing._id);
    await closeOutstandingForListing(ctx, listing._id);
    if (args.reportId) {
      const report = await ctx.db.get(args.reportId);
      if (
        !report ||
        report.target.kind !== "listing" ||
        report.target.listingId !== listing._id
      ) {
        throw new ConvexError("The report does not target this listing.");
      }
      await ctx.db.patch(report._id, { status: "actioned", reviewedAt: takenDownAt });
    }
    return null;
  },
});

export const takeDownListing = action({
  args: {
    secret: v.string(),
    listingId: v.id("listings"),
    reason: v.string(),
    reportId: v.optional(v.id("reports")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expectedSecret = process.env.MODERATION_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) {
      throw new ConvexError("Invalid moderation secret.");
    }
    await ctx.runMutation(internal.moderation.applyTakedown, {
      listingId: args.listingId,
      reason: args.reason,
      reportId: args.reportId,
    });
    return null;
  },
});

export const applyReportTransition = internalMutation({
  args: {
    reportId: v.id("reports"),
    transition: v.union(
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("restrictConversation"),
    ),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status === "actioned" || report.status === "dismissed") {
      throw new ConvexError("Pending report not found.");
    }
    const reviewedAt = Date.now();
    if (args.transition === "restrictConversation") {
      if (report.target.kind !== "conversation") {
        throw new ConvexError("This report does not target a conversation.");
      }
      const conversation = await ctx.db.get(report.target.conversationId);
      if (!conversation) throw new ConvexError("Conversation not found.");
      const reason = boundedText(args.reason ?? "", {
        field: "Moderation reason",
        maximum: 1_000,
      });
      await ctx.db.patch(conversation._id, {
        moderationState: "restricted",
        moderationReason: reason,
        moderatedAt: reviewedAt,
      });
      await ctx.db.patch(report._id, { status: "actioned", reviewedAt });
      return null;
    }
    await ctx.db.patch(report._id, {
      status: args.transition,
      reviewedAt,
    });
    return null;
  },
});

export const moderateReport = action({
  args: {
    secret: v.string(),
    reportId: v.id("reports"),
    transition: v.union(
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("restrictConversation"),
    ),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expectedSecret = process.env.MODERATION_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) {
      throw new ConvexError("Invalid moderation secret.");
    }
    await ctx.runMutation(internal.moderation.applyReportTransition, {
      reportId: args.reportId,
      transition: args.transition,
      reason: args.reason,
    });
    return null;
  },
});
