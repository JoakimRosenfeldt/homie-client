import * as SecureStore from "expo-secure-store";

import { supportedLocales, type Locale } from "@/i18n/locale";

const LOCALE_OVERRIDE_KEY = "homie.locale-override.v1";

function isLocale(value: string | null): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}

function browserStorage() {
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export async function readLocaleOverride(): Promise<Locale | null> {
  try {
    const value =
      process.env.EXPO_OS === "web"
        ? browserStorage()?.getItem(LOCALE_OVERRIDE_KEY) ?? null
        : (await SecureStore.isAvailableAsync())
          ? await SecureStore.getItemAsync(LOCALE_OVERRIDE_KEY)
          : null;
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeLocaleOverride(locale: Locale | null) {
  try {
    if (process.env.EXPO_OS === "web") {
      const storage = browserStorage();
      if (!storage) return;
      if (locale) storage.setItem(LOCALE_OVERRIDE_KEY, locale);
      else storage.removeItem(LOCALE_OVERRIDE_KEY);
      return;
    }

    if (!(await SecureStore.isAvailableAsync())) return;
    if (locale) await SecureStore.setItemAsync(LOCALE_OVERRIDE_KEY, locale);
    else await SecureStore.deleteItemAsync(LOCALE_OVERRIDE_KEY);
  } catch {
    // The in-memory preference still works when device storage is unavailable.
  }
}
