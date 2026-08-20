import type {
  ProfilePushOnboardingInput,
  ProfilePushOnboardingResult,
} from "@/features/notifications/profile-push.types";

export async function requestProfilePushRegistration({
  choice,
}: ProfilePushOnboardingInput): Promise<ProfilePushOnboardingResult> {
  return {
    kind: "continueWithoutPush",
    permission: "undetermined",
    reason: choice === "skip" ? "skipped" : "unsupportedPlatform",
  };
}

export type {
  ProfilePushOnboardingInput,
  ProfilePushOnboardingResult,
  RegisterPushTokenInput,
} from "@/features/notifications/profile-push.types";
