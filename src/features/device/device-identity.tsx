import * as SecureStore from "expo-secure-store";
import React from "react";

const DEVICE_SECRET_KEY = "homie.device-secret.v1";
const SECRET_BYTE_LENGTH = 32;

type IdentityActions = {
  retry: () => void;
  rotate: () => Promise<string>;
};

export type DeviceIdentity =
  | (IdentityActions & { kind: "loading"; ownerKey: null; error: null })
  | (IdentityActions & { kind: "ready"; ownerKey: string; error: null })
  | (IdentityActions & { kind: "error"; ownerKey: null; error: string });

type IdentityState =
  | { kind: "loading"; ownerKey: null; error: null }
  | { kind: "ready"; ownerKey: string; error: null }
  | { kind: "error"; ownerKey: null; error: string };

const DeviceIdentityContext = React.createContext<DeviceIdentity | null>(null);

function createDeviceSecret() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random number generation is unavailable on this device.");
  }

  const bytes = new Uint8Array(SECRET_BYTE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getBrowserStorage() {
  if (typeof globalThis.localStorage === "undefined") {
    throw new Error("Persistent browser storage is unavailable.");
  }
  return globalThis.localStorage;
}

async function readDeviceSecret() {
  if (process.env.EXPO_OS === "web") {
    return getBrowserStorage().getItem(DEVICE_SECRET_KEY);
  }

  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure device storage is unavailable.");
  }
  return SecureStore.getItemAsync(DEVICE_SECRET_KEY);
}

async function writeDeviceSecret(ownerKey: string) {
  if (process.env.EXPO_OS === "web") {
    getBrowserStorage().setItem(DEVICE_SECRET_KEY, ownerKey);
    return;
  }

  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure device storage is unavailable.");
  }
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, ownerKey);
}

async function loadOrCreateDeviceSecret() {
  const stored = await readDeviceSecret();
  if (stored) return stored;

  const created = createDeviceSecret();
  await writeDeviceSecret(created);
  return created;
}

function identityErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Homie could not access this device's private identity.";
}

export function DeviceIdentityProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = React.useState<IdentityState>({
    kind: "loading",
    ownerKey: null,
    error: null,
  });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setState({ kind: "loading", ownerKey: null, error: null });

    loadOrCreateDeviceSecret().then(
      (ownerKey) => {
        if (active) setState({ kind: "ready", ownerKey, error: null });
      },
      (error: unknown) => {
        if (active) {
          setState({ kind: "error", ownerKey: null, error: identityErrorMessage(error) });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((current) => current + 1), []);
  const rotate = React.useCallback(async () => {
    const ownerKey = createDeviceSecret();
    await writeDeviceSecret(ownerKey);
    setState({ kind: "ready", ownerKey, error: null });
    return ownerKey;
  }, []);

  const value = React.useMemo<DeviceIdentity>(
    () => ({ ...state, retry, rotate }),
    [retry, rotate, state],
  );

  return <DeviceIdentityContext.Provider value={value}>{children}</DeviceIdentityContext.Provider>;
}

export function useDeviceIdentity() {
  const value = React.use(DeviceIdentityContext);
  if (!value) {
    throw new Error("useDeviceIdentity must be used inside DeviceIdentityProvider");
  }
  return value;
}
