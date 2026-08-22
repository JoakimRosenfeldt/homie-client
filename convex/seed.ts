import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { upsertPublishedSearch } from "./lib/publishedSearch";

const MOCK_OWNER_HASH = "mock-data:aarhus";
const COMPLETED_STEPS = ["basics", "details", "features", "location", "photos", "review"] as const;

type MockListing = Pick<
  Doc<"listings">,
  | "title"
  | "summary"
  | "description"
  | "propertyType"
  | "rentalArrangement"
  | "monthlyRent"
  | "deposit"
  | "utilitiesIncluded"
  | "sizeSqm"
  | "bedroomCount"
  | "bathroomCount"
  | "furnished"
  | "availableFrom"
  | "availableTo"
  | "minLeaseMonths"
  | "maxLeaseMonths"
  | "amenities"
  | "addressLine1"
  | "postalCode"
  | "city"
  | "countryCode"
  | "neighborhood"
  | "publicLocationLabel"
  | "exactCoordinate"
  | "publicCoordinate"
> & {
  key: string;
  photoColors: readonly [string, string];
};

const MOCK_LISTINGS: readonly MockListing[] = [
  {
    key: "aarhus-o-apartment",
    title: "Bright apartment by Aarhus Ø",
    summary: "Two-bedroom apartment close to the harbour and light rail.",
    description: "A bright apartment with an open kitchen, two bedrooms, and a view towards the harbour. The building has lift access and shared bicycle storage.",
    propertyType: "apartment",
    rentalArrangement: "standard",
    monthlyRent: 12_500,
    deposit: 37_500,
    utilitiesIncluded: false,
    sizeSqm: 68,
    bedroomCount: 2,
    bathroomCount: 1,
    furnished: false,
    availableFrom: "2026-09-01",
    minLeaseMonths: 12,
    amenities: ["balcony", "dishwasher", "elevator"],
    addressLine1: "Testvej 1",
    postalCode: "8000",
    city: "Aarhus C",
    countryCode: "DK",
    neighborhood: "Aarhus Ø",
    publicLocationLabel: "Aarhus Ø, Aarhus",
    exactCoordinate: { latitude: 56.1668, longitude: 10.2265 },
    publicCoordinate: { latitude: 56.1661, longitude: 10.2254 },
    photoColors: ["#9CC7D8", "#E9D8B4"],
  },
  {
    key: "trojborg-room",
    title: "Room in a shared home in Trøjborg",
    summary: "Furnished room shared with two university students.",
    description: "The room faces a quiet courtyard. You share the kitchen, bathroom, and living room with two students. Internet and heating are included in the rent.",
    propertyType: "room",
    rentalArrangement: "standard",
    monthlyRent: 4_800,
    deposit: 9_600,
    utilitiesIncluded: true,
    sizeSqm: 16,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: true,
    availableFrom: "2026-09-15",
    minLeaseMonths: 6,
    maxLeaseMonths: 24,
    amenities: ["laundry", "internetIncluded"],
    addressLine1: "Testvej 2",
    postalCode: "8200",
    city: "Aarhus N",
    countryCode: "DK",
    neighborhood: "Trøjborg",
    publicLocationLabel: "Trøjborg, Aarhus",
    exactCoordinate: { latitude: 56.1764, longitude: 10.2153 },
    publicCoordinate: { latitude: 56.1757, longitude: 10.2141 },
    photoColors: ["#C6B4D8", "#EFE4D2"],
  },
  {
    key: "university-studio",
    title: "Studio near Aarhus University",
    summary: "Compact studio with a separate kitchen and shared laundry.",
    description: "A practical studio for one person, a short cycle from the university. It has a separate kitchen, built-in storage, and access to a shared laundry room.",
    propertyType: "studio",
    rentalArrangement: "standard",
    monthlyRent: 7_300,
    deposit: 21_900,
    utilitiesIncluded: false,
    sizeSqm: 33,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: false,
    availableFrom: "2026-10-01",
    minLeaseMonths: 12,
    amenities: ["laundry", "parking"],
    addressLine1: "Testvej 3",
    postalCode: "8000",
    city: "Aarhus C",
    countryCode: "DK",
    neighborhood: "Universitetsparken",
    publicLocationLabel: "Universitetsparken, Aarhus",
    exactCoordinate: { latitude: 56.1697, longitude: 10.2023 },
    publicCoordinate: { latitude: 56.1702, longitude: 10.2009 },
    photoColors: ["#B4C7A5", "#E5C99D"],
  },
  {
    key: "brabrand-townhouse",
    title: "Townhouse close to Brabrand Lake",
    summary: "Three-bedroom home with a small garden and parking space.",
    description: "A family-friendly townhouse with three bedrooms, a utility room, and a private garden. The lake path and bus connections are within walking distance.",
    propertyType: "house",
    rentalArrangement: "standard",
    monthlyRent: 13_900,
    deposit: 41_700,
    utilitiesIncluded: false,
    sizeSqm: 112,
    bedroomCount: 3,
    bathroomCount: 2,
    furnished: false,
    availableFrom: "2026-11-01",
    minLeaseMonths: 12,
    amenities: ["parking", "dishwasher", "petsAllowed"],
    addressLine1: "Testvej 4",
    postalCode: "8220",
    city: "Brabrand",
    countryCode: "DK",
    neighborhood: "Brabrand",
    publicLocationLabel: "Brabrand, Aarhus",
    exactCoordinate: { latitude: 56.1528, longitude: 10.1267 },
    publicCoordinate: { latitude: 56.1519, longitude: 10.1282 },
    photoColors: ["#B6A58D", "#CAD8BF"],
  },
  {
    key: "frederiksbjerg-loft",
    title: "Loft in Frederiksbjerg",
    summary: "Top-floor apartment near cafés, shops, and the central station.",
    description: "A top-floor apartment with exposed beams, a large living room, and a modern kitchen. The home is rented unfurnished and has access to a shared courtyard.",
    propertyType: "apartment",
    rentalArrangement: "standard",
    monthlyRent: 10_800,
    deposit: 32_400,
    utilitiesIncluded: false,
    sizeSqm: 60,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: false,
    availableFrom: "2026-09-01",
    minLeaseMonths: 12,
    amenities: ["dishwasher", "laundry"],
    addressLine1: "Testvej 5",
    postalCode: "8000",
    city: "Aarhus C",
    countryCode: "DK",
    neighborhood: "Frederiksbjerg",
    publicLocationLabel: "Frederiksbjerg, Aarhus",
    exactCoordinate: { latitude: 56.1481, longitude: 10.2024 },
    publicCoordinate: { latitude: 56.1473, longitude: 10.2012 },
    photoColors: ["#D7B28B", "#9CB7B4"],
  },
  {
    key: "latin-quarter-sublease",
    title: "Short-term room in the Latin Quarter",
    summary: "Four-month furnished sublet in central Aarhus.",
    description: "A furnished room in a two-bedroom apartment. The current tenant is away for a semester, so the room is available for a fixed four-month period.",
    propertyType: "room",
    rentalArrangement: "sublease",
    monthlyRent: 5_600,
    deposit: 5_600,
    utilitiesIncluded: true,
    sizeSqm: 18,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: true,
    availableFrom: "2026-09-01",
    availableTo: "2026-12-31",
    minLeaseMonths: 4,
    maxLeaseMonths: 4,
    amenities: ["laundry", "internetIncluded"],
    addressLine1: "Testvej 6",
    postalCode: "8000",
    city: "Aarhus C",
    countryCode: "DK",
    neighborhood: "Latinerkvarteret",
    publicLocationLabel: "Latinerkvarteret, Aarhus",
    exactCoordinate: { latitude: 56.1585, longitude: 10.2072 },
    publicCoordinate: { latitude: 56.1578, longitude: 10.2061 },
    photoColors: ["#D5A3A3", "#E8D6B0"],
  },
  {
    key: "abyhoj-balcony",
    title: "Apartment with balcony in Åbyhøj",
    summary: "Quiet two-bedroom apartment with a west-facing balcony.",
    description: "A well-kept apartment with two bedrooms and a west-facing balcony. There is secure bicycle parking and a shared laundry room in the building.",
    propertyType: "apartment",
    rentalArrangement: "standard",
    monthlyRent: 9_200,
    deposit: 27_600,
    utilitiesIncluded: false,
    sizeSqm: 55,
    bedroomCount: 2,
    bathroomCount: 1,
    furnished: false,
    availableFrom: "2026-10-15",
    minLeaseMonths: 12,
    amenities: ["balcony", "laundry", "parking"],
    addressLine1: "Testvej 7",
    postalCode: "8230",
    city: "Åbyhøj",
    countryCode: "DK",
    neighborhood: "Åbyhøj",
    publicLocationLabel: "Åbyhøj, Aarhus",
    exactCoordinate: { latitude: 56.1561, longitude: 10.1633 },
    publicCoordinate: { latitude: 56.1554, longitude: 10.1646 },
    photoColors: ["#A8BDD5", "#D9C6A5"],
  },
  {
    key: "risskov-family-home",
    title: "Family home in Risskov",
    summary: "Four-bedroom house near the forest and beach.",
    description: "A detached home with four bedrooms, two bathrooms, and a fenced garden. Pets are welcome. The house is close to Risskov forest and local schools.",
    propertyType: "house",
    rentalArrangement: "standard",
    monthlyRent: 16_500,
    deposit: 49_500,
    utilitiesIncluded: false,
    sizeSqm: 138,
    bedroomCount: 4,
    bathroomCount: 2,
    furnished: false,
    availableFrom: "2026-11-15",
    minLeaseMonths: 24,
    amenities: ["parking", "dishwasher", "petsAllowed"],
    addressLine1: "Testvej 8",
    postalCode: "8240",
    city: "Risskov",
    countryCode: "DK",
    neighborhood: "Risskov",
    publicLocationLabel: "Risskov, Aarhus",
    exactCoordinate: { latitude: 56.1881, longitude: 10.2262 },
    publicCoordinate: { latitude: 56.1874, longitude: 10.2248 },
    photoColors: ["#A8B89D", "#C9B59B"],
  },
  {
    key: "odense-studio",
    title: "Compact flat in Odense C",
    summary: "Central studio with utilities included.",
    description: "A compact furnished flat for one person. Utilities and internet are included, and the central station is within walking distance.",
    propertyType: "studio",
    rentalArrangement: "standard",
    monthlyRent: 6_800,
    deposit: 13_600,
    utilitiesIncluded: true,
    sizeSqm: 29,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: true,
    availableFrom: "2026-09-15",
    minLeaseMonths: 6,
    amenities: ["internetIncluded", "laundry"],
    addressLine1: "Testvej 9",
    postalCode: "5000",
    city: "Odense C",
    countryCode: "DK",
    neighborhood: "Odense C",
    publicLocationLabel: "Odense C",
    exactCoordinate: { latitude: 55.4038, longitude: 10.4024 },
    publicCoordinate: { latitude: 55.4046, longitude: 10.4009 },
    photoColors: ["#C5B6D5", "#B4C9CF"],
  },
  {
    key: "norrebro-room",
    title: "Room near Nørrebro Station",
    summary: "Furnished room in a three-person shared apartment.",
    description: "A furnished room with access to a shared kitchen and living room. The rent includes heating, water, and internet.",
    propertyType: "room",
    rentalArrangement: "standard",
    monthlyRent: 6_300,
    deposit: 12_600,
    utilitiesIncluded: true,
    sizeSqm: 14,
    bedroomCount: 1,
    bathroomCount: 1,
    furnished: true,
    availableFrom: "2026-10-01",
    minLeaseMonths: 6,
    amenities: ["internetIncluded", "laundry", "dishwasher"],
    addressLine1: "Testvej 10",
    postalCode: "2200",
    city: "Copenhagen N",
    countryCode: "DK",
    neighborhood: "Nørrebro",
    publicLocationLabel: "Nørrebro, Copenhagen",
    exactCoordinate: { latitude: 55.7005, longitude: 12.5372 },
    publicCoordinate: { latitude: 55.6996, longitude: 12.5385 },
    photoColors: ["#D1A99E", "#AABFD1"],
  },
];

function mockPhotoSvg(listing: MockListing) {
  const [wall, accent] = listing.photoColors;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" fill="${wall}"/>
      <rect y="530" width="1200" height="270" fill="${accent}"/>
      <rect x="110" y="110" width="390" height="300" rx="8" fill="#f7f2e8" opacity=".9"/>
      <rect x="145" y="145" width="145" height="230" fill="#dbe8ec"/>
      <rect x="320" y="145" width="145" height="230" fill="#dbe8ec"/>
      <rect x="710" y="360" width="330" height="210" rx="28" fill="#f7f2e8"/>
      <rect x="665" y="515" width="420" height="70" rx="24" fill="#6c6258" opacity=".7"/>
      <circle cx="850" cy="255" r="90" fill="#f4db88" opacity=".75"/>
      <text x="70" y="730" fill="#302b27" font-family="system-ui, sans-serif" font-size="42" font-weight="700">${listing.publicLocationLabel}</text>
    </svg>
  `.trim();
}

export const getExisting = internalQuery({
  args: {},
  returns: v.array(v.object({
    ownerSubject: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  })),
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_owner_key", (query) => query.eq("ownerKeyHash", MOCK_OWNER_HASH))
      .collect();

    return listings.map((listing) => ({
      ownerSubject: listing.ownerSubject,
      storageId: listing.photos[0]?.storageId,
    }));
  },
});

export const upsertOne = internalMutation({
  args: {
    index: v.number(),
    storageId: v.id("_storage"),
    publishedAt: v.number(),
  },
  returns: v.union(v.literal("created"), v.literal("updated")),
  handler: async (ctx, args) => {
    const mock = MOCK_LISTINGS[args.index];
    if (!mock || !Number.isInteger(args.index)) throw new Error("Invalid mock listing index.");

    const ownerSubject = `mock:${mock.key}`;
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_owner_key", (query) => query.eq("ownerKeyHash", MOCK_OWNER_HASH))
      .collect();
    const current = existing.find((listing) => listing.ownerSubject === ownerSubject);
    const listing = {
      status: "published" as const,
      ownerMode: "user" as const,
      ownerKeyHash: MOCK_OWNER_HASH,
      ownerSubject,
      title: mock.title,
      summary: mock.summary,
      description: mock.description,
      propertyType: mock.propertyType,
      rentalArrangement: mock.rentalArrangement,
      contentLanguage: "en" as const,
      monthlyRent: mock.monthlyRent,
      deposit: mock.deposit,
      currency: "DKK",
      utilitiesIncluded: mock.utilitiesIncluded,
      sizeSqm: mock.sizeSqm,
      bedroomCount: mock.bedroomCount,
      bathroomCount: mock.bathroomCount,
      furnished: mock.furnished,
      availableFrom: mock.availableFrom,
      availableTo: mock.availableTo,
      minLeaseMonths: mock.minLeaseMonths,
      maxLeaseMonths: mock.maxLeaseMonths,
      amenities: mock.amenities,
      addressLine1: mock.addressLine1,
      postalCode: mock.postalCode,
      city: mock.city,
      countryCode: mock.countryCode,
      neighborhood: mock.neighborhood,
      publicLocationLabel: mock.publicLocationLabel,
      exactCoordinate: mock.exactCoordinate,
      publicCoordinate: mock.publicCoordinate,
      publicCoordinateAngle: 0,
      photos: [{ storageId: args.storageId, width: 1200, height: 800, mimeType: "image/svg+xml" }],
      coverStorageId: args.storageId,
      completedSteps: [...COMPLETED_STEPS],
      moderationState: "active" as const,
      publishedAt: args.publishedAt,
      lifecycleChangedAt: args.publishedAt,
      lastEditedAt: args.publishedAt,
    };

    if (current) {
      await ctx.db.patch(current._id, listing);
      const updatedListing = await ctx.db.get(current._id);
      if (updatedListing) await upsertPublishedSearch(ctx, updatedListing);
      return "updated";
    }

    const listingId = await ctx.db.insert("listings", listing);
    const insertedListing = await ctx.db.get(listingId);
    if (insertedListing) await upsertPublishedSearch(ctx, insertedListing);
    return "created";
  },
});

export const seed = internalAction({
  args: {},
  returns: v.object({ created: v.number(), updated: v.number(), total: v.number() }),
  handler: async (ctx) => {
    const existing = await ctx.runQuery(internal.seed.getExisting, {});
    const storageByOwner = new Map(existing.map((listing) => [listing.ownerSubject, listing.storageId]));
    const baseTime = Date.now();
    let created = 0;
    let updated = 0;

    for (const [index, mock] of MOCK_LISTINGS.entries()) {
      const ownerSubject = `mock:${mock.key}`;
      const storageId = storageByOwner.get(ownerSubject) ?? await ctx.storage.store(
        new Blob([mockPhotoSvg(mock)], { type: "image/svg+xml" }),
      );
      const result = await ctx.runMutation(internal.seed.upsertOne, {
        index,
        storageId,
        publishedAt: baseTime - index * 60 * 60 * 1000,
      });
      if (result === "created") created += 1;
      else updated += 1;
    }

    return { created, updated, total: MOCK_LISTINGS.length };
  },
});
