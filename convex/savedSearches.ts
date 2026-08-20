import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  enforceRateLimit,
  getActiveDeviceHash,
  isDeviceHashDeleted,
} from "./lib/device";
import {
  boundedArray,
  boundedText,
  optionalBoundedNumber,
  optionalBoundedText,
} from "./lib/validation";
import { propertyTypeValidator } from "./lib/validators";

const MAX_SEARCHES = 20;
const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const RECEIPT_DELAY_MS = 15 * 60_000;
const TERMINAL_RETENTION_MS = 7 * 24 * 60 * 60_000;

const savedSearchViewValidator = v.object({
  _id: v.id("savedSearches"),
  _creationTime: v.number(),
  name: v.string(),
  area: v.optional(v.string()),
  propertyTypes: v.array(propertyTypeValidator),
  minimumRent: v.optional(v.number()),
  maximumRent: v.optional(v.number()),
  notificationsEnabled: v.boolean(),
  lastMatchedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function matches(search: Doc<"savedSearches">, listing: Doc<"listings">) {
  if (search.propertyTypes.length > 0 &&
    (!listing.propertyType || !search.propertyTypes.includes(listing.propertyType))) return false;
  if (search.minimumRent !== undefined && (listing.monthlyRent ?? 0) < search.minimumRent) {
    return false;
  }
  if (search.maximumRent !== undefined && (listing.monthlyRent ?? Infinity) > search.maximumRent) {
    return false;
  }
  const area = search.area?.toLocaleLowerCase();
  return !area || Boolean(listing.publicLocationLabel?.toLocaleLowerCase().includes(area));
}

function retryDelay(attemptCount: number) {
  return Math.min(60 * 60_000, 5_000 * 2 ** Math.max(0, attemptCount - 1));
}

async function getEnabledMatchedSearches(
  ctx: Pick<QueryCtx, "db">,
  item: Pick<Doc<"pushQueue">, "ownerKeyHash" | "savedSearchId" | "matchedSearchIds">,
) {
  const searchIds = item.matchedSearchIds?.length
    ? item.matchedSearchIds.slice(0, MAX_SEARCHES)
    : [item.savedSearchId];
  const searches = await Promise.all(searchIds.map((searchId) => ctx.db.get(searchId)));
  return searches.filter((search): search is Doc<"savedSearches"> =>
    search !== null &&
    search.ownerKeyHash === item.ownerKeyHash &&
    search.notificationsEnabled,
  );
}

export async function enqueueMatchingPushes(ctx: MutationCtx, listing: Doc<"listings">) {
  const enabledSearch = await ctx.db
    .query("savedSearches")
    .withIndex("by_notifications_enabled", (queryBuilder) =>
      queryBuilder.eq("notificationsEnabled", true),
    )
    .first();
  if (enabledSearch) {
    await ctx.scheduler.runAfter(0, internal.savedSearches.matchPublishedListing, {
      listingId: listing._id,
      cursor: null,
    });
  }
}

export const matchPublishedListing = internalMutation({
  args: { listingId: v.id("listings"), cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
    enqueued: v.number(),
  }),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") {
      return { continueCursor: null, isDone: true, enqueued: 0 };
    }
    const page = await ctx.db
      .query("savedSearches")
      .withIndex("by_notifications_enabled", (queryBuilder) =>
        queryBuilder.eq("notificationsEnabled", true),
      )
      .paginate({ cursor: args.cursor, numItems: 50 });
    const now = Date.now();
    let enqueued = 0;
    for (const search of page.page) {
      if (!matches(search, listing) || await isDeviceHashDeleted(ctx, search.ownerKeyHash)) continue;
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_owner_key_and_permission", (queryBuilder) =>
          queryBuilder.eq("ownerKeyHash", search.ownerKeyHash).eq("permission", "granted"),
        )
        .take(5);
      for (const token of tokens) {
        const duplicate = await ctx.db
          .query("pushQueue")
          .withIndex("by_owner_token_and_listing", (queryBuilder) =>
            queryBuilder
              .eq("ownerKeyHash", search.ownerKeyHash)
              .eq("pushTokenId", token._id)
              .eq("listingId", listing._id),
          )
          .first();
        if (duplicate) {
          const names = Array.from(new Set([...(duplicate.matchedSearchNames ?? []), search.name]))
            .slice(0, 5);
          const searchIds = Array.from(new Set([
            ...(duplicate.matchedSearchIds ?? [duplicate.savedSearchId]),
            search._id,
          ])).slice(0, MAX_SEARCHES);
          await ctx.db.patch(duplicate._id, {
            matchedSearchNames: names,
            matchedSearchIds: searchIds,
          });
          continue;
        }
        await ctx.db.insert("pushQueue", {
          ownerKeyHash: search.ownerKeyHash,
          pushTokenId: token._id,
          savedSearchId: search._id,
          listingId: listing._id,
          status: "pending",
          enqueuedAt: now,
          attemptCount: 0,
          nextAttemptAt: now,
          matchedSearchNames: [search.name],
          matchedSearchIds: [search._id],
        });
        enqueued += 1;
      }
      await ctx.db.patch(search._id, { lastMatchedAt: now });
    }
    if (page.isDone) {
      await ctx.scheduler.runAfter(0, internal.savedSearches.sendPendingPushes, {});
    } else {
      await ctx.scheduler.runAfter(0, internal.savedSearches.matchPublishedListing, {
        listingId: listing._id,
        cursor: page.continueCursor,
      });
    }
    return {
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
      enqueued,
    };
  },
});

const leasedPushValidator = v.object({
  queueId: v.id("pushQueue"),
  token: v.string(),
  title: v.string(),
  body: v.string(),
  listingId: v.id("listings"),
});

export const claimPendingPushes = internalMutation({
  args: { leaseId: v.string(), now: v.number() },
  returns: v.array(v.id("pushQueue")),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pushQueue")
      .withIndex("by_status_and_next_attempt_at", (queryBuilder) =>
        queryBuilder.eq("status", "pending").lte("nextAttemptAt", args.now),
      )
      .take(50);
    const claimedIds: Id<"pushQueue">[] = [];
    for (const item of pending) {
      const searches = await getEnabledMatchedSearches(ctx, item);
      if (searches.length === 0 || await isDeviceHashDeleted(ctx, item.ownerKeyHash)) {
        await ctx.db.patch(item._id, {
          status: "failed",
          terminalAt: args.now,
          nextAttemptAt: undefined,
          deliveryError: "Notification authorization is no longer active.",
        });
        continue;
      }
      await ctx.db.patch(item._id, {
        status: "leased",
        leaseId: args.leaseId,
        leaseExpiresAt: args.now + LEASE_MS,
      });
      claimedIds.push(item._id);
    }
    return claimedIds;
  },
});

export const revalidateLeasedPushes = internalQuery({
  args: { queueIds: v.array(v.id("pushQueue")), leaseId: v.string() },
  returns: v.object({
    deliverable: v.array(leasedPushValidator),
    canceledQueueIds: v.array(v.id("pushQueue")),
  }),
  handler: async (ctx, args) => {
    const deliverable: (typeof leasedPushValidator.type)[] = [];
    const canceledQueueIds: Id<"pushQueue">[] = [];
    for (const queueId of args.queueIds.slice(0, 50)) {
      const item = await ctx.db.get(queueId);
      if (!item || item.status !== "leased" || item.leaseId !== args.leaseId) continue;
      if (await isDeviceHashDeleted(ctx, item.ownerKeyHash)) {
        canceledQueueIds.push(item._id);
        continue;
      }
      const searches = await getEnabledMatchedSearches(ctx, item);
      if (searches.length === 0) {
        canceledQueueIds.push(item._id);
        continue;
      }
      const [token, listing] = await Promise.all([
        ctx.db.get(item.pushTokenId),
        ctx.db.get(item.listingId),
      ]);
      if (!token || token.ownerKeyHash !== item.ownerKeyHash || token.permission !== "granted" ||
        !listing || listing.status !== "published") {
        canceledQueueIds.push(item._id);
        continue;
      }
      deliverable.push({
        queueId: item._id,
        token: token.token,
        title: `New match: ${listing.title}`,
        body: [
          searches.slice(0, 5).map((search) => search.name).join(", "),
          listing.publicLocationLabel,
        ]
          .filter(Boolean).join(" · "),
        listingId: listing._id,
      });
    }
    return { deliverable, canceledQueueIds };
  },
});

export const cancelLeasedPushes = internalMutation({
  args: {
    queueIds: v.array(v.id("pushQueue")),
    leaseId: v.string(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const queueId of args.queueIds.slice(0, 50)) {
      const item = await ctx.db.get(queueId);
      if (!item || item.status !== "leased" || item.leaseId !== args.leaseId) continue;
      await ctx.db.patch(item._id, {
        status: "failed",
        terminalAt: args.now,
        nextAttemptAt: undefined,
        leaseId: undefined,
        leaseExpiresAt: undefined,
        deliveryError: "Notification authorization is no longer active.",
      });
    }
    return null;
  },
});

const ticketOutcomeValidator = v.object({
  queueId: v.id("pushQueue"),
  ticketId: v.optional(v.string()),
  error: v.optional(v.string()),
  invalidateToken: v.optional(v.boolean()),
});

export const recordTicketOutcomes = internalMutation({
  args: {
    leaseId: v.string(),
    claimedIds: v.array(v.id("pushQueue")),
    outcomes: v.array(ticketOutcomeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const outcomes = new Map(args.outcomes.map((outcome) => [outcome.queueId, outcome]));
    let earliestRetryAt: number | undefined;
    let hasTicket = false;
    for (const queueId of args.claimedIds.slice(0, 50)) {
      const item = await ctx.db.get(queueId);
      if (!item || item.status !== "leased" || item.leaseId !== args.leaseId) continue;
      const outcome = outcomes.get(queueId);
      const attemptCount = (item.attemptCount ?? 0) + 1;
      if (outcome?.invalidateToken) {
        const token = await ctx.db.get(item.pushTokenId);
        if (token) await ctx.db.delete(token._id);
      }
      if (outcome?.ticketId) {
        hasTicket = true;
        await ctx.db.patch(item._id, {
          status: "ticketed",
          expoTicketId: outcome.ticketId,
          attemptCount,
          lastAttemptAt: now,
          receiptCheckAt: now + RECEIPT_DELAY_MS,
          leaseId: undefined,
          leaseExpiresAt: undefined,
          deliveryError: undefined,
        });
        continue;
      }
      if (!outcome?.invalidateToken && attemptCount < MAX_ATTEMPTS) {
        const nextAttemptAt = now + retryDelay(attemptCount);
        earliestRetryAt = earliestRetryAt === undefined
          ? nextAttemptAt
          : Math.min(earliestRetryAt, nextAttemptAt);
        await ctx.db.patch(item._id, {
          status: "pending",
          attemptCount,
          lastAttemptAt: now,
          nextAttemptAt,
          leaseId: undefined,
          leaseExpiresAt: undefined,
          deliveryError: outcome?.error ?? "Push target became unavailable.",
        });
      } else {
        await ctx.db.patch(item._id, {
          status: "failed",
          attemptCount,
          lastAttemptAt: now,
          terminalAt: now,
          leaseId: undefined,
          leaseExpiresAt: undefined,
          deliveryError: outcome?.error ?? "Push target became unavailable.",
        });
      }
    }
    if (hasTicket) {
      await ctx.scheduler.runAfter(RECEIPT_DELAY_MS, internal.savedSearches.checkPushReceipts, {});
    }
    if (earliestRetryAt !== undefined) {
      await ctx.scheduler.runAfter(
        Math.max(0, earliestRetryAt - Date.now()),
        internal.savedSearches.sendPendingPushes,
        {},
      );
    }
    return null;
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const sendPendingPushes = internalAction({
  args: {},
  returns: v.object({ attempted: v.number() }),
  handler: async (ctx): Promise<{ attempted: number }> => {
    const leaseId = crypto.randomUUID();
    const claimedIds: Id<"pushQueue">[] = await ctx.runMutation(
      internal.savedSearches.claimPendingPushes,
      { leaseId, now: Date.now() },
    );
    if (claimedIds.length === 0) return { attempted: 0 };
    const revalidated: {
      deliverable: (typeof leasedPushValidator.type)[];
      canceledQueueIds: Id<"pushQueue">[];
    } = await ctx.runQuery(
      internal.savedSearches.revalidateLeasedPushes,
      { queueIds: claimedIds, leaseId },
    );
    const { deliverable, canceledQueueIds } = revalidated;
    if (canceledQueueIds.length > 0) {
      await ctx.runMutation(internal.savedSearches.cancelLeasedPushes, {
        queueIds: canceledQueueIds,
        leaseId,
        now: Date.now(),
      });
    }
    const outcomes: (typeof ticketOutcomeValidator.type)[] = [];
    if (deliverable.length > 0) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(deliverable.map((item) => ({
            to: item.token,
            title: item.title,
            body: item.body,
            data: { listingId: item.listingId },
          }))),
        });
        const payload: unknown = await response.json();
        const tickets = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
        if (!response.ok || tickets.length !== deliverable.length) {
          throw new Error(`Expo push returned HTTP ${response.status}.`);
        }
        deliverable.forEach((item, index) => {
          const ticket = tickets[index];
          const details = isRecord(ticket) && isRecord(ticket.details) ? ticket.details : undefined;
          const code = details && typeof details.error === "string" ? details.error : undefined;
          if (isRecord(ticket) && ticket.status === "ok" && typeof ticket.id === "string") {
            outcomes.push({ queueId: item.queueId, ticketId: ticket.id });
          } else {
            outcomes.push({
              queueId: item.queueId,
              error: isRecord(ticket) && typeof ticket.message === "string"
                ? ticket.message : "Expo rejected the notification.",
              invalidateToken: code === "DeviceNotRegistered",
            });
          }
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Expo push delivery failed.";
        outcomes.push(...deliverable.map((item) => ({ queueId: item.queueId, error: message })));
      }
    }
    await ctx.runMutation(internal.savedSearches.recordTicketOutcomes, {
      leaseId,
      claimedIds,
      outcomes,
    });
    return { attempted: deliverable.length };
  },
});

const receiptClaimValidator = v.object({ queueId: v.id("pushQueue"), ticketId: v.string() });

export const claimPushReceipts = internalMutation({
  args: { leaseId: v.string(), now: v.number() },
  returns: v.array(receiptClaimValidator),
  handler: async (ctx, args) => {
    const due = await ctx.db
      .query("pushQueue")
      .withIndex("by_status_and_receipt_check_at", (queryBuilder) =>
        queryBuilder.eq("status", "ticketed").lte("receiptCheckAt", args.now),
      )
      .take(50);
    const claims: (typeof receiptClaimValidator.type)[] = [];
    for (const item of due) {
      if (!item.expoTicketId) continue;
      const searches = await getEnabledMatchedSearches(ctx, item);
      if (searches.length === 0 || await isDeviceHashDeleted(ctx, item.ownerKeyHash)) {
        await ctx.db.patch(item._id, {
          status: "failed",
          terminalAt: args.now,
          receiptCheckAt: undefined,
          deliveryError: "Notification authorization is no longer active.",
        });
        continue;
      }
      await ctx.db.patch(item._id, {
        status: "receiptLeased",
        leaseId: args.leaseId,
        leaseExpiresAt: args.now + LEASE_MS,
      });
      claims.push({ queueId: item._id, ticketId: item.expoTicketId });
    }
    return claims;
  },
});

const receiptOutcomeValidator = v.object({
  queueId: v.id("pushQueue"), delivered: v.boolean(), pending: v.optional(v.boolean()),
  error: v.optional(v.string()), invalidateToken: v.optional(v.boolean()),
});

export const recordReceiptOutcomes = internalMutation({
  args: { leaseId: v.string(), outcomes: v.array(receiptOutcomeValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    let hasPending = false;
    for (const outcome of args.outcomes) {
      const item = await ctx.db.get(outcome.queueId);
      if (!item || item.status !== "receiptLeased" || item.leaseId !== args.leaseId) continue;
      const searches = await getEnabledMatchedSearches(ctx, item);
      if (searches.length === 0 || await isDeviceHashDeleted(ctx, item.ownerKeyHash)) {
        await ctx.db.patch(item._id, {
          status: "failed",
          terminalAt: now,
          leaseId: undefined,
          leaseExpiresAt: undefined,
          deliveryError: "Notification authorization is no longer active.",
        });
        continue;
      }
      if (outcome.invalidateToken) {
        const token = await ctx.db.get(item.pushTokenId);
        if (token) await ctx.db.delete(token._id);
      }
      if (outcome.delivered) {
        await ctx.db.patch(item._id, {
          status: "sent", deliveredAt: now, terminalAt: now,
          leaseId: undefined, leaseExpiresAt: undefined, deliveryError: undefined,
        });
      } else if (outcome.pending) {
        const attemptCount = (item.attemptCount ?? 0) + 1;
        if (attemptCount < MAX_ATTEMPTS) {
          hasPending = true;
          await ctx.db.patch(item._id, {
            status: "ticketed", receiptCheckAt: now + RECEIPT_DELAY_MS, attemptCount,
            leaseId: undefined, leaseExpiresAt: undefined,
          });
        } else {
          await ctx.db.patch(item._id, {
            status: "failed", terminalAt: now, attemptCount,
            deliveryError: "Push receipt was not available after bounded retries.",
            leaseId: undefined, leaseExpiresAt: undefined,
          });
        }
      } else {
        await ctx.db.patch(item._id, {
          status: "failed", terminalAt: now, deliveryError: outcome.error,
          leaseId: undefined, leaseExpiresAt: undefined,
        });
      }
    }
    if (hasPending) {
      await ctx.scheduler.runAfter(RECEIPT_DELAY_MS, internal.savedSearches.checkPushReceipts, {});
    }
    return null;
  },
});

export const checkPushReceipts = internalAction({
  args: {},
  returns: v.object({ checked: v.number() }),
  handler: async (ctx): Promise<{ checked: number }> => {
    const leaseId = crypto.randomUUID();
    const claims: (typeof receiptClaimValidator.type)[] = await ctx.runMutation(
      internal.savedSearches.claimPushReceipts,
      { leaseId, now: Date.now() },
    );
    if (claims.length === 0) return { checked: 0 };
    const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ids: claims.map((claim) => claim.ticketId) }),
    });
    const payload: unknown = await response.json();
    const receipts = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
    const outcomes: (typeof receiptOutcomeValidator.type)[] = claims.map((claim) => {
      const receipt = receipts[claim.ticketId];
      if (!isRecord(receipt) || !response.ok) {
        return { queueId: claim.queueId, delivered: false, pending: true };
      }
      const details = isRecord(receipt.details) ? receipt.details : undefined;
      const code = details && typeof details.error === "string" ? details.error : undefined;
      return receipt.status === "ok"
        ? { queueId: claim.queueId, delivered: true }
        : {
            queueId: claim.queueId,
            delivered: false,
            error: typeof receipt.message === "string" ? receipt.message : "Push delivery failed.",
            invalidateToken: code === "DeviceNotRegistered",
          };
    });
    await ctx.runMutation(internal.savedSearches.recordReceiptOutcomes, { leaseId, outcomes });
    return { checked: claims.length };
  },
});

export const maintainPushQueue = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const [expiredSendLeases, expiredReceiptLeases, oldSent, oldFailed] = await Promise.all([
      ctx.db.query("pushQueue").withIndex("by_status_and_lease_expires_at", (queryBuilder) =>
        queryBuilder.eq("status", "leased").lte("leaseExpiresAt", now)).take(50),
      ctx.db.query("pushQueue").withIndex("by_status_and_lease_expires_at", (queryBuilder) =>
        queryBuilder.eq("status", "receiptLeased").lte("leaseExpiresAt", now)).take(50),
      ctx.db.query("pushQueue").withIndex("by_status_and_terminal_at", (queryBuilder) =>
        queryBuilder.eq("status", "sent").gt("terminalAt", 0)
          .lte("terminalAt", now - TERMINAL_RETENTION_MS)).take(50),
      ctx.db.query("pushQueue").withIndex("by_status_and_terminal_at", (queryBuilder) =>
        queryBuilder.eq("status", "failed").gt("terminalAt", 0)
          .lte("terminalAt", now - TERMINAL_RETENTION_MS)).take(50),
    ]);
    const [legacySent, legacyFailed] = await Promise.all([
      ctx.db.query("pushQueue").withIndex("by_status", (queryBuilder) =>
        queryBuilder.eq("status", "sent")).take(50),
      ctx.db.query("pushQueue").withIndex("by_status", (queryBuilder) =>
        queryBuilder.eq("status", "failed")).take(50),
    ]);
    await Promise.all([
      ...expiredSendLeases.map((item) => ctx.db.patch(item._id, {
        status: "pending" as const, nextAttemptAt: now, leaseId: undefined, leaseExpiresAt: undefined,
      })),
      ...expiredReceiptLeases.map((item) => ctx.db.patch(item._id, {
        status: "ticketed" as const, receiptCheckAt: now, leaseId: undefined, leaseExpiresAt: undefined,
      })),
      ...oldSent.map((item) => ctx.db.delete(item._id)),
      ...oldFailed.map((item) => ctx.db.delete(item._id)),
      ...legacySent.filter((item) => item.terminalAt === undefined)
        .map((item) => ctx.db.patch(item._id, { terminalAt: item.deliveredAt ?? now })),
      ...legacyFailed.filter((item) => item.terminalAt === undefined)
        .map((item) => ctx.db.patch(item._id, { terminalAt: item.lastAttemptAt ?? now })),
    ]);
    if (expiredSendLeases.length > 0) {
      await ctx.scheduler.runAfter(0, internal.savedSearches.sendPendingPushes, {});
    }
    if (expiredReceiptLeases.length > 0) {
      await ctx.scheduler.runAfter(0, internal.savedSearches.checkPushReceipts, {});
    }
    return null;
  },
});

function toView(search: Doc<"savedSearches">) {
  return {
    _id: search._id, _creationTime: search._creationTime, name: search.name, area: search.area,
    propertyTypes: search.propertyTypes, minimumRent: search.minimumRent,
    maximumRent: search.maximumRent, notificationsEnabled: search.notificationsEnabled,
    lastMatchedAt: search.lastMatchedAt, createdAt: search.createdAt, updatedAt: search.updatedAt,
  };
}

export const getPushStatus = query({
  args: { ownerKey: v.string() },
  returns: v.object({ hasGrantedToken: v.boolean() }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const token = await ctx.db.query("pushTokens")
      .withIndex("by_owner_key_and_permission", (queryBuilder) =>
        queryBuilder.eq("ownerKeyHash", ownerKeyHash).eq("permission", "granted"))
      .first();
    return { hasGrantedToken: token !== null };
  },
});

export const save = mutation({
  args: {
    ownerKey: v.string(), savedSearchId: v.optional(v.id("savedSearches")), name: v.string(),
    area: v.optional(v.string()), propertyTypes: v.array(propertyTypeValidator),
    minimumRent: v.optional(v.number()), maximumRent: v.optional(v.number()),
    notificationsEnabled: v.boolean(),
  },
  returns: v.object({ savedSearchId: v.id("savedSearches"), updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const name = boundedText(args.name, { field: "Saved search name", maximum: 100 });
    const area = optionalBoundedText(args.area, { field: "Area", maximum: 160 });
    boundedArray(args.propertyTypes, { field: "Property types", maximum: 4 });
    optionalBoundedNumber(args.minimumRent, {
      field: "Minimum rent", minimum: 0, maximum: 10_000_000,
    });
    optionalBoundedNumber(args.maximumRent, {
      field: "Maximum rent", minimum: 0, maximum: 10_000_000,
    });
    if (args.minimumRent !== undefined && args.maximumRent !== undefined &&
      args.minimumRent > args.maximumRent) {
      throw new ConvexError("Minimum rent cannot exceed maximum rent.");
    }
    if (args.notificationsEnabled) {
      const token = await ctx.db.query("pushTokens")
        .withIndex("by_owner_key_and_permission", (queryBuilder) =>
          queryBuilder.eq("ownerKeyHash", ownerKeyHash).eq("permission", "granted"))
        .first();
      if (!token) throw new ConvexError("Enable notifications before turning on saved-search alerts.");
    }
    const now = Date.now();
    const values = {
      name, area, propertyTypes: Array.from(new Set(args.propertyTypes)),
      minimumRent: args.minimumRent, maximumRent: args.maximumRent,
      notificationsEnabled: args.notificationsEnabled, updatedAt: now,
    };
    if (args.savedSearchId) {
      const existing = await ctx.db.get(args.savedSearchId);
      if (!existing || existing.ownerKeyHash !== ownerKeyHash) {
        throw new ConvexError("Saved search not found.");
      }
      await ctx.db.patch(existing._id, values);
      return { savedSearchId: existing._id, updatedAt: now };
    }
    const existingSearches = await ctx.db.query("savedSearches")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .take(MAX_SEARCHES + 1);
    if (existingSearches.length >= MAX_SEARCHES) {
      throw new ConvexError(`You can save up to ${MAX_SEARCHES} searches.`);
    }
    await enforceRateLimit(ctx, {
      action: "createSavedSearch", ownerKeyHash, limit: 20,
      windowMs: 24 * 60 * 60_000, now,
    });
    const savedSearchId = await ctx.db.insert("savedSearches", {
      ownerKeyHash, ...values, createdAt: now,
    });
    return { savedSearchId, updatedAt: now };
  },
});

export const listMine = query({
  args: { ownerKey: v.string() },
  returns: v.array(savedSearchViewValidator),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const searches = await ctx.db.query("savedSearches")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .order("desc").take(MAX_SEARCHES);
    return searches.map(toView);
  },
});

export const remove = mutation({
  args: { ownerKey: v.string(), savedSearchId: v.id("savedSearches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const search = await ctx.db.get(args.savedSearchId);
    if (!search || search.ownerKeyHash !== ownerKeyHash) {
      throw new ConvexError("Saved search not found.");
    }
    await ctx.db.delete(search._id);
    return null;
  },
});

export const registerPushToken = mutation({
  args: {
    ownerKey: v.string(), platform: v.union(v.literal("ios"), v.literal("android")),
    token: v.string(),
    permission: v.union(v.literal("granted"), v.literal("denied"), v.literal("undetermined")),
  },
  returns: v.object({ pushTokenId: v.id("pushTokens") }),
  handler: async (ctx, args) => {
    const ownerKeyHash = await getActiveDeviceHash(ctx, args.ownerKey);
    const tokenValue = boundedText(args.token, { field: "Push token", maximum: 300 });
    if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(tokenValue)) {
      throw new ConvexError("Push token format is invalid.");
    }
    const existing = await ctx.db.query("pushTokens")
      .withIndex("by_token", (queryBuilder) => queryBuilder.eq("token", tokenValue)).unique();
    if (existing && existing.ownerKeyHash !== ownerKeyHash) {
      throw new ConvexError("Push token belongs to a different device.");
    }
    const values = {
      ownerKeyHash, platform: args.platform, token: tokenValue,
      permission: args.permission, lastSeenAt: Date.now(),
    };
    if (existing) {
      await ctx.db.replace(existing._id, values);
      return { pushTokenId: existing._id };
    }
    const deviceTokens = await ctx.db.query("pushTokens")
      .withIndex("by_owner_key", (queryBuilder) => queryBuilder.eq("ownerKeyHash", ownerKeyHash))
      .take(6);
    if (deviceTokens.length >= 5) {
      throw new ConvexError("A device can register up to 5 push tokens.");
    }
    const pushTokenId = await ctx.db.insert("pushTokens", values);
    return { pushTokenId };
  },
});
