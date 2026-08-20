import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const propertyTypeValidator = v.union(
  v.literal("house"),
  v.literal("apartment"),
  v.literal("studio"),
  v.literal("room"),
);

const rentalArrangementValidator = v.union(v.literal("standard"), v.literal("sublease"));
const listingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("paused"),
  v.literal("rented"),
  v.literal("archived"),
);
const ownerModeValidator = v.union(v.literal("device"), v.literal("user"));
const contentLanguageValidator = v.union(v.literal("en"), v.literal("da"));
const amenityValidator = v.union(
  v.literal("parking"),
  v.literal("laundry"),
  v.literal("dishwasher"),
  v.literal("balcony"),
  v.literal("elevator"),
  v.literal("internetIncluded"),
  v.literal("petsAllowed"),
  v.literal("smokingAllowed"),
);
const completedStepValidator = v.union(
  v.literal("basics"),
  v.literal("details"),
  v.literal("features"),
  v.literal("location"),
  v.literal("photos"),
  v.literal("review"),
);
const coordinateValidator = v.object({ latitude: v.number(), longitude: v.number() });
const profileValidator = v.union(
  v.object({
    kind: v.literal("sharedHome"),
    name: v.string(),
    photoStorageIds: v.array(v.id("_storage")),
    introduction: v.string(),
    occupationOrStudy: v.string(),
    moveInDate: v.string(),
    expectedStay: v.string(),
    budget: v.number(),
    householdHabits: v.array(v.string()),
  }),
  v.object({
    kind: v.literal("privateRental"),
    householdSize: v.number(),
    employmentOrStudy: v.string(),
    incomeRangeUnverified: v.optional(v.string()),
    moveInDate: v.string(),
    note: v.optional(v.string()),
  }),
);
const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("shortlisted"),
  v.literal("declined"),
  v.literal("withdrawn"),
  v.literal("closed"),
);
const reportTargetValidator = v.union(
  v.object({ kind: v.literal("listing"), listingId: v.id("listings") }),
  v.object({ kind: v.literal("conversation"), conversationId: v.id("conversations") }),
);
const listingSnapshotValidator = v.object({
  title: v.string(),
  locationLabel: v.optional(v.string()),
});

export default defineSchema({
  listings: defineTable({
    status: listingStatusValidator,
    ownerMode: ownerModeValidator,
    ownerKeyHash: v.optional(v.string()),
    ownerSubject: v.optional(v.string()),
    title: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    propertyType: v.optional(propertyTypeValidator),
    rentalArrangement: v.optional(rentalArrangementValidator),
    contentLanguage: v.optional(contentLanguageValidator),
    monthlyRent: v.optional(v.number()),
    deposit: v.optional(v.number()),
    currency: v.string(),
    utilitiesIncluded: v.optional(v.boolean()),
    sizeSqm: v.optional(v.number()),
    bedroomCount: v.optional(v.number()),
    bathroomCount: v.optional(v.number()),
    furnished: v.optional(v.boolean()),
    availableFrom: v.optional(v.string()),
    availableTo: v.optional(v.string()),
    minLeaseMonths: v.optional(v.number()),
    maxLeaseMonths: v.optional(v.number()),
    amenities: v.array(amenityValidator),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    neighborhood: v.optional(v.string()),
    publicLocationLabel: v.optional(v.string()),
    exactCoordinate: v.optional(coordinateValidator),
    publicCoordinate: v.optional(coordinateValidator),
    publicCoordinateAngle: v.optional(v.number()),
    photos: v.array(
      v.object({
        storageId: v.id("_storage"),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        mimeType: v.optional(v.string()),
      }),
    ),
    coverStorageId: v.optional(v.id("_storage")),
    completedSteps: v.array(completedStepValidator),
    moderationState: v.optional(v.union(v.literal("active"), v.literal("takenDown"))),
    moderationReason: v.optional(v.string()),
    takenDownAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    lifecycleChangedAt: v.optional(v.number()),
    lastEditedAt: v.number(),
  })
    .index("by_owner_mode_key_status", ["ownerMode", "ownerKeyHash", "status"])
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_status", ["status"])
    .index("by_status_and_published_at", ["status", "publishedAt"]),

  publishedListingSearch: defineTable({
    listingId: v.id("listings"),
    title: v.string(),
    summary: v.optional(v.string()),
    propertyType: v.optional(propertyTypeValidator),
    rentalArrangement: v.optional(rentalArrangementValidator),
    monthlyRent: v.optional(v.number()),
    currency: v.string(),
    sizeSqm: v.optional(v.number()),
    availableFrom: v.optional(v.string()),
    availableTo: v.optional(v.string()),
    publicLocationLabel: v.optional(v.string()),
    normalizedLocation: v.optional(v.string()),
    publicCoordinate: v.optional(coordinateValidator),
    contentLanguage: v.optional(contentLanguageValidator),
    coverStorageId: v.optional(v.id("_storage")),
    photoCount: v.number(),
    publishedAt: v.number(),
  })
    .index("by_listing", ["listingId"])
    .index("by_published_at", ["publishedAt"]),

  publishedSearchState: defineTable({
    key: v.string(),
    version: v.number(),
    status: v.union(v.literal("backfilling"), v.literal("complete")),
    cursor: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  savedListings: defineTable({
    ownerKeyHash: v.string(),
    listingId: v.id("listings"),
    savedAt: v.number(),
  })
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_owner_key_listing", ["ownerKeyHash", "listingId"])
    .index("by_listing", ["listingId"]),

  profiles: defineTable({
    ownerKeyHash: v.string(),
    profile: profileValidator,
    updatedAt: v.number(),
  }).index("by_owner_key", ["ownerKeyHash"]),

  applications: defineTable({
    listingId: v.id("listings"),
    applicantKeyHash: v.string(),
    hostKeyHash: v.string(),
    profileSnapshot: profileValidator,
    listingSnapshot: v.optional(listingSnapshotValidator),
    note: v.optional(v.string()),
    status: applicationStatusValidator,
    submittedAt: v.number(),
    shortlistedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    applicantDeletedAt: v.optional(v.number()),
    hostDeletedAt: v.optional(v.number()),
    lastTransitionAt: v.number(),
  })
    .index("by_applicant_and_listing", ["applicantKeyHash", "listingId"])
    .index("by_applicant_and_status", ["applicantKeyHash", "status"])
    .index("by_host_and_status", ["hostKeyHash", "status"])
    .index("by_listing_and_status", ["listingId", "status"])
    .index("by_listing_and_snapshot", ["listingId", "listingSnapshot"])
    .index("by_applicant", ["applicantKeyHash"])
    .index("by_host", ["hostKeyHash"])
    .index("by_applicant_and_deleted_at", ["applicantKeyHash", "applicantDeletedAt"])
    .index("by_host_and_deleted_at", ["hostKeyHash", "hostDeletedAt"]),

  conversations: defineTable({
    applicationId: v.id("applications"),
    listingId: v.id("listings"),
    applicantKeyHash: v.string(),
    hostKeyHash: v.string(),
    listingSnapshot: v.optional(listingSnapshotValidator),
    createdAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    applicantLastReadAt: v.optional(v.number()),
    hostLastReadAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    applicantUnreadCount: v.optional(v.number()),
    hostUnreadCount: v.optional(v.number()),
    applicantDeletedAt: v.optional(v.number()),
    hostDeletedAt: v.optional(v.number()),
    moderationState: v.optional(v.union(v.literal("active"), v.literal("restricted"))),
    moderationReason: v.optional(v.string()),
    moderatedAt: v.optional(v.number()),
  })
    .index("by_application", ["applicationId"])
    .index("by_listing_and_snapshot", ["listingId", "listingSnapshot"])
    .index("by_applicant", ["applicantKeyHash"])
    .index("by_host", ["hostKeyHash"])
    .index("by_applicant_and_deleted_at", ["applicantKeyHash", "applicantDeletedAt"])
    .index("by_host_and_deleted_at", ["hostKeyHash", "hostDeletedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderKeyHash: v.string(),
    clientMessageId: v.string(),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    senderDeletedAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_client_message", ["conversationId", "clientMessageId"])
    .index("by_sender", ["senderKeyHash"])
    .index("by_sender_and_deleted_at", ["senderKeyHash", "senderDeletedAt"]),

  savedSearches: defineTable({
    ownerKeyHash: v.string(),
    name: v.string(),
    area: v.optional(v.string()),
    propertyTypes: v.array(propertyTypeValidator),
    minimumRent: v.optional(v.number()),
    maximumRent: v.optional(v.number()),
    notificationsEnabled: v.boolean(),
    lastMatchedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_notifications_enabled", ["notificationsEnabled"]),

  pushTokens: defineTable({
    ownerKeyHash: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    token: v.string(),
    permission: v.union(v.literal("granted"), v.literal("denied"), v.literal("undetermined")),
    lastSeenAt: v.number(),
  })
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_owner_key_and_permission", ["ownerKeyHash", "permission"])
    .index("by_token", ["token"]),

  pushQueue: defineTable({
    ownerKeyHash: v.string(),
    pushTokenId: v.id("pushTokens"),
    savedSearchId: v.id("savedSearches"),
    listingId: v.id("listings"),
    status: v.union(
      v.literal("pending"),
      v.literal("leased"),
      v.literal("ticketed"),
      v.literal("receiptLeased"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    enqueuedAt: v.number(),
    attemptCount: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    deliveryError: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    leaseId: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.number()),
    expoTicketId: v.optional(v.string()),
    receiptCheckAt: v.optional(v.number()),
    terminalAt: v.optional(v.number()),
    matchedSearchNames: v.optional(v.array(v.string())),
    matchedSearchIds: v.optional(v.array(v.id("savedSearches"))),
  })
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_saved_search_and_listing", ["savedSearchId", "listingId"])
    .index("by_owner_token_and_listing", ["ownerKeyHash", "pushTokenId", "listingId"])
    .index("by_listing", ["listingId"])
    .index("by_status", ["status"])
    .index("by_status_and_next_attempt_at", ["status", "nextAttemptAt"])
    .index("by_status_and_lease_expires_at", ["status", "leaseExpiresAt"])
    .index("by_status_and_receipt_check_at", ["status", "receiptCheckAt"])
    .index("by_status_and_terminal_at", ["status", "terminalAt"]),

  reports: defineTable({
    reporterKeyHash: v.string(),
    target: reportTargetValidator,
    reason: v.union(
      v.literal("scam"),
      v.literal("inaccurate"),
      v.literal("unavailable"),
      v.literal("discriminatory"),
      v.literal("other"),
    ),
    details: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("actioned"),
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_reporter", ["reporterKeyHash"])
    .index("by_status", ["status"]),

  blocks: defineTable({
    blockerKeyHash: v.string(),
    blockedKeyHash: v.string(),
    conversationId: v.id("conversations"),
    createdAt: v.number(),
  })
    .index("by_blocker_and_blocked", ["blockerKeyHash", "blockedKeyHash"])
    .index("by_blocker", ["blockerKeyHash"])
    .index("by_blocked", ["blockedKeyHash"])
    .index("by_conversation", ["conversationId"]),

  rateLimits: defineTable({
    action: v.union(
      v.literal("publishListing"),
      v.literal("createReport"),
      v.literal("geocodeListing"),
      v.literal("submitApplication"),
      v.literal("sendMessage"),
      v.literal("createSavedSearch"),
    ),
    ownerKeyHash: v.string(),
    bucketStart: v.number(),
    count: v.number(),
    timestamps: v.optional(v.array(v.number())),
  })
    .index("by_action_owner_and_bucket", ["action", "ownerKeyHash", "bucketStart"])
    .index("by_action_and_owner_key", ["action", "ownerKeyHash"])
    .index("by_owner_key", ["ownerKeyHash"]),

  fileUploads: defineTable({
    ownerKeyHash: v.string(),
    purpose: v.union(v.literal("listingPhoto"), v.literal("profilePhoto")),
    listingId: v.optional(v.id("listings")),
    storageId: v.optional(v.id("_storage")),
    state: v.union(v.literal("pending"), v.literal("attached"), v.literal("deleted")),
    createdAt: v.number(),
    attachedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_owner_key", ["ownerKeyHash"])
    .index("by_owner_purpose_and_state", ["ownerKeyHash", "purpose", "state"])
    .index("by_listing_id", ["listingId"]),

  applicationPhotoReferences: defineTable({
    applicationId: v.id("applications"),
    applicantKeyHash: v.string(),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_application", ["applicationId"]),

  deletedDevices: defineTable({
    ownerKeyHash: v.string(),
    deletedAt: v.number(),
  }).index("by_owner_key", ["ownerKeyHash"]),

  deletionJobs: defineTable({
    ownerKeyHash: v.string(),
    stage: v.union(
      v.literal("savedListings"),
      v.literal("savedSearches"),
      v.literal("pushQueue"),
      v.literal("pushTokens"),
      v.literal("reports"),
      v.literal("blocksAsBlocker"),
      v.literal("blocksAsBlocked"),
      v.literal("messages"),
      v.literal("applicantConversations"),
      v.literal("hostConversations"),
      v.literal("applicantApplications"),
      v.literal("hostApplications"),
      v.literal("hostedListings"),
      v.literal("profile"),
      v.literal("fileUploads"),
      v.literal("rateLimits"),
      v.literal("done"),
    ),
    updatedAt: v.number(),
  }).index("by_owner_key", ["ownerKeyHash"]),
});
