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
});
