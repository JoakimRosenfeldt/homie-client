import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";

type DatabaseContext = Pick<MutationCtx | QueryCtx, "db">;

export async function isDeviceHashDeleted(ctx: DatabaseContext, ownerKeyHash: string) {
  const deleted = await ctx.db
    .query("deletedDevices")
    .withIndex("by_owner_key", (query) => query.eq("ownerKeyHash", ownerKeyHash))
    .unique();
  return deleted !== null;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

export async function getActiveDeviceHash(ctx: DatabaseContext, ownerKey: string) {
  const ownerKeyHash = await sha256Hex(ownerKey);
  if (await isDeviceHashDeleted(ctx, ownerKeyHash)) {
    throw new ConvexError("This device identity was deleted.");
  }

  return ownerKeyHash;
}

export async function enforceRateLimit(
  ctx: MutationCtx,
  input: {
    action:
      | "publishListing"
      | "createReport"
      | "geocodeListing"
      | "searchAddress"
      | "submitApplication"
      | "sendMessage"
      | "createSavedSearch";
    ownerKeyHash: string;
    limit: number;
    windowMs: number;
    now: number;
  },
) {
  const records = await ctx.db
    .query("rateLimits")
    .withIndex("by_action_and_owner_key", (query) =>
      query.eq("action", input.action).eq("ownerKeyHash", input.ownerKeyHash),
    )
    .order("desc")
    .take(10);
  const windowStart = input.now - input.windowMs;
  const timestamps = records
    .flatMap((record) => record.timestamps ?? Array(record.count).fill(record.bucketStart))
    .filter((timestamp) => timestamp > windowStart)
    .sort((left, right) => left - right);

  if (timestamps.length >= input.limit) {
    const retryAt = timestamps[0] + input.windowMs;
    throw new ConvexError({ code: "RATE_LIMITED", retryAt });
  }

  const record = records[0];
  if (record) {
    const nextTimestamps = [...timestamps, input.now];
    await ctx.db.patch(record._id, {
      bucketStart: nextTimestamps[0],
      count: nextTimestamps.length,
      timestamps: nextTimestamps,
    });
  } else {
    await ctx.db.insert("rateLimits", {
      action: input.action,
      ownerKeyHash: input.ownerKeyHash,
      bucketStart: input.now,
      count: 1,
      timestamps: [input.now],
    });
  }
}

export async function getBlockState(
  ctx: DatabaseContext,
  viewerKeyHash: string,
  otherKeyHash: string,
) {
  const [blockedByMe, blockedByThem] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (query) =>
        query.eq("blockerKeyHash", viewerKeyHash).eq("blockedKeyHash", otherKeyHash),
      )
      .first(),
    ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (query) =>
        query.eq("blockerKeyHash", otherKeyHash).eq("blockedKeyHash", viewerKeyHash),
      )
      .first(),
  ]);
  if (blockedByMe && blockedByThem) return "mutual" as const;
  if (blockedByMe) return "blockedByMe" as const;
  if (blockedByThem) return "blockedByThem" as const;
  return "none" as const;
}

export async function isBlocked(
  ctx: DatabaseContext,
  firstKeyHash: string,
  secondKeyHash: string,
) {
  return (await getBlockState(ctx, firstKeyHash, secondKeyHash)) !== "none";
}
