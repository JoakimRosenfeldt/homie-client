export type RegisterPushTokenInput = {
  ownerKey: string;
  platform: "ios" | "android";
  token: string;
  permission: "granted" | "denied" | "undetermined";
};

export type ProfilePushOnboardingInput = {
  ownerKey: string;
  choice: "enable" | "skip";
  projectId?: string;
};

export type ProfilePushOnboardingResult =
  | {
      kind: "register";
      registration: RegisterPushTokenInput;
    }
  | {
      kind: "continueWithoutPush";
      permission: "denied" | "granted" | "undetermined";
      reason: "permissionDenied" | "registrationUnavailable" | "skipped" | "unsupportedPlatform";
    };
