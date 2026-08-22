import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";

export type ExploreListing = FunctionReturnType<typeof api.listings.explore>["items"][number];

export type Room = {
  id: ExploreListing["_id"];
  title: string;
  meta: string;
  rent: number;
  photo: string;
  photoUri?: string;
  photoCount: number;
  tags: string[];
  coordinate?: { latitude: number; longitude: number };
  pin: { left: number; top: number };
};

export const EXPLORE_AREA = "Aarhus";
export const OWN_LISTING_LABEL = "Your listing · Jægersborggade 12";

const PROPERTY_TYPE_LABELS = {
  room: "Room",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
} satisfies Record<NonNullable<ExploreListing["propertyType"]>, string>;

const AARHUS_BOUNDS = {
  north: 56.19,
  south: 56.14,
  east: 10.24,
  west: 10.12,
};

export function roomFromListing(listing: ExploreListing, index: number): Room {
  return {
    id: listing._id,
    title: listing.title,
    meta: [listing.publicLocationLabel, listing.sizeSqm ? `${listing.sizeSqm} m²` : null]
      .filter(Boolean)
      .join(" · "),
    rent: listing.monthlyRent ?? 0,
    photo: `Photo of ${listing.title}`,
    photoUri: listing.coverUrl ?? undefined,
    photoCount: listing.photoCount,
    coordinate: listing.publicCoordinate,
    tags: [
      listing.propertyType ? PROPERTY_TYPE_LABELS[listing.propertyType] : null,
      listing.rentalArrangement === "sublease" ? "Sublease" : null,
      listing.availableFrom ? `From ${formatListingDate(listing.availableFrom)}` : null,
    ].filter((tag): tag is string => Boolean(tag)),
    pin: mapPin(listing.publicCoordinate, index),
  };
}

export function propertyTypeLabel(propertyType: ExploreListing["propertyType"]) {
  return propertyType ? PROPERTY_TYPE_LABELS[propertyType] : undefined;
}

export function formatListingDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-DK", { day: "numeric", month: "short" }).format(date);
}

function mapPin(coordinate: ExploreListing["publicCoordinate"], index: number) {
  if (!coordinate) {
    return { left: 42 + (index % 3) * 118, top: 220 + Math.floor(index / 3) * 118 };
  }

  const horizontal = (coordinate.longitude - AARHUS_BOUNDS.west) / (AARHUS_BOUNDS.east - AARHUS_BOUNDS.west);
  const vertical = (AARHUS_BOUNDS.north - coordinate.latitude) / (AARHUS_BOUNDS.north - AARHUS_BOUNDS.south);

  return {
    left: 34 + Math.round(clamp(horizontal) * 270),
    top: 190 + Math.round(clamp(vertical) * 390),
  };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function formatKr(amount: number) {
  return `${formatThousands(amount)} kr`;
}

export function formatThousands(amount: number) {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
