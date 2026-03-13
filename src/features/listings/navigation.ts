import { LISTING_STEP_META, type ListingDraft, type ListingStepKey } from "@/features/listings/model";
import { getFirstIncompleteStep } from "@/features/listings/validation";

export const LISTING_STEP_ORDER = LISTING_STEP_META.map((step) => step.key);

export function getNextStep(step: ListingStepKey) {
  const index = LISTING_STEP_ORDER.indexOf(step);
  return LISTING_STEP_ORDER[index + 1];
}

export function getPreviousStep(step: ListingStepKey) {
  const index = LISTING_STEP_ORDER.indexOf(step);
  return index > 0 ? LISTING_STEP_ORDER[index - 1] : undefined;
}

export function getStepRoute(listingId: string, step: ListingStepKey) {
  switch (step) {
    case "basics":
      return {
        pathname: "/listings/new/[listingId]/basics" as const,
        params: { listingId },
      };
    case "details":
      return {
        pathname: "/listings/new/[listingId]/details" as const,
        params: { listingId },
      };
    case "features":
      return {
        pathname: "/listings/new/[listingId]/features" as const,
        params: { listingId },
      };
    case "location":
      return {
        pathname: "/listings/new/[listingId]/location" as const,
        params: { listingId },
      };
    case "photos":
      return {
        pathname: "/listings/new/[listingId]/photos" as const,
        params: { listingId },
      };
    case "review":
      return {
        pathname: "/listings/new/[listingId]/review" as const,
        params: { listingId },
      };
  }
}

export function getListingDetailRoute(listingId: string) {
  return {
    pathname: "/listings/[listingId]" as const,
    params: { listingId },
  };
}

export function getResumeRoute(draft: ListingDraft) {
  return getStepRoute(draft._id, getFirstIncompleteStep(draft));
}

export function getResumeStepFromCompletedSteps(completedSteps: string[]) {
  return LISTING_STEP_ORDER.find((step) => step !== "review" && !completedSteps.includes(step)) ?? "review";
}
