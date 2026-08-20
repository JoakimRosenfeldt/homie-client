import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type UploadPurpose = "listingPhoto" | "profilePhoto";

export async function createUploadSession(
  ctx: MutationCtx,
  input: {
    ownerKeyHash: string;
    purpose: UploadPurpose;
    listingId?: Id<"listings">;
  },
) {
  const pending = await ctx.db
    .query("fileUploads")
    .withIndex("by_owner_purpose_and_state", (queryBuilder) =>
      queryBuilder
        .eq("ownerKeyHash", input.ownerKeyHash)
        .eq("purpose", input.purpose)
        .eq("state", "pending"),
    )
    .take(20);
  const now = Date.now();
  const active = pending.filter((session) => now - session.createdAt <= 30 * 60 * 1_000);
  await Promise.all(
    pending
      .filter((session) => now - session.createdAt > 30 * 60 * 1_000)
      .map((session) => ctx.db.patch(session._id, { state: "deleted", deletedAt: now })),
  );
  if (active.length >= 10) {
    throw new ConvexError("Finish or discard an existing upload before starting another.");
  }
  const uploadSessionId = await ctx.db.insert("fileUploads", {
    ownerKeyHash: input.ownerKeyHash,
    purpose: input.purpose,
    listingId: input.listingId,
    state: "pending",
    createdAt: now,
  });
  return { uploadUrl: await ctx.storage.generateUploadUrl(), uploadSessionId };
}

export async function attachUploadedFile(
  ctx: MutationCtx,
  input: {
    uploadSessionId: Id<"fileUploads">;
    ownerKeyHash: string;
    purpose: UploadPurpose;
    listingId?: Id<"listings">;
    storageId: Id<"_storage">;
  },
) {
  const session = await ctx.db.get(input.uploadSessionId);
  if (
    !session ||
    session.ownerKeyHash !== input.ownerKeyHash ||
    session.purpose !== input.purpose ||
    session.listingId !== input.listingId
  ) {
    throw new ConvexError("Upload session not found.");
  }
  if (session.state === "attached" && session.storageId === input.storageId) return session;
  if (session.state !== "pending" || Date.now() - session.createdAt > 30 * 60 * 1_000) {
    throw new ConvexError("Upload session expired.");
  }
  const [metadata, existingOwner] = await Promise.all([
    ctx.db.system.get(input.storageId),
    ctx.db
      .query("fileUploads")
      .withIndex("by_storage_id", (queryBuilder) => queryBuilder.eq("storageId", input.storageId))
      .unique(),
  ]);
  if (!metadata || metadata._creationTime < session.createdAt || existingOwner) {
    throw new ConvexError("Uploaded file does not belong to this session.");
  }
  const attachedAt = Date.now();
  await ctx.db.patch(session._id, {
    storageId: input.storageId,
    state: "attached",
    attachedAt,
  });
  return { ...session, storageId: input.storageId, state: "attached" as const, attachedAt };
}

export async function requireOwnedUploadedFile(
  ctx: MutationCtx | QueryCtx,
  input: {
    ownerKeyHash: string;
    storageId: Id<"_storage">;
    purpose: UploadPurpose;
    listingId?: Id<"listings">;
  },
) {
  const upload = await ctx.db
    .query("fileUploads")
    .withIndex("by_storage_id", (queryBuilder) => queryBuilder.eq("storageId", input.storageId))
    .unique();
  if (
    !upload ||
    upload.state !== "attached" ||
    upload.ownerKeyHash !== input.ownerKeyHash ||
    upload.purpose !== input.purpose ||
    upload.listingId !== input.listingId
  ) {
    throw new ConvexError("File is not owned by this device.");
  }
  return upload;
}

export async function deleteOwnedUploadedFile(
  ctx: MutationCtx,
  input: {
    ownerKeyHash: string;
    storageId: Id<"_storage">;
    purpose: UploadPurpose;
    listingId?: Id<"listings">;
  },
) {
  const upload = await ctx.db
    .query("fileUploads")
    .withIndex("by_storage_id", (queryBuilder) => queryBuilder.eq("storageId", input.storageId))
    .unique();
  if (!upload) return false;
  if (
    upload.state !== "attached" ||
    upload.ownerKeyHash !== input.ownerKeyHash ||
    upload.purpose !== input.purpose ||
    upload.listingId !== input.listingId
  ) {
    throw new ConvexError("File is not owned by this device.");
  }
  await ctx.storage.delete(input.storageId);
  await ctx.db.patch(upload._id, { state: "deleted", deletedAt: Date.now() });
  return true;
}
