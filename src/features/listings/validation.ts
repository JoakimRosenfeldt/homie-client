import type {
  ListingCompletionItem,
  ListingCompletionState,
  ListingDraft,
  ListingStepKey,
  RentalArrangement,
} from "./model";

export function normalizeText(value?: string | null) {
  return value?.trim() || undefined;
}

export function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildPublicLocationLabel(input: {
  neighborhood?: string;
  city?: string;
  countryCode?: string;
}) {
  const parts = [normalizeText(input.neighborhood), normalizeText(input.city)];
  const unique = parts.filter((part, index, list): part is string => Boolean(part) && list.indexOf(part) === index);

  if (unique.length > 0) {
    return unique.join(", ");
  }

  return normalizeText(input.countryCode);
}

export function isValidDateInput(value?: string) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function hasAddress(draft: Pick<ListingDraft, "addressLine1" | "postalCode" | "city" | "countryCode">) {
  return Boolean(
    normalizeText(draft.addressLine1) &&
      normalizeText(draft.postalCode) &&
      normalizeText(draft.city) &&
      normalizeText(draft.countryCode),
  );
}

export function getListingChecklist(
  draft: Pick<
    ListingDraft,
    | "title"
    | "description"
    | "propertyType"
    | "rentalArrangement"
    | "monthlyRent"
    | "sizeSqm"
    | "availableFrom"
    | "availableTo"
    | "addressLine1"
    | "postalCode"
    | "city"
    | "countryCode"
    | "photos"
  >,
): ListingCompletionItem[] {
  const isSublease = draft.rentalArrangement === "sublease";

  return [
    {
      key: "title",
      label: "Add a listing title",
      step: "basics",
      complete: Boolean(normalizeText(draft.title)),
    },
    {
      key: "description",
      label: "Write a full description",
      step: "basics",
      complete: Boolean(normalizeText(draft.description)),
    },
    {
      key: "propertyType",
      label: "Choose a property type",
      step: "basics",
      complete: Boolean(draft.propertyType),
    },
    {
      key: "rentalArrangement",
      label: "Choose a rental arrangement",
      step: "basics",
      complete: Boolean(draft.rentalArrangement),
    },
    {
      key: "monthlyRent",
      label: "Set the monthly rent",
      step: "details",
      complete: typeof draft.monthlyRent === "number" && draft.monthlyRent > 0,
    },
    {
      key: "sizeSqm",
      label: "Add the size in sqm",
      step: "details",
      complete: typeof draft.sizeSqm === "number" && draft.sizeSqm > 0,
    },
    {
      key: "availableFrom",
      label: "Set when the home is available",
      step: "details",
      complete: isValidDateInput(draft.availableFrom),
    },
    {
      key: "availableTo",
      label: "Subleases need an end date",
      step: "details",
      complete: isSublease ? isValidDateInput(draft.availableTo) : true,
    },
    {
      key: "address",
      label: "Add the private address",
      step: "location",
      complete: hasAddress(draft),
    },
    {
      key: "photo",
      label: "Upload at least 1 photo",
      step: "photos",
      complete: draft.photos.length > 0,
    },
  ];
}

export function getCompletedSteps(
  listing: Pick<
    ListingDraft,
    | "title"
    | "description"
    | "propertyType"
    | "rentalArrangement"
    | "monthlyRent"
    | "sizeSqm"
    | "availableFrom"
    | "availableTo"
    | "amenities"
    | "addressLine1"
    | "postalCode"
    | "city"
    | "countryCode"
    | "photos"
    | "status"
  >,
) {
  const checklist = getListingChecklist(listing);
  const steps = new Set<ListingStepKey>();

  if (checklist.filter((item) => item.step === "basics").every((item) => item.complete)) {
    steps.add("basics");
  }

  if (checklist.filter((item) => item.step === "details").every((item) => item.complete)) {
    steps.add("details");
  }

  if (listing.amenities.length > 0) {
    steps.add("features");
  }

  if (checklist.find((item) => item.step === "location")?.complete) {
    steps.add("location");
  }

  if (checklist.find((item) => item.step === "photos")?.complete) {
    steps.add("photos");
  }

  if (listing.status === "published") {
    steps.add("review");
  }

  return Array.from(steps);
}

export function getCompletionState(
  draft: Pick<
    ListingDraft,
    | "title"
    | "description"
    | "propertyType"
    | "rentalArrangement"
    | "monthlyRent"
    | "sizeSqm"
    | "availableFrom"
    | "availableTo"
    | "amenities"
    | "addressLine1"
    | "postalCode"
    | "city"
    | "countryCode"
    | "photos"
    | "status"
  >,
): ListingCompletionState {
  const checklist = getListingChecklist(draft);

  return {
    completedSteps: getCompletedSteps(draft),
    checklist,
    canPublish: checklist.every((item) => item.complete),
  };
}

export function getFirstIncompleteStep(draft: Pick<ListingDraft, keyof ListingDraft>) {
  const completion = getCompletionState(draft);
  const incomplete = completion.checklist.find((item: ListingCompletionItem) => !item.complete);
  return incomplete?.step ?? "review";
}

export function requiresAvailableTo(rentalArrangement?: RentalArrangement) {
  return rentalArrangement === "sublease";
}
