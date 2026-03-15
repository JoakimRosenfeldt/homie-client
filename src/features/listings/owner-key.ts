import * as SecureStore from "expo-secure-store";

const OWNER_KEY_STORAGE_KEY = "homie.listing.ownerKey";

function getWebStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function generateOwnerKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint8Array(24);
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export async function readDeviceOwnerKey() {
  if (process.env.EXPO_OS === "web") {
    return getWebStorage()?.getItem(OWNER_KEY_STORAGE_KEY) ?? null;
  }

  return SecureStore.getItemAsync(OWNER_KEY_STORAGE_KEY);
}

export async function ensureDeviceOwnerKey() {
  const existing = await readDeviceOwnerKey();
  if (existing) {
    return existing;
  }

  const ownerKey = generateOwnerKey();

  if (process.env.EXPO_OS === "web") {
    getWebStorage()?.setItem(OWNER_KEY_STORAGE_KEY, ownerKey);
    return ownerKey;
  }

  await SecureStore.setItemAsync(OWNER_KEY_STORAGE_KEY, ownerKey);
  return ownerKey;
}
