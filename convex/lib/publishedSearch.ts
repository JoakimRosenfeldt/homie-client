import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const PUBLISHED_SEARCH_VERSION = 1;
export const PUBLISHED_SEARCH_STATE_KEY = "global";

export function toPublishedSearchValue(listing: Doc<"listings">) {
  return {
    listingId: listing._id,
    title: listing.title,
    summary: listing.summary,
    propertyType: listing.propertyType,
    rentalArrangement: listing.rentalArrangement,
    monthlyRent: listing.monthlyRent,
    currency: listing.currency,
    sizeSqm: listing.sizeSqm,
    availableFrom: listing.availableFrom,
    availableTo: listing.availableTo,
    publicLocationLabel: listing.publicLocationLabel,
    normalizedLocation: listing.publicLocationLabel?.trim().toLocaleLowerCase() || undefined,
    publicCoordinate: listing.publicCoordinateAngle === undefined
      ? undefined
      : listing.publicCoordinate,
    contentLanguage: listing.contentLanguage,
    coverStorageId: listing.coverStorageId ?? listing.photos[0]?.storageId,
    photoCount: listing.photos.length,
    publishedAt: listing.publishedAt ?? listing.lastEditedAt,
  };
}

export async function upsertPublishedSearch(
  ctx: MutationCtx,
  listing: Doc<"listings">,
) {
  const existing = await ctx.db
    .query("publishedListingSearch")
    .withIndex("by_listing", (queryBuilder) =>
      queryBuilder.eq("listingId", listing._id))
    .first();
  const value = toPublishedSearchValue(listing);
  if (existing) {
    await ctx.db.replace(existing._id, value);
    return existing._id;
  }
  return ctx.db.insert("publishedListingSearch", value);
}

export async function removePublishedSearch(
  ctx: MutationCtx,
  listingId: Id<"listings">,
) {
  const projections = await ctx.db
    .query("publishedListingSearch")
    .withIndex("by_listing", (queryBuilder) => queryBuilder.eq("listingId", listingId))
    .take(10);
  await Promise.all(projections.map((projection) => ctx.db.delete(projection._id)));
}
