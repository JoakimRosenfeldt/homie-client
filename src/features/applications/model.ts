import type { Id } from "../../../convex/_generated/dataModel";

import type { SeekerProfile } from "@/features/profile/model";
import { english, type TranslationKey } from "@/i18n/dictionaries";

export type ApplicationStatus = "pending" | "shortlisted" | "declined" | "withdrawn" | "closed";

export type Application = {
  id: Id<"applications">;
  listingId: Id<"listings">;
  listingTitle: string;
  listingLocation?: string;
  note: string;
  profileSnapshot: SeekerProfile;
  status: ApplicationStatus;
  submittedAt: number;
};

export type ApplicationStatusCopy = {
  label: string;
  detail: string;
  tone: "accent" | "neutral";
};

type Translate = (key: TranslationKey) => string;

const STATUS_KEYS = {
  pending: { label: "status.pending.label", detail: "status.pending.detail", tone: "accent" },
  shortlisted: { label: "status.shortlisted.label", detail: "status.shortlisted.detail", tone: "accent" },
  declined: { label: "status.declined.label", detail: "status.declined.detail", tone: "neutral" },
  withdrawn: { label: "status.withdrawn.label", detail: "status.withdrawn.detail", tone: "neutral" },
  closed: { label: "status.closed.label", detail: "status.closed.detail", tone: "neutral" },
} as const satisfies Record<
  ApplicationStatus,
  { label: TranslationKey; detail: TranslationKey; tone: ApplicationStatusCopy["tone"] }
>;

export function applicationStatusCopy(status: ApplicationStatus, translate?: Translate): ApplicationStatusCopy {
  const copy = STATUS_KEYS[status];
  const text = translate ?? ((key: TranslationKey) => english[key]);
  return { label: text(copy.label), detail: text(copy.detail), tone: copy.tone };
}
