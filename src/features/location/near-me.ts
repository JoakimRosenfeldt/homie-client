import * as Location from "expo-location";

import type { NearMeResult } from "@/features/location/near-me.types";

function permissionStatus(
  status: Location.PermissionStatus,
): "denied" | "granted" | "undetermined" {
  if (status === Location.PermissionStatus.GRANTED) {
    return "granted";
  }
  if (status === Location.PermissionStatus.DENIED) {
    return "denied";
  }
  return "undetermined";
}

export async function requestNearMeLocation(): Promise<NearMeResult> {
  if (process.env.EXPO_OS !== "ios" && process.env.EXPO_OS !== "android") {
    return {
      kind: "manualAreaRequired",
      permission: "undetermined",
      reason: "unsupportedPlatform",
    };
  }

  let resolvedPermission: "denied" | "granted" | "undetermined" = "undetermined";

  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        kind: "manualAreaRequired",
        permission: "undetermined",
        reason: "locationServicesDisabled",
      };
    }

    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.granted || !currentPermission.canAskAgain
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();
    resolvedPermission = permissionStatus(permission.status);

    if (!permission.granted) {
      return {
        kind: "manualAreaRequired",
        permission: resolvedPermission,
        reason: "permissionDenied",
      };
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        kind: "manualAreaRequired",
        permission: "granted",
        reason: "positionUnavailable",
      };
    }

    return {
      kind: "located",
      coordinate: {
        latitude,
        longitude,
        ...(typeof accuracy === "number" && Number.isFinite(accuracy) ? { accuracyMeters: accuracy } : {}),
      },
    };
  } catch {
    return {
      kind: "manualAreaRequired",
      permission: resolvedPermission,
      reason: "positionUnavailable",
    };
  }
}

export type { DeviceSearchCoordinate, NearMeResult } from "@/features/location/near-me.types";
