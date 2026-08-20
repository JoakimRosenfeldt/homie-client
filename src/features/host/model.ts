import type { Id } from "../../../convex/_generated/dataModel";

import type { ApplicationStatus } from "@/features/applications/model";
import type { SeekerProfile } from "@/features/profile/model";

export type ListingKind = "room" | "studio" | "apartment" | "house";
export type HostListingStatus = "live" | "paused" | "rented" | "archived";

export type HostListing = {
  id: Id<"listings">;
  title: string;
  area: string;
  monthlyRent: number;
  kind: ListingKind;
  status: HostListingStatus;
};

export type HostApplicant = {
  id: Id<"applications">;
  listingId: Id<"listings">;
  profile: SeekerProfile;
  note: string;
  status: Extract<ApplicationStatus, "pending" | "shortlisted" | "declined" | "closed">;
};

export function hostListingStatusLabel(status: HostListingStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "paused":
      return "Paused";
    case "rented":
      return "Rented";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
