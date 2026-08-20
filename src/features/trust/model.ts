export const REPORT_REASONS: readonly ["Scam", "Inaccurate", "Unavailable", "Discriminatory", "Other"] = [
  "Scam",
  "Inaccurate",
  "Unavailable",
  "Discriminatory",
  "Other",
];

export type ReportReason = (typeof REPORT_REASONS)[number];

export type Report = {
  id: string;
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  details: string;
  createdAt: number;
};
