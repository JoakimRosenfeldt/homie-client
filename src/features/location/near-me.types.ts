export type DeviceSearchCoordinate = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}>;

export type NearMeResult =
  | {
      kind: "located";
      coordinate: DeviceSearchCoordinate;
    }
  | {
      kind: "manualAreaRequired";
      permission: "denied" | "granted" | "undetermined";
      reason: "locationServicesDisabled" | "permissionDenied" | "positionUnavailable" | "unsupportedPlatform";
    };
