import { ConvexError } from "convex/values";

import { english, type TranslationKey } from "@/i18n/dictionaries";

type BackendErrorI18n = {
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
};

function cleanServerMessage(message: string) {
  const convexMarker = "Uncaught ConvexError: ";
  const markerIndex = message.lastIndexOf(convexMarker);
  if (markerIndex >= 0) {
    return message.slice(markerIndex + convexMarker.length).split("\n")[0].trim();
  }

  return message.split("\n")[0].replace(/^\[CONVEX [^\]]+\]\s*/, "").trim();
}

export function readableBackendError(error: unknown, i18n?: BackendErrorI18n) {
  if (error instanceof ConvexError) {
    if (typeof error.data === "string") return error.data;
    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "code" in error.data &&
      error.data.code === "RATE_LIMITED"
    ) {
      const retryAt = "retryAt" in error.data && typeof error.data.retryAt === "number"
        ? error.data.retryAt
        : null;
      if (retryAt !== null) {
        const time = i18n
          ? i18n.formatDate(retryAt, { hour: "numeric", minute: "2-digit" })
          : new Intl.DateTimeFormat("en-DK", { hour: "numeric", minute: "2-digit" }).format(retryAt);
        return i18n?.t("backend.rateLimited", { time }) ?? english["backend.rateLimited"].replace("{time}", time);
      }
      return i18n?.t("backend.rateLimitedGeneric") ?? english["backend.rateLimitedGeneric"];
    }
  }

  if (error instanceof Error) {
    const message = cleanServerMessage(error.message);
    if (message) return message;
  }

  return i18n?.t("backend.fallback") ?? english["backend.fallback"];
}
