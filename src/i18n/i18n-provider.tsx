import React from "react";

import { dictionaries, type TranslationKey } from "@/i18n/dictionaries";
import { readLocaleOverride, writeLocaleOverride } from "@/i18n/locale-storage";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  getDeviceLocale,
  type Locale,
} from "@/i18n/locale";

type I18nValue = {
  locale: Locale;
  localeOverride: Locale | null;
  setLocale: (locale: Locale) => void;
  useDeviceLocale: () => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
};

const I18nContext = React.createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = null,
}: React.PropsWithChildren<{ initialLocale?: Locale | null }>) {
  const deviceLocale = React.useMemo(getDeviceLocale, []);
  const [localeOverride, setLocaleOverride] = React.useState<Locale | null>(initialLocale);
  const changedDuringLoad = React.useRef(false);
  const locale = localeOverride ?? deviceLocale;

  React.useEffect(() => {
    if (initialLocale !== null) return;
    let active = true;
    void readLocaleOverride().then((storedLocale) => {
      if (active && !changedDuringLoad.current) setLocaleOverride(storedLocale);
    });
    return () => {
      active = false;
    };
  }, [initialLocale]);

  React.useEffect(() => {
    if (process.env.EXPO_OS !== "web" || typeof document === "undefined") return;
    document.documentElement.lang = locale;
  }, [locale]);

  const persistLocale = React.useCallback((nextLocale: Locale | null) => {
    changedDuringLoad.current = true;
    setLocaleOverride(nextLocale);
    void writeLocaleOverride(nextLocale);
  }, []);

  const value = React.useMemo<I18nValue>(
    () => ({
      locale,
      localeOverride,
      setLocale: persistLocale,
      useDeviceLocale: () => persistLocale(null),
      t: (key, values) => {
        const template = dictionaries[locale][key];
        if (!values) return template;
        return template.replace(/\{(\w+)\}/g, (match, name: string) =>
          Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
        );
      },
      formatCurrency: (amount, currency) => formatCurrency(amount, locale, currency),
      formatDate: (date, options) => formatDate(date, locale, options),
      formatNumber: (number, options) => formatNumber(number, locale, options),
      formatRelativeTime: (amount, unit) => formatRelativeTime(amount, unit, locale),
    }),
    [locale, localeOverride, persistLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = React.use(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return value;
}
