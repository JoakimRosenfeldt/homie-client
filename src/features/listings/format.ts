import {
  LISTING_AMENITY_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  type ListingAmenity,
  type ListingDetail,
  type ListingDraft,
  type PropertyType,
  type RentalArrangement,
} from "@/features/listings/model";

export function formatCurrency(amount?: number, currency = "DKK") {
  if (typeof amount !== "number") {
    return "Not set";
  }

  return new Intl.NumberFormat("en-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatLeaseWindow(listing: Pick<ListingDraft, "availableFrom" | "availableTo" | "rentalArrangement">) {
  if (listing.rentalArrangement === "sublease" && listing.availableTo) {
    return `${formatDate(listing.availableFrom)} to ${formatDate(listing.availableTo)}`;
  }

  return `Available from ${formatDate(listing.availableFrom)}`;
}

export function formatSize(sizeSqm?: number) {
  return typeof sizeSqm === "number" ? `${sizeSqm} sqm` : "Size not set";
}

export function formatRooms(label: string, count?: number) {
  if (typeof count !== "number") {
    return `${label} not set`;
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function getAmenityLabel(amenity: ListingAmenity) {
  return LISTING_AMENITY_OPTIONS.find((item) => item.value === amenity)?.label ?? amenity;
}

export function getListingHeadline(listing: Pick<ListingDetail, "title" | "propertyType"> | Pick<ListingDraft, "title" | "propertyType">) {
  return listing.title.trim() || `Untitled ${listing.propertyType ?? "rental"}`;
}

export function getPropertyTypeLabel(propertyType?: PropertyType) {
  return PROPERTY_TYPE_OPTIONS.find((option) => option.value === propertyType)?.label ?? "Rental";
}

export function getRentalArrangementLabel(rentalArrangement?: RentalArrangement) {
  return rentalArrangement === "sublease" ? "Sublease" : "Standard rental";
}

export function getAvailabilityLabel(listing: Pick<ListingDraft, "availableFrom"> | Pick<ListingDetail, "availableFrom">) {
  if (!listing.availableFrom) {
    return "Availability not set";
  }

  return `Available ${formatDate(listing.availableFrom)}`;
}
