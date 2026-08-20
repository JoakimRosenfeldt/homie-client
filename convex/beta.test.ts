import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { sha256Hex } from "./lib/device";
import schema from "./schema";

const convexModules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./applications.ts": () => import("./applications"),
  "./conversations.ts": () => import("./conversations"),
  "./listings.ts": () => import("./listings"),
  "./moderation.ts": () => import("./moderation"),
  "./privacy.ts": () => import("./privacy"),
  "./profiles.ts": () => import("./profiles"),
  "./savedSearches.ts": () => import("./savedSearches"),
  "./schema.ts": () => import("./schema"),
  "./trust.ts": () => import("./trust"),
};

const sharedHomeProfile = {
  kind: "sharedHome",
  name: "Ada",
  photoStorageIds: [],
  introduction: "Quiet tenant who likes cooking.",
  occupationOrStudy: "Engineer",
  moveInDate: "2026-09-01",
  expectedStay: "12 months",
  budget: 12000,
  householdHabits: ["non-smoking"],
} satisfies {
  kind: "sharedHome";
  name: string;
  photoStorageIds: never[];
  introduction: string;
  occupationOrStudy: string;
  moveInDate: string;
  expectedStay: string;
  budget: number;
  householdHabits: string[];
};

async function insertPublishedListing(
  t: ReturnType<typeof convexTest>,
  hostKey: string,
) {
  const hostKeyHash = await sha256Hex(hostKey);
  return t.run((ctx) =>
    ctx.db.insert("listings", {
      status: "published",
      ownerMode: "device",
      ownerKeyHash: hostKeyHash,
      title: "Beta home",
      description: "A complete home for the beta flow.",
      propertyType: "apartment",
      rentalArrangement: "standard",
      contentLanguage: "en",
      monthlyRent: 10000,
      currency: "DKK",
      sizeSqm: 60,
      availableFrom: "2026-09-01",
      amenities: [],
      addressLine1: "Private Street 1",
      postalCode: "2100",
      city: "Copenhagen",
      countryCode: "DK",
      publicLocationLabel: "Copenhagen",
      exactCoordinate: { latitude: 55.7, longitude: 12.5 },
      publicCoordinate: { latitude: 55.702, longitude: 12.502 },
      publicCoordinateAngle: 1,
      photos: [],
      completedSteps: ["basics", "details", "location", "review"],
      moderationState: "active",
      publishedAt: Date.now(),
      lifecycleChangedAt: Date.now(),
      lastEditedAt: Date.now(),
    }),
  );
}

async function submitApplication(
  t: ReturnType<typeof convexTest>,
  input: { hostKey: string; applicantKey: string },
) {
  const listingId = await insertPublishedListing(t, input.hostKey);
  await t.mutation(api.profiles.upsert, {
    ownerKey: input.applicantKey,
    profile: sharedHomeProfile,
  });
  const result = await t.mutation(api.applications.submit, {
    listingId,
    ownerKey: input.applicantKey,
    note: "I can move in on the listed date.",
  });
  return { listingId, applicationId: result.applicationId };
}

describe("closed beta backend", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("keeps application snapshots immutable and gates conversations on a host shortlist", async () => {
    const t = convexTest(schema, convexModules);
    const hostKey = "host-device";
    const applicantKey = "applicant-device";
    const { listingId, applicationId } = await submitApplication(t, { hostKey, applicantKey });

    await t.mutation(api.profiles.upsert, {
      ownerKey: applicantKey,
      profile: { ...sharedHomeProfile, name: "Updated name" },
    });
    const stored = await t.run((ctx) => ctx.db.get(applicationId));
    expect(stored?.profileSnapshot.kind).toBe("sharedHome");
    if (stored?.profileSnapshot.kind === "sharedHome") {
      expect(stored.profileSnapshot.name).toBe("Ada");
    }

    const before = await t.run((ctx) =>
      ctx.db
        .query("conversations")
        .withIndex("by_application", (queryBuilder) =>
          queryBuilder.eq("applicationId", applicationId),
        )
        .unique(),
    );
    expect(before).toBeNull();
    await expect(
      t.mutation(api.applications.decide, {
        applicationId,
        ownerKey: "other-device",
        decision: "shortlisted",
      }),
    ).rejects.toThrow("not found");

    const decision = await t.mutation(api.applications.decide, {
      applicationId,
      ownerKey: hostKey,
      decision: "shortlisted",
    });
    expect(decision.conversationId).toBeDefined();
    await expect(
      t.mutation(api.applications.submit, { listingId, ownerKey: applicantKey }),
    ).rejects.toThrow("already applied");

    const conversationId = decision.conversationId;
    if (!conversationId) throw new Error("Shortlist did not create a conversation");
    await t.mutation(api.conversations.sendMessage, {
      conversationId,
      ownerKey: applicantKey,
      clientMessageId: "first",
      body: "Hello",
    });
    const hostInbox = await t.query(api.conversations.listMine, { ownerKey: hostKey });
    expect(hostInbox[0]).toMatchObject({
      lastMessagePreview: "Hello",
      unread: true,
      unreadCount: 1,
      blocked: false,
    });
    const applicantInbox = await t.query(api.conversations.listMine, { ownerKey: applicantKey });
    expect(applicantInbox[0]).toMatchObject({ unread: false, unreadCount: 0 });
    await expect(
      t.mutation(api.conversations.sendMessage, {
        conversationId,
        ownerKey: "outsider-device",
        clientMessageId: "outsider",
        body: "No access",
      }),
    ).rejects.toThrow("not found");

    await t.mutation(api.trust.blockConversation, { conversationId, ownerKey: applicantKey });
    const blockedInbox = await t.query(api.conversations.listMine, { ownerKey: hostKey });
    expect(blockedInbox[0]).toMatchObject({
      blocked: true,
      blockState: "blockedByThem",
      canSend: false,
    });
    const blockerInbox = await t.query(api.conversations.listMine, { ownerKey: applicantKey });
    expect(blockerInbox[0]?.blockState).toBe("blockedByMe");
    await expect(
      t.mutation(api.conversations.sendMessage, {
        conversationId,
        ownerKey: hostKey,
        clientMessageId: "blocked",
        body: "Cannot send",
      }),
    ).rejects.toThrow("blocked");
  });

  it("resolves shared-home profile photos only for the host application view", async () => {
    const t = convexTest(schema, convexModules);
    const hostKey = "photo-host";
    const applicantKey = "photo-applicant";
    const listingId = await insertPublishedListing(t, hostKey);
    const photoStorageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["profile photo"], { type: "image/jpeg" })),
    );
    const applicantKeyHash = await sha256Hex(applicantKey);
    await t.run((ctx) => ctx.db.insert("fileUploads", {
      ownerKeyHash: applicantKeyHash,
      purpose: "profilePhoto",
      storageId: photoStorageId,
      state: "attached",
      createdAt: Date.now(),
      attachedAt: Date.now(),
    }));
    await t.mutation(api.profiles.upsert, {
      ownerKey: applicantKey,
      profile: { ...sharedHomeProfile, photoStorageIds: [photoStorageId] },
    });
    await t.mutation(api.applications.submit, { listingId, ownerKey: applicantKey });

    const expectedUrl = await t.run((ctx) => ctx.storage.getUrl(photoStorageId));
    const hostApplications = await t.query(api.applications.listForHost, { ownerKey: hostKey });
    expect(hostApplications[0]?.profilePhotoUrls).toEqual([expectedUrl]);
    const applicantApplications = await t.query(api.applications.listMine, { ownerKey: applicantKey });
    expect("profilePhotoUrls" in (applicantApplications[0] ?? {})).toBe(false);
    await t.mutation(api.profiles.removePhoto, { ownerKey: applicantKey, storageId: photoStorageId });
    const profileAfterRemoval = await t.query(api.profiles.getMine, { ownerKey: applicantKey });
    expect(profileAfterRemoval?.profilePhotos).toEqual([]);
    const retainedHostApplications = await t.query(api.applications.listForHost, {
      ownerKey: hostKey,
    });
    expect(retainedHostApplications[0]?.profilePhotoUrls).toEqual([expectedUrl]);
  });

  it("binds uploaded listing files to the creating device and listing", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "upload-owner";
    const attackerKey = "upload-attacker";
    const { listingId } = await t.mutation(api.listings.createDraft, { ownerKey });
    const { listingId: attackerListingId } = await t.mutation(api.listings.createDraft, {
      ownerKey: attackerKey,
    });
    const session = await t.mutation(api.listings.generatePhotoUploadUrl, {
      listingId,
      ownerKey,
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["owned photo"], { type: "image/jpeg" })),
    );
    await expect(t.mutation(api.listings.attachPhoto, {
      listingId: attackerListingId,
      ownerKey: attackerKey,
      uploadSessionId: session.uploadSessionId,
      storageId,
    })).rejects.toThrow("session");
    await t.mutation(api.listings.attachPhoto, {
      listingId,
      ownerKey,
      uploadSessionId: session.uploadSessionId,
      storageId,
    });
    const draft = await t.query(api.listings.getDraft, { listingId, ownerKey });
    expect(draft.photos[0]?.storageId).toBe(storageId);
  });

  it("redacts exact location, enqueues one matching push, and enforces publish limits", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const hostKey = "publishing-host";
    const seekerKey = "saved-search-device";
    const { listingId } = await t.mutation(api.listings.createDraft, { ownerKey: hostKey });
    await t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey: hostKey,
      input: { section: "basics", payload: {
        title: "Studio near the lakes",
        description: "A compact private studio.",
        propertyType: "studio",
        rentalArrangement: "standard",
        contentLanguage: "en",
      } },
    });
    await t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey: hostKey,
      input: {
        section: "details",
        payload: { monthlyRent: 9000, sizeSqm: 32, availableFrom: "2026-09-01" },
      },
    });
    const exactCoordinate = { latitude: 55.6761, longitude: 12.5683 };
    await t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey: hostKey,
      input: { section: "location", payload: {
        addressLine1: "Private Street 7",
        postalCode: "1000",
        city: "Copenhagen",
        countryCode: "DK",
      } },
    });
    const photoHostKeyHash = await sha256Hex(hostKey);
    await t.mutation(internal.listings.applyGeocode, {
      listingId,
      ownerKeyHash: photoHostKeyHash,
      addressFingerprint: "Private Street 7\u001f\u001f1000\u001fCopenhagen\u001fDK",
      exactCoordinate,
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["photo"], { type: "image/jpeg" })),
    );
    const uploadSessionId = await t.run((ctx) => ctx.db.insert("fileUploads", {
      ownerKeyHash: photoHostKeyHash,
      purpose: "listingPhoto",
      listingId,
      storageId,
      state: "attached",
      createdAt: Date.now(),
      attachedAt: Date.now(),
    }));
    await t.mutation(api.listings.attachPhoto, {
      listingId, ownerKey: hostKey, uploadSessionId, storageId,
    });
    const privateDraft = await t.query(api.listings.getDraft, { listingId, ownerKey: hostKey });
    expect(privateDraft.exactCoordinate).toEqual(exactCoordinate);
    expect(privateDraft.publicCoordinate).not.toEqual(exactCoordinate);
    expect(privateDraft.publicCoordinateAngle).toBeTypeOf("number");
    const publicIdDigest = await sha256Hex(String(listingId));
    const publicIdAngle = (Number.parseInt(publicIdDigest.slice(0, 8), 16) / 0xffffffff) * Math.PI * 2;
    const publicIdDerivedCoordinate = {
      latitude: exactCoordinate.latitude + (250 * Math.cos(publicIdAngle)) / 111_320,
      longitude: exactCoordinate.longitude +
        (250 * Math.sin(publicIdAngle)) /
          (111_320 * Math.cos((exactCoordinate.latitude * Math.PI) / 180)),
    };
    expect(privateDraft.publicCoordinate).not.toEqual(publicIdDerivedCoordinate);
    const firstPublicCoordinate = privateDraft.publicCoordinate;
    await t.mutation(internal.listings.applyGeocode, {
      listingId,
      ownerKeyHash: photoHostKeyHash,
      addressFingerprint: "Private Street 7\u001f\u001f1000\u001fCopenhagen\u001fDK",
      exactCoordinate,
    });
    const stableDraft = await t.query(api.listings.getDraft, { listingId, ownerKey: hostKey });
    expect(stableDraft.publicCoordinate).toEqual(firstPublicCoordinate);
    const duplicatePhoto = await t.mutation(api.listings.attachPhoto, {
      listingId,
      ownerKey: hostKey,
      uploadSessionId,
      storageId,
    });
    expect(duplicatePhoto).toEqual({ coverStorageId: storageId });

    await t.mutation(api.savedSearches.registerPushToken, {
      ownerKey: seekerKey,
      platform: "ios",
      token: "ExponentPushToken[test]",
      permission: "granted",
    });
    await t.mutation(api.savedSearches.save, {
      ownerKey: seekerKey,
      name: "Copenhagen studios",
      area: "Copenhagen",
      propertyTypes: ["studio"],
      maximumRent: 10000,
      notificationsEnabled: true,
    });
    await t.mutation(api.listings.publish, { listingId, ownerKey: hostKey });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ data: [{ status: "ok" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());

    const detail = await t.query(api.listings.getDetail, { listingId });
    expect(detail?.publicCoordinate).toEqual(privateDraft.publicCoordinate);
    expect("exactCoordinate" in (detail ?? {})).toBe(false);
    expect("publicCoordinateAngle" in (detail ?? {})).toBe(false);
    expect("addressLine1" in (detail ?? {})).toBe(false);
    await t.run((ctx) => ctx.db.patch(listingId, { publicCoordinateAngle: undefined }));
    const legacyDetail = await t.query(api.listings.getDetail, { listingId });
    expect(legacyDetail?.publicCoordinate).toBeUndefined();
    const queue = await t.run((ctx) =>
      ctx.db.query("pushQueue").withIndex("by_listing", (q) => q.eq("listingId", listingId)).take(10),
    );
    expect(queue).toHaveLength(1);

    const hostKeyHash = await sha256Hex(hostKey);
    await t.run(async (ctx) => {
      const rate = await ctx.db
        .query("rateLimits")
        .withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", hostKeyHash))
        .unique();
      if (rate) {
        await ctx.db.patch(rate._id, {
          count: 3,
          timestamps: [Date.now() - 2, Date.now() - 1, Date.now()],
        });
      }
    });
    const { listingId: nextListingId } = await t.mutation(api.listings.createDraft, { ownerKey: hostKey });
    await t.run(async (ctx) => {
      const first = await ctx.db.get(listingId);
      if (!first) throw new Error("Missing source listing");
      await ctx.db.patch(nextListingId, {
        title: first.title,
        description: first.description,
        propertyType: first.propertyType,
        rentalArrangement: first.rentalArrangement,
        monthlyRent: first.monthlyRent,
        sizeSqm: first.sizeSqm,
        availableFrom: first.availableFrom,
        addressLine1: first.addressLine1,
        postalCode: first.postalCode,
        city: first.city,
        countryCode: first.countryCode,
        exactCoordinate: first.exactCoordinate,
        publicCoordinate: first.publicCoordinate,
        publicCoordinateAngle: first.publicCoordinateAngle,
        photos: first.photos,
      });
    });
    await expect(
      t.mutation(api.listings.publish, { listingId: nextListingId, ownerKey: hostKey }),
    ).rejects.toThrow("RATE_LIMITED");
  });

  it("revokes access immediately and deletes owned data in bounded scheduled batches", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const hostKey = "delete-host";
    const applicantKey = "delete-applicant";
    const { listingId, applicationId } = await submitApplication(t, { hostKey, applicantKey });
    const decision = await t.mutation(api.applications.decide, {
      applicationId,
      ownerKey: hostKey,
      decision: "shortlisted",
    });
    const conversationId = decision.conversationId;
    if (!conversationId) throw new Error("Shortlist did not create a conversation");
    await t.mutation(api.conversations.sendMessage, {
      conversationId,
      ownerKey: applicantKey,
      clientMessageId: "delete-me",
      body: "Private message",
    });
    await t.mutation(api.conversations.sendMessage, {
      conversationId,
      ownerKey: hostKey,
      clientMessageId: "keep-me",
      body: "Host message that must remain",
    });

    await t.mutation(api.privacy.deleteMyData, {
      ownerKey: applicantKey,
      confirmation: "DELETE",
    });
    await expect(t.query(api.profiles.getMine, { ownerKey: applicantKey })).rejects.toThrow(
      "deleted",
    );
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());

    const applicantKeyHash = await sha256Hex(applicantKey);
    const remaining = await t.run(async (ctx) => ({
      profile: await ctx.db.query("profiles").withIndex("by_owner_key", (q) => q.eq("ownerKeyHash", applicantKeyHash)).unique(),
      application: await ctx.db.get(applicationId),
      conversation: await ctx.db.get(conversationId),
      messages: await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .take(10),
    }));
    expect(remaining.profile).toBeNull();
    expect(remaining.application?.status).toBe("closed");
    expect(remaining.application?.profileSnapshot.kind).toBe("sharedHome");
    if (remaining.application?.profileSnapshot.kind === "sharedHome") {
      expect(remaining.application.profileSnapshot.name).toBe("Deleted applicant");
    }
    expect(remaining.conversation?.applicantDeletedAt).toBeDefined();
    expect(remaining.messages.map((message) => message.body)).toEqual([
      "Message removed by sender",
      "Host message that must remain",
    ]);
    expect(await t.run((ctx) => ctx.db.get(listingId))).not.toBeNull();
  });

  it("rejects mismatched listing sections, clears stale coordinates, and validates republish", async () => {
    const t = convexTest(schema, convexModules);
    const ownerKey = "location-owner";
    const { listingId } = await t.mutation(api.listings.createDraft, { ownerKey });
    await t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey,
      input: { section: "location", payload: {
        addressLine1: "First address",
        city: "Copenhagen",
        countryCode: "DK",
      } },
    });
    await t.mutation(internal.listings.applyGeocode, {
      listingId,
      ownerKeyHash: await sha256Hex(ownerKey),
      addressFingerprint: "First address\u001f\u001f\u001fCopenhagen\u001fDK",
      exactCoordinate: { latitude: 55.68, longitude: 12.57 },
    });
    await t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey,
      input: { section: "location", payload: { addressLine1: "Changed address" } },
    });
    const draft = await t.query(api.listings.getDraft, { listingId, ownerKey });
    expect(draft.exactCoordinate).toBeUndefined();
    expect(draft.publicCoordinate).toBeUndefined();
    expect(draft.publicCoordinateAngle).toBeUndefined();

    await expect(t.mutation(api.listings.saveSection, {
      listingId,
      ownerKey,
      input: {
        section: "details",
        payload: { availableFrom: "2026-02-31" },
      },
    })).rejects.toThrow("real date");

    await expect(
      t.mutation(api.listings.saveSection, {
        listingId,
        ownerKey,
        input: { section: "features", payload: { title: "Wrong payload" } } as never,
      }),
    ).rejects.toThrow();

    const publishedId = await insertPublishedListing(t, ownerKey);
    await t.mutation(api.listings.setLifecycle, {
      listingId: publishedId,
      ownerKey,
      status: "paused",
    });
    await expect(t.mutation(api.listings.setLifecycle, {
      listingId: publishedId,
      ownerKey,
      status: "published",
    })).rejects.toThrow("photo");
  });

  it("closes every outstanding application through bounded scheduled batches", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const hostKey = "batch-host";
    const listingId = await insertPublishedListing(t, hostKey);
    const hostKeyHash = await sha256Hex(hostKey);
    await t.run(async (ctx) => {
      for (let index = 0; index < 205; index += 1) {
        await ctx.db.insert("applications", {
          listingId,
          applicantKeyHash: `applicant-${index}`,
          hostKeyHash,
          profileSnapshot: sharedHomeProfile,
          status: index % 2 === 0 ? "pending" : "shortlisted",
          submittedAt: index,
          lastTransitionAt: index,
        });
      }
    });
    await t.mutation(api.listings.setLifecycle, {
      listingId,
      ownerKey: hostKey,
      status: "archived",
    });
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const closed = await t.run((ctx) => ctx.db
      .query("applications")
      .withIndex("by_listing_and_status", (q) =>
        q.eq("listingId", listingId).eq("status", "closed"),
      )
      .take(250));
    expect(closed).toHaveLength(205);
  });

  it("unblocks a device pair from any shared conversation", async () => {
    const t = convexTest(schema, convexModules);
    const hostKey = "pair-host";
    const applicantKey = "pair-applicant";
    const first = await submitApplication(t, { hostKey, applicantKey });
    const second = await submitApplication(t, { hostKey, applicantKey });
    const firstDecision = await t.mutation(api.applications.decide, {
      applicationId: first.applicationId,
      ownerKey: hostKey,
      decision: "shortlisted",
    });
    const secondDecision = await t.mutation(api.applications.decide, {
      applicationId: second.applicationId,
      ownerKey: hostKey,
      decision: "shortlisted",
    });
    if (!firstDecision.conversationId || !secondDecision.conversationId) {
      throw new Error("Expected both conversations");
    }
    await t.mutation(api.trust.blockConversation, {
      conversationId: firstDecision.conversationId,
      ownerKey: applicantKey,
    });
    await t.mutation(api.trust.unblockConversation, {
      conversationId: secondDecision.conversationId,
      ownerKey: applicantKey,
    });
    await expect(t.mutation(api.conversations.sendMessage, {
      conversationId: firstDecision.conversationId,
      ownerKey: hostKey,
      clientMessageId: "unblocked",
      body: "Pair is unblocked",
    })).resolves.toBeDefined();
  });

  it("rejects a moderation report that targets another listing", async () => {
    const t = convexTest(schema, convexModules);
    const firstListingId = await insertPublishedListing(t, "first-host");
    const secondListingId = await insertPublishedListing(t, "second-host");
    const report = await t.mutation(api.trust.createReport, {
      ownerKey: "reporter",
      target: { kind: "listing", listingId: firstListingId },
      reason: "inaccurate",
    });
    await expect(t.mutation(internal.moderation.applyTakedown, {
      listingId: secondListingId,
      reportId: report.reportId,
      reason: "Mismatch",
    })).rejects.toThrow("does not target");
    const unchanged = await t.run((ctx) => ctx.db.get(secondListingId));
    expect(unchanged?.status).toBe("published");
  });

  it("filters and globally sorts Explore matches beyond the old raw scan cap", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    await t.run(async (ctx) => {
      for (let index = 0; index < 620; index += 1) {
        await ctx.db.insert("listings", {
          status: "published",
          ownerMode: "device",
          ownerKeyHash: `host-${index}`,
          title: `Listing ${index}`,
          propertyType: "apartment",
          rentalArrangement: "standard",
          monthlyRent: 1_000 + index,
          currency: "DKK",
          amenities: [],
          publicLocationLabel: "Copenhagen",
          publicCoordinate: index === 0
            ? { latitude: 55.6761, longitude: 12.5683 }
            : { latitude: 55.8, longitude: 12.7 },
          publicCoordinateAngle: 1,
          photos: [],
          completedSteps: [],
          publishedAt: index,
          lastEditedAt: index,
        });
      }
    });
    const published = await t.query(api.listings.listPublished, {});
    expect(published).toHaveLength(100);
    expect(published[0]?.title).toBe("Listing 619");
    expect(published.at(-1)?.title).toBe("Listing 520");
    const firstPage = await t.query(api.listings.explore, {
      filters: { area: "copenhagen", propertyTypes: ["apartment"], maximumRent: 1_010 },
      sort: "rentDesc",
      viewport: { north: 56, south: 55, east: 13, west: 12 },
      limit: 5,
    });
    expect(firstPage.total).toBe(11);
    expect(firstPage.truncated).toBe(false);
    expect(firstPage.scanned).toBe(620);
    expect(firstPage.items.map((item) => item.title)).toEqual([
      "Listing 10", "Listing 9", "Listing 8", "Listing 7", "Listing 6",
    ]);
    expect(firstPage.isDone).toBe(false);

    const secondPage = await t.query(api.listings.explore, {
      filters: { area: "copenhagen", propertyTypes: ["apartment"], maximumRent: 1_010 },
      sort: "rentDesc",
      viewport: { north: 56, south: 55, east: 13, west: 12 },
      limit: 5,
      cursor: firstPage.continueCursor,
    });
    expect(secondPage.items.map((item) => item.title)).toEqual([
      "Listing 5", "Listing 4", "Listing 3", "Listing 2", "Listing 1",
    ]);
    const lastPage = await t.query(api.listings.explore, {
      filters: { area: "copenhagen", propertyTypes: ["apartment"], maximumRent: 1_010 },
      sort: "rentDesc",
      viewport: { north: 56, south: 55, east: 13, west: 12 },
      limit: 5,
      cursor: secondPage.continueCursor,
    });
    expect(lastPage.items.map((item) => item.title)).toEqual(["Listing 0"]);
    expect(lastPage.isDone).toBe(true);

    const mapLimited = await t.query(api.listings.explore, {
      sort: "rentDesc",
      limit: 1,
    });
    expect(mapLimited.total).toBe(620);
    expect(mapLimited.truncated).toBe(true);
    expect(mapLimited.items[0]?.title).toBe("Listing 619");
    const nearest = await t.query(api.listings.explore, {
      sort: "distance",
      origin: { latitude: 55.6761, longitude: 12.5683 },
      limit: 1,
    });
    expect(nearest.total).toBe(620);
    expect(nearest.items[0]?.title).toBe("Listing 0");

    const firstBackfill = await t.mutation(internal.listings.backfillPublishedSearch, {
      cursor: null,
    });
    expect(firstBackfill).toEqual({ migrated: 50, isDone: false });
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const migrated = await t.run((ctx) => ctx.db
      .query("publishedListingSearch")
      .withIndex("by_published_at")
      .take(621));
    expect(migrated).toHaveLength(620);
    const projectedResult = await t.query(api.listings.explore, {
      filters: { maximumRent: 1_010 },
      sort: "rentDesc",
      limit: 5,
    });
    expect(projectedResult.total).toBe(11);
    expect(projectedResult.items[0]?.title).toBe("Listing 10");
  });

  it("paginates saved-search fanout and marks Expo deliveries sent", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const listingId = await insertPublishedListing(t, "push-host");
    const ownerKeyHash = await sha256Hex("push-owner");
    await t.run(async (ctx) => {
      await ctx.db.insert("pushTokens", {
        ownerKeyHash,
        platform: "ios",
        token: "ExponentPushToken[scale]",
        permission: "granted",
        lastSeenAt: 0,
      });
      for (let index = 0; index < 105; index += 1) {
        await ctx.db.insert("savedSearches", {
          ownerKeyHash,
          name: `Search ${index}`,
          area: "Copenhagen",
          propertyTypes: ["apartment"],
          notificationsEnabled: true,
          createdAt: index,
          updatedAt: index,
        });
      }
    });
    const pushFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const rawBody = typeof init?.body === "string" ? init.body : "[]";
      const body: unknown = JSON.parse(rawBody);
      const ticketCount = Array.isArray(body) ? body.length : 0;
      const payload = Array.isArray(body)
        ? { data: Array.from({ length: ticketCount }, (_, index) => ({
            status: "ok", id: `ticket-${index}`,
          })) }
        : { data: { "ticket-0": { status: "ok" } } };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", pushFetch);
    await t.mutation(internal.savedSearches.matchPublishedListing, {
      listingId,
      cursor: null,
    });
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const sent = await t.run((ctx) => ctx.db
      .query("pushQueue")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .take(150));
    expect(sent).toHaveLength(1);
    expect(pushFetch).toHaveBeenCalledTimes(2);
  });

  it("cancels queued and ticketed pushes after saved-search opt-out", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const ownerKey = "push-opt-out-owner";
    const listingId = await insertPublishedListing(t, "push-opt-out-host");
    await t.mutation(api.savedSearches.registerPushToken, {
      ownerKey,
      platform: "ios",
      token: "ExponentPushToken[opt-out]",
      permission: "granted",
    });
    const saved = await t.mutation(api.savedSearches.save, {
      ownerKey,
      name: "Copenhagen apartments",
      area: "Copenhagen",
      propertyTypes: ["apartment"],
      notificationsEnabled: true,
    });
    await t.mutation(internal.savedSearches.matchPublishedListing, {
      listingId,
      cursor: null,
    });
    const queue = await t.run((ctx) => ctx.db
      .query("pushQueue")
      .withIndex("by_listing", (queryBuilder) => queryBuilder.eq("listingId", listingId))
      .unique());
    if (!queue) throw new Error("Expected queued push");

    const claimed = await t.mutation(internal.savedSearches.claimPendingPushes, {
      leaseId: "send-lease",
      now: Date.now() + 1,
    });
    expect(claimed).toEqual([queue._id]);
    await t.mutation(api.savedSearches.save, {
      ownerKey,
      savedSearchId: saved.savedSearchId,
      name: "Copenhagen apartments",
      area: "Copenhagen",
      propertyTypes: ["apartment"],
      notificationsEnabled: false,
    });
    const revalidated = await t.query(internal.savedSearches.revalidateLeasedPushes, {
      queueIds: claimed,
      leaseId: "send-lease",
    });
    expect(revalidated.deliverable).toEqual([]);
    expect(revalidated.canceledQueueIds).toEqual([queue._id]);
    await t.mutation(internal.savedSearches.cancelLeasedPushes, {
      queueIds: revalidated.canceledQueueIds,
      leaseId: "send-lease",
      now: Date.now(),
    });
    expect((await t.run((ctx) => ctx.db.get(queue._id)))?.status).toBe("failed");

    await t.run((ctx) => ctx.db.patch(queue._id, {
      status: "ticketed",
      expoTicketId: "ticket-opt-out",
      receiptCheckAt: 0,
      terminalAt: undefined,
    }));
    const receiptClaims = await t.mutation(internal.savedSearches.claimPushReceipts, {
      leaseId: "receipt-lease",
      now: Date.now(),
    });
    expect(receiptClaims).toEqual([]);
    expect((await t.run((ctx) => ctx.db.get(queue._id)))?.status).toBe("failed");

    await t.mutation(api.savedSearches.save, {
      ownerKey,
      savedSearchId: saved.savedSearchId,
      name: "Copenhagen apartments",
      area: "Copenhagen",
      propertyTypes: ["apartment"],
      notificationsEnabled: true,
    });
    await t.run((ctx) => ctx.db.patch(queue._id, {
      status: "ticketed",
      expoTicketId: "ticket-race",
      receiptCheckAt: 0,
      terminalAt: undefined,
    }));
    const claimedReceipt = await t.mutation(internal.savedSearches.claimPushReceipts, {
      leaseId: "receipt-race-lease",
      now: Date.now(),
    });
    expect(claimedReceipt).toEqual([{ queueId: queue._id, ticketId: "ticket-race" }]);
    await t.mutation(api.savedSearches.save, {
      ownerKey,
      savedSearchId: saved.savedSearchId,
      name: "Copenhagen apartments",
      area: "Copenhagen",
      propertyTypes: ["apartment"],
      notificationsEnabled: false,
    });
    await t.mutation(internal.savedSearches.recordReceiptOutcomes, {
      leaseId: "receipt-race-lease",
      outcomes: [{ queueId: queue._id, delivered: true }],
    });
    expect((await t.run((ctx) => ctx.db.get(queue._id)))?.status).toBe("failed");
  });

  it("schedules exponential push retries at their actual due time", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, convexModules);
    const listingId = await insertPublishedListing(t, "retry-host");
    const ownerKeyHash = await sha256Hex("retry-owner");
    const ids = await t.run(async (ctx) => {
      const pushTokenId = await ctx.db.insert("pushTokens", {
        ownerKeyHash,
        platform: "ios",
        token: "ExponentPushToken[retry]",
        permission: "granted",
        lastSeenAt: 0,
      });
      const savedSearchId = await ctx.db.insert("savedSearches", {
        ownerKeyHash,
        name: "Retry search",
        propertyTypes: [],
        notificationsEnabled: true,
        createdAt: 0,
        updatedAt: 0,
      });
      const queueId = await ctx.db.insert("pushQueue", {
        ownerKeyHash,
        pushTokenId,
        savedSearchId,
        matchedSearchIds: [savedSearchId],
        listingId,
        status: "leased",
        leaseId: "retry-lease",
        leaseExpiresAt: Date.now() + 60_000,
        enqueuedAt: 0,
        attemptCount: 1,
      });
      return { queueId };
    });
    await t.mutation(internal.savedSearches.recordTicketOutcomes, {
      leaseId: "retry-lease",
      claimedIds: [ids.queueId],
      outcomes: [{ queueId: ids.queueId, error: "temporary" }],
    });
    const retried = await t.run((ctx) => ctx.db.get(ids.queueId));
    expect(retried?.status).toBe("pending");
    expect(retried?.attemptCount).toBe(2);
    expect((retried?.nextAttemptAt ?? 0) - (retried?.lastAttemptAt ?? 0)).toBe(10_000);
  });
});
