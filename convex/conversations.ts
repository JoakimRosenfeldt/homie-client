import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  enforceRateLimit,
  getActiveDeviceHash,
  getBlockState,
  isBlocked,
  isDeviceHashDeleted,
} from "./lib/device";
import { boundedText } from "./lib/validation";

const listingSnapshotValidator = v.object({
  title: v.string(),
  locationLabel: v.optional(v.string()),
});
const blockStateValidator = v.union(
  v.literal("none"),
  v.literal("blockedByMe"),
  v.literal("blockedByThem"),
  v.literal("mutual"),
);

const conversationViewValidator = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  applicationId: v.id("applications"),
  listingId: v.id("listings"),
  listingSnapshot: listingSnapshotValidator,
  role: v.union(v.literal("applicant"), v.literal("host")),
  createdAt: v.number(),
  lastMessageAt: v.optional(v.number()),
  lastReadAt: v.optional(v.number()),
  lastMessagePreview: v.optional(v.string()),
  unread: v.boolean(),
  unreadCount: v.number(),
  blocked: v.boolean(),
  blockState: blockStateValidator,
  canSend: v.boolean(),
  participantDeleted: v.boolean(),
});

async function getListingSnapshot(
  ctx: Parameters<typeof getActiveDeviceHash>[0],
  conversation: {
    listingId: typeof conversationViewValidator.type["listingId"];
    listingSnapshot?: typeof listingSnapshotValidator.type;
  },
) {
  if (conversation.listingSnapshot) return conversation.listingSnapshot;
  const listing = await ctx.db.get(conversation.listingId);
  return { title: listing?.title || "Listing", locationLabel: listing?.publicLocationLabel };
}

const messageViewValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  conversationId: v.id("conversations"),
  isMine: v.boolean(),
  clientMessageId: v.string(),
  body: v.string(),
  createdAt: v.number(),
  readAt: v.optional(v.number()),
});

async function getParticipantConversation(
  ctx: Parameters<typeof getActiveDeviceHash>[0],
  conversationId: typeof conversationViewValidator.type["_id"],
  ownerKey: string,
) {
  const ownerKeyHash = await getActiveDeviceHash(ctx, ownerKey);
  const conversation = await ctx.db.get(conversationId);
  if (
    !conversation ||
    (conversation.applicantKeyHash !== ownerKeyHash && conversation.hostKeyHash !== ownerKeyHash)
  ) {
    throw new ConvexError("Conversation not found.");
  }
  return { conversation, ownerKeyHash };
}

export const listMine = query({
  args: { ownerKey: v.string() },
  returns: v.array(conversationViewValidator),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const [asApplicant, asHost] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_applicant", (queryBuilder) =>
          queryBuilder.eq("applicantKeyHash", ownerKeyHash),
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("conversations")
        .withIndex("by_host", (queryBuilder) => queryBuilder.eq("hostKeyHash", ownerKeyHash))
        .order("desc")
        .take(100),
    ]);
    const [applicantViews, hostViews] = await Promise.all([
      Promise.all(asApplicant.map(async (conversation) => {
        const unreadCount = conversation.applicantUnreadCount ?? 0;
        const [blockState, listingSnapshot, application] = await Promise.all([
          getBlockState(ctx, conversation.applicantKeyHash, conversation.hostKeyHash),
          getListingSnapshot(ctx, conversation),
          ctx.db.get(conversation.applicationId),
        ]);
        const participantDeleted = conversation.hostDeletedAt !== undefined;
        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          applicationId: conversation.applicationId,
          listingId: conversation.listingId,
          listingSnapshot,
          role: "applicant" as const,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
          lastReadAt: conversation.applicantLastReadAt,
          lastMessagePreview: conversation.lastMessagePreview,
          unread: unreadCount > 0,
          unreadCount,
          blocked: blockState !== "none",
          blockState,
          canSend: blockState === "none" && !participantDeleted &&
            conversation.moderationState !== "restricted" && application?.status === "shortlisted",
          participantDeleted,
        };
      })),
      Promise.all(asHost.map(async (conversation) => {
        const unreadCount = conversation.hostUnreadCount ?? 0;
        const [blockState, listingSnapshot, application] = await Promise.all([
          getBlockState(ctx, conversation.hostKeyHash, conversation.applicantKeyHash),
          getListingSnapshot(ctx, conversation),
          ctx.db.get(conversation.applicationId),
        ]);
        const participantDeleted = conversation.applicantDeletedAt !== undefined;
        return {
          _id: conversation._id,
          _creationTime: conversation._creationTime,
          applicationId: conversation.applicationId,
          listingId: conversation.listingId,
          listingSnapshot,
          role: "host" as const,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
          lastReadAt: conversation.hostLastReadAt,
          lastMessagePreview: conversation.lastMessagePreview,
          unread: unreadCount > 0,
          unreadCount,
          blocked: blockState !== "none",
          blockState,
          canSend: blockState === "none" && !participantDeleted &&
            conversation.moderationState !== "restricted" && application?.status === "shortlisted",
          participantDeleted,
        };
      })),
    ]);
    return [...applicantViews, ...hostViews]
      .sort((left, right) =>
        (right.lastMessageAt ?? right.createdAt) - (left.lastMessageAt ?? left.createdAt),
      )
      .slice(0, 100);
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations"), ownerKey: v.string() },
  returns: v.array(messageViewValidator),
  handler: async (ctx, args) => {
    const { ownerKeyHash } = await getParticipantConversation(
      ctx,
      args.conversationId,
      args.ownerKey,
    );
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (queryBuilder) =>
        queryBuilder.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(200);
    return messages.reverse().map((message) => ({
      _id: message._id,
      _creationTime: message._creationTime,
      conversationId: message.conversationId,
      isMine: message.senderKeyHash === ownerKeyHash,
      clientMessageId: message.clientMessageId,
      body: message.body,
      createdAt: message.createdAt,
      readAt: message.readAt,
    }));
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    ownerKey: v.string(),
    clientMessageId: v.string(),
    body: v.string(),
  },
  returns: v.object({ messageId: v.id("messages"), createdAt: v.number() }),
  handler: async (ctx, args) => {
    const { conversation, ownerKeyHash } = await getParticipantConversation(
      ctx,
      args.conversationId,
      args.ownerKey,
    );
    const application = await ctx.db.get(conversation.applicationId);
    if (!application || application.status !== "shortlisted") {
      throw new ConvexError("Chat is available only for shortlisted applications.");
    }
    if (conversation.moderationState === "restricted") {
      throw new ConvexError("This conversation was restricted by moderation.");
    }
    if (
      await isDeviceHashDeleted(ctx, conversation.applicantKeyHash) ||
      await isDeviceHashDeleted(ctx, conversation.hostKeyHash)
    ) {
      throw new ConvexError("This conversation is no longer available.");
    }
    if (await isBlocked(ctx, conversation.applicantKeyHash, conversation.hostKeyHash)) {
      throw new ConvexError("This conversation is blocked.");
    }
    const body = boundedText(args.body, { field: "Message", maximum: 4_000 });
    boundedText(args.clientMessageId, { field: "Message identifier", maximum: 100 });
    const duplicate = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_client_message", (queryBuilder) =>
        queryBuilder
          .eq("conversationId", conversation._id)
          .eq("clientMessageId", args.clientMessageId),
      )
      .unique();
    if (duplicate) {
      return { messageId: duplicate._id, createdAt: duplicate.createdAt };
    }
    const createdAt = Date.now();
    await enforceRateLimit(ctx, {
      action: "sendMessage",
      ownerKeyHash,
      limit: 60,
      windowMs: 60 * 1_000,
      now: createdAt,
    });
    const messageId = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      senderKeyHash: ownerKeyHash,
      clientMessageId: args.clientMessageId,
      body,
      createdAt,
    });
    const preview = body.slice(0, 160);
    await ctx.db.patch(
      conversation._id,
      conversation.applicantKeyHash === ownerKeyHash
        ? {
            lastMessageAt: createdAt,
            lastMessagePreview: preview,
            applicantLastReadAt: createdAt,
            applicantUnreadCount: 0,
            hostUnreadCount: (conversation.hostUnreadCount ?? 0) + 1,
          }
        : {
            lastMessageAt: createdAt,
            lastMessagePreview: preview,
            hostLastReadAt: createdAt,
            hostUnreadCount: 0,
            applicantUnreadCount: (conversation.applicantUnreadCount ?? 0) + 1,
          },
    );
    return { messageId, createdAt };
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations"), ownerKey: v.string() },
  returns: v.object({ readAt: v.number() }),
  handler: async (ctx, args) => {
    const { conversation, ownerKeyHash } = await getParticipantConversation(
      ctx,
      args.conversationId,
      args.ownerKey,
    );
    const readAt = Date.now();
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (queryBuilder) =>
        queryBuilder.eq("conversationId", conversation._id),
      )
      .order("desc")
      .take(200);
    await Promise.all(
      unreadMessages
        .filter((message) => message.senderKeyHash !== ownerKeyHash && message.readAt === undefined)
        .map((message) => ctx.db.patch(message._id, { readAt })),
    );
    await ctx.db.patch(
      conversation._id,
      conversation.applicantKeyHash === ownerKeyHash
        ? { applicantLastReadAt: readAt, applicantUnreadCount: 0 }
        : { hostLastReadAt: readAt, hostUnreadCount: 0 },
    );
    return { readAt };
  },
});
