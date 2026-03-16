import type { GenericId as Id } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { listingsApi } from "../src/features/listings/api";
import schema from "./schema";

const convexModules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./schema.ts": () => import("./schema"),
  "./listings.ts": () => import("./listings"),
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function createValidDraft(t: ReturnType<typeof convexTest>, ownerKey: string, rentalArrangement: "standard" | "sublease" = "standard") {
  const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey });

  await t.mutation(listingsApi.saveSection, {
    listingId,
    ownerKey,
    section: "basics",
    payload: {
      title: "Sunny room near the lakes",
      summary: "Short walk to transit and parks.",
      description: "Bright rental with a calm courtyard and a separate work nook.",
      propertyType: "room",
      rentalArrangement,
    },
  });

  await t.mutation(listingsApi.saveSection, {
    listingId,
    ownerKey,
    section: "details",
    payload: {
      monthlyRent: 8200,
      sizeSqm: 22,
      availableFrom: "2026-04-01",
      availableTo: rentalArrangement === "sublease" ? "2026-08-01" : undefined,
      currency: "DKK",
      minLeaseMonths: 1,
      maxLeaseMonths: 12,
    },
  });

  await t.mutation(listingsApi.saveSection, {
    listingId,
    ownerKey,
    section: "location",
    payload: {
      addressLine1: "Example Street 10",
      postalCode: "2100",
      city: "Copenhagen",
      countryCode: "DK",
      neighborhood: "Osterbro",
    },
  });

  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob(["listing-photo"], { type: "image/jpeg" })),
  );

  await t.mutation(listingsApi.attachPhoto, {
    listingId,
    ownerKey,
    storageId,
    width: 1200,
    height: 900,
    mimeType: "image/jpeg",
  });

  return { listingId, storageId };
}

async function insertListingRecord(
  t: ReturnType<typeof convexTest>,
  input: {
    status: "draft" | "published" | "archived";
    title: string;
    summary?: string;
    monthlyRent?: number;
    publishedAt?: number;
    lastEditedAt: number;
    photos?: {
      storageId: Id<"_storage">;
      width?: number;
      height?: number;
      mimeType?: string;
    }[];
    coverStorageId?: Id<"_storage">;
  },
) {
  return t.run(async (ctx) =>
    ctx.db.insert("listings", {
      status: input.status,
      ownerMode: "device",
      ownerKeyHash: "owner-hash",
      ownerSubject: "owner-subject",
      title: input.title,
      summary: input.summary ?? `${input.title} summary`,
      description: `${input.title} description`,
      propertyType: "apartment",
      rentalArrangement: "standard",
      monthlyRent: input.monthlyRent ?? 14000,
      currency: "DKK",
      sizeSqm: 64,
      availableFrom: "2026-04-01",
      amenities: [],
      addressLine1: "Private Street 1",
      postalCode: "2100",
      city: "Copenhagen",
      countryCode: "DK",
      neighborhood: "Osterbro",
      publicLocationLabel: "Osterbro, Copenhagen",
      photos: (input.photos ?? []).map((photo) => ({
        storageId: photo.storageId,
        width: photo.width,
        height: photo.height,
        mimeType: photo.mimeType,
      })),
      coverStorageId: input.coverStorageId,
      completedSteps: input.status === "draft" ? [] : ["basics", "details", "location", "photos", "review"],
      publishedAt: input.publishedAt,
      lastEditedAt: input.lastEditedAt,
    }),
  );
}

async function storePhoto(t: ReturnType<typeof convexTest>, label: string) {
  return t.run(async (ctx) => ctx.storage.store(new Blob([label], { type: "image/jpeg" })));
}

describe("listings", () => {
  it("draft creation stores ownership correctly", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "device-owner-key";
    const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey });

    const draft = await t.run(async (ctx) => ctx.db.get(listingId));
    expect(draft).not.toBeNull();
    expect(draft?.ownerMode).toBe("device");
    expect(draft?.ownerKeyHash).toBe(await sha256Hex(ownerKey));
    expect(draft?.ownerKeyHash).not.toBe(ownerKey);
  });

  it("wrong owner key cannot read or mutate a draft", async () => {
    const t = convexTest(schema, convexModules);
    const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey: "correct-owner" });

    await expect(
      t.query(listingsApi.getDraft, {
        listingId,
        ownerKey: "wrong-owner",
      }),
    ).rejects.toThrow("different device");

    await expect(
      t.mutation(listingsApi.saveSection, {
        listingId,
        ownerKey: "wrong-owner",
        section: "basics",
        payload: {
          title: "Should fail",
        },
      }),
    ).rejects.toThrow("different device");
  });

  it("section saves only update allowed fields", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey });

    await t.mutation(listingsApi.saveSection, {
      listingId,
      ownerKey,
      section: "details",
      payload: {
        monthlyRent: 12500,
        sizeSqm: 55,
        availableFrom: "2026-04-01",
      },
    });

    await t.mutation(listingsApi.saveSection, {
      listingId,
      ownerKey,
      section: "basics",
      payload: {
        title: "Updated title",
        description: "Clean copy",
      },
    });

    const draft = await t.query(listingsApi.getDraft, { listingId, ownerKey });
    expect(draft.title).toBe("Updated title");
    expect(draft.monthlyRent).toBe(12500);
    expect(draft.sizeSqm).toBe(55);
  });

  it("publish fails when required fields are missing", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey });

    await expect(t.mutation(listingsApi.publish, { listingId, ownerKey })).rejects.toThrow("Add a listing title");
  });

  it("sublease publish requires availableTo", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await t.mutation(listingsApi.createDraft, { ownerKey });

    await t.mutation(listingsApi.saveSection, {
      listingId,
      ownerKey,
      section: "basics",
      payload: {
        title: "Sublease",
        description: "Temporary setup",
        propertyType: "apartment",
        rentalArrangement: "sublease",
      },
    });

    await t.mutation(listingsApi.saveSection, {
      listingId,
      ownerKey,
      section: "details",
      payload: {
        monthlyRent: 16000,
        sizeSqm: 70,
        availableFrom: "2026-05-01",
      },
    });

    await t.mutation(listingsApi.saveSection, {
      listingId,
      ownerKey,
      section: "location",
      payload: {
        addressLine1: "Sublease Street 5",
        postalCode: "2200",
        city: "Copenhagen",
        countryCode: "DK",
      },
    });

    const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob(["sublease"], { type: "image/jpeg" })));
    await t.mutation(listingsApi.attachPhoto, {
      listingId,
      ownerKey,
      storageId,
      mimeType: "image/jpeg",
    });

    await expect(t.mutation(listingsApi.publish, { listingId, ownerKey })).rejects.toThrow("end date");
  });

  it("publish success stamps publishedAt", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await createValidDraft(t, ownerKey);

    const result = await t.mutation(listingsApi.publish, { listingId, ownerKey });
    expect(result.listingId).toBe(listingId);
    expect(result.publishedAt).toBeTypeOf("number");

    const draft = await t.run(async (ctx) => ctx.db.get(listingId));
    expect(draft?.publishedAt).toBe(result.publishedAt);
    expect(draft?.status).toBe("published");
  });

  it("detail query hides full address and owner fields", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await createValidDraft(t, ownerKey);

    await t.mutation(listingsApi.publish, { listingId, ownerKey });
    const detail = await t.query(listingsApi.getDetail, { listingId });

    expect(detail).not.toBeNull();
    expect(detail?.publicLocationLabel).toBe("Osterbro, Copenhagen");
    expect("addressLine1" in (detail ?? {})).toBe(false);
    expect("ownerKeyHash" in (detail ?? {})).toBe(false);
    expect("ownerSubject" in (detail ?? {})).toBe(false);
  });

  it("photo removal deletes both metadata and file", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId, storageId } = await createValidDraft(t, ownerKey);

    const before = await t.run(async (ctx) => ctx.storage.getUrl(storageId));
    expect(before).not.toBeNull();

    await t.mutation(listingsApi.removePhoto, {
      listingId,
      ownerKey,
      storageId,
    });

    const draft = await t.query(listingsApi.getDraft, { listingId, ownerKey });
    const after = await t.run(async (ctx) => ctx.storage.getUrl(storageId));

    expect(draft.photos).toHaveLength(0);
    expect(after).toBeNull();
  });

  it("removeDraft deletes the draft and any uploaded photos", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId, storageId } = await createValidDraft(t, ownerKey);

    const before = await t.run(async (ctx) => ctx.storage.getUrl(storageId));
    expect(before).not.toBeNull();

    await t.mutation(listingsApi.removeDraft, {
      listingId,
      ownerKey,
    });

    const listing = await t.run(async (ctx) => ctx.db.get(listingId));
    const after = await t.run(async (ctx) => ctx.storage.getUrl(storageId));

    expect(listing).toBeNull();
    expect(after).toBeNull();
  });

  it("removeDraft rejects published listings", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "owner";
    const { listingId } = await createValidDraft(t, ownerKey);

    await t.mutation(listingsApi.publish, { listingId, ownerKey });

    await expect(
      t.mutation(listingsApi.removeDraft, {
        listingId,
        ownerKey,
      }),
    ).rejects.toThrow("draft listings can be removed");
  });

  it("setSaved stores published listings once and exposes them in saved queries", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "saved-owner";
    const photo = await storePhoto(t, "saved-photo");
    const listingId = await insertListingRecord(t, {
      status: "published",
      title: "Saved listing",
      photos: [{ storageId: photo, mimeType: "image/jpeg" }],
      coverStorageId: photo,
      publishedAt: 200,
      lastEditedAt: 200,
    });

    await t.mutation(listingsApi.setSaved, {
      listingId,
      ownerKey,
      isSaved: true,
    });
    await t.mutation(listingsApi.setSaved, {
      listingId,
      ownerKey,
      isSaved: true,
    });

    const savedListings = await t.query(listingsApi.listSaved, { ownerKey });
    const savedIds = await t.query(listingsApi.listSavedIds, { ownerKey });

    expect(savedListings).toHaveLength(1);
    expect(savedListings[0]?.title).toBe("Saved listing");
    expect(savedListings[0]?.savedAt).toBeTypeOf("number");
    expect(savedIds).toEqual([listingId]);
  });

  it("setSaved removes listings from saved queries when unsaved", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "saved-owner";
    const photo = await storePhoto(t, "unsaved-photo");
    const listingId = await insertListingRecord(t, {
      status: "published",
      title: "Unsaved listing",
      photos: [{ storageId: photo, mimeType: "image/jpeg" }],
      coverStorageId: photo,
      publishedAt: 200,
      lastEditedAt: 200,
    });

    await t.mutation(listingsApi.setSaved, {
      listingId,
      ownerKey,
      isSaved: true,
    });
    await t.mutation(listingsApi.setSaved, {
      listingId,
      ownerKey,
      isSaved: false,
    });

    const savedListings = await t.query(listingsApi.listSaved, { ownerKey });
    const savedIds = await t.query(listingsApi.listSavedIds, { ownerKey });

    expect(savedListings).toHaveLength(0);
    expect(savedIds).toHaveLength(0);
  });

  it("setSaved rejects draft listings", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "saved-owner";
    const photo = await storePhoto(t, "draft-saved-photo");
    const listingId = await insertListingRecord(t, {
      status: "draft",
      title: "Draft listing",
      photos: [{ storageId: photo, mimeType: "image/jpeg" }],
      coverStorageId: photo,
      lastEditedAt: 200,
    });

    await expect(
      t.mutation(listingsApi.setSaved, {
        listingId,
        ownerKey,
        isSaved: true,
      }),
    ).rejects.toThrow("published listings");
  });

  it("listPublished returns only published listings", async () => {
    const t = convexTest(schema, convexModules);
    const publishedPhoto = await storePhoto(t, "published-photo");
    const draftPhoto = await storePhoto(t, "draft-photo");
    const archivedPhoto = await storePhoto(t, "archived-photo");

    await insertListingRecord(t, {
      status: "published",
      title: "Published listing",
      photos: [{ storageId: publishedPhoto, mimeType: "image/jpeg" }],
      coverStorageId: publishedPhoto,
      publishedAt: 300,
      lastEditedAt: 300,
    });
    await insertListingRecord(t, {
      status: "draft",
      title: "Draft listing",
      photos: [{ storageId: draftPhoto, mimeType: "image/jpeg" }],
      lastEditedAt: 200,
    });
    await insertListingRecord(t, {
      status: "archived",
      title: "Archived listing",
      photos: [{ storageId: archivedPhoto, mimeType: "image/jpeg" }],
      publishedAt: 100,
      lastEditedAt: 100,
    });

    const listings = await t.query(listingsApi.listPublished, {});

    expect(listings).toHaveLength(1);
    expect(listings[0]?.title).toBe("Published listing");
  });

  it("listPublished orders results newest first", async () => {
    const t = convexTest(schema, convexModules);
    const newestPhoto = await storePhoto(t, "newest-photo");
    const olderPhoto = await storePhoto(t, "older-photo");
    const fallbackPhoto = await storePhoto(t, "fallback-photo");

    await insertListingRecord(t, {
      status: "published",
      title: "Older listing",
      photos: [{ storageId: olderPhoto, mimeType: "image/jpeg" }],
      publishedAt: 100,
      lastEditedAt: 100,
    });
    await insertListingRecord(t, {
      status: "published",
      title: "Newest listing",
      photos: [{ storageId: newestPhoto, mimeType: "image/jpeg" }],
      publishedAt: 200,
      lastEditedAt: 200,
    });
    await insertListingRecord(t, {
      status: "published",
      title: "Fallback listing",
      photos: [{ storageId: fallbackPhoto, mimeType: "image/jpeg" }],
      lastEditedAt: 150,
    });

    const listings = await t.query(listingsApi.listPublished, {});

    expect(listings.map((listing) => listing.title)).toEqual([
      "Newest listing",
      "Fallback listing",
      "Older listing",
    ]);
  });

  it("listPublished omits private address and owner fields", async () => {
    const t = convexTest(schema, convexModules);
    const photo = await storePhoto(t, "privacy-photo");

    await insertListingRecord(t, {
      status: "published",
      title: "Private fields listing",
      photos: [{ storageId: photo, mimeType: "image/jpeg" }],
      coverStorageId: photo,
      publishedAt: 200,
      lastEditedAt: 200,
    });

    const listings = await t.query(listingsApi.listPublished, {});
    const listing = listings[0];

    expect(listing).toBeDefined();
    expect("addressLine1" in (listing ?? {})).toBe(false);
    expect("postalCode" in (listing ?? {})).toBe(false);
    expect("ownerKeyHash" in (listing ?? {})).toBe(false);
    expect("ownerSubject" in (listing ?? {})).toBe(false);
  });

  it("listPublished resolves coverUrl from cover photo or first photo fallback", async () => {
    const t = convexTest(schema, convexModules);
    const firstPhoto = await storePhoto(t, "first-photo");
    const secondPhoto = await storePhoto(t, "second-photo");
    const fallbackFirstPhoto = await storePhoto(t, "fallback-first-photo");
    const fallbackSecondPhoto = await storePhoto(t, "fallback-second-photo");

    await insertListingRecord(t, {
      status: "published",
      title: "Cover photo listing",
      photos: [
        { storageId: firstPhoto, mimeType: "image/jpeg" },
        { storageId: secondPhoto, mimeType: "image/jpeg" },
      ],
      coverStorageId: secondPhoto,
      publishedAt: 200,
      lastEditedAt: 200,
    });
    await insertListingRecord(t, {
      status: "published",
      title: "Fallback cover listing",
      photos: [
        { storageId: fallbackFirstPhoto, mimeType: "image/jpeg" },
        { storageId: fallbackSecondPhoto, mimeType: "image/jpeg" },
      ],
      publishedAt: 100,
      lastEditedAt: 100,
    });

    const listings = await t.query(listingsApi.listPublished, {});
    const explicitCoverUrl = await t.run(async (ctx) => ctx.storage.getUrl(secondPhoto));
    const fallbackCoverUrl = await t.run(async (ctx) => ctx.storage.getUrl(fallbackFirstPhoto));

    expect(listings.find((listing) => listing.title === "Cover photo listing")?.coverUrl).toBe(explicitCoverUrl);
    expect(listings.find((listing) => listing.title === "Fallback cover listing")?.coverUrl).toBe(fallbackCoverUrl);
  });
});
