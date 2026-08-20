import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "backfill published listing search",
  { minutes: 1 },
  internal.listings.backfillPublishedSearch,
  { cursor: null },
);

crons.interval(
  "recover push leases and remove old delivery records",
  { minutes: 1 },
  internal.savedSearches.maintainPushQueue,
  {},
);

crons.interval(
  "send due push retries",
  { minutes: 1 },
  internal.savedSearches.sendPendingPushes,
  {},
);

crons.interval(
  "poll Expo push receipts",
  { minutes: 5 },
  internal.savedSearches.checkPushReceipts,
  {},
);

export default crons;
