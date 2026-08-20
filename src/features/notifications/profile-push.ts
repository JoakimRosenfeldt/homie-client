import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import type {
  ProfilePushOnboardingInput,
  ProfilePushOnboardingResult,
  RegisterPushTokenInput,
} from "@/features/notifications/profile-push.types";

const SAVED_SEARCH_CHANNEL_ID = "saved-searches";

function configuredProjectId(override?: string) {
  const configured: unknown =
    override ?? Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof configured === "string" && configured.trim() ? configured.trim() : null;
}

function notificationsAllowed(status: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function notificationPermission(
  status: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): "denied" | "granted" | "undetermined" {
  if (notificationsAllowed(status)) {
    return "granted";
  }
  return status.status === "denied" ? "denied" : "undetermined";
}

export async function requestProfilePushRegistration({
  ownerKey,
  choice,
  projectId,
}: ProfilePushOnboardingInput): Promise<ProfilePushOnboardingResult> {
  if (choice === "skip") {
    return { kind: "continueWithoutPush", permission: "undetermined", reason: "skipped" };
  }

  const platform = process.env.EXPO_OS;
  if (platform !== "ios" && platform !== "android") {
    return {
      kind: "continueWithoutPush",
      permission: "undetermined",
      reason: "unsupportedPlatform",
    };
  }

  const resolvedProjectId = configuredProjectId(projectId);
  if (!resolvedProjectId) {
    return {
      kind: "continueWithoutPush",
      permission: "undetermined",
      reason: "registrationUnavailable",
    };
  }

  let resolvedPermission: "denied" | "granted" | "undetermined" = "undetermined";

  try {
    if (platform === "android") {
      await Notifications.setNotificationChannelAsync(SAVED_SEARCH_CHANNEL_ID, {
        name: "Saved searches",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    const permission = notificationsAllowed(existingPermission)
      ? existingPermission
      : existingPermission.canAskAgain
        ? await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          })
        : existingPermission;
    resolvedPermission = notificationPermission(permission);

    if (!notificationsAllowed(permission)) {
      return {
        kind: "continueWithoutPush",
        permission: resolvedPermission,
        reason: "permissionDenied",
      };
    }

    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: resolvedProjectId });
    if (!pushToken.data.trim()) {
      return {
        kind: "continueWithoutPush",
        permission: resolvedPermission,
        reason: "registrationUnavailable",
      };
    }
    const registration: RegisterPushTokenInput = {
      ownerKey,
      platform,
      token: pushToken.data,
      permission: "granted",
    };

    return { kind: "register", registration };
  } catch {
    return {
      kind: "continueWithoutPush",
      permission: resolvedPermission,
      reason: "registrationUnavailable",
    };
  }
}

export type {
  ProfilePushOnboardingInput,
  ProfilePushOnboardingResult,
  RegisterPushTokenInput,
} from "@/features/notifications/profile-push.types";
