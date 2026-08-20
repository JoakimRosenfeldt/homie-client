import type { NearMeResult } from "@/features/location/near-me.types";

export async function requestNearMeLocation(): Promise<NearMeResult> {
  return {
    kind: "manualAreaRequired",
    permission: "undetermined",
    reason: "unsupportedPlatform",
  };
}

export type { DeviceSearchCoordinate, NearMeResult } from "@/features/location/near-me.types";
