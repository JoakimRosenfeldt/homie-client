export const supportedLocales = ["en", "da"] as const;

export type Locale = (typeof supportedLocales)[number];

const intlLocales: Record<Locale, string> = {
  da: "da-DK",
  en: "en-DK",
};

export function resolveSupportedLocale(locale: string | null | undefined): Locale {
  return locale?.toLowerCase().startsWith("da") ? "da" : "en";
}

export function getDeviceLocale(): Locale {
  return resolveSupportedLocale(Intl.DateTimeFormat().resolvedOptions().locale);
}

export function formatCurrency(value: number, locale: Locale, currency = "DKK") {
  return new Intl.NumberFormat(intlLocales[locale], {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatDate(value: Date | number, locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocales[locale], options).format(value);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocales[locale], options).format(value);
}

export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale: Locale) {
  return new Intl.RelativeTimeFormat(intlLocales[locale], { numeric: "auto" }).format(value, unit);
}
